LANE-TOKEN: r6-board-d3f8

You are the "board" worker on Undergrowth v2, round r6. Model requested: gpt-6-astra, effort xhigh.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r6-art/board/.
Your CNVS taskId is the file name (without .md) of the file in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/
whose contents include "LANE-TOKEN: r6-board-d3f8". Put it in result.json.

Read first: fleet-r6-art/COMMON.md (rules, the style bible, the gen.py template, verify), fleet-r6-art/RUBRIC.md,
src/look.js SCENE (colours), src/world.js buildWorld (ground, tiles, apron, trees today). Look at
test-results/desktop.png: a 13x9 grid of meadow squares, a wooden apron, outer ground, trees at the edge,
the horde enters at one end of the middle row and exits at the other.

Make 16 finals, 1024x1024 PNG, exact names and downscale sizes:
Opaque, seamless tileable (append the tileable sentence, not the transparency one):
tile-meadow-a.png @256  soft clipped meadow grass seen from directly above, light yellow-green, a few tiny clover leaves
tile-meadow-b.png @256  the same grass, slightly darker green, a few tiny daisies
tile-meadow-c.png @256  the same grass, a mid green with a faint mown stripe
tile-path.png     @256  trodden bare dirt path seen from above, small pebbles, grass fringe at the very edges only
ground-outer.png  @512  dark forest floor seen from above, moss, fallen leaves, roots, deep green and brown
apron-wood.png    @512  weathered wooden planks seen from above, warm bark brown, iron nails, moss in the cracks
Transparent sprites, seen from directly above (append the transparency sentence):
gate-entry.png    @512  a dark burrow mouth in a mound of earth and roots, ominous, the hole centred
gate-exit.png     @512  a round garden gate of woven living branches with a glowing heart-shaped bloom in the centre
prop-tree-a.png   @512  a round leafy oak canopy seen from above, dappled light, thick trunk shadow
prop-tree-b.png   @512  a tall pine canopy seen from above, blue-green needles
prop-tree-c.png   @512  a flowering cherry canopy seen from above, pink and cream
prop-rock-a.png   @256  a mossy grey boulder seen from above
prop-rock-b.png   @256  two smaller stones seen from above, lichen spots
prop-flowers-a.png @256 a clump of wildflowers seen from above, red and yellow
prop-flowers-b.png @256 a clump of blue bellflowers seen from above
prop-stump.png    @256  a cut tree stump seen from above, visible rings, a mushroom on the side

Prompts start with the style bible verbatim. The three meadow tiles must be near-identical in tone
so a checkerboard of them reads as one lawn with gentle variation, not three different fields. After
generating a tile, build a 3x3 repeat of it (any tool, save to candidates/) and LOOK for seams; if the
seam is obvious, regenerate (3 takes max) and say so in REPORT.md.

Steps: write gen.py from the COMMON.md template with these 16 rows, run it with the sandbox off, LOOK at
every PNG, reject bad takes into candidates/, regenerate, make the downscaled copies with sips at the sizes
above, then run `node fleet-r6-art/check-assets.mjs board` until green. Write REPORT.md and result.json
per COMMON.md. Do not touch src/.
