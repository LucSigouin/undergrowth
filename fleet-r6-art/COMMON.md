# Common brief for every worker on Undergrowth v2, round r6 (AAA art)

Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git repo, main branch, public at
github.com/LucSigouin/undergrowth, live at undergrowth.pages.dev). A browser tower defence:
Three.js + Vite. The camera looks straight down on a 13x9 board (orthographic). Seven towers,
eight enemy kinds, four garden materials. Today every visual is procedural geometry and a unicode
symbol in a coloured chip (src/look.js, src/world.js). Luc's verdict: "disgusting". This round
replaces all of it with hand-painted-looking art.

Do not touch /Users/ls/Claude-Workspace/personal/undergrowth/ (v1, frozen).

## Rules for every lane
1. Write ONLY inside your lane folder (fleet-r6-art/<lane>/) unless your prompt lists other files.
   Read anything under undergrowth-v2/. Never touch /Users/ls/Claude-Workspace/work/.
2. Never edit `.env`. Never `git push`, `wrangler deploy`, or publish. Do not commit; the
   orchestrator commits. Do not run `npm run build`; do not touch dist/.
3. No new npm packages. Use `--cache "$TMPDIR/npmcache"` on any npm command.
4. tests/golden.mjs and tests/golden.json are the behaviour freeze. Never edit them.
5. Use your editor / Write tool to create text files. Image files are written by your script.
6. Within 10 minutes of starting, write a draft REPORT.md in your lane folder and keep updating
   it. Its mtime is your heartbeat.
7. When finished, your lane folder must contain:
   - REPORT.md: what you made, how to check it, total cost in USD, what is unverified.
   - result.json:
     {"state":"done","taskId":"<your CNVS task id from the prompt>",
      "model":{"requested":"<id from prompt>","effective":"<id you actually ran as>","source":"spawn flag"},
      "files":[...],"verify":{"cmd":"<your verify command>","exit":0},"unverified":[...]}
8. Writing style: plain words, short sentences, no em dashes.
9. Headless Playwright is allowed for screenshots. The system browser (`open`) is forbidden.
10. Only Luc opens browser windows. To show an image, write it to disk; the live gallery node
    already watches your lane folder.

## The style bible (paste this prefix at the start of EVERY image prompt, verbatim)

> Hand-painted stylized fantasy game art in the style of premium tower defense games such as
> Kingdom Rush: chunky simplified forms, one bold readable silhouette, thick soft painterly
> shading, warm key light from the upper left with a cool violet shadow side, saturated but
> harmonious colours, a thin dark outline around the whole silhouette, crisp clean edges,
> high detail on the focal point and calm simple large shapes elsewhere. No text, no letters,
> no watermark, no frame, no border, nothing cut off at the edges.

Then append the subject sentence from your lane's list. For sprites and icons also append:
"Single object, centred, filling about 80 percent of the frame, isolated on a fully transparent
background." For tileable textures append: "Seamless tileable texture, edges wrap perfectly,
even lighting, no single focal object, fills the whole frame."

Palette anchors (use the words, not the hex, in prompts): meadow greens #b9cb95 to #5d8a4c,
soil #6a6d4c, bark #7a6444, thorn amber #9a5f18, sap teal #2b8b83, bloom rose #c23f5c, sunstone
violet #6b52b5, hedge green #4c7a37, ember orange #d2400f, lantern gold #efc31c, wood olive
#6c8c3f, rock grey #7c837a, iron steel #4f6f7d, diamond cyan #1f93ab.

## Generating (OpenAI gpt-image-2, quality high)

Write `gen.py` in your lane folder from this template. Do not import generate.py from
personal/imagegen (it is for another job). The key is read from
/Users/ls/Claude-Workspace/personal/.env and never printed. The sandbox blocks api.openai.com:
run your script with the sandbox disabled (Claude: `dangerouslyDisableSandbox: true`; codex: run
it from your normal shell).

```python
#!/usr/bin/env python3
# gen.py: generate every asset in MANIFEST that does not exist yet, log cost per image.
import base64, json, pathlib, sys, time, urllib.request, urllib.error
sys.path.insert(0, '/Users/ls/Claude-Workspace/personal/imagegen')
from costlog import record
HERE = pathlib.Path(__file__).resolve().parent
KEY = next(l.split('=', 1)[1].strip() for l in open('/Users/ls/Claude-Workspace/personal/.env') if l.startswith('OPENAI_API_KEY='))
STYLE = "<paste the style bible paragraph here, one line>"
MANIFEST = [  # (filename, subject sentence, size, transparent)
    ("icon-thorn.png", "...", "1024x1024", True),
]
def gen(name, subject, size, transparent):
    out = HERE / name
    if out.exists(): return
    body = {"model": "gpt-image-2", "prompt": STYLE + " " + subject, "size": size,
            "quality": "high", "output_format": "png", "n": 1}
    if transparent: body["background"] = "transparent"
    req = urllib.request.Request("https://api.openai.com/v1/images/generations",
        data=json.dumps(body).encode(), headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"})
    for attempt in range(5):
        try:
            with urllib.request.urlopen(req, timeout=300) as r: payload = json.load(r)
            break
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < 4: time.sleep(10 * (attempt + 1)); continue
            raise
    out.write_bytes(base64.b64decode(payload["data"][0]["b64_json"]))
    (HERE / 'prompts' / (out.stem + '.txt')).write_text(STYLE + " " + subject)
    record(HERE, name, provider="openai", model="gpt-image-2", usage=payload.get("usage"))
    print("wrote", name, flush=True)
(HERE / 'prompts').mkdir(exist_ok=True)
for item in MANIFEST: gen(*item)
```

Rules for generated files:
- Finals live at the TOP level of your lane folder with the exact names in your prompt.
  Rejected takes go in `candidates/` (the gallery shows them as candidates). Never leave a bad
  take under a final name: move it to candidates/ and regenerate.
- LOOK at every image you make (Read the PNG). Reject and regenerate anything with text,
  a cut-off edge, an opaque background where transparency was asked, or a silhouette that
  does not read at 64 px. Budget: at most 3 takes per asset, then keep the best and note it.
- Downscaled copies: for every final also write `<stem>@<n>.png` at the size your prompt
  gives, with `sips -z <n> <n> <file> --out <stem>@<n>.png` (sips keeps alpha).
- costs.jsonl must have one line per image generated (record() does this). Put the total in
  REPORT.md.

## Verify
`node fleet-r6-art/check-assets.mjs <lane>` is your gate. It is read-only. It checks every
required final exists, is a real PNG of the required size, has an alpha channel where required,
has a downscaled copy, and that costs.jsonl and result.json are in place. Run it yourself before
you report done.
