// Ship gate for round r4. Read-only predicate: exits 1 with reasons, 0 when the project can ship.
//   node tools/check-ship.mjs
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join, resolve} from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const need = (ok, msg) => {
  if (!ok) failures.push(msg);
};
const read = p => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');

// 1. Cloudflare Pages config
const wrangler = read('wrangler.toml');
need(wrangler.length > 0, 'wrangler.toml missing');
need(/^\s*name\s*=\s*"[a-z0-9-]+"/m.test(wrangler), 'wrangler.toml needs a name');
need(/^\s*pages_build_output_dir\s*=\s*"dist"/m.test(wrangler), 'wrangler.toml needs pages_build_output_dir = "dist"');

// 2. A built dist/ whose index.html references only files that exist
const indexHtml = read('dist/index.html');
need(indexHtml.length > 0, 'dist/index.html missing (run npm run build)');
for (const m of indexHtml.matchAll(/(?:src|href)="(\/[^"]+)"/g)) {
  const ref = m[1];
  if (ref.startsWith('/http') || ref.startsWith('data:')) continue;
  need(existsSync(join(root, 'dist', ref)), `dist/index.html references ${ref} which is not in dist/`);
}

// 3. Deploy script exists, is documented, and nothing runs it automatically
need(existsSync(join(root, 'deploy/deploy.sh')), 'deploy/deploy.sh missing');
need(existsSync(join(root, 'deploy/README.md')), 'deploy/README.md missing');
const pkg = read('package.json');
need(!/wrangler pages deploy/.test(pkg), 'package.json must not run wrangler pages deploy in any script');

// 4. Mission log with one section per round and images that exist
const log = read('workbench/log.html');
need(log.length > 0, 'workbench/log.html missing');
const rounds = readdirSync(root).filter(d => /^fleet-r\d+-/.test(d) && statSync(join(root, d)).isDirectory());
for (const r of rounds) {
  const id = r.match(/^fleet-(r\d+)-/)[1];
  need(new RegExp(`id="${id}"`).test(log), `workbench/log.html has no section with id="${id}" for ${r}`);
}
const imgs = [...log.matchAll(/<img[^>]+src="([^"]+)"/g)].map(m => m[1]);
need(imgs.length >= rounds.length, `workbench/log.html has ${imgs.length} images for ${rounds.length} rounds`);
for (const src of imgs) {
  if (src.startsWith('data:') || /^https?:/.test(src)) continue;
  need(existsSync(join(root, 'workbench', src)), `workbench/log.html image ${src} not found under workbench/`);
}
need(!/[—]/.test(log), 'workbench/log.html contains an em dash');

if (failures.length) {
  console.error('SHIP GATE RED');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`ship gate green: ${rounds.length} round sections, ${imgs.length} images, dist and deploy script present`);
