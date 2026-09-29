// Frames per second of the running board: node tools/fps.mjs [w h]
import { chromium } from '@playwright/test';
const [w = '1920', h = '1080'] = process.argv.slice(2);
const browser = await chromium.launch({ headless: true, args: process.env.GPU ? ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto(process.env.GARDEN_URL || 'http://localhost:5195', { waitUntil: 'commit' });
await page.waitForFunction(() => window.__garden, null, { timeout: 90000 });
if (process.env.TOGGLE) await page.evaluate(process.env.TOGGLE);
const fps = await page.evaluate(
  () =>
    new Promise((done) => {
      let n = 0;
      const t0 = performance.now();
      const tick = () => (++n, performance.now() - t0 < 3000 ? requestAnimationFrame(tick) : done((n * 1000) / (performance.now() - t0)));
      requestAnimationFrame(tick);
    }),
);
const info = await page.evaluate(() => {
  const r = window.__garden.world.renderer;
  const gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  return { software: window.__garden.world.software, renderer: ext && gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) };
});
const probe = await page.evaluate(() => { const avg = (a) => a && a.length ? (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-'; return `render ${avg(window.__t)}ms sync ${avg(window.__t2)}ms ratio ${window.__garden.world.pixelRatio.toFixed(2)}`; });
console.log(probe);
console.log(`${w}x${h} fps ${fps.toFixed(1)}`, JSON.stringify(info));
await browser.close();
