# r2 rubric: design (score each 0-10 in 0.5 steps, average is the grade, pass >= 8.5, any cell <= 5.5 fails)

Written BEFORE the builder was spawned. Scorer: run every command yourself, open the files, do not
trust REPORT.md. The builder may NOT edit tests/balance-gate.mjs; check `git diff 4f4d19c -- tests/balance-gate.mjs`
is empty (that commit is r1; the gate was committed right after it, so compare against its first commit if needed).

1. CURVE IS REAL AND HONEST. `node tests/balance-gate.mjs` is green. The strategies in
   tools/balance-sim.mjs were not weakened to pass it: compare `git diff 4f4d19c -- tools/` and
   confirm the r1 strategies (naive, maze, maze-deep, farm-first, farm-lite, reach-maze) keep their
   tower plans and spending rules, with additions only where new towers or abilities are used.
   The per-stage table (`node tools/balance-sim.mjs`) shows lives being lost across the mid game
   for the winners, not one cliff. Score 0 if the gate file changed or a strategy was gutted.

2. WAVES ARE DESIGNED, NOT COMPUTED. A readable WAVES table (30 entries, 10 stages x 3 waves)
   replaces the `i % 4`, `i % 5` formula. Each wave lists its composition; stage text in STAGES
   matches what actually spawns (stage "Shell season" spawns armor, "On the breeze" spawns
   moths, bosses only where the text says). Spawn pacing can vary per wave. Open the table and
   check 5 waves against the STAGES text.

3. NEW ENEMIES AND TOWERS ARE COMPLETE. At least 2 new enemy kinds and 2 new towers. Complete
   means: engine rules in game.js, a distinct generated 3D model in world.js, a card in the
   sidebar with the right key (6, 7), stats and effect text in the detail panel, a counter
   relationship a player can discover (each new enemy is best answered by a specific tower; each
   new tower is the best answer to something), and unit tests for each new rule. Half-wired
   content (in the engine but not drawn, or drawn but not on a card) caps this at 5.

4. ABILITIES WORK EVERYWHERE. At least 2 player-triggered abilities with a cooldown, usable by
   keyboard and by a button that works on the phone layout, with a visible cooldown state, saved
   and restored with the game (cooldown survives reload). Unit tests cover use, cooldown refusal,
   and persistence.

5. THE PLAYER IS TOLD. Report change 6 is done: an upgrade the player cannot afford shows which
   material is missing and why in the detail panel; the first stage teaches that a longer route
   means more shots; the help dialog and README describe the new towers, enemies and abilities in
   plain words with no em dashes. Saves from v2 (version 2) load into the new version with
   towers, farms, stage and coins intact; a unit test proves it.

6. QUALITY KEPT. `npm test` green with the new tests, `npx prettier --check` clean, no line over
   110 chars in src/*.js, every new method has its one-line comment, tests/golden.json was
   re-recorded ONCE with the reason written in REPORT.md and `node tests/golden.mjs` is green on
   the final tree, CHANGELOG.md has a dated r2 entry listing every rule change with old and new
   numbers. No dead code left from the old formula.
