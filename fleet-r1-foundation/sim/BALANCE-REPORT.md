# Undergrowth v2 balance report

Every number here comes out of `tools/balance-sim.mjs`. The simulator drives the real `Game`
class from `src/game.js` at 1/30 s with no renderer. Nothing in `src/` was edited.

Reproduce the whole report with three commands:

```sh
cd /Users/ls/Claude-Workspace/personal/undergrowth-v2
node tools/balance-sim.mjs              # the per stage tables in section 2
node tools/balance-sim.mjs --numbers    # the arithmetic in section 3
node tools/balance-sim.mjs --experiments # the proposals in section 4
```

`node tools/balance-sim.mjs --json` prints the same data as machine readable JSON. The base run
takes about 0.9 s. The run with experiments takes about 8 s.

## 1. The headline

The game has no middle. It is decided by one purchase that the player is never told about.

- A player who never buys a garden plot **cannot upgrade a single tower**, because every upgrade
  bill includes wood. They hit a wall at stage 6 with 1535 coins they are unable to spend.
- A player who buys the whole garden finishes the campaign **without losing a single life**.
- Between those two, the difficulty curve is flat and then vertical. The maze run takes zero
  damage for nine stages, then loses 4 lives in one wave.

## 2. Where each strategy dies

Six policies, each a function that spends coins between waves. Full tables from
`node tools/balance-sim.mjs`.

| strategy   | what it does                                                    | result                   |
| ---------- | --------------------------------------------------------------- | ------------------------ |
| naive      | 10 Thorns beside the straight route, no farm                     | lost stage 6 wave 2      |
| maze       | serpentine hedges, Thorn/Sap/Sunstone, wood and rock plots       | won, 16 of 20 lives left |
| maze-deep  | the same plus the iron and diamond plots from stage 5            | won, 20 of 20 lives left |
| farm-first | full garden before any tower, exactly as briefed                 | lost stage 1 wave 2      |
| farm-lite  | 2 Thorns, then wood and rock, then the maze                      | won, 3 of 20 lives left  |
| reach-maze | the maze plan with the reach upgrade branch instead of power     | won, 6 of 20 lives left  |

Two of these are degenerate on purpose and they tell you something.

`farm-first` loses 9 lives in the very first wave and the remaining 11 in the second, with zero
towers on the board and 8 coins left. Twenty lives is not enough slack to skip defence for even
one wave. The garden has no way to pay for itself in coins, so a pure economy opening cannot
exist in this game.

`naive` is the interesting one. Its stage table:

```
stage  livesLost  livesEnd  coinsEnd  towers  levels        farms  route
    1          0        20       116       9  111111111     0000      13
    4          0        20      1050      10  1111111111    0000      13
    5          8        13      1429      10  1111111111    0000      13
    6         13         0      1535      10  1111111111    0000      13
```

Ten towers, all still level 1 after six stages, and 1535 unspent coins. It is not poor. It is
locked out.

## 3. The numbers that cause it

### 3.1 The material gate is absolute

`upgradeCost` in `src/game.js` bills `wood: 5 * level` for every upgrade of every tower. Wood
only comes from a garden plot. A player with no plot therefore has a hard damage ceiling of
level 1 for the entire campaign, no matter how much money they have. This is the single biggest
number in the game and it is invisible in the interface until you try.

### 3.2 The ceiling versus the curve

From `--numbers`, tower damage per second measured through the engine's own `stats` method:

```
tower   L1      L2 power  L3 power  L3 reach
thorn  15.4    43.7      69.2      47.7
prism  23.5    66.7      105.5     72.8
```

Ten level 1 Thorns are 154 damage per second, and that is naive's permanent ceiling. Ten level 3
power Thorns would be 692, a 4.5 times jump that is gated entirely behind a 25 coin wood plot.

Against that, wave pressure from `--numbers`. `effHP` counts armored enemies at the real cost of
killing them with a Thorn, since armor absorbs 45% of every non Sunstone hit (measured 0.55).

```
stage wave enemies  rawHP   effHP   spawnGap  window  effHP/s
    1    1       9    216     216     0.967    8.7s       25
    5    1      17   1995    2528     0.800   13.6s      186
    6    1      19   3307    4324     0.733   13.9s      310
   10    3      31  39950   45312     0.567   17.6s     2579
```

The crossover is exact. Naive's 154 damage per second sits between stage 5 wave 1 (186 effective
HP per second) and stage 6 wave 1 (310). The simulator loses its first life in stage 5 and dies
in stage 6. Better still, take the whole wave: stage 6 wave 1 needs 4324 effective damage and
naive's wave lasted 27.3 seconds, so it could deliver at most 154 x 27.3 = 4204. It was 3% short
and it leaked 9 lives.

