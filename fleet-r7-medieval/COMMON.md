# Common brief for every worker on Undergrowth v2, round r7 (medieval castle siege re-theme)

Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git, main, base commit d511e65; public at
github.com/LucSigouin/undergrowth, live at undergrowth.pages.dev). Browser tower defence, Three.js + Vite, camera
straight down on a 13x9 board. Round r6 gave it painted garden art (fleet-r6-art/). Luc now wants the whole theme
changed to a MEDIEVAL CASTLE SIEGE: art, names, copy and interface palette. The four materials stay wood, rock,
iron and diamond. Rules, numbers and save format do not change.

## Rules for every lane
1. Write ONLY inside your lane folder (fleet-r7-medieval/<lane>/) unless your prompt lists other files.
   Never touch /Users/ls/Claude-Workspace/work/ or /Users/ls/Claude-Workspace/personal/undergrowth/ (v1).
2. Never edit `.env`. Never `git push`, `wrangler deploy`, or publish. Do not commit. Do not run `npm run build`.
3. No new npm packages. Use `--cache "$TMPDIR/npmcache"` on any npm command.
4. tests/golden.mjs and tests/golden.json are the behaviour freeze. Never edit them. src/game.js may change ONLY in
   its string literals (names, desc, effect, tip); the gate strips every string literal and compares the rest to d511e65.
5. Text files: your editor / Write tool. Images: your script.
6. Within 10 minutes write a draft REPORT.md in your lane folder and keep updating it (its mtime is your heartbeat).
7. When finished your lane folder holds REPORT.md (what, how to check, cost in USD if any, unverified) and result.json:
   {"state":"done","taskId":"<your CNVS task id>","model":{"requested":"<id from prompt>","effective":"<id you ran as>",
   "source":"spawn flag"},"files":[...],"verify":{"cmd":"...","exit":0},"unverified":[...]}
8. Plain words, short sentences, no em dashes. Headless Playwright allowed; the system browser (`open`) is forbidden.
9. CNVS runs verify commands from /Users/ls/Claude-Workspace/personal, so use absolute paths in anything you hand back.

## The theme: medieval castle siege

The keep is under siege. The player builds war engines and walls in the bailey; the horde marches from its camp
gate at the top to the keep gate at the bottom. Same ids, new names and looks:

| id | old | NEW name | what it looks like |
|---|---|---|---|
| thorn | Thorn | Ballista | wooden ballista turret on a round stone platform, iron-tipped bolt loaded, amber and oak tones |
| sap | Sap well | Tar pit | round stone-rimmed pit of black bubbling tar with a teal-green sheen, sticky drips (it slows) |
| bloom | Bloom | Catapult | wooden catapult with a red-painted arm and a basket of stones, splash of rubble (area damage) |
| prism | Sunstone | Mage spire | slender stone spire with a violet crystal orb at the top, arcane glow (long range, pierces armor) |
| hedge | Hedge | Palisade | square block of sharpened timber stakes bound with rope, fills its square (wall, no attack) |
| ember | Ember | Brazier | iron fire brazier on a stone base, orange flames, coals, scorch ring (burning) |
| lantern | Lantern | War banner | tall pole with a red and gold heraldic banner, gilded finial, rally glow (nearby towers fire faster) |

| id | old | NEW name | what it looks like |
|---|---|---|---|
| grub | Grub | Goblin | squat green goblin footsoldier with a rusty blade and leather cap |
| runner | Runner | Wolf rider | lean grey wolf with a small goblin rider, mid sprint |
| armor | Beetle | Iron knight | heavy knight in dark plate armour, great shield, slow (armor) |
| moth | Moth | Gargoyle | grey stone gargoyle with bat wings spread, flies over walls |
| brood | Brood sac | War wagon | wooden goblin war wagon full of whelps, breaks open when destroyed (splits into three) |
| grubling | Grubling | Whelp | tiny goblin whelp with a dagger, fast |
| warden | Warden | Paladin | tall paladin in white and gold with a glowing holy shield aura (shields nearby, ignores tar) |
| boss | Guardian | Warlord | huge orc warlord with a horned iron crown and a two-handed axe, banner on his back |

Materials keep their names and meaning: Wood (cut logs), Rock (quarried stone), Iron (forged ingot), Diamond
(cut gem). Coin: gold coin with a crown. Life: heraldic red heart on a small shield. The "garden" that produces
materials becomes the "works": sawmill (wood), quarry (rock), forge (iron), gem cutter (diamond). Words to retire
everywhere in copy: garden, meadow, farm, plot, grub, bug, beetle, moth, pollen, sap, bloom, hedge, lantern, horde
stays (a horde is fine), settlement becomes keep, "expedition" becomes "siege".

## The style bible (paste at the start of EVERY image prompt, verbatim)

> Hand-painted stylized medieval fantasy game art in the style of premium tower defense games such as
> Kingdom Rush: chunky simplified forms, one bold readable silhouette, thick soft painterly shading, warm
> torchlight key light from the upper left with a cool blue-grey shadow side, saturated but harmonious colours
> built on grey castle stone, aged oak, iron, heraldic crimson and gold, a thin dark outline around the whole
> silhouette, crisp clean edges, high detail on the focal point and calm simple large shapes elsewhere.
> No text, no letters, no watermark, no frame, no border, nothing cut off at the edges.

Then the subject sentence from your lane. Sprites and icons also end with: "Single object, centred, filling about
80 percent of the frame, isolated on a fully transparent background." Tileable textures end with: "Seamless
tileable texture, edges wrap perfectly, even flat lighting across the whole frame, no vignette, no single focal
object, fills the whole frame." (r6 lesson: a lit centre turns into a checker when tiled.)

## Generating (OpenAI gpt-image-2, quality high)
Same as round r6: copy the gen.py template from fleet-r6-art/COMMON.md into your lane folder (change nothing but
STYLE and MANIFEST), run it with the sandbox off, LOOK at every image, reject bad takes into candidates/, at most
3 takes per asset, downscaled copies with `sips -z <n> <n> <file> --out <stem>@<n>.png`, one costs.jsonl line per
image (record() does it), total cost in REPORT.md. Finals at the top level of your lane folder with the exact
names in your prompt. The key is never printed.

## Verify
Art lanes: `node /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/check-assets.mjs <lane>`.
Theme lane: `node /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/check-theme.mjs` plus
npm test, golden, balance gate, format check, and the three Playwright gates.
