# Common brief for every worker on Undergrowth v2, round r1

Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git repo, main branch).
A browser tower defence: Three.js + Vite, 13x9 maze board, 5 towers, 4-plot auto-farm,
10 stages x 3 waves, autosave. Engine in src/game.js is pure JS with no randomness.
src/world.js renders it, src/main.js is the UI, src/style.css the look. README.md explains play.

Do not touch /Users/ls/Claude-Workspace/personal/undergrowth/ (that is v1, frozen).

## Rules for every lane
1. Write ONLY the files your lane owns (listed in your prompt). Read anything under
   undergrowth-v2/ you like. Never touch /Users/ls/Claude-Workspace/work/.
2. Never edit `.env`. Never `git push`, `wrangler deploy`, or publish. Do not commit; the
   orchestrator commits. Do not run `npm run build`; do not touch dist/.
3. Do not add npm packages unless your prompt names one. Use `--cache "$TMPDIR/npmcache"` on
   any npm command.
4. tests/golden.mjs and tests/golden.json are the behaviour freeze. Never edit them. If
   `node tests/golden.mjs` fails after your change, your change altered game behaviour: undo it.
5. Use your editor / Write tool to create files. Shell writes outside the project dir fail.
6. Within 10 minutes of starting, write a draft REPORT.md in your lane folder
   (fleet-r1-foundation/<lane>/) and keep updating it. Its mtime is your heartbeat.
7. When finished, your lane folder must contain:
   - REPORT.md: what you did, how to check it, what is unverified.
   - result.json:
     {"state":"done","taskId":"<your CNVS task id from the prompt>",
      "model":{"requested":"<id from prompt>","effective":"<id you actually ran as>","source":"spawn flag"},
      "files":[...],"verify":{"cmd":"<your verify command>","exit":0},"unverified":[...]}
8. Writing style in reports and code comments: plain words, short sentences, no em dashes.
9. Never launch a browser (no `open`, no Playwright). The unit tests and the simulator run headless.

## Amendment 2026-09-07 (applies to r2 and later)
Rule 9 is relaxed: Luc approved headless Playwright for this project. Screenshots and smoke tests via
Playwright are allowed. The system browser (`open`) stays forbidden.
