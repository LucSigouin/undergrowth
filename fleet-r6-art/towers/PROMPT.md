LANE-TOKEN: r6-towers-b7e2

You are the "towers" worker on Undergrowth v2, round r6. Model requested: gpt-6-astra, effort xhigh.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r6-art/towers/.
Your CNVS taskId is the file name (without .md) of the file in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/
whose contents include "LANE-TOKEN: r6-towers-b7e2". Put it in result.json.

Read first: fleet-r6-art/COMMON.md (rules, the style bible, the gen.py template, verify), fleet-r6-art/RUBRIC.md,
src/look.js (colours and the shape word per tower), src/world.js makeTower (what each tower is today),
README.md "The seven pieces". Look at test-results/combat.png to see the board they sit on.

Make 21 sprites, 1024x1024 transparent PNG, plus a @512 copy of each: tower-<id>-l<1|2|3>.png for
ids thorn, sap, bloom, prism, hedge, ember, lantern. The game camera looks straight down, so every
sprite is "seen from directly above, looking straight down, the tower centred on its square stone base
plate, a soft drop shadow toward the lower right". Same camera for all 21. The base plate is round and
tinted in the tower's colour; hedge has no plate, it fills its whole square.

Subjects (level 1 first; level 2 adds reinforcement and ornament; level 3 is grand, larger crown,
magical glow, banners or gold trim; keep the same silhouette family across the three):
thorn    a bramble crossbow turret of living wood on a stump, one amber thorn bolt, barrel pointing to the top of the frame
sap      a round stone well filled with luminous teal sap, ripples, moss on the rim
bloom    a giant rose-red six petal flower turret, golden pollen core, leaves around the base
prism    a tall violet six sided crystal on a dark stone plinth, light refracting, seen from above so the tip is centred
hedge    a dense square trimmed hedge block filling the square, dark green with lighter clipped top, tiny white flowers at level 3
ember    a stone brazier bowl with three orange flames and a yellow core, scorched ring on the ground
lantern  a square wooden garden lantern on four posts with a golden glowing core, warm light pool on the ground

Prompts start with the style bible verbatim and end with the transparency sentence. Levels must be
distinguishable at 64 px: change scale of the crown, add elements, add glow. Do not change the base
colour of a tower between levels.

Steps: write gen.py from the COMMON.md template with these 21 rows, run it with the sandbox off, LOOK at
every PNG, reject bad takes into candidates/ (wrong camera, text, halo, off-centre), regenerate (3 takes
max), make the @512 copies with sips, then run `node fleet-r6-art/check-assets.mjs towers` until green.
Also write contact-sheet.png (a 7x3 grid of the @512 finals, any tool, put it in candidates/ so the gate
ignores it) so the scorer can compare. Write REPORT.md and result.json per COMMON.md. Do not touch src/.
