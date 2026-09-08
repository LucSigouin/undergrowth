// Based on the r6 frame probe. Keep all 20 moving creatures on the board throughout.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const lane = fileURLToPath(new URL('./', import.meta.url));
const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.addInitScript(() => localStorage.clear());
await page.goto(process.env.GARDEN_URL || 'http://localhost:5177');
await page.waitForFunction(() => window.__garden);
await page.evaluate(() => {
  const { game } = window.__garden;
  game.coins = 99999;
  const spots = [];
  for (const z of [2, 6, 7]) for (let x = 2; x <= 10; x += 2) if (spots.length < 12) spots.push([x, z]);
  const kinds = ['thorn', 'sap', 'bloom', 'prism', 'ember', 'lantern'];
  spots.forEach(([x, z], i) => {
    game.place(kinds[i % kinds.length], x, z);
    game.towers.at(-1).level = 3;
  });
  game.start();
  game.queue = [];
  const all = ['grub', 'runner', 'armor', 'moth', 'brood', 'grubling', 'warden', 'boss'];
  game.enemies = Array.from({ length: 20 }, (_, i) => ({
    ...game.enemy(all[i % all.length]), x: 0.5 + i * 0.5, z: 4, hp: 100000, maxHp: 100000,
  }));
  window.__garden.step(0);
  const keepOnBoard = () => {
    for (const enemy of game.enemies) if (enemy.x > 10.5) {
      enemy.x = 0.5;
      enemy.z = 4;
      enemy.target = null;
    }
    requestAnimationFrame(keepOnBoard);
  };
  requestAnimationFrame(keepOnBoard);
});
await page.waitForTimeout(1500);
const result = await page.evaluate(() => new Promise((done) => {
  const times = [];
  const counts = [];
  const start = performance.now();
  const tick = (now) => {
    times.push(now);
    const { game } = window.__garden;
    counts.push([game.towers.length, game.enemies.length]);
    if (now - start < 5000) requestAnimationFrame(tick);
    else {
      const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
      const gl = document.querySelector('#scene canvas').getContext('webgl2');
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      done({
        viewport: { width: 1440, height: 900 }, frames: times.length,
        fps: +(1000 * (times.length - 1) / (times.at(-1) - times[0])).toFixed(1),
        medianMs: +gaps[gaps.length >> 1].toFixed(2), p95Ms: +gaps[Math.floor(gaps.length * 0.95)].toFixed(2),
        minTowers: Math.min(...counts.map(([n]) => n)), maxTowers: Math.max(...counts.map(([n]) => n)),
        minEnemies: Math.min(...counts.map(([, n]) => n)), maxEnemies: Math.max(...counts.map(([, n]) => n)),
        active: game.active, driver: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown',
      });
    }
  };
  requestAnimationFrame(tick);
}));
await page.screenshot({ path: lane + 'shots/11-fps-scene.png' });
await browser.close();
writeFileSync(lane + 'fps.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
assert.deepEqual(errors, []);
assert.equal(result.minTowers, 12);
assert.equal(result.maxTowers, 12);
assert.equal(result.minEnemies, 20);
assert.equal(result.maxEnemies, 20);
assert.equal(result.active, true);
