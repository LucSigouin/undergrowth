// Mid-wave shots at three desktop sizes, to prove the world reaches every window edge.
//   node tools/shoot-sizes.mjs --url http://localhost:5195 --out shots/r9
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback) => (argv.includes(`--${name}`) ? argv[argv.indexOf(`--${name}`) + 1] : fallback);
const url = arg('url', 'http://localhost:5195');
const out = arg('out', 'shots/r9');
const seconds = Number(arg('seconds', '8'));
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  // GPU=1 renders on the real graphics card instead of the software fallback.
  args: process.env.GPU ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});
const only = arg('only', '');
const sizes = [
  [1280, 720],
  [1440, 1000],
  [1920, 1080],
].filter(([w]) => !only || String(w) === only);
for (const [w, h] of sizes) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__garden);
  await page.addStyleTag({ content: '#paused{display:none !important}' });
  await page.waitForTimeout(400);
  await page.evaluate((s) => {
    const g = window.__garden.game;
    g.coins = 2000;
    for (const [t, x, z] of [
      ['thorn', 3, 3],
      ['sap', 6, 3],
      ['thorn', 9, 3],
      ['bloom', 5, 5],
      ['ember', 8, 5],
      ['prism', 10, 3],
    ])
      g.place(t, x, z);
    window.__garden.step(0.1);
    document.querySelector('#start').click();
    window.__garden.step(s);
  }, seconds);
  // Let the live renderer run a moment so effects are in flight, then freeze.
  await page.waitForTimeout(700);
  await page.evaluate(() => window.__garden.setPaused(true));
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(out, `size-${w}x${h}.png`) });
  console.log(`size-${w}x${h}.png`);
  await context.close();
}
await browser.close();
