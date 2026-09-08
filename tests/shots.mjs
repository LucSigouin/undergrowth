// Takes the lane screenshots from a running dev server, headless, into shots/.
// Run it with: GARDEN_URL=http://localhost:5182 node tests/shots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const URL = process.env.GARDEN_URL || 'http://localhost:5182';
const OUT = 'shots';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ headless: true });
const errors = [];

// Open one page at a viewport, with touch on when a phone layout is wanted.
async function open(width, height, phone, calm) {
  const context = await browser.newContext({
    viewport: { width, height },
    hasTouch: !!phone,
    isMobile: !!phone,
    deviceScaleFactor: 2,
    reducedMotion: calm ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push('console: ' + message.text());
  });
  await page.goto(URL);
  await page.waitForFunction(() => window.__garden);
  return page;
}

// Click a board square by asking the running page where that square is.
async function clickCell(page, x, z) {
  const point = await page.evaluate(([x, z]) => window.__garden.world.cellScreen(x, z), [x, z]);
  await page.mouse.click(point.x, point.y);
}

// Move the pointer onto a board square without clicking it.
async function hoverCell(page, x, z) {
  const point = await page.evaluate(([x, z]) => window.__garden.world.cellScreen(x, z), [x, z]);
  await page.mouse.move(point.x, point.y);
}

// A small maze with one of every attacking piece, plus farms, built through the real rules.
async function seed(page, coins = 4000) {
  await page.evaluate((coins) => {
    const game = window.__garden.game;
    game.coins = coins;
    for (const [type, x, z] of [
      ['hedge', 3, 2],
      ['hedge', 3, 3],
      ['hedge', 3, 5],
      ['hedge', 3, 6],
      ['hedge', 7, 2],
      ['hedge', 7, 3],
      ['hedge', 7, 5],
      ['hedge', 7, 6],
      ['thorn', 2, 4],
      ['sap', 4, 3],
      ['bloom', 5, 5],
      ['prism', 9, 3],
      ['ember', 6, 3],
      ['lantern', 5, 3],
      ['thorn', 6, 5],
    ]) {
      game.place(type, x, z);
    }
    game.coins = coins;
    for (const i of [0, 1, 2, 3]) {
      game.unlockPlot(i);
      game.farm(i);
    }
    game.coins = 1240;
    game.wood = 14;
    game.rock = 6;
    game.iron = 3;
    game.diamond = 1;
    window.__garden.step(0.1);
  }, coins);
}

// 1. Desktop, nothing selected, with only 60 coins so most pieces read as unaffordable.
const desktop = await open(1440, 1000, false);
await seed(desktop);
await desktop.evaluate(() => {
  window.__garden.game.coins = 60;
  window.__garden.step(0.1);
});
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: `${OUT}/desktop-idle.png` });

// 2. Desktop mid wave with a tower selected, so the detail panel is open. Stage 5 sends
// a crowd, which is what a mid wave board actually looks like.
await desktop.evaluate(() => {
  window.__garden.game.coins = 1240;
  window.__garden.game.stage = 4;
  window.__garden.step(0.1);
});
await desktop.locator('#start').click();
await desktop.evaluate(() => window.__garden.step(6));
await clickCell(desktop, 9, 3);
await desktop.waitForTimeout(400);
// One short step right before the shutter, so the shot bolts are still in the air.
await desktop.evaluate(() => window.__garden.step(0.25));
await desktop.screenshot({ path: `${OUT}/desktop-wave-detail.png` });

// 3. Desktop with a Lantern hovered, which rings every tower it speeds up.
await hoverCell(desktop, 5, 3);
await desktop.waitForTimeout(400);
await desktop.screenshot({ path: `${OUT}/desktop-lantern-boost.png` });

await desktop.close();

// 5. Phone portrait, mid wave, with the tower sheet open.
const phone = await open(390, 844, true);
await seed(phone);
await phone.evaluate(() => {
  window.__garden.game.stage = 4;
  window.__garden.step(0.1);
});
await phone.locator('#start').click();
await phone.evaluate(() => window.__garden.step(6));
await phone.waitForTimeout(400);
await phone.evaluate(() => window.__garden.step(0.25));
await phone.screenshot({ path: `${OUT}/phone-portrait.png` });
await clickCell(phone, 9, 3);
await phone.waitForTimeout(400);
await phone.screenshot({ path: `${OUT}/phone-portrait-detail.png` });
await phone.close();

// 6. Phone landscape.
const landscape = await open(844, 390, true);
await seed(landscape);
await landscape.evaluate(() => {
  window.__garden.game.stage = 4;
  window.__garden.step(0.1);
});
await landscape.locator('#start').click();
await landscape.evaluate(() => window.__garden.step(6.5));
await landscape.waitForTimeout(500);
await landscape.screenshot({ path: `${OUT}/phone-landscape.png` });
await landscape.close();

// 7. Desktop with the system asking for reduced motion: nothing bobs, nothing flies.
const calm = await open(1440, 1000, false, true);
await seed(calm);
await calm.evaluate(() => {
  window.__garden.game.stage = 4;
  window.__garden.step(0.1);
});
await calm.locator('#start').click();
await calm.evaluate(() => window.__garden.step(6));
await calm.waitForTimeout(300);
await calm.screenshot({ path: `${OUT}/desktop-reduced-motion.png` });
await calm.close();

await browser.close();
if (errors.length) {
  console.error('page errors:', errors);
  process.exit(1);
}
console.log('shots written to ' + OUT);
