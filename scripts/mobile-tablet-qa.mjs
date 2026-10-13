import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const module=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=module.chromium?module:module.default;
const origin=process.env.UNIFIED_ORIGIN||'http://127.0.0.1:4184';
const output=process.env.MOBILE_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/unified-village-mobile-20261013';
await fs.mkdir(output,{recursive:true});
const sizes=[
  {name:'galaxy-360x740',width:360,height:740},
  {name:'galaxy-390x844',width:390,height:844},
  {name:'compact-320x568',width:320,height:568},
  {name:'tablet-768x1024',width:768,height:1024},
  {name:'tablet-landscape-1024x768',width:1024,height:768},
  {name:'galaxy-landscape-844x390',width:844,height:390},
  {name:'short-landscape-667x375',width:667,height:375}
];
const browser=await chromium.launch({headless:true,
 executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,
 hasTouch:true,deviceScaleFactor:2,locale:'ko-KR',reducedMotion:'reduce'});
const page=await context.newPage();
const errors=[],results=[];
page.on('pageerror',e=>errors.push(e.message));
function overlaps(a,b){
 if(!a||!b)return false;
 return Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+2 &&
  Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+2;
}
try{
 await page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:90000});
 assert(await page.locator('.vh-welcome-art').evaluate(el=>el.complete&&el.naturalWidth>0),'Welcome illustration failed');
 for(const size of [{width:320,height:568},{width:667,height:375}]){
   await page.setViewportSize(size);
   for(const selector of ['#start','#lite']){
     await page.locator(selector).scrollIntoViewIfNeeded();
     const box=await page.locator(selector).boundingBox();
     assert(box?.y>=-1&&box.y+box.height<=size.height+2,
       'Entry mode choice inaccessible at '+size.width+'x'+size.height+': '+selector);
   }
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-learner="se"]').click();
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#loading').hidden &&
  document.querySelector('#village-ui').dataset.ready==='true',undefined,{timeout:180000});
 for(const size of sizes){
  await page.setViewportSize({width:size.width,height:size.height});
  await page.waitForTimeout(220);
  const m=await page.evaluate(()=>{
   const rect=selector=>{
    const node=document.querySelector(selector);
    if(!node||node.hidden||getComputedStyle(node).display==='none')return null;
    const {x,y,width,height}=node.getBoundingClientRect();
    return {x,y,width,height};
   };
   const selectors=['#village-info','#vh-world-shortcuts','#vh-learning-districts','#village-controls','#vh-help'];
   const found=Object.fromEntries(selectors.map(s=>[s,rect(s)]));
   const tapTargets=[...document.querySelectorAll('#village-ui button')].filter(el=>{
    const r=el.getBoundingClientRect();
    return !el.hidden && getComputedStyle(el).display!=='none' && !!r.width &&
     !el.closest('[hidden]') && !el.closest('#vh-extra-tools');
   }).map(el=>({id:el.id||el.dataset.district,rect:el.getBoundingClientRect().toJSON()}));
   return {vw:window.innerWidth,vh:window.innerHeight,docW:document.documentElement.scrollWidth,
    docH:document.documentElement.scrollHeight,found,tapTargets,
    icons:[...document.querySelectorAll('#vh-learning-districts img')].map(img=>({loaded:img.complete&&img.naturalWidth>0,src:img.src}))};
  });
  const o=m.found;
  const pairs=[['#village-info','#vh-world-shortcuts'],
    ['#vh-learning-districts','#village-controls'],
    ['#vh-learning-districts','#vh-world-shortcuts'],
    ['#vh-world-shortcuts','#village-controls']];
  const collisions=pairs.filter(([a,b])=>overlaps(o[a],o[b]));
  const short=m.tapTargets.filter(t=>t.rect.height<42 || t.rect.width<42);
  const horizontalOverflow=m.docW>size.width+2;
  const pass=!collisions.length&&!short.length&&!horizontalOverflow;
  results.push({name:size.name,viewport:size,pass,collisions,
   short:short.map(({id,rect})=>({id,size:[rect.width,rect.height]})),
   document:[m.docW,m.docH],visibleTargets:m.tapTargets.length});
  await page.screenshot({path:path.join(output,size.name+'.png'),animations:'disabled'});
  console.log(pass?'PASS':'FAIL',size.name,JSON.stringify({collisions,short:short.map(t=>t.id),horizontalOverflow}));
 }
 await page.setViewportSize({width:390,height:844});
 await page.locator('[data-district="english"]').click();
 await page.locator('.vh-area-banner img').waitFor({timeout:15000});
 await page.locator('.vh-area-banner img').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>{const img=document.querySelector('.vh-area-banner img');return img?.complete&&img.naturalWidth>0},undefined,{timeout:15000});
 const banner=await page.locator('.vh-area-banner img').evaluate(img=>img.complete&&img.naturalWidth>0);
 assert(banner,'World-matching English illustration failed to load');
 await page.screenshot({path:path.join(output,'galaxy-english-area.png')});
 await page.locator('#vh-exit').click();
 await page.locator('[data-district="practice"]').click();
 await page.screenshot({path:path.join(output,'galaxy-practice-area.png')});
 await page.locator('#vh-exit').click();
 assert(!errors.length,'JS exceptions: '+errors.join('; '));
 const summary={origin,pass:results.every(v=>v.pass),simulatedMobile:true,
  physicalGalaxyTested:false,artLoaded:banner,errors,results};
 await fs.writeFile(path.join(output,'mobile-tablet-matrix.json'),JSON.stringify(summary,null,2)+'\n');
 assert(summary.pass, 'Mobile/tablet layout regressions in '+results.filter(r=>!r.pass).map(r=>r.name).join(', '));
 console.log('PASS mobile/tablet viewport matrix',results.length,'responsive screens; source art loaded');
}finally{await context.close();await browser.close();}
