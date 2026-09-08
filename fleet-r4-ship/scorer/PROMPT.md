LANE-TOKEN: r4-scorer-f1a9

You are the SCORER for Undergrowth v2, fleet round r4 (ship). You have no prior context and that is the
point. You built nothing. Grade cold from files and commands. Do not trust REPORT.md claims you have not
reproduced.

Read first:
1. /Users/ls/Claude-Workspace/Fleet-Machine/fleet-r5-rating/synthesis/RATING-SYSTEM-v1.md (how to score)
2. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r4-ship/RUBRIC.md (the 6 criteria)
3. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r4-ship/ROUND.md (context)

Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git). The lane "ship" finished; its files are
in fleet-r4-ship/ship/ (REPORT.md, result.json) and its work is the uncommitted part of the tree
(`git status --short`, ignore fleet-r3-polish/ which is another round). The gate commit is 6bced06.
Do not modify any project file. Read-only commands only. Never run deploy/deploy.sh. Never run
`wrangler pages deploy`. You may run `npx wrangler pages project list` if you want to confirm no project
was created (read-only); if it asks to log in, skip it and say so.

Mechanical gate (run it, record the exit code):
  cd /Users/ls/Claude-Workspace/personal/undergrowth-v2 && node tools/check-ship.mjs && git diff --quiet 6bced06 -- tools/check-ship.mjs && npm test && node tests/golden.mjs && test -x deploy/deploy.sh && test -s deploy/README.md

Then judge the 6 rubric items 0-10 in 0.5 steps. Specific checks:
- Item 1: `git diff 6bced06 --stat` (what the lane touched). Check `grep -rn "pages deploy" package.json deploy/`.
- Item 2: read deploy/deploy.sh line by line. Confirm it stops on test failure, on golden drift, on
  uncommitted src/, on build failure, on a red gate, and that it never prints credential values.
- Item 3: run `node tools/shoot.mjs --url http://localhost:5174 --out /tmp/claude/shoot-check` twice (the
  v2 dev server is up) and compare file lists; look at the PNGs with your Read tool and compare them with
  workbench/shots/r2/*.png. Also look at workbench/shots/v1/*.png (taken from the old game on :5173).
- Item 4: run `node tools/build-log.mjs` twice into a temp copy if it supports an output flag, else read the
  generator and confirm nothing time-dependent is written. Open workbench/log.html in your Read tool; check
  one section per round (ids r1 to r4), before/after pairs, the score table, the balance table, no em dash,
  no CLI or model names, no `max-width` centred column on the page shell.
- Item 5: .gitignore, README.md Deploy and Mission log sections, package.json scripts shoot/log/check:ship.
- Item 6: REPORT.md quotes the check-ship output and lists the unverified items.
Playwright is approved here; never open the system browser.

Deliverables in /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r4-ship/scorer/ (Write tool):
- SCORE.md: gate exit code, table of 6 items with score + one-line reason, traced claims (pick 5 from
  REPORT.md, reproduce), average, PASS or FAIL (pass = average >= 8.5 AND no item <= 5.5), redo notes on
  FAIL, and a short "for the next round" list. Plain words, no em dashes.
- score.json: {"round":"r4","items":{"1":n,...,"6":n},"overall":n,"verdict":"PASS"|"FAIL","gate":{"exit":n},"traced":{"checked":n,"reproduced":n}}
- result.json: {"state":"done","taskId":"<see below>","model":{"requested":"claude-fable-5","effective":"<model id you run as>","source":"spawn flag"},"files":[...],"verify":{"cmd":"...","exit":0},"unverified":[]}
  Your taskId is the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents
  include "LANE-TOKEN: r4-scorer-f1a9".

Do not commit, build, push, deploy, or open the system browser. Never edit anything outside fleet-r4-ship/scorer/.
