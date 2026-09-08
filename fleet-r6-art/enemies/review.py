#!/usr/bin/env python3
"""Check PNG pixels and assemble the lane's visual review sheet."""
import json
import pathlib
import sys

sys.dont_write_bytecode = True
from PIL import Image, ImageDraw, ImageFont

HERE = pathlib.Path(__file__).resolve().parent
KINDS = ['grub', 'runner', 'armor', 'moth', 'brood', 'grubling', 'warden', 'boss']
CANDIDATES = HERE / 'candidates'


def font(size):
    return ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', size)


def inspect(path, size):
    with Image.open(path) as im:
        im.load()
        assert im.format == 'PNG', f'{path.name}: not PNG'
        assert im.size == (size, size), f'{path.name}: wrong dimensions'
        assert im.mode == 'RGBA', f'{path.name}: not RGBA'
        alpha = im.getchannel('A')
        histogram = alpha.histogram()
        assert histogram[0] > size * size * 0.15, f'{path.name}: insufficient empty background'
        # The lean runner occupies less area than the broad moth or brood.
        assert sum(histogram[240:]) > size * size * 0.05, f'{path.name}: insufficient solid subject'
        bounds = alpha.point(lambda value: 255 if value > 12 else 0).getbbox()
        assert bounds and all((bounds[0] > 0, bounds[1] > 0, bounds[2] < size, bounds[3] < size)), f'{path.name}: visible pixels touch canvas edge'
        return {
            'file': path.name, 'size': list(im.size), 'mode': im.mode,
            'transparent_fraction': round(histogram[0] / (size * size), 4),
            'near_opaque_fraction': round(sum(histogram[240:]) / (size * size), 4),
            'partial_alpha_fraction': round(sum(histogram[1:255]) / (size * size), 4),
            'visible_bounds_alpha_gt_12': list(bounds),
            'bytes': path.stat().st_size,
        }


def contact_sheet():
    sheet = Image.new('RGB', (1280, 1130), '#20272b')
    draw = ImageDraw.Draw(sheet)
    draw.text((24, 18), 'UNDERGROWTH / ENEMY ART / R6', fill='#f2e7cd', font=font(28))
    draw.text((24, 57), 'Top-down, head up | 256 px above, 64 px and 40 px below | previews only', fill='#b9c4b7', font=font(17))
    for index, kind in enumerate(KINDS):
        x = 16 + index % 4 * 316
        y = 104 + index // 4 * 505
        draw.rounded_rectangle((x, y, x + 300, y + 487), 12, fill='#303b3a')
        draw.text((x + 16, y + 14), kind.upper(), fill='#f2e7cd', font=font(20))
        for tile_y in range(0, 256, 16):
            for tile_x in range(0, 256, 16):
                fill = '#b9cb95' if (tile_x // 16 + tile_y // 16) % 2 == 0 else '#aec089'
                draw.rectangle((x + 22 + tile_x, y + 48 + tile_y, x + 37 + tile_x, y + 63 + tile_y), fill=fill)
        sprite_path = HERE / f'enemy-{kind}@256.png'
        if not sprite_path.exists():
            draw.text((x + 32, y + 160), 'Generation pending', fill='#303b3a', font=font(18))
            continue
        with Image.open(sprite_path) as im:
            sprite = im.convert('RGBA')
        sheet.paste(sprite, (x + 22, y + 48), sprite)
        draw.text((x + 16, y + 322), '64 px', fill='#b9c4b7', font=font(16))
        draw.text((x + 174, y + 322), '40 px', fill='#b9c4b7', font=font(16))
        for small, sx in [(64, x + 18), (40, x + 180)]:
            for sy, bg in [(y + 352, '#b9cb95'), (y + 421, '#20272b')]:
                draw.rectangle((sx - 5, sy - 4, sx + small + 4, sy + small + 4), fill=bg)
                thumb = sprite.resize((small, small), Image.Resampling.LANCZOS)
                sheet.paste(thumb, (sx, sy), thumb)
    out = CANDIDATES / 'contact-sheet.png'
    sheet.save(out)
    print('wrote', out.relative_to(HERE))


if __name__ == '__main__':
    CANDIDATES.mkdir(exist_ok=True)
    metrics = [inspect(HERE / f'enemy-{kind}{suffix}.png', size)
               for kind in KINDS for suffix, size in [('', 1024), ('@256', 256)]]
    (CANDIDATES / 'pixel-checks.json').write_text(json.dumps(metrics, indent=2) + '\n')
    contact_sheet()
    print(json.dumps({'files_checked': len(metrics), 'full_size_bytes': sum(m['bytes'] for m in metrics if m['size'][0] == 1024), 'downscale_bytes': sum(m['bytes'] for m in metrics if m['size'][0] == 256)}, indent=2))
