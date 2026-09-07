# r2 design lane score

Scorer: fresh zero-context Fable 5 (LANE-TOKEN: r2-scorer-c93d). Graded cold from files and
commands. REPORT.md was read last, as claims to check.

## Mechanical gate

Command (run by the scorer, verbatim from PROMPT.md):

```
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2 && npm test && node tests/golden.mjs \
  && node tests/balance-gate.mjs && git diff --quiet a81309a -- tests/balance-gate.mjs \
  && npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}" \
  && awk 'length>110{f=1} END{exit f}' src/*.js && test -s CHANGELOG.md
```

**Exit code: 0.** Output head: 33 tests, 33 pass, 0 fail. "golden replay identical".
"balance gate green: 2 winner(s), naive dies at stage 7". "All matched files use Prettier
code style!". The mutant log exists (fleet-r2-design/GATE-TESTED.txt records the gate red
on the r1 tree with 7 failures), so the gate is proven, not just green.

## Scores

| # | Criterion | Score | One line reason |
|---|---|---|---|
| 1 | Curve is real and honest | 8.5 | Gate green, gate file untouched, r1 strategies verifiably unweakened; winners bleed in 3 stages but only from stage 8, disclosed honestly |
| 2 | Waves designed, not computed | 9.5 | 30 hand written entries with per wave gap and burst; 6 spot checks match the stage text; formula deleted with no leftovers; table is unit tested |
| 3 | New enemies and towers complete | 9.0 | Brood, warden, Ember, Lantern each have rules, distinct models, cards on keys 6 and 7, detail text, a counter, and tests; two icon lookalikes noted |
| 4 | Abilities work everywhere | 9.0 | Q and E handlers, buttons in both layouts, phone screenshots show live countdowns, cooldowns in the save file, tests cover use, refusal and persistence |
| 5 | The player is told | 9.0 | Shortfall note names the material and why, stage 1 teaches route length in three places, help and README rewritten plainly, v2 and v1 saves migrate with tests |
| 6 | Quality kept | 9.5 | 33 tests green, prettier clean, no long lines, methods commented, golden re-recorded once with a real reason, CHANGELOG has old and new for every number |

**Average: 9.08, rounded to 9.0. No item at 5.5 or below. Verdict: PASS.**

## The item 1 fairness call, as the rubric asked

All six r1 strategies now lose (maze at S9W3, maze-deep at S10W3, farm-lite at S9W2) and only
the new kit strategies win. I checked the full `git diff 4f4d19c -- tools/`: the r1 policies
keep their gun lists, hedge plans and spending rules; every change is an addition (a duringWave
hook, an ability wrapper, an optional gun list argument that defaults to the old list, three new
strategies). So the losses come from the game constants, not from gutted bots.

My call: **fair, but near the line.** Fair because the winning build is the identical maze with
two Thorn slots swapped for Ember and one for Lantern, both of which the game teaches on their
cards, in the help dialog, and in the stage 7 text, and because the old best play (maze-deep)
still reaches the final wave of the final stage. Near the line because a returning r1 player who
replays their exact winning build now loses with no message saying the kit is required, and
because the only winning family is one build shape. The gate itself forced old winners to start
losing (winners must lose 3 to 16 lives; r1 maze-deep lost 0), so this shape was partly ordered
by the round, not chosen by the builder.

## Traced claims: 10 checked, 10 reproduced

1. HP growth 1.43 to 1.46: r1 game.js line 343 has `Math.pow(1.43, stage)`; r2 game.js:14 has `HP_GROWTH = 1.46`. Reproduced.
2. Upgrade step 0.75 to 1.0 and power branch 1.45 to 1.55: r1 game.js:240 vs r2 game.js:577. Reproduced.
3. Plot unlocks 80/160/300 to 60/110/180: r1 MATERIALS vs r2 game.js:157-159. Reproduced.
4. Moth 25 hp to 30 and boss 450 to 400: r1 game.js:344 vs r2 ENEMIES table. Reproduced.
5. Keyboard `'12345'` literal removed: present at r1 main.js:683, gone in r2; handler reads the length of TOWERS. Reproduced.
6. "r1-upgrade-mats drops naive from stage 7 to stage 5": my own `--experiments` run shows naive baseline S7W3, r1-upgrade-mats S5W3. Reproduced.
7. kit-maze wins losing lives in stages 8, 9 and 10 (4, 2, 3): my own `node tools/balance-sim.mjs` run matches. Reproduced.
8. Wave sizes 6 in stage 1 wave 1 and 18 in stage 10 wave 3: counted from the WAVES table (6 grubs; 4+2+2+4+4+2). Reproduced.
9. Level 2 to 3 Thorn costs 10 wood and 4 rock: upgradeCost at game.js:585-594, and the phone screenshot shows "Upgrade · 49 coins · 10 wood · 4 rock". Reproduced.
10. Bosses only in waves 6-3, 9-3 and 10-3: read the whole WAVES table; boss appears exactly there, twice in 10-3. Reproduced.

## What I did not verify

- I did not run `node tests/browser.mjs`: it writes screenshots into
  fleet-r2-design/design/shots/, so running it would overwrite the frozen lane artifact.
  The 44 px phone button claim rests on the CSS (style.css has the 44px rules) and the
  builder's report, not on my own run.
- FROZEN.sha exists but its generating command is not recorded, so I could not recompute it.
- Rendered motion, sound, and feel: nobody, including me, has played this build.

## Notes that are not deductions

- `.prettierignore` gained one line outside the lane's file list. It was forced: the gate
  requires prettier to pass on tests/*.mjs and also requires the unformatted gate file to be
  byte identical. The two demands contradict; the builder disclosed it. Fix the gate, not the builder.
- desktop-missing-material.png crops the panel above the shortfall note, so it does not show
  the thing it is named for. The phone shot shows the note in full, so the claim stands.

## For the next round

Things a player would notice that the rubric did not ask about:

1. Winners take zero damage for seven straight stages. The builder named the structural cause:
   nothing scales with route length. A burrower that skips a fixed number of squares would put
   real pressure on the mid game without killing naive early.
2. Nothing tells a returning player that the old winning maze can no longer win. One line in the
   help dialog ("the wild grew back stronger; your old garden will not hold alone") would do it.
3. Bloom and Ember sidebar icons are both warm starbursts, and Sunstone shares its diamond
   symbol with the Diamond material chip. Easy to confuse at phone size.
4. There is no hint on the board which towers a Lantern is currently boosting; the range ring
   and a line inside each boosted tower's panel is all you get.
5. Sunburst on a phone arms on E or a tap, and the next board tap fires it, but a board tap is
   also how you place towers. Needs a visible armed state and a cancel.
6. tests/browser.mjs writes screenshots into the lane's artifact directory. A check that writes
   into the thing being checked is the same class of bug that destroyed a frozen artifact in the
   Fleet-Machine r2 incident. Point its output somewhere disposable.
7. The prettier-vs-frozen-gate-file contradiction in the gate command should be fixed at rubric
   time in r3, so no lane needs an out-of-scope edit again.
