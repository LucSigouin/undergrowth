// Deterministic screenshots of a running Undergrowth dev server.
//
//   node tools/shoot.mjs --url http://localhost:5174 --out workbench/shots/r2
//
// It always writes the same five files, in the same states, with no date in any name:
//   01-fresh-desktop.png     a fresh board at 1440x1000, nothing built
//   02-midwave-desktop.png   three towers, a wave running, one tower selected
//   03-missing-material.png  the detail panel of a level 2 tower with coins but no materials
//   04-phone-portrait.png    iPhone 13 portrait, mid wave
//   05-phone-landscape.png   iPhone 13 landscape, mid wave
// It also writes notes.md next to them, saying what each file is and noting anything the
// server it shot could not show.
//
// How the states are made repeatable:
//   - localStorage is cleared before the page script runs, so every run starts on a fresh garden.
//   - the game is advanced with window.__garden.step(seconds), which runs fixed 1/30 s ticks
//     instead of waiting on the wall clock.
//   - the wave start, the fixed advance and the pause all happen inside one page.evaluate call,
//     so no animation frame runs between them and the game state is identical every run.
//   - the game is paused before each shot, and the "Paused" overlay is hidden with an injected
//     style so pausing does not change the picture.
// The game state in each file is repeatable, and notes.md records that state so you can check
// it: run the tool twice and the notes are identical. The pixels are not promised to be
// byte identical, because the 3D renderer's own output is not reproducible bit for bit on a GPU
// even with an identical scene. Nothing in this project has any randomness in it.
//
// Nothing here writes to the game or to the server. It is a browser driving a dev server.
import { chromium, devices } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && argv[at + 1] ? argv[at + 1] : fallback;
};

const url = arg('url', 'http://localhost:5174');
const out = arg('out');
if (!out) {
  console.error('Usage: node tools/shoot.mjs --url <url> --out <dir>');
  process.exit(1);
}
mkdirSync(out, { recursive: true });

// Squares used for every run, chosen because they sit beside the straight route on both versions.
const SLOTS = [
  ['thorn', 3, 3],
  ['sap', 6, 3],
  ['thorn', 9, 3],
];
const SELECTED = [3, 3];
const WAVE_SECONDS = 8;
const SETTLE_MS = 400;

const notes = [];
const say = (line) => {
  console.log(line);
  notes.push(line);
};

// True when the page exposes the test hook. The dev servers do; a production build does not.
const hasHook = (page, path) =>
  page.evaluate((p) => {
    const parts = p.split('.');
    let node = window;
    for (const part of parts) {
      if (!node || !(part in node)) return false;
      node = node[part];
    }
    return true;
  }, path);

// Where a board square is on screen. Uses the game's own answer when it is available, and
// falls back to measuring the scene box and dividing it into the 13 by 9 board.
async function cellPoint(page, x, z) {
  if (await hasHook(page, '__garden.world.cellScreen')) {
    return page.evaluate(([cx, cz]) => window.__garden.world.cellScreen(cx, cz), [x, z]);
  }
  return page.evaluate(
    ([cx, cz]) => {
      const box = document.querySelector('#scene').getBoundingClientRect();
      const portrait = box.height > box.width;
      const cols = portrait ? 9 : 13;
      const rows = portrait ? 13 : 9;
      const gx = portrait ? 8 - cz : cx;
      const gz = portrait ? cx : cz;
      return {
        x: box.left + ((gx + 0.5) / cols) * box.width,
        y: box.top + ((gz + 0.5) / rows) * box.height,
      };
    },
    [x, z],
  );
}

async function openPage(context) {
  // Clear the save before any page script runs, so the board is always fresh.
  await context.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      /* a browser with storage blocked still plays, it just does not save */
    }
  });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(error.message));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('#scene canvas'));
  if (await hasHook(page, '__garden')) await page.waitForFunction(() => window.__garden);
  // Hide the overlay that pausing adds, so a paused shot looks like a running one.
  await page.addStyleTag({ content: '#paused{display:none !important}' });
  await page.waitForTimeout(SETTLE_MS);
  return { page, problems };
}

// Give the player money, build the fixed set of towers, and select one of them.
async function buildAndSelect(page, { select = true } = {}) {
  if (await hasHook(page, '__garden.game.place')) {
    await page.evaluate((slots) => {
      const game = window.__garden.game;
      game.coins = 2000;
      for (const [type, x, z] of slots) game.place(type, x, z);
      window.__garden.step(0.1);
    }, SLOTS);
  } else {
    say('note: window.__garden.game.place is missing here, so towers were built by clicking.');
    for (const [type, x, z] of SLOTS) {
      await page.locator(`[data-build="${type}"]`).click();
      const point = await cellPoint(page, x, z);
      await page.mouse.click(point.x, point.y);
      const confirm = page.locator('#confirm-place');
      if (await confirm.isVisible()) await confirm.click();
    }
  }
  if (!select) return;
  const point = await cellPoint(page, SELECTED[0], SELECTED[1]);
  await page.mouse.click(point.x, point.y);
}

// Start the wave, advance a fixed number of seconds, and freeze. One synchronous block, so the
// state is the same on every run.
async function runWaveAndFreeze(page) {
  if (await hasHook(page, '__garden.step')) {
    await page.evaluate((seconds) => {
      document.querySelector('#start').click();
      window.__garden.step(seconds);
      window.__garden.setPaused(document.querySelector('#paused').hidden);
    }, WAVE_SECONDS);
  } else {
    say('note: window.__garden.step is missing here, so the wave ran on the wall clock.');
    await page.locator('#start').click();
    await page.waitForTimeout(WAVE_SECONDS * 1000);
    await page.locator('#settings').click();
    await page.addStyleTag({ content: '#modal, #modal::backdrop { visibility: hidden; }' });
  }
  await page.waitForTimeout(SETTLE_MS);
}

