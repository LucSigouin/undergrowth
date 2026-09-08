# r4 ship: score (zero-context scorer, LANE-TOKEN r4-scorer-f1a9)

Verdict: **PASS, 9.25 / 10.** Gate exit 0. No item at or below 5.5.

## Mechanical gate (run by me, not quoted)

```
cd undergrowth-v2 && node tools/check-ship.mjs && git diff --quiet 6bced06 -- tools/check-ship.mjs \
  && npm test && node tests/golden.mjs && test -x deploy/deploy.sh && test -s deploy/README.md
ship gate green: 4 round sections, 8 images, dist and deploy script present
33 tests, 33 pass, 0 fail
golden replay identical
GATE EXIT: 0
```

GATE-TESTED.txt exists and records the red run on the r2 tree (exit 1, four missing pieces). Gate proven, not just green.

## Items

| # | Item | Score | Reason |
|---|---|---|---|
| 1 | Gate green and honest | 9.5 | Gate exit 0, check-ship.mjs unchanged vs 6bced06. `pages deploy` exists only in deploy/deploy.sh, which nothing runs. wrangler is not even in node_modules. I could not rebuild dist myself (build is forbidden to the scorer) so build reproducibility rests on check-ship's reference check. |
| 2 | Deploy one command and safe | 9.5 | Read line by line. `set -euo pipefail`, stops in order on: failing tests, golden drift, dirty src/, failed build, red ship gate. Sources personal/.env with `set -a`, never echoes a value, requires only CLOUDFLARE_ACCOUNT_ID by name. Missing token falls back to wrangler's saved login and says so. README covers first-time setup, hash-based live verification, and defers the custom domain. |
| 3 | Screenshot tool reproducible | 9.5 | I ran it twice against :5174. Identical file lists, byte-identical notes.md including the engine-state table (coins 1896, lives 20, towers 3, levels 111, 2 creatures). All five required states present. v1 set is genuinely the old build: 5 defenses vs 7, unlock prices 80/160/300 vs 60/110/180. No duplicate hashes across the 10 committed PNGs. Wave-shot pixels vary run to run, which the tool's own comments disclose. |
| 4 | Mission log tells the story | 9.5 | I rendered log.html headless at 390x844 and 1440x1000: horizontal overflow 0px at both, all 8 images load (screenshots in /tmp/claude/shoot-check/, script kept as scorer/render-log.mjs). Sections r1 to r4 plus balance, before/after pair per round, scores match the score.json files (9.75, 9.0), balance table matches my own sim run (2 of 9 winners, 9 strategies). No em dash, no CLI or model name, no centred column (the only max-width uses are an image cap, a 62ch text block, none, and a media query). Determinism confirmed by reading the generator: no clock, sorted directories, and the sim's determinism is covered by the test suite. No --out flag, so I did not run it twice in place. |
| 5 | Repo hygiene | 8.5 | .gitignore covers dist/, test-results/, node_modules (bare pattern, any depth), .wrangler/. README gained Deploy and Mission log sections. package.json gained exactly shoot, log, check:ship. One wrinkle: workbench/workbench.html is modified (230 insertions), which is outside this lane's ownership. The lane's report flags it as pre-existing orchestrator work; I cannot prove attribution either way, so it stays a dent, not a violation. |
| 6 | Honest report | 9.0 | Quotes the check-ship line verbatim (matches my run), lists every command with exit codes, and the Not verified list is real: no deploy ever ran, no Pages project exists, phone shots are emulation, Safari untested. No em dashes. One claim did not reproduce: it says 01 and 03 are byte identical between runs; on my pair only 01 was. Not consequential, since the report itself says pixels are not promised, but it should have been worded as one observed pair, not a property. |

Average: (9.5 + 9.5 + 9.5 + 9.5 + 8.5 + 9.0) / 6 = **9.25**. Pass needs >= 8.5 and no item <= 5.5. **PASS.**

## Traced claims (from REPORT.md, reproduced by me)

1. Gate output "ship gate green: 4 round sections, 8 images, dist and deploy script present", exit 0. REPRODUCED.
2. notes.md byte identical across two runs, including the engine states. REPRODUCED (my own two runs, diff empty).
3. v1 shows five sidebar pieces and old prices 80/160/300. REPRODUCED from the v1 PNGs.
4. wrangler absent from node_modules and nothing in package.json deploys. REPRODUCED.
5. Log page: 0px horizontal overflow at 1440 and 390, all 8 images load. REPRODUCED with my own headless render.
6. Log scores and balance line match their sources (9.75, 9.0, 2 of 9 winners). REPRODUCED against score.json and a fresh sim run.
7. "01 and 03 byte identical between runs." NOT REPRODUCED for 03 (differed on my pair). 01 held.

Checked 7, reproduced 6.

## Not verified by me

- An actual deploy, the pages.dev URL, the custom domain. Nothing was deployed by anyone; correct for this round.
- `npx wrangler pages project list` (needs a login I was not going to open; the lane skipped it too and said so).
- `npm run build` reproducibility (the scorer is forbidden to build).
- build-log.mjs run twice in place (it has no output flag and always writes workbench/log.html; determinism judged from the code instead).
- The log page in Safari or on a real phone.

## For the next round

- After the r3 polish winner merges into src/, re-run `npm run shoot -- --url http://localhost:5174 --out workbench/shots/r3` and `npm run log`; the generator already picks the newest shots/rN as "after".
- The workbench/workbench.html modification should be committed or attributed by the orchestrator before the ship commit, so `git status` maps 1:1 to lane ownership.
- Word run-to-run pixel claims as observations of one pair, not properties.
- When Luc gives the go: `npx wrangler pages project create undergrowth --production-branch main`, then `./deploy/deploy.sh`, then the shasum checks in deploy/README.md.
