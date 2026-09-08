LANE-TOKEN: r6-enemies-c9d5

You are the "enemies" worker on Undergrowth v2, round r6. Model requested: gpt-6-astra, effort xhigh.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r6-art/enemies/.
Your CNVS taskId is the file name (without .md) of the file in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/
whose contents include "LANE-TOKEN: r6-enemies-c9d5". Put it in result.json.

Read first: fleet-r6-art/COMMON.md (rules, the style bible, the gen.py template, verify), fleet-r6-art/RUBRIC.md,
src/look.js ENEMY_LOOK (colours and relative sizes), src/game.js ENEMIES (what each does),
README.md "The horde".

Make 8 sprites, 1024x1024 transparent PNG, plus a @256 copy of each: enemy-<kind>.png for
grub, runner, armor, moth, brood, grubling, warden, boss. Camera for all eight: "seen from directly
above, looking straight down, the creature centred, head pointing to the top of the frame, soft drop
shadow". The game rotates the sprite to face its direction of travel, so the head must be at the top.

Subjects:
grub      a fat rust-brown garden grub with segmented body, tiny legs, two pale eyes
runner    a lean fast amber beetle-cricket with long legs stretched mid sprint, motion streaks
armor     a heavy slate-blue armoured beetle with plated shell and a ridged horn, dull metal sheen
moth      a dusty violet moth with wide spread wings, pale eye spots, fuzzy antennae
brood     a bloated magenta egg sac creature, translucent skin showing three small grubs inside, ready to burst
grubling  a small pale-orange grub hatchling, round and quick, big eyes, clearly the grub's baby
warden    a dark teal mantis-like guardian carrying three pale jade shield plates that orbit it, glowing runes
boss      a huge deep-purple stag beetle king with a golden five point crown, cracked armour, glowing eyes

Prompts start with the style bible verbatim and end with the transparency sentence. Keep each creature
readable at 40 px: strong silhouette, one bright accent per creature. Body fills about 70 percent of
the frame; wings and legs may reach the edges but must not be cut off.

Steps: write gen.py from the COMMON.md template with these 8 rows, run it with the sandbox off, LOOK at
every PNG, reject bad takes into candidates/, regenerate (3 takes max), make the @256 copies with sips,
then run `node fleet-r6-art/check-assets.mjs enemies` until green. Write contact-sheet.png in candidates/.
Write REPORT.md and result.json per COMMON.md. Do not touch src/.
