LANE-TOKEN: r1-sim-9c2e

You are the "sim" worker on Undergrowth v2, round r1. Model requested: claude-opus-5, effort medium.
Read first, in this order:
1. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r1-foundation/COMMON.md (rules for every lane)
2. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r1-foundation/RUBRIC.md (you are scored on items 4-6)
3. /Users/ls/Claude-Workspace/personal/undergrowth-v2/README.md, then src/game.js (the whole engine, ~80 dense lines)
   and tests/game.test.js (shows how to drive the engine headless).

## Your task
Build a headless balance simulator so the next round can tune the game on evidence instead of guesses.
The engine (class Game in src/game.js) has no randomness: `new Game()`, `place()`, `upgrade()`, `farm()`,
`unlockPlot()`, `start()`, `tick(1/30)`. Waves end when `game.active` goes false; `game.lost` / `game.won`
end the run. Another worker is reformatting src/ at the same time: import from '../src/game.js' and do
NOT edit anything in src/.

Create:
- tools/balance-sim.mjs. `node tools/balance-sim.mjs` prints a readable table; `--json` prints
  `{"strategies":[{"name":..., "lostAtStage": n|null, "lostAtWave": n|null, "won": bool,
  "stages":[{"stage":n,"livesLost":n,"livesEnd":n,"coinsEnd":n,"towers":n,"towerLevels":[...],"farms":[...]}]}]}`.
  At least 3 named strategies, each a small policy function called between waves: "naive" (a few
  Thorns near the straight route, upgrades when affordable, no farm), "maze" (hedges that force a long
  serpentine route, Sap + Thorn + Sunstone, upgrades), "farm-first" (buys and upgrades wood then rock
  then iron then diamond before spending on towers, then builds). Add more if they reveal something.
  Each strategy plays all 10 stages or until loss, stepping the real Game at 1/30 s, with a guard
  against infinite waves. Whole run under 60 seconds.
- tests/sim.test.js (node:test): asserts two runs of the simulator give identical JSON, and asserts the
  true fact about the naive strategy on the current constants (it loses before stage 10, or if it does
  not, assert what actually happens and say so in the report).
- fleet-r1-foundation/sim/BALANCE-REPORT.md: where each strategy dies, which numbers cause it (enemy HP
  scale 1.43^stage times wave factor, tower damage ceiling at level 3 with the power branch, coin income
  per wave = kills*4 + wave bonus, farm cost vs yield), and 3-6 concrete constant changes with the
  SIMULATED effect of each (re-run the sim with the change applied by parameter, not by editing src/;
  if the engine cannot be parameterised without editing src/, say so and give the arithmetic instead).
  Every number must be reproducible from your simulator's output.

You own ONLY: tools/ (new), tests/sim.test.js (new), and fleet-r1-foundation/sim/. No npm packages.
Do not run `npm run build`. Do not commit.

## Verify (the orchestrator runs exactly this; it must exit 0)
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2 && npm test && node tests/golden.mjs && node --test tests/sim.test.js && node tools/balance-sim.mjs --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const j=JSON.parse(s);if(!Array.isArray(j.strategies)||j.strategies.length<3)process.exit(1)})" && test -s fleet-r1-foundation/sim/BALANCE-REPORT.md && test -s fleet-r1-foundation/sim/REPORT.md && node -e "const r=require('./fleet-r1-foundation/sim/result.json');if(r.state!=='done'||!r.model||!r.taskId)process.exit(1)"

## Deliverables in fleet-r1-foundation/sim/
- REPORT.md (draft within 10 minutes; final: how to run, what is unverified)
- BALANCE-REPORT.md (the findings)
- result.json per COMMON.md. Your taskId is the file name (without .md) in
  /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include the text "LANE-TOKEN: r1-sim-9c2e"
  (`grep -l "r1-sim-9c2e" /Users/ls/Claude-Workspace/personal/.cnvs/pipe/*.md`).
  Set model.requested to "claude-opus-5" and model.effective to the model id you are actually running as.
