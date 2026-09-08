// Read-only gate for round r6 art lanes. Exit 1 with reasons, 0 when the lane's assets are complete.
//   node fleet-r6-art/check-assets.mjs icons|towers|enemies|board
import { existsSync, readFileSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = resolve(dirname(fileURLToPath(import.meta.url)));
const lane = process.argv[2];
const TOWERS = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern'];
const MATERIALS = ['wood', 'rock', 'iron', 'diamond'];
const ENEMIES = ['grub', 'runner', 'armor', 'moth', 'brood', 'grubling', 'warden', 'boss'];

// name, width, height, alpha required, downscale size (0 = none)
const LANES = {
  icons: [
    ...TOWERS.map((t) => [`icon-${t}.png`, 1024, 1024, true, 256]),
    ...MATERIALS.map((m) => [`icon-${m}.png`, 1024, 1024, true, 256]),
    ['icon-coin.png', 1024, 1024, true, 256],
    ['icon-life.png', 1024, 1024, true, 256],
  ],
  towers: TOWERS.flatMap((t) => [1, 2, 3].map((l) => [`tower-${t}-l${l}.png`, 1024, 1024, true, 512])),
  enemies: ENEMIES.map((e) => [`enemy-${e}.png`, 1024, 1024, true, 256]),
  board: [
    ['tile-meadow-a.png', 1024, 1024, false, 256],
    ['tile-meadow-b.png', 1024, 1024, false, 256],
    ['tile-meadow-c.png', 1024, 1024, false, 256],
    ['tile-path.png', 1024, 1024, false, 256],
    ['ground-outer.png', 1024, 1024, false, 512],
    ['apron-wood.png', 1024, 1024, false, 512],
    ['gate-entry.png', 1024, 1024, true, 512],
    ['gate-exit.png', 1024, 1024, true, 512],
    ['prop-tree-a.png', 1024, 1024, true, 512],
    ['prop-tree-b.png', 1024, 1024, true, 512],
    ['prop-tree-c.png', 1024, 1024, true, 512],
    ['prop-rock-a.png', 1024, 1024, true, 256],
    ['prop-rock-b.png', 1024, 1024, true, 256],
    ['prop-flowers-a.png', 1024, 1024, true, 256],
    ['prop-flowers-b.png', 1024, 1024, true, 256],
    ['prop-stump.png', 1024, 1024, true, 256],
  ],
};

if (!LANES[lane]) {
  console.error(`usage: check-assets.mjs ${Object.keys(LANES).join('|')}`);
  process.exit(2);
}
const dir = join(here, lane);
const failures = [];
const need = (ok, msg) => ok || failures.push(msg);

// Read the PNG header: signature, then IHDR width, height, bit depth, colour type.
function pngInfo(path) {
  const fd = openSync(path, 'r');
  const buf = Buffer.alloc(33);
  const n = readSync(fd, buf, 0, 33, 0);
  closeSync(fd);
  if (n < 33 || buf.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
  const width = buf.readUInt32BE(16),
    height = buf.readUInt32BE(20),
    colorType = buf[25];
  // 4 = grey+alpha, 6 = RGBA. Palette PNGs with tRNS also carry alpha, but gpt-image-2 and sips write RGBA.
  return { width, height, alpha: colorType === 4 || colorType === 6 };
}

for (const [name, w, h, alpha, small] of LANES[lane]) {
  const p = join(dir, name);
  if (!existsSync(p)) {
    failures.push(`${name} missing`);
    continue;
  }
  const info = pngInfo(p);
  need(info, `${name} is not a PNG`);
  if (!info) continue;
  need(info.width === w && info.height === h, `${name} is ${info.width}x${info.height}, want ${w}x${h}`);
  if (alpha) need(info.alpha, `${name} has no alpha channel (colour type must be RGBA)`);
  if (small) {
    const sp = join(dir, name.replace(/\.png$/, `@${small}.png`));
    if (!existsSync(sp)) failures.push(`${name} has no ${small}px copy`);
    else {
      const si = pngInfo(sp);
      need(si && si.width === small && si.height === small, `${name}@${small} is not ${small}x${small}`);
      if (alpha) need(si && si.alpha, `${name}@${small} lost its alpha channel`);
    }
  }
}

// Cost log: one line per final at least.
const costs = existsSync(join(dir, 'costs.jsonl'))
  ? readFileSync(join(dir, 'costs.jsonl'), 'utf8').trim().split('\n').filter(Boolean)
  : [];
need(costs.length >= LANES[lane].length, `costs.jsonl has ${costs.length} lines for ${LANES[lane].length} finals`);

// The lane's own record.
need(existsSync(join(dir, 'REPORT.md')), 'REPORT.md missing');
let result = null;
try {
  result = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
} catch {
  failures.push('result.json missing or not JSON');
}
if (result) {
  need(result.state === 'done', `result.json state is ${result.state}, want done`);
  need(result.model, 'result.json has no model');
}

if (failures.length) {
  console.error(`ART GATE RED (${lane})`);
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`art gate green (${lane}): ${LANES[lane].length} finals with downscaled copies, costs and record present`);
