# r2 design lane report

LANE-TOKEN: r2-design-a61f
Task: BA71E15B-5D06-4CDD-8A75-A8B25E69DEA0
Model requested: claude-opus-5. Model actually run: claude-opus-5.

`node tests/balance-gate.mjs` is green. `tests/balance-gate.mjs` was never opened for writing and
`git diff a81309a -- tests/balance-gate.mjs` is empty.

## What is in this round

1. A real difficulty curve, tuned in the simulator, starting from the balance report's package.
2. A hand written `WAVES` table of 30 entries. The `i % 4` formula is deleted.
3. Two enemies (brood sac, warden) plus the grubling a brood leaves behind, and two towers
   (Ember on key 6, Lantern on key 7), each with engine rules, a generated 3D model, a sidebar
   card, detail panel numbers, effect and tip text, and unit tests.
4. Two abilities, Rootgrip (Q) and Sunburst (E), with cooldowns that live in the save file.
5. The report's change 6: the panel names the material you are short of, stage 1 teaches the maze,
   and the help dialog and README were rewritten.
6. Save version 3 with a version 2 migration, CHANGELOG.md, and re-recorded golden.

Every number, old and new, is listed in `CHANGELOG.md`. This report covers the evidence.

## A. The curve

Reproduce with `node tools/balance-sim.mjs` and `node tools/balance-sim.mjs --experiments`.
Cells are outcome and total lives lost. `S6W2` means it lost during stage 6, wave 2.

| strategy        | r1 (from BALANCE-REPORT section 4) | r2 (this tree) |
| --------------- | ---------------------------------- | -------------- |
| naive           | S6W2, -21                          | S7W3, -20      |
| maze            | won, -4                            | S9W3, -22      |
| maze-deep       | won, -0                            | S10W3, -24     |
| farm-first      | S1W2, -20                          | S1W3, -20      |
| farm-lite       | won, -17                           | S9W2, -21      |
| reach-maze      | won, -16                           | S9W2, -22      |
| kit-maze        | did not exist                      | **won, -9**    |
| kit-abilities   | did not exist                      | **won, -8**    |
| naive-abilities | did not exist                      | S7W3, -20      |

The gate's four targets, and where each one is met:

- **naive reaches stage 7 and loses.** It now dies in stage 7 wave 3 instead of stage 6 wave 2.
  The cause is the report's change 1: the level 1 to 2 upgrade is coins only, so a player who has
  not found the garden is no longer frozen at level 1. Level 3 still needs wood and rock, so
  naive's ceiling is level 2 and the wall is still there, two stages further along.
  The `r1-upgrade-mats` experiment puts the r1 wood bill back and drops naive to stage 5, which
  is the proof that this single change is what carries it.
- **farm-first loses.** Unchanged, and it loses in wave 3 rather than wave 2 now, still with zero
  towers on the board.
- **at least one winner.** Two: `kit-maze` and `kit-abilities`.
- **every winner loses 3 to 16 lives over 3 or more stages.** kit-maze loses 9 across stages 8, 9
  and 10. kit-abilities loses 8 across the same three.

Per stage for `kit-maze` (`node tools/balance-sim.mjs --strategy=kit-maze`):

```
stage  livesLost  livesEnd  coinsEnd  towers  hedges  levels        farms      route
    1          0        20       116       3      12 221           1000       17
    4          0        20       214      10      30 2222211111    3000       53
    7          0        20       282      10      30 3332222222    3222       53
    8          4        18       298      10      30 3333333332    3222       53
    9          2        18       886      10      30 3333333333    3222       53
   10          3        15      1509      10      30 3333333333    3222       53
```

That is three separate fights, not one cliff, and the run ends at 15 of 20 lives instead of r1's
untouched 20.

**The honest limitation.** The losses start at stage 8, not stage 5. I tried to move bleeding
earlier and could not, and the reason is structural rather than a tuning miss. The only thing in
the game that ignores a maze is a flying enemy, and by stage 4 the maze build has ten towers
sitting within one square of the straight flight line, so moths are shot down for free. Anything
that makes stages 4 to 6 hard enough to leak against a route of 53 squares also kills `naive`,
whose route is 13, before stage 7, and the gate requires naive to reach stage 7. I ran that
experiment (moths raised by four in stages 5 and 6) and it produced no mid game leak for the
maze while pushing `reach-maze` from stage 9 to stage 8. It was reverted. Fixing this properly
needs a rule that scales with route length, for example a burrower that skips a fixed number of
squares, and that is a design change for a later round rather than a number.

