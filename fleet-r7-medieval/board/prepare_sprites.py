#!/usr/bin/env python3
"""Center generated sprites at the requested footprint and clear alpha noise."""
import argparse
import hashlib
import json
import pathlib
import shutil
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
parser = argparse.ArgumentParser()
parser.add_argument("stems", nargs="+")
parser.add_argument("--take", type=int, default=1)
args = parser.parse_args()
records_path = HERE / "candidates" / "sprite-preparation.json"
records = json.loads(records_path.read_text()) if records_path.exists() else {}
for stem in args.stems:
    assert stem.startswith(("gate-", "prop-")), stem
    target = HERE / (stem + ".png")
    source = HERE / "candidates" / (stem + "-take" + str(args.take) + "-source.png")
    if not source.exists():
        shutil.copy2(target, source)
    art = Image.open(source).convert("RGBA")
    alpha = art.getchannel("A").point(lambda value: 0 if value <= 8 else value)
    art.putalpha(alpha)
    bounds = alpha.getbbox()
    assert bounds is not None, stem
    art = art.crop(bounds)
    factor = min(1.0, 820 / max(art.size))
    size = (round(art.width * factor), round(art.height * factor))
    if size != art.size:
        art = art.resize(size, Image.Resampling.LANCZOS)
    final = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    final.alpha_composite(art, ((1024 - art.width) // 2, (1024 - art.height) // 2))
    final.save(target)
    records[stem] = {"source": str(source.relative_to(HERE)), "take": args.take,
                     "method": "Clear alpha values 0 to 8, crop to remaining alpha, fit within 820 pixels, center on transparent 1024 pixel canvas.",
                     "source_alpha_bounds_after_noise_clear": list(bounds), "fitted_size": list(size),
                     "source_sha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                     "final_sha256": hashlib.sha256(target.read_bytes()).hexdigest()}
    print(stem, "prepared at", size)
records_path.write_text(json.dumps(records, indent=2) + "\n")
