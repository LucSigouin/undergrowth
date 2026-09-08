# Icons lane, round r7

Status: done. The required asset gate passed with exit 0.

Task: 32B46132-7475-483E-A6D3-5223491F85F9.
Lane token: r7-icons-a2d1.
Worker model: requested gpt-6-astra, effective gpt-6-astra, source spawn flag. Requested effort: xhigh.

Created 13 medieval siege icons at 1024 by 1024 pixels, each with native RGBA transparency.
Each icon has a 256 by 256 copy made with sips.
All final PNGs are at the top level of this folder. The old ids are preserved.

| File stem | Subject |
|---|---|
| icon-thorn | Ballista with loaded iron bolt |
| icon-sap | Stone-rimmed tar pit with teal sheen and rim drip |
| icon-bloom | Catapult with red arm and basket of stones |
| icon-prism | Stone mage spire with violet crystal orb |
| icon-hedge | Square timber palisade with rope bindings |
| icon-ember | Iron brazier with orange flames and coals |
| icon-lantern | Crimson and gold war banner |
| icon-wood | Three cut oak logs |
| icon-rock | Chiseled stone block with a broken chip |
| icon-iron | Forged steel-blue ingot with hammer marks |
| icon-diamond | Faceted cyan gem with one sparkle |
| icon-coin | Thick gold coin with an embossed crown |
| icon-life | Crimson heart on a gold-rimmed shield |

Generation used the supplied gen.py API template, gpt-image-2, high quality, 1024x1024 and transparent background.
Only STYLE and MANIFEST differ from the r6 template. An AST comparison confirmed this.
Each prompt starts with the r7 style bible verbatim and ends with the required transparency sentence.
Each uses the same front three-quarter camera, slightly from above. The saved prompts are in prompts/.
The r6 sheet was inspected for framing only. All 13 first takes were retained. There were no rejected takes.

Every original was opened and inspected. All icons were also reviewed at 256, 160, 64 and 32 pixels.
The silhouettes remain distinct. No text, watermark, opaque backdrop or visible cut-off object was found.
The native alpha was preserved. Fully transparent pixels cover 41.888 to 75.891 percent of each original.
Tar pit, War banner and Iron contain a few border pixels at alpha 1 of 255.
These are invisible on the dark and parchment composites. No visible silhouette touches a frame edge.
The audit records both raw alpha bounds and bounds above alpha 2 of 255.

Review artifacts:

- candidates/contact-sheet.png: all 13 icons at 256 pixels on checkerboard cells.
- candidates/game-size-sheet.png: all 13 icons at 160 pixels.
- candidates/readability-sheet.png: all 13 at 64 and 32 pixels on dark and parchment backgrounds.
- candidates/sap-parchment-review.png: full-size tar pit alpha composite.
- candidates/alpha-audit.json: dimensions, alpha ranges, bounds, edge values and transparent fractions.

Recorded generation cost: USD 2.75414 across 13 image requests.
This is the sum of usd in costs.jsonl using the supplied logger rates dated 2026-08-30.
There is one cost line per generated image. No generation calls required a second take.
The 1024 pixel originals total 18,691,121 bytes. The 256 pixel copies total 1,131,515 bytes.

Checks:

- Generator completed with exit 0.
- Prompt prefix, camera, suffix and template comparison passed.
- `python3 -B /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/icons/review.py` passed for all 13 icons.
- `node /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/check-assets.mjs icons` passed with exit 0.
  Output: art gate green (icons): 13 finals with downscaled copies, costs and record present.

Unverified: rendering inside the running game, comparison with other lanes, project-wide integration,
performance and the combined public/art size budget.

All task writes stayed inside fleet-r7-medieval/icons/.