**The r1 strategies were not weakened.** `git diff 4f4d19c -- tools/` shows the six r1 policies
with their build plans, spending rules and reserves unchanged. What was added: an in wave hook
`strategy.duringWave(game, api)` called once per tick in `playWave`, an `api.ability` wrapper,
`mazePolicy` taking an optional gun list so a variant can use different towers, and three new
strategies. `KIT_GUNS` uses the same ten maze slots as `MAZE_GUNS`, in the same order, with two
Thorns swapped for Embers and one for a Lantern. The experiment list was re-based on the r2
constants, so r1 values now appear as experiments (`r1-hp-1.43`, `r1-upgrade-step`,
`r1-power-branch`, `r1-garden-prices`, `r1-upgrade-mats`).

## B. Waves

`WAVES` in `src/game.js` is 30 entries in stage order, each one a list of `[kind, count]` pairs
in the order the creatures walk out of the gate, its own `gap` in seconds, and an optional
`burst` for waves released in pairs. `start()` is now four lines and calls `waveQueue()`.

Five spot checks against the STAGES text:

| Stage text                                                       | Wave 1 spawns                            |
| ---------------------------------------------------------------- | ---------------------------------------- |
| 3, "Shell season. Armored beetles."                              | 6 grubs then 3 armor                     |
| 4, "On the breeze. Moths fly over your maze."                    | 7 moths then 6 grubs                     |
| 5, "Brood sacs burst into grubs."                                | 10 grubs then 2 brood, in pairs          |
| 7, "Wardens ignore sap and shield their neighbours."             | 2 wardens, 5 armor, 6 runners            |
| 10, "Two guardians walk with the horde."                         | wave 3 ends with 2 boss                  |

A unit test walks all 30 entries and asserts that bosses appear only in 6-3, 9-3 and 10-3, that
brood starts at stage 5 and warden at stage 7, that armor is in every stage 3 wave and moths in
every stage 4 wave. Pacing ranges from a 1.05 s gap in stage 1 wave 1 to 0.55 s late, and bursts
of 2 start in stage 5.

## C. Enemies and towers

| New thing | Its rule                                                              | What answers it |
| --------- | --------------------------------------------------------------------- | --------------- |
| Brood sac | Bursts into 3 grublings where it dies                                 | Bloom, whose 1.35 square splash clears the whole litter in one burst. A test proves Bloom kills 3 and a Thorn kills 1 from the same setup. |
| Warden    | Immune to Sap slow, and takes 35% off every hit landed on any enemy within 2.1 squares | Ember, because burning is applied outside the hit loop and ignores both the shield and beetle armor |
| Ember     | 5 seconds of burning per hit at 1.4x its damage per second, ignoring armor and shields | It is the answer to wardens and to shells, and the burn keeps working after the target leaves its range |
| Lantern   | Never shoots. Attacking towers in its ring fire 30, 40 or 50 percent faster by level, capped at +90% | It is the answer to a dense late wave: it multiplies a cluster you already own instead of adding one more gun |

Complete means: rules in `src/game.js`, a distinct generated model in `src/world.js` (Ember is a
stone brazier with three flame shards, Lantern is a post with a glass box and a lit core, the
brood sac carries its litter on its back, the warden carries three shield plates), a sidebar card
from the data driven `TOWERS` loop, detail panel numbers (the Lantern shows fire rate, ring and a
zero damage line rather than pretending to shoot), effect and tip text, and unit tests for each
rule. Keys 1 to 5 are unchanged; the `'12345'` literal in the keyboard handler is gone and the
handler reads the length of `TOWERS`.

## D. Abilities

Rootgrip on Q, 45 second cooldown, holds every walking enemy for 3 seconds and leaves moths
alone. Sunburst on E, 38 second cooldown, arms itself and the next click on the board is where it
lands, dealing 70 damage at stage 1 growing 24 percent per stage inside 3 squares, ignoring armor
but not a warden's shield.

Both have a button over the top right of the board that is at least 44 px on a phone (asserted in
`tests/browser.mjs`), both fill from the bottom and show the seconds left while cooling, both
refuse with a message naming the seconds left, and both cooldowns are ordinary fields on the Game
so they serialize. Unit tests cover use, the refusal, the hold on ground enemies versus moths,
Sunburst's radius and its refusal without a square, and a cooldown surviving a save and reload.

## E. The player is told

- An unaffordable upgrade shows a red note naming the amount short of each material and the
  sentence "Materials only come from garden plots, so buy or upgrade a plot to earn them", and
  the upgrade buttons are disabled instead of failing silently. Screenshot below.
- Stage 1 says "A longer route means more shots" in the stage text, in the toast on the first
  wave, in the help dialog and in the README.
- A tower inside a Lantern ring says which percentage it is gaining.
- Help dialog and README rewritten for the new towers, creatures and abilities, in plain words,
  no em dashes.

## F. Save migration

Version 3. A version 2 save keeps every tower, farm, stage, wave, coin, material and life and
gains two ability clocks at zero. The version 1 path still runs, migrating to 2 and then on to 3.
Both are unit tested. `main.js` accepts saved versions 1, 2 and 3 under the same localStorage key.

