# r4 ship lane: report

The ship gate is green. Nothing was deployed, no Cloudflare project was created, and no
credential was read into this report or copied anywhere.

## The gate

```
$ node tools/check-ship.mjs
ship gate green: 4 round sections, 8 images, dist and deploy script present
$ echo $?
0
```

The gate file itself is untouched: `git diff --quiet HEAD -- tools/check-ship.mjs` exits 0.

## What I built

**1. Cloudflare Pages config.** `wrangler.toml` declares `name = "undergrowth"` and
`pages_build_output_dir = "dist"`, plus a compatibility date. `npm run build` was run from an
empty `dist/` (removed first, then rebuilt) and produces `dist/index.html` plus one JavaScript
file and one CSS file in `dist/assets/`. The gate checks that every path the built index.html
references exists in `dist/`, and it does.

**2. One command deploy.** `deploy/deploy.sh`, executable, `set -euo pipefail`. In order it runs
`npm test`, `node tests/golden.mjs`, a `git status --porcelain src` check that refuses a dirty
`src/`, `npm run build`, `node tools/check-ship.mjs`, and only then
`npx wrangler pages deploy dist --project-name undergrowth`. Credentials come from
`/Users/ls/Claude-Workspace/personal/.env` through `set -a; source ...; set +a`, so the values
live in the environment for the length of the run and are never printed. The only variable the
script requires by name is `CLOUDFLARE_ACCOUNT_ID`, which that file already has. It does not have
a `CLOUDFLARE_API_TOKEN`, so the script says plainly that wrangler will fall back to its own saved
login, and `deploy/README.md` explains both routes. I checked the script with `bash -n` and read
it back line by line. I did not execute it.

`deploy/README.md` covers the first time setup in plain words: `npx wrangler login` once, then
`npx wrangler pages project create undergrowth --production-branch main`, then
`npx wrangler pages project list` to confirm. It shows how to verify a deploy by comparing
`shasum -a 256 dist/index.html` against `curl -s https://undergrowth.pages.dev/ | shasum -a 256`,
and the same check on the JavaScript file the page actually loads. The custom domain is a later
step and is described as such. Nothing in `package.json` runs the deploy, which the gate also
checks.

**3. Screenshot tool.** `node tools/shoot.mjs --url <url> --out <dir>` uses Playwright Chromium
and writes the same five names every run, with no date in any name:

| File | State |
| --- | --- |
| 01-fresh-desktop.png | fresh board, 1440x1000, nothing built |
| 02-midwave-desktop.png | three towers, wave running, one tower selected so the detail panel is open |
| 03-missing-material.png | level 2 tower, plenty of coins, no materials at all |
| 04-phone-portrait.png | iPhone 13 portrait, mid wave |
| 05-phone-landscape.png | iPhone 13 landscape, mid wave |

It also writes `notes.md` beside them, which lists the files and the exact engine state each shot
was taken in.

How the states are made repeatable: `localStorage` is cleared before the page script runs, so the
board is always fresh; the game is advanced with `window.__garden.step(seconds)` in fixed 1/30 s
ticks rather than by waiting on the clock; the wave start, the fixed 8 second advance and the
pause all happen inside one `page.evaluate`, so no animation frame runs between them; and the
"Paused" overlay is hidden with an injected style so pausing does not change the picture. If
`window.__garden` or one of its helpers is missing, the tool says so in `notes.md` and falls back
to clicking the UI and measuring the scene box.

Both servers were shot:

- `node tools/shoot.mjs --url http://localhost:5173 --out workbench/shots/v1`
- `node tools/shoot.mjs --url http://localhost:5174 --out workbench/shots/r2`

Version 1 does exchange one state: it has no missing material note, because in that version every
upgrade needed wood and the panel never named what was short. The tool detected that by reading
the panel text and wrote it into `workbench/shots/v1/notes.md`: "This server has no missing
material note, so 03 is the level 2 detail panel instead." Version 2's notes say the opposite. The
version 1 shots also show only five pieces in the sidebar against version 2's seven, and the old
plot prices of 80 / 160 / 300 against 60 / 110 / 180.

On determinism, measured rather than assumed. I ran the tool twice against version 2 and compared:

- `notes.md` is byte identical between runs, including the engine state table (coins 1896, lives
  20, towers 3, levels 111, 2 creatures alive in the mid wave shot).
- `01-fresh-desktop.png` and `03-missing-material.png` are byte identical between runs.
- The three shots that hold a running wave are not byte identical. The game state in them is, the
  pixels are not. Nothing in this project uses randomness, so the difference comes from the 3D
  renderer, whose output is not reproducible bit for bit. I tried Playwright's fake clock to
  remove even that, and two runs still differed by a few bytes, which points at the graphics layer
  rather than the tool. The file set, the file names and the states are stable, and `notes.md` is
  the check for that.

