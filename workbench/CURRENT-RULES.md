# Current game rules

Selling refunds 100% of coins spent on the tower, including all coin upgrade costs.


Material cards now use a large clickable resource icon, the coin price underneath, and a
small amount-per-stage badge. No visible material names or levels; names remain in accessible
labels and hover hints. The same card buys, unlocks, or upgrades the relevant farm.


Latest header: Undergrowth at top left; stage and lives precede gold and materials;
Settings is last on the right. On narrow phones this wraps into two rows. The bottom bar
has three buttons: Start, Pause/Resume, and Speed (1× → 2× → 3× → 1×). No Space pause
shortcut. Settings and tab visibility still suspend gameplay automatically. This supersedes
the earlier no-name header and removal of pause/speed decisions.


Progression is presented as 30 stages, one encounter per stage. Remove the separate wave
counter and creature counts. Buttons, harvest output, help, and victory copy use “stage.”
The engine/save/simulator retain their legacy 10 groups of 3 encounters to preserve balance
and existing saves. Convert legacy group/wave to player stage as groupIndex × 3 + waveNumber.
Workbench outcome tables use player stages; raw simulator group records remain legacy data.
Harvest timing, enemy order, and every-third-encounter bonuses are unchanged.


Current layout: the board runs vertically, entrance at the top and exit at the bottom,
on every screen. Desktop farm cards form a two-column grid at the bottom of the side pane,
below defenses and above the wave button. Short windows can scroll defenses independently.
No Garden heading; the game name appears only in the top bar. Gold and materials share a top-right
header. Defenses use large-icon grid cards without visible keyboard shortcuts. Material
harvests appear on the same row as each farm name, aligned right, with no level label.
On phones the header material buttons open farm controls; the duplicate resource strip is gone.


Updated 2026-09-08 at the owner's request: keep the game simple.

**Economy:** farms harvest once after a completed wave, never on a timer. Base yields per
farm level are Wood 3, Rock 3, Iron 2, Diamond 1. Levels are snapshotted at wave start;
midwave purchases/upgrades apply next wave. Losing pays nothing. Waiting between waves
or prolonging combat cannot increase the harvest. Keep these rules in every scaling run.
The idle-20s experiment must match baseline exactly. Current kit-maze wins with seven
lives lost across stages 8, 9, and 10; no enemy or upgrade-cost changes were needed.

**Interface:** minimize visible text. Costs use resource icons and numbers; shortages show
owned/required counts. No wave previews or music controls. Settings contains route visibility,
restart, help, and autosave status. Detailed tower information is available on demand.

**Rootgrip and Sunburst are removed. There are no player abilities.** Their buttons,
Q/E shortcuts, targeting mode, cooldowns, and root effect no longer exist in the game.
Do not reintroduce them or assume their damage or crowd control when tuning difficulty.

- Balance around the seven towers, maze routing, tower upgrades, and resource gardens.
- Sap slowing, Ember burning, and Lantern support are automatic tower effects and remain.
- Use **kit-maze** as the winning reference strategy. It uses towers and the garden only.
- The simulator has seven strategies. The retired kit-abilities and naive-abilities runs
  are not current evidence and must not be used for scaling decisions.
- Run **node tests/balance-gate.mjs** after changing scaling. The existing targets still
  apply: at least one win, 3 to 16 lives lost across at least three stages for each winning
  reference, and the no-garden strategy surviving to at least stage 7 before losing.
- Save version 5 preserves older settlements and live waves, discarding retired ability state
  and production timers. Old live saves use saved farm levels for their first harvest; new
  saves preserve the actual start-of-wave harvest. Existing materials are retained.
- Current measurements are regenerated into **workbench/balance.json** and both workbench
  pages by **npm run log**. Run it after balance changes or rebuilding the operations page.

Historical round reports, task notes, and screenshots can mention the old abilities.
Those are history; this current-rules note and the live simulator take precedence.
