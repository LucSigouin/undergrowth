// The interactive board states: the placement ghost (free and blocked), the range ring,
// the lantern boost halos, and a shot in flight.
import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1200, height: 1000 }, deviceScaleFactor: 2 });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { try { localStorage.clear(); } catch {} });
await p.goto('http://127.0.0.1:5174'); await p.waitForFunction(() => window.__garden);
const cell = (x, z) => p.evaluate(([x, z]) => window.__garden.world.cellScreen(x, z), [x, z]);
await p.evaluate(() => {
  const g = window.__garden.game;
  g.coins = 9000;
  g.place('lantern', 5, 4);
  g.place('bloom', 5, 3);
  g.place('ember', 6, 4);
  g.place('thorn', 4, 4);
});
await p.waitForTimeout(300);
// Ghost over a free square.
await p.locator('[data-build="prism"]').click();
let c = await cell(7, 2); await p.mouse.move(c.x, c.y);
await p.waitForTimeout(300);
await p.screenshot({ path: 'fleet-r6-art/integrate/shots/state-ghost-free.png' });
console.log('free ghost tint', await p.evaluate(() => {
  const g = window.__garden.world.towerPreview; let out = null;
  g.traverse(m => { if (m.isMesh) out = { color: '#' + m.material.color.getHexString(), opacity: m.material.opacity, transparent: m.material.transparent }; });
  return out;
}));
// A hedge that would seal the route: the ghost must go red without being on a tower.
await p.locator('[data-build="hedge"]').click();
c = await cell(0, 3); await p.mouse.move(c.x, c.y);
await p.waitForTimeout(200);
c = await cell(0, 4); await p.mouse.move(c.x, c.y);
await p.waitForTimeout(300);
await p.screenshot({ path: 'fleet-r6-art/integrate/shots/state-ghost-blocked.png' });
console.log('blocked ghost tint', await p.evaluate(() => {
  const g = window.__garden.world.towerPreview; let out = 'no ghost';
  g?.traverse(m => { if (m.isMesh) out = { color: '#' + m.material.color.getHexString(), opacity: m.material.opacity }; });
  return out;
}));
await b.close();
