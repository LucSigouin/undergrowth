#!/usr/bin/env python3
"""Check sprite pixels, write sips copies, and build labelled review sheets."""
from pathlib import Path
import subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
IDS = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern']
NAMES = ['BALLISTA', 'TAR PIT', 'CATAPULT', 'MAGE SPIRE', 'PALISADE', 'BRAZIER', 'WAR BANNER']
CANDIDATES = HERE / 'candidates'
CANDIDATES.mkdir(exist_ok=True)
FONT = '/System/Library/Fonts/Helvetica.ttc'
font = ImageFont.truetype(FONT, 21)
small_font = ImageFont.truetype(FONT, 11)
sheet = Image.new('RGB', (7 * 512, 3 * 550), '#313942')
tiny = Image.new('RGB', (7 * 128, 3 * 108), '#313942')
light = Image.new('RGB', (7 * 256, 3 * 284), '#e6dac0')
draw = ImageDraw.Draw(sheet)
tiny_draw = ImageDraw.Draw(tiny)
light_draw = ImageDraw.Draw(light)
failures = []
for col, (tower, display) in enumerate(zip(IDS, NAMES)):
    for level in (1, 2, 3):
        row = level - 1
        name = f'tower-{tower}-l{level}.png'
        path = HERE / name
        if not path.exists():
            failures.append(f'{name}: missing')
            continue
        with Image.open(path) as original:
            original.load()
            if original.mode != 'RGBA' or original.size != (1024, 1024):
                failures.append(f'{name}: expected 1024 px RGBA, got {original.size} {original.mode}')
                continue
            alpha = original.getchannel('A')
            histogram = alpha.histogram()
            visible = alpha.point(lambda a: 255 if a >= 32 else 0)
            bounds = visible.getbbox()
            if not bounds:
                failures.append(f'{name}: empty sprite')
                continue
            left, top, right, bottom = bounds
            centre = ((left + right) / 2, (top + bottom) / 2)
            transparent = histogram[0] / (1024 * 1024)
            opaque = sum(histogram[250:]) / (1024 * 1024)
            edges = [alpha.crop(box).getextrema()[1] for box in
                     [(0, 0, 1024, 1), (0, 1023, 1024, 1024),
                      (0, 0, 1, 1024), (1023, 0, 1024, 1024)]]
            if transparent < .10 or opaque < .20:
                failures.append(f'{name}: suspect alpha coverage')
            if any(edges):
                failures.append(f'{name}: visible pixels touch image border')
            if min(left, top, 1024 - right, 1024 - bottom) < 16:
                failures.append(f'{name}: less than 16 px breathing room')
            if max(abs(centre[0] - 512), abs(centre[1] - 512)) > 64:
                failures.append(f'{name}: off-centre visible bounding box {bounds}')
            print(f'{name}: alpha 0={transparent:.3f}, >=250={opaque:.3f}, bbox={bounds}, centre={centre}, edge alpha={edges}')
        small_path = HERE / f'tower-{tower}-l{level}@512.png'
        if not small_path.exists() or small_path.stat().st_mtime < path.stat().st_mtime:
            subprocess.run(['sips', '-z', '512', '512', str(path), '--out', str(small_path)],
                           check=True, capture_output=True, text=True)
        with Image.open(small_path) as sprite:
            sprite.load()
            if sprite.mode != 'RGBA' or sprite.size != (512, 512):
                failures.append(f'{small_path.name}: sips copy lost size or alpha')
                continue
            sheet.paste(sprite, (col * 512, row * 550 + 38), sprite)
            draw.text((col * 512 + 16, row * 550 + 9), f'{display}  |  LEVEL {level}', font=font, fill='#f3e2bb')
            draw.rectangle((col * 512, row * 550, (col + 1) * 512 - 1, (row + 1) * 550 - 1), outline='#5a626a')
            thumb = sprite.resize((64, 64), Image.Resampling.LANCZOS)
            tiny.paste(thumb, (col * 128 + 32, row * 108 + 31), thumb)
            tiny_draw.text((col * 128 + 6, row * 108 + 8), f'{display} L{level}', font=small_font, fill='#f3e2bb')
            light_sprite = sprite.resize((256, 256), Image.Resampling.LANCZOS)
            light.paste(light_sprite, (col * 256, row * 284 + 28), light_sprite)
            light_draw.text((col * 256 + 8, row * 284 + 8), f'{display} L{level}', font=small_font, fill='#252b32')
sheet.save(CANDIDATES / 'contact-sheet.png')
tiny.save(CANDIDATES / 'contact-sheet-64.png')
light.save(CANDIDATES / 'contact-sheet-light.png')
print(f'Review sheets saved in {CANDIDATES}')
if failures:
    for failure in failures:
        print('FAIL:', failure)
    raise SystemExit(1)
print('Pixel checks green for all 21 originals and all 21 sips copies.')
