#!/usr/bin/env python3
"""Generate missing enemy sprites and record the usage cost for each image."""
import base64
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
KEY = next(l.split('=', 1)[1].strip() for l in open('/Users/ls/Claude-Workspace/personal/.env') if l.startswith('OPENAI_API_KEY='))
STYLE = "Hand-painted stylized fantasy game art in the style of premium tower defense games such as Kingdom Rush: chunky simplified forms, one bold readable silhouette, thick soft painterly shading, warm key light from the upper left with a cool violet shadow side, saturated but harmonious colours, a thin dark outline around the whole silhouette, crisp clean edges, high detail on the focal point and calm simple large shapes elsewhere. No text, no letters, no watermark, no frame, no border, nothing cut off at the edges."
CAMERA = "Seen from directly above, looking straight down, the creature centred, head pointing to the top of the frame, soft drop shadow. Strict orthographic dorsal view, with the back visible and the forward direction toward twelve o'clock. Zoomed out full-body sprite with wide empty margins, never a close-up. The main body is about 70 percent of the frame. The complete creature including legs, antennae, wings, crown, and effects must fit inside the central 800 by 800 pixel area of the 1024 pixel canvas, leaving at least 110 pixels empty at every edge. Strong silhouette and broad simple colour masses that remain distinct at 40 pixels. One bright accent colour only."
TRANSPARENCY = "Single object, centred, filling about 80 percent of the frame, isolated on a fully transparent background."


def subject(description, direction):
    return description + " " + CAMERA + " " + direction + " " + TRANSPARENCY


MANIFEST = [
    ("enemy-grub.png", subject(
        "A fat rust-brown garden grub with segmented body, tiny legs, two pale eyes.",
        "A short fat, softly tapered pill silhouette only one and a half times as long as wide, four broad fleshy segments and very short side legs. A squat chubby grub, not a long caterpillar. The small blunt head is at the upper end, with two pale cream eyes as its sole bright accent. Tiny stub antennae. Warm rust and bark brown flesh with muted violet underside shading. Calm smooth painted skin, no dense tiny surface marks. No other objects."), "1024x1024", True),
    ("enemy-runner.png", subject(
        "A lean fast amber beetle-cricket with long legs stretched mid sprint, motion streaks.",
        "A narrow angular amber body with long bent cricket hind legs thrust backward in a sprint and short front legs reaching forward. Head at the upper end. Two short tapered motion streaks trail downwards behind it. Lantern-gold eye glints provide the single bright accent. Dynamic but instantly readable six-legged silhouette."), "1024x1024", True),
    ("enemy-armor.png", subject(
        "A heavy slate-blue armoured beetle with plated shell and a ridged horn, dull metal sheen.",
        "A broad squat shield-shaped shell of overlapping thick slate-blue plates, stout legs, and one blunt ridged horn pointing toward the top of the frame. Heavy rounded iron-steel armour, simple large plates and cool dark joints. Two icy cyan eye slits are the sole bright accent; metal highlights stay dull."), "1024x1024", True),
    ("enemy-moth.png", subject(
        "A dusty violet moth with wide spread wings, pale eye spots, fuzzy antennae.",
        "A very broad elegant wing silhouette with four rounded dusty-violet wing lobes, soft scalloped edges and a narrow fuzzy central body pointing straight up. One large pale cream eye spot on each upper wing is the single bright accent colour. Short feathery antennae curve upward. Wing surfaces have restrained broad painted patterns, no busy tiny markings."), "1024x1024", True),
    ("enemy-brood.png", subject(
        "A bloated magenta egg sac creature, translucent skin showing three small grubs inside, ready to burst.",
        "An enormous round pear-shaped swollen belly below a tiny distinct head at the upper end, with short splayed legs. The taut magenta translucent skin reveals exactly three separate curled pale peach grub shapes in the belly, arranged in a triangle, the sole bright accent. Three large readable interior shapes, a few stretched skin creases, no scattered eggs or gore."), "1024x1024", True),
    ("enemy-grubling.png", subject(
        "A small pale-orange grub hatchling, round and quick, big eyes, clearly the grub's baby.",
        "A compact chubby peach-orange pill body with only three soft broad BACK segments and tiny quick legs, visibly a baby version of a rust-brown garden grub. The grub is crawling flat on its belly, spine parallel to the ground. We see only the dorsal top of its head and back. Its head faces north, away toward the top edge. Two big pale cream dome eyes sit on the left and right sides of the upper head, looking UP THE PAGE, its one bright accent. Short stub antennae point up the page. The front of the face and mouth are hidden beyond the upper edge of the head. NO front-facing face, NO standing upright, NO visible belly, NO human-like face or smile, NO mouth beneath the eyes. The back is smoothly rounded with three calm simple folds, tiny side legs and a rounded tail below. Very simple round silhouette, pale peach-orange soft skin, no shell or wings."), "1024x1024", True),
    ("enemy-warden.png", subject(
        "A dark teal mantis-like guardian carrying three pale jade shield plates that orbit it, glowing runes.",
        "A chunky squat mantis with a large triangular head at the top, a broad heavy dark teal segmented back, and thick folded scythe forelegs. A solid dark teal body mass dominates the image; its thick limbs remain visible at 40 pixels. Exactly three simple broad pale jade shield plates float very close around it at left, right, and below, clearly separate from its body. Each shield is one solid slab with a thick dark teal outline and one simple large abstract glowing diamond rune, no readable characters or letters. The pale jade shields and rune glow form its only bright accent colour. Calm untextured large shapes, no gold trim, no jewellery, no wings, no tiny floating fragments, no fine filigree. Compact nearly round overall silhouette. All three plates and all limb tips stay comfortably inside the frame."), "1024x1024", True),
    ("enemy-boss.png", subject(
        "A huge deep-purple stag beetle king with a golden five point crown, cracked armour, glowing eyes.",
        "A massive broad dark plum plated shell with a few large bold armour cracks, thick powerful legs and two huge curved stag mandibles opening toward the top. The head occupies the upper end. A clearly readable golden crown with exactly five points rests across its head, its five-point outline visible from above. The crown and glowing amber eyes share the sole lantern-gold accent colour. Regal imposing silhouette, deeper darker purple than the moth, with broad painterly highlights and no extra jewels or objects."), "1024x1024", True),
]