**4. The mission log.** `node tools/build-log.mjs` writes `workbench/log.html` from
`CHANGELOG.md`, each `fleet-rN-*/ROUND.md`, each `fleet-rN-*/scorer/score.json`,
`node tools/balance-sim.mjs --json`, and the shot folders. It has one `<section id="rN">` per
`fleet-rN-*` directory, in number order: r1, r2, r3, r4. Round r2 renders its whole changelog
entry, including the balance table, the wave formula that was deleted, the two new creatures, the
two new towers and both abilities. Rounds r1, r3 and r4 wrote no changelog entry, so each shows a
one line summary taken from its own ROUND.md and says out loud that the round changed no game
rules. Every round carries its score and verdict when a score file exists, and a plain "not scored
yet" badge when it does not, which is the case for r3 and r4. The last section is the difficulty
curve: all nine scripted strategies with outcome, stages cleared, lives lost and kills, straight
from the simulator.

Layout: full bleed dark header with jump links, a strip of five facts, one band per round, and the
screenshot pairs in `repeat(auto-fit, minmax(min(420px, 100%), 1fr))` with
`clamp(1rem, 4vw, 3rem)` edge padding. No centred column anywhere. The `min(420px, 100%)` is what
keeps it from overflowing a phone; a bare `minmax(420px, 1fr)` pushes a 390 px screen sideways.
Wide tables scroll inside their own box instead of pushing the page. Measured at 1440x1000 and at
390x844: horizontal overflow is 0 px at both, and all 8 images load with no broken sources. One
stylesheet from fonts.googleapis.com with a full system font fallback stack, everything else
inline. The generator refuses to write the file if it finds an em dash or the name of any tool or
model, and it drops any sentence from the source files that carries one, which is why the r1
summary starts at "v1 stays untouched".

Deterministic: no clock is read and directories are sorted, so running it twice gives byte
identical output. Verified by hashing the file, rebuilding, and diffing.

**5. Repo wiring.** `package.json` gained `shoot`, `log` and `check:ship` and nothing else.
`.gitignore` gained `.wrangler/`; it already covered `node_modules/`, `dist/`, `test-results/`
and `playwright-report/`, and the bare `node_modules/` pattern matches at any depth. `README.md`
gained a "Deploy" section pointing at `deploy/README.md` and a "Mission log" section pointing at
`workbench/log.html` and `npm run log`.

## How to look at it

```sh
open workbench/log.html          # or drag the file into a browser
```

Screenshots: `workbench/shots/v1/` is version 1, `workbench/shots/r2/` is this tree. Each folder
has its own `notes.md`.

## Everything I ran

```
node tools/check-ship.mjs                       0   ship gate green: 4 round sections, 8 images
git diff --quiet HEAD -- tools/check-ship.mjs   0   gate file untouched
npm test                                        0   33 tests, 33 pass, 0 fail
node tests/golden.mjs                           0   golden replay identical
npm run build                                   0   from an emptied dist/
bash -n deploy/deploy.sh                        0   syntax only, never executed
node tools/shoot.mjs (v1, v2, plus 2 repeats)   0   5 shots and notes.md per run
node tools/build-log.mjs (3 times)              0   byte identical output each time
npx prettier --write then --check on my tools   0   both tool files match the project style
```

The whole verify line the orchestrator runs was executed here after the last edit and exited 0.

## Not verified

- **The deploy itself.** `deploy/deploy.sh` has never been run. wrangler is not even installed in
  `node_modules`, and the only mentions of it in the repo are the script, the docs, the round
  records and the gate. No Pages project was created, so `undergrowth.pages.dev` does not exist
  yet and no live URL was checked. I did not run `npx wrangler pages project list` either, because
  that needs a login I was not going to open, so I cannot quote its output. What I can say is that
  nothing in this lane could have deployed: no command that touches Cloudflare was executed.
- **The custom domain.** Not set up, not tested. It is a dashboard step after the first deploy.
- **A real phone.** The phone shots are Chromium with an iPhone 13 profile. That checks the layout
  and the touch sizes, not the real thing. Nobody has played this on a phone.
- **The rendered log page on anything but Chromium.** I measured it headless at desktop and phone
  widths. It has not been opened in Safari, and nobody has looked at it on real hardware.
- **Pixel identical screenshots of a running wave.** Explained above. The states repeat, the pixels
  do not.

## Notes for the orchestrator

- `workbench/workbench.html` was already modified in the working tree before this lane started. It
  is not mine and I did not touch it.
- Files I wrote: `wrangler.toml`, `deploy/deploy.sh`, `deploy/README.md`, `tools/shoot.mjs`,
  `tools/build-log.mjs`, `workbench/log.html`, `workbench/shots/v1/*`, `workbench/shots/r2/*`,
  the Deploy and Mission log sections of `README.md`, three lines of `package.json` scripts, one
  entry in `.gitignore`, and this folder. Nothing else.
- The shots in `workbench/shots/r2/` are of the r2 look, since the r3 polish winner is not merged
  into `src/` yet. After that merge, re-run the shoot into `workbench/shots/r3` and then
  `npm run log`: the log picks the newest `shots/rN` folder as the "after" side on its own.
