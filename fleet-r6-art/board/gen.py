#!/usr/bin/env python3
"""Generate missing board art using the common brief's API template."""
import argparse
import base64
import concurrent.futures
import json
import pathlib
import sys
import time
import urllib.error
import urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, '/Users/ls/Claude-Workspace/personal/imagegen')
from costlog import record

HERE = pathlib.Path(__file__).resolve().parent
STYLE = "Hand-painted stylized fantasy game art in the style of premium tower defense games such as Kingdom Rush: chunky simplified forms, one bold readable silhouette, thick soft painterly shading, warm key light from the upper left with a cool violet shadow side, saturated but harmonious colours, a thin dark outline around the whole silhouette, crisp clean edges, high detail on the focal point and calm simple large shapes elsewhere. No text, no letters, no watermark, no frame, no border, nothing cut off at the edges."
TILE = "Seamless tileable texture, edges wrap perfectly, even lighting, no single focal object, fills the whole frame."
SPRITE = "Single object, centred, filling about 80 percent of the frame, isolated on a fully transparent background."
LAWN = " Orthographic view directly above a flat lawn. Fine small clipped grass marks, calm simple broad paint shapes. Pale warm yellow-green meadow, restrained sage and olive shadows, low contrast. This belongs to a matched set of nearly identical lawn tiles with only very subtle tonal variation. Uniform value across the square, with no vignette, no dark perimeter, no clumps or patches that become repeating focal points."
TOP = " Strict orthographic overhead view, looking vertically down, suitable for a top-down game board. Compact readable silhouette at 64 pixels. Keep every leaf, root, and shadow inside the frame with a clear transparent margin."
MANIFEST = [
    ("tile-meadow-a.png", "Soft clipped meadow grass seen from directly above, light yellow-green, a few tiny clover leaves." + LAWN + " " + TILE, "1024x1024", False),
    ("tile-meadow-b.png", "The same soft clipped meadow grass seen from directly above, slightly darker green, a few tiny daisies." + LAWN + " Only a barely perceptible step darker than the light yellow-green base lawn. Daisies are tiny sparse cream specks, far smaller than a grass tuft. " + TILE, "1024x1024", False),
    ("tile-meadow-c.png", "The same soft clipped meadow grass seen from directly above, a mid green with a faint mown stripe." + LAWN + " Stay in the same pale warm yellow-green value family. One very faint broad mown stripe, no bright or dark bands. " + TILE, "1024x1024", False),
    ("tile-path.png", "Trodden bare dirt path seen from above, small pebbles, grass fringe at the very edges only. Warm muted olive-brown soil, flat worn packed earth, understated small scattered pebble marks. The path runs straight from left to right with matching ends. Sparse tiny grass at the upper and lower edges only, no border band or vignette. Orthographic overhead view. " + TILE, "1024x1024", False),
    ("ground-outer.png", "Dark forest floor seen from above, moss, fallen leaves, roots, deep green and brown. Broad calm patches of dark moss, warm bark brown leaf litter and a few subtle roots, kept low contrast so scenery on top reads clearly. Orthographic overhead view. No vignette or dark perimeter. " + TILE, "1024x1024", False),
    ("apron-wood.png", "Weathered wooden planks seen from above, warm bark brown, iron nails, moss in the cracks. Flat parallel horizontal planks with gentle painted wood grain and sparse small steel nails. Consistent plank widths and matching plank heights along the left and right edges. No bevel around the square, no vignette. Orthographic overhead view. " + TILE, "1024x1024", False),
    ("gate-entry.png", "A dark burrow mouth in a mound of earth and roots, ominous, the hole centred." + TOP + " Soil in muted olive-brown and roots in warm bark brown. The opening is a deep dark circular hole seen from directly above, not a front-facing cave entrance. " + SPRITE, "1024x1024", True),
    ("gate-exit.png", "A round garden gate of woven living branches with a glowing heart-shaped bloom in the centre." + TOP + " The gate forms a round wreath lying in the board plane, seen from above, with living hedge-green leaves, warm bark brown branches, and a clearly heart-shaped bloom in luminous rose and lantern gold. " + SPRITE, "1024x1024", True),
    ("prop-tree-a.png", "A round leafy oak canopy seen from above, dappled light, thick trunk shadow." + TOP + " Chunky rounded masses of meadow and hedge green leaves, warm yellow-green leaf highlights. A healthy living tree with an unbroken full crown of overlapping leaf clusters covering the centre. The thick trunk is only suggested by deep shadow beneath the canopy. No visible cut wood, no tree rings, no stump, no central hole. Keep the entire canopy inside the central 80 percent of the canvas with at least a tenth of the canvas as empty margin on every side. " + SPRITE, "1024x1024", True),
    ("prop-tree-b.png", "A tall pine canopy seen from above, blue-green needles." + TOP + " Radial tiers of broad needle clusters around the central treetop, a roughly round pointed canopy outline, cool deep blue-green with warm sunlit needle tips. No side-view triangular Christmas tree silhouette. " + SPRITE, "1024x1024", True),
    ("prop-tree-c.png", "A flowering cherry canopy seen from above, pink and cream." + TOP + " Round cloudlike clusters of warm cream and bloom rose flowers, a few deep green leaves and cool violet shaded branches visible underneath. " + SPRITE, "1024x1024", True),
    ("prop-rock-a.png", "A mossy grey boulder seen from above." + TOP + " One chunky angular rock-grey boulder with broad painted facets, warm upper-left highlight, cool shaded side and velvety hedge-green moss. " + SPRITE, "1024x1024", True),
    ("prop-rock-b.png", "Two smaller stones seen from above, lichen spots." + TOP + " A compact paired cluster, two clearly separate rounded rock-grey stones, pale sage and cream lichen spots, broad painted facets. " + SPRITE, "1024x1024", True),
    ("prop-flowers-a.png", "A clump of wildflowers seen from above, red and yellow." + TOP + " Compact leafy clump, chunky readable red and lantern yellow flower heads facing upward, hedge-green leaves. " + SPRITE, "1024x1024", True),
    ("prop-flowers-b.png", "A clump of blue bellflowers seen from above." + TOP + " Compact leafy clump with chunky blue bell-shaped blooms, lavender highlights and deep blue shaded petals among hedge-green leaves. " + SPRITE, "1024x1024", True),
    ("prop-stump.png", "A cut tree stump seen from above, visible rings, a mushroom on the side." + TOP + " Round pale golden cut wood with clear concentric growth rings, chunky warm bark brown roots and one small ember-red mushroom growing against its side. " + SPRITE, "1024x1024", True),
]
DOWNSCALE = {row[0]: (256 if row[0].startswith('tile-') or row[0].startswith(('prop-rock-', 'prop-flowers-', 'prop-stump')) else 512) for row in MANIFEST}


