// Golden replay: a fixed, scripted game must reproduce byte-identical state.
// The engine has no randomness, so any behaviour change shows up as a diff.
//   node tests/golden.mjs            -> compare against tests/golden.json (exit 1 on drift)
//   node tests/golden.mjs --record   -> rewrite tests/golden.json (only when a change is intended)
import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {Game, path} from '../src/game.js';

const here = dirname(fileURLToPath(import.meta.url));
const goldenFile = join(here, 'golden.json');

function scenario() {
  const g = new Game();
  const checkpoints = [];
  const counts = {shot: 0, kill: 0, leak: 0, wave: 0, stage: 0};
  const snap = label => {
    for (const ev of g.events) if (ev.type in counts) counts[ev.type]++;
    g.events = [];
    checkpoints.push({label, state: JSON.parse(g.serialize()), counts: {...counts}});
  };
  const run = seconds => {
    for (let i = 0; i < Math.round(seconds * 30); i++) {
      g.tick(1 / 30);
      for (const ev of g.events) if (ev.type in counts) counts[ev.type]++;
      g.events = [];
    }
  };

  // Build a small maze and a garden, exactly as a player might.
  g.farm(0);
  g.farm(0);
  g.place('thorn', 2, 3);
  g.place('sap', 5, 3);
  g.place('thorn', 8, 3);
  g.place('hedge', 6, 4);
  g.place('hedge', 6, 5);
  g.place('bloom', 10, 5);
  snap('built');

  // Play waves until stage 3 or a loss, upgrading whenever affordable.
  for (let wave = 0; wave < 9 && !g.lost && !g.won; wave++) {
    g.start();
    let guard = 0;
    while (g.active && guard++ < 6000) run(1 / 30);
    for (const t of g.towers) g.upgrade(t.id, t.type === 'thorn' ? 'reach' : 'power');
    if (g.unlockedPlots === 1 && g.farms[0]) g.unlockPlot(1);
    g.farm(1);
    snap(`wave-${wave}`);
  }
  checkpoints.push({label: 'route', route: path(g.towers)});
  return checkpoints;
}

const result = JSON.stringify(scenario(), null, 1);
if (process.argv.includes('--record')) {
  writeFileSync(goldenFile, result + '\n');
  console.log(`golden recorded: ${goldenFile}`);
} else {
  const expected = readFileSync(goldenFile, 'utf8').trimEnd();
  if (expected !== result) {
    const a = expected.split('\n'), b = result.split('\n');
    const i = a.findIndex((line, n) => line !== b[n]);
    console.error(`GOLDEN DRIFT at line ${i + 1}\n  expected: ${a[i]}\n  actual:   ${b[i]}`);
    process.exit(1);
  }
  console.log('golden replay identical');
}
