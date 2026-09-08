# Undergrowth

A browser tower defense garden built with Three.js and Vite. Square defenses shape enemy routes; a garden in the side pane produces wood, rock, iron, and diamond after every cleared stage. The same settlement persists through 30 stages.

## Play locally

```sh
npm install
npm run dev -- --port 5173
```

Open http://localhost:5173. Requires a browser with WebGL enabled.

## How to play

Choose a defense with the toolbar or keys 1 to 7, then click a meadow square. A translucent tower previews the placement and turns red if blocked; on phones it remains until you confirm or cancel. Click an existing tower to upgrade or reclaim it. Right-click or Escape cancels selection and placement previews.

Costs use the resource icons from the HUD. Red counts show **owned / required**; hover an
icon for its resource name. Upgrade panels keep the stats and costs compact. The **ⓘ**
button opens tower details when needed.

The **⚙ Settings** button contains the enemy-route toggle, restart, help, and autosave
status. Route visibility is remembered across reloads. Autosave runs quietly. There is no
wave-preview or music control. Settings and information panels pause combat while open.

Towers prioritize the enemy with the shortest remaining route to the gate. Flying enemies
use their direct route. Upgrade buttons show damage or support boost and range before and
after purchase. Lantern has one growth path that improves both its boost and coverage;
previously purchased Power Lanterns automatically gain the same coverage when loaded.

**A longer route means more shots.** This is the whole game. A hedge costs 8 coins and bends the dotted line the horde walks, and every extra square is more seconds under your towers. The straight route is 13 squares. A good maze is over 50. No amount of damage makes up for skipping this.

**The garden pays for level 3.** Buy the first wood plot for 25 coins; it harvests 3 wood per completed stage per farm level. Rock yields 3, Iron 2, and Diamond 1 per level. Farm levels at stage start fix that stage’s payout; purchases and upgrades during combat apply next stage. Waiting produces nothing. Coin upgrades increase output. Unlock and buy Rock, Iron, and Diamond plots in order. The level 1 to 2 upgrade of a tower costs coins only, so you are never locked out of growing at all, but level 3 needs wood and rock, and those only come from a plot. When you cannot afford an upgrade the cost icons show owned/required counts for missing resources.

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

## Deploy

The game is a folder of static files served by Cloudflare Pages. `wrangler.toml` declares the
project name `undergrowth` and `dist` as the build output. Deploying is one command,
`./deploy/deploy.sh`, and it refuses to run if the tests fail, if the behaviour freeze fails, if
`src/` has uncommitted changes, or if the ship gate is red. Nothing in `package.json` deploys, so
no `npm` command can push to production by accident.

Read [deploy/README.md](deploy/README.md) first. It covers the one time setup, how to verify the
deploy with `curl` and `shasum`, and the custom domain, which comes later. The game is live at
https://undergrowth.pages.dev (first deploy 2026-09-08); the source is at
https://github.com/LucSigouin/undergrowth.

## Mission log

[workbench/log.html](workbench/log.html) is the mission log: one section per round of work with
what changed, the score, before and after screenshots, and the balance table. Open the file in a
browser. Rebuild it after any change with `npm run log`, and refresh the screenshots with
`npm run shoot -- --url http://localhost:5174 --out workbench/shots/r2` against a running dev
server. `npm run check:ship` checks that the project is in a shippable state.

## Art

Everything on the board and in the sidebar is hand-painted 2D art, generated for round r6 and
kept in `public/art/`. Towers, creatures, tiles, gates and props are flat textured planes lying
on the board under a camera that looks straight down; the icons in the header, the tower cards
and the farm cards are the same paintings as `<img>` elements. Nothing on screen is procedural
geometry or a unicode glyph any more. Alpha sprites ship as PNG and the opaque tileable ground
textures as WebP, about 4.2 MB in total. `fleet-r6-art/integrate/build-art.py` rebuilds the
folder from the full size masters in `fleet-r6-art/`: it crops each cut-out to its paint, so one
plane size gives a whole family the same size on the board, and it downscales everything to game
size. The art paths live in `src/look.js` and nowhere else.

## Development

`npm test` checks routing, economy, combat, the wave table, the enemies and towers, persistence, and campaign progression. `node tests/golden.mjs` replays a fixed scripted game and fails on any behaviour drift. `node tools/balance-sim.mjs` plays every scripted strategy headless and prints the per stage tables; `--experiments` compares constant changes. `node tests/balance-gate.mjs` checks the difficulty targets. `npm run build` creates a static deployable `dist/` folder. Board art loads from `public/art/`; fonts have system fallbacks. No backend or account required.

The map runs vertically from the entrance at the top to the exit at the bottom on every screen. Undergrowth sits at the top left; stage and lives precede gold and materials on the right, with Settings at the far end. The bottom bar has Start, Pause/Resume, and Speed (1×, 2×, 3×) buttons. Click a material to manage its farm; farm cards use large clickable material icons with prices underneath and a per-stage harvest badge, without visible names or levels. The sidebar presents defenses in a two-column grid with large icons, names, and coin costs. Farm cards form a second grid anchored below defenses, above the wave button. The side pane never scrolls: in short desktop windows the cards and farm icons shrink so everything stays in view. Keyboard shortcuts still work but are not printed on the cards. Hover or focus a card for details. Phones use a two-row defense grid in portrait and a side grid in landscape. Tap a resource to open farm controls. Tap a square, then confirm placement. Pinch or use + to zoom, drag to pan when zoomed, and use the fit button to return to the full board. The ⚙ Settings menu contains help, route visibility, restart, and autosave status.


Plot unlock prices are 60 / 110 / 180 coins. Saves from versions 1 through 4 migrate to
version 5 without resetting the expedition. Old materials and garden buildings still migrate;
Old live saves use their saved farm levels for their first harvest; old production timers are discarded. Retired ability timers and root effects are discarded.

## Current balance rules

Rootgrip and Sunburst have been removed. Play uses towers, maze building, upgrades, and the
garden only. Difficulty tuning must not assume player abilities, emergency spells, or Q/E
shortcuts. The `kit-maze` strategy is the current winning reference, without player abilities.
Read [workbench/CURRENT-RULES.md](workbench/CURRENT-RULES.md) before changing scaling.
`npm run log` refreshes the current rules and measured balance table in both workbench pages.
Old round reports are historical and can mention features that are no longer present.

See CHANGELOG.md for what changed in round r2 and why.

The campaign displays 30 stages, one encounter per stage, with no creature counter. Existing saves and balance keep their internal ten-group structure; the interface and current workbench tables convert that to stages 1–30.
