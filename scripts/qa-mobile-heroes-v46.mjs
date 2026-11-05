#!/usr/bin/env node
/** Public-source heroes and exact mobile camera framing; never touches real saved profiles. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let pw;try{pw=await import('playwright');}catch{pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.COHESIVE_QA_ORIGIN||'http://127.0.0.1:4666').replace(/\/$/,'');
const out=process.env.HERO_QA_OUTPUT||'/tmp/sparkle-v46-mobile-heroes';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
try{
 for(const who of ['tae','se']){
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:1,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(/NullReferenceException|ArgumentNullException|InvalidOperationException|missing catalog/i.test(m.text()))errors.push(m.text());});
  await page.route('**/*.supabase.co/**',r=>r.abort());
  async function probe(){
   await page.evaluate(()=>{window.SparkleNativeWorldEvidence=null;window.SparkleNativeWorldProbe();});
   await page.waitForFunction(()=>window.SparkleNativeWorldEvidence?.version==='cohesive-v46-20261105',null,{timeout:10000});
   return page.evaluate(()=>window.SparkleNativeWorldEvidence);
  }
  async function centre(label){
   const r=await probe();
   assert(r.nativeHero&&r.heroAssetSource.includes('Pixor Fairy')&&r.heroAssetSource.includes('CC0'),'Wrong public hero source');
   const x=Math.abs(r.heroViewportX-.5),y=Math.abs(r.heroViewportY-.5);
   assert(x<.02&&y<.02,'Hero is not at screen centre '+label+': '+JSON.stringify({x:r.heroViewportX,y:r.heroViewportY}));
   const viewport=page.viewportSize();
   const canvas=await page.locator('#canvas').boundingBox();
   assert(canvas&&canvas.width>0&&canvas.height>0,'Actual game canvas missing');
   const projected={x:canvas.x+r.heroViewportX*canvas.width,y:canvas.y+(1-r.heroViewportY)*canvas.height};
   assert(Math.abs(projected.x-viewport.width/2)<viewport.width*.02&&Math.abs(projected.y-viewport.height/2)<viewport.height*.02,
     'Visual centre must be the actual viewport centre, not a clipped canvas');
   assert.equal(await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id,projected),'canvas','HUD covers the centred hero');
   return {label,x:r.heroViewportX,y:r.heroViewportY,errorPixels:Math.hypot(x*viewport.width,y*viewport.height),worldX:r.heroWorldX,worldZ:r.heroWorldZ,source:r.heroAssetSource};
  }
  try{
   await page.goto(origin+'/village/?who='+who+'&autostart=1&nativeQA=1&environmentPreview=1',{waitUntil:'domcontentloaded',timeout:45000});
   await page.waitForFunction(()=>document.querySelector('#loading')?.hidden&&document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:150000});
   await page.locator('#vh-first-visit').waitFor({state:'hidden',timeout:12000});
   await page.evaluate(()=>window.SparkleEnvironmentPreview('spring','noon'));
   const samples=[];
   for(const size of [{width:390,height:844},{width:360,height:740},{width:844,height:390},{width:768,height:1024}]){
    await page.setViewportSize(size);await page.waitForTimeout(550);
    samples.push({...await centre(size.width+'x'+size.height),viewport:size});
    assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=size.width+2);
    await page.screenshot({path:out+'/'+who+'-'+size.width+'x'+size.height+'.png'});
   }
   await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);
   // Exercise the centred camera with actual wing/body animation enabled as well.
   await page.locator('#vh-more').click();
   if(await page.locator('#vh-motion').getAttribute('aria-pressed')==='true')await page.locator('#vh-motion').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.reducedMotion==='false');
   await page.locator('#vh-more').click();
   await page.waitForTimeout(350);
   const start=await centre('before-walk');
   await page.locator('#vh-map').click();
   await page.locator('.vh-story-freeroam > summary').click();
   await page.locator('.vh-story-freeroam button').filter({hasText:'소풍길'}).click();
   await page.waitForFunction(()=>document.querySelector('#village-dialog-wrap')?.hidden&&!window.SparkleInteriorEvidence?.open);
   const moving=[];
   for(let i=0;i<5;i++){await page.waitForTimeout(400);moving.push(await centre('walking-'+i));}
   assert(moving.some(r=>Math.hypot(r.worldX-start.worldX,r.worldZ-start.worldZ)>.3),'The character must actually move while camera follows');
   await page.locator('#vh-garden').click();
   await page.locator('#village-ui[data-mode="garden"]').waitFor({timeout:25000});
   await page.locator('#vh-exit').click();await page.waitForTimeout(550);
   samples.push(await centre('after-interior-return'));
   assert.deepEqual(errors,[]);
   const result={who,source:'Pixor Fairy / Frakassets / CC0-1.0',samples,moving,animationEnabled:true,hudDoesNotCoverHero:true,centredWhileMoving:true,exteriorRestored:true,jsErrors:0};
   results.push(result);console.log('V46_MOBILE_HERO_PASS',who,'max error',Math.max(...samples.concat(moving).map(x=>x.errorPixels)),'pixels');
  }catch(e){await page.screenshot({path:out+'/'+who+'-failure.png'}).catch(()=>{});throw e;}
  finally{await context.close();}
 }
 await fs.writeFile(out+'/summary.json',JSON.stringify({pass:true,productionDataTouched:false,physicalDeviceVerified:false,results},null,2));
 console.log('V46_PUBLIC_FAIRIES_AND_CENTRE_ALL_PASS');
}finally{await browser.close();}
