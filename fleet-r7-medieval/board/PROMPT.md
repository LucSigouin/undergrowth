LANE-TOKEN: r7-board-d5f0

You are the "board" worker on Undergrowth v2, round r7 (medieval castle siege). Model requested: gpt-6-astra, effort xhigh.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r7-medieval/board/.
Your CNVS taskId: the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include
"LANE-TOKEN: r7-board-d5f0". Put it in result.json.

Read first: fleet-r7-medieval/COMMON.md (rules, theme table, style bible, generation, verify), fleet-r7-medieval/RUBRIC.md,
fleet-r6-art/COMMON.md (gen.py template), fleet-r6-art/board/candidates/board-art-preview.png and
fleet-r6-art/integrate/shots/01-fresh-desktop.png (how the board pieces are used: 13x9 tile grid, a path strip down the
middle, an apron frame, outer ground with props, a gate at each end of the middle column).

Make 16 finals, 1024x1024 PNG, same file names as r6 (the game loads them by name), new medieval content:
Opaque, seamless tileable (append the tileable sentence, flat even lighting, no vignette):
tile-meadow-a.png @256  worn grey-green castle bailey ground seen from above: trampled grass over flagstones, even tone
tile-meadow-b.png @256  the same bailey ground, a touch more flagstone showing, same tone
tile-meadow-c.png @256  the same bailey ground with a few small pebbles, same tone (the three must read as one yard)
tile-path.png     @256  a trodden dirt siege road seen from above, cart ruts, small stones, dark earth
ground-outer.png  @512  dark siege camp ground beyond the walls seen from above: mud, trampled grass, scattered arrows and rubble, deep green and brown
apron-wood.png    @512  grey castle rampart stone seen from above: large mortared ashlar blocks with moss in the joints (this frames the board)
Transparent sprites, seen from directly above (append the transparency sentence):
gate-entry.png    @512  the horde's camp gate: a dark timber and iron portcullis in a rough stone arch, torches, ominous
gate-exit.png     @512  the keep gate: an arched stone gatehouse with a crimson and gold banner and a glowing heart shield above the door
prop-tree-a.png   @512  a round leafy oak canopy seen from above, thick trunk shadow
prop-tree-b.png   @512  a tall dark pine canopy seen from above
prop-tree-c.png   @512  a bare dead tree seen from above, twisted branches, a crow
prop-rock-a.png   @256  a mossy grey boulder seen from above
prop-rock-b.png   @256  a broken siege boulder split in two with rubble, seen from above
prop-flowers-a.png @256 a canvas siege tent with a crimson pennant seen from above
prop-flowers-b.png @256 a stack of wooden barrels and a hay bale seen from above
prop-stump.png    @256  a wooden cart wheel and a broken ladder seen from above

Prompts start with the style bible verbatim. After each tile, build a 3x3 repeat (save to candidates/) and LOOK for
seams or a checker; regenerate if visible (3 takes max) and say so in REPORT.md. The three bailey tiles must match
in tone. Steps: gen.py with these 16 rows, sandbox off, LOOK, reject, downscale with sips at the sizes above, then
`node /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r7-medieval/check-assets.mjs board` until green.
REPORT.md and result.json per COMMON.md. Do not touch src/.
