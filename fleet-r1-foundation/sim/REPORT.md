# sim lane report

Lane token: r1-sim-9c2e. Status: done.

## What I built

- `tools/balance-sim.mjs` (new). A headless balance simulator. It imports the real `Game` from
  `src/game.js` and steps it at 1/30 s. No game logic is copied, no renderer, no browser. Six
  named strategies, each a policy function that spends coins between waves, play all 10 stages or
  until they lose. A wave that has not ended after 150 simulated seconds is treated as stalled and
  stops the run.
- `tests/sim.test.js` (new). Seven checks with `node:test`.
- `fleet-r1-foundation/sim/BALANCE-REPORT.md` (new). The findings.

I did not touch `src/`, `tests/golden.*`, `tests/game.test.js`, `package.json`, or `dist/`. No new
npm packages. No commit, no build, no browser.

## How to run it

```sh
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2
node tools/balance-sim.mjs              # readable per stage tables, about 0.9 s
node tools/balance-sim.mjs --json       # machine readable, same data
node tools/balance-sim.mjs --numbers    # enemy HP and tower dps measured off the engine
node tools/balance-sim.mjs --experiments # 13 constant changes against all 6 strategies, about 8 s
node tools/balance-sim.mjs --strategy=maze   # one strategy only
node --test tests/sim.test.js
```

JSON shape: `{"strategies":[{"name","note","lostAtStage","lostAtWave","won","stalledAt",
"stagesCleared","livesEnd","livesLost","kills","stages":[{"stage","livesLost","livesEnd",
"coinsEnd","towers","hedges","towerLevels","farms","routeLength","waves":[...]}]}]}`.
Stage and wave numbers in JSON are zero based for stage and one based for wave, so
`lostAtStage: 5, lostAtWave: 2` is stage 6 wave 2 in the tables.

## Headline finding

Every upgrade bill includes wood, and wood only comes from a garden plot. A player who never buys
a plot cannot upgrade anything, ever. The `naive` strategy dies at stage 6 wave 2 holding 1535
coins it is unable to spend. A player who buys the whole garden finishes with 20 of 20 lives. The
full trace is in BALANCE-REPORT.md.

## How tuning works without editing src/

The prompt asked for changes applied by parameter. Three mechanisms, all in the simulator:

1. `TOWERS` and `MATERIALS` are exported objects, so costs, damage, range, rate, yields and unlock
   prices are patched in place for the length of a run and restored afterwards. A test asserts the
   restore happens.
2. Values hard coded inside methods are handled by `TunedGame`, a subclass that calls `super` and
   then rescales the result: `enemy()` for the 1.43 growth base, `stats()` for the 0.75 upgrade
   step and the 1.45 power branch, `upgradeCost()` for the material and coin bill.
3. Coins per kill and per wave are adjusted by reading the engine's own events after each tick.

Nothing rewrites engine behaviour, so the baseline run is the real game.

## How to check it

```sh
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2
npm test                    # 20 tests: 13 in game.test.js, 7 in sim.test.js
node tests/golden.mjs       # prints "golden replay identical"
node --test tests/sim.test.js
node tools/balance-sim.mjs --json | head -c 200
```

Note for the scorer: `npm run test` globs `tests/*.test.js`, so adding `tests/sim.test.js` takes
the total from 13 to 20. `tests/game.test.js` on its own is still exactly 13 and untouched.

I mutation tested the guard twice before calling this done. Injecting `Math.random()` into the
simulator output failed the determinism test only. Adding two extra towers to the naive plan
failed the naive stage 6 test only. Both mutants were reverted and the suite is green.

## What is unverified

- No human has played any of these builds. Everything is simulated, and the strategies are fixed
  plans rather than adaptive play.
- The maze layout is one hand picked serpentine. A different layout changes route length and so
  changes every late stage number.
- Bloom is never bought by any of the six strategies, so nothing here tests splash damage.
- Between waves the simulator does not idle by default, so garden output is only counted during
  combat. The `idle-20s` experiment shows 20 seconds of idle per wave changes no outcome, so this
  assumption does not carry the conclusions, but it is still an assumption.
- The recommended package in BALANCE-REPORT.md is simulated against these six policies only. It
  has not been tried against a human or against a wider search of build orders.
