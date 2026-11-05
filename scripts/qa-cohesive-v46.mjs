#!/usr/bin/env node
/** Current art in real controls, not a showcase. Isolated synthetic profiles only. */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
let pw;try{pw=await import('playwright');}catch{pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.COHESIVE_QA_ORIGIN||'http://127.0.0.1:4666').replace(/\/$/,'');
const out=process.env.COHESIVE_QA_OUTPUT||'/tmp/sparkle-v46-cohesive-qa';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[];
async function decoded(page,selector){
 await page.locator(selector).first().waitFor({state:'visible',timeout:20000});
 const values=await page.locator(selector).evaluateAll(async images=>Promise.all(images.map(async image=>{image.loading='eager';try{await image.decode();}catch{}return {src:image.src,ok:image.complete&&image.naturalWidth>0};})));
 assert(values.length&&values.every(x=>x.ok),'Missing visible asset: '+JSON.stringify(values.filter(x=>!x.ok)));
 return values;
}
try{
 for(const d of [{name:'tablet',who:'tae',width:1024,height:768},{name:'galaxy',who:'se',width:390,height:844}]){
  const context=await browser.newContext({viewport:{width:d.width,height:d.height},hasTouch:true,isMobile:d.width<700,locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[],engineErrors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(/ArgumentNullException|NullReferenceException|V46 .*missing|InvalidOperationException/.test(m.text()))engineErrors.push(m.text());});
  await page.route('**/*.supabase.co/**',r=>r.abort());
  const close=async()=>{if(await page.locator('#village-dialog-wrap').isVisible()){const home=page.locator('.vh-completion-home');await (await home.isVisible()?home:page.locator('#vh-exit')).click();}await page.waitForFunction(()=>document.querySelector('#village-dialog-wrap')?.hidden&&!window.SparkleInteriorEvidence?.open);};
  const shortcut=async(id,mode)=>{await close();if(!(await page.locator('#'+id).isVisible()))await page.locator('#vh-more').click();await page.locator('#'+id).click();await page.waitForFunction(mode=>document.querySelector('#village-ui')?.dataset.mode===mode,mode,{timeout:65000});};
  try{
   await page.goto(origin+'/?v=46',{waitUntil:'domcontentloaded'});
   const portraits=await decoded(page,'.entry-learner-choice img');assert(portraits.every(x=>x.src.includes('/cohesive-v46/characters/')));
   await page.locator('[data-learner="'+d.who+'"]').click();assert((await page.locator('#entry-village-link').getAttribute('href')).includes('v=46'));
   await page.screenshot({path:out+'/'+d.name+'-entry.png'});
   await page.goto(origin+'/village/?who='+d.who+'&autostart=1&nativeQA=1&environmentPreview=1',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true'&&window.SparkleNativeWorldEvidence?.version==='cohesive-v46-20261105',null,{timeout:150000});
   await page.evaluate(()=>window.SparkleEnvironmentPreview('spring','noon'));
   await page.locator('#vh-first-visit').waitFor({state:'hidden',timeout:12000});
   await page.waitForTimeout(250);await page.evaluate(()=>window.SparkleNativeWorldProbe());
   const native=await page.evaluate(()=>window.SparkleNativeWorldEvidence);
   assert(native.nativeHero&&native.nativeActors>=4&&native.nativeMarine>=1&&native.cohesiveInstances>30,'Real models not in gameplay');
   assert.equal(native.legacySprites,0,'Initial world still contains legacy sprite characters');
   assert((await page.locator('#vh-map .v46-control-icon').count())===1);
   const avatar=await page.locator('.vh-avatar').evaluate(el=>getComputedStyle(el).backgroundImage);
   assert(avatar.includes('/cohesive-v46/characters/'+d.who+'.png'));
   await page.screenshot({path:out+'/'+d.name+'-native-world.png'});
   await page.locator('#vh-more').click();await page.locator('#vh-wave').click();
   let waveVerified=false;
   for(let attempt=0;attempt<12;attempt++){
    await page.evaluate(()=>window.SparkleNativeWorldProbe());
    if(await page.evaluate(()=>window.SparkleNativeWorldEvidence?.heroMotion==='Wave')){waveVerified=true;break;}
    await page.waitForTimeout(80);
   }
   assert(waveVerified,'Native hero did not receive existing wave command');
   await page.locator('#vh-more').click();
   await shortcut('vh-friends','friends');
   const friends=await decoded(page,'.vh-friend-icon img');assert(friends.every(x=>x.src.includes('/cohesive-v46/characters/')));
   await page.screenshot({path:out+'/'+d.name+'-friends.png'});
   await shortcut('vh-wardrobe','wardrobe');
   const styles=await decoded(page,'.vh-style-portrait img');assert(styles.every(x=>x.src.includes('/characters/'+d.who+'.png')));
   await page.screenshot({path:out+'/'+d.name+'-wardrobe.png'});
   await shortcut('vh-pond','pond');
   const fish=await decoded(page,'.vh-pond-fish img');assert(fish.every(x=>x.src.includes('/cohesive-v46/marine/')));
   await page.locator('.vh-pond-fish').first().scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+d.name+'-pond-gallery.png'});
   await shortcut('vh-ocean','ocean');
   const sea=await decoded(page,'.vh-pond-fish img');assert(sea.every(x=>x.src.includes('/cohesive-v46/marine/')));
   await page.locator('.vh-pond-fish').first().scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+d.name+'-ocean-gallery.png'});
   await shortcut('vh-career','career');
   const careers=await decoded(page,'.career-card-artwork');assert(careers.every(x=>x.src.includes('/cohesive-v46/careers/')));
   await page.locator('.career-card').first().scrollIntoViewIfNeeded();await page.screenshot({path:out+'/'+d.name+'-career.png'});
   await close();
   const viewport=await page.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));assert(viewport.scroll<=viewport.w+2);
   assert.deepEqual(errors,[]);assert.deepEqual(engineErrors,[]);
   results.push({device:d.name,who:d.who,nativeHero:true,nativeActors:native.nativeActors,nativeMarine:native.nativeMarine,legacySprites:native.legacySprites,cohesiveInstances:native.cohesiveInstances,portraits:true,friends:true,wardrobe:true,pond:true,ocean:true,career:true,waveVerified,jsErrors:0});
   console.log('V46_COHESIVE_BROWSER_PASS',JSON.stringify(results.at(-1)));
  }catch(e){await page.screenshot({path:out+'/'+d.name+'-failure.png'}).catch(()=>{});console.error('V46_FAIL',d.name,e.message,errors,engineErrors);throw e;}
  finally{await context.close();}
 }
 // Standalone progress, gifts and the guardian report use the same new assets.
 const context=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',reducedMotion:'reduce'});
 const page=await context.newPage();await page.route('**/*.supabase.co/**',r=>r.abort());
 try{
  await page.goto(origin+'/learning.html?who=se&v=46',{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>document.querySelector('.home-screen')&&document.documentElement.dataset.artRevision==='46');
  assert((await page.locator('.fairy-portrait.se').first().evaluate(el=>getComputedStyle(el).backgroundImage)).includes('/characters/se.png'));
  await page.locator('.nav [data-action="collection"]').click();await page.waitForFunction(()=>document.body.dataset.view==='collection');
  await page.screenshot({path:out+'/standalone-gifts.png'});
  const gifts=await decoded(page,'.native-art');assert(gifts.every(x=>/\/cohesive-v46\/(icons|gifts)\//.test(x.src)));
  await page.getByRole('button',{name:'가족 신청 확인',exact:true}).click();await page.locator('#modal').waitFor();
  assert(await page.locator('#modal .v46-panel-icon').isVisible());await page.screenshot({path:out+'/parent-report.png'});
 }finally{await context.close();}
 await fs.writeFile(out+'/summary.json',JSON.stringify({pass:true,version:'cohesive-v46-20261105',productionDataTouched:false,results,standaloneGifts:true,parentReport:true},null,2));
 console.log('V46_COHESIVE_ALL_PASS');
}finally{await browser.close();}
