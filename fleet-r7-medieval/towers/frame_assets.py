#!/usr/bin/env python3
"""Fit accepted generated sprites into consistent 80 percent canvas bounds.

Keep the generated alpha and complete source canvas. Archive each raw PNG
before writing a resized copy on a transparent 1024 px canvas. No repainting,
background extraction, sharpening, or alpha replacement is performed.
"""
from pathlib import Path
import shutil
import sys
from PIL import Image

HERE = Path(__file__).resolve().parent
RAW = HERE / 'candidates' / 'raw'
RAW.mkdir(parents=True, exist_ok=True)
names = sys.argv[1:]
if not names:
    raise SystemExit('Pass the filenames of visually accepted original sprites.')
for name in names:
    if Path(name).name != name or '@' in name or not name.startswith('tower-') or not name.endswith('.png'):
        raise SystemExit(f'Invalid original sprite name: {name}')
    final = HERE / name
    raw = RAW / name
    if not raw.exists():
        shutil.copy2(final, raw)
    with Image.open(raw) as source:
        source.load()
        assert source.mode == 'RGBA' and source.size == (1024, 1024)
        alpha = source.getchannel('A')
        bounds = alpha.point(lambda a: 255 if a >= 8 else 0).getbbox()
        if bounds is None:
            raise SystemExit(f'Empty source: {name}')
        x0, y0, x1, y1 = bounds
        scale = min(1.0, 820 / max(x1 - x0, y1 - y0))
        size = round(1024 * scale)
        resized = source.resize((size, size), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
        canvas.alpha_composite(resized, ((1024 - size) // 2, (1024 - size) // 2))
        canvas.save(final)
        print(f'{name}: source kept in candidates/raw/, scale={scale:.5f}, canvas=1024 px')
