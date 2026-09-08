// Lane screenshots for r5 layout, headless, into fleet-r5-layout/layout/shots/.
// Run it with: GARDEN_URL=http://localhost:5174 node fleet-r5-layout/layout/lane-shots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const URL = process.env.GARDEN_URL || 'http://localhost:5174';
const OUT = 'fleet-r5-layout/layout/shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

// A small maze, four working plots and some materials, built through the real rules.
async function seed(page) {
  await page.evaluate(() => {
    const game = window.__garden.game;
    game.coins = 4000;
    for (const [type, x, z] of [
      ['hedge', 3, 2],
      ['hedge', 3, 3],
      ['hedge', 3, 5],
      ['thorn', 2, 4],
      ['sap', 4, 3],
      ['bloom', 5, 5],
      ['prism', 9, 3],
      ['ember', 6, 3],
      ['lantern', 5, 3],
    ]) {
      game.place(type, x, z);
    }
    game.coins = 4000;
    for (const i of [0, 1, 2, 3]) {
      game.unlockPlot(i);
      game.farm(i);
    }
    game.coins = 240;
    game.wood = 14;
    game.rock = 6;
    game.iron = 3;
    game.diamond = 1;
    window.__garden.step(0.1);
  });
}

async function shot(name, width, height, phone, hover) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: !!phone,
    isMobile: !!phone,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(`${name}: ${error.message}`));
  await page.goto(URL);
  await page.waitForFunction(() => window.__garden);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__garden);
  await seed(page);
  await page.waitForTimeout(400);
  if (hover) {
    await page.locator(`[data-build="${hover}"]`).hover();
    await page.waitForTimeout(250);
  }
  await page.screenshot({ path: `${OUT}/${name}.png` });
  await context.close();
}

// The four required sizes, plain, so the materials HUD and the whole column are in view.
await shot('desktop-1280x720', 1280, 720, false);
await shot('desktop-1920x1080', 1920, 1080, false);
await shot('phone-390x844', 390, 844, true);
await shot('phone-844x390', 844, 390, true);
// Two more that show what the hover note looks like.
await shot('desktop-1280x720-hover-note', 1280, 720, false, 'sap');
await shot('desktop-1920x1080-hover-note', 1920, 1080, false, 'lantern');
await browser.close();

if (errors.length) {
  console.error('page errors:', errors);
  process.exit(1);
}
console.log('lane shots written to ' + OUT);
