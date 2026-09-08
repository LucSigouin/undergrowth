LANE-TOKEN: r6-integrate-e4a7

You are the "integrate" worker on Undergrowth v2, round r6 (AAA art). Model requested: claude-opus-5, effort medium.
Project: /Users/ls/Claude-Workspace/personal/undergrowth-v2/ (git, main). Your lane folder: fleet-r6-art/integrate/.
Your CNVS taskId is the file name (without .md) of the file in /Users/ls/Claude-Workspace/personal/.cnvs/pipe/
whose contents include "LANE-TOKEN: r6-integrate-e4a7". Put it in result.json.

Read first: fleet-r6-art/COMMON.md (rules; ignore its image-generation section, you generate nothing),
fleet-r6-art/ROUND.md, fleet-r6-art/RUBRIC.md (you are graded on criterion 5 and 6), fleet-r6-art/check-integrated.mjs
(your gate, never edit it), then src/world.js, src/main.js, src/look.js, src/style.css, tests/browser.mjs,
tests/mobile-layout.mjs, tests/layout-gate.mjs, tools/shoot.mjs.

## The job
Four codex lanes produced 58 painted finals (Kingdom Rush style), all gate-green and frozen (fleet-r6-art/FROZEN.sha):
- fleet-r6-art/icons/icon-<thorn|sap|bloom|prism|hedge|ember|lantern|wood|rock|iron|diamond|coin|life>.png (+@256)
- fleet-r6-art/towers/tower-<id>-l<1|2|3>.png (+@512), seen from directly above, round base plate, hedge fills the square
- fleet-r6-art/enemies/enemy-<grub|runner|armor|moth|brood|grubling|warden|boss>.png (+@256), head at the top of the image
- fleet-r6-art/board/ tile-meadow-a|b|c, tile-path (opaque tileable), ground-outer, apron-wood (opaque tileable),
  gate-entry, gate-exit, prop-tree-a|b|c, prop-rock-a|b, prop-flowers-a|b, prop-stump (transparent), each with a @256 or @512 copy
Look at every contact sheet in */candidates/ first so you know what you are placing.

Wire them into the game so that NOTHING procedural or unicode remains visible: no coloured chips with symbols, no box
tiles, no icosahedron enemies, no cylinder towers. Rules stay frozen: src/game.js, tests/golden.mjs, tests/golden.json
byte-identical (the gate checks this).

### Files you own
src/world.js, src/main.js, src/look.js, src/style.css, public/art/ (new), tests/browser.mjs, tests/mobile-layout.mjs,
tests/shots.mjs and tools/shoot.mjs only where they assert or shoot the old visuals, README.md (a short "Art" paragraph),
CHANGELOG.md (one entry at the top), fleet-r6-art/integrate/. Nothing else.

### How
1. public/art/: copy the game-size files in. Vite serves public/ at the site root, so reference them as /art/<file>.
   Budget: the folder must stay under 10 MB (target 6). Keep alpha sprites as PNG; try WebP for opaque textures with
   `sips -s format webp` (check the file starts with RIFF....WEBP; if sips cannot, use JPEG quality 80 via
   `sips -s format jpeg -s formatOptions 80`). Downscale further with sips where a 512 is not needed at game size
   (a board square is about 60 to 100 px on a desktop). Name files <stem>@<size>.<ext>; the gate accepts any of
   png|webp|jpg|jpeg|avif and any @size.
2. Textures: one THREE.TextureLoader, one cache Map keyed by path, `texture.colorSpace = THREE.SRGBColorSpace`,
   `generateMipmaps` on, anisotropy from the renderer. Sprites are flat PlaneGeometry meshes lying on the board with
   MeshBasicMaterial { map, transparent: true, alphaTest: 0.05, depthWrite: false }, no shadows cast or received;
   renderOrder so towers draw over tiles, enemies over towers, effects and rings over enemies. The game must render
   before textures finish loading (loader callbacks set needsUpdate; do not block the first frame).
