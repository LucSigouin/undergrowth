# r3 polish: score (zero-context scorer, 2026-09-07)

Both lanes graded cold on the same 6 rubric items, 0 to 10 in 0.5 steps, average is the grade,
pass at 8.5 or better, any cell at 5.5 or below fails the lane. I ran every gate myself in each
lane folder, took my own Playwright screenshots into /tmp/claude/r3-score/, and read both REPORT.md
files last, as claims to check.

## Gate, run by the scorer inside each lane folder

Command: `npm test && node tests/golden.mjs && node tests/balance-gate.mjs && npx prettier --check
"src/**/*.{js,css}" "tests/*.{js,mjs}" && awk 'length>110{f=1} END{exit f}' src/*.js`

| Lane | Gate exit | npm test | golden | balance | prettier | line length |
|---|---|---|---|---|---|---|
| a | 0 | 33 pass, 0 fail | "golden replay identical" | green, 2 winners, naive dies stage 7 | clean | clean |
| b | 0 | 33 pass, 0 fail | "golden replay identical" | green, 2 winners, naive dies stage 7 | clean | clean |

### browser.mjs, three runs per lane, plus a control on the untouched main tree

| Tree | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| lane a (:5181) | 0 | 1 | 0 |
| lane b (:5182) | 0 | 0 | 0 |
| main tree (:5174), untouched, control | 0 | 1 | 0 |

**Verdict on the lane a failure the orchestrator saw: it is a flake in the test, not a bug in
lane a.** The identical failure reproduces on the untouched main tree (1 of my 3 control runs):
a 30 s timeout clicking `[data-unlock="3"]` at browser.mjs:75-76 while the panel re-renders under
the pointer ("element was detached from the DOM", "&lt;html&gt; intercepts pointer events"). Lane b
diagnosed a likely root cause (stepping the clock to exactly the 10-second collection boundary
lands a float short, so the panel keeps flipping state) and changed the test's steps from 20/10 to
21/11 seconds, weakening no assertion. Lane b went 0 failures in my 3 runs and 4 in the builder's.
Lane a inherited the flake and is not penalised for it.

## Items (0-10, 0.5 steps, RATING-SYSTEM-v1 anchors)

