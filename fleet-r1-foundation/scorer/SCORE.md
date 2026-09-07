# Undergrowth v2, round r1 score

Scorer: fresh zero-context Fable 5, lane token r1-scorer-4b8d. Date 2026-09-07.
Everything below was run by the scorer in this session. Builder reports were read last, as claims.

## Verdict

**PASS. Overall 9.75. Format lane 9.5, sim lane 10.0. No item at or below 5.5.**

## Mechanical gate (scorer ran every command)

Format gate, one compound command, exit 0:

```
npm test                                     -> exit 0 (20 tests, 20 pass: 13 game.test.js + 7 sim.test.js)
node tests/golden.mjs                        -> exit 0, prints "golden replay identical"
git diff --quiet HEAD -- tests/golden.mjs tests/golden.json -> exit 0 (golden files untouched)
npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}" -> exit 0, "All matched files use Prettier code style!"
awk 'length>110{f=1} END{exit f}' src/*.js tests/*.test.js  -> exit 0 (no line over 110)
```

Sim gate, exit 0:

```
node --test tests/sim.test.js                -> exit 0 (7 tests, 7 pass)
node tools/balance-sim.mjs --json | <3-strategy check>      -> exit 0 (6 strategies, run took 0.7 s)
```

Ownership check: `git diff HEAD --stat` shows only lane-owned files changed. package.json
diff adds prettier and the two format scripts, nothing else. package-lock.json adds only
`node_modules/prettier`. dist/ does not exist. golden.mjs and golden.json are byte
identical to HEAD.

Scorer mutant tests, run in a scratch copy, never in the repo:

- Thorn damage 10 -> 11: `node tests/golden.mjs` exits 1 with "GOLDEN DRIFT at line 115".
  The golden gate has teeth. Matches the orchestrator's GATE-TESTED.txt red proof.
- Thorn damage 10 -> 60: sim.test.js fails the "naive loses at stage 6 wave 2" test.
  The sim guard has teeth. A +1 damage mutant does not move the naive loss point, which
  agrees with the report's own thorn-damage-13 experiment row.

## The six items

| # | Item | Score | Reason |
|---|------|-------|--------|
| 1 | Behaviour frozen | 10 | All gates green, golden untouched, scorer's own mutant turned the golden gate red. |
| 2 | Readable | 9.5 | Headers, comments, and renames all check out on inspection; exported `W`/`H` stay single letters and style.css has no header (see notes). |
| 3 | Tooling honest | 9 | Prettier is the only new dependency, format:check exists, no dist/; the lane ran one `npx vite build` to a temp dir against the brief, disclosed. |
| 4 | Simulator is real | 10 | Imports only src/game.js, steps real Game at 1/30 s, 0.7 s runtime, 6 strategies, every required per-stage field present. |
| 5 | Findings traced | 10 | 6 of 6 sampled numbers reproduced exactly from the named commands. |
| 6 | Guarded | 10 | Determinism and naive-loses-before-stage-10 both asserted and both proven mutable by the scorer's own mutant. |

Format lane average (items 1-3): 9.5. Sim lane average (items 4-6): 10.0. Overall: 9.75.

## Item 2 evidence

Opened src/game.js, src/world.js, src/main.js in full or in structural passes.

Renames spot-checked against `git show HEAD:src/*.js` (12 checked, 12 real):
`$`->`query`, `s`->`selector` (main.js); `t`->`tower`/`candidate`, `e`->`enemy`,
`c`->`cell`, `q`->`queue`, `n`->`next`, `k`->`key`/`kind`, `f`->`plot`, `m`->`material`
(game.js); `w,h,d`->`width,height,depth`, `r1,r2`->`topRadius,bottomRadius` (world.js).
Remaining single letters in the tree are local loop and coordinate variables (`i`, `x`,
`z`, `k`), which the rubric allows.

Method comments spot-checked (14 in world.js, 16 in main.js, all of game.js): every class
method and top-level function opens with a one-line comment. game.js, world.js, and
main.js each open with a 5-line header saying what the file owns.

Two deductions, both half-cosmetic:
- `W` and `H` in src/game.js are still single-letter module-scope names. They are exported
  API and the rename table discloses the choice, but the rubric did not exempt exports.
- style.css has no opening header comment. The lane's own PROMPT.md says both "each of the
  four src files opens with a 3-6 line comment" and "style.css: prettier only, no other
  edits". The builder obeyed the second line. This is a prompt contradiction, not a
  builder failure, so it costs little.

## Item 3 note

The format lane confessed in its own unverified list that it ran
`npx vite build --outDir "$TMPDIR/novite"` once as a parse check. The brief said no build.
It wrote nothing into the repo and dist/ does not exist (scorer confirmed). Disclosed
honestly rather than hidden, so it is a one-point deduction, not a gate failure.

## Item 5 trace (6 numbers sampled, 6 reproduced)

All reproduced with the exact commands the report names, from a clean run in this session.

| Claim in BALANCE-REPORT.md | Command | Result |
|---|---|---|
| Naive dies stage 6 wave 2 with 1535 coins, 10 towers all level 1, route 13 | `node tools/balance-sim.mjs` | Exact match, whole stage table identical |
| Thorn dps 15.4 (L1) and 69.2 (L3 power), Sunstone 105.5 (L3 power) | `--numbers` | Exact match |
| Stage 6 wave 1: 19 enemies, 3307 rawHP, 4324 effHP, 310 effHP/s | `--numbers` | Exact match |
| Stage 10 wave 3: 31 enemies, 39950 rawHP, 45312 effHP, 2579 effHP/s | `--numbers` | Exact match |
| Recommended package row: naive S8W2 -21, maze won -10, maze-deep won -1, farm-lite S10W3 -21 | `--experiments` | Exact match, full 13-row table matches the report |
| Maze run: 598 kills, route 53 by stage 3, ends 16 lives and 2769 coins, Sunstones stuck at level 2 | `node tools/balance-sim.mjs` | Exact match (levels 3333333322) |

Confirmed-true side claims: armor absorb factor 0.55 printed by `--numbers`; the three
economy-only experiments (kill-coins-7, cheap-garden, idle-20s) change no outcome, exactly
as section 3.5 states.

## Punch list (cosmetic, nothing gate-class)

1. r2 should rename `W`/`H` to `BOARD_WIDTH`/`BOARD_HEIGHT` or accept them permanently;
   decide once and stop paying rubric tax on it.
2. Give style.css its 3-6 line header next time a lane owns it for real edits.
3. world.js still has no automated test (both lanes flagged it). The golden replay covers
   game.js only. Worth a cheap smoke test in r3 when the UI lanes open it anyway.
4. Bloom is bought by no strategy, so splash damage is unsimulated. Fill in r2 before
   tuning Bloom numbers.

## Cherry-picks

Not applicable as a between-lane contest: the lanes were disjoint jobs, both passed, and
both ship. One habit worth stealing round-wide: the format lane's html-equivalence.mjs
(315 string comparisons proving the rebuilt markup is byte identical, scorer re-ran it,
exit 0) is a model for proving zero behaviour change in a refactor.

## Unverified by the scorer

- The rendered page. No browser exists for this scorer and none was opened. Both lanes
  flagged the same limit. The reformat is proven equivalent at the string and replay
  level, not at the pixel level.
- The three Playwright scripts (browser.mjs, mobile-layout.mjs, mobile-live.mjs) need a
  dev server and were not run by anyone this round.
- CSS rule semantics after prettier reflow (trusted, not diffed as parsed rules).
- Whether a human playtester matches any simulated strategy. All balance findings are
  simulator-only, and the report says so plainly.