3. Orientation: the camera looks straight down with camera.up = (-1, 0, 0), so screen-up is world -x (the entry side,
   x = 0) and screen-right is world -z... verify this yourself with a screenshot rather than trusting this sentence.
   Every sprite's image-top must point to screen-up. Enemy sprites must be rotated so the head points along the
   direction of travel (the group already turns toward its next target; make the sprite agree). Thorn's head group
   swings toward its target; the whole thorn sprite should swing with it.
4. Board (buildWorld): outer ground = a large plane with ground-outer repeating (RepeatWrapping); apron = apron-wood
   repeating on the current apron footprint; each of the 13x9 squares = a plane with one of tile-meadow a|b|c chosen
   by the same deterministic index the colours used, with a thin darker gap between squares so the grid stays legible
   (a 1 px seam or a tiny inset). gate-entry sprite at the entry square (x 0, z 4), gate-exit at the exit (x 12, z 4),
   about 1.6 squares wide, over the tiles. Replace the procedural edge trees with prop-tree a|b|c (varied scale and
   rotation), rocks, flowers and the stump, deterministic placement (seeded, no Math.random) so shots are repeatable.
   Optional and welcome: tile-path planes under the current route cells in setPath, rotated with the route.
   Keep the hover square, range rings, chevrons, boost halos and all effects working.
5. Towers (makeTower): one sprite plane per tower, texture tower-<type>-l<level>, sized to fill the square (about 0.96),
   hedge exactly 1.0. Keep group.userData.head/level/type and the preview ghost (showTowerPreview clones materials and
   tints them; make the tint work on textured materials: material.color multiply, red when blocked, opacity 0.55).
   Level pips go away; the sprite shows the level. Rebuild the mesh when a tower's level changes (sync already does
   this for level changes; check).
6. Enemies (makeEnemy): one sprite plane per enemy, texture enemy-<kind>, size from ENEMY_LOOK.size * scale times a
   factor you tune so a grub is about 0.55 squares and the boss about 1.1. Keep the shadow blot, the health bar and
   the flying bob if there is one; drop the collar and body spheres. Moths fly: give them a slightly larger shadow offset.
7. Interface (main.js, style.css): chip() renders <img class="chip-art" src="/art/icon-<id>@256.png" alt=""> inside
   the chip element instead of a symbol; the coloured plate behind it may stay as a subtle tinted rounded square or go,
   your call, but the symbol text goes. Header gold uses icon-coin, lives use icon-life, materials use their icons,
   tower cards and farm cards use theirs, the hover note and detail panel use them too. Remove `symbol` usage from
   main.js; look.js may keep the symbols as aria text only. Costs in cards keep showing the coin icon and number.
8. Gates, all green from the project root (start your own dev server on 5174 in a second terminal or a background
   job you stop at the end): `npm test`, `node tests/golden.mjs`, `node tests/balance-gate.mjs`, `npm run format:check`,
   `GARDEN_URL=http://localhost:5174 node tests/layout-gate.mjs`, `GARDEN_URL=... node tests/browser.mjs`,
   `GARDEN_URL=... node tests/mobile-layout.mjs`, `node fleet-r6-art/check-integrated.mjs`, `npm run check:ship` after
   `npm run build` is NOT allowed (rule 2: do not build; the orchestrator builds). Playwright needs the sandbox off.
9. Performance: 60 fps at 1440x900 with 12 towers and 20 enemies. Measure with a Playwright script that advances the
   game (window.__garden.step) and reads requestAnimationFrame timing over 5 seconds; put the number in REPORT.md.
10. Screenshots: `node tools/shoot.mjs --url http://localhost:5174 --out fleet-r6-art/integrate/shots` (update shoot.mjs
    only if it breaks on the new visuals). Look at them. If a sprite is upside down, mirrored, floating or clipped, fix it.

Deliver REPORT.md (what changed per file, the fps number, shots, public/art size, what is unverified) and result.json
per COMMON.md with "model":{"requested":"claude-opus-5","effective":"<what you ran as>","source":"spawn flag"}.
Plain words, short sentences, no em dashes. Do not commit, push, deploy, or build.
