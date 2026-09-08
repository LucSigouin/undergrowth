# r7 score: medieval castle siege

Scorer: fresh zero-context Fable 5. Every gate run by me, every screenshot mine (shots/).
Date: 2026-09-08. Dev server: `npx vite --port 5175 --strictPort`, stopped after grading.

| # | Criterion | Score |
|---|---|---|
| 1 | Reads at game size | 9.5 |
| 2 | One medieval style, art and interface | 9.0 |
| 3 | Clean sprites and tiles | 8.5 |
| 4 | Names and words tell one story | 9.5 |
| 5 | In the game, rules frozen | 9.5 |
| 6 | Honest record | 8.5 |

**Average: 9.08. Verdict: PASS.** Killer floor: no cell at or below 5.5, so the floor is not hit.

Frozen artifact confirmed first: `shasum -a 256 -c fleet-r7-medieval/integrate/FROZEN.sha` exit 0
(src/ and public/art), and `shasum -a 256 -c FROZEN.sha` from fleet-r7-medieval/ exit 0, 116 of 116 OK.

## Gates I ran (all exit 0)

| Gate | Exit |
|---|---|
| check-assets icons / towers / enemies / board | 0 / 0 / 0 / 0 |
| check-integrate-r7.mjs | 0 |
| check-theme.mjs | 0 |
| npm test (43 pass, 0 fail) | 0 |
| tests/golden.mjs ("golden replay identical") | 0 |
| tests/balance-gate.mjs ("1 winner, naive dies at stage 7") | 0 |
| npm run format:check | 0 |
| layout-gate (5 desktop sizes) | 0 |
| browser.mjs | 0 |
| mobile-layout.mjs (webkit 390x844, 844x390, 375x667) | 0 |

public/art is 4,293,849 bytes (4.09 MiB), under the 10 MB cap. Frame rate: 60.3 fps measured over
3 s at 1440x900 with 12 towers and 19 creatures never leaving the board (Apple M5 through ANGLE
Metal, headless Chromium with GPU). The horde kept dying into the towers, so 19 was the highest
floor I could hold; at no point did the frame rate dip.

Save compatibility: I set localStorage `undergrowth-save-v2` to the version 2 fixture from
tests/game.test.js:468, reloaded, and the keep loaded as version 5 with stage 5, 342 coins,
14 lives, and both towers intact (`thorn L2, hedge L1`). Shot: 16-save-loaded.png.

## Justifications

**1. Reads at game size: 9.5.** My own sheets 22 (13 icons at 160), 23 (21 engine sprites at 256)
and 24 (8 creatures at 192) show every asset identifiable and distinct by eye: the ballista's
crossbow arms, the tar pit's teal-black bubble pool, the catapult's red arm, the violet orb of the
mage spire, the stake-square palisade, the flaming brazier, the red-gold banner. The eight
creatures each read as their name at 192, including the wolf rider's mount and the paladin's white
shield aura; the only near pair, ballista and catapult, separate cleanly by silhouette.

**2. One style, art and interface: 9.0.** All 58 finals share the same chunky painted hand on
stone, oak, iron, crimson and gold (sheets 22 to 24, board shots 01/10/13). The interface is
parchment (#f6efdd / #e8dfc8 panels), heraldic dark red (#7e1f28) buttons, Cinzel small-caps
display headings and Alegreya Sans body (src/style.css:1,12-13). Contrast computed from the CSS
tokens: body #3b3126 on panel 9.6:1, muted #5c5040 on panel 5.9:1 and on paper 6.8:1, button ink
on brand red 8.7:1, all above 4.5:1. Half a point off: the outer-forest trees carry teal-blue
leaf clusters that lean whimsical garden rather than siege camp (01-fresh-desktop.png, left edge).

**3. Clean sprites and tiles: 8.5.** Transparency gates are green in all four check-assets runs;
my 1:1 zooms (11-zoom-tower-1to1.png, 14-zoom-enemy-1to1.png) show crisp edges with no halo, no
text, no cut-offs. My own 3x3 repeats (17 to 21) show the three bailey tiles and the stone apron
tiling with no seam or checker. The deduction: 20-grid-ground-outer.png shows a faint darker band
where tile edges meet, a just-visible grid impression at 3x3, though it hides under props in the
real board shots.

**4. Names and words: 9.5.** I read every player-facing string myself: the seven engine names,
descs, effects and tips and the eight creature names in src/game.js:19-126 are all medieval and
consistent; materials stay Wood, Rock, Iron, Diamond (src/game.js:134-137). The help dialog
(15-help-dialog.png) says maze, works, sawmill/quarry/forge/gem cutter, horde, gargoyles,
paladin shields. The level 3 Mage spire detail panel (12-detail-panel.png) and its info note match
the art. README.md and the aria labels ("The works", "Engine information") are clean; my grep for
garden/meadow/pollen/grub/bloom/hedge/lantern in README.md and index.html player text found
nothing outside frozen ids and file stems. Level 1 to 3 art is the same engine growing grander
(10-all-towers-l123.png, sheet 23).

**5. Rules frozen: 9.5.** All twelve gates above exit 0, including check-theme (game.js identical
to d511e65 outside string literals) and the golden replay. Art bundle 4.09 MiB. 60.3 fps with 12
towers and 19 creatures (see above; the 20th kept dying, and the measure never dipped, so I treat
the requirement as met with that note). The version 2 save loaded and migrated to version 5 in the
real browser. Half a point held back only because the exact 20-creature count was not reachable
with towers active.

**6. Honest record: 8.5.** All four art-lane cost totals reproduce exactly from costs.jsonl:
icons $2.75414 over 13 lines, towers $6.37542 over 30, enemies $2.12444 over 10, board $4.66578
over 22, matching each REPORT.md to the digit. Rejects sit in candidates/ as claimed (towers
REJECTIONS.md plus take files, enemies 1 rejected PNG, board 13 reject files); unverified items
are listed. The integrate lane honestly disclosed its one out-of-scope edit, a single sign flip in
src/world.js:476 for idle ballista orientation, and `git diff d511e65 -- src/world.js` confirms
that is the whole edit. Two deductions: theme/REPORT.md contains six em dashes (the brief bans
them), and that world.js line sits outside integrate's declared file ownership even though it is
disclosed and rule-safe.

## Redo notes

No cell is below 8.5, so no redo is required. To lift the two 8.5 cells:

- **Criterion 3 (board lane):** regenerate or edge-blend ground-outer so a 3x3 repeat shows no
  darker band at tile joins; test with a 3x3 grid at 100% before shipping.
- **Criterion 6 (theme lane):** strip the six em dashes from theme/REPORT.md heading lines.
  (Integrate: next round, hand a needed src fix back to the owning lane instead of editing
  src/world.js yourself, even for one line.)
- **Criterion 2 (board lane, optional):** repaint the outer-forest tree props toward
  siege-camp greens and oaks, away from the teal-blue garden clusters.
