// Scorer fix-up shots: detail panel, enemy zoom, help dialog, fps with GPU.
import { chromium } from '@playwright/test';
import { join } from 'node:path';

const url = 'http://localhost:5175';
const out = 'fleet-r7-medieval/scorer/shots';
const say = (l) => console.log(l);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});

async function freshPage(context) {
  await context.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {}
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__garden && document.querySelector('#scene canvas'));
  await page.addStyleTag({ content: '#paused{display:none !important}' });
  await page.waitForTimeout(400);
  return page;
}

// 12: detail panel of a level 3 engine, selected while running.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await freshPage(context);
  await page.evaluate(() => {
    const g = window.__garden.game;
    g.coins = 999999;
    g.wood = 9999;
    g.rock = 9999;
    g.iron = 9999;
    g.diamond = 9999;
    g.place('prism', 5, 3);
    const t = g.towers[0];
    g.upgrade(t.id, 'power');
    g.coins = 999999;
    g.wood = 9999;
    g.rock = 9999;
    g.iron = 9999;
    g.diamond = 9999;
    g.upgrade(t.id, 'power');
    window.__garden.step(0.1);
  });
  const pt = await page.evaluate(() => window.__garden.world.cellScreen(5, 3));
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(500);
  const detail = await page.locator('#detail').textContent();
  say(`detail text: ${detail.replace(/\s+/g, ' ').trim()}`);
  await page.screenshot({ path: join(out, '12-detail-panel.png') });

  // 12b: the engine info note (tower-info button).
  const hasInfo = await page.evaluate(() => {
    const b = document.querySelector('#detail-info') || document.querySelector('#tower-info');
    if (!b) return false;
    b.click();
    return true;
  });
  await page.waitForTimeout(400);
  if (hasInfo) {
    const note = await page.evaluate(() => document.querySelector('#modal')?.textContent || '');
    say(`engine note: ${note.replace(/\s+/g, ' ').trim().slice(0, 400)}`);
    await page.screenshot({ path: join(out, '12b-engine-note.png') });
  }
  await context.close();
}

// 14: 1:1 zoom on enemies, and fps with GPU flags.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await freshPage(context);
  const info = await page.evaluate(() => {
    const g = window.__garden.game;
    g.coins = 999999;
    g.wood = 9999;
    g.rock = 9999;
    g.iron = 9999;
    g.diamond = 9999;
    const spots = [
      [3, 3],
      [4, 3],
      [5, 3],
      [6, 3],
      [7, 3],
      [8, 3],
      [3, 5],
      [4, 5],
      [5, 5],
      [6, 5],
      [7, 5],
      [8, 5],
    ];
    const types = ['thorn', 'bloom', 'prism', 'ember', 'lantern', 'sap'];
    spots.forEach(([x, z], i) => g.place(types[i % types.length], x, z));
    g.stage = 9;
    document.querySelector('#start').click();
    window.__garden.step(6);
    return { towers: g.towers.length, enemies: g.enemies.length };
  });
  say(`board: ${info.towers} towers, ${info.enemies} creatures`);
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.__garden.setPaused(false);
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start < 3000) requestAnimationFrame(tick);
          else resolve((frames / (performance.now() - start)) * 1000);
        };
        requestAnimationFrame(tick);
      }),
  );
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2');
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
  });
  say(`fps: ${fps.toFixed(1)} (renderer: ${renderer})`);
  await page.evaluate(() => window.__garden.setPaused(true));
  await page.waitForTimeout(300);
  const ept = await page.evaluate(() => {
    const g = window.__garden.game;
    const e = g.enemies[Math.floor(g.enemies.length / 2)];
    if (!e) return null;
    return { ...window.__garden.world.cellScreen(e.x, e.z), kind: e.kind, n: g.enemies.length };
  });
  if (ept) {
    say(`zoom enemy: ${ept.kind} (${ept.n} alive)`);
    await page.screenshot({
      path: join(out, '14-zoom-enemy-1to1.png'),
      clip: { x: ept.x - 128, y: ept.y - 128, width: 256, height: 256 },
    });
  }
  await context.close();
}

// 15: help dialog via Settings.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await freshPage(context);
  await page.locator('#settings').click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, '15b-settings.png') });
  await page.locator('#help').click();
  await page.waitForTimeout(400);
  const helpText = await page.evaluate(
    () => document.querySelector('#modal')?.textContent.replace(/\s+/g, ' ').trim() || 'EMPTY',
  );
  say(`help text: ${helpText}`);
  await page.screenshot({ path: join(out, '15-help-dialog.png') });
  await context.close();
}

await browser.close();
console.log('FIXUP DONE');
