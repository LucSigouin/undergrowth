LANE-TOKEN: r4-ship-e27b

You are the "ship" worker on Undergrowth v2, round r4. Model requested: claude-opus-5, effort medium.
Read first, in this order:
1. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r1-foundation/COMMON.md (standing rules + the
   2026-09-07 amendment: Playwright allowed, system browser forbidden; where it says "fleet-r1-foundation/<lane>/"
   read "fleet-r4-ship/ship/")
2. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r4-ship/RUBRIC.md (all 6 items are yours)
3. /Users/ls/Claude-Workspace/personal/undergrowth-v2/tools/check-ship.mjs (the gate; never edit it)
4. README.md, CHANGELOG.md, package.json, tests/browser.mjs (how the game is driven via window.__garden),
   fleet-r1-foundation/sim/BALANCE-REPORT.md and fleet-r*/scorer/score.json (the log's data)

Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git, Vite + Three.js). Two servers are up:
v1 (the old game, read-only reference) at http://localhost:5173, v2 (this tree) at http://localhost:5174.
Do not touch src/ (another round owns the look). Do not touch fleet-r3-polish/ (a contest is running there).

## Your task
`node tools/check-ship.mjs` is red now. Make it green by building these:

1. Cloudflare Pages config: wrangler.toml with `name = "undergrowth"` and `pages_build_output_dir = "dist"`.
   Run `npm run build` so dist/ exists. Do NOT deploy. Do NOT create the Pages project. Credentials live in
   /Users/ls/Claude-Workspace/personal/.env; never read them into a report, never copy them.
2. deploy/deploy.sh: `set -euo pipefail`; refuses to run if `npm test` fails or if `git status --porcelain src`
   is non-empty; builds; runs `node tools/check-ship.mjs`; then `npx wrangler pages deploy dist --project-name undergrowth`
   loading the .env with `set -a; source ../.env; set +a` style (adjust to how that file is laid out; read it
   only to learn variable NAMES). deploy/README.md: first-time setup in plain words (create the project once
   with `npx wrangler pages project create undergrowth --production-branch main`, the custom domain comes later,
   how to verify the deploy with curl + shasum against dist/). Nothing in package.json may run the deploy.
3. tools/shoot.mjs: `node tools/shoot.mjs --url <url> --out <dir>` (Playwright, Chromium) captures a fixed set:
   `01-fresh-desktop.png` (1440x1000, fresh game), `02-midwave-desktop.png` (a few towers placed via
   window.__garden.game.place, wave started, stepped ~8 s, a tower selected so the detail panel is open),
   `03-missing-material.png` (detail panel of a level 2 tower with coins but no wood, showing the shortfall note;
   on v1 this state does not exist, capture the level 2 detail panel instead and say so),
   `04-phone-portrait.png` (390x844, iPhone 13 device, mid wave), `05-phone-landscape.png` (844x390).
   Deterministic: same states, same file names, no timestamps in file names. Run it for v1
   (`--url http://localhost:5173 --out workbench/shots/v1`) and v2 (`--url http://localhost:5174 --out workbench/shots/r2`).
   The v1 server serves the old code: __garden is exposed there too (check with page.evaluate; if a helper is
   missing, fall back to UI clicks).
4. tools/build-log.mjs: generates workbench/log.html from CHANGELOG.md (sections per round), fleet-r*/scorer/score.json
   (score, verdict, per-item table), `node tools/balance-sim.mjs --json` (per-strategy result table), and
   workbench/shots/<round>/ images (before = v1, after = the latest round dir that exists). One `<section id="rN">`
   per fleet-rN-* directory, in order, even when a round has no changelog entry yet (r1 and r4 change no rules:
   say what the round did in one line from its ROUND.md "The ask"). Self-contained HTML, inline CSS, system fonts
   or fonts.googleapis.com only. Layout fills the window: full-bleed header, screenshot pairs in a responsive
   grid `repeat(auto-fit, minmax(420px, 1fr))`, generous edge padding `clamp(1rem, 4vw, 3rem)`, never a
   `max-width` centred column. Readable at 390 px. No em dashes anywhere, no CLI or model names. Deterministic output.
5. package.json scripts: `"shoot": "node tools/shoot.mjs"`, `"log": "node tools/build-log.mjs"`,
   `"check:ship": "node tools/check-ship.mjs"`. .gitignore: add `.wrangler/`. README.md: a short "Deploy" section
   pointing at deploy/README.md and a "Mission log" line pointing at workbench/log.html and `npm run log`.

You own: wrangler.toml, deploy/, tools/shoot.mjs, tools/build-log.mjs, workbench/log.html, workbench/shots/,
README.md (Deploy + Mission log sections only), package.json (scripts only), .gitignore, fleet-r4-ship/ship/.
Never edit tools/check-ship.mjs, src/, tests/, CHANGELOG.md, or anything under fleet-r3-polish/. Do not commit.

## Verify (the orchestrator runs exactly this; it must exit 0)
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2 && node tools/check-ship.mjs && git diff --quiet HEAD -- tools/check-ship.mjs && npm test && node tests/golden.mjs && test -x deploy/deploy.sh && test -s deploy/README.md && test -s fleet-r4-ship/ship/REPORT.md && node -e "const r=require('./fleet-r4-ship/ship/result.json');if(r.state!=='done'||!r.model||!r.taskId)process.exit(1)"

## Deliverables in fleet-r4-ship/ship/
- REPORT.md (draft within 10 minutes; final: what you built, the check-ship output quoted, how to view
  workbench/log.html, what is unverified: the deploy itself, the domain, a real phone)
- result.json per COMMON.md rule 7. Your taskId is the file name (without .md) in
  /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include "LANE-TOKEN: r4-ship-e27b".
  Set model.requested "claude-opus-5" and model.effective to the model id you actually run as.
