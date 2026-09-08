// Desktop and phone browser walkthrough against a running dev server.
// Checks the layout, the works economy, combat, save and reload, the controls, and the
// Brazier and War banner cards, settings and icon costs, and the missing material note.
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

// The board runs top to bottom and the works grid anchors the side pane.
assert.ok(
  await page.evaluate(() => {
    const world = window.__garden.world,
      topLeft = world.cellScreen(0, 0),
      topRight = world.cellScreen(12, 0),
      bottomLeft = world.cellScreen(0, 8),
      scene = document.querySelector('#scene').getBoundingClientRect(),
      works = document.querySelector('.works-strip').getBoundingClientRect(),
      sidebar = document.querySelector('.sidebar').getBoundingClientRect(),
      entry = world.cellScreen(0, 4),
      exit = world.cellScreen(12, 4);
    return (
      Math.abs(topLeft.x - topRight.x) < 0.01 &&
      Math.abs(topLeft.y - bottomLeft.y) < 0.01 &&
      Math.abs(entry.x - exit.x) < 0.01 &&
      entry.y < exit.y &&
      works.left >= sidebar.left &&
      works.top > sidebar.top + sidebar.height / 2 &&
      scene.right <= sidebar.left + 1
    );
  }),
);
assert.equal(await page.locator('[data-unlock="1"]').isDisabled(), true);
assert.equal(await page.locator('[data-plot="0"] small').textContent(), '0/stage');
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
assert.ok(
  await page.evaluate(() => {
    const g = window.__garden.game;
    return g.wood === (g.active ? 0 : 6);
  }),
);
await clickCell(3, 3);
assert.match(await page.locator('[data-upgrade="power"]').textContent(), /10 → 31/);
assert.match(await page.locator('[data-upgrade="reach"]').textContent(), /3.20 → 4.55/);
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
  assert.equal(await page.locator(`[data-plot="${i}"] small`).textContent(), '0/stage');
  await page.locator(`[data-farm="${i}"]`).click();
}
// Newly bought works wait for the next wave's completed payout.
await page.evaluate(() => {
  const { game, step } = window.__garden;
  if (game.active) {
    game.queue = [];
    game.enemies = [];
    step(0.1);
  }
  game.start();
  game.queue = [];
  game.enemies = [];
  step(0.1);
});
assert.ok(await page.evaluate(() => window.__garden.game.diamond >= 1));
assert.equal(await page.locator('#farms .progress').count(), 0);
assert.ok((await page.locator('[data-plot="3"] small').textContent()).includes('/stage'));
await page.locator('#settings').click();
await page.locator('#path').click();
assert.equal(await page.locator('#path').getAttribute('aria-checked'), 'false');
await page.locator('#help').click();
assert.ok(await page.locator('#modal').isVisible());
await page.locator('#modal-ok').click();
await page.locator('#settings').click();
await page.locator('#restart').click();
await page.locator('#modal-cancel').click();
assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 3);
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));

// r2: the two newest engines have their own cards, and the keyboard reaches them on 6 and 7.
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
assert.equal(await page.locator('[data-build="ember"]').getAttribute('aria-pressed'), 'true');
await page.keyboard.press('7');
assert.equal(await page.locator('[data-build="lantern"]').getAttribute('aria-pressed'), 'true');
await page.keyboard.press('Escape');

// r5: choosing an engine no longer opens a panel. The card carries a hover note instead, and
// the detail panel stays out of the way until a placed engine is selected.
assert.equal(await page.locator('#detail').isVisible(), false);
await page.locator('[data-build="lantern"]').hover();
await page.waitForTimeout(150);
const note = await page.locator('#hover-note').textContent();
assert.equal(
  await page.locator('#hover-note .detail-title, #hover-note .chip, #hover-note .eyebrow').count(),
  0,
);
assert.ok(await page.locator('#hover-note [aria-label="Nearby fire rate"]').count());
assert.ok(note.includes('faster'), note);
assert.ok(await page.locator('#hover-note').isVisible());
// The same note answers the keyboard, so a card can be read without a pointer.
await page.locator('[data-build="ember"]').focus();
await page.waitForTimeout(150);
assert.ok((await page.locator('#hover-note').textContent()).includes('Damage'));
assert.ok((await page.locator('#hover-note').textContent()).includes('burn'));
await page.locator('#start').focus();
assert.equal(await page.locator('#hover-note').isVisible(), false);

// Gold and every material share the top-right header; engine cards form a grid.
assert.equal(await page.locator('.wordmark, .works-strip-heading, .tower-card kbd').count(), 0);
assert.ok(
  await page.evaluate(() => {
    const header = document.querySelector('.resource-header');
    const ids = ['stage-number', 'lives', 'coins', 'wood', 'rock', 'iron', 'diamond'];
    const cards = [...document.querySelectorAll('.tower-card')].map((el) =>
      el.getBoundingClientRect(),
    );
    return (
      ids.every((id) => header.contains(document.getElementById(id))) &&
      header.getBoundingClientRect().top === 0 &&
      cards[0].top === cards[1].top &&
      cards[2].top > cards[0].bottom &&
      document.querySelector('.tower-icon').clientWidth >= 44
    );
  }),
);
// Nothing in the build column may need scrolling at any desktop height.
assert.ok(
  await page.evaluate(
    () =>
      ![...document.querySelectorAll('.sidebar, .sidebar *')].some(
        (el) =>
          el.scrollHeight > el.clientHeight + 1 &&
          /(auto|scroll)/.test(getComputedStyle(el).overflowY),
      ),
  ),
);

