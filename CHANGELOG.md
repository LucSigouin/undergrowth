# Changelog

## Medieval castle siege, 2026-09-08

- The theme is a siege now. The seven war engines are the Ballista, Tar pit, Catapult, Mage
  spire, Palisade, Brazier and War banner. The horde is Goblins, Wolf riders, Iron knights,
  Gargoyles, War wagons, Whelps, Paladins and a Warlord. Wood, Rock, Iron and Diamond keep
  their names; the four buildings that produce them are the works: sawmill, quarry, forge and
  gem cutter.
- Every player-facing sentence was rewritten: engine descriptions, effects and tips, the ten
  stage titles, the help dialog, the settings, the toasts, the victory and defeat copy, every
  aria label and the page title. The words garden, meadow, pollen, settlement and expedition
  are gone; the keep, the bailey and the siege took their place.
- The interface palette moved from garden green to castle stone and parchment with heraldic
  crimson and gold. Type is Cinzel for the wordmark and headings and Alegreya Sans for
  everything a player reads, replacing DM Sans. Body text sits at 11.1:1 on paper and 9.6:1
  on a panel; the muted tone is 5.9:1. The four type sizes, the spacing steps and every
  layout rule are unchanged.
- Interface class and id names that carried the old word were renamed (`.garden-strip` to
  `.works-strip`, `#garden-modal` to `#works-modal`, `data-hud-garden` to `data-hud-works`
  and their siblings). `window.__garden` and the save keys are untouched, so old saves load.
- `src/game.js` changed only inside its string literals. `tests/golden.mjs` and
  `tests/golden.json` are untouched. Rules, numbers and the save format did not move.

## Painted art on the whole board, 2026-09-08

- Every procedural shape and unicode glyph is gone. Towers, creatures, meadow tiles, the trodden
  path, the outer ground, the wooden apron, both gates, the edge scenery and all 13 interface
  icons are hand-painted sprites from `public/art/`, wired in through `src/look.js`.
- Sprites are flat planes turned so their painted top points at screen up. Creatures swing to
  face where they are walking and a Thorn's whole sprite swings with its head. Shadow blots,
  health bars, range rings, the placement ghost, boost halos and every effect still work.
- Shadow mapping and tone mapping are off, because unlit painted planes need neither. Frame
  timing at 1440x900 with 12 towers and 20 creatures is a locked 60 fps on a real GPU.
- Level pips are gone: the tower painting shows its level. Chips carry the painted icon on a
  pale wash of the piece's accent colour instead of a symbol.
- `src/game.js`, `tests/golden.mjs` and `tests/golden.json` are untouched. Rules did not move.

## Layout gate green again, 2026-09-08

- Short desktop windows (1366x768, 1280x720) no longer scroll the build column. Card rows share
  the height evenly and farm cards and icons shrink under 800px of height.
- `tests/layout-gate.mjs` now expects the materials in the top header, where the 2026-09-08
  decision put them, instead of on the map.
- README, DECISIONS and CURRENT-RULES no longer describe a scrolling side pane. The README
  intro says 30 stages, matching the interface.
- Added the MIT licence for the public GitHub repository.

## Tower placement previews, 2026-09-08

- Show translucent versions of all seven towers while aiming placement.
- Invalid squares turn the preview red; built towers retain their original materials.
- Phone placement previews remain until confirm/cancel. Right-click, Escape, and leaving the board clear mouse previews.

## Readable defense hover boxes, 2026-09-08

- Removed repeated names, icons, level labels, and costs from defense hover boxes.
- Added visible stat labels, larger values, and 14px effect/tip text.
- Positioned hover boxes beside the side pane so they do not cover neighboring defense cards.

## Icon farm cards, 2026-09-08

- Removed visible material names from farm cards. Large material icons now buy, unlock, or upgrade farms.
- Coin prices appear below the icons; small badges show production per stage.
- Retained resource names in accessible labels and hover hints.

## Consolidated top bar, 2026-09-08

- Restored Undergrowth at the top left and moved stage/lives before the resource totals.
- Moved Settings after the materials at the far right. Narrow phones use two header rows.
- Grouped Start, Pause/Resume, and Speed (1×, 2×, 3×) in the bottom bar. Removed the Space pause shortcut. Settings still suspends gameplay.

