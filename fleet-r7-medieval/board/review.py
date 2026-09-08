#!/usr/bin/env python3
"""Save non-destructive repeat proofs and collect PNG and alpha measurements."""
import argparse
import json
import pathlib
from PIL import Image, ImageDraw, ImageStat

HERE = pathlib.Path(__file__).resolve().parent
TILES = ["tile-meadow-a", "tile-meadow-b", "tile-meadow-c", "tile-path", "ground-outer", "apron-wood"]
SPRITES = ["gate-entry", "gate-exit", "prop-tree-a", "prop-tree-b", "prop-tree-c", "prop-rock-a", "prop-rock-b", "prop-flowers-a", "prop-flowers-b", "prop-stump"]


def mean_jump(left, right):
    return round(sum(abs(a - b) for p, q in zip(left, right) for a, b in zip(p, q)) / (3 * len(left)), 3)


def inspect(stem, take):
    path = HERE / (stem + ".png")
    if not path.exists():
        return None
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    histogram = alpha.histogram()
    w, h = image.size
    rgb = image.convert("RGB")
    result = {"file": path.name, "size": list(image.size), "mode": Image.open(path).mode,
              "rgb_mean": [round(v, 2) for v in ImageStat.Stat(rgb).mean],
              "alpha_min_max": list(alpha.getextrema()), "alpha_bbox": alpha.getbbox(),
              "transparent_fraction": round(histogram[0] / (w * h), 4),
              "opaque_fraction": round(histogram[255] / (w * h), 4)}
    result["edge_alpha_max"] = max(alpha.crop(box).getextrema()[1] for box in [(0, 0, w, 1), (0, h - 1, w, h), (0, 0, 1, h), (w - 1, 0, w, h)])
    if stem in TILES:
        repeat = Image.new("RGB", (w * 3, h * 3))
        for row in range(3):
            for col in range(3):
                repeat.paste(rgb, (col * w, row * h))
        repeat.save(HERE / "candidates" / (stem + "-" + take + "-repeat-3x3.png"))
        preview = repeat.resize((1024, 1024), Image.Resampling.LANCZOS)
        preview.save(HERE / "candidates" / (stem + "-" + take + "-repeat-preview.png"))
        pixels = rgb.load()
        result["wrap_jump_x"] = mean_jump([pixels[0, y] for y in range(h)], [pixels[w - 1, y] for y in range(h)])
        result["wrap_jump_y"] = mean_jump([pixels[x, 0] for x in range(w)], [pixels[x, h - 1] for x in range(w)])
        luma = rgb.convert("L")
        result["quadrant_luma"] = [round(ImageStat.Stat(luma.crop(box)).mean[0], 2) for box in [(0, 0, w // 2, h // 2), (w // 2, 0, w, h // 2), (0, h // 2, w // 2, h), (w // 2, h // 2, w, h)]]
    return result


def sheets():
    stems = [s for s in SPRITES if (HERE / (s + ".png")).exists()]
    sheet = Image.new("RGB", (1000, ((len(stems) + 3) // 4) * 280), (48, 54, 54))
    draw = ImageDraw.Draw(sheet)
    for i, stem in enumerate(stems):
        x, y = (i % 4) * 250, (i // 4) * 280
        art = Image.open(HERE / (stem + ".png")).convert("RGBA").resize((240, 240), Image.Resampling.LANCZOS)
        sheet.paste(art, (x + 5, y + 5), art)
        draw.text((x + 10, y + 250), stem, fill=(233, 226, 206))
    if stems:
        sheet.save(HERE / "candidates" / "sprite-contact-sheet.png")
        small = Image.new("RGB", (720, len(stems) * 90), (30, 35, 36))
        draw = ImageDraw.Draw(small)
        backgrounds = [(88, 90, 74), (28, 34, 36), (224, 218, 203)]
        for row, stem in enumerate(stems):
            art = Image.open(HERE / (stem + ".png")).convert("RGBA").resize((64, 64), Image.Resampling.LANCZOS)
            draw.text((10, row * 90 + 32), stem, fill=(236, 229, 215))
            for col, colour in enumerate(backgrounds):
                x, y = 240 + col * 150, row * 90 + 10
                draw.rectangle((x, y, x + 75, y + 75), fill=colour)
                small.paste(art, (x + 6, y + 6), art)
        small.save(HERE / "candidates" / "sprites-64px-background-review.png")
    if all((HERE / (s + ".png")).exists() for s in TILES[:3]):
        sheet = Image.new("RGB", (1024, 1024))
        for row in range(8):
            for col in range(8):
                stem = TILES[(row * 7 + col * 11 + row * col) % 3]
                art = Image.open(HERE / (stem + ".png")).convert("RGB").resize((128, 128), Image.Resampling.LANCZOS)
                sheet.paste(art, (col * 128, row * 128))
        sheet.save(HERE / "candidates" / "bailey-mixed-repeat.png")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("stems", nargs="*")
    parser.add_argument("--take", default="take1")
    args = parser.parse_args()
    (HERE / "candidates").mkdir(exist_ok=True)
    results = [result for stem in (args.stems or TILES + SPRITES) if (result := inspect(stem, args.take))]
    sheets()
    target = HERE / "candidates" / ("metrics-" + args.take + ".json")
    old = json.loads(target.read_text()) if target.exists() else []
    by_file = {row["file"]: row for row in old}
    by_file.update({row["file"]: row for row in results})
    target.write_text(json.dumps(list(by_file.values()), indent=2) + "\n")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
