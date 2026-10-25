import csv
import hashlib
import sys
from pathlib import Path

from PIL import Image

EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def main(root: str, out: str) -> None:
    base = Path(root)
    rows = 0
    with open(out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["rel_path", "folders", "sha256", "width", "height"])
        for p in sorted(base.rglob("*")):
            if not p.is_file() or p.suffix.lower() not in EXTS:
                continue
            data = p.read_bytes()
            digest = hashlib.sha256(data).hexdigest()
            try:
                with Image.open(p) as im:
                    width, height = im.size
            except Exception:
                width = height = ""
            rel = p.relative_to(base).as_posix()
            w.writerow([rel, "/".join(p.relative_to(base).parts[:-1]), digest, width, height])
            rows += 1
    print(f"{rows} images indexed -> {out}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
