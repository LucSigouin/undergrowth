# r6 integrate lane: the painted art is in the game

Nothing procedural or unicode is visible any more. No coloured chips with symbols, no box tiles,
no icosahedron creatures, no cylinder towers. All 58 finals from the four codex lanes are wired
in. `src/game.js`, `tests/golden.mjs` and `tests/golden.json` are byte identical to `ad32fda`.

## Gates, all run in this session against my own dev server on 5174

| Gate | Result |
| --- | --- |
| `npm test` | pass 43, fail 0 |
| `node tests/golden.mjs` | `golden replay identical` |
| `node tests/balance-gate.mjs` | `balance gate green: 1 winner(s), naive dies at stage 7` |
| `npx prettier --check "src/**/*.{js,css}" "tests/*.{js,mjs}"` | `All matched files use Prettier code style!` |
| `GARDEN_URL=... node tests/layout-gate.mjs` | `layout gate green at 1920x1080, 1536x864, 1440x900, 1366x768, 1280x720` |
| `GARDEN_URL=... node tests/browser.mjs` | `Browser checks passed: ... no JS errors.` |
| `GARDEN_URL=... node tests/mobile-layout.mjs` | 6 passes, chromium and webkit, 390x844 / 844x390 / 375x667 |
| `node fleet-r6-art/check-integrated.mjs` | `integration gate green: rules frozen, 58 art stems shipped, renderer and interface use them` |

No test file needed changing. Nothing in the existing suite asserted the old visuals, and the two
assertions that touch icons (`.tower-icon` at least 44 px wide, no `.chip` inside the hover note)
still hold.

## Frames

60.0 fps at 1440x900 with 12 level 3 towers and 20 creatures, median frame 16.7 ms, 95th
percentile 16.8 ms, over 5 seconds of real `requestAnimationFrame` callbacks. Measured with
`node fleet-r6-art/integrate/fps.mjs` on `ANGLE (Apple, ANGLE Metal Renderer: Apple M5)`.
Headless Chromium's default software rasteriser (SwiftShader) gives 19 fps on the same scene, so
that number says nothing about the game; the script takes `GPU=1` to use the real GPU and the
driver string is printed with the result so the reading can be checked.

## public/art/

