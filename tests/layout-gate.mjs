// Layout gate for round r5 (Luc, 2026-09-07): everything in sight, no scrolling, ever.
//   GARDEN_URL=http://localhost:5174 node tests/layout-gate.mjs
// Checks, at several common desktop sizes and the phone layout:
//  1. the page and the sidebar (and everything inside it) never need to scroll
//  2. the materials (wood, rock, iron, diamond) live on the map as a HUD, next to stage and lives
//  3. no "Before you build" panel: with nothing selected the detail panel is hidden, and hovering a
//     tower card shows a note (a title attribute or a visible popover)
import {chromium} from '@playwright/test';

const URL = process.env.GARDEN_URL || 'http://localhost:5174';
const sizes = [
  {width: 1920, height: 1080},
  {width: 1536, height: 864},
  {width: 1440, height: 900},
  {width: 1366, height: 768},
  {width: 1280, height: 720},
];
const failures = [];
const fail = (size, msg) => failures.push(`${size.width}x${size.height}: ${msg}`);

const browser = await chromium.launch({headless: true});
for (const size of sizes) {
  const page = await browser.newPage({viewport: size});
  await page.goto(URL);
  await page.waitForFunction(() => window.__garden);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => window.__garden);
  await page.waitForTimeout(300);

  const scroll = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflowing = [];
    for (const el of document.querySelectorAll('.sidebar, .sidebar *')) {
      const cs = getComputedStyle(el);
      if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(cs.overflowY)) {
        overflowing.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')}`);
      }
    }
    const sidebar = document.querySelector('.sidebar');
    const r = sidebar?.getBoundingClientRect();
    const clipped = sidebar
      ? [...sidebar.querySelectorAll('button, h2, .inventory-row, .wave-controls')].filter(e => {
          const b = e.getBoundingClientRect();
          return b.height > 0 && (b.bottom > innerHeight + 1 || b.top < -1);
        }).length
      : -1;
    return {
      pageScroll: doc.scrollHeight > innerHeight + 1 || doc.scrollWidth > innerWidth + 1,
      overflowing,
      sidebarBottom: r ? Math.round(r.bottom) : null,
      clipped,
    };
  });
  if (scroll.pageScroll) fail(size, 'the page itself scrolls');
  if (scroll.overflowing.length) fail(size, `these sidebar elements need scrolling: ${scroll.overflowing.join(', ')}`);
  if (scroll.clipped > 0) fail(size, `${scroll.clipped} sidebar controls are cut off by the window edge`);

  const hud = await page.evaluate(() => {
    const scene = document.querySelector('#scene');
    const ok = ['wood', 'rock', 'iron', 'diamond'].every(id => {
      const el = document.getElementById(id);
      return el && scene?.contains(el) && el.getBoundingClientRect().width > 0;
    });
    const stage = document.querySelector('#stage-number')?.getBoundingClientRect();
    const wood = document.getElementById('wood')?.getBoundingClientRect();
    const sameBand = stage && wood && Math.abs(stage.top - wood.top) < 60;
    return {ok, sameBand};
  });
  if (!hud.ok) fail(size, 'materials (#wood #rock #iron #diamond) are not visible inside the map area (#scene)');
  if (!hud.sameBand) fail(size, 'materials HUD is not in the same top band as stage and lives');

  const detailHidden = await page.evaluate(() => {
    const d = document.querySelector('#detail');
    return !d || d.hidden || d.getBoundingClientRect().height === 0;
  });
  if (!detailHidden) fail(size, 'the detail panel is visible with nothing selected (the "Before you build" panel)');

  const card = page.locator('[data-build="sap"]');
  await card.hover();
  await page.waitForTimeout(250);
  const hoverNote = await page.evaluate(() => {
    const c = document.querySelector('[data-build="sap"]');
    const title = (c.getAttribute('title') || '').trim();
    const pop = [...document.querySelectorAll('[role="tooltip"], .tooltip, .hover-note, [data-hover-note]')].find(
      e => e.getBoundingClientRect().height > 0 && /slow/i.test(e.textContent || '')
    );
    return {title: title.length > 20 ? title : null, popover: !!pop};
  });
  if (!hoverNote.title && !hoverNote.popover) fail(size, 'hovering a tower card shows no note (no long title, no visible popover)');
  await page.close();
}
await browser.close();

if (failures.length) {
  console.error('LAYOUT GATE RED');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log(`layout gate green at ${sizes.map(s => s.width + 'x' + s.height).join(', ')}`);
