/** Real Unity 3D hotspot check. A canvas raycast against an illustrated
 * building must open the host-owned subject district, not a fake DOM click.
 * Coordinates are from the 1280×800 v0.8 scene screenshot (English school).
 */
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const mod=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=mod.chromium?mod:mod.default;
const origin=(process.env.UNIFIED_ORIGIN||'http://127.0.0.1:4184').replace(/\/$/,'');
const dir=process.env.UNIFIED_QA_OUTPUT||
 '/Users/01chungee10/AI-Interop/evidence/unified-village-20261013/hotspots';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:800},
 locale:'ko-KR',reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:90000});
 await page.locator('[data-learner="se"]').click();
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#loading').hidden&&
  document.querySelector('#village-ui').dataset.ready==='true',null,{timeout:180000});
 await page.waitForTimeout(1100); // Camera tween before raycast
 // Collide with a visible English-school sprite, not the area navigation rail.
 const point={x:170,y:285};
 const box=await page.locator('#canvas').boundingBox();
 assert(point.x>=box.x&&point.x<box.x+box.width&&point.y>=box.y&&point.y<box.y+box.height);
 await page.mouse.click(point.x,point.y);
 await page.waitForFunction(()=>!document.querySelector('#village-dialog-wrap').hidden,null,{timeout:18000});
 const title=(await page.locator('#vh-title').innerText()).trim();
 assert.match(title,/영어 숲/,'Actual 3D school building did not open English district');
 assert((await page.locator('.vh-mission-card').count())>=2,'English zone has no learning games');
 await page.screenshot({path:path.join(dir,'real-world-english-tap.png')});
 assert.equal(errors.length,0,errors.join('; '));
 const evidence={pass:true,origin,who:'se',viewport:'1280x800',point,
  title,access:'actual Unity canvas raycast via world hotspot',
  notes:'Headless Chromium software WebGL, not physical Galaxy touch',
  screenshot:path.join(dir,'real-world-english-tap.png')};
 await writeFile(path.join(dir,'qa-real-hotspot.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log('PASS Unity real 3D hotspot: English school -> '+title);
}finally{await context.close();await browser.close();}
