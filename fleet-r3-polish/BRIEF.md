# r3 polish brief (same for both lanes; your prompt tells you your lane letter, folder and port)

You are polishing Undergrowth, a browser tower defence: Three.js scene + vanilla JS UI + one CSS
file, built with Vite. Your lane folder is a FULL COPY of the project (src/, tests/, tools/,
node_modules/, package.json). Work only inside it. The engine (src/game.js) is frozen: change
nothing about how the game plays. Everything about how it looks and how clearly it communicates
is yours.

Read first: README.md, CHANGELOG.md, src/style.css, src/world.js, src/main.js, and
../../fleet-r2-design/scorer/SCORE.md (section "For the next round", items 2 to 5 are yours).
Rules that bind you: ../../fleet-r1-foundation/COMMON.md with its 2026-09-07 amendment (Playwright
allowed, system browser forbidden, no npm packages, no em dashes, no commits, no push).

## What "polished" means here (the scorer's RUBRIC.md is the exact list; this is the intent)
- The 3D scene reads at a glance: each tower has its own silhouette and colour, enemies stand out
  from the ground, shots and kills give feedback, the route is obvious. Depth from light and
  material, not fog. Respect prefers-reduced-motion.
- The UI has hierarchy: one primary action, a small type scale, consistent spacing, cards that
  show affordability (grey out what you cannot buy), a detail panel that reads top to bottom.
  Fill the window on every layout. The phone tray and landscape layout matter as much as desktop.
- Four clarity fixes: (a) Bloom, Ember, Sunstone and the Diamond material chip get distinct
  symbols and colours; (b) when a Lantern is selected or hovered, show which towers it boosts on
  the board; (c) Sunburst gets a visible armed state and a cancel, and a board tap while armed
  must not place a tower; (d) the help dialog tells a returning player that the wild grew back
  stronger, so the old maze alone will not hold.
- Keep: no new npm dependency; the phone pixel-ratio cap (1.5) and phone shadow map size (1024)
  not raised; 44 px phone buttons; visible focus; body text contrast 4.5:1 or better.

## Working
Your dev server is already running on your port (the orchestrator started it; it hot-reloads).
If it is down, start `npx vite --port <your port> --strictPort` inside your lane folder and leave
it running. Smoke test with `GARDEN_URL=http://localhost:<your port> node tests/browser.mjs` (it
writes into test-results/, which is disposable). Take screenshots with Playwright into
`<lane>/shots/`: desktop idle (1440x1000), desktop mid-wave with a tower selected, phone portrait
(390x844), phone landscape (844x390). Look at them. Iterate.

Keep `npm run format` clean and lines under 110 characters in src/*.js. Comment new functions in
one line. Do not name your CLI or model anywhere in the lane.

## Verify (the orchestrator runs exactly this inside your lane folder; it must exit 0)
npm test && node tests/golden.mjs && node tests/balance-gate.mjs && npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}" && awk 'length>110{f=1} END{exit f}' src/*.js && GARDEN_URL=http://localhost:<your port> node tests/browser.mjs && test -s REPORT.md && test "$(ls shots/*.png 2>/dev/null | wc -l)" -ge 4 && node -e "const r=require('./result.json');if(r.state!=='done'||!r.model||!r.taskId)process.exit(1)"

## Deliverables at the root of your lane folder
- REPORT.md: draft within 10 minutes (heartbeat), final: what changed per file, the 4+ screenshots
  linked, what you could not verify.
- result.json per COMMON.md rule 7 (state, taskId, model {requested, effective, source}, files,
  verify {cmd, exit}, unverified). Your taskId is the file name (without .md) in
  /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include your LANE-TOKEN.