| # | Item | Lane a | Lane b |
|---|---|---|---|
| 1 | Rules untouched | **10** - game.js byte-identical to main, golden identical, balance green | **10** - same: diff empty, golden identical, balance green |
| 2 | Scene reads better | **8.5** - distinct tower models (crystal, flower, ember bowl), deeper enemies, impact flashes and kill rings, route dots plus small chevrons; hedges stay pale flat tiles and the route marks are timid at a glance | **9.5** - every tower on a coloured eight-sided plate with its own footprint, bold chevron route with entry and exit pads, enemies with contact discs and readable health bars, visible bolts and muzzle flashes; one self-flagged cosmetic depth artifact keeps it off 10 |
| 3 | UI has hierarchy | **7.5** - clear primary action and greyed unaffordable cards, but on phone portrait the Diamond resource card overflows its box (in the lane's own shot and mine), the toast covers the map controls, and landscape cuts Lantern below the fold | **9** - price in the card eyebrow, key-number chips, detail panel reads top to bottom with a boost note, two-column landscape fits all seven pieces plus a materials list; phone portrait drops resource names to icons only |
| 4 | Four clarity fixes | **9.5** - all four present and proven; Bloom and Ember glyphs are both flower-like shapes, separated mainly by colour | **10** - all four present and proven, plus a reverse indicator ("A Lantern is speeding this up by 30%") on boosted towers and an armed frame around the whole board |
| 5 | Performance and access kept | **9.5** - no new dependency, pixel ratio 1.5, shadow map 1024, all phone buttons 44 px or more in both orientations, contrast 6.0 / 6.0 / 5.97, reduced motion honoured | **10** - same floors all kept, contrast 5.41 on my three pairs (their ten measured pairs all above 4.5), and it fixed the flaky harness instead of living with it |
| 6 | Honest report | **9.5** - per-file changes, six real screenshots from its own server (headers and mtimes check out, no duplicates), admits its one flaky run and lists what it could not verify | **10** - every claim I traced reproduced exactly, eight screenshots, self-flags a visual artifact, an unmeasured frame cost, and the float knife-edge it found in the test |

**Averages: lane a 9.08, lane b 9.75.** No cell at 5.5 or below in either lane.

| Lane | Average | Verdict |
|---|---|---|
| a | 9.08 | **PASS** |
| b | 9.75 | **PASS** |

## WINNER: lane b

Lane b wins on the two items the round was about: its board is readable at a glance from the
top-down camera (plates, footprints, bold route, enemy health bars) where lane a's is merely
better, and its UI has no user-visible layout defect where lane a ships three small ones on phone.
The margin (0.67) is far outside the 0.25 tie window, so no pairwise pass was needed.

## Traced claims (3 per lane, recomputed, not quoted)

Lane a, all three CONFIRMED:
1. "Detail text #55644a on #f8faf1 is about 6.0:1." My computed ratio on the live page: 6.0. True.
2. "A board tap while armed cannot place a tower." Armed Sunburst, tapped an empty square:
   towers.length 5 before, 5 after, ability disarmed and fired. True.
3. "tests/browser.mjs: screenshot path moved, no assertion changed." Diff against main shows only
   the SHOTS constant and a mkdir. True.

Lane b, all three CONFIRMED:
1. "Muted text on paper is 5.41:1." My computed ratio on the live page: 5.41, exact. True.
2. "desktop-idle.png has 60 coins so Bloom, Sunstone, Ember and Lantern read unaffordable." The
   shot shows 60 coins, those four cards greyed with struck-through prices, Iron and Diamond plot
   buttons dimmed. True.
3. "package.json untouched." True: the three script lines that differ from main were added to main
   by the r4 ship commit (6e3fc79) after the lane copies were made; the lane file matches the
   pre-r4 base. No dependency was added in either lane.

Confirmed-true incidentals: both lanes' phone buttons measured 44 px or more at 390x844 and
844x390 (21 and 20 visible buttons counted); both keep pixel ratio 1.5 and shadow map 1024 on the
iPhone 13 descriptor; no em dashes and no CLI or model names in either lane's src, REPORT.md, or
index.html (result.json carries the model field its contract requires).

## Punch list

Gate-class: none in either lane.

Cosmetic, lane a: Diamond resource card overflows on phone portrait; toast banner covers the map
control buttons on phone; landscape tower list needs a scroll to reach Lantern; Bloom and Ember
glyphs rely on colour to differ.

Cosmetic, lane b: range ring can draw over the heart tree canopy (self-flagged); phone portrait
resource cards show no names, icons only; frame cost of the added meshes unmeasured.

## Redo notes

Both lanes pass, so no redo. A PASS never enters the redo loop.

## Cherry-picks for the winner (lane b) from lane a

1. The blue route preview while a wall placement is staged, so a planned route cannot be confused
   with the live one.
2. tests/mobile-layout.mjs: a standalone 44 px touch-target check that runs on Chromium and
   WebKit in three viewports. Worth landing in the main tests/ folder.
3. The full 3-square blast-radius fill under the Sunburst target ring (b draws the ring only).

## Unverified

- Focus outlines: claimed by both lanes, not independently exercised with a keyboard walk.
- Real-device touch, sound, safe-area behaviour, and OS-level reduced motion (both lanes flag the
  same; both were checked through emulation only).
- Frame rate on low-end hardware (lane b flags its own added mesh count).

## For the next round

1. Land lane b's browser.mjs float fix (step 21/11, not 20/10) in the main tree; the flake is in
   main and will keep biting gates. Consider a data-state attribute wait before the unlock clicks.
2. Port lane a's mobile-layout.mjs into main tests.
3. Cherry-pick lane a's staged-wall blue route preview into the winner.
4. Fix the ring-over-canopy depth artifact (renderOrder or depthWrite on the marker material).
5. Measure frames per second once on a throttled phone profile and record it, so the mesh budget
   stops being a guess.
