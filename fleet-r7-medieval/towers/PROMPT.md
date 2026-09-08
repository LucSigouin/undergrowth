LANE-TOKEN: r7-towers-b8c3

You are the "towers" worker on Undergrowth v2, round r7 (medieval castle siege). Model requested: gpt-6-astra, effort xhigh.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r7-medieval/towers/.
Your CNVS taskId: the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include
"LANE-TOKEN: r7-towers-b8c3". Put it in result.json.

Read first: fleet-r7-medieval/COMMON.md (rules, theme table, style bible, generation, verify), fleet-r7-medieval/RUBRIC.md,
fleet-r6-art/COMMON.md (gen.py template), fleet-r6-art/towers/candidates/contact-sheet.png (last round: the camera, the
round base plate and the level progression are what to keep; the garden look is what to replace).

Make 21 sprites, 1024x1024 transparent PNG, plus a @512 copy: tower-<id>-l<1|2|3>.png for ids thorn, sap, bloom, prism,
hedge, ember, lantern (old ids, new looks). Camera for all 21: "seen from directly above, looking straight down, the
engine centred on its round grey flagstone base plate, a soft drop shadow toward the lower right". hedge has no plate
and fills its whole square. Levels: l1 plain timber and stone; l2 reinforced with iron bands, more ornament, a small
crimson pennant; l3 grand, gilded trim, larger crown, magical or fiery glow, banners. Same silhouette family and the
same main colour across the three levels.

thorn    a wooden ballista turret, iron-tipped bolt loaded, the bolt pointing to the top of the frame, oak and amber
sap      a round stone-rimmed tar pit of black bubbling tar with a teal-green sheen, sticky rim drips
bloom    a wooden catapult with a red-painted arm and a basket of grey stones, rubble scattered on the plate
prism    a stone mage spire seen from above so the glowing violet crystal orb is centred, arcane runes on the plate
hedge    a square palisade block of sharpened timber stakes bound with rope filling the square, l3 with iron spikes and a crimson pennant
ember    an iron fire brazier on a stone base, orange flames, coals, scorch ring on the flagstones
lantern  a war banner pole seen from above, the crimson and gold banner spread beside the pole, a warm rally glow on the plate

Prompts start with the style bible verbatim and end with the transparency sentence. Levels must differ at 64 px.
Steps: gen.py with these 21 rows, sandbox off, LOOK at every PNG, reject to candidates/ (wrong camera, text, halo,
off-centre), regenerate (3 takes max), sips @512 copies, then
`node /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/check-assets.mjs towers` until green.
Write candidates/contact-sheet.png (7x3 grid of the @512 finals, labelled). REPORT.md and result.json per COMMON.md. Do not touch src/.
