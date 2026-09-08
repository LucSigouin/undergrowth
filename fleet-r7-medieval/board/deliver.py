#!/usr/bin/env python3
"""Create required sips copies and audit the completed board PNGs."""
import hashlib
import json
import pathlib
import subprocess
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
SIZES = {
    "tile-meadow-a": 256, "tile-meadow-b": 256, "tile-meadow-c": 256, "tile-path": 256,
    "ground-outer": 512, "apron-wood": 512, "gate-entry": 512, "gate-exit": 512,
    "prop-tree-a": 512, "prop-tree-b": 512, "prop-tree-c": 512, "prop-rock-a": 256,
    "prop-rock-b": 256, "prop-flowers-a": 256, "prop-flowers-b": 256, "prop-stump": 256,
}


def main():
    audit = []
    for stem, size in SIZES.items():
        full = HERE / (stem + ".png")
        small = HERE / (stem + "@" + str(size) + ".png")
        assert full.exists(), "Missing " + full.name
        if not small.exists() or small.stat().st_mtime < full.stat().st_mtime:
            subprocess.run(["sips", "-z", str(size), str(size), str(full), "--out", str(small)], check=True, capture_output=True)
        transparent = stem.startswith(("gate-", "prop-"))
        for path, required_size in [(full, 1024), (small, size)]:
            with Image.open(path) as image:
                image.load()
                assert image.format == "PNG", path.name
                assert image.size == (required_size, required_size), path.name
                alpha = image.convert("RGBA").getchannel("A")
                lo, hi = alpha.getextrema()
                hist = alpha.histogram()
                if transparent:
                    assert image.mode == "RGBA", path.name + " has no RGBA alpha"
                    assert lo == 0 and hi >= 250, path.name + " lacks real transparent or near-opaque pixels"
                    assert hist[0] / (required_size * required_size) > 0.1, path.name + " too little empty alpha"
                    edge_alpha = max(alpha.crop(box).getextrema()[1] for box in [(0, 0, required_size, 1), (0, required_size - 1, required_size, required_size), (0, 0, 1, required_size), (required_size - 1, 0, required_size, required_size)])
                    assert edge_alpha <= 1, path.name + " touches frame edge"
                else:
                    assert lo == 255, path.name + " is not fully opaque"
                audit.append({"file": path.name, "size": list(image.size), "mode": image.mode,
                              "bytes": path.stat().st_size, "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                              "alpha_min_max": [lo, hi], "transparent_fraction": round(hist[0] / (required_size * required_size), 4)})
    (HERE / "candidates").mkdir(exist_ok=True)
    (HERE / "candidates" / "delivery-audit.json").write_text(json.dumps(audit, indent=2) + "\n")
    print("Delivery audit passed:", len(audit), "PNG files.")
    print("Full-size bytes:", sum(row["bytes"] for row in audit if "@" not in row["file"]))
    print("Downscaled bytes:", sum(row["bytes"] for row in audit if "@" in row["file"]))


if __name__ == "__main__":
    main()
