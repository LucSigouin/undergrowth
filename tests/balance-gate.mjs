// Balance gate for round r2. Reads the simulator's JSON and checks the difficulty targets.
// Red on the r1 tree on purpose (the game is a hidden gate plus a cliff); r2 must turn it green.
//   node tests/balance-gate.mjs
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const raw = execFileSync('node', [join(root, 'tools/balance-sim.mjs'), '--json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const {strategies} = JSON.parse(raw);
const byName = Object.fromEntries(strategies.map(s => [s.name, s]));
const livesLost = s => s.stages.reduce((n, st) => n + (st.livesLost || 0), 0);
const stagesWithLoss = s => s.stages.filter(st => (st.livesLost || 0) > 0).length;

const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
};

const naive = byName.naive;
check(!!naive, 'a strategy named "naive" must exist (towers only, never buys a plot)');
if (naive) {
  check(!naive.won, 'naive (no garden) must not win the campaign');
  check(
    naive.lostAtStage === null || naive.lostAtStage >= 6,
    `naive must survive to at least stage 7 (0-indexed 6); lost at ${naive.lostAtStage}`
  );
}

const farmFirst = byName['farm-first'];
check(!!farmFirst, 'a strategy named "farm-first" must exist');
if (farmFirst) check(!farmFirst.won, 'farm-first (no towers before the full garden) must still lose');

const winners = strategies.filter(s => s.won);
check(winners.length >= 1, 'at least one scripted strategy must win');
for (const w of winners) {
  const lost = livesLost(w);
  check(lost >= 3 && lost <= 16, `${w.name} wins with ${lost} lives lost; target is 3 to 16 (no perfect, no near-death)`);
  check(
    stagesWithLoss(w) >= 3,
    `${w.name} loses lives in only ${stagesWithLoss(w)} stage(s); target is 3+ (no flat-then-cliff)`
  );
}

if (failures.length) {
  console.error('BALANCE GATE RED');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`balance gate green: ${winners.length} winner(s), naive dies at stage ${naive.lostAtStage + 1}`);
