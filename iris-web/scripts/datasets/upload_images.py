"""Upload resized copies of a dataset's unique images to the private `eye-datasets` bucket.

Usage: python -I upload_images.py <dataset_id> <index_csv> <image_root>

Each unique image (by sha256) is resized to at most 1024 px on its longest side, saved as
JPEG (quality 88) and uploaded as <dataset_id>/<sha256>.jpg. Already-uploaded files are
skipped, so the script can be re-run. Originals are left untouched on disk.
"""
import csv
import io
import re
import sys
import urllib.error
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image, ImageOps

# iris-web/.env.local (git-ignored) holds SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and
# SUPABASE_ANON_KEY (Storage wants a JWT in the Authorization header).
ENV = str(Path(__file__).resolve().parents[2] / ".env.local")
MAX_SIDE = 1024


def env():
    out = {}
    for line in open(ENV, encoding="utf-8"):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
        if m:
            out[m[1]] = m[2]
    return out


def resized_jpeg(path: str) -> bytes:
    with Image.open(path) as im:
        im = ImageOps.exif_transpose(im).convert("RGB")
        im.thumbnail((MAX_SIDE, MAX_SIDE), Image.LANCZOS)
        buf = io.BytesIO()
        im.save(buf, "JPEG", quality=88, optimize=True, progressive=True)
        return buf.getvalue()


def main():
    dataset_id, index_csv, image_root = sys.argv[1:4]
    e = env()
    first = {}
    for r in csv.DictReader(open(index_csv, encoding="utf-8")):
        if r["sha256"] not in first or r["rel_path"] < first[r["sha256"]]:
            first[r["sha256"]] = r["rel_path"]

    def upload(item):
        sha, rel = item
        body = resized_jpeg(f"{image_root}/{rel}")
        req = urllib.request.Request(
            f"{e['SUPABASE_URL']}/storage/v1/object/eye-datasets/{dataset_id}/{sha}.jpg",
            data=body,
            headers={"apikey": e["SUPABASE_PUBLISHABLE_KEY"], "Authorization": f"Bearer {e['SUPABASE_ANON_KEY']}", "Content-Type": "image/jpeg"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120):
                return "uploaded", len(body)
        except urllib.error.HTTPError as err:
            text = err.read().decode(errors="replace")
            if err.code in (400, 409) and ("Duplicate" in text or "already exists" in text):
                return "exists", 0
            return f"error {err.code}: {text[:120]}", 0
        except Exception as ex:
            return f"error: {ex}", 0

    results = Counter()
    sent = 0
    errors = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        for i, (status, size) in enumerate(pool.map(upload, first.items()), 1):
            results[status.split(":")[0]] += 1
            sent += size
            if status.startswith("error") and len(errors) < 5:
                errors.append(status)
            if i % 200 == 0:
                print(f"{i}/{len(first)} done, {sent / 1e6:.0f} MB sent", flush=True)
    print(dict(results), f"{sent / 1e6:.0f} MB uploaded")
    for err in errors:
        print(err)


if __name__ == "__main__":
    main()
