#!/usr/bin/env python3
"""Illustrative 13 by 9 board composition for art review, not a game screenshot."""
import pathlib
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'candidates' / 'board-art-preview.png'
RESAMPLE = Image.Resampling.LANCZOS


def tile_region(target, name, box, scale):
    texture = Image.open(HERE / name).convert('RGBA').resize((scale, scale), RESAMPLE)
    x0, y0, x1, y1 = box
    region = Image.new('RGBA', (x1 - x0, y1 - y0))
    for y in range(0, region.height, scale):
        for x in range(0, region.width, scale):
            region.alpha_composite(texture, (x, y))
    target.alpha_composite(region, (x0, y0))


def sprite(target, name, size, centre):
    art = Image.open(HERE / name).convert('RGBA').resize((size, size), RESAMPLE)
    target.alpha_composite(art, (centre[0] - size // 2, centre[1] - size // 2))


def main():
    board = Image.new('RGBA', (1152, 832), '#334528')
    tile_region(board, 'ground-outer.png', (0, 0, 1152, 832), 384)
    tile_region(board, 'apron-wood.png', (128, 96, 1024, 736), 256)
    x0, y0, cell = 160, 128, 64
    meadow = [Image.open(HERE / f'tile-meadow-{letter}.png').convert('RGBA').resize((cell, cell), RESAMPLE) for letter in 'abc']
    path = Image.open(HERE / 'tile-path.png').convert('RGBA').resize((cell, cell), RESAMPLE)
    for row in range(9):
        for col in range(13):
            art = path if row == 4 else meadow[(row * 7 + col * 11) % 3]
            board.alpha_composite(art, (x0 + cell * col, y0 + cell * row))
    props = [
        ('prop-tree-a.png', 176, (96, 104)),
        ('prop-tree-b.png', 160, (340, 72)),
        ('prop-tree-c.png', 176, (1070, 102)),
        ('prop-tree-b.png', 176, (66, 726)),
        ('prop-tree-c.png', 160, (802, 762)),
        ('prop-tree-a.png', 176, (1060, 728)),
        ('prop-rock-a.png', 80, (80, 264)),
        ('prop-rock-b.png', 72, (660, 56)),
        ('prop-flowers-a.png', 72, (1076, 286)),
        ('prop-flowers-b.png', 72, (80, 560)),
        ('prop-stump.png', 96, (1090, 580)),
        ('prop-flowers-a.png', 72, (398, 768)),
        ('prop-rock-b.png', 72, (576, 766)),
        ('gate-entry.png', 140, (130, 416)),
        ('gate-exit.png', 140, (1022, 416)),
    ]
    for name, size, centre in props:
        sprite(board, name, size, centre)
    board.convert('RGB').save(OUT)
    print(OUT)


if __name__ == '__main__':
    main()
