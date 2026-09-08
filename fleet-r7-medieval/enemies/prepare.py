#!/usr/bin/env python3
"""Preserve generated takes and give the sprites consistent transparent margins."""
import json
import pathlib
import shutil
from PIL import Image

HERE = pathlib.Path(__file__).resolve().parent
CANDIDATES = HERE / 'candidates'
CANDIDATES.mkdir(exist_ok=True)
KINDS = ('grub', 'runner', 'armor', 'moth', 'brood', 'grubling', 'warden', 'boss')
TAKES = {'armor': 2, 'warden': 2}
STEPS = []

for kind in KINDS:
    target = HERE / f'enemy-{kind}.png'
    source = CANDIDATES / f'enemy-{kind}-take{TAKES.get(kind, 1)}-source.png'
    if not target.exists():
        raise SystemExit(f'Missing {target.name}; finish generation first.')
    if not source.exists():
        shutil.copy2(target, source)
    with Image.open(source) as original:
        assert original.size == (1024, 1024) and original.mode == 'RGBA', source.name
        sprite = original.copy()
    bounds = sprite.getchannel('A').point(lambda value: 255 if value > 16 else 0).getbbox()
    assert bounds, source.name
    left, top, right, bottom = bounds
    scale = min(1, 820 / max(right - left, bottom - top))
    side = round(1024 * scale)
    resized = sprite.resize((side, side), Image.Resampling.LANCZOS)
    ratio = side / 1024
    offset = (round(512 - (left + right) * ratio / 2),
              round(512 - (top + bottom) * ratio / 2))
    assert offset[0] >= 0 and offset[1] >= 0, source.name
    assert offset[0] + side <= 1024 and offset[1] + side <= 1024, source.name
    canvas = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    canvas.alpha_composite(resized, offset)
    canvas.save(target)
    STEPS.append({'file': target.name, 'source': f'candidates/{source.name}',
                  'source_bounds_alpha_gt_16': bounds, 'scale': round(ratio, 6),
                  'offset': offset, 'operation': 'uniform downscale and centre, preserve alpha'})

(CANDIDATES / 'preparation.json').write_text(json.dumps(STEPS, indent=2) + '\n')
print(f'Prepared {len(STEPS)} sprites with consistent margins. Original takes preserved.')
