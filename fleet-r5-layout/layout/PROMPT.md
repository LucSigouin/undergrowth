LANE-TOKEN: r5-layout-3c9a

You are the "layout" worker on Undergrowth v2, round r5. Model requested: claude-opus-5, effort medium.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git, HEAD 11f3de2 plus the gate commit).
Dev server: http://localhost:5174 (already running, hot-reloads).

Read first: fleet-r1-foundation/COMMON.md (rules; Playwright allowed, system browser never; where it says
fleet-r1-foundation/<lane>/ read fleet-r5-layout/layout/), fleet-r5-layout/ROUND.md, fleet-r5-layout/RUBRIC.md,
tests/layout-gate.mjs (the gate; never edit it), then src/main.js, src/style.css, src/look.js, tests/browser.mjs.

## Luc's three asks
1. NO SCROLLING, EVER. The right sidebar (.sidebar-scroll) scrolls and at 1536x864 and below the wave bar is
   cut off. Make the whole sidebar fit at 1280x720 through 1920x1080 with no scrolling and nothing clipped.
   Options: tighter cards (one line each, cost on the right), the Materials list removed from the sidebar
   (it moves to the map, ask 3), the help text trimmed, `min-height: 0` / flex fixes, a `clamp()` type scale
   keyed to viewport height. The seven tower cards, coins, wave bar and Begin wave must all stay visible.
2. HOVER NOTES instead of the "Before you build" panel. When a tower type is chosen but no placed tower is
   selected, #detail stays hidden. Hovering (and keyboard-focusing) a tower card shows a small popover near
   the card with effect, tip and level 1 stats (damage, range, rate). Give it role="tooltip" or a class
   `hover-note`. Selecting a placed tower still opens #detail with upgrade, reclaim and the missing-material
   note exactly as now.
3. MATERIALS AS A MAP HUD. Move #wood #rock #iron #diamond into #scene, top band, right side, styled like the
   Stage/lives chips (.map-status). Keep the ids. Clicking a chip opens the garden controls (reuse the phone
   summary's behaviour or scroll the garden strip plot into view). Phone layouts already have a resource row;
   keep them working (tests/mobile-layout.mjs, tests/browser.mjs may need small updates where they asserted
   the old panel or the old inventory rows).

Rules: src/game.js is frozen (byte-identical; `node tests/golden.mjs` identical). Keep the r3 look and
palette (src/look.js). No npm packages. Keep `npm run format` clean and lines under 110 chars. No em dashes.
Take screenshots with Playwright into fleet-r5-layout/layout/shots/ at 1280x720, 1920x1080, 390x844, 844x390.
Do not commit, build, push, or open the system browser.

You own: src/main.js, src/style.css, src/look.js, src/world.js (only if the HUD needs it), tests/browser.mjs,
tests/shots.mjs, tests/mobile-layout.mjs, README.md (controls paragraph only), fleet-r5-layout/layout/.
Never: tests/layout-gate.mjs, src/game.js, tests/golden.*, tests/balance-gate.mjs, tools/, CHANGELOG.md.

## Verify (the orchestrator runs exactly this; it must exit 0)
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2 && npm test && node tests/golden.mjs && node tests/balance-gate.mjs && git diff --quiet HEAD -- tests/layout-gate.mjs src/game.js && npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}" && awk 'length>110{f=1} END{exit f}' src/*.js && GARDEN_URL=http://localhost:5174 node tests/layout-gate.mjs && GARDEN_URL=http://localhost:5174 node tests/browser.mjs && test -s fleet-r5-layout/layout/REPORT.md && test "$(ls fleet-r5-layout/layout/shots/*.png 2>/dev/null | wc -l)" -ge 4 && node -e "const r=require('./fleet-r5-layout/layout/result.json');if(r.state!=='done'||!r.model||!r.taskId)process.exit(1)"

## Deliverables in fleet-r5-layout/layout/
- REPORT.md (draft within 10 minutes; final: per-file changes, the 4 shots linked, what is unverified)
- result.json per COMMON.md rule 7. Your taskId is the file name (without .md) in
  /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include "LANE-TOKEN: r5-layout-3c9a".
  model.requested "claude-opus-5", model.effective = the model id you actually run as.
