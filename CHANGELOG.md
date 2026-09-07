# Changelog

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
