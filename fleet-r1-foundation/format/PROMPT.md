LANE-TOKEN: r1-format-7f3a

You are the "format" worker on Undergrowth v2, round r1. Model requested: claude-opus-5, effort medium.
Read first, in this order:
1. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r1-foundation/COMMON.md (rules for every lane)
2. /Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r1-foundation/RUBRIC.md (you are scored on items 1-3)
3. /Users/ls/Claude-Workspace/personal/undergrowth-v2/README.md, then the four files in src/

## Your task
The code was written as 200-character lines with one-letter names. Make it readable with ZERO change
in behaviour. Concretely:
- Add prettier as the ONLY new devDependency (`npm install --save-dev --cache "$TMPDIR/npmcache" prettier`),
  a `.prettierrc` (printWidth 100, singleQuote true, semi true), and scripts `"format": "prettier --write ..."`
  and `"format:check": "prettier --check ..."` covering src/**/*.{js,css} and tests/*.{js,mjs}.
- Run prettier, then hand-edit: one statement per line, break long string literals so no line in
  src/*.js or tests/*.test.js exceeds 110 characters, rename single-letter names at module or class
  scope to words (local loop variables like i, x, z, dx, dz may stay). Keep exported names
  (Game, path, TOWERS, MATERIALS, STAGES, W, H, ENTRY, EXIT, World) exactly as they are.
- Each of the four src files opens with a 3-6 line comment saying what it owns. Every class method
  and exported function gets a one-line comment. Comments in plain words, no em dashes.
- style.css: prettier only, no other edits.
- tests/game.test.js, tests/browser.mjs, tests/mobile-*.mjs: prettier + readable lines. Do not change
  what they assert.

You own ONLY: src/game.js, src/main.js, src/world.js, src/style.css, tests/game.test.js,
tests/browser.mjs, tests/mobile-layout.mjs, tests/mobile-live.mjs, package.json, package-lock.json,
.prettierrc, and your lane folder fleet-r1-foundation/format/. Another worker is writing tools/ and
tests/sim.test.js at the same time: do not create or touch those.

NEVER edit tests/golden.mjs or tests/golden.json. They freeze behaviour. If `node tests/golden.mjs`
fails, you changed behaviour: find it and undo it. Do not run `npm run build`. Do not commit.

## Verify (the orchestrator runs exactly this; it must exit 0)
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2 && npm test && node tests/golden.mjs && git diff --quiet HEAD -- tests/golden.mjs tests/golden.json && npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}" && awk 'length>110{f=1} END{exit f}' src/*.js tests/*.test.js && test -s fleet-r1-foundation/format/REPORT.md && node -e "const r=require('./fleet-r1-foundation/format/result.json');if(r.state!=='done'||!r.model||!r.taskId)process.exit(1)"

## Deliverables in fleet-r1-foundation/format/
- REPORT.md (draft within 10 minutes; final: what changed, the rename table, what is unverified)
- result.json per COMMON.md. Your taskId is the file name (without .md) in
  /Users/ls/Claude-Workspace/personal/.cnvs/pipe/ whose contents include the text "LANE-TOKEN: r1-format-7f3a"
  (`grep -l "r1-format-7f3a" /Users/ls/Claude-Workspace/personal/.cnvs/pipe/*.md`).
  Set model.requested to "claude-opus-5" and model.effective to the model id you are actually running as.