The growth base is 1.43 per stage. That means stage 10 enemies have 25 times the hit points of
stage 1 enemies, while a fully upgraded tower has 4.5 times its starting damage. Towers cannot
win that race on damage. They only win it on time.

### 3.3 Route length is the real multiplier

Route length is printed in the last column of every stage table. Naive's route is 13 cells for
the whole run. The maze reaches 53 cells by stage 3.

That is why the maze survives numbers that look impossible. The maze board is 6 Thorns at level
3, 2 Sap wells at level 3 and 2 Sunstones stuck at level 2, which is 579 damage per second
against 2579 effective HP per second of incoming pressure at stage 10 wave 3. It still wins,
because the wave takes 109.8 seconds to walk the maze rather than arriving in a 17.6 second
window. The damage budget is 579 x 109.8 = 63,500 against 45,312 needed.

The maze is not a nice option. It is a 4 times damage multiplier and the game is unwinnable
without it. Nothing in the game says so.

### 3.4 The Sunstone is stranded

`upgradeCost` asks for 3 iron and 1 diamond on the level 2 to 3 step of a Sunstone. Iron costs 160
to unlock plus 70 to buy. Diamond costs 300 to unlock plus 100 to buy. So 630 coins of garden
must exist before the anti armor tower can finish growing, on top of the 125 for the rock plot.

In the `maze` run both Sunstones end the campaign at level 2 while every Thorn is level 3. The
tower the game tells you to use against armor and bosses is the one you are least likely to
finish. `maze-deep` buys the last two plots and every tower reaches level 3, which is exactly the
difference between winning with 16 lives and winning with 20.

The diamond plot is the worst purchase in the game on its face: 400 coins for a plot that
produces 1 diamond per 10 seconds, when the entire campaign consumes 2 diamonds.

### 3.5 Coins stop mattering around stage 6

Total coin income over a full 30 wave run is 200 starting coins, 1980 in wave and stage bonuses,
and 4 per kill. The `maze` run took 598 kills, so it earned about 4674 coins and ended holding
2769 of them. Nearly 60% of all money earned was never spendable.

The simulator makes this concrete. Three separate economy buffs change nothing at all:

- `kill-coins-7` (4 coins per kill becomes 7): identical outcome for every strategy.
- `cheap-garden` (plot unlocks 80/160/300 become 60/110/180): identical outcome.
- `idle-20s` (20 seconds of free garden production between waves): identical outcome.

Coins are not the constraint after the early game. Materials and the level 3 cap are.

### 3.6 Farm payback

A farm never returns coins, so payback has to be measured in what it unlocks.

- Wood plot: 25 coins, 3 wood per 10 seconds at level 1. The `maze` build needs about 130 wood in
  total for its upgrades. A single level 1 wood plot produces that in 433 seconds of wave time,
  and the full run contains 906 seconds of wave time. One cheap plot covers the entire campaign.
- The `maze` run ends holding 620 spare wood and 430 spare rock. Wood and rock are heavily over
  supplied once you own them, and worth infinity before you do. That is a bad shape for a curve.

### 3.7 The difficulty is a cliff

Every winning strategy takes zero damage from stage 1 to stage 9, then meets the finale. The
`maze` run loses all 4 of its lives in stage 10 wave 3. `farm-lite` loses 4 in wave 2 and 13 in
wave 3 of the same stage. Stage 10 wave 3 also takes 109.8 seconds of real time, most of it a
14,178 HP boss walking a 53 cell maze while towers chip at it. That is a long, quiet wave.

## 4. Proposed constant changes, with simulated effect

Each row is one change, applied as a parameter, run against all six strategies. Cells read
"outcome, total lives lost". `S6W2` means it lost during stage 6, wave 2. Straight from
`node tools/balance-sim.mjs --experiments`.

