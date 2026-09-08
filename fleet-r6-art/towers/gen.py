#!/usr/bin/env python3
"""Generate missing tower art using the COMMON.md template; write only in this lane."""
import argparse
import base64
import concurrent.futures
import json
import pathlib
import sys
import threading
import time
import urllib.error
import urllib.request

sys.dont_write_bytecode = True
sys.path.insert(0, '/Users/ls/Claude-Workspace/personal/imagegen')
from costlog import record

HERE = pathlib.Path(__file__).resolve().parent
STYLE = "Hand-painted stylized fantasy game art in the style of premium tower defense games such as Kingdom Rush: chunky simplified forms, one bold readable silhouette, thick soft painterly shading, warm key light from the upper left with a cool violet shadow side, saturated but harmonious colours, a thin dark outline around the whole silhouette, crisp clean edges, high detail on the focal point and calm simple large shapes elsewhere. No text, no letters, no watermark, no frame, no border, nothing cut off at the edges."
TRANSPARENCY = "Single object, centred, filling about 80 percent of the frame, isolated on a fully transparent background."
CAMERA = "Game tower sprite seen from directly above, looking straight down at exactly ninety degrees, true orthographic plan view. The object is centred at the centre of the canvas, with a soft drop shadow toward the lower right. Every circle is a circle in this view, every square has parallel sides aligned to the frame, no camera tilt, no isometric view, no visible front facade."
PLATE = "The tower is centred on one ROUND flat stone base plate tinted {colour}, about three quarters of the canvas width. The plate has a simple softly bevelled rim and no surrounding terrain. All parts, shadows and magic stay safely inside the canvas with clear empty margin."

def subject(description, colour, level, plate=True):
    base = PLATE.format(colour=colour) if plate else "No plate, no pot and no surrounding ground; the hedge itself fills its square footprint with only a narrow transparent safety margin around its entire silhouette."
    return f"{CAMERA} {description} {base} This is upgrade level {level} of a coherent three-level tower family. Preserve its {colour} dominant palette. Large clean readable masses must identify the tower and its upgrade at 64 pixels. {TRANSPARENCY}"

