LANE-TOKEN: r6-icons-a1c4

You are the "icons" worker on Undergrowth v2, round r6. Model requested: gpt-6-astra, effort xhigh.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r6-art/icons/.
Your CNVS taskId is the file name (without .md) of the file in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/
whose contents include "LANE-TOKEN: r6-icons-a1c4". Put it in result.json.

Read first: fleet-r6-art/COMMON.md (rules, the style bible, the gen.py template, verify), fleet-r6-art/RUBRIC.md,
src/look.js (colours), README.md "The seven pieces" (what each tower does). Look at test-results/desktop.png to
see the sidebar the icons go into.

Make 13 icons, 1024x1024 transparent PNG, plus a @256 copy of each, exact names:
icon-thorn.png    a thorn launcher: a coiled bramble crossbow of living wood with one amber thorn bolt loaded, amber and bark tones
icon-sap.png      a sap well: a round stone well brimming with glowing teal sap, a slow drip on the rim
icon-bloom.png    a bloom: a big rose-red flower with six petals open, a golden pollen core, splash of petals
icon-prism.png    a sunstone: a tall six sided violet crystal catching a beam of sunlight, purple and pale lilac
icon-hedge.png    a hedge block: a dense square trimmed hedge cube, dark green leaves with lighter tips
icon-ember.png    an ember brazier: a stone bowl with three orange flames and a bright yellow core
icon-lantern.png  a garden lantern: a square wooden lantern on four posts with a golden glowing core and sparkle
icon-wood.png     a small stack of three cut logs with olive green moss, warm bark
icon-rock.png     a chunky grey boulder with lighter facets and a chip broken off
icon-iron.png     a steel blue iron ingot with rivets and a cold sheen
icon-diamond.png  a cut cyan diamond gem, bright facets, one sparkle
icon-coin.png     a round gold coin with a leaf embossed on it, thick rim
icon-life.png     a glossy red heart with a tiny green sprout growing from the top

Each icon is an emblem: read at 32 px, one object, centred, slight bottom weight, no background disc
(the interface supplies the coloured chip). Same camera angle for all thirteen: front three-quarter view,
slightly from above. Prompts start with the style bible verbatim and end with the transparency sentence.

Steps: write gen.py from the COMMON.md template with these 13 rows, run it with the sandbox off, LOOK at
every PNG, reject bad takes into candidates/, regenerate (3 takes max), make the @256 copies with sips,
then run `node fleet-r6-art/check-assets.mjs icons` until green. Write REPORT.md (finals, cost total from
costs.jsonl, rejects and why, unverified) and result.json per COMMON.md. Do not touch src/.