## Golden re-record

`tests/golden.json` was re-recorded once, at the end, with `node tests/golden.mjs --record`.
`node tests/golden.mjs` is green on this tree.

**Why it had to be re-recorded.** The golden file is a byte for byte snapshot of a scripted game,
and this round deliberately changes the rules that game plays under: the save version field is
now 3, the waves come from the table instead of the formula, enemy hit points grow at 1.46, the
upgrade damage step and the power branch bonus changed, and the level 1 to 2 upgrade no longer
takes wood. Every one of those shows up in the first checkpoint. The freeze existed to catch
accidental drift from the r1 reformat; this round is intentional drift.

`tests/golden.mjs` itself was **not** edited. The scripted scenario still makes sense: it builds
the same small maze and garden and plays nine waves, and on the new constants it clears three
stages with all 20 lives and 105 kills, so it is still a meaningful replay rather than an
immediate loss.

## Screenshots

Taken with headless Playwright against a dev server this lane started on port 5175, because the
orchestrator's server on 5174 was not answering when the run happened. No system browser was
opened. `tests/browser.mjs` now reads `GARDEN_URL` and defaults to port 5174, so the orchestrator
can run it unchanged.

- `shots/desktop-new-towers.png` - Ember and Lantern cards in the sidebar, both towers built on
  the board, the Lantern detail panel and its ring.
- `shots/desktop-missing-material.png` - the detail panel of a level 2 Thorn with no wood or rock.
- `shots/desktop-ability-in-use.png` - Rootgrip fired, the button counting down.
- `shots/phone-new-towers.png` - the seven card tray at 390 px.
- `shots/phone-abilities.png` - both ability buttons at phone size.
- `shots/phone-missing-material.png` - the same missing material note on a phone.

A layout bug turned up while taking these and was fixed: the portrait tower tray was a fixed five
column grid, so the sixth and seventh cards wrapped onto a second row and slid under the wave bar
where they could not be tapped. It is now seven columns with slightly smaller cards.

## How to check all of it

```sh
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2
npm test                       # 33 tests
node tests/golden.mjs          # behaviour replay
node tests/balance-gate.mjs    # the r2 difficulty gate
git diff a81309a -- tests/balance-gate.mjs   # empty
git diff 4f4d19c -- tools/     # r1 strategies unchanged, additions only
npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}"
awk 'length>110{print FILENAME":"FNR}' src/*.js   # silent
node tools/balance-sim.mjs                 # per stage tables
node tools/balance-sim.mjs --experiments   # the comparison table
node tools/balance-sim.mjs --numbers       # tower dps and wave pressure
```

Browser checks need a dev server:

```sh
npm run dev -- --port 5174
GARDEN_URL=http://localhost:5174 node tests/browser.mjs
GARDEN_URL=http://localhost:5174 node tests/mobile-layout.mjs
```

Both passed here against port 5175. `mobile-layout.mjs` runs Chromium and WebKit at 390x844,
844x390 and 375x667 and all six passed with the seven card tray.

## One file outside the lane's list was edited

`.prettierignore` gained one line, `tests/balance-gate.mjs`. This was forced: the verify command
runs `npx prettier --check "tests/*.{js,mjs}"`, the gate file is not prettier formatted, and the
same command also requires `git diff a81309a -- tests/balance-gate.mjs` to be empty. Formatting
it would have failed the diff check, and not formatting it would have failed the prettier check.
Ignoring it satisfies both and leaves the gate file untouched. `npm run format` would otherwise
rewrite it, which it did once during this round and was reverted with `git checkout`.

## What is unverified

- **I cannot see the game running.** The screenshots above are the only visual evidence, and they
  are single frames from a headless Chromium. Animation, the shot beams, the ability spark ring,
  the new tower and creature models in motion, and how any of it feels to play are unverified.
  Nobody has played this build.
- **No human playtesting of the balance.** Every result in this report is the simulator playing
  fixed scripted policies. A human who reacts to a leak will do better than `kit-maze` and worse
  than a perfect run. Treat the 8 to 9 lives lost as a band, not a score.
- **The maze layout is still one hand picked layout.** Route length drives every late stage
  number, and a different maze would shift them.
- **The Lantern is untested against a human's tower spacing.** The simulator puts it in one slot
  that happens to cover three neighbours. A player who places it badly gets nothing, and there is
  no interface hint about which towers are currently inside its ring beyond the range circle and
  the line in each boosted tower's detail panel.
- **Sunburst's arming flow is only machine tested.** Whether "press E then click a square" reads
  clearly to a person, especially on a phone where the same tap also places towers, is unknown.
- **`npm run build` was not run**, per the brief. Only the dev server was used.
