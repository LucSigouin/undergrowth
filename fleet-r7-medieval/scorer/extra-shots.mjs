// Scorer's own extra shots for round r7. Writes into fleet-r7-medieval/scorer/shots/.
// Run: node fleet-r7-medieval/scorer/extra-shots.mjs (dev server on 5175, sandbox off)
import { chromium, devices } from '@playwright/test';
import { join } from 'node:path';

const url = 'http://localhost:5175';
const out = 'fleet-r7-medieval/scorer/shots';
const TYPES = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern'];

const browser = await chromium.launch({ headless: true });
const log = [];
const say = (line) => {
  console.log(line);
  log.push(line);
};

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

// 10: all seven engines at levels 1, 2 and 3 (21 towers).
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await freshPage(context);
  const placed = await page.evaluate((types) => {
    const g = window.__garden.game;
    g.coins = 999999;
    g.wood = 9999;
    g.rock = 9999;
    g.iron = 9999;
    g.diamond = 9999;
    const rows = [2, 4, 6]; // level 1, 2, 3 rows
    const results = [];
    types.forEach((type, i) => {
      rows.forEach((z, li) => {
        const x = 2 + i * 1.0 + (i >= 4 ? 1 : 0);
        const r = g.place(type, 2 + i + (i >= 4 ? 1 : 0), z);
        const tower = g.towers[g.towers.length - 1];
        for (let u = 0; u < li; u++) {
          g.coins = 999999;
          g.wood = 9999;
          g.rock = 9999;
          g.iron = 9999;
          g.diamond = 9999;
          g.upgrade(tower.id, 'power');
        }
        results.push([type, z, tower ? tower.level : 'FAIL', String(r)]);
      });
    });
    window.__garden.step(0.1);
    window.__garden.setPaused(true);
    return { results, levels: g.towers.map((t) => `${t.type}:${t.level}`).join(' ') };
  }, TYPES);
  say(`21-tower board: ${placed.levels}`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(out, '10-all-towers-l123.png') });

  // 11/12: 1:1 zoom on a level 3 tower square and its neighbourhood.
  const pt = await page.evaluate(() => {
    const g = window.__garden.game;
    const t = g.towers.find((tw) => tw.level === 3);
    return { ...window.__garden.world.cellScreen(t.x, t.z), type: t.type };
  });
  say(`zoom tower: ${pt.type} at screen ${Math.round(pt.x)},${Math.round(pt.y)}`);
  await page.screenshot({
    path: join(out, '11-zoom-tower-1to1.png'),
    clip: { x: pt.x - 128, y: pt.y - 128, width: 256, height: 256 },
  });

  // Select that tower for a detail panel shot.
  await page.mouse.click(pt.x, pt.y);
  await page.waitForTimeout(300);
  const detailText = await page.locator('#detail').textContent();
  say(`detail panel text: ${detailText.replace(/\s+/g, ' ').trim().slice(0, 300)}`);
  await page.screenshot({ path: join(out, '12-detail-panel.png') });
  await context.close();
}

// 13: mid wave with many enemies + fps measure at 1440x900 with 12 towers, 20 creatures.
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
    // 12 towers beside the route.
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
    g.stage = 8; // later stage waves send bigger hordes
    document.querySelector('#start').click();
    window.__garden.step(10);
    return { towers: g.towers.length, enemies: g.enemies.length, stage: g.stage, wave: g.wave };
  });
  say(`mid wave: towers ${info.towers}, creatures ${info.enemies}, stage ${info.stage}`);
  // fps over 2 seconds, unpaused, real animation frames.
  const fps = await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.__garden.setPaused(false);
        let frames = 0;
        const start = performance.now();
        const tick = () => {
          frames++;
          if (performance.now() - start < 2000) requestAnimationFrame(tick);
          else resolve((frames / (performance.now() - start)) * 1000);
        };
        requestAnimationFrame(tick);
      }),
  );
  say(`fps at 1440x900 with ${info.towers} towers, ${info.enemies} creatures at shot time: ${fps.toFixed(1)}`);
  await page.evaluate(() => window.__garden.setPaused(true));
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, '13-midwave-horde.png') });

  // 14: 1:1 zoom on an enemy.
  const ept = await page.evaluate(() => {
    const g = window.__garden.game;
    const e = g.enemies[Math.floor(g.enemies.length / 2)];
    if (!e) return null;
    const p = window.__garden.world.cellScreen(e.x, e.z);
    return { ...p, type: e.type, n: g.enemies.length };
  });
  if (ept) {
    say(`zoom enemy: ${ept.type} (${ept.n} on board)`);
    await page.screenshot({
      path: join(out, '14-zoom-enemy-1to1.png'),
      clip: { x: ept.x - 128, y: ept.y - 128, width: 256, height: 256 },
    });
  } else {
    say('no enemy alive for the zoom shot');
  }
  await context.close();
}

