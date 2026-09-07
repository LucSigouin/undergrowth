# Fleet round r1: foundation for Undergrowth v2

Date: 2026-09-07. Orchestrator: Fable 5.1 (CNVS, canvas "personal"). Build round: rubric gate applies.

## The ask
Luc's GPT-6 Astra sub is capped, so Claude takes over the Undergrowth tower defence. v1 stays
untouched at `personal/undergrowth/`. v2 is a verbatim clone at `personal/undergrowth-v2/`
(git, baseline commit cd2659a). Four workstreams were agreed: make it winnable, make it richer,
ship it, make it prettier. This round lays the floor the other three stand on.

## Target
/Users/ls/Claude-Workspace/personal/undergrowth-v2/

## Lanes (disjoint files, run in parallel)
| Lane | CLI | Model / effort | Owns | Job |
|---|---|---|---|---|
| format | claude | claude-opus-5, medium | src/*.js, src/style.css, tests/*.test.js, tests/*.mjs (not golden.*), package.json, .prettierrc | Reformat the 200-char-line code into readable code with zero behaviour change |
| sim | claude | claude-opus-5, medium | tools/, tests/sim.test.js, fleet-r1-foundation/sim/ | Headless balance simulator + first balance report |
| scorer | claude | fable-5, fresh node | fleet-r1-foundation/scorer/ | Grade both lanes vs RUBRIC.md |

Routing note: codex would normally take both coding lanes. Its config defaults to gpt-6-astra,
the capped sub, so it is routed around this session (playbook: usage limits).

## Gate (mutant-tested, see GATE-TESTED.txt)
`node tests/golden.mjs` replays a fixed scripted game and compares 10 state checkpoints against
tests/golden.json. A one-point change to Thorn damage makes it exit 1.

## Next rounds (planned, not started)
- r2 design: one claude opus worker tunes balance from the sim and adds hand-crafted waves, new towers, new enemies, abilities.
- r3 polish: kimi vs claude UI contest on separate copies, fresh scorer picks.
- r4 ship: Cloudflare Pages config + deploy script. Deploy itself waits for Luc.
