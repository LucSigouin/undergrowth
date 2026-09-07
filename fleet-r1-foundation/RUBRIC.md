# r1 rubric: foundation (score each 0-10 in 0.5 steps, average is the grade, pass >= 8.5, any cell <= 5.5 fails)

Written BEFORE any builder was spawned. Scorer: run every command yourself. Do not trust REPORT.md.

## Lane "format"

1. BEHAVIOUR FROZEN. `npm test` passes (13 tests) and `node tests/golden.mjs` prints
   "golden replay identical". tests/golden.json and tests/golden.mjs are byte-identical to
   git commit HEAD~ (the worker may not touch them). Any drift here scores 0.

2. READABLE. No line in src/*.js or tests/*.js over 110 characters. One statement per line.
   Names that were single letters at module or class scope are now words (local loop
   variables like `i`, `x`, `z`, `dx` may stay). Each of the four src files opens with a
   3-6 line comment saying what it owns. Each class method and exported function has a
   one-line comment. Score by opening the files, not by reading the report.

3. TOOLING HONEST. `npx prettier --check` passes on the formatted files with a checked-in
   .prettierrc, `npm run format:check` exists, and prettier is the only new dependency
   (package.json diff shows nothing else). The worker did not run `npm run build` or touch dist/.

## Lane "sim"

4. SIMULATOR IS REAL. `node tools/balance-sim.mjs --json` runs headless in under 60 s and
   prints machine-readable results for at least 3 named strategies (a naive one, a maze-heavy
   one, a farm-first one), each stepping the real `Game` class at 1/30 s through all 10 stages
   or until loss, reporting per stage: lives lost, coins at stage end, tower count and levels,
   the wave where it lost. It reads only src/game.js; no copies of game logic.

5. FINDINGS ARE TRACED. fleet-r1-foundation/sim/BALANCE-REPORT.md states where each strategy
   dies, names the numbers that cause it (enemy HP scale 1.43^stage vs tower damage cap, coin
   income per wave, farm payback time), and proposes concrete constant changes with the
   simulated effect of each. Every number in the report must be reproducible from the
   simulator output.

6. GUARDED. `node --test tests/sim.test.js` exists and passes, asserting the simulator is
   deterministic (two runs identical) and that the naive strategy loses before stage 10 on the
   current constants (this is the fact r2 will fix; if it does not lose, the report must say
   so and the test must assert what is true).
