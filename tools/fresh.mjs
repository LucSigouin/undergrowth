// Fresh board shot at one size, optional hover in build mode: node tools/fresh.mjs out.png [w h] [hover]
import { chromium } from '@playwright/test';
const [out, w = '1440', h = '1000', hover] = process.argv.slice(2);
const browser = await chromium.launch({
  headless: true,
  // GPU=1 renders on the real graphics card instead of the software fallback.
  args: process.env.GPU ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});
const context = await browser.newContext({ viewport: { width: +w, height: +h } });
await context.addInitScript(() => localStorage.clear());
const page = await context.newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(process.env.GARDEN_URL || 'http://localhost:5195');
await page.waitForFunction(() => window.__garden);
await page.waitForTimeout(800);
if (hover) {
  const p = await page.evaluate(() => window.__garden.world.cellScreen(4, 6));
  await page.mouse.move(p.x, p.y);
  await page.waitForTimeout(500);
}
await page.screenshot({ path: out });
await browser.close();