def gen(name, subject, size, transparent):
    out = HERE / name
    if out.exists():
        print('exists', name, flush=True)
        return
    key = next(line.split('=', 1)[1].strip() for line in open('/Users/ls/Claude-Workspace/personal/.env') if line.startswith('OPENAI_API_KEY='))
    prompt = STYLE + ' ' + subject
    (HERE / 'prompts' / (out.stem + '.txt')).write_text(prompt + '\n')
    body = {'model': 'gpt-image-2', 'prompt': prompt, 'size': size,
            'quality': 'high', 'output_format': 'png', 'n': 1}
    if transparent:
        body['background'] = 'transparent'
    req = urllib.request.Request('https://api.openai.com/v1/images/generations',
        data=json.dumps(body).encode(), headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
    print('generating', name, flush=True)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=300) as response:
                payload = json.load(response)
            break
        except urllib.error.HTTPError as error:
            message = error.read().decode('utf-8', errors='replace')
            if error.code in (429, 500, 502, 503) and attempt < 4:
                print('retry', name, error.code, flush=True)
                time.sleep(10 * (attempt + 1))
                continue
            print('API error', name, error.code, message, flush=True)
            raise
    out.write_bytes(base64.b64decode(payload['data'][0]['b64_json']))
    record(HERE, name, provider='openai', model='gpt-image-2', usage=payload.get('usage'))
    (HERE / 'REPORT.md').touch()
    print('wrote', name, flush=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='+')
    parser.add_argument('--workers', type=int, default=1)
    args = parser.parse_args()
    (HERE / 'prompts').mkdir(exist_ok=True)
    (HERE / 'candidates').mkdir(exist_ok=True)
    rows = [row for row in MANIFEST if not args.only or row[0] in args.only]
    if args.only and set(args.only) - {row[0] for row in MANIFEST}:
        parser.error('Unknown asset filename')
    if args.workers == 1:
        for row in rows:
            gen(*row)
    else:
        with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = [pool.submit(gen, *row) for row in rows]
            errors = []
            for future in concurrent.futures.as_completed(futures):
                try:
                    future.result()
                except Exception as error:
                    errors.append(str(error))
            if errors:
                raise SystemExit('\n'.join(errors))


if __name__ == '__main__':
    main()
