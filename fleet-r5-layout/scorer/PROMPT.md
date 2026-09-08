LANE-TOKEN: r5-scorer-d4e6

You are the SCORER for Undergrowth v2, fleet round r5 (layout). Zero prior context, you built nothing.
Grade cold from files, commands and your own Playwright screenshots. Do not trust REPORT.md.

Read first:
1. /Users/ls/Claude-Workspace/Fleet-Machine/fleet-r5-rating/synthesis/RATING-SYSTEM-v1.md
2. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r5-layout/RUBRIC.md (6 items)
3. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r5-layout/ROUND.md (Luc's three asks)

Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git). Gate commit c79525c; the lane's work is
the uncommitted tree (`git diff c79525c --stat`). Lane folder: fleet-r5-layout/layout/ (REPORT.md, result.json,
shots/, FROZEN.sha). Dev server http://localhost:5174. Read-only: modify nothing.

Mechanical gate (run, record exit code):
  cd /Users/ls/Claude-Workspace/personal/undergrowth-v2 && npm test && node tests/golden.mjs && node tests/balance-gate.mjs && git diff --quiet c79525c -- tests/layout-gate.mjs src/game.js && npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}" && awk 'length>110{f=1} END{exit f}' src/*.js && GARDEN_URL=http://localhost:5174 node tests/layout-gate.mjs && GARDEN_URL=http://localhost:5174 node tests/browser.mjs
Also run `GARDEN_URL=http://localhost:5174 node tests/mobile-layout.mjs` and record its exit.

Then judge the 6 items 0-10 in 0.5 steps. Take your own screenshots into /tmp/claude/r5-score/ at 1280x720,
1920x1080, 390x844 (iPhone 13 descriptor) and 844x390, fresh game and mid-wave with a tower selected. Check by
eye: is every sidebar control visible at 1280x720 without scrolling; does hovering AND keyboard-focusing a tower
card show a note with effect, tip and stats; is #detail hidden with nothing selected and shown with a placed
tower selected (upgrade, reclaim, missing-material text); do the material chips sit in the map's top band on
the right, update live (buy the wood plot, step 10 s with window.__garden.step(10), read #wood), and open the
garden on click; is the r3 look preserved (compare with workbench/shots/r3/*.png); contrast of the HUD text.

Deliverables in /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r5-layout/scorer/ (Write tool):
- SCORE.md: gate exit codes, 6-item table with score + one-line reason, traced claims (3 from REPORT.md),
  average, PASS/FAIL (>= 8.5 and no item <= 5.5), redo notes if FAIL, short "for the next round" list.
  Plain words, no em dashes, no CLI or model names.
- score.json: {"round":"r5","items":{"1":n,...,"6":n},"overall":n,"verdict":"PASS"|"FAIL","gate":{"exit":n,"mobile_exit":n},"traced":{"checked":n,"reproduced":n}}
- result.json: {"state":"done","taskId":"<see below>","model":{"requested":"claude-fable-5","effective":"<model id you run as>","source":"spawn flag"},"files":[...],"verify":{"cmd":"...","exit":0},"unverified":[]}
  Your taskId is the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents
  include "LANE-TOKEN: r5-scorer-d4e6".
Do not commit, build, push, deploy, or open the system browser. Never edit anything outside fleet-r5-layout/scorer/.
