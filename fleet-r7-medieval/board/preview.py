#!/usr/bin/env python3
"""Illustrative art-only board composition with 13 rows and 9 columns."""
import pathlib
from PIL import Image, ImageDraw

HERE = pathlib.Path(__file__).resolve().parent
RESAMPLE = Image.Resampling.LANCZOS


def fill(target, stem, box, scale):
    texture = Image.open(HERE / (stem + ".png")).convert("RGBA").resize((scale, scale), RESAMPLE)
    x0, y0, x1, y1 = box
    region = Image.new("RGBA", (x1 - x0, y1 - y0))
    for y in range(0, region.height, scale):
        for x in range(0, region.width, scale):
            region.alpha_composite(texture, (x, y))
    target.alpha_composite(region, (x0, y0))


def main():
    board = Image.new("RGBA", (1008, 1120))
    fill(board, "ground-outer", (0, 0, 1008, 1120), 320)
    x0, y0, cell = 216, 144, 64
    fill(board, "apron-wood", (184, 112, 824, 1008), 256)
    tiles = [Image.open(HERE / ("tile-meadow-" + letter + ".png")).convert("RGBA").resize((cell, cell), RESAMPLE) for letter in "abc"]
    road = Image.open(HERE / "tile-path.png").convert("RGBA").resize((cell, cell), RESAMPLE)
    for row in range(13):
        for col in range(9):
            art = road if col == 4 else tiles[(row * 7 + col * 11 + row * col) % 3]
            board.alpha_composite(art, (x0 + col * cell, y0 + row * cell))
    no_grid = board.copy()
    draw = ImageDraw.Draw(board)
    for col in range(10):
        draw.line((x0 + col * cell, y0, x0 + col * cell, y0 + 13 * cell), fill=(48, 59, 52, 255), width=1)
    for row in range(14):
        draw.line((x0, y0 + row * cell, x0 + 9 * cell, y0 + row * cell), fill=(48, 59, 52, 255), width=1)
    props = [
        ("prop-tree-a", 210, (120, 120)), ("prop-tree-b", 180, (887, 130)),
        ("prop-tree-c", 180, (112, 922)), ("prop-tree-a", 180, (900, 965)),
        ("prop-tree-b", 180, (114, 570)), ("prop-tree-c", 170, (900, 550)),
        ("prop-rock-a", 100, (118, 335)), ("prop-rock-b", 90, (896, 325)),
        ("prop-flowers-a", 130, (128, 735)), ("prop-flowers-b", 110, (880, 744)),
        ("prop-stump", 100, (752, 1050)), ("prop-flowers-a", 115, (299, 1052)),
        ("gate-entry", 150, (504, 169)), ("gate-exit", 150, (504, 951)),
    ]
    for stem, size, (x, y) in props:
        art = Image.open(HERE / (stem + ".png")).convert("RGBA").resize((size, size), RESAMPLE)
        for target in (board, no_grid):
            target.alpha_composite(art, (x - size // 2, y - size // 2))
    board.convert("RGB").save(HERE / "candidates" / "board-art-preview.png")
    no_grid.convert("RGB").save(HERE / "candidates" / "board-art-preview-no-grid.png")
    print("Saved art-only board previews. These are not game screenshots.")


if __name__ == "__main__":
    main()
