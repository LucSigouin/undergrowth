// Read-only gate for the r6 integrate lane. Exit 1 with reasons, 0 when the art is wired in.
//   node fleet-r6-art/check-integrated.mjs
// The full suite (npm test, golden, balance, layout-gate, browser, mobile) still runs separately.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const need = (ok, msg) => ok || failures.push(msg);
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');

// 1. Rules frozen: game.js and the golden replay are byte-identical to the round's base commit.
const BASE = 'ad32fda';
for (const f of ['src/game.js', 'tests/golden.mjs', 'tests/golden.json']) {
  const diff = execSync(`git -C "${root}" diff ${BASE} -- ${f}`).toString();
  need(diff.length === 0, `${f} differs from ${BASE}; rules and the behaviour freeze are frozen this round`);
}

// 2. Every art final is shipped under public/art/ at a game size, in any web format, and the folder is small.
const TOWERS = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern'];
const MATERIALS = ['wood', 'rock', 'iron', 'diamond'];
const ENEMIES = ['grub', 'runner', 'armor', 'moth', 'brood', 'grubling', 'warden', 'boss'];
const stems = [
  ...TOWERS.map((t) => `icon-${t}`),
  ...MATERIALS.map((m) => `icon-${m}`),
  'icon-coin',
  'icon-life',
  ...TOWERS.flatMap((t) => [1, 2, 3].map((l) => `tower-${t}-l${l}`)),
  ...ENEMIES.map((e) => `enemy-${e}`),
  'tile-meadow-a', 'tile-meadow-b', 'tile-meadow-c', 'tile-path', 'ground-outer', 'apron-wood',
  'gate-entry', 'gate-exit', 'prop-tree-a', 'prop-tree-b', 'prop-tree-c', 'prop-rock-a', 'prop-rock-b',
  'prop-flowers-a', 'prop-flowers-b', 'prop-stump',
];
const artDir = join(root, 'public/art');
need(existsSync(artDir), 'public/art/ missing');
if (existsSync(artDir)) {
  const files = readdirSync(artDir);
  for (const stem of stems) {
    const re = new RegExp(`^${stem}(@\\d+)?\\.(png|webp|jpg|jpeg|avif)$`);
    need(files.some((f) => re.test(f)), `public/art/ has no game-size copy of ${stem}`);
  }
  const total = files.reduce((sum, f) => sum + statSync(join(artDir, f)).size, 0);
  need(total < 10 * 1024 * 1024, `public/art/ is ${(total / 1048576).toFixed(1)} MB, must stay under 10 MB`);
}

// 3. The renderer and the interface actually reference the art.
const world = read('src/world.js');
const main = read('src/main.js');
const look = read('src/look.js');
need(/tower-/.test(world) || /tower-/.test(look), 'src/world.js (or look.js) never references tower- sprites');
need(/enemy-/.test(world) || /enemy-/.test(look), 'src/world.js (or look.js) never references enemy- sprites');
need(/tile-meadow/.test(world) || /tile-meadow/.test(look), 'src/world.js (or look.js) never references tile-meadow textures');
need(/icon-/.test(main) || /icon-/.test(look), 'src/main.js (or look.js) never references icon- images');
need(/TextureLoader|loadAsync|ImageBitmapLoader/.test(world), 'src/world.js loads no textures');

if (failures.length) {
  console.error('INTEGRATION GATE RED');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`integration gate green: rules frozen, ${stems.length} art stems shipped, renderer and interface use them`);
