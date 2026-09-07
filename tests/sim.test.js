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

test('the naive strategy loses at stage 6 wave 2, well before stage 10', () => {
  const naive = runAll().strategies.find((s) => s.name === 'naive');
  assert.equal(naive.won, false);
  assert.equal(naive.lostAtStage, 5);
  assert.equal(naive.lostAtWave, 2);
  assert.ok(naive.lostAtStage < 9);
});

test('naive dies with towers stuck at level one and coins it cannot spend', () => {
  // This is the cause, not a coincidence. Upgrades need wood, and naive buys no farm.
  const naive = runAll().strategies.find((s) => s.name === 'naive');
  const last = naive.stages[naive.stages.length - 1];
  assert.deepEqual([...new Set(last.towerLevels)], [1]);
  assert.deepEqual(last.farms, [0, 0, 0, 0]);
  assert.ok(last.coinsEnd > 1000);
});

test('at least one strategy clears all ten stages on the current constants', () => {
  const { strategies } = runAll();
  assert.ok(strategies.some((s) => s.won));
});

test('experiments restore the shared constant tables when they finish', () => {
  const thornDamage = TOWERS.thorn.damage;
  const rockUnlock = MATERIALS[1].unlock;
  runExperiments();
  assert.equal(TOWERS.thorn.damage, thornDamage);
  assert.equal(MATERIALS[1].unlock, rockUnlock);
});