def gen(name, description, size, transparent):
    out = HERE / name
    if out.exists():
        print("skip", name, flush=True)
        return
    log = HERE / 'costs.jsonl'
    takes = sum(json.loads(line).get('file') == name for line in log.read_text().splitlines()) if log.exists() else 0
    if takes >= 3:
        raise RuntimeError(f"Three-take limit reached for {name}")
    prompt = STYLE + " " + description
    (HERE / 'prompts' / (out.stem + '.txt')).write_text(prompt)
    body = {"model": "gpt-image-2", "prompt": prompt, "size": size,
            "quality": "high", "output_format": "png", "n": 1}
    if transparent:
        body["background"] = "transparent"
    req = urllib.request.Request("https://api.openai.com/v1/images/generations",
        data=json.dumps(body).encode(), headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    print("generating", name, "take", takes + 1, flush=True)
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=300) as response:
                payload = json.load(response)
            break
        except urllib.error.HTTPError as error:
            if error.code in (429, 500, 502, 503) and attempt < 4:
                time.sleep(10 * (attempt + 1))
                continue
            print("API error:", error.code, error.read().decode()[:2000], flush=True)
            raise
    out.write_bytes(base64.b64decode(payload["data"][0]["b64_json"]))
    cost = record(HERE, name, provider="openai", model="gpt-image-2", usage=payload.get("usage"))
    print("wrote", name, "USD", cost.get("usd", "unknown"), flush=True)


if __name__ == '__main__':
    (HERE / 'prompts').mkdir(exist_ok=True)
    (HERE / 'candidates').mkdir(exist_ok=True)
    chosen = sys.argv[1:]
    for item in MANIFEST:
        if not chosen or item[0] in chosen:
            gen(*item)
