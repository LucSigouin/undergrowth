# r6 score: AAA art

Scorer: fresh Fable 5 node, zero context. Every gate run by me, every screenshot taken by me.
Shots in fleet-r6-art/scorer/shots/. Lane reports read only after my scores were formed.

| # | Criterion | Score |
| --- | --- | --- |
| 1 | Reads at game size | 9.0 |
| 2 | One style | 9.0 |
| 3 | Clean sprites | 8.0 |
| 4 | Levels and kinds tell a story | 9.0 |
| 5 | In the game | 9.5 |
| 6 | Honest record | 9.5 |
| | **Average** | **9.0** |

**Verdict: PASS** (average 9.0, pass line 8.5). Killer floor: no cell at or below 5.5. Not hit.

## Frozen artifact check

- `shasum -a 256 -c fleet-r6-art/integrate/FROZEN.sha`: all OK, exit 0 (covers src/ including
  src/game.js at b2f8f1bc... and public/art/).
- `shasum -a 256 -c FROZEN.sha` from inside fleet-r6-art/ (116 lines, the 58 finals plus small
  copies): all OK, exit 0.
- `git status --short src/game.js`: clean. Last commit touching it is 7a2f7f2, before this round.

## Gates I ran (project root, exit codes mine)

| Gate | Exit | Evidence |
| --- | --- | --- |
| check-assets icons / towers / enemies / board | 0 / 0 / 0 / 0 | run in this session |
| check-integrated.mjs | 0 | "integration gate green: rules frozen, 58 art stems shipped" |
| npm test | 0 | fail 0 |
| tests/golden.mjs | 0 | "golden replay identical" |
| tests/balance-gate.mjs | 0 | "1 winner(s), naive dies at stage 7" |
| npm run format:check | 0 | "All matched files use Prettier code style!" |
| tests/layout-gate.mjs (vite on 5175) | 0 | green at all five desktop sizes |
| tests/browser.mjs | 0 | full pass list, no JS errors |
| tests/mobile-layout.mjs | 0 | webkit 390x844, 844x390, 375x667 |

## Justifications

1. **Reads at game size: 9.0.** All 21 tower finals side by side in sheet-towers-l1l2l3.png and
   all 13 icons in sheet-icons-256.png: each of the seven tower families has its own colour and
   silhouette (amber ballista, teal well, rose flower, violet crystal, green hedge cube, orange
   fire bowl, gold lantern frame) and each icon is identifiable at a glance. The eight enemies in
   sheet-enemies-256.png are distinct; the closest pair, grub and grubling, still separate by
   colour and bulk, and in-game (09-enemy-zoom.png, 160 px at 1:1) a grub reads cleanly on the
   path.

2. **One style: 9.0.** The 58 finals share the painterly Kingdom Rush look: warm upper-left key
   light, thin dark outline, saturated harmonious colour (all four sheet shots). No photoreal or
   flat-vector stray anywhere. The one visible split is deliberate and consistent: icons are 3/4
   view while board sprites are straight top-down, which is standard for a top-down TD and both
   are clearly the same hand.

3. **Clean sprites: 8.0.** Transparency gates green (check-assets, all four lanes, exit 0); no
   text, watermark, halo or cut edge in any sheet or in the 1:1 clips (08-tower-zoom.png). Tiling:
   tile-meadow-a, apron-wood and tile-path wrap cleanly in my 3x3 grids; tile-meadow-c shows a
   soft per-tile brightness gradient that makes a faint 3x3 checker (tile3x3-tile-meadow-c.png),
   and ground-outer shows a faint horizontal band at the wrap (tile3x3-ground-outer.png). Neither
   is obvious at game zoom (01-fresh-desktop.png), but the rubric asks me to look at the grid and
   the seams are there.

4. **Levels and kinds tell a story: 9.0.** In 06-all-towers.png all seven families sit at l1, l2
   and l3 on one board and each column reads as the same tower growing grander (gold trim, crowns,
   satellite crystals, flame size). Armor looks armoured (slate plates), moth has wings, warden
   carries three jade shield plates, brood is a translucent sac with grubs inside, boss is a
   crowned stag beetle twice the menace of anything else. One note: the game forbids upgrading
   hedge (src/game.js line 616), so tower-hedge-l2/l3 art can never appear in play; the art
   itself still tells the story.

5. **In the game: 9.5.** Every gate above exit 0, run by me. src/game.js is byte-frozen (sha
   check plus clean git status) and the golden replay is identical. No chip symbols anywhere in
   the header, sidebar or detail panel (02-midwave-desktop.png, 04-phone-portrait.png: painted
   icons throughout). public/art/ is 58 files, 4.3 MB, under the 6 MB target. Frames: 60.1 fps
   over 3 s with 12 towers and a stage-8 wave (22 enemies at the start of the run) at 1440x900,
   GPU-enabled headless Chromium (shots/fps.txt); the default software rasteriser gives 27-37
   fps on the same scene, which is the environment, not the game.

6. **Honest record: 9.5.** All four lane cost totals reproduce exactly from costs.jsonl (icons
   3.17904 / 15 takes, towers 5.10793 / 24, enemies 2.33873 / 11, board 3.60109 / 17; total
   14.23 USD). Rejected takes are in each lane's candidates/ (7, 18, 12, 15 files). No em dash in
   any REPORT.md (grep count 0). The integrate report's claims match my own runs, including its
   60 fps GPU reading and its software-rasteriser caveat, which I reproduced independently.

## Redo notes (cells below 8.5)

Only criterion 3 at 8.0. To the board lane, if a redo round is ever wanted:

- Regenerate tile-meadow-c with even lighting across the frame; the current take has a lit
  centre that turns into a checker when tiled. A flat-lit regeneration or a 50 percent offset
  wrap fix in an editor both work. tile-meadow-a is the model: it wraps invisibly.
- ground-outer has a faint horizontal band at the wrap line. Same fix. Low priority: it sits
  under trees and props at game zoom and I could not find the band in the in-game shots.

No other cell is below 8.5; no change is needed to pass, and the round passes as shipped.
