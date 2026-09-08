import { chromium } from '@playwright/test';
const URL = process.env.GARDEN_URL || 'http://127.0.0.1:5174';
const out = process.argv[2] || 'fleet-r6-art/integrate/shots/peek.png';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 1000 } });
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type()==='error' && errs.push('console: '+m.text()));
await p.addInitScript(() => { try { localStorage.clear(); } catch {} });
await p.goto(URL); await p.waitForFunction(() => window.__garden);
await p.evaluate(() => {
  const g = window.__garden.game;
  g.coins = 5000;
  const slots = [['thorn',3,3],['sap',6,3],['bloom',9,3],['prism',3,6],['hedge',6,6],['ember',9,6],['lantern',5,5]];
  for (const [t,x,z] of slots) g.place(t,x,z);
  g.towers[0].level = 2; g.towers[1].level = 3;
  document.querySelector('#start').click();
  window.__garden.step(4);
  // One of every creature, laid out in a column so the whole cast can be checked at once.
  const kinds = ['grub','runner','armor','moth','brood','grubling','warden','boss'];
  const base = g.enemies[0];
  g.enemies = kinds.map((kind, i) => ({
    ...base, id: 900 + i, kind, x: 1 + i * 1.5, z: 4, hp: 60 - i * 6, maxHp: 60,
    flying: kind === 'moth', target: { x: 12, z: 4 },
  }));
  window.__garden.step(0.001);
  window.__garden.setPaused(true);
});
await p.addStyleTag({ content: '#paused{display:none!important}' });
await p.waitForTimeout(700);
await p.screenshot({ path: out });
console.log('errors:', errs.length ? errs : 'none');
console.log('enemies:', await p.evaluate(() => window.__garden.game.enemies.map(e=>e.kind)));
await b.close();
