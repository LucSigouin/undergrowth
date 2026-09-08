// Orientation proof: a maze that forces corners, one enemy per heading, and a thorn aiming.
import { chromium } from '@playwright/test';
const b = await chromium.launch({ headless: true });
const p = await b.newPage({ viewport: { width: 1100, height: 1000 } });
p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.addInitScript(() => { try { localStorage.clear(); } catch {} });
await p.goto('http://127.0.0.1:5174'); await p.waitForFunction(() => window.__garden);
await p.evaluate(() => {
  const { game } = window.__garden;
  game.coins = 9000;
  // A hedge maze so the route zigzags and creatures must turn.
  for (const z of [0,1,2,3,4,5,6]) game.place('hedge', 3, z);
  for (const z of [2,3,4,5,6,7,8]) game.place('hedge', 7, z);
  game.place('thorn', 5, 2);
  document.querySelector('#start').click();
  window.__garden.step(3);
  const base = game.enemies[0];
  // Four creatures, one heading each, so a wrong rotation is obvious.
  game.enemies = [
    { ...base, id: 801, kind: 'runner', x: 5, z: 1, target: { x: 6, z: 1 } },
    { ...base, id: 802, kind: 'runner', x: 5, z: 3, target: { x: 4, z: 3 } },
    { ...base, id: 803, kind: 'runner', x: 5, z: 5, target: { x: 5, z: 6 } },
    { ...base, id: 804, kind: 'runner', x: 5, z: 7, target: { x: 5, z: 8 } },
    { ...base, id: 805, kind: 'grub', x: 9, z: 4, target: { x: 12, z: 4 } },
  ];
  window.__garden.step(0.001);
  window.__garden.setPaused(true);
});
await p.addStyleTag({ content: '#paused{display:none!important}' });
await p.waitForTimeout(600);
await p.screenshot({ path: 'fleet-r6-art/integrate/shots/orient.png' });
await p.screenshot({ path: 'fleet-r6-art/integrate/shots/orient-zoom.png', clip: { x: 150, y: 400, width: 480, height: 140 } });
console.log(await p.evaluate(() => {
  const { world, game } = window.__garden;
  const deg = r => Math.round((r * 180) / Math.PI);
  return {
    enemies: game.enemies.map(e => [e.id, e.kind, 'to', e.target.x - e.x, e.target.z - e.z,
      'spriteY', deg(world.enemyMeshes.get(e.id).userData.sprite.rotation.y)]),
    thornHead: deg(world.towerMeshes.get(game.towers.find(t=>t.type==='thorn').id).userData.head.rotation.y),
  };
}));
await b.close();
