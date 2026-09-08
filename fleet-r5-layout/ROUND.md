# Fleet round r5: layout (everything in sight, no scrolling)

Date: 2026-09-07. Orchestrator: Fable 5.1 (CNVS). Build round: rubric gate applies.
Follows r3/r4 (commit 11f3de2). Luc played the merged build and asked for three changes.

## The ask (Luc, verbatim intent)
1. "Everything should be in sight, no scrolling EVER." The right sidebar scrolls; that must go, at
   every desktop size.
2. Replace the "Before you build" panel (shown when a tower type is selected but nothing is placed)
   with hover notes on the tower cards.
3. Materials (wood, rock, iron, diamond) move onto the map as a HUD, like Stage and lives, on the
   right side of the top band.

## Lanes
| Lane | CLI | Model / effort | Owns | Job |
|---|---|---|---|---|
| layout | claude | claude-opus-5, medium | src/main.js, src/style.css, src/look.js, src/world.js (only if the HUD needs it), tests/browser.mjs, tests/shots.mjs, tests/mobile-layout.mjs, README.md (controls text), fleet-r5-layout/layout/ | the three changes, gate green |
| scorer | claude | fable-5, fresh node | fleet-r5-layout/scorer/ | grade vs RUBRIC.md |

## Gate (mutant-tested, see GATE-TESTED.txt)
`GARDEN_URL=http://localhost:5174 node tests/layout-gate.mjs`: at 1920x1080, 1536x864, 1440x900,
1366x768, 1280x720 the page and every sidebar element must not scroll and no sidebar control may be
cut off; #wood #rock #iron #diamond are inside #scene in the same top band as #stage-number; #detail
is hidden with nothing selected; hovering a tower card shows a note. Red on 11f3de2 (24 failures).
