#!/usr/bin/env python3
"""Build repeat and game-size inspection sheets; never alter final art."""
import json
import pathlib
import sys

sys.dont_write_bytecode = True
from PIL import Image, ImageDraw, ImageStat
from gen import DOWNSCALE, MANIFEST

HERE = pathlib.Path(__file__).resolve().parent
CANDIDATES = HERE / 'candidates'
CANDIDATES.mkdir(exist_ok=True)


def checker(size, cell=16):
    image = Image.new('RGB', size, '#e2e5dc')
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill='#c4cabd')
    return image


def main():
    metrics = {}
    sprites = []
    for name, _, _, transparent in MANIFEST:
        path = HERE / name
        if not path.exists():
            continue
        with Image.open(path) as source:
            source.load()
            image = source.convert('RGBA')
        alpha = image.getchannel('A')
        hist = alpha.histogram()
        metrics[name] = {'size': list(image.size), 'alpha_extrema': list(alpha.getextrema()),
                         'transparent_fraction': round(hist[0] / (image.width * image.height), 5),
                         'visible_bbox': list(alpha.getbbox() or []),
                         'solid_bbox': list(alpha.point(lambda value: 255 if value > 8 else 0).getbbox() or []),
                         'rgb_mean': [round(v, 2) for v in ImageStat.Stat(image.convert('RGB')).mean]}
        if transparent:
            sprites.append((name, image))
        else:
            tile = image.convert('RGB').resize((256, 256), Image.Resampling.LANCZOS)
            repeat = Image.new('RGB', (768, 768))
            for row in range(3):
                for col in range(3):
                    repeat.paste(tile, (col * 256, row * 256))
            repeat.save(CANDIDATES / (path.stem + '-repeat-3x3.png'))

    for start in range(0, len(sprites), 5):
        group = sprites[start:start + 5]
        sheet = Image.new('RGB', (5 * 272, 410), '#253429')
        draw = ImageDraw.Draw(sheet)
        for index, (name, image) in enumerate(group):
            x = index * 272 + 8
            canvas = checker((256, 256))
            canvas.paste(image.resize((256, 256), Image.Resampling.LANCZOS), (0, 0), image.resize((256, 256), Image.Resampling.LANCZOS))
            sheet.paste(canvas, (x, 28))
            draw.text((x, 8), name, fill='white')
            small = image.resize((64, 64), Image.Resampling.LANCZOS)
            for col, colour in enumerate(['#b9cb95', '#314337', '#e9e5d5']):
                panel = Image.new('RGB', (72, 72), colour)
                panel.paste(small, (4, 4), small)
                sheet.paste(panel, (x + col * 84, 304))
            draw.text((x, 388), '64 px: meadow / dark / light', fill='white')
        sheet.save(CANDIDATES / f'sprites-review-{start // 5 + 1}.png')

    lawn_paths = [HERE / f'tile-meadow-{letter}.png' for letter in 'abc']
    if all(path.exists() for path in lawn_paths):
        lawn = [Image.open(path).convert('RGB').resize((192, 192), Image.Resampling.LANCZOS) for path in lawn_paths]
        sheet = Image.new('RGB', (960, 960))
        for row in range(5):
            for col in range(5):
                sheet.paste(lawn[(row + col) % 3], (col * 192, row * 192))
        sheet.save(CANDIDATES / 'meadow-mixed-review.png')

    (CANDIDATES / 'image-metrics.json').write_text(json.dumps(metrics, indent=2) + '\n')
    if all((HERE / f'{pathlib.Path(name).stem}@{DOWNSCALE[name]}.png').exists() for name, _, _, _ in MANIFEST):
        delivery = Image.new('RGB', (1088, 1184), '#253429')
        draw = ImageDraw.Draw(delivery)
        for index, (name, _, _, transparent) in enumerate(MANIFEST):
            x, y = (index % 4) * 272 + 8, (index // 4) * 296
            path = HERE / f'{pathlib.Path(name).stem}@{DOWNSCALE[name]}.png'
            with Image.open(path) as source:
                art = source.convert('RGBA').resize((256, 256), Image.Resampling.LANCZOS)
            panel = checker((256, 256)) if transparent else Image.new('RGB', (256, 256))
            panel.paste(art, (0, 0), art)
            delivery.paste(panel, (x, y + 28))
            draw.text((x, y + 8), path.name, fill='white')
        delivery.save(CANDIDATES / 'delivery-contact.png')
    print(json.dumps({'reviewed_files': len(metrics), 'metrics': 'candidates/image-metrics.json',
                      'sprites': {name: {'alpha': data['alpha_extrema'], 'bbox': data['visible_bbox']}
                                  for name, data in metrics.items() if name.startswith(('gate-', 'prop-'))}}))


if __name__ == '__main__':
    main()