MANIFEST = [
    ("tower-thorn-l1.png", subject("A bramble crossbow turret of living bark-brown wood on a cut tree stump, one long amber thorn bolt loaded down the central groove, barrel pointing precisely to the top of the frame. One chunky curved crossbow limb stretches left and right, a taut cord, two small dark green leaves. The modest crossbow crown spans about half the canvas; simple stump growth rings remain visible. Thorn amber stone, bark wood, warm amber bolt. No gold trim or magic at this first level.", "thorn amber", 1), "1024x1024", True),
    ("tower-thorn-l2.png", subject("A reinforced bramble crossbow turret of living bark-brown wood on a cut tree stump, one long amber thorn bolt loaded down the central groove, barrel pointing precisely to the top of the frame. The same chunky curved crossbow silhouette now spans two thirds of the canvas, with doubled branch limbs, thick root braces and two substantial bronze binding collars. A symmetrical pair of amber thorn spikes reinforces each bow end; a few dark green leaves hug the stump. Thorn amber stone, bark wood, warm amber bolt. Ornament remains bold and sparse.", "thorn amber", 2), "1024x1024", True),
    ("tower-thorn-l3.png", subject("A grand bramble crossbow turret of living bark-brown wood on a cut tree stump, one great glowing amber thorn bolt loaded down the central groove, barrel pointing precisely to the top of the frame. The broad crown spans nearly four fifths of the canvas: two reinforced sweeping branch limbs form the same crossbow silhouette with hooked thorn tips, sturdy bronze braces and elegant gold binding trim. Two short amber fabric pennants are attached to the lower bow branches, and a restrained amber magical shine lights the bolt and carved stump. Keep the wood and amber palette dominant, the central bolt singular, and the ornament chunky.", "thorn amber", 3), "1024x1024", True),
    ("tower-sap-l1.png", subject("A round stone well filled with luminous teal sap, seen straight into the circular opening. A simple thick rim of six broad teal-grey stone blocks, moss on two short sections of the rim, and one clear circular ripple in the liquid. The well crown is small, about half the canvas width, exposing a generous ring of the teal-tinted base plate. Deep teal liquid has one soft mint highlight and a calm central pool. No bucket, roof, upright handle or extra objects.", "sap teal", 1), "1024x1024", True),
    ("tower-sap-l2.png", subject("A larger reinforced round stone well filled with luminous teal sap, seen straight into the circular opening. The circular crown spans two thirds of the canvas. A double ring of chunky teal-grey stone blocks and four broad radial stone buttresses strengthen the rim. Moss grows on a few rim sections; the pool has two bright concentric ripples and restrained pale mint reflections. Four simple bronze inset clamps ornament the rim. No bucket, roof or upright handle; the open well remains the central readable shape.", "sap teal", 2), "1024x1024", True),
    ("tower-sap-l3.png", subject("A grand round stone well filled with luminous teal sap, seen straight into the circular opening. The broad circular crown spans nearly four fifths of the canvas: a triple stepped teal-grey stone ring, four prominent radial buttresses with sparse gold bands, four small teal crystal studs on the rim, and moss between selected stones. Three bold luminous mint-teal concentric ripples surround the dark teal pool's glowing central drop seen head-on. Local teal magic lights the interior and rim without an external glow disk. No bucket, roof or upright handle.", "sap teal", 3), "1024x1024", True),
    ("tower-bloom-l1.png", subject("A giant rose-red SIX PETAL flower turret, seen face-on from directly overhead, golden pollen core perfectly centred. Exactly six broad rounded rose petals form a clean six-lobed wheel, alternating warm highlights and cool plum folds; the flower crown spans about half the canvas. Four broad meadow-green leaves sit around the base. The golden centre is a simple compact pollen disk, with just a few painted dots. The rose-tinted stone plate is clearly visible around the leaves.", "bloom rose", 1), "1024x1024", True),
    ("tower-bloom-l2.png", subject("A reinforced giant rose-red SIX PETAL flower turret, seen face-on from directly overhead, golden pollen core perfectly centred. Exactly six broad substantial rose petals form the same six-lobed wheel, now spanning two thirds of the canvas; each petal has a raised folded inner ridge. A stronger collar of six broad meadow-green leaves and curling vine braces surrounds the base. The larger golden pollen disk has a bold concentric ring of amber stamens, adding ornament while keeping the six petals distinct. Keep rose-red dominant.", "bloom rose", 2), "1024x1024", True),
    ("tower-bloom-l3.png", subject("A grand giant rose-red SIX PETAL flower turret, seen face-on from directly overhead, brilliant golden pollen core perfectly centred. Exactly six large scalloped rose petals form the same six-lobed wheel, the magnificent crown spanning nearly four fifths of the canvas. Thin warm gold edges trace each rose petal and a few short golden stamens encircle the enlarged core. A strong collar of six deep meadow-green leaves with curled vine ornament remains visible between the petals. Restrained golden pollen magic is contained close to the central disk; vivid rose-red petals remain the dominant mass.", "bloom rose", 3), "1024x1024", True),
    ("tower-prism-l1.png", subject("A tall violet SIX SIDED crystal on a dark plum-grey stone plinth. From this exact vertical overhead camera, the crystal is a regular hexagon with SIX triangular violet facets converging on one bright tip at the exact centre of the frame. It has no elongated side-view shaft. The crystal crown is compact, about two fifths of the canvas width; a simple low dark hexagonal plinth and the violet-tinted round base plate surround it. Gentle lavender refraction across broad facets, one small central light point, no satellites or gold trim.", "sunstone violet", 1), "1024x1024", True),
    ("tower-prism-l2.png", subject("A reinforced tall violet SIX SIDED crystal on a dark plum-grey stone plinth. From this exact vertical overhead camera, the main crystal is a regular hexagon with SIX triangular violet facets converging on one bright tip at the exact centre of the frame. It has no elongated side-view shaft. Its larger crown spans three fifths of the canvas, seated in a broad stepped hexagonal plinth. Six stout dark stone corner clamps and three small violet satellite crystals placed evenly around the plinth reinforce the silhouette. Crisp lavender refractions light the facets; no large surrounding glow.", "sunstone violet", 2), "1024x1024", True),
    ("tower-prism-l3.png", subject("A grand tall violet SIX SIDED crystal on a dark plum-grey stone plinth. From this exact vertical overhead camera, the central crystal is a regular hexagon with SIX triangular violet facets converging on one brilliant tip at the exact centre of the frame. It has no elongated side-view shaft. The main crystal spans two thirds of the canvas, with six substantial violet satellite crystal points forming a grand symmetric crown nearly four fifths of the canvas wide. Six bold gold corner clamps trim the stepped dark stone plinth. Restrained lavender magic shines within the crystal facets and between the satellites, never an opaque glow disk. Violet remains dominant.", "sunstone violet", 3), "1024x1024", True),
    ("tower-hedge-l1.png", subject("A dense SQUARE trimmed hedge block filling its whole square game footprint. Directly overhead, it reads as an axis-aligned solid square of dark garden-green leaves with a lighter clipped top, softly rounded corners, broad simple foliage clumps and a subtle dark lower-right edge. One flat level of clipped leaves, no flowers, no ornaments, no bare holes. Keep the solid top large and calm so adjoining blocks make a readable maze wall. The footprint spans about four fifths of the canvas and is entirely visible.", "hedge green", 1, False), "1024x1024", True),
    ("tower-hedge-l2.png", subject("A dense reinforced SQUARE trimmed hedge block filling its whole square game footprint. Directly overhead, the same axis-aligned solid dark garden-green square now has a strongly raised lighter-green central square top, surrounded by a thick darker clipped foliage shoulder. Four substantial intertwined woody vine braces tuck into the corners as living reinforcement; broad orderly leaf clumps and a subtle cool lower-right edge. No flowers and no gold yet. Two clear nested foliage levels distinguish this upgraded wall. The square footprint spans about four fifths of the canvas and is entirely visible.", "hedge green", 2, False), "1024x1024", True),
    ("tower-hedge-l3.png", subject("A grand dense SQUARE trimmed hedge block filling its whole square game footprint. Directly overhead, the same axis-aligned solid dark garden-green square has a magnificent three-tier clipped top: dark broad square shoulder, lighter raised square crown, and bright green central square. Four substantial woody vine corner braces have small gold bands. Clusters of tiny WHITE five-petalled flowers with warm gold centres bloom clearly at all four corners and across the crown edges. Leaves remain the dominant green mass. A restrained warm magical highlight on the crown, no external aura. The square footprint spans about four fifths of the canvas and is entirely visible.", "hedge green", 3, False), "1024x1024", True),
    ("tower-ember-l1.png", subject("A stone brazier bowl with exactly THREE orange flames and a yellow core, viewed straight into the circular bowl from overhead. Three chunky flame tongues swirl inward around a small yellow centre as a readable triangular flame cluster; do not draw an upright side-view campfire. A simple soot-dark stone rim, red-orange hot coal bed, and a contained scorched ring on the ember-orange-tinted round ground plate. The compact bowl spans about half the canvas, with the scorched rim fully visible. No extra embers floating outside the object.", "ember orange", 1), "1024x1024", True),
    ("tower-ember-l2.png", subject("A reinforced stone brazier bowl with exactly THREE orange flames and a yellow core, viewed straight into the circular bowl from overhead. Three larger chunky flame tongues swirl inward as the same triangular flame cluster; do not draw an upright side-view campfire. The bowl spans two thirds of the canvas, with a doubled soot-dark rim and three broad bronze clamps at equal intervals. Bold glowing red-orange fissures in the coal bed add ornament, while a contained scorched ring remains visible on the ember-orange-tinted round ground plate. No sparks outside the object.", "ember orange", 2), "1024x1024", True),
    ("tower-ember-l3.png", subject("A grand stone brazier bowl with exactly THREE majestic orange flames and a bright yellow core, viewed straight into the circular bowl from overhead. Three broad curled flame tongues form a bold triangular swirling crown, never an upright side-view campfire. The splendid bowl spans nearly four fifths of the canvas, with a triple stepped soot-dark rim and three large bronze buttresses carrying restrained gold trim. A brilliant yellow centre casts local warm light on the orange flames and hot cracked coal bed. A contained scorched ring marks the ember-orange-tinted round ground plate. Keep orange dominant and magic contained to the bowl, no surrounding opaque halo.", "ember orange", 3), "1024x1024", True),
    ("tower-lantern-l1.png", subject("A SQUARE wooden garden lantern on FOUR posts with a golden glowing core and a warm light pool contained on its round gold-tinted stone ground plate. Exactly overhead, a square wooden open lattice top surrounds one visible square golden lens; four chunky post caps mark the four corners. No sloping roof hiding the core and no front elevation. The modest square lantern crown spans about half the canvas, aligned with the frame. Olive-brown timber, simple joinery, warm gold glass, and a quiet yellow centre. The circular plate remains clearly visible.", "lantern gold", 1), "1024x1024", True),
    ("tower-lantern-l2.png", subject("A reinforced SQUARE wooden garden lantern on FOUR posts with a golden glowing core and a warm light pool contained on its round gold-tinted stone ground plate. Exactly overhead, a larger square wooden open lattice top surrounds one visible square golden lens; four substantial post caps mark the corners. No sloping roof hiding the core and no front elevation. The square crown spans two thirds of the canvas and now has doubled olive-brown timber rails, bronze corner straps and four simple amber glass corner inserts. A brighter square golden core remains the focal point; no external floating objects.", "lantern gold", 2), "1024x1024", True),
    ("tower-lantern-l3.png", subject("A grand SQUARE wooden garden lantern on FOUR posts with a brilliant golden glowing core and a warm light pool contained on its round gold-tinted stone ground plate. Exactly overhead, a magnificent square wooden open lattice crown surrounds one visible square golden lens; four large post caps mark the four corners. No sloping roof hiding the core and no front elevation. The broad square crown spans nearly four fifths of the canvas with doubled carved olive-brown rails, bold gold corner fittings and four amber glass corner jewels. A small four-point golden star of light glows INSIDE the central square lens. Fine gold trim and local magical warmth make this clearly the final upgrade without an external glow disk.", "lantern gold", 3), "1024x1024", True),
]
LOCK = threading.Lock()

