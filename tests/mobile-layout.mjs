// Phone and tablet layout walkthrough against a running dev server.
// Runs the same script on Chromium and WebKit, in portrait, landscape, and a small phone.
// Run it with: npm run dev, then node tests/mobile-layout.mjs
import { chromium, webkit, devices } from '@playwright/test';
import assert from 'node:assert/strict';

const URL = process.env.GARDEN_URL || 'http://localhost:5174';

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 375, height: 667 },
  ]) {
    const context = await browser.newContext({ ...devices['iPhone 13'], viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.__garden);
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (viewport.width < 700) {
      const sceneWidth = await page.locator('#scene').evaluate((el) => el.clientWidth);
      assert.equal(sceneWidth, viewport.width);
    }
    assert.ok(
      await page.evaluate(() => {
        const world = window.__garden.world;
        const corners = [
          [0, 0],
          [12, 0],
          [0, 8],
          [12, 8],
        ].map(([x, z]) => world.cellScreen(x, z));
        const status = document.querySelector('.map-status').getBoundingClientRect();
        const controls = document.querySelector('.map-controls').getBoundingClientRect();
        const entry = world.cellScreen(0, 4),
          exit = world.cellScreen(12, 4);
        return (
          Math.abs(entry.x - exit.x) < 0.01 &&
          entry.y < exit.y &&
          corners.every((cell) => cell.y > status.bottom && cell.y < controls.top)
        );
      }),
      'fitted board squares must stay clear of phone controls',
    );
    // Every control a thumb has to hit must be at least 44 pixels tall.
    const touchTargets = [
      '#start',
      '#pause',
      '#speed',
      '[data-build="thorn"]',
      '[data-hud-garden="0"]',
      '#tower-info',
      '#settings',
    ];
    for (const selector of touchTargets) {
      const tallEnough = await page
        .locator(selector)
        .evaluate((el) => el.getBoundingClientRect().height >= 44);
      assert.ok(tallEnough, selector);
    }
    await page.screenshot({ path: `test-results/${name}-mobile-${viewport.width}.png` });
    // Choosing a piece offers an explanation before spending any coins.
    await page.locator('[data-build="sap"]').tap();
    await page.locator('#tower-info').tap();
    assert.match(await page.locator('#modal').textContent(), /52% for 2.2 seconds/);
    assert.equal(await page.locator('#modal [aria-label="Damage per hit"]').count(), 1);
    assert.equal(await page.evaluate(() => window.__garden.game.coins), 200);
    await page.locator('#modal-ok').tap();
    assert.equal(await page.locator('[data-build="sap"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-build="thorn"]').tap();
    await page.locator('[data-hud-garden="0"]').tap();
    await page.locator('[data-farm="0"]').tap();
    assert.equal(await page.evaluate(() => window.__garden.game.farms[0].level), 1);
    await page.locator('#close-garden').tap();
    const cell = await page.evaluate(() => window.__garden.world.cellScreen(3, 3));
    await page.touchscreen.tap(cell.x, cell.y);
    assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 0);
    assert.ok(await page.locator('#placement').isVisible());
    await page.locator('#confirm-place').tap();
    assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 1);
    await page.locator('#zoom').tap();
    assert.equal(await page.evaluate(() => window.__garden.world.zoom), 1.5);
    const beforePan = await page.evaluate(() => window.__garden.world.target.toArray());
    const box = await page.locator('#scene').boundingBox();
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.5 + 35, box.y + box.height * 0.5 + 20, {
      steps: 5,
    });
    await page.mouse.up();
    assert.notDeepEqual(
      await page.evaluate(() => window.__garden.world.target.toArray()),
      beforePan,
    );
    assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 1);
    await page.locator('#fit').tap();
    await page.touchscreen.tap(cell.x, cell.y);
    assert.ok(await page.locator('#detail').isVisible());
    await page.locator('#close-detail').tap();
    await page.locator('#start').tap();
    await page.waitForFunction(() => window.__garden.game.enemies.length > 0);
    await page.locator('#pause').tap();
    assert.equal(await page.locator('#paused').isVisible(), true);
    await page.locator('#pause').tap();
    await page.locator('#speed').tap();
    assert.equal(await page.locator('#speed').textContent(), '2×');
    assert.equal(await page.evaluate(() => document.querySelector('#paused').hidden), true);
    await page.locator('#settings').tap();
    await page.locator('#restart').tap();
    await page.locator('#modal-cancel').tap();
    assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 1);
    await page.screenshot({ path: `test-results/${name}-mobile-playing-${viewport.width}.png` });
    assert.deepEqual(errors, []);
    console.log(
      `${name} ${viewport.width}×${viewport.height}: layout, 44px controls,` +
        ' garden purchase, placement preview/confirm, zoom, tower details,' +
        ' real-time stage, menu checked.',
    );
    await context.close();
  }
  await browser.close();
}
