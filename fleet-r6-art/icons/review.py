#!/usr/bin/env python3
"""Create inspection sheets and audit real alpha without changing the source icons."""
import json
import pathlib
import subprocess
import sys

sys.dont_write_bytecode = True
from PIL import Image, ImageDraw, ImageFont
from gen import MANIFEST

HERE = pathlib.Path(__file__).resolve().parent
REVIEW = HERE / 'review'
COLORS = ['#9a5f18', '#2b8b83', '#c23f5c', '#6b52b5', '#4c7a37', '#d2400f', '#efc31c',
          '#6c8c3f', '#7c837a', '#4f6f7d', '#1f93ab', '#b99931', '#efe6c6']


def checker(size):
    image = Image.new('RGBA', size, '#f3f3ed')
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], 16):
        for x in range(0, size[0], 16):
            if (x // 16 + y // 16) % 2:
                draw.rectangle((x, y, x + 15, y + 15), fill='#d9ddd3')
    return image


def main():
    REVIEW.mkdir(exist_ok=True)
    font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 16)
    small_font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 13)
    results = []
    names = [row[0] for row in MANIFEST if (HERE / row[0]).exists()]
    rows = (len(names) + 3) // 4
    sheet = Image.new('RGBA', (4 * 288, max(rows, 1) * 302), '#ecf0e2')
    tiny = Image.new('RGBA', (560, max(len(names), 1) * 104 + 34), '#ecf0e2')
    draw = ImageDraw.Draw(sheet)
    tiny_draw = ImageDraw.Draw(tiny)
    tiny_draw.text((18, 9), 'Actual display sizes: 64 px and 32 px, light and dark chips', font=small_font, fill='#23331f')
    for index, name in enumerate(names):
        src = Image.open(HERE / name)
        src.load()
        assert src.size == (1024, 1024), (name, src.size)
        assert src.mode == 'RGBA', (name, src.mode)
        alpha = src.getchannel('A')
        hist = alpha.histogram()
        bbox = alpha.getbbox()
        visible_bbox = alpha.point(lambda value: 255 if value > 2 else 0).getbbox()
        edge_max = max(alpha.crop((0, 0, 1024, 1)).getextrema()[1],
                       alpha.crop((0, 1023, 1024, 1024)).getextrema()[1],
                       alpha.crop((0, 0, 1, 1024)).getextrema()[1],
                       alpha.crop((1023, 0, 1024, 1024)).getextrema()[1])
        row = {'file': name, 'size': list(src.size), 'mode': src.mode,
               'alpha_min': alpha.getextrema()[0], 'alpha_max': alpha.getextrema()[1],
               'fully_transparent_pixels': hist[0], 'fully_opaque_pixels': hist[255],
               'near_opaque_pixels': sum(hist[250:]),
               'transparent_fraction': round(hist[0] / (1024 * 1024), 4),
               'alpha_bbox': list(bbox) if bbox else None,
               'visible_alpha_bbox_above_2': list(visible_bbox) if visible_bbox else None,
               'outer_edge_max_alpha': edge_max}
        results.append(row)
        assert hist[0] > 100000 and sum(hist[250:]) > 100000, row
        assert edge_max <= 2, row
        small = HERE / name.replace('.png', '@256.png')
        if not small.exists() or small.stat().st_mtime < (HERE / name).stat().st_mtime:
            subprocess.run(['sips', '-z', '256', '256', str(HERE / name), '--out', str(small)], check=True, stdout=subprocess.DEVNULL)
        icon = Image.open(small).convert('RGBA')
        assert icon.size == (256, 256)
        tile = checker((256, 256))
        tile.alpha_composite(icon)
        x = (index % 4) * 288 + 16
        y = (index // 4) * 302 + 30
        sheet.alpha_composite(tile, (x, y))
        draw.text((x, y - 23), name, font=font, fill='#23331f')
        ty = index * 104 + 34
        tiny_draw.text((16, ty + 4), name, font=font, fill='#23331f')
        color = COLORS[next(i for i, item in enumerate(MANIFEST) if item[0] == name)]
        for px, size, bg in [(190, 64, color), (270, 32, color), (330, 64, '#243626'), (414, 32, '#243626'), (474, 64, '#f8f6ec')]:
            tile = Image.new('RGBA', (size, size), bg)
            tile.alpha_composite(src.resize((size, size), Image.Resampling.LANCZOS))
            tiny.alpha_composite(tile, (px, ty + 20))
    sheet.convert('RGB').save(REVIEW / 'icons-256-sheet.png')
    tiny.convert('RGB').save(REVIEW / 'icons-game-size.png')
    (REVIEW / 'alpha-audit.json').write_text(json.dumps(results, indent=2) + '\n')
    print(json.dumps({'reviewed_files': len(results), 'real_alpha_and_clear_visible_edges': True,
                      'sheets': ['review/icons-256-sheet.png', 'review/icons-game-size.png']}, indent=2))


if __name__ == '__main__':
    main()
