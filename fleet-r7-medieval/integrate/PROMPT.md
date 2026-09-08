LANE-TOKEN: r7-integrate-f7b4

You are the "integrate" worker on Undergrowth v2, round r7 (medieval castle siege). Model requested: gpt-6-astra, effort xhigh.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/. Your folder: fleet-r7-medieval/integrate/.
Your CNVS taskId: the file name (without .md) in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include
"LANE-TOKEN: r7-integrate-f7b4". Put it in result.json.

Read first: fleet-r7-medieval/COMMON.md (rules), fleet-r7-medieval/RUBRIC.md (criteria 3 and 5 are yours),
fleet-r7-medieval/integrate/build-art.py (already adapted from r6: it reads fleet-r7-medieval/<lane>/ finals, crops
cut-outs to their paint, resizes to game size, writes PNG for alpha sprites and WebP for opaque textures into public/art/),
fleet-r6-art/check-integrated.mjs (the gate: art stems shipped, rules frozen at ad32fda-era game.js... NOTE: that gate
diffs src/game.js against ad32fda and WILL be red on names; the orchestrator accepts that one line, see below),
src/look.js (the paths the game loads; do not change them), tools/shoot.mjs.

## The job
1. `python3 fleet-r7-medieval/integrate/build-art.py` from the project root (needs Pillow and cwebp, both present; if
   cwebp is missing say so and fall back to JPEG quality 86 via Pillow, keeping the .webp name is NOT allowed then; use
   .jpg and report it). It empties public/art/ and rebuilds all 58 files. Confirm the file list matches what
   src/look.js references (grep the paths) and the folder is under 10 MB.
2. Look at the result in the game: start `npx vite --port 5177 --strictPort` (sandbox off), then
   `node tools/shoot.mjs --url http://localhost:5177 --out fleet-r7-medieval/integrate/shots` and your own extra shots:
   all seven engines at levels 1, 2 and 3 on one board, a mid-wave with many creatures, phone portrait and landscape.
   LOOK at every shot. Check sprite orientation (ballista bolt and creature heads point along travel or screen-up),
   sizes (an engine fills most of its square, a goblin is about 0.6 square, the warlord about 1.1), the gates sit on the
   entry and exit squares, the tiles read as one yard, no seam or checker in the bailey. If a sprite is mis-sized or
   mis-oriented, the fix belongs in src/look.js `sprite` numbers or src/world.js orientation; you MAY edit those two
   files for that purpose only, and must say exactly what you changed.
3. Gates, all green from the project root: `npm test`, `node tests/golden.mjs`, `node tests/balance-gate.mjs`,
   `npm run format:check`, `node fleet-r7-medieval/check-theme.mjs`, and on 5177: `GARDEN_URL=http://localhost:5177 node
   tests/layout-gate.mjs`, `... node tests/browser.mjs`, `... node tests/mobile-layout.mjs`. Also run
   `node fleet-r6-art/check-integrated.mjs` and paste its output: the ONLY acceptable red line is
   "src/game.js differs from ad32fda" (the theme lane changed names in string literals; check-theme.mjs proves nothing
   else changed). Any other red line is yours to fix.
4. Frames: `node fleet-r6-art/integrate/fps.mjs` (or your own copy) at 1440x900 with 12 engines and 20 creatures; put
   the number in REPORT.md.
5. Stop the dev server. Deliver REPORT.md (build output, public/art size, gate table with exit codes, fps, shots, any
   look.js/world.js edits, unverified) and result.json per COMMON.md. Plain words, no em dashes. No commit, push,
   build (`npm run build`), deploy.
