LANE-TOKEN: r7-enemies-c4e9

You are the "enemies" worker on Undergrowth v2, round r7 (medieval castle siege). Model requested: gpt-6-astra, effort xhigh.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r7-medieval/enemies/.
Your CNVS taskId: the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include
"LANE-TOKEN: r7-enemies-c4e9". Put it in result.json.

Read first: fleet-r7-medieval/COMMON.md (rules, theme table, style bible, generation, verify), fleet-r7-medieval/RUBRIC.md,
fleet-r6-art/COMMON.md (gen.py template), fleet-r6-art/enemies/candidates/contact-sheet.png (last round: keep the camera and
the head-up framing, replace the insects with the siege creatures).

Make 8 sprites, 1024x1024 transparent PNG, plus a @256 copy: enemy-<kind>.png for grub, runner, armor, moth, brood,
grubling, warden, boss (old ids, new creatures). Camera for all eight: "seen from directly above, looking straight
down, the creature centred, head pointing to the top of the frame, soft drop shadow". The game rotates the sprite to
face its direction of travel, so the head must be at the top.

grub      a squat green goblin footsoldier with a rusty blade and a leather cap, marching
runner    a lean grey wolf mid sprint with a small goblin rider clinging to its back, motion streaks
armor     a heavy knight in dark plate armour with a great shield and a closed helm, slow and solid
moth      a grey stone gargoyle with bat wings spread wide, glowing eyes, flying
brood     a wooden goblin war wagon with iron-rimmed wheels, three whelps peeking out, ready to burst open
grubling  a tiny goblin whelp with a dagger, round and quick, big eyes, clearly the goblin's runt
warden    a tall paladin in white and gold plate with a glowing holy shield aura around him, a warhammer
boss      a huge orc warlord with a horned iron crown, a two-handed axe, a tattered war banner on his back, glowing eyes

Prompts start with the style bible verbatim and end with the transparency sentence. Readable at 40 px: strong
silhouette, one bright accent per creature. Body fills about 70 percent of the frame; wings, weapons and banners may
reach the edges but never cut off. Steps: gen.py with these 8 rows, sandbox off, LOOK, reject to candidates/,
regenerate (3 takes max), sips @256 copies, then
`node /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/check-assets.mjs enemies` until green.
Write candidates/contact-sheet.png (8 creatures at 256, 64 and 40 px, labelled). REPORT.md and result.json per COMMON.md. Do not touch src/.