// Build a Brazier and a War banner beside the route and photograph them.
await page.evaluate(() => {
  window.__garden.game.coins = 2000;
  window.__garden.step(0.1);
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
await clickCell(6, 5);
assert.equal(await page.locator('#detail [data-upgrade]').count(), 1);
assert.equal(await page.locator('#detail [data-upgrade="power"]').count(), 0);
assert.match(await page.locator('#detail [data-upgrade="reach"]').textContent(), /30 → 40%/);
await page.screenshot({ path: `${SHOTS}/desktop-new-towers.png`, fullPage: true });

// The detail panel of an engine that cannot afford its level 3 upgrade names the material.
await page.evaluate(() => {
  const game = window.__garden.game;
  game.wood = 0;
  game.rock = 0;
  game.coins = 2000;
  window.__garden.step(0.1);
});
await clickCell(3, 3);
const detail = await page.locator('#detail').textContent();
assert.ok(!detail.includes('You need'), detail);
assert.equal(await page.locator('#detail [data-resource="wood"] b').textContent(), '0/10');
assert.match(
  await page.locator('#detail [data-resource="wood"]').getAttribute('aria-label'),
  /Wood/,
);
assert.equal(await page.locator('#detail [data-upgrade]').isDisabled(), true);
await page.evaluate(() => {
  window.__garden.game.wood = 3;
  window.__garden.step(0);
});
assert.equal(await page.locator('#detail [data-resource="wood"] b').textContent(), '3/10');
await page.screenshot({ path: `${SHOTS}/desktop-missing-material.png`, fullPage: true });

// Retired ability shortcuts must leave construction and combat alone.
assert.equal(await page.locator('[data-ability], #aiming, #cancel-aim').count(), 0);
await page.keyboard.press('6');
await page.keyboard.press('q');
await page.keyboard.press('e');
assert.equal(await page.locator('[data-build="ember"]').getAttribute('aria-pressed'), 'true');
assert.equal(await page.evaluate(() => typeof window.__garden.game.useAbility), 'undefined');
await page.locator('#settings').click();
await page.locator('#help').click();
assert.doesNotMatch(await page.locator('#modal').textContent(), /Rootgrip|Sunburst|Q and E/);
await page.locator('#modal-ok').click();
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(() => window.__garden.step(0.1));
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

// Settings consolidate controls and remember route visibility across reloads.
assert.equal(await page.locator('#wave-preview, #sound, .utilities').count(), 0);
assert.equal(
  await page.locator('.map-controls #path, .wave-controls #saved, .wave-controls #restart').count(),
  0,
);
await page.reload();
await page.waitForFunction(() => window.__garden);
assert.equal(await page.evaluate(() => window.__garden.world.route.visible), false);
await page.locator('#settings').click();
assert.equal(await page.locator('#path').getAttribute('aria-checked'), 'false');
assert.equal(await page.locator('#saved').count(), 0);
await page.locator('#modal-ok').click();
// Restart is still deliberate and actually replaces the save when confirmed.
await page.locator('#settings').click();
await page.locator('#restart').click();
await page.locator('#modal-ok').click();
assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 0);
assert.equal(await page.evaluate(() => window.__garden.game.coins), 200);
await page.reload();
await page.waitForFunction(() => window.__garden);
assert.equal(await page.evaluate(() => window.__garden.game.towers.length), 0);

// Opening Settings freezes combat and closing it restores the previous pause state.
await page.locator('#start').click();
await page.locator('#settings').click();
const stoppedTime = await page.evaluate(() => window.__garden.game.time);
await page.waitForTimeout(180);
assert.equal(await page.evaluate(() => window.__garden.game.time), stoppedTime);
await page.locator('#modal-ok').click();
await page.waitForFunction((time) => window.__garden.game.time > time, stoppedTime);
assert.equal(await page.locator('.wave-controls #pause, .wave-controls #speed').count(), 2);
await page.locator('#pause').click();
assert.equal(await page.locator('#paused').isVisible(), true);
await page.locator('#pause').click();
assert.equal(await page.locator('#paused').isVisible(), false);
for (const speed of ['2×', '3×', '1×']) {
  await page.locator('#speed').click();
  assert.equal(await page.locator('#speed').textContent(), speed);
}
assert.equal(await page.locator('.resource-header #settings').count(), 1);

assert.deepEqual(errors, []);
console.log(
  'Browser checks passed: vertical map, bottom works grid,' +
    ' buy/upgrade/unlock all resources, wave payouts, combat, engine upgrade,' +
    ' save/reload, controls, mobile overflow, Brazier and War banner cards on keys 6 and 7,' +
    ' retired ability controls absent, settings and icon costs, phone engine information,' +
    ' the missing material note, the r5 hover notes, the resource header,' +
    ' a build column that never scrolls, no JS errors.',
);
await browser.close();