```
experiment          naive         maze          maze-deep     farm-first    farm-lite     reach-maze
baseline            S6W2 -21      won -4        won -0        S1W2 -20      won -17       won -16
hp-base-1.34        S6W3 -21      won -0        won -0        S1W2 -20      won -0        won -0
hp-base-1.28        S7W2 -20      won -0        won -0        S1W2 -20      won -0        won -0
upgrade-step-1.1    S6W2 -21      won -0        won -0        S1W2 -20      won -1        won -2
power-branch-1.9    S6W2 -21      won -0        won -0        S1W2 -20      won -1        won -16
kill-coins-7        S6W2 -21      won -4        won -0        S1W2 -20      won -17       won -16
free-upgrade-mats   S9W3 -20      won -0        won -0        S1W2 -20      won -3        won -3
thorn-damage-13     S6W3 -21      won -0        won -0        S1W2 -20      won -3        won -4
no-rare-mats        S6W2 -21      won -0        won -0        S1W2 -20      won -3        won -5
first-upgrade-free  S8W3 -21      won -4        won -0        S1W2 -20      won -17       won -16
cheap-garden        S6W2 -21      won -4        won -0        S1W2 -20      won -17       won -16
idle-20s            S6W2 -21      won -4        won -0        S1W2 -20      won -17       won -16
recommended         S8W2 -21      won -10       won -1        S1W2 -20      S10W3 -21     S10W3 -21
```

### Change 1. Make the level 1 to 2 upgrade cost coins only

In `upgradeCost`, return zero materials when `t.level === 1`. Level 2 to 3 keeps its wood and
rock, so the garden still matters for the end game.

Simulated: naive goes from losing at stage 6 wave 2 to losing at stage 8 wave 3. Nothing else in
the table moves. This is the largest single improvement available for a player who has not
understood the garden yet, and it costs the skilled player nothing.

### Change 2. Drop iron and diamond from the level 2 to 3 upgrade

In `upgradeCost`, remove the `iron` and `diamond` lines, or move them to a level 3 to 4 step if
one is ever added.

Simulated (`no-rare-mats`): `maze` goes from 4 lives lost to 0, `farm-lite` from 17 to 3,
`reach-maze` from 16 to 5. The Sunstones finish growing. The cost of this change is that the iron
and diamond plots lose their only mechanical purpose, so pair it with a use for them or with
change 3 instead.

### Change 3. Cut the plot unlock prices to 60 / 110 / 180

`MATERIALS[1..3].unlock` from 80 / 160 / 300.

Simulated on its own: no change at all, because coins are not the constraint (section 3.5). It
only earns its place inside the recommended package, where it makes the full garden reachable
before stage 8 so `maze-deep` can stay ahead of a steeper curve. Do not ship this one alone and
expect it to do anything.

### Change 4. Raise the enemy growth base from 1.43 to 1.46

`Math.pow(1.43, s)` in `Game.enemy`.

Simulated alone this makes an already flat game slightly less flat, and it is far too blunt on
its own. Lowering it instead, which is the obvious instinct, is a trap: `hp-base-1.34` and
`hp-base-1.28` both drop every winning strategy to zero lives lost and still only buy naive one
extra wave. Making enemies weaker does not fix a game whose problem is a locked upgrade path.

### Change 5. The recommended package

Change 1 plus change 3 plus change 4 together (`recommended` row above):

| strategy   | baseline            | recommended         |
| ---------- | ------------------- | ------------------- |
| naive      | lost stage 6 wave 2 | lost stage 8 wave 2 |
| maze       | won, 4 lives lost   | won, 10 lives lost  |
| maze-deep  | won, 0 lives lost   | won, 1 life lost    |
| farm-lite  | won, 17 lives lost  | lost stage 10 wave 3|
| reach-maze | won, 6 lives lost   | lost stage 10 wave 3|

That is a real curve. The player who ignores the garden still loses, but at stage 8 rather than
stage 6, after seeing most of the game. The player who mazes and farms wins with a real fight,
10 of 20 lives gone. The player who also buys the full garden is rewarded with a near perfect
run instead of a guaranteed one. The reach branch now costs you the campaign, which makes the
branch choice mean something.

### Change 6. Not a constant, but the biggest one

Nothing in the game tells the player that upgrades need wood, and nothing tells them the maze is
mandatory. Two lines of interface text would move more players than any number in this report.
The upgrade button should show the wood cost greyed out with the reason, and the first stage
should say that a longer route means more shots.

## 5. What this report does not cover

- The simulator plays no idle time between waves by default, so garden output is only counted
  during combat. A real player takes longer between waves. The `idle-20s` experiment adds 20
  seconds per wave and changes no outcome, so this assumption is not load bearing.
- The six policies are fixed plans, not adaptive play. A human who reacts to a leak will do
  better than `maze` and worse than `maze-deep`. Treat the results as a band, not a score.
- Tower placement is one hand picked maze layout. A different layout would shift route length and
  therefore every late stage number.
- Bloom is never bought by any strategy, so this report says nothing about splash damage. That is
  a gap worth filling in a later round.
- These are simulated outcomes, not playtested ones. No human has played these builds.
