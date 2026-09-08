#!/usr/bin/env python3
"""Make the requested sips copies, labelled size previews, and alpha audit."""
import json
import pathlib
import subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
CANDIDATES = HERE / 'candidates'
CANDIDATES.mkdir(exist_ok=True)
CREATURES = [
    ('grub', 'Goblin'), ('runner', 'Wolf rider'),
    ('armor', 'Iron knight'), ('moth', 'Gargoyle'),
    ('brood', 'War wagon'), ('grubling', 'Whelp'),
    ('warden', 'Paladin'), ('boss', 'Warlord'),
]
FONT_PATH = '/System/Library/Fonts/Supplemental/Arial.ttf'
FONT = ImageFont.truetype(FONT_PATH, 20)
SMALL = ImageFont.truetype(FONT_PATH, 15)
TITLE = ImageFont.truetype(FONT_PATH, 28)
SHEET = Image.new('RGB', (1280, 1140), '#20262e')
DRAW = ImageDraw.Draw(SHEET)
DRAW.text((24, 18), 'UNDERGROWTH / MEDIEVAL ENEMIES / R7', font=TITLE, fill='#ecdfc6')
DRAW.text((24, 57), 'Straight down, head up. Actual 256, 64 and 40 px previews. Stone and dark backgrounds.', font=SMALL, fill='#c4c7c8')
AUDIT = []


def preview(sprite, x, y, size, checker=False):
    bg = Image.new('RGBA', (size, size), '#252b34')
    if checker:
        draw = ImageDraw.Draw(bg)
        for cy in range(0, size, 16):
            for cx in range(0, size, 16):
                colour = '#aaa393' if (cx // 16 + cy // 16) % 2 else '#b7b09f'
                draw.rectangle((cx, cy, cx + 15, cy + 15), fill=colour)
    bg.alpha_composite(sprite.resize((size, size), Image.Resampling.LANCZOS))
    SHEET.paste(bg.convert('RGB'), (x, y))


for index, (kind, label) in enumerate(CREATURES):
    path = HERE / f'enemy-{kind}.png'
    small_path = HERE / f'enemy-{kind}@256.png'
    if not path.exists():
        raise SystemExit(f'Missing {path.name}; finish generation first.')
    if not small_path.exists() or small_path.stat().st_mtime < path.stat().st_mtime:
        subprocess.run(['sips', '-z', '256', '256', str(path), '--out', str(small_path)], check=True, stdout=subprocess.DEVNULL)
    with Image.open(path) as source:
        assert source.size == (1024, 1024), path.name
        assert source.mode == 'RGBA', f'{path.name}: expected native RGBA, got {source.mode}'
        sprite = source.copy()
    alpha = sprite.getchannel('A')
    histogram = alpha.histogram()
    bounds = alpha.point(lambda value: 255 if value > 16 else 0).getbbox()
    edges = [alpha.crop((0, 0, 1024, 1)), alpha.crop((0, 1023, 1024, 1024)),
             alpha.crop((0, 0, 1, 1024)), alpha.crop((1023, 0, 1024, 1024))]
    max_edge = max(edge.getextrema()[1] for edge in edges)
    assert histogram[0] > 1024 * 1024 * 0.1, f'{path.name}: not enough fully transparent pixels'
    assert sum(histogram[250:]) > 1024, f'{path.name}: no substantially opaque subject'
    assert max_edge == 0, f'{path.name}: nontransparent pixel on canvas edge'
    with Image.open(small_path) as small:
        assert small.size == (256, 256) and small.mode == 'RGBA', small_path.name
        lo, hi = small.getchannel('A').getextrema()
        assert lo == 0 and hi >= 250, small_path.name
    AUDIT.append({'file': path.name, 'size': [1024, 1024], 'mode': 'RGBA',
                  'transparent_fraction': round(histogram[0] / (1024 * 1024), 4),
                  'alpha_range': alpha.getextrema(),
                  'partial_alpha_pixels': sum(histogram[1:250]), 'edge_alpha_max': max_edge,
                  'bounds_alpha_gt_16': bounds, 'copy': small_path.name})
    x, y = 16 + (index % 4) * 316, 100 + (index // 4) * 514
    DRAW.rounded_rectangle((x, y, x + 300, y + 496), radius=14, fill='#343a42')
    DRAW.text((x + 16, y + 13), label, font=FONT, fill='#f2e3c2')
    DRAW.text((x + 16, y + 39), f'{kind} / 256 px', font=SMALL, fill='#c4c7c8')
    preview(sprite, x + 22, y + 64, 256, checker=True)
    DRAW.text((x + 30, y + 335), '64 px', font=SMALL, fill='#c4c7c8')
    DRAW.text((x + 185, y + 335), '40 px', font=SMALL, fill='#c4c7c8')
    preview(sprite, x + 27, y + 363, 64, checker=True)
    preview(sprite, x + 27, y + 428, 64)
    preview(sprite, x + 184, y + 372, 40, checker=True)
    preview(sprite, x + 184, y + 438, 40)

SHEET.save(CANDIDATES / 'contact-sheet.png')
(CANDIDATES / 'alpha-check.json').write_text(json.dumps(AUDIT, indent=2) + '\n')
print(json.dumps({'sprites': len(AUDIT), 'alpha': 'pass', 'edge_alpha_max': 0,
                  'contact_sheet': str(CANDIDATES / 'contact-sheet.png')}, indent=2))
