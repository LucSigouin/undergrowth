# Undergrowth

A browser tower defense siege built with Three.js and Vite. Square war engines shape the horde's route; the works in the side pane produce wood, rock, iron, and diamond after every cleared stage. The same keep persists through 30 stages.

## Play locally

```sh
npm install
npm run dev -- --port 5173
```

Open http://localhost:5173. Requires a browser with WebGL enabled.

## How to play

Choose an engine with the toolbar or keys 1 to 7, then click a bailey square. A translucent engine previews the placement and turns red if blocked; on phones it remains until you confirm or cancel. Click an existing engine to build it up or reclaim it. Right-click or Escape cancels selection and placement previews.

Costs use the resource icons from the HUD. Red counts show **owned / required**; hover an
icon for its resource name. Upgrade panels keep the stats and costs compact. The **ⓘ**
button opens engine details when needed.

The **⚙ Settings** button contains the route toggle, restart, help, and autosave
status. Route visibility is remembered across reloads. Autosave runs quietly. There is no
wave-preview or music control. Settings and information panels pause combat while open.

Engines prioritize the enemy with the shortest remaining route to the keep gate. Flying enemies
use their direct route. Upgrade buttons show damage or rally boost and range before and
after purchase. The War banner has one growth path that improves both its boost and coverage;
previously purchased Power banners automatically gain the same coverage when loaded.

**A longer route means more shots.** This is the whole game. A Palisade costs 8 coins and bends the dotted line the horde marches, and every extra square is more seconds under your engines. The straight route is 13 squares. A good maze is over 50. No amount of damage makes up for skipping this.

**The works pay for level 3.** Buy the sawmill for 25 coins; it yields 3 wood per cleared stage per level. The quarry yields 3 rock, the forge 2 iron, and the gem cutter 1 diamond per level. Levels at the start of a stage fix that stage's payout; purchases and upgrades during combat apply next stage. Waiting produces nothing. Coin upgrades increase output. Unlock and buy the quarry, forge, and gem cutter in order. The level 1 to 2 upgrade of an engine costs coins only, so you are never locked out of building at all, but level 3 needs wood and rock, and those only come from the works. When you cannot afford an upgrade the cost icons show owned/required counts for missing resources.

### The seven war engines

| Key | Engine     | What it does                                                                     |
| --- | ---------- | -------------------------------------------------------------------------------- |
| 1   | Ballista   | Fast single bolts. The cheap all rounder.                                         |
| 2   | Tar pit    | Sticky tar slows the horde so everything else gets more shots.                    |
| 3   | Catapult   | Stone breaks around the target. The answer to a crowd.                            |
| 4   | Mage spire | Long range, and full damage through a knight's plate.                             |
| 5   | Palisade   | A wall of timber stakes. Does not attack. This is how you build the maze.         |
| 6   | Brazier    | Sets the horde alight. Burning ignores armor and paladin shields.                 |
| 7   | War banner | Never shoots. Every attacking engine in its ring fires 30 to 50 percent faster.   |

### The horde

Goblins march. Wolf riders are fast. Iron knights wear plate and only the Mage spire cuts through it cleanly. Gargoyles fly straight over the maze, so the direct line still needs cover. A war wagon breaks open into three whelps when it dies, which is why Catapult stones clear them best. A paladin ignores tar entirely and shields every enemy within about two squares of it, and only Brazier burning gets past that shield.

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
re-themed to a castle siege in r7, kept in `public/art/`. Engines, creatures, tiles, gates and
props are flat textured planes lying on the board under a camera that looks straight down; the
icons in the header, the engine cards and the works cards are the same paintings as `<img>`
elements. Nothing on screen is procedural geometry or a unicode glyph any more. Alpha sprites
ship as PNG and the opaque tileable ground textures as WebP, about 4.2 MB in total.
`fleet-r6-art/integrate/build-art.py` rebuilds the folder from the full size masters: it crops
each cut-out to its paint, so one plane size gives a whole family the same size on the board, and
it downscales everything to game size. The art paths live in `src/look.js` and nowhere else.

## Development

`npm test` checks routing, economy, combat, the wave table, the creatures and engines, persistence, and campaign progression. `node tests/golden.mjs` replays a fixed scripted game and fails on any behaviour drift. `node tools/balance-sim.mjs` plays every scripted strategy headless and prints the per stage tables; `--experiments` compares constant changes. `node tests/balance-gate.mjs` checks the difficulty targets. `npm run build` creates a static deployable `dist/` folder. Board art loads from `public/art/`; fonts have system fallbacks. No backend or account required.

The map runs vertically from the camp gate at the top to the keep gate at the bottom on every screen. Undergrowth sits at the top left; stage and lives precede gold and materials on the right, with Settings at the far end. The bottom bar has Start, Pause/Resume, and Speed (1×, 2×, 3×) buttons. Click a material to manage its works; works cards use large clickable material icons with prices underneath and a per-stage output badge, without visible names or levels. The sidebar presents war engines in a two-column grid with large icons, names, and coin costs. Works cards form a second grid anchored below the engines, above the wave button. The side pane never scrolls: in short desktop windows the cards and works icons shrink so everything stays in view. Keyboard shortcuts still work but are not printed on the cards. Hover or focus a card for details. Phones use a two-row engine grid in portrait and a side grid in landscape. Tap a resource to open its works controls. Tap a square, then confirm placement. Pinch or use + to zoom, drag to pan when zoomed, and use the fit button to return to the full board. The ⚙ Settings menu contains help, route visibility, restart, and autosave status.

Unlock prices for the quarry, forge, and gem cutter are 60 / 110 / 180 coins. Saves from versions
1 through 4 migrate to version 5 without resetting the siege. Old materials and buildings still
migrate; old live saves use their saved levels for their first payout; old production timers are
discarded. Retired ability timers and root effects are discarded.

## Current balance rules

Rootgrip and Sunburst have been removed. Play uses war engines, maze building, upgrades, and the
works only. Difficulty tuning must not assume player abilities, emergency spells, or Q/E
shortcuts. The `kit-maze` strategy is the current winning reference, without player abilities.
Read [workbench/CURRENT-RULES.md](workbench/CURRENT-RULES.md) before changing scaling.
`npm run log` refreshes the current rules and measured balance table in both workbench pages.
Old round reports are historical and can mention features that are no longer present.

See CHANGELOG.md for what changed in round r2 and why.

The campaign displays 30 stages, one encounter per stage, with no creature counter. Existing saves and balance keep their internal ten-group structure; the interface and current workbench tables convert that to stages 1–30.
