// Frame timing at 1440x900 with 12 towers and 20 creatures on the board.
// It counts real requestAnimationFrame callbacks over five seconds while the game runs.
import { chromium } from '@playwright/test';
const URL = process.env.GARDEN_URL || 'http://127.0.0.1:5174';
const gpu = process.env.GPU === '1';
const b = await chromium.launch({ headless: true, args: gpu ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.addInitScript(() => { try { localStorage.clear(); } catch {} });
await p.goto(URL);
await p.waitForFunction(() => window.__garden);
const built = await p.evaluate(() => {
  const { game } = window.__garden;
  game.coins = 99999;
  const spots = [];
  for (const z of [2, 6, 7]) for (let x = 2; x <= 10; x += 2) if (spots.length < 12) spots.push([x, z]);
  const kinds = ['thorn','sap','bloom','prism','ember','lantern'];
  spots.forEach(([x, z], i) => game.place(kinds[i % kinds.length], x, z));
  for (const t of game.towers) t.level = 3;
  document.querySelector('#start').click();
  window.__garden.step(3);
  const base = game.enemies[0] || { hp: 100, maxHp: 100, speed: 1 };
  const all = ['grub','runner','armor','moth','brood','grubling','warden','boss'];
  game.enemies = Array.from({ length: 20 }, (_, i) => ({
    ...base, id: 1000 + i, kind: all[i % all.length], x: 0.5 + i * 0.55, z: 4,
    hp: 100000, maxHp: 100000, flying: all[i % all.length] === 'moth',
    target: { x: 12, z: 4 },
  }));
  return { towers: game.towers.length, enemies: game.enemies.length };
});
await p.waitForTimeout(1200);
const fps = await p.evaluate(() => new Promise((done) => {
  const times = [];
  const start = performance.now();
  const tick = (now) => { times.push(now); if (now - start < 5000) requestAnimationFrame(tick); else {
    const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
    done({ frames: times.length, fps: +(1000 * (times.length - 1) / (times.at(-1) - times[0])).toFixed(1),
           medianMs: +gaps[gaps.length >> 1].toFixed(2), p95Ms: +gaps[Math.floor(gaps.length * 0.95)].toFixed(2) });
  } };
  requestAnimationFrame(tick);
}));
const driver = await p.evaluate(() => {
  const gl = document.querySelector('#scene canvas').getContext('webgl2') || document.querySelector('#scene canvas').getContext('webgl');
  const d = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unknown';
});
console.log(JSON.stringify({ ...built, ...fps, driver }));
await b.close();
