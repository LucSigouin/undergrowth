# Fleet round r2: design (make it winnable, make it richer)

Date: 2026-09-07. Orchestrator: Fable 5.1 (CNVS, canvas "personal"). Build round: rubric gate applies.
Follows r1 (PASS 9.75, commit 4f4d19c): code reformatted, headless simulator and balance report exist.

## The ask
Two of Luc's four v2 workstreams: (1) make the game winnable with a real difficulty curve,
(2) make it richer: hand-crafted waves, new towers, new enemies, player abilities. Both touch
src/game.js, so ONE worker owns the whole design change; parallel writers would collide.

## Target
/Users/ls/Claude-Workspace/personal/undergrowth-v2/

## Evidence the worker starts from
fleet-r1-foundation/sim/BALANCE-REPORT.md. Headline: every upgrade needs wood, nobody is told, so
a no-garden player is locked out at stage 6 with 1535 unspent coins; a full-garden player wins
20/20; every winner takes zero damage until stage 10 (a cliff). Section 4 has 6 simulated changes
and a "recommended" package (naive to S8, maze wins -10, maze-deep wins -1).

## Lanes
| Lane | CLI | Model / effort | Owns | Job |
|---|---|---|---|---|
| design | claude | claude-opus-5, medium | src/*, tests/* (may re-record golden), tools/*, CHANGELOG.md, README.md, fleet-r2-design/design/ | Balance + content, gate green |
| scorer | claude | fable-5, fresh node | fleet-r2-design/scorer/ | Grade vs RUBRIC.md |

Codex still routed around (gpt-6-astra capped). Kimi is not a fit for engine work.

## Gate (mutant-tested, see GATE-TESTED.txt)
`node tests/balance-gate.mjs` runs the simulator and asserts: naive (no garden) reaches stage 7+
but does not win; farm-first still loses; at least one strategy wins; every winner loses 3 to 16
lives and loses lives in 3 or more distinct stages. Red on the r1 tree (7 failures), so r2 must
turn it green by changing the game, not the gate.

## Next
r3 polish (kimi vs claude UI contest) and r4 ship (Cloudflare Pages) run in parallel after r2 passes.
