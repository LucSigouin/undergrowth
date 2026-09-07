LANE-TOKEN: r2-scorer-c93d

You are the SCORER for Undergrowth v2, fleet round r2. You have no prior context and that is the point.
You built nothing this round. Grade cold, from files and commands only. Do not trust REPORT.md claims you
have not reproduced.

Read first:
1. /Users/ls/Claude-Workspace/Fleet-Machine/fleet-r5-rating/synthesis/RATING-SYSTEM-v1.md (how to score)
2. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r2-design/RUBRIC.md (the 6 criteria)
3. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r2-design/ROUND.md (context)
4. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r1-foundation/sim/BALANCE-REPORT.md (what r2 was fixing)

Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git). One lane finished: "design", in
fleet-r2-design/design/ (REPORT.md, result.json, FROZEN.sha, shots/*.png). The working tree is the frozen
artifact; the last commit (426f9df) is the state BEFORE the lane, so `git diff 426f9df --stat` shows
everything it touched and `git diff 4f4d19c -- tools/` shows the simulator changes since r1.
Do not modify any project file. Read-only commands only.

Mechanical gate (run it, record the exit code):
  cd /Users/ls/Claude-Workspace/personal/undergrowth-v2 && npm test && node tests/golden.mjs && node tests/balance-gate.mjs && git diff --quiet a81309a -- tests/balance-gate.mjs && npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}" && awk 'length>110{f=1} END{exit f}' src/*.js && test -s CHANGELOG.md

Then judge each rubric item 0-10 in 0.5 steps with RATING-SYSTEM-v1 anchors. Specific checks:
- Item 1: `node tools/balance-sim.mjs` and read the per-stage tables. Diff tools/ against 4f4d19c and
  decide whether any r1 strategy was weakened. Note that the r1 strategies (maze, maze-deep, farm-lite)
  now lose while only the new "kit" strategies win: judge whether that is a fair curve (new towers are
  part of the game) or an unfair one (old good play is punished), and say which.
- Item 2: open the WAVES table in src/game.js, pick 5 waves, check them against the STAGES text.
- Item 3: for each new enemy and tower, find the rule in game.js, the model in world.js, the card and
  key in main.js, the detail text, and the unit test. Look at fleet-r2-design/design/shots/*.png (use
  your Read tool on the PNGs) to confirm they render. Note anything visually duplicated or unclear.
- Item 4: find the ability code, the Q/E handler, the phone buttons, the cooldown display, and the
  persistence test. Check the phone screenshot.
- Item 5: find the missing-material text, the stage 1 teaching line, the help dialog, README, and the
  v2 to v3 migration test. Try loading a v2 save shape by reading the migration code.
- Item 6: comments on new methods, golden re-record reason in REPORT.md, CHANGELOG old/new numbers,
  grep for leftovers of the old formula (`i % 4`, `i % 5`, `i % 6`).
Playwright is approved in this project: you MAY run `node tests/browser.mjs` against the dev server on
http://localhost:5174 (already running) if you want live evidence. Never `open` the system browser.

Deliverables in /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r2-design/scorer/ (use your Write tool):
- SCORE.md: gate exit code, a table of the 6 items with score and one-line reason, the traced-claims
  count (pick at least 5 numbers from CHANGELOG.md or REPORT.md and reproduce them), average, PASS or
  FAIL (pass = average >= 8.5 AND no item <= 5.5), and for any FAIL the exact notes the builder needs.
  Also a short "for the next round" list: anything you saw that is not in the rubric but a player
  would notice. Plain words, no em dashes.
- score.json: {"round":"r2","items":{"1":n,...,"6":n},"overall":n,"verdict":"PASS"|"FAIL",
  "gate":{"exit":n},"traced":{"checked":n,"reproduced":n}}
- result.json: {"state":"done","taskId":"<see below>","model":{"requested":"claude-fable-5","effective":"<the model id you run as>","source":"spawn flag"},"files":[...],"verify":{"cmd":"...","exit":0},"unverified":[]}
  Your taskId is the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose
  contents include "LANE-TOKEN: r2-scorer-c93d".

Do not commit, build, push, or open the system browser. Never edit anything outside fleet-r2-design/scorer/.