def full_prompt(name, description):
    correction_path = HERE / 'corrections.json'
    corrections = json.loads(correction_path.read_text()) if correction_path.exists() else {}
    if name in corrections:
        description = description.removesuffix(TRANSPARENCY) + corrections[name] + ' ' + TRANSPARENCY
    return STYLE + ' ' + description

def gen(name, description, size, transparent):
    out = HERE / name
    if out.exists():
        print('exists', name, flush=True)
        return
    cost_path = HERE / 'costs.jsonl'
    previous = [json.loads(line) for line in cost_path.read_text().splitlines()] if cost_path.exists() else []
    take = 1 + sum(row.get('file') == name for row in previous)
    if take > 3:
        raise RuntimeError(f'{name}: already generated three takes')
    prompt = full_prompt(name, description)
    prompt_path = HERE / 'prompts' / (out.stem + '.txt')
    prompt_path.write_text(prompt + '\n')
    key = next(line.split('=', 1)[1].strip().strip('\"').strip("'") for line in open('/Users/ls/Claude-Workspace/personal/.env') if line.startswith('OPENAI_API_KEY='))
    body = {'model': 'gpt-image-2', 'prompt': prompt, 'size': size,
            'quality': 'high', 'output_format': 'png', 'n': 1}
    if transparent:
        body['background'] = 'transparent'
    req = urllib.request.Request('https://api.openai.com/v1/images/generations',
        data=json.dumps(body).encode(), headers={'Authorization': f'Bearer {key}', 'Content-Type': 'application/json'})
    print('generating', name, 'take', take, flush=True)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=300) as response:
                payload = json.load(response)
            break
        except urllib.error.HTTPError as error:
            if error.code in (429, 500, 502, 503) and attempt < 4:
                print('retry', name, error.code, flush=True)
                time.sleep(10 * (attempt + 1))
                continue
            details = error.read().decode(errors='replace').replace(key, '[REDACTED]')
            raise RuntimeError(f'{name}: HTTP {error.code}: {details}') from None
    out.write_bytes(base64.b64decode(payload['data'][0]['b64_json']))
    with LOCK:
        entry = record(HERE, name, provider='openai', model='gpt-image-2', usage=payload.get('usage'), note=f'take {take}; high quality; 1024 square')
        with (HERE / 'REPORT.md').open('a') as report:
            report.write(f"\nGenerated {name}, take {take}, USD {entry.get('usd', 'unreported')}. Visual review pending.\n")
    print('wrote', name, 'USD', entry.get('usd', 'unreported'), flush=True)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--only', nargs='*', help='exact filenames to generate')
    parser.add_argument('--workers', type=int, default=1)
    parser.add_argument('--prompts-only', action='store_true')
    args = parser.parse_args()
    (HERE / 'prompts').mkdir(exist_ok=True)
    (HERE / 'candidates').mkdir(exist_ok=True)
    items = [row for row in MANIFEST if args.only is None or row[0] in args.only]
    if args.prompts_only:
        for name, description, _, _ in items:
            (HERE / 'prompts' / (pathlib.Path(name).stem + '.txt')).write_text(full_prompt(name, description) + '\n')
        print('saved', len(items), 'prompts')
        return
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, min(args.workers, 4))) as executor:
        futures = [executor.submit(gen, *row) for row in items]
        for future in concurrent.futures.as_completed(futures):
            future.result()

if __name__ == '__main__':
    main()
