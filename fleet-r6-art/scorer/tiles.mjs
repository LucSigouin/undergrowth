import { chromium } from '@playwright/test';
const tiles = [
  ['tile-meadow-a', '/art/tile-meadow-a@256.webp', 256],
  ['tile-meadow-b', '/art/tile-meadow-b@256.webp', 256],
  ['tile-meadow-c', '/art/tile-meadow-c@256.webp', 256],
  ['tile-path', '/art/tile-path@256.webp', 256],
  ['ground-outer', '/art/ground-outer@512.webp', 512],
  ['apron-wood', '/art/apron-wood@512.webp', 512],
];
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1600 }, deviceScaleFactor: 1 });
for (const [name, src, size] of tiles) {
  const px = Math.min(size, 340) * 3;
  await page.setContent(`<body style="margin:0"><div id="g" style="width:${px}px;height:${px}px;background:url(http://localhost:5175${src});background-size:${px / 3}px ${px / 3}px;"></div></body>`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `fleet-r6-art/scorer/shots/tile3x3-${name}.png`, clip: { x: 0, y: 0, width: px, height: px } });
  console.log(`tile3x3-${name}.png (${px}px, tile shown at ${px / 3}px)`);
}
await browser.close();
