import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1100, height: 1000 }, deviceScaleFactor: 3 });
await p.addInitScript(() => { try { localStorage.clear(); } catch {} });
await p.goto('http://127.0.0.1:5174'); await p.waitForFunction(() => window.__garden);
await p.evaluate(() => {
  const { game, world } = window.__garden;
  game.coins = 9000;
  game.place('thorn', 5, 2);
  document.querySelector('#start').click();
  window.__garden.step(2);
  const base = game.enemies[0];
  game.enemies = [
    { ...base, id: 801, kind: 'runner', x: 5, z: 6, target: { x: 6, z: 6 } },
    { ...base, id: 802, kind: 'runner', x: 4, z: 5, target: { x: 3, z: 5 } },
    { ...base, id: 803, kind: 'runner', x: 6, z: 4, target: { x: 6, z: 5 } },
    { ...base, id: 804, kind: 'moth', x: 4, z: 3, target: { x: 4, z: 2 } },
  ];
  window.__garden.step(0.001);
  // Aim the thorn at a square straight down the screen (world +x).
  world.playEvent({ type: 'shot', tower: game.towers[0].id, towerType: 'thorn', x: 9, z: 2 }, game);
  window.__garden.setPaused(true);
});
await p.addStyleTag({ content: '#paused{display:none!important}' });
await p.waitForTimeout(500);
const box = await p.evaluate(() => {
  const w = window.__garden.world;
  const a = w.cellScreen(2, 8), b2 = w.cellScreen(8, 1);
  return { x: Math.round(Math.min(a.x,b2.x)) - 30, y: Math.round(Math.min(a.y,b2.y)) - 30,
           width: Math.round(Math.abs(b2.x-a.x)) + 60, height: Math.round(Math.abs(b2.y-a.y)) + 60 };
});
await p.screenshot({ path: 'fleet-r6-art/integrate/shots/zoom-aim.png', clip: box });
await b.close();
console.log('shot', box);
