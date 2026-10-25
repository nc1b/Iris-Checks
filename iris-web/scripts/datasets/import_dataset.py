import csv
import json
import re
import sys
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ENV = str(Path(__file__).resolve().parents[2] / ".env.local")


def env():
    out = {}
    for line in open(ENV, encoding="utf-8"):
        m = re.match(r"^([A-Z0-9_]+)=(.*)$", line.strip())
        if m:
            out[m[1]] = m[2]
    return out




def label_bmrd(folders: str):
    parts = folders.split("/")
    top, site, leaf = parts[0], (parts[1] if len(parts) > 1 else ""), parts[-1]
    lvl = re.match(r"Level (\d)", leaf)
    if top == "DR":
        if lvl:
            return ("diabetes", f"diabetic retinopathy, level {lvl[1]} of 4 ({site})", int(lvl[1]), "fundus")
        return ("diabetes", f"diabetic retinopathy, level not given ({site})", None, "fundus")
    if top == "Glaucoma":
        return ("glaucoma", f"glaucoma, level {lvl[1]} of 4 ({site})", int(lvl[1]), "fundus")
    if top == "AMD":
        if leaf == "No AMD":
            return ("normal", f"no AMD seen (AMD collection, {site})", None, "fundus")
        return ("other", f"age-related macular degeneration, {leaf.replace(' AMD', '').lower()} ({site})", None, "fundus")
    raise ValueError(f"unknown folder {folders}")


def label_bajwa(folders: str):
    return {
        "1_normal": ("normal", "normal retina", None, "fundus"),
        "2_cataract": ("cataract", "cataract (seen as a hazy retina photo)", None, "fundus"),
        "2_glaucoma": ("glaucoma", "glaucoma", None, "fundus"),
        "3_retina_disease": ("other", "retinal disease (type not given)", None, "fundus"),
    }[folders]


LABELERS = {"mendeley-bmrd": label_bmrd, "mendeley-bajwa": label_bajwa}


def split_for(sha: str):
    n = int(sha[:8], 16) % 100
    return "train" if n < 70 else "val" if n < 85 else "test"


def build_rows(dataset_id: str, index_csv: str, image_root: str):
    labeler = LABELERS[dataset_id]
    groups = defaultdict(list)
    for r in csv.DictReader(open(index_csv, encoding="utf-8")):
        groups[r["sha256"]].append(r)

    rows = []
    for sha, items in groups.items():
        items.sort(key=lambda r: r["rel_path"])
        labels = [labeler(r["folders"]) for r in items]
        conditions = {l[0] for l in labels}
        severities = {l[2] for l in labels if l[2] is not None}
        first = items[0]
        if len(conditions) > 1:
            quality, condition, detail, severity = "condition_conflict", "other", "dataset gives different diagnoses: " + "; ".join(sorted({l[1] for l in labels})), None
        elif len(severities) > 1:
            quality, condition = "severity_conflict", labels[0][0]
            detail = f"{condition}: dataset gives levels {', '.join(str(s) for s in sorted(severities))}"
            severity = None
        else:
            known = next((l for l in labels if l[2] is not None), labels[0])
            quality, condition, detail, severity = "clean", known[0], known[1], known[2]
        rows.append(
            {
                "dataset_id": dataset_id,
                "source_path": first["rel_path"],
                "storage_path": f"{image_root}/{first['rel_path']}",
                "condition": condition,
                "condition_detail": detail,
                "severity": severity,
                "image_type": labels[0][3],
                "eye": "unknown",
                "width": int(first["width"]) if first["width"] else None,
                "height": int(first["height"]) if first["height"] else None,
                "split": None if quality == "condition_conflict" else split_for(sha),
                "sha256": sha,
                "all_labels": sorted({l[1] for l in labels}),
                "label_quality": quality,
                "duplicate_paths": [r["rel_path"] for r in items[1:]],
            }
        )
    return rows


def post(rows, e):
    req = urllib.request.Request(
        f"{e['SUPABASE_URL']}/rest/v1/rpc/iris_import_dataset_images",
        data=json.dumps({"p_secret": e["IRIS_DB_SECRET"], "p_rows": rows}).encode(),
        headers={"apikey": e["SUPABASE_PUBLISHABLE_KEY"], "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        return json.loads(res.read())


def main():
    dataset_id, index_csv, image_root = sys.argv[1:4]
    dry = "--dry-run" in sys.argv
    rows = build_rows(dataset_id, index_csv, image_root)
    print(f"{len(rows)} unique images")
    print("quality:", dict(Counter(r["label_quality"] for r in rows)))
    print("condition:", dict(Counter(r["condition"] for r in rows)))
    print("split:", dict(Counter(r["split"] for r in rows)))
    if dry:
        print(json.dumps(rows[0], indent=1))
        return
    e = env()
    total = 0
    for i in range(0, len(rows), 400):
        total += post(rows[i : i + 400], e)
    print(f"inserted {total} rows")


if __name__ == "__main__":
    main()
