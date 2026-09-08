import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const seen = [];
p.on('response', r => { if (r.url().includes('/art/')) seen.push(r.status() + ' ' + r.url().split('/art/')[1]); });
p.on('requestfailed', r => seen.push('FAIL ' + r.url() + ' ' + r.failure()?.errorText));
await p.addInitScript(() => { try { localStorage.clear(); } catch {} });
await p.goto('http://127.0.0.1:5174'); await p.waitForFunction(() => window.__garden);
await p.evaluate(() => { window.__garden.game.coins = 5000; for (const [t,x,z] of [['thorn',3,3],['sap',6,3],['hedge',6,6]]) window.__garden.game.place(t,x,z); });
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => {
  const { game, world } = window.__garden;
  const g = world.towerMeshes.get(game.towers[0].id);
  const s = g.userData.sprite;
  return { img: !!s.material.map.image, w: s.material.map.image?.width, src: s.material.map.image?.src,
           inScene: !!g.parent };
}));
console.log(seen.join('\n'));
await b.close();
