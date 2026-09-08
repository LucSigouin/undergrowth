// Scorer check: render workbench/log.html, scroll through so lazy images load, report
// horizontal overflow and images that fail to load, save screenshots. Read-only on the project.
import { chromium } from '@playwright/test';

const url = 'file:///Users/ls/Claude-Workspace/personal/undergrowth-v2/workbench/log.html';
const browser = await chromium.launch({ headless: true });
for (const [name, viewport] of [
  ['log-390', { width: 390, height: 844 }],
  ['log-1440', { width: 1440, height: 1000 }],
]) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  const images = await page.evaluate(() =>
    [...document.images].map((img) => [img.getAttribute('src'), img.naturalWidth]),
  );
  const broken = images.filter(([, w]) => w === 0);
  console.log(`${name}: overflow ${overflow}px, images ${images.length}, broken ${broken.length}`);
  for (const [src] of broken) console.log(`  broken: ${src}`);
  await page.screenshot({ path: `/tmp/claude/shoot-check/${name}.png`, fullPage: false });
  await context.close();
}
await browser.close();