## Thirty-stage progression, 2026-09-08

- Each encounter is now presented as a stage, numbered 1–30.
- Removed separate wave and creature counters; controls, harvest labels, help, and victory text use stages.
- Preserved encounter order, rewards, difficulty, and existing saves. Workbench outcomes use the new numbering.

## Vertical map and sidebar farms, 2026-09-08

- Rotated the map on every screen: entry at the top, exit at the bottom.
- Moved desktop farms into a two-column grid at the bottom of the side pane.
- Kept resource totals in the header and phone farm controls in their sheet.
- Short desktop windows shrink the cards so nothing scrolls (fixed 2026-09-08, see below).

## Resource header and defense grid, 2026-09-08

- Removed Garden and Undergrowth headings; combined gold and material totals at the top right.
- Defense cards form a grid with larger icons, names, and coin costs; shortcut labels removed.
- Farm harvests sit beside names, aligned right. Removed visible material levels.
- Phones use header material buttons to open farm controls and a larger defense grid.

## Wave harvests, 2026-09-08

- Replaced timed farm production with one harvest per completed wave: 3 Wood, 3 Rock,
  2 Iron, or 1 Diamond per farm level. Farm levels at wave start determine the payout.
- Midwave purchases and upgrades take effect next wave. Waiting and longer fights provide
  no extra materials; failed waves pay nothing. Removed production timer bars.
- Save version 5 preserves resources and pending harvests. Older live waves use saved
  farm levels for their first harvest, and obsolete production progress is discarded.
- Existing difficulty targets pass without changing enemies, farm prices, or upgrade costs.

## Compact interface, 2026-09-08

- Resource costs use the HUD icons. Shortages display owned/required counts and retain
  resource names in accessible labels and hover hints.
- Removed wave previews, the visible autosave footer, and sound controls and playback.
- One Settings menu holds route visibility, restart, help, and autosave status on all layouts.
  Route visibility persists across reloads. Restart still requires confirmation.
- Reduced garden instructions, upgrade prose, and success notifications. Detailed tower
  explanations are behind the info button; upgrade stats and costs stay visible.
- The phone tray and wave footer are smaller, giving more room to the board.
- Gameplay, economy, save data, and difficulty rules are unchanged.

## Simpler game, 2026-09-08

Rootgrip and Sunburst are removed at the owner's request. Their buttons, Q/E handlers,
aiming ring/banner, effects, cooldowns, and combat logic are gone. Automatic tower effects
such as Sap slow and Ember burn remain. Save version 4 keeps older settlements and live
waves while discarding the retired ability fields.

The simulator no longer includes kit-abilities or naive-abilities. Its seven remaining
strategies use towers and the garden only; kit-maze remains the winning reference,
with 7 lives lost across three stages. Enemy scaling and wave composition did not need
another adjustment. The original balance gate remains in force.

workbench/CURRENT-RULES.md records the owner's instruction for future scaling work.
The log builder now publishes those rules and fresh simulation results at the top of both
workbench pages, plus workbench/balance.json. Historical round records are explicitly
labelled as history. Current screenshots show the game without ability controls.

## Review fixes, 2026-09-08

- Enemies killed by burning or Sunburst stop before movement, so a kill at the gate earns
  its reward instead of costing a life. Existing brood splitting and end-of-wave handling remain.
- Towers target by remaining walking distance, including an unfinished movement segment.
  Flyers use their direct distance. A reverse distance field is shared by targeting decisions
  within each tick and rebuilt when needed, so a changed maze takes effect immediately.
- Lantern now has one upgrade path, increasing its speed boost and coverage together.
  Old upgraded Power Lanterns receive Reach coverage on load without another charge.
- Upgrade buttons show before/after damage or support boost and range. Missing-material
  quantities refresh as resources arrive; the detail cache also tracks Lantern support changes.
- Wave previews show the actual creature roster and the stage's tactical advice. Phones
  offer a selected-tower description and a Tower info button before purchase. Both reading
  dialogs pause combat and preserve the previous pause state when dismissed.
- Phone notifications sit over the header, away from combat. The fitted camera reserves
  space for the controls above and below the meadow, including at small phone heights.
