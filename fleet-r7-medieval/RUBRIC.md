# r7 rubric: medieval castle siege (0-10 in 0.5 steps, average is the grade, pass >= 8.5, any cell <= 5.5 fails)

Written BEFORE any builder was spawned. Scorer: open the PNGs and the running game, take your own screenshots,
run every gate yourself, do not trust REPORT.md.

1. READS AT GAME SIZE. Each of the 7 engines at 256 px board size and each icon at 160 px is identifiable and
   distinct from the other six; the 8 creatures are distinct at 192 px. Side by side, by eye.

2. ONE MEDIEVAL STYLE, ART AND INTERFACE TOGETHER. All 58 finals look painted by one hand in the castle siege
   palette (stone, oak, iron, crimson, gold). The interface palette and type match the art: parchment or stone
   panels, heraldic accents, a display face with medieval character for headings, body type still fully legible
   (contrast at least 4.5:1). A garden-green interface under medieval art, or fonts that fight the art, cost points.

3. CLEAN SPRITES AND TILES. Transparency gates green, no text, no watermark, no cut-off edges, no halo. Tiles,
   ground and apron repeat as a 3x3 grid without a visible seam or checker (build the grid and look).

4. THE NAMES AND WORDS TELL ONE STORY. Ballista, Tar pit, Catapult, Mage spire, Palisade, Brazier, War banner;
   Goblin, Wolf rider, Iron knight, Gargoyle, War wagon, Whelp, Paladin, Warlord. Materials still Wood, Rock, Iron,
   Diamond. Every desc, effect, tip, help dialog, README sentence and aria label reads medieval; no leftover garden,
   meadow, pollen, grub or bug wording; the works (sawmill, quarry, forge, gem cutter) replace the garden in copy.
   Each engine's level 1 to 3 art is the same engine growing grander; each creature looks like its name.

5. IN THE GAME, RULES FROZEN. check-theme.mjs green (game.js identical outside string literals, golden identical),
   check-integrated.mjs green, npm test, balance gate, format, layout gate, browser and mobile gates all green,
   public/art under 10 MB, 60 fps at 1440x900 with 12 towers and 20 creatures. Save files from the live game still load.

6. HONEST RECORD. Each lane's REPORT.md matches what is on disk: cost totals reproduce from costs.jsonl, rejects in
   candidates/, unverified items listed. No em dashes.
