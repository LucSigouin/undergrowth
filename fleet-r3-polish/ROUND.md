# Fleet round r3: polish (make it prettier)

Date: 2026-09-07. Orchestrator: Fable 5.1 (CNVS, canvas "personal"). Build round: rubric gate applies.
Follows r2 (PASS 9.0, commit bf29deb). Runs in parallel with r4 (ship), which owns disjoint files.

## The ask
Luc's fourth workstream: a visual and UX polish pass on the 3D scene and the UI, with zero change
to game rules. Two lanes build the same brief on their own full copy of the project; a fresh
scorer picks the winner; the orchestrator copies the winning src/ back into the main tree.

## Lanes (UI contest: kimi + claude only, per the playbook)
| Lane | CLI | Model / effort | Dir | Dev server |
|---|---|---|---|---|
| a | kimi | kimi-code/k3 (config default), highest effort | fleet-r3-polish/a/ (full copy) | http://localhost:5181 |
| b | claude | claude-opus-5, medium | fleet-r3-polish/b/ (full copy) | http://localhost:5182 |
| scorer | claude | fable-5, fresh node | fleet-r3-polish/scorer/ | reads both |

Lanes are scored blind: no CLI or model names inside the site or file names.

## Gate (mutant-tested, see GATE-TESTED.txt)
Inside each lane copy: `npm test`, `node tests/golden.mjs` (engine behaviour frozen; a one-point
damage change turns it red), `node tests/balance-gate.mjs`, prettier and line-length checks, and
the Playwright smoke test `GARDEN_URL=http://localhost:<port> node tests/browser.mjs` against the
lane's own dev server. Screenshots in `<lane>/shots/`.

## Inputs
- fleet-r2-design/scorer/SCORE.md "For the next round" items 2 to 5 (returning-player help line,
  icon lookalikes, Lantern boost indicator, Sunburst armed state and cancel).
- Luc's layout rule: pages fill the window, no centred column in empty background. Already true
  for the game shell; keep it true.
