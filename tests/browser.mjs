import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.__garden);
assert.ok(await page.evaluate(()=>{const w=window.__garden.world,a=w.cellScreen(0,0),b=w.cellScreen(12,0),c=w.cellScreen(0,8),scene=document.querySelector('#scene').getBoundingClientRect(),garden=document.querySelector('.garden-strip').getBoundingClientRect();return Math.abs(a.y-b.y)<.01&&Math.abs(a.x-c.x)<.01&&Math.abs(scene.width-innerWidth*.75)<1&&garden.bottom<=scene.top+1}));
assert.equal(await page.locator('[data-unlock="1"]').isDisabled(),true);assert.equal(await page.locator('[data-plot="0"] small').textContent(),'Not producing');
await page.screenshot({path:'test-results/desktop.png',fullPage:true});
await page.locator('[data-farm="0"]').click();assert.equal(await page.evaluate(()=>window.__garden.game.coins),175);await page.locator('[data-farm="0"]').click();assert.equal(await page.evaluate(()=>window.__garden.game.farms[0].level),2);assert.equal(await page.locator('[data-unlock="1"]').isDisabled(),false);
const clickCell=async(x,z)=>{const p=await page.evaluate(([x,z])=>window.__garden.world.cellScreen(x,z),[x,z]);await page.mouse.click(p.x,p.y)};
await clickCell(3,3);await page.locator('[data-build="sap"]').click();await clickCell(6,3);await page.locator('[data-build="thorn"]').click();await clickCell(9,3);assert.equal(await page.evaluate(()=>window.__garden.game.towers.length),3);
await page.locator('#start').click();await page.evaluate(()=>window.__garden.step(20));assert.ok(await page.evaluate(()=>window.__garden.game.wood>=12));await clickCell(3,3);await page.locator('[data-upgrade="reach"]').click();assert.equal(await page.evaluate(()=>window.__garden.game.towers[0].level),2);
await page.screenshot({path:'test-results/combat.png',fullPage:true});await page.evaluate(()=>window.__garden.save());await page.reload();await page.waitForFunction(()=>window.__garden);assert.equal(await page.evaluate(()=>window.__garden.game.towers.length),3);assert.equal(await page.evaluate(()=>window.__garden.game.farms[0].level),2);
await page.evaluate(()=>{window.__garden.game.coins=1000;window.__garden.step(.1)});for(const i of[1,2,3]){await page.locator(`[data-unlock="${i}"]`).click();assert.equal(await page.locator(`[data-plot="${i}"] small`).textContent(),'Not producing');await page.locator(`[data-farm="${i}"]`).click()}
await page.evaluate(()=>window.__garden.step(10));assert.ok(await page.evaluate(()=>window.__garden.game.diamond>=1));
await page.locator('#path').click();await page.locator('#help').click();assert.ok(await page.locator('#modal').isVisible());await page.locator('#modal-ok').click();await page.locator('#restart').click();await page.locator('#modal-cancel').click();assert.equal(await page.evaluate(()=>window.__garden.game.towers.length),3);
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/mobile.png',fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
assert.deepEqual(errors,[]);console.log('Browser checks passed: 75% map, straight board, top garden, buy/upgrade/unlock all resources, automatic production, combat, tower upgrade, save/reload, controls, mobile overflow, no JS errors.');await browser.close();
