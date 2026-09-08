// Read-only gate for the r7 theme lane. Exit 1 with reasons, 0 when the re-theme is complete and safe.
//   node fleet-r7-medieval/check-theme.mjs
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'd511e65';
const failures = [];
const need = (ok, msg) => ok || failures.push(msg);
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '');

// 1. game.js: only string literals may change. Strip every '...', "..." and `...` literal and compare.
// Comments may change too (COMMON.md rule 4 says names and copy; a comment is copy for the reader).
const strip = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
    .replace(/`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/\s+/g, ' ');
const before = execSync(`git -C "${root}" show ${BASE}:src/game.js`).toString();
const after = read('src/game.js');
need(strip(before) === strip(after), 'src/game.js changed outside its string literals (rules are frozen; only names and copy may change)');
for (const f of ['tests/golden.mjs', 'tests/golden.json']) {
  need(execSync(`git -C "${root}" diff ${BASE} -- ${f}`).toString() === '', `${f} changed; the behaviour freeze is frozen`);
}

// 2. New names are in, old names are out, in the rules file and everything the player reads.
const game = after;
for (const name of ['Ballista', 'Tar pit', 'Catapult', 'Mage spire', 'Palisade', 'Brazier', 'War banner',
  'Goblin', 'Wolf rider', 'Iron knight', 'Gargoyle', 'War wagon', 'Whelp', 'Paladin', 'Warlord']) {
  need(new RegExp(`name: '${name}'`).test(game), `src/game.js has no name: '${name}'`);
}
const playerText = ['src/game.js', 'src/main.js', 'src/look.js', 'README.md', 'index.html'].map((f) => `\n### ${f}\n` + read(f)).join('');
for (const old of ['Thorn', 'Sap well', 'Sunstone', 'Bloom', 'Hedge', 'Ember', 'Lantern', 'Grub', 'Beetle', 'Moth', 'Brood sac', 'Grubling', 'Warden', 'Guardian']) {
  const re = new RegExp(`\\b${old}\\b`, 'g');
  const hits = playerText.match(re) || [];
  need(hits.length === 0, `old name "${old}" still appears ${hits.length} time(s) in src/*.js, README.md or index.html`);
}
for (const word of ['garden', 'meadow', 'farm plot', 'pollen', 'settlement', 'expedition']) {
  const re = new RegExp(`\\b${word}\\b`, 'gi');
  const hits = (read('src/main.js') + read('README.md') + read('index.html')).match(re) || [];
  need(hits.length === 0, `retired word "${word}" still appears ${hits.length} time(s) in src/main.js, README.md or index.html`);
}
// Materials keep their names.
for (const m of ["name: 'Wood'", "name: 'Rock'", "name: 'Iron'", "name: 'Diamond'"]) need(game.includes(m), `materials must keep their names (${m})`);

// 3. The interface palette moved: DM Sans is gone and at least one new font family is declared.
const css = read('src/style.css');
need(!/DM\+Sans|'DM Sans'/.test(css), 'src/style.css still uses DM Sans; the re-theme needs its own type');
need(/fonts\.googleapis\.com|@font-face/.test(css), 'src/style.css declares no font');

if (failures.length) {
  console.error('THEME GATE RED');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('theme gate green: rules untouched outside strings, new names in, old words out, palette moved');
