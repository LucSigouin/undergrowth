LANE-TOKEN: r2-design-a61f

You are the "design" worker on Undergrowth v2, round r2. Model requested: claude-opus-5, effort medium.
You are the only writer this round, so you own the whole game change. Take the time it needs.

Read first, in this order:
1. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r1-foundation/COMMON.md (standing rules; where it
   says "fleet-r1-foundation/<lane>/" read "fleet-r2-design/design/"; rule 4 about golden is relaxed for you, see below)
2. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r2-design/RUBRIC.md (you are scored on all 6 items)
3. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r1-foundation/sim/BALANCE-REPORT.md (the evidence)
4. README.md, src/game.js, src/world.js, src/main.js, tests/game.test.js, tools/balance-sim.mjs, tests/balance-gate.mjs

## Your task, in four parts

### A. Make it winnable with a real curve
`node tests/balance-gate.mjs` is red now. Make it green by changing the GAME, never the gate file and
never by weakening the r1 strategies in tools/balance-sim.mjs (you may extend them to use new towers or
abilities, and add new strategies). Start from the report's recommended package (level 1 to 2 upgrade
costs coins only; unlock prices 60/110/180; growth base 1.46) and tune from there. Targets the gate
checks: naive reaches stage 7+ and loses; farm-first loses; at least one winner; every winner loses
3 to 16 lives spread over 3+ stages. Use `node tools/balance-sim.mjs --experiments` style runs to
tune; add experiments if you need them. Report the before/after table.

### B. Hand-crafted waves
Replace the `i % 4`, `i % 5`, `i % 6` spawn formula in `start()` with a readable WAVES table:
30 entries (10 stages x 3 waves), each a composition list such as
`[['grub', 6], ['runner', 3]]` plus optional pacing (spawn gap, groups). The STAGES text must match
what spawns. Bosses only on the stages whose text says so. The new enemies (part C) appear in the
table where their stage text fits; update STAGES text if you add a beat.

### C. Two new enemies, two new towers
Design them so each has a discoverable counter. Suggestions, not orders:
- Enemies: a "brood" that splits into small grubs on death (Bloom splash answers it); a "warden"
  that shields nearby enemies or is immune to slow (Sunstone or the new tower answers it).
- Towers: an "ember" that leaves burning ground or a damage-over-time; a "lantern" that buffs
  adjacent towers' rate or marks enemies to take more damage. Keys 6 and 7. Costs and stats you
  choose, then tune with the sim.
Complete means engine rules (game.js), a distinct generated 3D model (world.js, same geometry
helpers), sidebar card (TOWERS is data-driven so cards appear; check the keyboard handler and any
`'12345'` literal), detail panel stats and effect/tip text, colours that fit the palette, and unit
tests for every new rule.

### D. Two player abilities
Cooldown-based, triggered by keyboard (Q, E) and by buttons that fit the phone layout (the
`.map-controls` or the wave bar; 44 px targets). Examples: "Rootgrip" holds every ground enemy
for 3 s, 45 s cooldown; "Sunburst" damages every enemy within 3 squares of a chosen tile. Visible
cooldown state (button text or a fill), saved with the game (cooldown survives reload), refused
while cooling. Unit tests for use, refusal, persistence.

### Also
- Report change 6: unaffordable upgrades show which material is missing and why; the first stage
  teaches "a longer route means more shots"; help dialog and README updated in plain words.
- Save migration: bump to version 3; version 2 saves load with towers, farms, stage, coins intact
  (unit test). Keep the version 1 path working too.
- CHANGELOG.md (new): dated r2 entry, every rule change with old and new numbers.
- tests/golden.json: re-record ONCE at the end (`node tests/golden.mjs --record`) and write the reason
  in REPORT.md. `node tests/golden.mjs` must be green on your final tree. You may edit
  tests/golden.mjs only if the scripted scenario no longer makes sense (say so).
- Keep prettier clean (`npm run format`), lines under 110 chars in src/*.js, one-line comments on
  new methods. No em dashes anywhere. Do not run `npm run build`, do not commit, do not open a browser.

You own: src/*, tests/* (except tests/balance-gate.mjs, never touch it), tools/*, CHANGELOG.md,
README.md, and fleet-r2-design/design/. Nothing else.

## Verify (the orchestrator runs exactly this; it must exit 0)
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2 && npm test && node tests/golden.mjs && node tests/balance-gate.mjs && git diff --quiet a81309a -- tests/balance-gate.mjs && npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}" && awk 'length>110{f=1} END{exit f}' src/*.js && test -s CHANGELOG.md && test -s fleet-r2-design/design/REPORT.md && node -e "const r=require('./fleet-r2-design/design/result.json');if(r.state!=='done'||!r.model||!r.taskId)process.exit(1)"

## Deliverables in fleet-r2-design/design/
- REPORT.md (draft within 10 minutes, keep updating; final: what changed and why, the before/after
  balance table, the golden re-record reason, what is unverified: you cannot see the rendered game,
  say so plainly)
- result.json per COMMON.md rule 7. Your taskId is the file name (without .md) in
  /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include "LANE-TOKEN: r2-design-a61f".
  Set model.requested to "claude-opus-5" and model.effective to the model id you actually run as.

## Playwright is approved for this project (Luc, 2026-09-07)
Headless Playwright (already installed here, Chromium + WebKit) may be used to smoke test and to
take screenshots. Never launch the system browser (`open`). The orchestrator runs the v2 dev server
on http://localhost:5174 (v1 is on 5173, do not touch it). If 5174 is down, start your own with
`npx vite --port 5175` in the background of your own terminal and kill it by pid when done. Before
you finish: run `tests/browser.mjs` (edit its URL to your port) and save desktop + phone screenshots
of the new towers, an ability in use, and the detail panel with a missing material into
fleet-r2-design/design/shots/. Link them from REPORT.md.
