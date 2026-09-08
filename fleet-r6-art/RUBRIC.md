# r6 rubric: AAA art (score each 0-10 in 0.5 steps, average is the grade, pass >= 8.5, any cell <= 5.5 fails)

Written BEFORE any builder was spawned. Scorer: open the actual PNGs and the running game, take your
own Playwright screenshots, run every gate yourself, do not trust REPORT.md.

1. READS AT GAME SIZE. Every tower sprite at 512 px and every icon at 256 px is identifiable at a
   glance and distinct from the other six. Enemies at 256 px are distinct from each other. Put the
   set side by side and check by eye. A silhouette you must squint at scores low.

2. ONE STYLE. All 58 finals look painted by the same hand: same lighting direction, same outline
   weight, same saturation. A photoreal or flat-vector stray, or a visible style split between
   lanes, costs points here.

3. CLEAN SPRITES. Transparent where required (gate green), no text, no watermark, no cut-off
   edges, no baked-in background halo. Tiles and textures tile without an obvious seam when
   placed as a 3x3 grid (the scorer builds that grid and looks).

4. LEVELS AND KINDS TELL A STORY. Level 1 to 3 of each tower is clearly the same tower growing
   grander. Beetle looks armoured, moth looks like it flies, warden looks like it shields, brood
   looks like it will burst, boss looks like a boss.

5. IN THE GAME. The integrated build shows the new board, towers, enemies and icons with the
   existing rules untouched (src/game.js byte-identical, golden identical), every existing gate
   green, no chip symbols left in the sidebar or header, public/art/ under 10 MB total (target 6 MB; WebP or JPEG where alpha is not needed),
   60 fps on a 1440x900 board with 12 towers and 20 enemies (check with the browser profiler or
   the frame timer in window.__garden if present).

6. HONEST RECORD. Each lane's REPORT.md shows its finals, the cost total from costs.jsonl,
   rejected takes in candidates/, and what could not be verified. No em dashes.
