import { chromium, devices } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('./shots/', import.meta.url));
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const states = [];
const errors = [];
async function open(profile) {
  const context = await browser.newContext(profile);
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('http://localhost:5177');
  await page.waitForFunction(() => window.__garden);
  await page.addStyleTag({ content: '#paused{display:none !important}' });
  await page.evaluate(() => window.__garden.setPaused(true));
  return { context, page };
}
async function shot(page, name, description) {
  await page.waitForTimeout(700);
  const state = await page.evaluate(() => {
    const { game, world } = window.__garden;
    return {
      towers: game.towers.map(({ type, level, x, z }) => ({ type, level, x, z })),
      enemies: game.enemies.map(({ kind, x, z, target }) => ({ kind, x, z, target })),
      active: game.active, entry: world.cellScreen(0, 4), exit: world.cellScreen(12, 4),
    };
  });
  await page.screenshot({ path: out + name });
  states.push({ name, description, ...state });
  console.log(`${name}: ${state.towers.length} engines, ${state.enemies.length} creatures`);
}

{
  const { context, page } = await open({ viewport: { width: 1440, height: 1000 } });
  await page.evaluate(() => {
    const { game, world } = window.__garden;
    game.coins = 99999;
    const kinds = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern'];
    for (let row = 0; row < kinds.length; row++) {
      for (let level = 1; level <= 3; level++) {
        game.place(kinds[row], row + 2, 8 - level * 2);
        game.towers.at(-1).level = level;
      }
    }
    game.enemies = ['grub', 'runner', 'armor', 'moth', 'brood', 'grubling', 'warden', 'boss'].map((kind, i) => ({
      ...game.enemy(kind), x: 10.5, z: 8 - i * 1.1,
    }));
    window.__garden.step(0);
    world.sync(game, 0);
  });
  assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 21);
  await shot(page, '06-all-engines-levels.png', 'Seven engine rows in build-menu order; levels 1, 2, 3 left to right. Eight creature kinds on the bottom row, screen-up.');
  const metrics = await page.evaluate(async () => {
    const { world, game } = window.__garden;
    const { ENEMY_LOOK } = await import('/src/look.js');
    const gates = world.board.children.filter((m) => /gate-(entry|exit)/.test(m.material?.map?.image?.src || ''));
    const idle = game.towers.filter((t) => t.type === 'thorn').map((t) => {
      const m = world.towerMeshes.get(t.id);
      return m.userData.head.rotation.y + m.userData.sprite.rotation.y;
    });
    return { idleBallistaRadians: idle, enemyPlaneSquares: Object.fromEntries(Object.entries(ENEMY_LOOK).map(([kind, look]) => [kind, look.sprite])), gates: gates.map((m) => ({ x: m.position.x, z: m.position.z })) };
  });
  assert.deepEqual(metrics.idleBallistaRadians, [0, 0, 0]);
  assert.deepEqual(metrics.gates, [{ x: 0, z: 4 }, { x: 12, z: 4 }]);
  writeFileSync(out + 'sprite-metrics.json', JSON.stringify(metrics, null, 2) + '\n');
  await context.close();
}

{
  const { context, page } = await open({ viewport: { width: 1440, height: 1000 } });
  await page.evaluate(() => {
    const { game, world } = window.__garden;
    game.coins = 99999;
    const directions = [[-1, 0], [0, -1], [1, 0], [0, 1]];
    directions.forEach(([dx, dz], i) => {
      const x = 2 + i * 2.5, z = 4;
      game.towers.push({ id: game.nextId++, type: 'thorn', level: i % 3 + 1, branch: 'power', x, z, cooldown: 0 });
      game.enemies.push({ ...game.enemy('grub'), x: x + dx * 1.4, z: z + dz * 1.4, target: { x: x + dx * 2, z: z + dz * 2 } });
    });
    world.sync(game, 0);
    game.towers.forEach((t, i) => {
      const e = game.enemies[i];
      world.playEvent({ type: 'shot', tower: t.id, towerType: t.type, x: e.x, z: e.z }, game);
    });
    window.__garden.step(0);
  });
  await shot(page, '07-facing-four-directions.png', 'Four Ballistas target Goblins toward screen up, right, down, left, in top-to-bottom order.');
  await context.close();
}

for (const [name, profile] of [
  ['08-many-creatures-desktop.png', { viewport: { width: 1440, height: 900 } }],
  ['09-many-creatures-portrait.png', devices['iPhone 13']],
  ['10-many-creatures-landscape.png', devices['iPhone 13 landscape']],
]) {
  const { context, page } = await open(profile);
  await page.evaluate(async () => {
    const { game, world } = window.__garden;
    const { path } = await import('/src/game.js');
    game.coins = 99999;
    ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern'].forEach((type, i) => {
      game.place(type, 2 + i, 3);
      game.towers.at(-1).level = i % 3 + 1;
    });
    game.stage = 4;
    game.wave = 2;
    game.start();
    window.__garden.step(5);
    const route = path(game.towers);
    const kinds = ['grub', 'runner', 'armor', 'moth', 'brood', 'grubling', 'warden', 'boss'];
    game.enemies = Array.from({ length: 24 }, (_, i) => {
      const distance = 0.7 + i * 0.43;
      const at = Math.floor(distance);
      const a = route[at], b = route[at + 1], f = distance - at;
      return { ...game.enemy(kinds[i % kinds.length]), x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, target: { ...b } };
    });
    window.__garden.step(0);
    world.sync(game, 0);
  });
  assert.equal(await page.evaluate(() => window.__garden.game.active), true);
  await shot(page, name, 'Paused mid-wave visual fixture: 24 creatures spanning all eight kinds on the real route, with seven engines.');
  await context.close();
}

await browser.close();
writeFileSync(out + 'extra-states.json', JSON.stringify(states, null, 2) + '\n');
assert.deepEqual(errors, []);
