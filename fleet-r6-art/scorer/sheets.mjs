// Contact sheets from the lane finals, on a checker background so alpha shows.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const TOWERS = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern'];
const ENEMIES = ['grub', 'grubling', 'runner', 'moth', 'armor', 'warden', 'brood', 'boss'];
const ICONS = ['thorn', 'sap', 'bloom', 'prism', 'hedge', 'ember', 'lantern', 'wood', 'rock', 'iron', 'diamond', 'coin', 'life'];
const checker = 'background:repeating-conic-gradient(#777 0% 25%, #999 0% 50%) 0 0/32px 32px;';
const cell = (src, label, size) =>
  `<div style="text-align:center;font:12px sans-serif;color:#fff"><img src="${src}" width="${size}" height="${size}"><br>${label}</div>`;
const sheets = [
  ['sheet-towers-512.png', TOWERS.map((t) => cell(`../towers/tower-${t}-l2@512.png`, `${t} l2`, 220)).join(''), 'towers at level 2, shown 220px'],
  ['sheet-towers-l1l2l3.png', TOWERS.map((t) => [1, 2, 3].map((l) => cell(`../towers/tower-${t}-l${l}@512.png`, `${t} l${l}`, 150)).join('')).join(''), 'all 21 towers'],
  ['sheet-icons-256.png', ICONS.map((i) => cell(`../icons/icon-${i}@256.png`, i, 128)).join(''), '13 icons shown 128px'],
  ['sheet-enemies-256.png', ENEMIES.map((e) => cell(`../enemies/enemy-${e}@256.png`, e, 160)).join(''), '8 enemies shown 160px'],
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1500, height: 1200 } });
for (const [name, cells, note] of sheets) {
  const html = `<body style="margin:0;${checker}"><div style="display:flex;flex-wrap:wrap;gap:8px;padding:10px">${cells}</div></body>`;
  writeFileSync(`fleet-r6-art/scorer/${name}.html`, html);
  await page.goto(`file:///Users/ls/Claude-Workspace/personal/undergrowth-v2/fleet-r6-art/scorer/${name}.html`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `fleet-r6-art/scorer/shots/${name}`, fullPage: true });
  console.log(`${name}: ${note}`);
}
await browser.close();
