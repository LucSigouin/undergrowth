// Desktop and phone browser walkthrough against a running dev server.
// Checks the layout, the garden economy, combat, save and reload, the controls, and the
// r2 additions: the Ember and Lantern cards, both abilities, and the missing material note.
// Run it with: npm run dev -- --port 5174, then node tests/browser.mjs
// Point it somewhere else with GARDEN_URL=http://localhost:5175 node tests/browser.mjs
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';

const URL = process.env.GARDEN_URL || 'http://localhost:5174';
// The smoke test writes into test-results/, which is disposable. A check must never
// write into a frozen artifact directory.
const SHOTS = 'test-results';
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(URL);
await page.waitForFunction(() => window.__garden);

// The board must be square on screen, and the map must take three quarters of the width.
assert.ok(
  await page.evaluate(() => {
    const world = window.__garden.world,
      topLeft = world.cellScreen(0, 0),
      topRight = world.cellScreen(12, 0),
      bottomLeft = world.cellScreen(0, 8),
      scene = document.querySelector('#scene').getBoundingClientRect(),
      garden = document.querySelector('.garden-strip').getBoundingClientRect();
    return (
      Math.abs(topLeft.y - topRight.y) < 0.01 &&
      Math.abs(topLeft.x - bottomLeft.x) < 0.01 &&
      Math.abs(scene.width - innerWidth * 0.75) < 1 &&
      garden.bottom <= scene.top + 1
    );
  }),
);
assert.equal(await page.locator('[data-unlock="1"]').isDisabled(), true);
assert.equal(await page.locator('[data-plot="0"] small').textContent(), 'Not producing');
await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
await page.locator('[data-farm="0"]').click();
assert.equal(await page.evaluate(() => window.__garden.game.coins), 175);
await page.locator('[data-farm="0"]').click();
assert.equal(await page.evaluate(() => window.__garden.game.farms[0].level), 2);
assert.equal(await page.locator('[data-unlock="1"]').isDisabled(), false);
// Click a board square by asking the running page where that square is.
const clickCell = async (x, z) => {
  const point = await page.evaluate(([x, z]) => window.__garden.world.cellScreen(x, z), [x, z]);
  await page.mouse.click(point.x, point.y);
};
await clickCell(3, 3);
await page.locator('[data-build="sap"]').click();
await clickCell(6, 3);
await page.locator('[data-build="thorn"]').click();
await clickCell(9, 3);
assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 3);
await page.locator('#start').click();
await page.evaluate(() => window.__garden.step(21));
assert.ok(await page.evaluate(() => window.__garden.game.wood >= 12));
await clickCell(3, 3);
await page.locator('[data-upgrade="reach"]').click();
assert.equal(await page.evaluate(() => window.__garden.game.towers[0].level), 2);
await page.screenshot({ path: 'test-results/combat.png', fullPage: true });
await page.evaluate(() => window.__garden.save());
await page.reload();
await page.waitForFunction(() => window.__garden);
assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 3);
assert.equal(await page.evaluate(() => window.__garden.game.farms[0].level), 2);
await page.evaluate(() => {
  window.__garden.game.coins = 1000;
  window.__garden.step(0.1);
});
for (const i of [1, 2, 3]) {
  await page.locator(`[data-unlock="${i}"]`).click();
  assert.equal(await page.locator(`[data-plot="${i}"] small`).textContent(), 'Not producing');
  await page.locator(`[data-farm="${i}"]`).click();
}
// A plot collects every 10 seconds. Stepping exactly 10 lands on the boundary, where
// summing 300 slices of 1/30 falls a float short of it, so step a little past.
await page.evaluate(() => window.__garden.step(11));
assert.ok(await page.evaluate(() => window.__garden.game.diamond >= 1));
await page.locator('#path').click();
await page.locator('#help').click();
assert.ok(await page.locator('#modal').isVisible());
await page.locator('#modal-ok').click();
await page.locator('#restart').click();
await page.locator('#modal-cancel').click();
assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 3);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

// r2: the two new towers have their own cards, and the keyboard reaches them on 6 and 7.
// Reload first so the sidebar is not resizing under the pointer while a wave runs.
await page.setViewportSize({ width: 1440, height: 1000 });
await page.reload();
await page.waitForFunction(() => window.__garden);
await page.evaluate(() => {
  window.__garden.game.active = false;
  window.__garden.game.queue = [];
  window.__garden.game.enemies = [];
  window.__garden.step(0.1);
});
assert.equal(await page.locator('[data-build="ember"]').count(), 1);
assert.equal(await page.locator('[data-build="lantern"]').count(), 1);
await page.keyboard.press('6');
assert.ok((await page.locator('#detail').textContent()).includes('Ember'));
await page.keyboard.press('7');
assert.ok((await page.locator('#detail').textContent()).includes('Lantern'));
await page.keyboard.press('Escape');

