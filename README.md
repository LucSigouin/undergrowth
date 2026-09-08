# Undergrowth

A browser tower defense garden built with Three.js and Vite. Square defenses shape enemy routes; a horizontal garden above the battlefield produces wood, rock, iron, and diamond. The same settlement persists through 10 stages of 3 waves each.

## Play locally

```sh
npm install
npm run dev -- --port 5173
```

Open http://localhost:5173. Requires a browser with WebGL enabled.

## How to play

Choose a defense with the toolbar or keys 1 to 7, then click a meadow square. Click an existing tower to upgrade or reclaim it. Space pauses, Escape leaves build mode.

**A longer route means more shots.** This is the whole game. A hedge costs 8 coins and bends the dotted line the horde walks, and every extra square is more seconds under your towers. The straight route is 13 squares. A good maze is over 50. No amount of damage makes up for skipping this, and the first stage says so out loud.

**The garden pays for level 3.** Buy the first wood plot for 25 coins; it collects 3 wood every 10 seconds, including during combat. Coin upgrades increase output. Unlock and buy Rock, Iron, and Diamond plots in order. The level 1 to 2 upgrade of a tower costs coins only, so you are never locked out of growing at all, but level 3 needs wood and rock, and those only come from a plot. When you cannot afford an upgrade the detail panel names the material you are short of and where it comes from.

### The seven pieces

| Key | Piece    | What it does                                                                 |
| --- | -------- | ---------------------------------------------------------------------------- |
| 1   | Thorn    | Fast single shots. The cheap all rounder.                                     |
| 2   | Sap well | Slows enemies so everything else gets more shots.                             |
| 3   | Bloom    | Splash damage around the target. The answer to a crowd.                       |
| 4   | Sunstone | Long range, and full damage through beetle armor.                             |
| 5   | Hedge    | A wall. Does not attack. This is how you build the maze.                      |
| 6   | Ember    | Sets enemies alight. Burning ignores armor and warden shields.                |
| 7   | Lantern  | Never shoots. Every attacking tower in its ring fires 30 to 50 percent faster. |

### The horde

Grubs walk. Runners are fast. Beetles wear armor and only Sunstone cuts through it cleanly. Moths fly straight over the maze, so the direct line still needs cover. A brood sac bursts into three grublings when it dies, which is why Bloom bursts clear them best. A warden ignores sap entirely and shields every enemy within about two squares of it, and only Ember burning gets past that shield.

### Abilities

Two abilities are always available and cost nothing but time.

- **Rootgrip (Q)**, 45 second cooldown. Holds every walking enemy still for 3 seconds. Moths keep flying.
- **Sunburst (E)**, 38 second cooldown. Arms a burst, then you pick the square. Everything within 3 squares of it takes damage that ignores armor.

Both buttons sit over the top right of the board, work with a tap on a phone, show the seconds left while they recharge, and are saved with the game, so a cooldown survives a reload.

## Deploy

The game is a folder of static files served by Cloudflare Pages. `wrangler.toml` declares the
project name `undergrowth` and `dist` as the build output. Deploying is one command,
`./deploy/deploy.sh`, and it refuses to run if the tests fail, if the behaviour freeze fails, if
`src/` has uncommitted changes, or if the ship gate is red. Nothing in `package.json` deploys, so
no `npm` command can push to production by accident.

Read [deploy/README.md](deploy/README.md) first. It covers the one time setup, how to verify the
deploy with `curl` and `shasum`, and the custom domain, which comes later. Nothing has been
deployed yet.

## Mission log

[workbench/log.html](workbench/log.html) is the mission log: one section per round of work with
what changed, the score, before and after screenshots, and the balance table. Open the file in a
browser. Rebuild it after any change with `npm run log`, and refresh the screenshots with
`npm run shoot -- --url http://localhost:5174 --out workbench/shots/r2` against a running dev
server. `npm run check:ship` checks that the project is in a shippable state.

## Development

`npm test` checks routing, economy, combat, the wave table, the new enemies, towers and abilities, persistence, and campaign progression. `node tests/golden.mjs` replays a fixed scripted game and fails on any behaviour drift. `node tools/balance-sim.mjs` plays every scripted strategy headless and prints the per stage tables; `--experiments` compares constant changes. `node tests/balance-gate.mjs` checks the difficulty targets. `npm run build` creates a static deployable `dist/` folder. All 3D models are generated locally from geometry; fonts have system fallbacks. No backend or account required.

The desktop map occupies 75% of the width. The sidebar holds coins, the seven defenses and the wave control, and it never scrolls at any window size. Point at a defense card, or reach it with the keyboard, and a small note gives its effect, its tip and its level 1 numbers. Your wood, rock, iron and diamond sit on the map itself, in the top band on the right beside the stage and lives chip; click one to jump to the plot that makes it. Phones use a compact resource row, a bottom tower tray in portrait, and a compact side tray in landscape. Tap a resource to open its garden controls. Tap a square, then confirm placement. Pinch or use + to zoom, drag to pan when zoomed, and use the fit button to return to the full board. Portrait mode turns the straight board vertically to make squares larger. The ⋯ menu contains help, sound, and restart. Open the dev server's Network URL from a phone on the same Wi-Fi.

Plot unlock prices are 60 / 110 / 180 coins. Version 1 and version 2 saves both migrate forward: the expedition is preserved, old version 1 materials convert to wood and rock, replaced version 1 garden buildings are refunded, and version 2 saves keep every tower, farm, stage and coin while gaining the two ability clocks.

See CHANGELOG.md for what changed in round r2 and why.
