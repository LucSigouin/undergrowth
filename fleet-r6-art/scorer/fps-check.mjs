import { chromium } from '@playwright/test';
const url = 'http://localhost:5175';
const measure = (page) =>
  page.evaluate(
    () =>
      new Promise((resolve) => {
        let frames = 0;
        const t0 = performance.now();
        const count = () => {
          frames++;
          if (performance.now() - t0 < 2000) requestAnimationFrame(count);
          else resolve(frames / ((performance.now() - t0) / 1000));
        };
        requestAnimationFrame(count);
      }),
  );
for (const args of [[], ['--use-angle=metal', '--enable-gpu']]) {
  const browser = await chromium.launch({ headless: true, args });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => { try { localStorage.clear(); } catch {} });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__garden);
  const empty = await measure(page);
  await page.evaluate(() => {
    const g = window.__garden.game;
    g.coins = 99999;
    const spots = [[2,2],[4,2],[6,2],[8,2],[10,2],[2,6],[4,6],[6,6],[8,6],[10,6],[3,0],[9,0]];
    for (const [x, z] of spots) g.place('hedge', x, z);
    g.stage = 7;
    document.querySelector('#start').click();
    window.__garden.step(9);
  });
  const n = await page.evaluate(() => window.__garden.game.enemies.length);
  const loaded = await measure(page);
  console.log(`args=[${args}] empty board: ${empty.toFixed(1)} fps, ${n} enemies + 12 hedges: ${loaded.toFixed(1)} fps`);
  await browser.close();
}
