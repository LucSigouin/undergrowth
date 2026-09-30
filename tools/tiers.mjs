// Close-up of every engine at levels 1, 2 and 3, plus a boss wave, in two frames a second apart.
//   node tools/tiers.mjs --url http://localhost:5196 --out shots/r10
import { chromium } from '@playwright/test';
const argv = process.argv.slice(2);
const arg = (name, fallback) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback);
const url = arg('url', 'http://localhost:5196');
const out = arg('out', 'shots/r10');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await context.addInitScript(() => localStorage.clear());
const page = await context.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(url);
await page.waitForFunction(() => window.__garden);
await page.addStyleTag({ content: '#paused{display:none !important}' });
await page.waitForTimeout(500);
await page.evaluate(() => {
  const g = window.__garden.game;
  g.coins = 99999;
  const types = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern'];
  types.forEach((t, i) => {
    for (let level = 1; level <= 3; level++) {
      const x = 1 + i + (i > 2 ? 1 : 0), z = level === 1 ? 1 : level === 2 ? 2 : 6 + (level === 3 ? 1 : 0);
      g.place(t, x, z); const tw = g.towers.find((c) => c.x === x && c.z === z); if (tw) tw.level = level;
    }
  });
  g.stage = 9;
  window.__garden.step(0.1);
  document.querySelector('#start').click();
  window.__garden.step(6);
});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/tiers-a.png`, clip: { x: 0, y: 60, width: 1100, height: 940 } });
await page.waitForTimeout(1000);
await page.screenshot({ path: `${out}/tiers-b.png`, clip: { x: 0, y: 60, width: 1100, height: 940 } });
console.log(await page.evaluate(() => window.__garden.game.towers.map((t) => `${t.type}${t.level}@${t.x},${t.z}`).join(' ')));
await browser.close();
