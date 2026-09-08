# Fleet round r6: AAA art (icons, towers, enemies, board)

Date: 2026-09-08. Orchestrator: Fable 5.1 (CNVS). Build round: rubric gate applies.
Follows the codex session and the layout fix (commit ad32fda). Luc: "we need to fix the assets,
shit is disgusting. I need AAA icons, AAA towers and AAA boards." Pipeline chosen by Luc: painted
2D sprite set via gpt-image-2, Kingdom Rush painterly direction.

## Lanes
| Lane | CLI | Model / effort | Owns | Job |
|---|---|---|---|---|
| icons | codex | gpt-6-astra, xhigh | fleet-r6-art/icons/ | 13 icons: 7 towers, 4 materials, coin, life |
| towers | codex | gpt-6-astra, xhigh | fleet-r6-art/towers/ | 21 tower sprites: 7 towers x 3 levels |
| enemies | codex | gpt-6-astra, xhigh | fleet-r6-art/enemies/ | 8 enemy sprites |
| board | codex | gpt-6-astra, xhigh | fleet-r6-art/board/ | tiles, path, outer ground, apron, gates, props |
| integrate | claude | claude-opus-5, medium | src/world.js, src/main.js, src/look.js, src/style.css, public/art/, tests (not golden), fleet-r6-art/integrate/ | wire the art into the game, all gates green |
| scorer | claude | fable-5, fresh node | fleet-r6-art/scorer/ | grade vs RUBRIC.md |

Routing: art lanes are script-driven generation loops with look-and-reject cycles, which is codex's
tight-loop strength (fleet table: focused coding and shell-heavy loops). Integration needs deep
repo context across four source files and the Three.js scene, so claude opus. UI contest (kimi vs
claude) does not apply: the look is fixed by generated assets, not by CSS taste.

## Gate (mutant-tested, see GATE-TESTED.txt)
`node fleet-r6-art/check-assets.mjs <lane>` per art lane. Integration gate: the existing suite
(`npm test`, golden, balance, layout-gate, browser.mjs, mobile-layout.mjs) plus
`node fleet-r6-art/check-integrated.mjs` written by the orchestrator before that lane spawns.
