// Unit tests for the rules engine in src/game.js. They cover routing, building,
// the garden economy, save migration, real combat, campaign progression, and the
// events the renderer listens to. Nothing here touches a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, path } from '../src/game.js';

test('maze reroutes and rejects a sealed exit without charging', () => {
  const game = new Game();
  game.coins = 1000;
  for (let z = 0; z < 8; z++) assert.equal(game.place('hedge', 6, z), null);
  assert.ok(path(game.towers).length > 13);
  const coins = game.coins;
  assert.match(game.place('hedge', 6, 8), /path/);
  assert.equal(game.coins, coins);
  assert.equal(game.towers.length, 8);
  assert.match(game.place('hedge', 0, 4), /entrance/);
});

test('cannot build under an enemy or its next movement target', () => {
  const game = new Game();
  game.enemies = [{ x: 3.1, z: 4, target: { x: 4, z: 4 }, flying: false }];
  assert.match(game.place('thorn', 3, 4), /creature/);
  assert.match(game.place('thorn', 4, 4), /creature/);
});

test('garden starts empty with only the wood plot available', () => {
  const game = new Game();
  assert.equal(game.unlockedPlots, 1);
  assert.deepEqual(game.farms, [null, null, null, null]);
  game.tick(30);
  assert.equal(game.wood, 0);
  assert.match(game.farm(1), /Unlock/);
  assert.match(game.unlockPlot(1), /previous/);
  assert.equal(game.coins, 200);
  assert.equal(game.farm(0), null);
  assert.equal(game.coins, 175);
  assert.equal(game.farms[0].type, 'wood');
});

test('money buys and upgrades automatic production during combat', () => {
  const game = new Game();
  game.farm(0);
  game.farm(0);
  assert.equal(game.coins, 140);
  assert.equal(game.farms[0].level, 2);
  game.start();
  for (let i = 0; i < 301; i++) game.tick(1 / 30);
  assert.equal(game.wood, 6);
  assert.equal(game.rock, 0);
  game.place('thorn', 5, 3);
  const tower = game.towers[0];
  assert.equal(game.upgrade(tower.id, 'reach'), null);
  assert.equal(tower.level, 2);
  assert.equal(tower.branch, 'reach');
  assert.ok(game.stats(tower).range > 4);
  assert.equal(game.wood, 1);
});

test('locked resources unlock sequentially and do not produce until purchased', () => {
  const game = new Game();
  game.coins = 1500;
  game.farm(0);
  assert.match(game.unlockPlot(2), /previous/);
  assert.equal(game.unlockPlot(1), null);
  const afterUnlock = game.coins;
  assert.match(game.unlockPlot(1), /already/);
  assert.equal(game.coins, afterUnlock);
  game.tick(20);
  assert.equal(game.rock, 0);
  assert.equal(game.farm(1), null);
  assert.equal(game.unlockPlot(2), null);
  assert.equal(game.farm(2), null);
  assert.equal(game.unlockPlot(3), null);
  assert.equal(game.farm(3), null);
  game.tick(10);
  assert.equal(game.rock, 3);
  assert.equal(game.iron, 2);
  assert.equal(game.diamond, 1);
  assert.equal(game.unlockedPlots, 4);
});

test('insufficient coins and maximum upgrades cannot charge or change a plot', () => {
  const game = new Game();
  game.coins = 24;
  assert.match(game.farm(0), /coins/);
  assert.equal(game.farms[0], null);
  game.coins = 1000;
  game.farm(0);
  game.farm(0);
  game.farm(0);
  const coins = game.coins;
  assert.match(game.farm(0), /fully/);
  assert.equal(game.coins, coins);
  assert.equal(game.farms[0].level, 3);
  game.coins = 79;
  assert.match(game.unlockPlot(1), /coins/);
  assert.equal(game.unlockedPlots, 1);
});

test('old save migration preserves expedition and refunds replaced gardens', () => {
  const old = {
    version: 1,
    stage: 4,
    coins: 100,
    leaves: 12,
    ore: 8,
    towers: [{ id: 7, type: 'thorn', x: 3, z: 3, level: 1 }],
    farms: [{ type: 'leaves', level: 2 }, null, null, null],
  };
  const game = new Game(old);
  assert.equal(game.version, 2);
  assert.equal(game.stage, 4);
  assert.equal(game.coins, 205);
  assert.equal(game.wood, 12);
  assert.equal(game.rock, 8);
  assert.equal(game.towers[0].id, 7);
  assert.equal(game.unlockedPlots, 1);
  assert.deepEqual(game.farms, [null, null, null, null]);
});

test('real combat earns kills and completes a wave', () => {
  const game = new Game();
  const spots = [
    [2, 3],
    [5, 3],
    [8, 3],
    [10, 5],
  ];
  for (const [x, z] of spots) game.place('thorn', x, z);
  assert.ok(game.start());
  assert.equal(game.start(), false);
  for (let i = 0; i < 3000 && game.active; i++) game.tick(1 / 30);
  assert.equal(game.active, false);
  assert.equal(game.lost, false);
  assert.ok(game.kills > 0);
  assert.equal(game.wave, 1);
});

test('flying enemies ignore maze and armored enemies resist thorn damage', () => {
  const game = new Game();
  const moth = game.enemy('moth');
  assert.equal(moth.flying, true);
  const armor = game.enemy('armor');
  assert.ok(armor.hp > game.enemy('grub').hp);
  game.coins = 1000;
  for (let z = 0; z < 8; z++) game.place('hedge', 6, z);
  game.active = true;
  game.enemies = [moth];
  for (let i = 0; i < 400; i++) game.tick(1 / 30);
  assert.equal(game.lives, 19);
});

test('save resumes a live wave deterministically', () => {
  const original = new Game();
  original.place('thorn', 3, 3);
  original.farm(0);
  original.start();
  for (let i = 0; i < 70; i++) original.tick(1 / 30);
  const restored = new Game(JSON.parse(original.serialize()));
  for (let i = 0; i < 90; i++) {
    original.tick(1 / 30);
    restored.tick(1 / 30);
  }
  assert.deepEqual(JSON.parse(original.serialize()), JSON.parse(restored.serialize()));
});

test('thirty cleared waves finish ten stages while preserving settlement', () => {
  const game = new Game();
  game.place('thorn', 4, 3);
  game.farm(0);
  game.farm(0);
  const tower = game.towers[0];
  for (let i = 0; i < 30; i++) {
    assert.equal(game.start(), true);
    game.queue = [];
    game.enemies = [];
    game.tick(0.01);
  }
  assert.equal(game.stage, 10);
  assert.equal(game.won, true);
  assert.equal(game.towers[0], tower);
  assert.equal(game.farms[0].level, 2);
  assert.equal(game.start(), false);
});

test('loss stops further simulation', () => {
  const game = new Game();
  game.lives = 1;
  game.active = true;
  game.enemies = [{ ...game.enemy('grub'), x: 12, z: 4 }];
  game.tick(0.1);
  assert.equal(game.lost, true);
  assert.equal(game.lives, 0);
  const before = game.serialize();
  game.tick(10);
  assert.equal(game.serialize(), before);
});

test('tower shots retain their event type so the renderer can draw attacks', () => {
  const game = new Game();
  game.place('thorn', 1, 3);
  game.start();
  game.tick(0.05);
  const shot = game.events.find((event) => event.type === 'shot');
  assert.ok(shot);
  assert.equal(shot.towerType, 'thorn');
});
