#!/usr/bin/env python3
"""Generate missing icons using the r6 common template and log each image's cost."""
import argparse
import base64
import json
import pathlib
import sys
import time
import urllib.request
import urllib.error

sys.dont_write_bytecode = True
sys.path.insert(0, '/Users/ls/Claude-Workspace/personal/imagegen')
from costlog import record

HERE = pathlib.Path(__file__).resolve().parent
STYLE = "Hand-painted stylized fantasy game art in the style of premium tower defense games such as Kingdom Rush: chunky simplified forms, one bold readable silhouette, thick soft painterly shading, warm key light from the upper left with a cool violet shadow side, saturated but harmonious colours, a thin dark outline around the whole silhouette, crisp clean edges, high detail on the focal point and calm simple large shapes elsewhere. No text, no letters, no watermark, no frame, no border, nothing cut off at the edges."
CAMERA = "A single readable game icon emblem, front three-quarter view, slightly from above, with slight bottom weight. Strong simple silhouette readable at 32 pixels, clear broad colour masses. No background disc, no ground plane, no cast shadow outside the object."
TRANSPARENCY = "Single object, centred, filling about 80 percent of the frame, isolated on a fully transparent background."
MANIFEST = [
    ("icon-thorn.png", "A thorn launcher: a coiled bramble crossbow of living wood with one amber thorn bolt loaded, amber and bark tones. A compact chunky crossbow emblem, with a very thick short wooden stock and stout rounded C-shaped bramble bow, one oversized amber thorn bolt resting visibly in the stock. The bow limbs and stock are thick bold connected masses; keep negative spaces small. Only two small bramble thorns and one simple olive vine wrap. Use broad calm painted wood planes, a broad amber arrowhead, minimal wood grain, no gems, no elaborate leaf ornaments, no fine filigree. Keep the entire emblem inside generous 100 pixel clear margins on every side.", "1024x1024", True),
    ("icon-sap.png", "A sap well: a round stone well brimming with glowing teal sap, a slow drip on the rim. Broad grey stone blocks cradle one bright teal oval pool, with a single thick teal drip visible on the front rim.", "1024x1024", True),
    ("icon-bloom.png", "A bloom: a big rose-red flower with six petals open, a golden pollen core, splash of petals. The open flower has exactly SIX large separate rose-red petals in one whorl: one at the top, one upper right, one lower right, one at the bottom, one lower left, and one upper left. All six main petals are fully visible around one compact round golden pollen core, with clear gaps between their outer lobes. The silhouette has six bold lobes, like a six-petal rosette, never a five-petal hibiscus. Two tiny loose petals close to the flower provide the splash. Keep the flower face angled toward the viewer and all six petals easy to count. Broad calm petal surfaces and a compact gold core.", "1024x1024", True),
    ("icon-prism.png", "A sunstone: a tall six sided violet crystal catching a beam of sunlight, purple and pale lilac. One upright tall hexagonal crystal with a pointed tip and broad violet facets; a small pale golden beam glints across the upper left face. The crystal has a strong vertical silhouette.", "1024x1024", True),
    ("icon-hedge.png", "A hedge block: a dense square trimmed hedge cube, dark green leaves with lighter tips. A compact clearly cubic mass with flat trimmed top and sides, meadow green leaf tips above deep hedge green faces. Simplified large leaf clusters preserve the square silhouette.", "1024x1024", True),
    ("icon-ember.png", "An ember brazier: a stone bowl with three orange flames and a bright yellow core. One squat chunky grey stone bowl cradles exactly three bold orange flame tongues, connected around a luminous bright yellow core.", "1024x1024", True),
    ("icon-lantern.png", "A garden lantern: a square wooden lantern on four posts with a golden glowing core and sparkle. A compact square warm bark frame with four stout corner posts, a small simple wooden roof, a bright lantern-gold core, and one crisp small sparkle close to the roof. Keep the frame bold and the light contained inside it.", "1024x1024", True),
    ("icon-wood.png", "A small stack of three cut logs with olive green moss, warm bark. Exactly three chunky logs, two underneath and one on top, with three clear round honey coloured cut ends, broad bark shapes, and olive green moss draped over the top.", "1024x1024", True),
    ("icon-rock.png", "A chunky grey boulder with lighter facets and a chip broken off. One squat irregular boulder with a few broad rock grey planes and lighter upper left facets, a visible chipped corner, and one small broken chip nestled closely beside its base.", "1024x1024", True),
    ("icon-iron.png", "A steel blue iron ingot with rivets and a cold sheen. One thick trapezoidal steel blue ingot with a broad smooth top plane, two simple round rivets on the front face, and a crisp cold pale blue edge highlight. Strong low rectangular silhouette.", "1024x1024", True),
    ("icon-diamond.png", "A cut cyan diamond gem, bright facets, one sparkle. One broad classic cut cyan diamond with a wide crown and pointed bottom, large bright turquoise and pale cyan facets, and exactly one small sharp sparkle close to the upper left edge. A wide jewel silhouette distinct from a tall violet crystal.", "1024x1024", True),
    ("icon-coin.png", "A round gold coin with a leaf embossed on it, thick rim. One upright chunky round golden coin turned slightly to reveal its thick edge, a single raised leaf emblem on the face, broad warm golden highlight, and deeper amber shading around the rim. No numbers or lettering.", "1024x1024", True),
    ("icon-life.png", "A glossy red heart with a tiny green sprout growing from the top. One plump warm red heart with a clear classic heart silhouette, a broad soft glossy highlight on the upper left lobe, and one tiny two-leaf meadow green sprout between the lobes.", "1024x1024", True),
]


def gen(name, subject, size, transparent):
    out = HERE / name
    if out.exists():
        print('already exists', name, flush=True)
        return
    costs = HERE / 'costs.jsonl'
    previous = [json.loads(line) for line in costs.read_text().splitlines() if line.strip()] if costs.exists() else []
    if sum(row.get('file') == name for row in previous) >= 3:
        raise RuntimeError('Three-take budget reached for ' + name)
    with open('/Users/ls/Claude-Workspace/personal/.env') as env:
        key = next(line.split('=', 1)[1].strip() for line in env if line.startswith('OPENAI_API_KEY='))
    prompt = STYLE + ' ' + subject + ' ' + CAMERA + ' ' + TRANSPARENCY
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
            if error.code in (429, 500, 502, 503) and attempt < 4:
                print('retrying', name, 'HTTP', error.code, flush=True)
                time.sleep(10 * (attempt + 1))
                continue
            print('API error', error.code, error.read().decode('utf-8', errors='replace')[:2000], flush=True)
            raise
    out.write_bytes(base64.b64decode(payload['data'][0]['b64_json']))
    (HERE / 'prompts' / (out.stem + '.txt')).write_text(prompt + '\n')
    record(HERE, name, provider='openai', model='gpt-image-2', usage=payload.get('usage'))
    (HERE / 'REPORT.md').touch()
    print('wrote', name, flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--only', nargs='+', help='Generate only these filenames, without changing the manifest.')
    args = parser.parse_args()
    known = {row[0] for row in MANIFEST}
    if args.only and set(args.only) - known:
        parser.error('Unknown icon filename')
    (HERE / 'prompts').mkdir(exist_ok=True)
    for item in MANIFEST:
        if not args.only or item[0] in args.only:
            gen(*item)


if __name__ == '__main__':
    main()
