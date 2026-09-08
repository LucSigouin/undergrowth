#!/usr/bin/env python3
# Copy the r7 finals into public/art/ at game size.
# Alpha sprites stay PNG. Opaque tileable textures become WebP through cwebp.
# Run from the project root: python3 fleet-r7-medieval/integrate/build-art.py
import pathlib
import subprocess
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'fleet-r7-medieval'
OUT = ROOT / 'public' / 'art'

TOWERS = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern']
MATERIALS = ['wood', 'rock', 'iron', 'diamond']
ENEMIES = ['grub', 'runner', 'armor', 'moth', 'brood', 'grubling', 'warden', 'boss']

# (source path, stem, size, opaque)
JOBS = []
for t in TOWERS + MATERIALS + ['coin', 'life']:
    JOBS.append((SRC / 'icons' / f'icon-{t}.png', f'icon-{t}', 160, False))
for t in TOWERS:
    for level in (1, 2, 3):
        JOBS.append((SRC / 'towers' / f'tower-{t}-l{level}.png', f'tower-{t}-l{level}', 256, False))
for e in ENEMIES:
    size = 256 if e in ('boss', 'brood') else 192
    JOBS.append((SRC / 'enemies' / f'enemy-{e}.png', f'enemy-{e}', size, False))
for tile in ['tile-meadow-a', 'tile-meadow-b', 'tile-meadow-c', 'tile-path']:
    JOBS.append((SRC / 'board' / f'{tile}.png', tile, 256, True))
JOBS.append((SRC / 'board' / 'ground-outer.png', 'ground-outer', 512, True))
JOBS.append((SRC / 'board' / 'apron-wood.png', 'apron-wood', 512, True))
for gate in ['gate-entry', 'gate-exit']:
    JOBS.append((SRC / 'board' / f'{gate}.png', gate, 256, False))
for prop in ['prop-tree-a', 'prop-tree-b', 'prop-tree-c']:
    JOBS.append((SRC / 'board' / f'{prop}.png', prop, 256, False))
for prop in ['prop-rock-a', 'prop-rock-b', 'prop-flowers-a', 'prop-flowers-b', 'prop-stump']:
    JOBS.append((SRC / 'board' / f'{prop}.png', prop, 160, False))


def trim(image):
    """Crop a cut-out sprite down to its paint, on a square canvas with a small margin.

    Every generated sprite leaves a different amount of empty space around its subject:
    a thorn tower fills 74 percent of its frame and a bloom fills 95. Cropping them all to
    the same coverage is what lets world.js give a whole family one plane size and have
    them come out the same size on the board. The crop stays square, so nothing stretches.
    """
    box = image.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox()
    if not box:
        return image
    left, top, right, bottom = box
    side = int(max(right - left, bottom - top) * 1.06)
    cx, cy = (left + right) // 2, (top + bottom) // 2
    square = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    crop = image.crop((cx - side // 2, cy - side // 2, cx - side // 2 + side, cy - side // 2 + side))
    square.paste(crop, (0, 0))
    return square


OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.iterdir():
    old.unlink()

missing = [str(src) for src, *_ in JOBS if not src.exists()]
if missing:
    sys.exit('missing sources: ' + ', '.join(missing))

total = 0
for src, stem, size, opaque in JOBS:
    image = Image.open(src).convert('RGB' if opaque else 'RGBA')
    if not opaque:
        image = trim(image)
    image = image.resize((size, size), Image.LANCZOS)
    if opaque:
        target = OUT / f'{stem}@{size}.webp'
        staging = OUT / f'.{stem}.png'
        image.save(staging, 'PNG')
        subprocess.run(
            ['cwebp', '-quiet', '-q', '86', str(staging), '-o', str(target)], check=True
        )
        staging.unlink()
        head = target.open('rb').read(12)
        assert head[:4] == b'RIFF' and head[8:12] == b'WEBP', f'{target} is not a webp'
    else:
        target = OUT / f'{stem}@{size}.png'
        image.save(target, 'PNG', optimize=True)
    total += target.stat().st_size
    print(f'{target.name:32} {target.stat().st_size / 1024:7.0f} KB')

print(f'\n{len(JOBS)} files, {total / 1048576:.2f} MB in public/art/')
