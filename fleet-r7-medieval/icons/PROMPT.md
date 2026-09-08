LANE-TOKEN: r7-icons-a2d1

You are the "icons" worker on Undergrowth v2, round r7 (medieval castle siege). Model requested: gpt-6-astra, effort xhigh.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r7-medieval/icons/.
Your CNVS taskId: the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include
"LANE-TOKEN: r7-icons-a2d1". Put it in result.json.

Read first: fleet-r7-medieval/COMMON.md (rules, theme table, style bible, generation, verify), fleet-r7-medieval/RUBRIC.md,
fleet-r6-art/COMMON.md (the gen.py template), fleet-r6-art/icons/candidates/orchestrator-sheet.png (last round's icons, for
scale and framing, NOT for style).

Make 13 icons, 1024x1024 transparent PNG, plus a @256 copy, exact names (ids stay the old ids):
icon-thorn.png    a wooden ballista turret with an iron-tipped bolt loaded, oak and amber, front three-quarter view
icon-sap.png      a round stone-rimmed tar pit, black bubbling tar with a teal-green sheen, one sticky drip on the rim
icon-bloom.png    a wooden catapult with a red-painted throwing arm and a basket of grey stones
icon-prism.png    a slender grey stone mage spire topped with a glowing violet crystal orb
icon-hedge.png    a square palisade block of sharpened timber stakes bound with rope
icon-ember.png    an iron fire brazier on a stone base, orange flames, glowing coals
icon-lantern.png  a war banner: a tall pole with a crimson and gold heraldic banner and a gilded finial
icon-wood.png     a small stack of three cut oak logs, warm bark, axe marks
icon-rock.png     a chunky grey quarried stone block with chisel facets and a chip broken off
icon-iron.png     a dark steel-blue forged iron ingot with hammer marks and a cold sheen
icon-diamond.png  a cut cyan diamond gem, bright facets, one sparkle
icon-coin.png     a round gold coin with a crown embossed on it, thick rim
icon-life.png     a glossy crimson heart on a small heraldic shield with a gold rim

Emblems: read at 32 px, one object, centred, slight bottom weight, no background disc. Same camera for all thirteen:
front three-quarter view, slightly from above. Prompts start with the style bible verbatim and end with the
transparency sentence. Steps: gen.py from the template with these 13 rows, run with the sandbox off, LOOK at every PNG,
reject to candidates/ and regenerate (3 takes max), sips @256 copies, then
`node /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/check-assets.mjs icons` until green.
Also write candidates/contact-sheet.png (all 13 at 256 on one image). REPORT.md and result.json per COMMON.md. Do not touch src/.
