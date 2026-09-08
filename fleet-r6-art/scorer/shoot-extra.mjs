// Scorer's own extra shots for r6. Run from the project root:
//   node fleet-r6-art/scorer/shoot-extra.mjs --url http://localhost:5175
// Writes into fleet-r6-art/scorer/shots/:
//   06-all-towers.png      seven towers at level 1 (row z=0), level 2 (z=2), level 3 (z=7)
//   07-many-enemies.png    stage 6 wave mid-flight, many enemies on the board
//   08-tower-zoom.png      1:1 clip of a level 3 tower square
//   09-enemy-zoom.png      1:1 clip around a walking enemy
//   fps.txt                measured frames per second with 12 towers and 20+ enemies
import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const at = argv.indexOf('--url');
const url = at >= 0 ? argv[at + 1] : 'http://localhost:5175';
const out = 'fleet-r6-art/scorer/shots';
mkdirSync(out, { recursive: true });
const log = [];
const say = (s) => {
  console.log(s);
  log.push(s);
};

const TYPES = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern'];
const browser = await chromium.launch({ headless: true });

async function open(viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  await context.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {}
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__garden);
  await page.addStyleTag({ content: '#paused{display:none !important}' });
  await page.waitForTimeout(300);
  return { context, page };
}

// 06: all seven towers at levels 1, 2, 3.
{
  const { context, page } = await open({ width: 1600, height: 1100 });
  const result = await page.evaluate((types) => {
    const g = window.__garden.game;
    g.coins = 99999;
    g.wood = 999;
    g.rock = 999;
    g.iron = 999;
    g.diamond = 999;
    const msgs = [];
    const rows = [
      [0, 0],
      [2, 1],
      [7, 2],
    ];
    for (const [z, ups] of rows) {
      for (let i = 0; i < types.length; i++) {
        const r = g.place(types[i], i + 1, z);
        if (r) msgs.push(`place ${types[i]}@${i + 1},${z}: ${r}`);
        const t = g.towers.find((tw) => tw.x === i + 1 && tw.z === z);
        for (let u = 0; u < ups; u++) {
          g.coins = 99999;
          g.wood = 999;
          g.rock = 999;
          g.iron = 999;
          g.diamond = 999;
          const ur = g.upgrade(t.id, 'power');
          if (ur) msgs.push(`upgrade ${types[i]} to ${t.level + 1}: ${ur}`);
        }
      }
    }
    window.__garden.step(0.1);
    window.__garden.setPaused(true);
    return {
      msgs,
      levels: g.towers.map((t) => `${t.type}${t.level}`).join(' '),
      count: g.towers.length,
    };
  }, TYPES);
  say(`06: ${result.count} towers placed. Levels: ${result.levels}`);
  for (const m of result.msgs) say(`06 note: ${m}`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, '06-all-towers.png') });

  // 08: 1:1 clip of the level 3 prism (x=4, z=7); fall back to thorn l3.
  const pt = await page.evaluate(() => window.__garden.world.cellScreen(4, 7));
  await page.screenshot({
    path: join(out, '08-tower-zoom.png'),
    clip: { x: pt.x - 96, y: pt.y - 110, width: 192, height: 192 },
  });
  say(`08: clip around cell 4,7 at ${Math.round(pt.x)},${Math.round(pt.y)} (prism l3), 192x192 at dpr 1`);
  await context.close();
}

// 07: stage 6 wave mid-flight, plus fps with 12 towers and 20+ enemies.
{
  const { context, page } = await open({ width: 1440, height: 900 });
  const result = await page.evaluate(() => {
    const g = window.__garden.game;
    g.coins = 99999;
    const spots = [
      [2, 2],
      [4, 2],
      [6, 2],
      [8, 2],
      [10, 2],
      [2, 6],
      [4, 6],
      [6, 6],
      [8, 6],
      [10, 6],
      [3, 0],
      [9, 0],
    ];
    const msgs = [];
    for (const [x, z] of spots) {
      const r = g.place('thorn', x, z);
      if (r) msgs.push(`place @${x},${z}: ${r}`);
    }
    g.stage = 6;
    document.querySelector('#start').click();
    window.__garden.step(5);
    return { msgs, towers: g.towers.length, enemies: g.enemies.length, stage: g.stage };
  });
  say(`07: ${result.towers} towers, ${result.enemies} enemies on board, stage ${result.stage}`);
  for (const m of result.msgs) say(`07 note: ${m}`);

  // fps: let the real loop run 2 seconds and count frames.
  const fps = await page.evaluate(
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
  const state = await page.evaluate(() => ({
    enemies: window.__garden.game.enemies.length,
    towers: window.__garden.game.towers.length,
  }));
  say(`fps: ${fps.toFixed(1)} over 2s with ${state.towers} towers and ${state.enemies} enemies (1440x900)`);
  writeFileSync(
    join(out, 'fps.txt'),
    `${fps.toFixed(1)} fps over 2s, ${state.towers} towers, ${state.enemies} enemies, 1440x900, chromium headless\n`,
  );

  await page.evaluate(() => window.__garden.setPaused(true));
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, '07-many-enemies.png') });

  // 09: 1:1 clip around a walking enemy.
  const clip = await page.evaluate(() => {
    const g = window.__garden.game;
    const e = g.enemies.find((en) => !en.flying) || g.enemies[0];
    if (!e) return null;
    const p = window.__garden.world.cellScreen(e.x, e.z);
    return { x: p.x, y: p.y, kind: e.kind || e.type };
  });
  if (clip) {
    await page.screenshot({
      path: join(out, '09-enemy-zoom.png'),
      clip: { x: clip.x - 80, y: clip.y - 90, width: 160, height: 160 },
    });
    say(`09: clip around enemy '${clip.kind}' at ${Math.round(clip.x)},${Math.round(clip.y)}, 160x160 at dpr 1`);
  } else {
    say('09: no enemy on board, no zoom shot');
  }
  await context.close();
}

await browser.close();
writeFileSync(join(out, 'extra-notes.md'), '# Scorer extra shots\n\n' + log.map((l) => `- ${l}`).join('\n') + '\n');
console.log('done');
