#!/usr/bin/env node
/**
 * Child-facing v40 art & navigation smoke with isolated synthetic browser state.
 * No live Supabase calls, no access to either child's production profile.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';

let pw;
try{pw=await import('playwright');}
catch{pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
const {chromium}=pw.chromium?pw:pw.default;
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.V40_QA_PORT||4592);
const origin='http://127.0.0.1:'+port;
const screenshotDir=process.env.V40_QA_OUTPUT||'/tmp/sparkle-v40-art-qa';
await fs.mkdir(screenshotDir,{recursive:true});
const server=spawn('python3',['-m','http.server',String(port),'--bind','127.0.0.1'],{cwd:root,stdio:'ignore'});
let browser;
const results=[];
try{
  let ready=false;
  for(let i=0;i<40;i++){
    if(server.exitCode!==null)break;
    try{const response=await fetch(origin+'/index.html');if(response.ok){ready=true;break;}}catch{}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  assert(ready,'Local test server failed to start');
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  for(const device of [
    {name:'galaxy',width:390,height:844,who:'se'},
    {name:'tablet',width:1024,height:768,who:'tae'},
    {name:'compact',width:360,height:740,who:'se'}
  ]){
    const context=await browser.newContext({
      viewport:{width:device.width,height:device.height},hasTouch:true,isMobile:device.width<900,
      deviceScaleFactor:1,locale:'ko-KR',reducedMotion:'reduce'
    });
    const page=await context.newPage(),errors=[];
    page.on('pageerror',err=>errors.push(err.message));
    await page.route('**/*.supabase.co/**',route=>route.abort());
    try{
      await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
      await page.locator('[data-learner="'+device.who+'"]').click();
      assert.equal(await page.locator('[data-learner="'+device.who+'"]').getAttribute('aria-pressed'),'true');
      assert((await page.locator('#entry-village-link').getAttribute('href')).includes('who='+device.who));
      assert((await page.locator('#entry-learning-link').getAttribute('href')).includes('who='+device.who));
      assert(await page.locator('.entry-island-art').evaluate(el=>el.complete&&el.naturalWidth>0),'Kenney splash image loads');
      for(const selector of ['#entry-village-link','#entry-learning-link']){
        const rect=await page.locator(selector).boundingBox();
        assert(rect&&rect.height>=60,'Landing CTAs stay large: '+selector);
      }
      const landingExtent=await page.evaluate(()=>document.documentElement.scrollWidth);
      assert(landingExtent<=device.width+3,'Landing must not horizontally overflow: '+device.name+' '+landingExtent);
      await page.screenshot({path:screenshotDir+'/'+device.name+'-landing.png'});

      await page.locator('#entry-learning-link').click();
      await page.locator('.world-v40-journey').waitFor({state:'visible',timeout:25000});
      assert.equal(await page.locator('.world-v40-step').count(),3,'Three learning missions should remain present');
      assert.equal(await page.locator('.world-v40-explore').count(),1,'Child can still explore village');
      const assetCheck=await page.locator('.world-v40-journey img').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0));
      assert(assetCheck,'Learning route sprites load from the same pack');
      assert((await page.locator('.world-v40-explore').getAttribute('href')).includes('who='+device.who));
      await page.screenshot({path:screenshotDir+'/'+device.name+'-learning.png'});

      await page.goto(origin+'/village/?who='+device.who,{waitUntil:'domcontentloaded'});
      await page.locator('#lite').click();
      await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',undefined,{timeout:35000});
      await page.locator('#vh-map').click();
      await page.locator('.vh-v40-map-place').first().waitFor({state:'visible',timeout:10000});
      assert.equal(await page.locator('.vh-v40-map-place').count(),11);
      const tileMetrics=await page.locator('.vh-v40-map-place').first().evaluate(tile=>({
        width:tile.getBoundingClientRect().width,
        left:tile.getBoundingClientRect().left,
        parentLeft:tile.parentElement.getBoundingClientRect().left,
        parentRight:tile.parentElement.getBoundingClientRect().right
      }));
      assert(tileMetrics.width>=135&&tileMetrics.left>=tileMetrics.parentLeft-2&&tileMetrics.left<tileMetrics.parentRight,
        'First world tile is visible and does not collapse: '+JSON.stringify(tileMetrics));
      assert.equal(await page.locator('.vh-v40-more-stories > summary').count(),1);
      const mapArt=await page.locator('.vh-v40-map-place img').evaluateAll(async images=>Promise.all(images.map(async image=>{
        // Lazy-loaded items may be beyond the horizontal viewport.
        image.loading='eager'; try{await image.decode();}catch{}
        return {src:image.getAttribute('src'),width:image.naturalWidth};
      })));
      assert(mapArt.every(image=>image.width>0),'World sprites missing: '+JSON.stringify(mapArt.filter(image=>!image.width)));
      const england=page.locator('.vh-v40-map-place[aria-label^="영어학교"]');
      assert.equal(await england.count(),1,'World route preserves school hotspot');
      assert((await england.boundingBox())?.height>=112,'World location is readable and touchable');
      if(process.env.DEBUG_V40_MAP==='1') console.log('MAP_DEBUG',device.name,await page.locator('.vh-v40-map').evaluate(el=>({scrollLeft:el.scrollLeft,scrollWidth:el.scrollWidth,clientWidth:el.clientWidth,gridTemplateColumns:getComputedStyle(el).gridTemplateColumns,gridTemplateRows:getComputedStyle(el).gridTemplateRows,children:[...el.children].slice(0,5).map(c=>({text:c.textContent,x:c.getBoundingClientRect().x,width:c.getBoundingClientRect().width}))})));
      const mapExtent=await page.evaluate(()=>document.documentElement.scrollWidth);
      assert(mapExtent<=device.width+3,'World must not horizontally overflow: '+device.name);
      await page.screenshot({path:screenshotDir+'/'+device.name+'-map.png'});
      assert.deepEqual(errors,[],'Browser console page errors: '+device.name);
      results.push({device:device.name,profile:device.who,viewport:device.width+'x'+device.height,sprites:28,mapPlaces:11,learningSteps:3,errors:0});
      console.log('PASS_V40_WORLD',JSON.stringify(results.at(-1)));
    }finally{await context.close();}
  }
  await fs.writeFile(screenshotDir+'/summary.json',JSON.stringify({ok:true,results},null,2));
  console.log('PASS_V40_ART_QA',results.length,'independent devices',screenshotDir);
}finally{
  if(browser)await browser.close();
  server.kill('SIGTERM');
}
