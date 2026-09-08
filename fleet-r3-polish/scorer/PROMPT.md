LANE-TOKEN: r3-scorer-b7e0

You are the SCORER for Undergrowth v2, fleet round r3 (polish contest). You have no prior context and
that is the point. You built nothing. Two lanes, "a" and "b", each polished a full copy of the same game
from the same brief. You grade both cold, on the same items, and name the winner. Lanes are blind: do not
try to work out which tool built which, and do not mention any CLI or model name.

Read first:
1. /Users/ls/Claude-Workspace/Fleet-Machine/fleet-r5-rating/synthesis/RATING-SYSTEM-v1.md (how to score)
2. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r3-polish/RUBRIC.md (the 6 items, scored per lane)
3. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r3-polish/BRIEF.md and ROUND.md (what was asked)

Layout:
- Main tree (the "before", commit 6e3fc79): /Users/ls/Claude-Workspace/personal/undergrowth-v2/ with its
  reference screenshots in workbench/shots/r2/*.png. Dev server http://localhost:5174.
- Lane a: /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r3-polish/a/ (REPORT.md, result.json,
  shots/, FROZEN.sha). Dev server http://localhost:5181.
- Lane b: /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r3-polish/b/ (same layout). Dev server
  http://localhost:5182.
Do not modify any file in any of those trees. Read-only commands only. Playwright is approved: take your own
screenshots into /tmp/claude/r3-score/<lane>/ so you are not grading staged shots. Never open the system browser.

Mechanical gate, run inside EACH lane folder, record each exit code:
  npm test && node tests/golden.mjs && node tests/balance-gate.mjs && npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}" && awk 'length>110{f=1} END{exit f}' src/*.js
  GARDEN_URL=http://localhost:<port> node tests/browser.mjs    (run this one THREE times per lane; the orchestrator
  saw one failure out of four runs on lane a and needs to know whether it is a flake in the test or a bug in the lane;
  if a run fails, save its output and read the stack)
Also: `diff <lane>/src/game.js <main>/src/game.js` for item 1, and `diff -r <main>/src <lane>/src | head` to see
what each lane touched.

Then, per lane, judge the 6 rubric items 0-10 in 0.5 steps with RATING-SYSTEM-v1 anchors. For items 2 and 3
take your own screenshots at 1440x1000 (fresh board; then place a few towers via window.__garden.game.place,
start a wave, step ~8 s with window.__garden.step(8), select a tower by clicking its cell via
window.__garden.world.cellScreen) and at 390x844 and 844x390 with the iPhone 13 device descriptor. Look at them
with your Read tool next to the main tree's workbench/shots/r2/ shots. For item 4 test each fix by hand in the
page: distinct symbols (compare the four icons), Lantern boost indicator on select/hover, Sunburst armed state
and cancel and that a board tap while armed does not place a tower (check game.towers.length before/after),
help dialog text. For item 5 check contrast of 3 text/background pairs with a computed ratio, the 44 px rule
on phone buttons, and that no npm dependency was added (`diff <lane>/package.json <main>/package.json`).

Deliverables in /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r3-polish/scorer/ (Write tool):
- SCORE.md: gate exit codes per lane (including the three browser.mjs runs each), a table with the 6 items
  as rows and lanes a and b as columns with a one-line reason per cell, averages, PASS/FAIL per lane, the
  WINNER with a two-line justification, traced claims (pick 3 from each REPORT.md, reproduce), redo notes
  for a failing lane, and a short "for the next round" list. Plain words, no em dashes.
- score.json: {"round":"r3","lanes":{"a":{"items":{"1":n,...,"6":n},"overall":n,"verdict":"PASS"|"FAIL","browser_runs":[e,e,e]},"b":{...}},"winner":"a"|"b"|null,"gate":{"a_exit":n,"b_exit":n}}
- result.json: {"state":"done","taskId":"<see below>","model":{"requested":"claude-fable-5","effective":"<model id you run as>","source":"spawn flag"},"files":[...],"verify":{"cmd":"...","exit":0},"unverified":[]}
  Your taskId is the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents
  include "LANE-TOKEN: r3-scorer-b7e0".

Do not commit, build, push, deploy, or open the system browser. Never edit anything outside fleet-r3-polish/scorer/.