- Stage 9 wave 2 sends 12 moths instead of 10. With corrected targeting and Lantern coverage,
  this retains the existing difficulty gate without increasing enemy HP or weakening tests.
  The two kit strategies win with 7 and 6 total lives lost across stages 8, 9, and 10.
- Added regression coverage for exit kills, maze/flying/partial-segment targeting, Lantern
  save normalization, live resource shortfalls, upgrade previews, and phone information controls.
  The golden replay was refreshed for the intentional targeting change; its coin, life, kill,
  stage, and wave checkpoints are unchanged, while the last two wave timings differ.

Waiting between waves was evaluated with 0, 20, and 60 seconds of idle time on the corrected
combat rules before the two-moth adjustment. No strategy's win/loss outcome changed; one
losing abilities strategy reached stage 8 instead of stage 7. Resource production stays as
it was. These scripted runs do not replace testing with new players.

## r2, 2026-09-07: a real curve, hand written waves, and the r2 kit

Round r2 acts on `fleet-r1-foundation/sim/BALANCE-REPORT.md`. The r1 game had a hidden gate
(every upgrade needed wood, so a player without a garden was frozen at level 1) and a flat
difficulty that turned vertical in stage 10. `node tests/balance-gate.mjs` is green on this tree.

Every number below is old value first, then new value.

### Balance

| Rule                                       | r1                                        | r2                                       |
| ------------------------------------------ | ----------------------------------------- | ---------------------------------------- |
| Enemy hit point growth per stage           | 1.43                                      | 1.46                                     |
| Level 1 to 2 upgrade materials             | 5 wood per level                          | none, coins only                         |
| Level 2 to 3 upgrade materials             | 10 wood, 4 rock, iron and diamond by type | unchanged, plus 3 iron for Ember         |
| Upgrade damage step per level              | 0.75                                      | 1.0                                      |
| Power branch damage bonus                  | 1.45                                      | 1.55                                     |
| Rock plot unlock                           | 80 coins                                  | 60 coins                                 |
| Iron plot unlock                           | 160 coins                                 | 110 coins                                |
| Diamond plot unlock                        | 300 coins                                 | 180 coins                                |
| Moth hit points at stage 1                 | 25                                        | 30                                       |
| Moth coins per kill                        | 4                                         | 5                                        |
| Guardian (boss) hit points at stage 1      | 450                                       | 400                                      |
| Coins per kill                             | flat 4, or 55 for a boss                  | per creature, see the enemy table below  |
| Armor absorption of a non Sunstone hit     | 0.55, written inline                      | 0.55, now the named `ARMOR_RESIST`       |
| Save file version                          | 2                                         | 3                                        |

The level 1 to 2 change is the report's change 1 and it is the largest single fix. In the
simulator's `r1-upgrade-mats` experiment, putting the r1 wood bill back drops the `naive`
strategy from losing at stage 7 to losing at stage 5.

### Waves

The spawn formula is gone. It was:

```
count = 7 + stage * 2 + wave * 2
kind  = grub, then runner at i % 4 === 2, armor at i % 5 === 3, moth at i % 6 === 4,
        more moths at i % 3 === 1 from stage 8, boss on the last slot of stages 6 and 10
gap   = max(0.35, 0.95 - stage * 0.045) for every wave in the game
```

It is replaced by `WAVES` in `src/game.js`: 30 hand written entries, three per stage, each one a
list of creatures in the order they walk out plus its own `gap` in seconds and an optional
`burst` count for waves that release in pairs. Gaps now range from 1.05 s in stage 1 wave 1 to
0.55 s in the late waves, and bursts of 2 start in stage 5. Wave sizes run from 6 creatures in
stage 1 wave 1 to 18 in stage 10 wave 3, which is fewer bodies than r1's 31 but far more hit
points each.

Guardians now appear only where the stage text says so: stage 6 wave 3, stage 9 wave 3, and two
of them in stage 10 wave 3. In r1 they appeared in stages 6 and 10 only, and the stage 9 text
promised nothing.

Stage text changed to match what actually spawns:

- Stage 1 now reads "A few curious visitors. A longer route means more shots." It used to read
  "Give them the scenic route", which never said why.
