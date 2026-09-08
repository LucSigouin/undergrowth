// Scorer sheets: icons at 160, engines at 256 (x3 levels), creatures at 192, plus a
// strict fps re-measure with at least 20 creatures on the board.
import { chromium } from '@playwright/test';
import { join } from 'node:path';

const url = 'http://localhost:5175';
const out = 'fleet-r7-medieval/scorer/shots';
const say = (l) => console.log(l);

const browser = await chromium.launch({
  headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'],
});

const TOWERS = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern'];
const ENEMIES = ['grub', 'runner', 'armor', 'moth', 'brood', 'grubling', 'warden', 'boss'];
const ICONS = [
  'thorn',
  'sap',
  'bloom',
  'prism',
  'hedge',
  'ember',
  'lantern',
  'wood',
  'rock',
  'iron',
  'diamond',
  'coin',
  'life',
];

function sheet(items, size) {
  const cells = items
    .map(
      ([label, src]) =>
        `<figure style="margin:4px;text-align:center"><img src="${url}/${src}" width="${size}" height="${size}" style="image-rendering:auto;background:#555"><figcaption style="color:#eee;font:12px sans-serif">${label}</figcaption></figure>`,
    )
    .join('');
  return `<body style="margin:0;background:#3a3a3a;display:flex;flex-wrap:wrap;width:fit-content">${cells}</body>`;
}

{
  const context = await browser.newContext({ viewport: { width: 2400, height: 1400 } });
  const page = await context.newPage();

  await page.setContent(sheet(ICONS.map((n) => [`icon-${n}`, `art/icon-${n}@160.png`]), 160));
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(out, '22-sheet-icons-160.png'), fullPage: true });
  say('22-sheet-icons-160.png');

  const towerItems = [];
  for (const t of TOWERS)
    for (const l of [1, 2, 3]) towerItems.push([`${t}-l${l}`, `art/tower-${t}-l${l}@256.png`]);
  await page.setContent(sheet(towerItems, 256));
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(out, '23-sheet-towers-256.png'), fullPage: true });
  say('23-sheet-towers-256.png');

  const enemyItems = ENEMIES.map((n) => [
    n,
    `art/enemy-${n}@${n === 'boss' || n === 'brood' ? 256 : 192}.png`,
  ]);
  await page.setContent(sheet(enemyItems, 192));
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(out, '24-sheet-enemies-192.png'), fullPage: true });
  say('24-sheet-enemies-192.png');
  await context.close();
}

// fps with at least 20 creatures alive during the whole measure.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
  const n = await page.evaluate(() => {
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
    const types = ['hedge', 'lantern', 'prism', 'lantern', 'lantern', 'sap'];
    spots.forEach(([x, z], i) => g.place(types[i % types.length], x, z));
    g.stage = 12;
    document.querySelector('#start').click();
    window.__garden.step(4);
    return g.enemies.length;
  });
  say(`creatures at measure start: ${n}, towers 12`);
  const res = await page.evaluate(
    () =>
      new Promise((resolve) => {
        window.__garden.setPaused(false);
        let frames = 0;
        let minEnemies = Infinity;
        const g = window.__garden.game;
        const start = performance.now();
        const tick = () => {
          frames++;
          minEnemies = Math.min(minEnemies, g.enemies.length);
          if (performance.now() - start < 3000) requestAnimationFrame(tick);
          else
            resolve({
              fps: (frames / (performance.now() - start)) * 1000,
              minEnemies,
              endEnemies: g.enemies.length,
            });
        };
        requestAnimationFrame(tick);
      }),
  );
  say(`fps: ${res.fps.toFixed(1)}, creatures never below ${res.minEnemies}, ended at ${res.endEnemies}`);
  await context.close();
}

await browser.close();
console.log('SHEETS DONE');
