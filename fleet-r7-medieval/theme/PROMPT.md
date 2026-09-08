LANE-TOKEN: r7-theme-e6a2

You are the "theme" worker on Undergrowth v2, round r7 (medieval castle siege). Model requested: claude-opus-5, effort medium.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git, main, base d511e65). Your folder: fleet-r7-medieval/theme/.
Your CNVS taskId: the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include
"LANE-TOKEN: r7-theme-e6a2". Put it in result.json.

Read first: fleet-r7-medieval/COMMON.md (rules, the theme table with every new name, the retired words),
fleet-r7-medieval/RUBRIC.md (you are graded on 2, 4, 5, 6), fleet-r7-medieval/check-theme.mjs (your gate, never edit it),
then src/game.js, src/main.js, src/look.js, src/style.css, index.html, README.md, DECISIONS.md, workbench/CURRENT-RULES.md,
tests/game.test.js, tests/browser.mjs, tests/mobile-layout.mjs, tools/balance-sim.mjs.

## The job: names, copy, palette, type. Not the art.
Four codex lanes are painting new sprites into fleet-r7-medieval/ with the SAME file names the game already loads
(look.js `art`, `levels`, BOARD_ART paths are unchanged). You do not touch public/art/ or any image. You own:
1. src/game.js: ONLY string literals. Every `name`, `desc`, `effect`, `tip` for the seven towers and the eight
   enemies becomes medieval per the COMMON.md table (Ballista, Tar pit, Catapult, Mage spire, Palisade, Brazier,
   War banner; Goblin, Wolf rider, Iron knight, Gargoyle, War wagon, Whelp, Paladin, Warlord). Rewrite the sentences
   so they read medieval ("Fires an iron bolt", "sticky tar slows", "rally the engines") while stating the same
   numbers and behaviour. Materials keep their names. Any comment text may change. Nothing else in the file may
   change: the gate strips every string literal and diffs the rest against d511e65.
2. src/main.js, index.html: every player-facing string (help dialog, settings, aria labels, toasts, victory and
   defeat copy, the <title>) reads medieval. "garden" becomes "the works" (sawmill, quarry, forge, gem cutter for
   wood, rock, iron, diamond), "settlement" becomes "keep", "expedition" becomes "siege", "meadow" becomes "bailey".
   Element ids, classes and data attributes stay as they are (tests and CSS depend on them).
3. src/style.css, src/look.js: the interface palette moves from garden green to castle stone and parchment with
   heraldic crimson and gold accents. Replace DM Sans: pick one display face with medieval character for the wordmark
   and headings (e.g. Cinzel or Grenze) and one clean legible body face (e.g. Alegreya Sans or Source Sans 3), both
   from Google Fonts, with system fallbacks. Keep the four type sizes, the spacing steps and every layout rule; change
   tokens, not structure. Body text contrast at least 4.5:1 on its panel. look.js: update the accent `color` per tower
   and material to match the medieval palette (these tint chip plates and range rings); keep every `art` path.
   The `SCENE` colours for the seam, hover, route and ring may shift to suit stone.
4. README.md, DECISIONS.md, workbench/CURRENT-RULES.md, CHANGELOG.md (one entry at the top): new names and words;
   the strategy guide keeps its meaning. tests/game.test.js, tests/browser.mjs, tests/mobile-layout.mjs and
   tools/balance-sim.mjs: update only where they assert or print the old names or copy.

Gates, all from the project root, all green before you report: `node fleet-r7-medieval/check-theme.mjs`, `npm test`,
`node tests/golden.mjs`, `node tests/balance-gate.mjs`, `npm run format:check`, and against your own dev server on
port 5176 (`npx vite --port 5176 --strictPort`, stop it at the end): `GARDEN_URL=http://localhost:5176 node
tests/layout-gate.mjs`, `... node tests/browser.mjs`, `... node tests/mobile-layout.mjs`. Playwright needs the sandbox
off. Take shots with `node tools/shoot.mjs --url http://localhost:5176 --out fleet-r7-medieval/theme/shots` and
LOOK at them; the board will still show the r6 garden sprites (the art lands later), judge only the interface.

Deliver REPORT.md (what changed per file, contrast numbers for body text and muted text, the fonts chosen and why,
shots, unverified) and result.json per COMMON.md. Plain words, short sentences, no em dashes. No commit, push, build, deploy.
