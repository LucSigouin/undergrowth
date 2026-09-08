# Owner decisions

Selling refunds 100% of coins spent on the engine, including all coin upgrade costs.


Material cards now use a large clickable resource icon, the coin price underneath, and a
small amount-per-stage badge. No visible material names or levels; names remain in accessible
labels and hover hints. The same card buys, unlocks, or upgrades the relevant works building.


Latest header: Undergrowth at top left; stage and lives precede gold and materials;
Settings is last on the right. On narrow phones this wraps into two rows. The bottom bar
has three buttons: Start, Pause/Resume, and Speed (1× → 2× → 3× → 1×). No Space pause
shortcut. Settings and tab visibility still suspend gameplay automatically. This supersedes
the earlier no-name header and removal of pause/speed decisions.


Progression is presented as 30 stages, one encounter per stage. Remove the separate wave
counter and creature counts. Buttons, works output, help, and victory copy use “stage.”
The engine/save/simulator retain their legacy 10 groups of 3 encounters to preserve balance
and existing saves. Convert legacy group/wave to player stage as groupIndex × 3 + waveNumber.
Workbench outcome tables use player stages; raw simulator group records remain legacy data.
Payout timing, enemy order, and every-third-encounter bonuses are unchanged.


Current layout: the board runs vertically, the camp gate at the top and the keep gate at the
bottom, on every screen. Desktop works cards form a two-column grid at the bottom of the side
pane, below the war engines and above the wave button. The side pane never scrolls; short windows shrink the cards.
No works or Undergrowth headings. Gold and materials share a top-right
header. War engines use large-icon grid cards without visible keyboard shortcuts. Material
output appears on the same row as each works name, aligned right, with no level label.
On phones the header material buttons open works controls; the duplicate resource strip is gone.


## 2026-09-08: Fixed harvests after waves

The works produce only after a completed wave. Snapshot their levels at wave start; upgrades
and purchases during combat apply next wave. No income while waiting or from extending
fights. Base output per level: Wood 3, Rock 3, Iron 2, Diamond 1. Keep output as
material icons and counts with a short /wave label. Retain works prices and upgrade costs.
Save version 5 retains existing resources and snapshots live-wave payouts. Older live saves
use saved works levels for the transition payout. Update balance evidence using these rules.

## 2026-09-08: Minimize visible text and consolidate settings

Use resource icons and quantities for costs. Missing resources show owned/required counts;
resource names remain in accessible labels and hover hints. Keep detailed explanations on demand.
Remove wave previews and sound/music controls. Put route visibility, restart, help, and save
status in one Settings menu on desktop and phones. Autosave continues quietly.

## 2026-09-08: Remove player abilities and keep the game simple

The owner requested removal of Rootgrip and Sunburst for now. The current game has no
player abilities, ability shortcuts, cooldowns, or root effect. Keep the seven war engines,
maze building, upgrades, and the works. Automatic engine effects remain.

All scaling and balance work must assume no player abilities. Use the current seven-strategy
simulator and its kit-maze winning reference; do not use the retired kit-abilities or
naive-abilities results. Do not reintroduce player abilities without a new owner request.

Read workbench/CURRENT-RULES.md and rerun node tests/balance-gate.mjs before accepting
scaling changes. Run npm run log to refresh both workbench pages and workbench/balance.json.
Historical round reports and ledger notes describing abilities are superseded by this decision.