// 15: help dialog.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await freshPage(context);
  const opened = await page.evaluate(() => {
    const btn =
      document.querySelector('#help') ||
      document.querySelector('[data-help]') ||
      [...document.querySelectorAll('button')].find((b) => /help|how/i.test(b.textContent));
    if (!btn) return 'no help button found';
    btn.click();
    return `clicked: ${btn.id || btn.textContent.trim()}`;
  });
  say(`help: ${opened}`);
  await page.waitForTimeout(400);
  const helpText = await page.evaluate(() => {
    const m = document.querySelector('#modal') || document.querySelector('dialog[open]');
    return m ? m.textContent.replace(/\s+/g, ' ').trim() : 'no modal visible';
  });
  say(`help text: ${helpText.slice(0, 800)}`);
  await page.screenshot({ path: join(out, '15-help-dialog.png') });
  await context.close();
}

// 16: save compatibility, version 2 fixture from tests/game.test.js.
{
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.addInitScript(() => {
    const saved = {
      version: 2,
      stage: 5,
      wave: 1,
      coins: 342,
      wood: 20,
      rock: 11,
      iron: 4,
      diamond: 1,
      lives: 14,
      unlockedPlots: 3,
      towers: [
        { id: 3, type: 'thorn', x: 4, z: 3, level: 2, branch: 'power', cool: 0, spent: 59 },
        { id: 4, type: 'hedge', x: 4, z: 4, level: 1, branch: null, cool: 0, spent: 8 },
      ],
      farms: [
        { type: 'wood', level: 3, progress: 2 },
        { type: 'rock', level: 1, progress: 0 },
        null,
        null,
      ],
      nextId: 5,
      kills: 88,
    };
    localStorage.clear();
    localStorage.setItem('undergrowth-save-v2', JSON.stringify(saved));
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__garden);
  await page.waitForTimeout(400);
  const check = await page.evaluate(() => {
    const g = window.__garden.game;
    return {
      version: g.version,
      stage: g.stage,
      coins: g.coins,
      lives: g.lives,
      towers: g.towers.map((t) => `${t.type} L${t.level}`).join(', '),
    };
  });
  say(`save-compat v2 fixture loaded: ${JSON.stringify(check)}`);
  await page.screenshot({ path: join(out, '16-save-loaded.png') });
  await context.close();
}

// 17-21: 3x3 repeats of each tile, ground-outer and apron-wood, straight from public/art.
{
  const context = await browser.newContext({ viewport: { width: 800, height: 800 } });
  const page = await context.newPage();
  const files = [
    ['17-grid-tile-meadow-a.png', 'art/tile-meadow-a@256.webp', 256],
    ['18-grid-tile-meadow-b.png', 'art/tile-meadow-b@256.webp', 256],
    ['19-grid-tile-meadow-c.png', 'art/tile-meadow-c@256.webp', 256],
    ['20-grid-ground-outer.png', 'art/ground-outer@512.webp', 256],
    ['21-grid-apron-wood.png', 'art/apron-wood@512.webp', 256],
  ];
  for (const [name, path, size] of files) {
    await page.setContent(
      `<body style="margin:0"><div style="width:${size * 3}px;height:${size * 3}px;background:url('${url}/${path}');background-size:${size}px ${size}px"></div></body>`,
    );
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(out, name),
      clip: { x: 0, y: 0, width: size * 3, height: size * 3 },
    });
    say(`grid: ${name}`);
  }
  await context.close();
}

await browser.close();
console.log('EXTRA SHOTS DONE');
console.log(log.join('\n'));
