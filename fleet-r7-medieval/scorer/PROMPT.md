LANE-TOKEN: r7-scorer-g8c5

You are the SCORER for Undergrowth v2, round r7 (medieval castle siege). Model: claude-fable-5, effort medium. You are a fresh,
zero-context grader. You built nothing this round. Do not trust any REPORT.md; reproduce every claim yourself.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r7-medieval/scorer/ (write only there).
Your CNVS taskId is the file name (without .md) of the file in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/
whose contents include "LANE-TOKEN: r7-scorer-g8c5". Put it in result.json.

Read: fleet-r7-medieval/RUBRIC.md (the six criteria, 0-10 in 0.5 steps, average is the grade, pass >= 8.5, any cell
<= 5.5 fails the round), fleet-r7-medieval/ROUND.md, fleet-r7-medieval/COMMON.md rules 1-2 and 8-10. Do not read the lane
REPORT.md files until you have formed your own scores; then read them only to check honesty (criterion 6).

What to do, in order:
1. Confirm the frozen artifact: `shasum -a 256 -c fleet-r7-medieval/integrate/FROZEN.sha` must be all OK (src/ and
   public/art/). Also `shasum -a 256 -c fleet-r7-medieval/FROZEN.sha` for the 58 medieval finals. If anything changed, stop and
   report FAIL with the file names.
2. Run every gate yourself from the project root and record exit codes: `node fleet-r7-medieval/check-assets.mjs icons|towers|enemies|board`,
   `node fleet-r7-medieval/check-integrate-r7.mjs` and `node fleet-r7-medieval/check-theme.mjs`, `npm test`, `node tests/golden.mjs`, `node tests/balance-gate.mjs`,
   `npm run format:check`; then start a dev server (`npx vite --port 5175 --strictPort`, stop it at the end) and run
   `GARDEN_URL=http://localhost:5175 node tests/layout-gate.mjs`, `... node tests/browser.mjs`, `... node tests/mobile-layout.mjs`.
   Playwright needs the sandbox off. Any red gate caps criterion 5 at 5.
3. Take your own screenshots: `node tools/shoot.mjs --url http://localhost:5175 --out fleet-r7-medieval/scorer/shots`, then
   your own extra shots: a board with all seven towers at level 1, 2 and 3 placed (use window.__garden to add coins and
   build; see tools/shoot.mjs for how it drives the game), a mid wave with many enemies, the phone layouts. Zoom in on
   a tower square and an enemy at 1:1 pixels. Build a 3x3 repeat of each meadow tile and of ground-outer and apron-wood
   from public/art and LOOK at the seams. Put all sheets in fleet-r7-medieval/scorer/shots/.
4. Score each criterion with a two sentence justification and at least one traced fact (a file, a pixel size, an exit
   code, a screenshot name). Visual cells without your own screenshot are capped at 7 and marked INFERRED.
5. Write fleet-r7-medieval/scorer/SCORE.md (table of six scores, average, PASS or FAIL, the killer-floor check, then the
   justifications, then a "Redo notes" section: the concrete changes that would raise each cell below 8.5, addressed to
   the integrate lane or to a specific art lane), fleet-r7-medieval/scorer/score.json
   {"scores":{"1":..,"2":..,"3":..,"4":..,"5":..,"6":..},"average":..,"verdict":"PASS|FAIL","killer_floor_hit":false,"gates":{...}},
   and result.json per COMMON.md with "model":{"requested":"claude-fable-5","effective":"<what you ran as>","source":"spawn flag"}.
Plain words, short sentences, no em dashes. You do not edit any file outside fleet-r7-medieval/scorer/. Never commit or push.

## r7 additions
- Criterion 4 (names and words) is new this round: read every player-facing string in src/game.js, src/main.js,
  index.html and README.md yourself; open the help dialog and the tower detail panel in the game and read them.
  Also open a level 1 to 3 engine and check the copy matches the art. Materials must still be Wood, Rock, Iron, Diamond.
- Criterion 2 includes the interface: measure body and muted text contrast on their panels (compute from the CSS
  tokens in src/style.css, or sample your own screenshot) and name the fonts in use.
- Save compatibility: in the browser, set a localStorage save from the live game's format if you can find one in
  tests/game.test.js (the version 1 to 5 migration fixtures), reload, and confirm the keep loads. Report what you did.
