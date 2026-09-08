#!/usr/bin/env python3
"""Match the three generated yard variants with a uniform colour grade."""
import json
import pathlib
import shutil
from PIL import Image, ImageStat

HERE = pathlib.Path(__file__).resolve().parent
TARGET_MEAN = (89, 91, 74)
TARGET_STD = (9, 9, 8)
records = []
for letter, take in [("a", 1), ("b", 2), ("c", 1)]:
    stem = "tile-meadow-" + letter
    target = HERE / (stem + ".png")
    source = HERE / "candidates" / (stem + "-take" + str(take) + "-source.png")
    if not source.exists():
        shutil.copy2(target, source)
    art = Image.open(source).convert("RGB")
    stat = ImageStat.Stat(art)
    channels = []
    for index, channel in enumerate(art.split()):
        lut = [max(0, min(255, round(TARGET_MEAN[index] + (value - stat.mean[index]) * TARGET_STD[index] / stat.stddev[index]))) for value in range(256)]
        channels.append(channel.point(lut))
    final = Image.merge("RGB", channels)
    final.save(target)
    final_stat = ImageStat.Stat(final)
    records.append({"file": target.name, "source": str(source.relative_to(HERE)),
                    "source_mean": stat.mean, "source_stddev": stat.stddev,
                    "final_mean": final_stat.mean, "final_stddev": final_stat.stddev,
                    "method": "One uniform affine RGB grade. No spatial lighting edits, blur, edge edits or painted content changes."})
(HERE / "candidates" / "bailey-colour-grade.json").write_text(json.dumps(records, indent=2) + "\n")
print("Matched all three bailey variants to a shared quiet grey-green tone.")