// Build an Ember and a Lantern beside the route and photograph them.
await page.evaluate(() => {
  window.__garden.game.coins = 2000;
  window.__garden.step(0.1);
  document.querySelector('.sidebar-scroll').scrollTop = 0;
});
await page.locator('[data-build="ember"]').click();
await clickCell(5, 5);
await page.locator('[data-build="lantern"]').click();
await clickCell(6, 5);
assert.ok(
  await page.evaluate(
    () =>
      window.__garden.game.towers.some((t) => t.type === 'ember') &&
      window.__garden.game.towers.some((t) => t.type === 'lantern'),
  ),
);
await page.screenshot({ path: `${SHOTS}/desktop-new-towers.png`, fullPage: true });

// The detail panel of a tower that cannot afford its level 3 upgrade names the material.
await page.evaluate(() => {
  const game = window.__garden.game;
  game.wood = 0;
  game.rock = 0;
  game.coins = 2000;
  window.__garden.step(0.1);
});
await clickCell(3, 3);
const detail = await page.locator('#detail').textContent();
assert.ok(detail.includes('You need'), detail);
assert.ok(detail.toLowerCase().includes('wood'), detail);
assert.ok(detail.includes('garden plots'), detail);
assert.equal(await page.locator('#detail [data-upgrade="power"]').isDisabled(), true);
await page.screenshot({ path: `${SHOTS}/desktop-missing-material.png`, fullPage: true });

// Fire Rootgrip and check the button switches to a countdown.
await page.locator('#start').click();
await page.evaluate(() => window.__garden.step(4));
await page.locator('[data-ability="rootgrip"]').click();
assert.ok(await page.evaluate(() => window.__garden.game.root > 0));
assert.ok(await page.evaluate(() => window.__garden.game.cooldowns.rootgrip > 40));
assert.match(await page.locator('[data-ability="rootgrip"] b').textContent(), /^\d+s$/);
await page.screenshot({ path: `${SHOTS}/desktop-ability-in-use.png`, fullPage: true });

// Sunburst arms first, then lands on the square that is clicked.
await page.locator('[data-ability="sunburst"]').click();
assert.ok(
  await page.locator('[data-ability="sunburst"]').evaluate((el) => el.classList.contains('armed')),
);
await clickCell(4, 4);
assert.ok(await page.evaluate(() => window.__garden.game.cooldowns.sunburst > 30));

// A cooldown has to survive a reload, because it lives in the save file.
await page.evaluate(() => window.__garden.save());
await page.reload();
await page.waitForFunction(() => window.__garden);
assert.ok(await page.evaluate(() => window.__garden.game.cooldowns.rootgrip > 0));

// The same three things on a phone sized screen.
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.__garden.step(0.1));
const abilityBox = await page.locator('[data-ability="rootgrip"]').boundingBox();
assert.ok(abilityBox.height >= 44, `ability button is only ${abilityBox.height}px tall`);
assert.ok(abilityBox.width >= 44, `ability button is only ${abilityBox.width}px wide`);
await page.screenshot({ path: `${SHOTS}/phone-abilities.png`, fullPage: true });
await page.locator('[data-build="ember"]').click();
await page.screenshot({ path: `${SHOTS}/phone-new-towers.png`, fullPage: true });
await page.evaluate(() => {
  window.__garden.game.coins = 2000;
  window.__garden.game.wood = 0;
  window.__garden.step(0.1);
});
await clickCell(3, 3);
await page.screenshot({ path: `${SHOTS}/phone-missing-material.png`, fullPage: true });
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

assert.deepEqual(errors, []);
console.log(
  'Browser checks passed: 75% map, straight board, top garden,' +
    ' buy/upgrade/unlock all resources, automatic production, combat, tower upgrade,' +
    ' save/reload, controls, mobile overflow, Ember and Lantern cards on keys 6 and 7,' +
    ' Rootgrip and Sunburst with a cooldown that survives reload, 44px phone buttons,' +
    ' the missing material note, no JS errors.',
);
await browser.close();
