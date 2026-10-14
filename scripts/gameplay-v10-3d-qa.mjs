import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=process.env.GAMEPLAY_ORIGIN||'http://127.0.0.1:4189';
const output=process.env.GAMEPLAY_3D_QA_OUTPUT||path.resolve('docs/qa-gameplay-v10');
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},
 hasTouch:true,isMobile:true,deviceScaleFactor:2,locale:'ko-KR',reducedMotion:'reduce'});
const page=await context.newPage();const errors=[],httpErrors=[],metrics=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))
 httpErrors.push(r.status()+' '+r.url());});
try {
 await page.goto(origin+'/village/',{waitUntil:'domcontentloaded',timeout:90000});
 await page.locator('[data-learner="se"]').click();
 const launch=Date.now();
 await page.locator('#start').click();
 await page.waitForFunction(()=>{
  const loading=document.querySelector('#loading');
  return loading?.hidden===true && document.querySelector('#village-ui')?.dataset.ready==='true' &&
    getComputedStyle(document.querySelector('#canvas')).display!=='none';
 },undefined,{timeout:240000});
 const loadTimeMs=Date.now()-launch;
 await page.waitForTimeout(1500);
 const canvas=await page.evaluate(()=>{
  const node=document.querySelector('#canvas');
  const rect=node.getBoundingClientRect();
  const gl=node.getContext('webgl2')||node.getContext('webgl');
  let pixel=null;
  if(gl){
   const px=new Uint8Array(4);
   gl.readPixels(Math.floor(node.width/2),Math.floor(node.height/2),1,1,
     gl.RGBA,gl.UNSIGNED_BYTE,px);pixel=[...px];
  }
  return {width:node.width,height:node.height,display:getComputedStyle(node).display,
    rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},
    webGLContext:!!gl,pixel,
    product:document.title,
    hudReady:document.querySelector('#village-ui').dataset.ready};
 });
 assert(canvas.webGLContext,'Unity WebGL context missing');
 assert(canvas.rect.height>=740,'3D game does not fill phone viewport');
 await page.screenshot({path:path.join(output,'galaxy-390x844-3d-world.png'),animations:'disabled'});
 assert.equal(await page.locator('#vh-learning-districts').isVisible(),false);
 const before=await page.locator('#vh-stars').innerText();
 await page.locator('#vh-map').click();
 await page.locator('.vh-story-card').filter({hasText:'나비의 인사'}).locator('.vh-story-go').click();
 await page.locator('.vh-story-option').first().click();
 await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('영어') &&
  document.querySelector('.vh-story-bridge')?.textContent.includes('색깔'),undefined,{timeout:30000});
 assert.equal(await page.locator('#vh-stars').innerText(),before,
   'a story may never directly grant stars');
 await page.screenshot({path:path.join(output,'galaxy-390x844-3d-story-to-english.png')});
 await page.locator('#vh-exit').click();
 assert(await page.locator('#village-dialog-wrap').isHidden());

 await page.locator('#vh-quest').click();
 await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('첫 마법 씨앗'));
 await page.screenshot({path:path.join(output,'galaxy-390x844-3d-garden-quest.png')});
 await page.locator('#vh-exit').click();

 await page.locator('#vh-more').click();
 await page.locator('#vh-motion').click();
 assert.equal(await page.locator('#village-ui').getAttribute('data-reduced-motion'),'false');
 await page.locator('#vh-motion').click();
 assert.equal(await page.locator('#village-ui').getAttribute('data-reduced-motion'),'true');
 await page.locator('#vh-more').click();

 for(const size of [
  {name:'galaxy-390x844',width:390,height:844},
  {name:'compact-320x568',width:320,height:568},
  {name:'tablet-768x1024',width:768,height:1024},
  {name:'landscape-844x390',width:844,height:390}
 ]) {
  await page.setViewportSize(size);
  await page.waitForTimeout(800);
  const m=await page.evaluate(()=>{
    const r=id=>{const el=document.querySelector(id);if(!el||getComputedStyle(el).display==='none')return null;
      const a=el.getBoundingClientRect();return{x:a.x,y:a.y,width:a.width,height:a.height};};
    return {vw:innerWidth,vh:innerHeight,docW:document.documentElement.scrollWidth,
      docH:document.documentElement.scrollHeight,game:r('#game'),
      controls:r('#village-controls'),status:r('#village-info'),map:r('#vh-map'),learning:r('#vh-adaptive')};
  });
  assert(m.docW<=size.width+2,size.name+' horizontal overflow');
  assert(m.game?.height>=size.height-4,size.name+' world not fullscreen');
  assert(m.map?.height>=42&&m.map?.width>=42,size.name+' map tap not accessible');
  assert(m.learning?.height>=42&&m.learning?.width>=42,size.name+' learning loop shortcut not accessible');
  assert(m.learning.x>=0&&m.learning.x+m.learning.width<=size.width+2,size.name+' learning shortcut overflow');
  assert(m.controls?.height>=44,size.name+' bottom dock missing');
  metrics.push({name:size.name,...m});
  await page.screenshot({path:path.join(output,size.name+'-3d-landscape.png'),animations:'disabled'});
 }
 assert.equal(errors.length,0,'JS exceptions '+errors.join('; '));
 assert.equal(httpErrors.length,0,'404 requests '+httpErrors.join('; '));
 const evidence={pass:true,origin,buildVersion:'0.10.0-growth-v12',
  physicalDeviceTested:false,softwareWebGL:true,loadTimeMs,canvas,
  metrics,errors,httpErrors};
 await fs.writeFile(path.join(output,'3D_QA_RESULT.json'),JSON.stringify(evidence,null,2)+'\n');
 console.log('GAMEPLAY_V10_REAL_UNITY_WEBGL_QA_PASS '+JSON.stringify({
  loadTimeMs,canvas:canvas.pixel,viewportCases:metrics.map(m=>m.name)}));
}finally {await context.close();await browser.close();}
