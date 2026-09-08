#!/usr/bin/env python3
"""Audit delivered art and create game-size sheets and texture repeat evidence."""
import hashlib
import json
from pathlib import Path
import re
from PIL import Image, ImageDraw

LANE = Path(__file__).resolve().parent
ROOT = LANE.parents[1]
ART = ROOT / 'public/art'
SHOTS = LANE / 'shots'
SHOTS.mkdir(exist_ok=True)
paths = set(re.findall(r"/art/[^'\"]+\.(?:png|webp)", (ROOT / 'src/look.js').read_text()))
files = sorted(ART.iterdir())
assert paths == {'/art/' + p.name for p in files}
assert len(files) == 58
assert sum(p.stat().st_size for p in files) < 10 * 1024 * 1024
audit = []
for path in files:
    image = Image.open(path)
    row = {'file': path.name, 'bytes': path.stat().st_size, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'size': image.size, 'format': image.format}
    expected = int(re.search(r'@(\d+)', path.name)[1])
    assert image.size == (expected, expected)
    if path.suffix == '.png':
        assert image.mode == 'RGBA'
        alpha = image.getchannel('A')
        assert alpha.getextrema() == (0, 255)
        row['paint_bbox'] = alpha.point(lambda v: 255 if v > 12 else 0).getbbox()
        row['edge_max_alpha'] = max(alpha.crop(box).getextrema()[1] for box in [
            (0, 0, expected, 1), (0, expected - 1, expected, expected),
            (0, 0, 1, expected), (expected - 1, 0, expected, expected)])
        assert row['edge_max_alpha'] <= 12, row
    else:
        assert image.format == 'WEBP'
        repeat = Image.new('RGB', (expected * 3, expected * 3))
        for x in range(3):
            for y in range(3):
                repeat.paste(image, (x * expected, y * expected))
        repeat.save(SHOTS / f'repeat-{path.stem}.png')
    audit.append(row)

def sheet(name, groups, tile):
    cols = len(groups[0])
    canvas = Image.new('RGB', (cols * tile, len(groups) * (tile + 30)), '#665e51')
    draw = ImageDraw.Draw(canvas)
    for row, group in enumerate(groups):
        for col, path in enumerate(group):
            im = Image.open(path).convert('RGBA')
            x = col * tile + (tile - im.width) // 2
            y = row * (tile + 30)
            canvas.paste(im, (x, y), im)
            draw.text((col * tile + 5, y + tile + 5), path.stem, fill='white')
    canvas.save(SHOTS / name)

towers = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern']
sheet('review-towers.png', [[ART / f'tower-{kind}-l{level}@256.png' for kind in towers] for level in [1, 2, 3]], 256)
icons = sorted(ART.glob('icon-*.png'))
sheet('review-icons.png', [icons[:7], icons[7:]], 160)
enemies = sorted(ART.glob('enemy-*.png'))
sheet('review-enemies.png', [enemies[:4], enemies[4:]], 256)
props = sorted(ART.glob('gate-*.png')) + sorted(ART.glob('prop-*.png'))
sheet('review-props.png', [props[:5], props[5:]], 256)
(LANE / 'art-audit.json').write_text(json.dumps({'count': len(files), 'bytes': sum(p.stat().st_size for p in files), 'paths_match_look': True, 'files': audit}, indent=2) + '\n')
print(f'58 paths match src/look.js; {sum(p.stat().st_size for p in files)} bytes; formats, alpha and sprite edges pass.')
