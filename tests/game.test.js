// Unit tests for the rules engine in src/game.js. They cover routing, building,
// the garden economy, save migration, real combat, campaign progression, and the
// events the renderer listens to. Nothing here touches a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, WAVES, ABILITIES, path } from '../src/game.js';

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
  // The level 1 to 2 step is coins only in r2, so the wood is untouched.
  assert.equal(game.wood, 6);
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
  game.coins = 59;
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
  assert.equal(game.version, 3);
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

test('waves come from the hand written table and match the stage they belong to', () => {
  const game = new Game();
  assert.equal(WAVES.length, 30);
  assert.deepEqual(game.waveQueue(0, 1), Array(6).fill('grub'));
  // Stage 3 is Shell season, so armor has to be in all three of its waves.
  for (const wave of [1, 2, 3]) assert.ok(game.waveQueue(2, wave).includes('armor'));
  // Stage 4 is On the breeze, so every wave has to carry moths.
  for (const wave of [1, 2, 3]) assert.ok(game.waveQueue(3, wave).includes('moth'));
  // Stage 5 is where brood sacs start, and stage 7 is where wardens start.
  assert.ok(game.waveQueue(4, 1).includes('brood'));
  assert.ok(game.waveQueue(6, 1).includes('warden'));
  assert.ok(!game.waveQueue(3, 3).includes('warden'));
  // Bosses only walk in on the stages whose text says so: 6, 9 and 10.
  const bossWaves = [];
  for (let stage = 0; stage < 10; stage++) {
    for (let wave = 1; wave <= 3; wave++) {
      if (game.waveQueue(stage, wave).includes('boss')) bossWaves.push(`${stage + 1}-${wave}`);
    }
  }
  assert.deepEqual(bossWaves, ['6-3', '9-3', '10-3']);
  game.start();
  assert.deepEqual(game.queue, game.waveQueue(0, 1));
});

test('a wave releases its enemies in table order at the pace the table asks for', () => {
  const game = new Game();
  game.stage = 4;
  game.start();
  const entry = game.waveEntry();
  assert.ok(entry.burst >= 2);
  game.tick(1 / 30);
  assert.equal(game.enemies.length, entry.burst);
  assert.equal(game.enemies[0].kind, game.waveQueue(4, 1)[0]);
  game.tick(entry.gap);
  assert.equal(game.enemies.length, entry.burst * 2);
});

test('a brood sac bursts into three grublings where it died', () => {
  const game = new Game();
  game.active = true;
  const brood = { ...game.enemy('brood'), x: 5, z: 4, hp: 0 };
  game.enemies = [brood];
  game.tick(1 / 30);
  const litter = game.enemies.filter((enemy) => enemy.kind === 'grubling');
  assert.equal(litter.length, 3);
  assert.ok(Math.abs(litter[0].x - 5) < 0.2);
  assert.ok(litter[0].maxHp < brood.maxHp);
  assert.equal(
    game.enemies.some((enemy) => enemy.kind === 'brood'),
    false,
  );
});

test('bloom clears a whole litter in one burst, which a thorn cannot', () => {
  const near = (game) => {
    game.active = true;
    game.enemies = [0, 0.4, -0.4].map((offset) => ({
      ...game.enemy('grubling'),
      x: 5 + offset,
      z: 4,
    }));
  };
  const withBloom = new Game();
  withBloom.coins = 500;
  withBloom.place('bloom', 5, 3);
  near(withBloom);
  const withThorn = new Game();
  withThorn.coins = 500;
  withThorn.place('thorn', 5, 3);
  near(withThorn);
  withBloom.tick(1 / 30);
  withThorn.tick(1 / 30);
  assert.equal(withBloom.kills, 3);
  assert.equal(withThorn.kills, 1);
});

test('a warden ignores sap and shields the enemy standing beside it', () => {
  const game = new Game();
  game.coins = 500;
  game.place('sap', 5, 3);
  game.active = true;
  const warden = { ...game.enemy('warden'), x: 5, z: 4 };
  const grub = { ...game.enemy('grub'), x: 5.3, z: 4 };
  game.enemies = [warden, grub];
  assert.equal(game.shieldFactor(grub) < 1, true);
  assert.equal(game.shieldFactor(warden), 1);
  game.tick(1 / 30);
  assert.equal(warden.slow, 0);
  const alone = new Game();
  alone.active = true;
  const lonely = { ...alone.enemy('grub'), x: 5.3, z: 4 };
  alone.enemies = [lonely];
  assert.equal(alone.shieldFactor(lonely), 1);
});

test('ember burning keeps working after the shot and ignores armor and shields', () => {
  const game = new Game();
  game.coins = 500;
  game.place('ember', 5, 3);
  game.active = true;
  const beetle = { ...game.enemy('armor'), x: 5, z: 4 };
  game.enemies = [beetle];
  game.tick(1 / 30);
  assert.ok(beetle.burn > 0);
  assert.equal(beetle.burnTime, 5);
  // Walk it far out of range and check the burn is still eating hit points.
  beetle.x = 12;
  beetle.z = 8;
  const before = beetle.hp;
  game.tick(1);
  assert.ok(before - beetle.hp >= beetle.burn * 0.9);
});

