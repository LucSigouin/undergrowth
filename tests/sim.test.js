// Guards for the headless balance simulator in tools/balance-sim.mjs.
// It must be deterministic, it must finish well inside a minute, and it must keep telling the
// truth about the naive strategy on the current constants.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOWERS, MATERIALS } from '../src/game.js';
import { runAll, runExperiments } from '../tools/balance-sim.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const simPath = join(root, 'tools', 'balance-sim.mjs');

// Runs the command line simulator once and returns its raw stdout.
function simulate() {
  return execFileSync(process.execPath, [simPath, '--json'], { encoding: 'utf8', cwd: root });
}

test('two runs of the simulator produce identical JSON', () => {
  const first = simulate();
  const second = simulate();
  assert.equal(first, second);
  const parsed = JSON.parse(first);
  assert.ok(Array.isArray(parsed.strategies));
  assert.ok(parsed.strategies.length >= 3);
});

test('the simulator finishes far inside sixty seconds', () => {
  const started = Date.now();
  simulate();
  assert.ok(Date.now() - started < 60000);
});

test('every strategy reports the fields the report is built from', () => {
  const { strategies } = runAll();
  for (const result of strategies) {
    assert.equal(typeof result.name, 'string');
    assert.equal(typeof result.won, 'boolean');
    assert.ok(result.stages.length > 0);
    for (const stage of result.stages) {
      assert.equal(typeof stage.livesLost, 'number');
      assert.equal(typeof stage.livesEnd, 'number');
      assert.equal(typeof stage.coinsEnd, 'number');
      assert.equal(typeof stage.towers, 'number');
      assert.ok(Array.isArray(stage.towerLevels));
      assert.equal(stage.farms.length, 4);
    }
  }
});

test('the naive strategy still loses, but only after it has seen most of the game', () => {
  const naive = runAll().strategies.find((s) => s.name === 'naive');
  assert.equal(naive.won, false);
  // The r2 gate asks for stage 7 or later. r1 died at stage 6.
  assert.ok(naive.lostAtStage >= 6);
  assert.ok(naive.lostAtStage < 9);
});

test('naive reaches level 2 on coins alone and then stops, with no works', () => {
  // The level 1 to 2 upgrade is coins only in r2, so naive is no longer frozen at level 1.
  // Level 3 still needs wood and rock, and naive never buys a works, so level 2 is its ceiling.
  const naive = runAll().strategies.find((s) => s.name === 'naive');
  const last = naive.stages[naive.stages.length - 1];
  assert.deepEqual([...new Set(last.towerLevels)], [2]);
  assert.deepEqual(last.farms, [0, 0, 0, 0]);
});

test('the winners lose lives across three or more stages, not in one cliff', () => {
  const winners = runAll().strategies.filter((s) => s.won);
  assert.ok(winners.length >= 1);
  for (const winner of winners) {
    const total = winner.stages.reduce((sum, stage) => sum + stage.livesLost, 0);
    const bleeding = winner.stages.filter((stage) => stage.livesLost > 0).length;
    assert.ok(total >= 3 && total <= 16, `${winner.name} lost ${total} lives`);
    assert.ok(bleeding >= 3, `${winner.name} bled in ${bleeding} stages`);
  }
});

test('at least one strategy clears all ten stages on the current constants', () => {
  const { strategies } = runAll();
  assert.ok(strategies.some((s) => s.won));
});

test('current balance uses the engine-only reference and excludes retired ability strategies', () => {
  const { strategies } = runAll();
  assert.equal(
    strategies.some((s) => /abilities/.test(s.name)),
    false,
  );
  const reference = strategies.find((s) => s.name === 'kit-maze');
  assert.ok(reference?.won, 'the engine-and-works reference must clear the campaign');
});

test('experiments restore the shared constant tables when they finish', () => {
  const thornDamage = TOWERS.thorn.damage;
  const rockUnlock = MATERIALS[1].unlock;
  runExperiments();
  assert.equal(TOWERS.thorn.damage, thornDamage);
  assert.equal(MATERIALS[1].unlock, rockUnlock);
});

test('waiting between waves cannot improve the economy or strategy outcomes', () => {
  assert.deepEqual(runAll({ idleSeconds: 20 }), runAll());
});
