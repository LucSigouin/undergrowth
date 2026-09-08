#!/usr/bin/env python3
"""Make sips copies, visual review sheets and alpha measurements for this lane."""
import json
from pathlib import Path
import subprocess

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ASSETS = [
    ("thorn", "Ballista"), ("sap", "Tar pit"), ("bloom", "Catapult"),
    ("prism", "Mage spire"), ("hedge", "Palisade"), ("ember", "Brazier"),
    ("lantern", "War banner"), ("wood", "Wood"), ("rock", "Rock"),
    ("iron", "Iron"), ("diamond", "Diamond"), ("coin", "Coin"),
    ("life", "Life"),
]
CANDIDATES = HERE / "candidates"
CANDIDATES.mkdir(exist_ok=True)
FONT = ImageFont.load_default(size=16)
SMALL_FONT = ImageFont.load_default(size=11)


def checker(size, step=16):
    result = Image.new("RGBA", size, (55, 57, 64, 255))
    draw = ImageDraw.Draw(result)
    for y in range(0, size[1], step):
        for x in range(0, size[0], step):
            if (x // step + y // step) % 2:
                draw.rectangle((x, y, x + step - 1, y + step - 1), fill=(66, 68, 75, 255))
    return result


contact = Image.new("RGBA", (1400, 900), (34, 36, 42, 255))
game_size = Image.new("RGBA", (1288, 416), (45, 48, 56, 255))
small = Image.new("RGBA", (1040, 310), (34, 36, 42, 255))
small_draw = ImageDraw.Draw(small)
small_draw.rectangle((0, 160, 1040, 310), fill=(220, 207, 179, 255))
measurements = []
for index, (asset_id, label) in enumerate(ASSETS):
    source = HERE / f"icon-{asset_id}.png"
    if not source.exists():
        continue
    target = HERE / f"icon-{asset_id}@256.png"
    if not target.exists() or target.stat().st_mtime < source.stat().st_mtime:
        subprocess.run(["sips", "-z", "256", "256", str(source), "--out", str(target)],
                       check=True, stdout=subprocess.DEVNULL)
    with Image.open(source) as image:
        assert image.size == (1024, 1024), (source.name, image.size)
        assert image.mode == "RGBA", (source.name, image.mode)
        alpha = image.getchannel("A")
        extrema = alpha.getextrema()
        assert extrema[0] == 0 and extrema[1] >= 250, (source.name, extrema)
        bbox = alpha.getbbox()
        # Keep native alpha intact. Report sub-one-percent matte noise separately.
        visible_bbox = alpha.point(lambda n: 255 if n > 2 else 0).getbbox()
        edge_boxes = ((0, 0, 1, 1024), (0, 0, 1024, 1), (1023, 0, 1024, 1024), (0, 1023, 1024, 1024))
        edge_max = max(alpha.crop(box).getextrema()[1] for box in edge_boxes)
        assert edge_max <= 2, (source.name, "visible pixels touch frame", edge_max)
        assert visible_bbox and visible_bbox[0] > 0 and visible_bbox[1] > 0 and visible_bbox[2] < 1024 and visible_bbox[3] < 1024, (source.name, visible_bbox)
        histogram = alpha.histogram()
        assert histogram[0] / (1024 * 1024) > 0.2, (source.name, "background is not sufficiently transparent")
        measurements.append({
            "file": source.name, "mode": image.mode, "size": list(image.size),
            "alpha_extrema": list(extrema), "alpha_bbox": list(bbox),
            "visible_alpha_bbox_over_2": list(visible_bbox), "frame_edge_alpha_max": edge_max,
            "transparent_fraction": round(histogram[0] / (1024 * 1024), 5),
            "opaque_fraction": round(histogram[255] / (1024 * 1024), 5),
            "solid_fraction_alpha_250_plus": round(sum(histogram[250:]) / (1024 * 1024), 5),
        })
    with Image.open(target) as icon:
        assert icon.size == (256, 256) and icon.mode == "RGBA", target.name
        tile = checker((256, 256))
        tile.alpha_composite(icon)
        x, y = (index % 5) * 280 + 12, (index // 5) * 300 + 8
        contact.alpha_composite(tile, (x, y))
        ImageDraw.Draw(contact).text((x + 6, y + 266), f"{asset_id}: {label}", font=FONT, fill="white")
        game_x, game_y = (index % 7) * 184 + 12, (index // 7) * 208 + 8
        game_size.alpha_composite(icon.resize((160, 160), Image.Resampling.LANCZOS), (game_x, game_y))
        ImageDraw.Draw(game_size).text((game_x + 80, game_y + 181), label, font=FONT, fill="white", anchor="mm")
        for row_start, ink in [(0, "white"), (160, (37, 33, 28, 255))]:
            x = index * 80
            small.alpha_composite(icon.resize((64, 64), Image.Resampling.LANCZOS), (x + 8, row_start + 9))
            small.alpha_composite(icon.resize((32, 32), Image.Resampling.LANCZOS), (x + 24, row_start + 80))
            small_draw.text((x + 40, row_start + 125), label, font=SMALL_FONT, fill=ink, anchor="mm")

contact.save(CANDIDATES / "contact-sheet.png")
game_size.save(CANDIDATES / "game-size-sheet.png")
small.save(CANDIDATES / "readability-sheet.png")
(CANDIDATES / "alpha-audit.json").write_text(json.dumps(measurements, indent=2) + "\n")
print(f"Reviewed dimensions and alpha for {len(measurements)}/{len(ASSETS)} icons.")
for item in measurements:
    print(item["file"], item["alpha_bbox"], "transparent", item["transparent_fraction"])