58 files, 4.23 MB, under the 10 MB limit and the 6 MB target. Alpha sprites are PNG, opaque
tileable textures are WebP through `cwebp` (macOS `sips` can read WebP but cannot write it, so
the brief's `sips -s format webp` route is not available on this machine).

| Family | Size on disk | Format |
| --- | --- | --- |
| 13 icons | 160 px | PNG |
| 21 towers | 256 px | PNG |
| 8 creatures | 192 px, boss and brood 256 px | PNG |
| 4 tiles and the path | 256 px | WebP q86 |
| ground-outer, apron-wood | 512 px | WebP q86 |
| 2 gates, 3 trees | 256 px | PNG |
| rocks, flowers, stump | 160 px | PNG |

`build-art.py` rebuilds the folder from the frozen masters. It does one thing beyond resizing:
every cut-out sprite is cropped to its own paint on a square canvas with a 6 percent margin.
The generated frames vary a lot in how much space they leave (a Thorn tower fills 74 percent of
its frame, a Bloom fills 95), so without that crop one plane size makes some towers look small
and others look oversized. After the crop every sprite covers about 94 percent of its plane and
one number per family is enough.

## What changed, per file

**`src/look.js`** is now the only place an art path appears. Every tower row carries its icon
plus the three level sprites; every material row carries its icon; `MATERIAL_LOOK` gained
`coins` and `lives` rows for the two header counters. `ENEMY_LOOK` gained `art` and `sprite`,
where `sprite` is the plane width in board squares. A new `BOARD_ART` holds the tiles, path,
ground, apron, gates and props. `SCENE` shrank to the handful of colours still drawn as plain
geometry: the seam under the grid, the hover square, the route chevrons, the effects. `symbol`
stayed on every row, unrendered, as spoken text for assistive technology.

**`src/world.js`** is the bulk of the work.

- One `THREE.TextureLoader` and one cache keyed by path and repeat. Textures are sRGB, mipmapped,
  at the renderer's maximum anisotropy. The loader never blocks: a mesh is built with an empty
  texture and the picture appears the frame after the file arrives. A load failure logs
  `missing board art: <path>` rather than leaving an invisible sprite, which is exactly the bug
  that cost me twenty minutes when a tower path was missing its `@256` suffix.
- One shared `PlaneGeometry`, rotated at the geometry level so it lies on the board with its
  image top pointing at screen up, leaving `mesh.rotation.y` free for facing. `disposeGroup`
  skips it, since freeing a shared buffer would empty the whole board.
- Orientation, verified with a screenshot rather than trusted: the camera looks down with
  `up = (-1, 0, 0)`, so screen up is world -x and screen right is world -z, and a sprite whose
  image top should point along `(dx, dz)` needs `rotation.y = atan2(dz, -dx)`. Creatures turn
  toward their next target. A Thorn's sprite hangs off the head group with a fixed quarter turn,
  because the head is aimed with `atan2(dx, dz)` and those two differ by exactly 90 degrees.
- `buildWorld` draws the outer ground (a 120 by 120 plane, ground-outer repeating 10 times), the
  wooden apron on the old footprint, a dark plate under the grid, 169 meadow tiles at 0.965
  squares so the plate shows as a thin seam, and the two gates at 1.6 squares. The tile variant
  comes from the same deterministic formula the flat colours used, folded from four choices to
  three paintings. `plantScenery` places trees, rocks, flowers and a stump in four seeded lanes
  outside the apron, so two runs of the screenshot tool give the same picture.
- `setPath` also lays painted path tiles under the route, each turned to follow the step leaving
  it. They live in their own group, so turning the route hint off in Settings does not take the
  painted lane with them.
- `makeTower` is one sprite: 1.0 squares, a hedge 1.08 so a maze reads as one solid run. Level
  pips are gone. `sync` already rebuilt a tower on a level change, so the sprite follows.
- `makeEnemy` is a shadow blot, one sprite, and a health bar that runs across the screen above
  the creature. The collar, eyes, legs, body spheres, brood sacs, warden plates and boss crown
  are gone: they are all in the paint now. Height cannot show flight under a straight down
  camera, so a moth's shadow slides out from under it and drifts as it flaps.
- Shadow mapping off, tone mapping off, the two lights turned down. Nothing casts a shadow and
  painted planes are unlit, so both were pure cost. Every flat piece has an explicit
  `renderOrder` from one `LAYER` table, because depth cannot separate planes this close.
- `sphere` and `cylinder` are gone. Nothing called them.

**`src/main.js`**: `chip()` renders `<img class="chip-art">` inside the plate instead of a
symbol, and a new `icon()` renders a bare painted counter. Gold uses icon-coin, lives use
icon-life, materials and towers use theirs, in the header, the tower cards, the farm cards, the
garden summary, the detail panel, the sell button, the boost note and the phone placement bar.
No `◈`, `♥` or `look.symbol` is left in the file.

**`src/style.css`**: `.chip-art` and `.icon-art`, and the chip plate is now a pale wash of the
piece's accent colour (`linear-gradient(#fffffff0, #ffffffd6), var(--tile)`) rather than the flat
saturated colour, so a painted icon reads on it. Every existing chip size rule still sets the
plate and the art fills it, which is why no layout gate moved.

**`README.md`**: one "Art" section. **`CHANGELOG.md`**: one entry at the top.

## Shots, in `shots/`

Taken against the final code. `01` to `05` and `notes.md` are `node tools/shoot.mjs` output;
`shoot.mjs` needed no changes.

| File | What it shows |
| --- | --- |
| `01-fresh-desktop.png` | fresh board, 1440x1000 |
| `02-midwave-desktop.png` | three towers, wave running, detail panel open with painted icons |
| `03-missing-material.png` | level 2 tower, coins but no materials |
| `04-phone-portrait.png`, `05-phone-landscape.png` | iPhone 13, mid wave |
| `peek.png` | seven towers and one of every creature at once |
| `orient.png`, `orient-zoom.png` | a hedge maze that forces corners |
| `zoom-aim.png` | close up proving each heading: heads point down, up, left and right correctly, and a Thorn aims where it shot |
| `state-ghost-free.png`, `state-ghost-blocked.png` | the placement ghost, the hover square and the range ring |

Scripts that produced them are beside them: `peek.mjs`, `orient.mjs`, `zoomcheck.mjs`,
`states.mjs`, `fps.mjs`, `probe.mjs`.

## Cost

0 USD. This lane generated no images, so there is no `costs.jsonl`. All 58 finals came from the
four art lanes.

## Not verified, and one slip

- **I ran `npx vite build` once by accident**, chaining it after a formatting command. It
  succeeded and wrote `dist/`, which was not there before. `dist/` is git ignored and rule 2 says
  this lane does not build, so I left it rather than reaching for a delete the deny list blocks.
  **The orchestrator should remove `dist/` before its own build.**
- No human has looked at the running game. I checked every screenshot above myself, but the
  rubric's "reads at a glance" is a human judgement and I cannot make it.
- Only Chromium and WebKit, headless, on this Mac. No Firefox, no real phone, no touch hardware.
  WebP with alpha is not used anywhere, so the WebKit risk is limited to opaque ground textures,
  and the mobile gate passed on WebKit.
- The 60 fps figure is one machine, one GPU (Apple M5), five seconds. A weaker GPU is untested.
- Pinch zoom past 2x will show the 256 px tower sprites softening. I did not measure where it
  starts to look bad.
- The three meadow tiles differ subtly (mean colour 183,193,62 against 169,182,72 and
  190,204,85), so the grid reads as one meadow rather than a patchwork. That is the supplied art,
  not the wiring, but a scorer may want it noted.