// A one line fingerprint of the state a shot was taken in. It only uses numbers the engine
// decides, never anything from the clock, so it is the same on every run.
const states = [];
async function shoot(page, name) {
  await page.screenshot({ path: join(out, name), fullPage: false });
  const state = await page.evaluate(() => {
    if (!window.__garden) return 'no test hook on this server';
    const game = window.__garden.game;
    const levels = game.towers.map((tower) => tower.level).join('');
    const detail = document.querySelector('#detail');
    const panel = detail && detail.textContent ? detail.textContent.trim().slice(0, 40) : 'closed';
    return [
      `coins ${Math.floor(game.coins)}`,
      `lives ${game.lives}`,
      `towers ${game.towers.length}`,
      `levels ${levels || 'none'}`,
      `creatures ${game.enemies.length}`,
      `panel ${panel.replace(/\s+/g, ' ')}`,
    ].join(', ');
  });
  states.push([name, state]);
  say(`${name}`);
}

const browser = await chromium.launch({
  headless: true,
  // GPU=1 renders on the real graphics card instead of the software fallback.
  args: process.env.GPU ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});
const allProblems = [];

// 01 and 02: desktop, fresh board then mid wave with a tower selected.
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const { page, problems } = await openPage(context);
  await page.evaluate(() => window.__garden.setPaused(document.querySelector('#paused').hidden));
  await page.waitForTimeout(SETTLE_MS);
  await shoot(page, '01-fresh-desktop.png');
  await page.evaluate(() => window.__garden.setPaused(document.querySelector('#paused').hidden));
  await buildAndSelect(page);
  await runWaveAndFreeze(page);
  const detail = (await page.locator('#detail').textContent()) || '';
  if (!/Level|level|Lv/.test(detail)) {
    say('note: the detail panel did not report a level, so the selection may not have taken.');
  }
  await shoot(page, '02-midwave-desktop.png');
  allProblems.push(...problems);
  await context.close();
}

// 03: a level 2 tower, plenty of coins, no materials at all. On v2 the panel names what is
// missing. On v1 that note does not exist, so this is simply the level 2 panel.
{
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const { page, problems } = await openPage(context);
  await buildAndSelect(page, { select: false });
  if (await hasHook(page, '__garden.game.upgrade')) {
    await page.evaluate(() => {
      const game = window.__garden.game;
      // Enough of everything to reach level 2, whatever this version charges for it.
      game.coins = 2000;
      game.wood = 200;
      game.rock = 200;
      game.iron = 200;
      game.diamond = 200;
      const tower = game.towers.find((candidate) => candidate.type !== 'hedge');
      game.upgrade(tower.id, 'power');
      // Now take every material away and leave the coins, which is the state to photograph.
      game.wood = 0;
      game.rock = 0;
      game.iron = 0;
      game.diamond = 0;
      game.coins = 2000;
      window.__garden.step(0.1);
    });
  } else {
    say('note: window.__garden.game.upgrade is missing here, so the upgrade was clicked.');
    const point = await cellPoint(page, SELECTED[0], SELECTED[1]);
    await page.mouse.click(point.x, point.y);
    await page.locator('#detail [data-upgrade="power"]').click();
  }
  const point = await cellPoint(page, SELECTED[0], SELECTED[1]);
  await page.mouse.click(point.x, point.y);
  await page.evaluate(() => window.__garden.setPaused(document.querySelector('#paused').hidden));
  await page.waitForTimeout(SETTLE_MS);
  const detail = (await page.locator('#detail').textContent()) || '';
  if (await page.locator('#detail .resource-amount.short').count()) {
    say('The detail panel shows resource icons with owned/required counts.');
  } else {
    say('This server has no material shortfall icons, so 03 is the level 2 detail panel instead.');
  }
  await shoot(page, '03-missing-material.png');
  allProblems.push(...problems);
  await context.close();
}

// 04 and 05: a real phone profile, portrait then landscape, both mid wave.
for (const [name, profile] of [
  ['04-phone-portrait.png', devices['iPhone 13']],
  ['05-phone-landscape.png', devices['iPhone 13 landscape']],
]) {
  const context = await browser.newContext({ ...profile });
  const { page, problems } = await openPage(context);
  await buildAndSelect(page, { select: false });
  await runWaveAndFreeze(page);
  await shoot(page, name);
  allProblems.push(...problems);
  await context.close();
}

await browser.close();

if (allProblems.length) {
  say(`note: the page reported ${allProblems.length} script error(s): ${allProblems.join(' | ')}`);
}

const header = [
  '# Shots',
  '',
  `Source: ${url}`,
  '',
  'Written by `node tools/shoot.mjs`. Same five names every run, no dates in any name.',
  '',
  '| File | State |',
  '| --- | --- |',
  '| 01-fresh-desktop.png | fresh board, 1440x1000, nothing built |',
  '| 02-midwave-desktop.png | three towers, wave running, one tower selected |',
  '| 03-missing-material.png | level 2 tower, coins but no materials |',
  '| 04-phone-portrait.png | iPhone 13 portrait, mid wave |',
  '| 05-phone-landscape.png | iPhone 13 landscape, mid wave |',
  '',
  '## State each shot was taken in',
  '',
  'These numbers come from the engine, not from the clock. Run the tool again and this table',
  'is the same, which is what "deterministic" means here.',
  '',
  '| File | State |',
  '| --- | --- |',
  ...states.map(([name, state]) => `| ${name} | ${state} |`),
  '',
  '## Run log',
  '',
  ...notes.map((line) => `- ${line}`),
  '',
];
writeFileSync(join(out, 'notes.md'), header.join('\n'));
console.log(`wrote 5 shots and notes.md to ${out}`);
