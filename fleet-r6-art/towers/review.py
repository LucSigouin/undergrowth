#!/usr/bin/env python3
"""Make requested sips copies, comparison sheets, and a pixel-level alpha audit."""
import json
import pathlib
import subprocess
import sys
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
IDS = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern']
CANDIDATES = HERE / 'candidates'
CANDIDATES.mkdir(exist_ok=True)
PARTIAL = '--partial' in sys.argv

def font(size):
    path = pathlib.Path('/System/Library/Fonts/Supplemental/Arial.ttf')
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default(size=size)

def alpha_info(path):
    with Image.open(path) as image:
        image.load()
        if image.mode != 'RGBA':
            raise ValueError(f'{path.name}: expected RGBA, got {image.mode}')
        alpha = image.getchannel('A')
        histogram = alpha.histogram()
        count = image.width * image.height
        bbox = alpha.getbbox()
        visible_bbox = alpha.point(lambda value: 255 if value >= 8 else 0).getbbox()
        assert histogram[0] > count * 0.05, f'{path.name}: insufficient real transparency'
        assert sum(histogram[250:]) > count * 0.15, f'{path.name}: insufficient near-opaque subject'
        assert visible_bbox and visible_bbox[0] > 1 and visible_bbox[1] > 1 and visible_bbox[2] < image.width - 1 and visible_bbox[3] < image.height - 1, f'{path.name}: visible content touches an edge'
        return {'file': path.name, 'size': list(image.size), 'mode': image.mode,
                'transparent_fraction': round(histogram[0] / count, 4),
                'near_opaque_fraction': round(sum(histogram[250:]) / count, 4),
                'partial_alpha_fraction': round(sum(histogram[1:250]) / count, 4),
                'alpha_bbox': list(bbox), 'visible_alpha_bbox_threshold_8': list(visible_bbox),
                'bytes': path.stat().st_size}

audit = []
for tower in IDS:
    for level in [1, 2, 3]:
        source = HERE / f'tower-{tower}-l{level}.png'
        target = HERE / f'tower-{tower}-l{level}@512.png'
        if PARTIAL and not source.exists():
            continue
        audit.append(alpha_info(source))
        if not target.exists() or target.stat().st_mtime < source.stat().st_mtime:
            subprocess.run(['sips', '-z', '512', '512', str(source), '--out', str(target)], check=True, capture_output=True)
        audit.append(alpha_info(target))

# The requested 7-column, 3-row sheet uses every 512 px final at native resolution.
sheet = Image.new('RGB', (7 * 512, 3 * 552), '#b9cb95')
draw = ImageDraw.Draw(sheet)
for col, tower in enumerate(IDS):
    for row, level in enumerate([1, 2, 3]):
        x, y = col * 512, row * 552
        draw.rectangle((x, y, x + 511, y + 551), outline='#758a60', width=2)
        if not (HERE / f'tower-{tower}-l{level}@512.png').exists():
            continue
        with Image.open(HERE / f'tower-{tower}-l{level}@512.png') as sprite:
            sheet.paste(sprite, (x, y + 40), sprite)
        draw.text((x + 18, y + 8), f'{tower.upper()}  LEVEL {level}', font=font(24), fill='#263323')
sheet.save(CANDIDATES / 'contact-sheet.png')

# Show all sprites at actual 64 px on both meadow and a dark violet backdrop.
proof = Image.new('RGB', (7 * 144, 2 * 276), '#b9cb95')
draw = ImageDraw.Draw(proof)
for panel, background in enumerate(['#b9cb95', '#292333']):
    offset = panel * 276
    draw.rectangle((0, offset, proof.width, offset + 276), fill=background)
    for col, tower in enumerate(IDS):
        draw.text((col * 144 + 10, offset + 12), tower.upper(), font=font(15), fill='#25331f' if panel == 0 else '#f8ead0')
        for row, level in enumerate([1, 2, 3]):
            y = offset + 38 + row * 76
            if not (HERE / f'tower-{tower}-l{level}@512.png').exists():
                continue
            with Image.open(HERE / f'tower-{tower}-l{level}@512.png') as sprite:
                small = sprite.resize((64, 64), Image.Resampling.LANCZOS)
                proof.paste(small, (col * 144 + 40, y), small)
            draw.text((col * 144 + 10, y + 23), str(level), font=font(15), fill='#25331f' if panel == 0 else '#f8ead0')
proof.save(CANDIDATES / 'readability-64.png')
(CANDIDATES / 'alpha-audit.json').write_text(json.dumps(audit, indent=2) + '\n')
print(f'Prepared {len(audit) // 2} sips copies, contact-sheet.png, readability-64.png; alpha audit passed for {len(audit)} PNGs.')
