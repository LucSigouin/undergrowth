// Live playback checks on phones against a running dev server.
// A tap must start a moving wave, pause and resume must keep it, and leaving and
// returning to the tab must restore whatever the player had chosen.
// Run it with: npm run dev, then node tests/mobile-live.mjs
import { chromium, webkit, devices } from '@playwright/test';
import assert from 'node:assert/strict';

const URL = process.env.GARDEN_URL || 'http://localhost:5174';

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch();
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    const context = await browser.newContext({ ...devices['iPhone 13'], viewport });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(URL);
    await page.waitForFunction(() => window.__garden);
    await page.locator('#start').tap();
    await page.waitForFunction(() => window.__garden.game.enemies.some((enemy) => enemy.x > 1));
    assert.equal(await page.locator('#start').textContent(), 'Wave in progress…');
    await page.locator('#pause').tap();
    assert.equal(await page.locator('#start').textContent(), 'Resume wave ▶');
    const startX = await page.evaluate(() => window.__garden.game.enemies[0].x);
    await page.locator('#start').tap();
    await page.waitForFunction((x) => window.__garden.game.enemies[0].x > x + 0.5, startX);
    assert.equal(await page.evaluate(() => window.__garden.game.wave), 1);
    const visibility = async (hidden) =>
      page.evaluate((hidden) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        document.dispatchEvent(new Event('visibilitychange'));
      }, hidden);
    await visibility(true);
    assert.equal(await page.locator('#paused').isVisible(), true);
    await visibility(false);
    assert.equal(await page.locator('#paused').isVisible(), false);
    await page.locator('#pause').tap();
    await visibility(true);
    await visibility(false);
    assert.equal(await page.locator('#paused').isVisible(), true);
    await page.locator('#start').tap();
    await page.screenshot({ path: `test-results/${name}-live-${viewport.width}.png` });
    assert.deepEqual(errors, []);
    console.log(
      `${name} ${viewport.width}×${viewport.height}: touch starts a moving wave;` +
        ' resume preserves the wave; tab return restores playback;' +
        ' manual pause preserved; no browser errors.',
    );
    await context.close();
  }
  await browser.close();
}