test('a lantern never shoots and speeds up every tower inside its ring', () => {
  const game = new Game();
  game.coins = 1000;
  game.place('thorn', 5, 3);
  game.place('lantern', 5, 4);
  const [thorn, lantern] = game.towers;
  assert.ok(game.rateBonus(thorn) > 1);
  assert.equal(game.rateBonus(lantern), 1);
  game.place('thorn', 1, 1);
  assert.equal(game.rateBonus(game.towers[2]), 1);
  game.active = true;
  game.enemies = [{ ...game.enemy('grub'), x: 5, z: 4.4 }];
  game.tick(1 / 30);
  const fired = game.events.filter((event) => event.type === 'shot');
  assert.equal(fired.length, 1);
  assert.equal(fired[0].towerType, 'thorn');
  assert.ok(thorn.cool < game.stats(thorn).rate);
});

test('rootgrip holds walking enemies, refuses while cooling, and survives a save', () => {
  const game = new Game();
  game.active = true;
  const grub = { ...game.enemy('grub'), x: 3, z: 4 };
  const moth = { ...game.enemy('moth'), x: 3, z: 4 };
  game.enemies = [grub, moth];
  assert.equal(game.useAbility('rootgrip'), null);
  assert.match(game.useAbility('rootgrip'), /gathering/);
  const startX = grub.x;
  game.tick(1);
  assert.equal(grub.x, startX);
  assert.ok(moth.x > startX);
  const restored = new Game(JSON.parse(game.serialize()));
  assert.ok(restored.cooldowns.rootgrip > 40);
  assert.match(restored.useAbility('rootgrip'), /gathering/);
  restored.tick(60);
  assert.equal(restored.abilityState('rootgrip').ready, true);
});

test('sunburst needs a square and only damages what is close to it', () => {
  const game = new Game();
  game.active = true;
  const near = { ...game.enemy('grub'), x: 6, z: 4 };
  const far = { ...game.enemy('grub'), x: 11, z: 8 };
  game.enemies = [near, far];
  assert.match(game.useAbility('sunburst'), /square/);
  assert.match(game.useAbility('sunburst', { x: 40, z: 2 }), /square/);
  assert.equal(game.cooldowns.sunburst, 0);
  assert.equal(game.useAbility('sunburst', { x: 6, z: 4 }), null);
  assert.ok(near.hp < near.maxHp);
  assert.equal(far.hp, far.maxHp);
  assert.equal(game.cooldowns.sunburst, ABILITIES.sunburst.cooldown);
});

test('the first upgrade costs coins only and the panel names what is missing', () => {
  const game = new Game();
  game.coins = 500;
  game.place('thorn', 5, 3);
  const tower = game.towers[0];
  assert.equal(game.upgradeCost(tower).wood, 0);
  assert.deepEqual(game.upgradeShortfall(tower), []);
  assert.equal(game.upgrade(tower.id, 'power'), null);
  assert.equal(tower.level, 2);
  const missing = game.upgradeShortfall(tower);
  assert.ok(missing.some((item) => item.id === 'wood'));
  assert.ok(missing.some((item) => item.id === 'rock'));
  assert.equal(missing.find((item) => item.id === 'wood').have, 0);
  assert.match(game.upgrade(tower.id, 'power'), /materials/);
});

test('a version 2 save loads as version 3 with towers, farms, stage and coins intact', () => {
  const saved = {
    version: 2,
    stage: 5,
    wave: 1,
    coins: 342,
    wood: 20,
    rock: 11,
    iron: 4,
    diamond: 1,
    lives: 14,
    unlockedPlots: 3,
    towers: [
      { id: 3, type: 'thorn', x: 4, z: 3, level: 2, branch: 'power', cool: 0, spent: 59 },
      { id: 4, type: 'hedge', x: 4, z: 4, level: 1, branch: null, cool: 0, spent: 8 },
    ],
    farms: [
      { type: 'wood', level: 3, progress: 2 },
      { type: 'rock', level: 1, progress: 0 },
      null,
      null,
    ],
    nextId: 5,
    kills: 88,
  };
  const game = new Game(saved);
  assert.equal(game.version, 3);
  assert.equal(game.stage, 5);
  assert.equal(game.wave, 1);
  assert.equal(game.coins, 342);
  assert.equal(game.lives, 14);
  assert.equal(game.towers.length, 2);
  assert.equal(game.towers[0].branch, 'power');
  assert.equal(game.farms[0].level, 3);
  assert.equal(game.farms[1].type, 'rock');
  assert.equal(game.unlockedPlots, 3);
  assert.deepEqual(game.cooldowns, { rootgrip: 0, sunburst: 0 });
  assert.equal(game.root, 0);
});

test('a version 1 save still migrates all the way to version 3', () => {
  const game = new Game({
    version: 1,
    stage: 4,
    coins: 100,
    leaves: 12,
    ore: 8,
    towers: [{ id: 7, type: 'thorn', x: 3, z: 3, level: 1 }],
    farms: [{ type: 'leaves', level: 2 }, null, null, null],
  });
  assert.equal(game.version, 3);
  assert.equal(game.stage, 4);
  assert.equal(game.wood, 12);
  assert.equal(game.coins, 205);
  assert.equal(game.abilityState('sunburst').ready, true);
});