- Stage 5 now reads "Brood sacs burst into grubs. Bloom answers a crowd."
- Stage 7 now reads "Wardens ignore sap and shield their neighbours. Ember burns through."
- Stage 9 now says a guardian arrives at the end, because one does.
- Stage 10 now says two guardians walk with the horde, because two do.

### Two new enemies

| Creature      | HP at stage 1 | Speed | Coins | Rule                                                       |
| ------------- | ------------- | ----- | ----- | ---------------------------------------------------------- |
| Brood sac     | 88            | 0.70  | 7     | Bursts into 3 grublings where it dies                      |
| Grubling      | 9             | 1.35  | 1     | What a brood sac leaves behind                             |
| Warden        | 104           | 0.82  | 8     | Immune to Sap slow, and takes 35% off every hit landed on any enemy within 2.1 squares of it |

The counters: Bloom splashes 1.35 squares, so one burst clears a whole litter where a Thorn
kills one grubling. Ember burning is applied outside the hit loop, so it ignores both beetle
armor and a warden's shield.

### Two new towers

| Tower   | Key | Cost | Damage | Range | Rate  | Rule                                                        |
| ------- | --- | ---- | ------ | ----- | ----- | ----------------------------------------------------------- |
| Ember   | 6   | 80   | 9      | 2.9   | 1.20s | Each hit sets 5 seconds of burning at 1.4 times its damage per second, ignoring armor and shields |
| Lantern | 7   | 90   | 0      | 2.5   | n/a   | Never shoots. Every attacking tower inside its ring fires faster: +30% at level 1, +40% at level 2, +50% at level 3, capped at +90% from all Lanterns together |

Keys 1 to 5 are unchanged, so Thorn, Sap well, Bloom, Sunstone and Hedge keep their positions.
The keyboard handler no longer hard codes the string `'12345'`; it reads the length of `TOWERS`.

### Two abilities

| Ability  | Key | Cooldown | Effect                                                                    |
| -------- | --- | -------- | ------------------------------------------------------------------------- |
| Rootgrip | Q   | 45 s     | Every walking enemy is held still for 3 s. Flying enemies are unaffected. |
| Sunburst | E   | 38 s     | Arms, then the next click on the board deals 70 damage at stage 1, growing 24% per stage, to everything within 3 squares. It ignores armor but not a warden's shield. |

Both are new in r2, both have buttons over the top right of the board sized 44 px for a phone,
both show the seconds left while they recharge, both refuse politely while cooling, and both
cooldowns are part of the save file, so they survive a reload.

### The player is told

- An upgrade the player cannot afford now names the missing material, the amount short, and
  where it comes from ("Materials only come from garden plots"), and the upgrade buttons are
  disabled rather than silently failing. In r1 the only feedback was a toast after the click.
- Stage 1 says "A longer route means more shots" in the stage text, in the first wave toast, and
  in the help dialog.
- The detail panel of a boosted tower says which percentage a Lantern is adding.
- The help dialog and README describe the new towers, the new creatures and both abilities.

### Save migration

Version 3. A version 2 save loads with every tower, farm, stage, wave, coin and material intact
and gains two ability clocks at zero. A version 1 save still migrates through the same version 2
step it always did, and then on to 3. Unit tests cover both paths.

### Tests

`tests/game.test.js` gained 11 tests: the wave table against the stage text, wave pacing and
bursts, brood splitting, Bloom versus a litter, warden slow immunity and shields, Ember burning
outside range, the Lantern rate ring and its refusal to shoot, Rootgrip hold plus refusal plus
persistence, Sunburst targeting, the coins only first upgrade with the shortfall list, and both
save migrations. `tests/sim.test.js` was updated to the r2 truths, including a check that every
winning strategy bleeds across three or more stages.

`tools/balance-sim.mjs` gained an in wave hook so a strategy can use abilities, plus three
strategies: `kit-maze` (the same maze slots built with Ember and Lantern), `kit-abilities` (the
same, plus Rootgrip and Sunburst) and `naive-abilities`. The six r1 strategies keep their tower
plans and spending rules unchanged. The experiment list was re-based on the r2 constants.
