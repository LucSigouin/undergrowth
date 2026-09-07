# Fleet round r4: ship (repo, Cloudflare Pages, mission log)

Date: 2026-09-07. Orchestrator: Fable 5.1 (CNVS, canvas "personal"). Build round: rubric gate applies.
Follows r2 (PASS 9.0, commit bf29deb). Runs in parallel with r3 (polish), which works in copies.

## The ask
Luc's third workstream: make v2 deployable to Cloudflare Pages with a playable URL, and give the
project the mission log Luc asked for (per round: what changed, before/after screenshots, balance
numbers). Nothing is deployed this round; deploying needs Luc's go.

## Lanes
| Lane | CLI | Model / effort | Owns | Job |
|---|---|---|---|---|
| ship | claude | claude-opus-5, medium | wrangler.toml, deploy/, tools/shoot.mjs, tools/build-log.mjs, tools/check-ship.mjs (read only), workbench/log.html, workbench/shots/, README.md deploy section, .gitignore, fleet-r4-ship/ship/ | Pages config, build, deploy script, screenshot tool, mission log |
| scorer | claude | fable-5, fresh node | fleet-r4-ship/scorer/ | Grade vs RUBRIC.md |

Codex still routed around (gpt-6-astra capped). src/ is NOT in this lane's scope (r3 owns the look).

## Gate (mutant-tested, see GATE-TESTED.txt)
`node tools/check-ship.mjs` is a read-only predicate: wrangler.toml declares a Pages project with
`pages_build_output_dir = "dist"`, dist/index.html exists and every asset it references exists in
dist/, deploy/deploy.sh exists and is not run by anything, workbench/log.html exists with one
section per round and at least one image per section, and the images exist on disk. Red now
(nothing exists), green when the lane is done.
