// A close crop of the running board for inspecting detail: node tools/peek.mjs x y w h out.png [seconds]
import { chromium } from '@playwright/test';
const [x, y, w, h, out, seconds = '3'] = process.argv.slice(2);
const browser = await chromium.launch({
  headless: true,
  // GPU=1 renders on the real graphics card instead of the software fallback.
  args: process.env.GPU ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
await context.addInitScript(() => localStorage.clear());
const page = await context.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => m.type() === 'error' && console.log('console', m.text()));
await page.goto(process.env.GARDEN_URL || 'http://localhost:5195');
await page.waitForFunction(() => window.__garden);
await page.addStyleTag({ content: '#paused{display:none !important}' });
await page.waitForTimeout(400);
await page.evaluate(([s, stage]) => {
  const g = window.__garden.game;
  g.coins = 2000;
  if (stage) g.stage = stage;
  for (const [t, x, z] of [['thorn', 3, 3], ['sap', 6, 3], ['thorn', 9, 3], ['bloom', 5, 5], ['ember', 8, 5], ['prism', 10, 3]]) g.place(t, x, z);
  window.__garden.step(0.1);
  document.querySelector('#start').click();
  window.__garden.step(Number(s));
}, [seconds, Number(process.env.STAGE || 0)]);
await page.waitForTimeout(Number(process.env.WAIT || 600));
if (!process.env.LIVE) {
  await page.evaluate(() => window.__garden.setPaused(true));
  await page.waitForTimeout(150);
}
await page.screenshot({ path: out, clip: { x: +x, y: +y, width: +w, height: +h } });
await browser.close();
