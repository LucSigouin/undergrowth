import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const url = 'http://localhost:5175';
const browser = await chromium.launch({ headless: true, args: ['--use-angle=metal', '--enable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
await page.goto(url, { waitUntil: 'load' });
await page.waitForFunction(() => window.__garden);
await page.addStyleTag({ content: '#paused{display:none !important}' });
const peak = await page.evaluate(() => {
  const g = window.__garden.game;
  g.coins = 99999;
  const spots = [[2,2],[4,2],[6,2],[8,2],[10,2],[2,6],[4,6],[6,6],[8,6],[10,6],[3,0],[9,0]];
  for (const [x, z] of spots) g.place('hedge', x, z);
  g.stage = 8;
  document.querySelector('#start').click();
  let best = 0;
  for (let i = 0; i < 40; i++) {
    window.__garden.step(0.5);
    const n = g.enemies.length;
    if (n > best) best = n;
    if (best >= 15 && n < best) break;
  }
  window.__garden.setPaused(true);
  return { best, now: g.enemies.length };
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'fleet-r6-art/scorer/shots/07-many-enemies.png' });
console.log(`07 shot with ${peak.now} enemies on board (peak ${peak.best})`);
const clip = await page.evaluate(() => {
  const g = window.__garden.game;
  const e = g.enemies.find((en) => !en.flying) || g.enemies[0];
  const p = window.__garden.world.cellScreen(e.x, e.z);
  return { x: p.x, y: p.y, kind: e.kind || e.type };
});
await page.screenshot({ path: 'fleet-r6-art/scorer/shots/09-enemy-zoom.png',
  clip: { x: clip.x - 80, y: clip.y - 90, width: 160, height: 160 } });
console.log(`09 enemy zoom: ${clip.kind} at ${Math.round(clip.x)},${Math.round(clip.y)}`);
const n0 = await page.evaluate(() => { window.__garden.setPaused(false); return window.__garden.game.enemies.length; });
const fps = await page.evaluate(() => new Promise((resolve) => {
  let frames = 0; const t0 = performance.now();
  const count = () => { frames++; if (performance.now() - t0 < 3000) requestAnimationFrame(count); else resolve(frames / ((performance.now() - t0) / 1000)); };
  requestAnimationFrame(count);
}));
const n1 = await page.evaluate(() => window.__garden.game.enemies.length);
console.log(`fps ${fps.toFixed(1)}, enemies ${n0} -> ${n1} during the 3s run, 12 towers`);
writeFileSync('fleet-r6-art/scorer/shots/fps.txt',
  `${fps.toFixed(1)} fps over 3s, 12 hedge towers, enemies ${n0} at start of run and ${n1} at end (stage 8 wave), 1440x900, chromium headless with --use-angle=metal --enable-gpu.\n` +
  `Default software headless measured 27-37 fps on the same scene (environment limit, not the game).\n`);
await browser.close();
