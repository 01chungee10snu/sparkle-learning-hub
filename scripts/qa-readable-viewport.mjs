#!/usr/bin/env node
/* Readability v36: real-browser viewport and tap-target checks, no saved learning data. */
import assert from 'node:assert/strict';
let playwright;
if (process.env.PLAYWRIGHT_MODULE) playwright=await import(process.env.PLAYWRIGHT_MODULE);
else {
  try { playwright=await import('playwright'); }
  catch { playwright=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js'); }
}
const {chromium}=playwright.chromium?playwright:playwright.default;
const origin=(process.env.READABLE_QA_ORIGIN||'http://127.0.0.1:4189').replace(/\/$/,'');
const sizes=[
 {name:'small-portrait',width:320,height:568},
 {name:'compact-portrait',width:360,height:740},
 {name:'phone-portrait',width:390,height:844},
 {name:'tablet-portrait',width:768,height:1024},
 {name:'tablet-landscape',width:1024,height:768},
 {name:'phone-landscape',width:844,height:390},
 {name:'short-landscape',width:667,height:375}
];
const chrome=process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':null);
const browser=await chromium.launch({headless:true,...(chrome?{executablePath:chrome}:{}),args:['--enable-webgl','--use-angle=swiftshader']});
const errors=[];
const screen=async page=>page.evaluate(()=>({vw:innerWidth,vh:innerHeight,docW:document.documentElement.scrollWidth,docH:document.documentElement.scrollHeight}));
function overlap(a,b){return a&&b&&Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)+2&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)+2;}
const boxes=async(page,selectors)=>page.evaluate(selectors=>Object.fromEntries(selectors.map(sel=>{
 const el=document.querySelector(sel);if(!el||el.hidden)return[sel,null];
 const css=getComputedStyle(el),r=el.getBoundingClientRect();
 if(css.display==='none'||css.visibility==='hidden'||r.width<1||r.height<1)return[sel,null];
 return[sel,{x:r.x,y:r.y,width:r.width,height:r.height,font:parseFloat(css.fontSize)}];
})),selectors);
function fits(box,screen){return box&&box.y>=-2&&box.y+box.height<=screen.vh+2&&box.x>=-2&&box.x+box.width<=screen.vw+2;}
try {
 for(const size of sizes){
  const ctx=await browser.newContext({viewport:{width:size.width,height:size.height},isMobile:true,hasTouch:true,deviceScaleFactor:1,reducedMotion:'reduce',locale:'ko-KR'});
  const page=await ctx.newPage();page.on('pageerror',e=>errors.push(size.name+':'+e.message));
  await page.route('**/*.supabase.co/**',route=>route.abort());
  try {
   await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
   let s=await screen(page),b=await boxes(page,['#entry-village-link','#entry-learning-link','.entry-learner-choices']);
   assert(s.docW<=s.vw+2,'entry horizontal overflow '+size.name);
   assert(s.docH<=s.vh+2,'entry document scroll '+size.name);
   for(const sel of ['#entry-village-link','#entry-learning-link','.entry-learner-choices']){
    assert(fits(b[sel],s),'entry action outside viewport '+size.name+': '+sel+' '+JSON.stringify(b[sel]));
   }
   await page.goto(origin+'/learning.html?who=tae',{waitUntil:'domcontentloaded'});
   await page.locator('.home-more > summary').waitFor({timeout:25000});
   s=await screen(page);b=await boxes(page,['#app','.nav','.game-launch','.home-more','.nav button']);
   assert(s.docH<=s.vh+2,'learning document scroll '+size.name);
   assert(s.docW<=s.vw+2,'learning horizontal overflow '+size.name);
   const menu=await page.locator('.nav button').all();
   assert.equal(menu.length,5,'five learning menus');
   for(const btn of menu){const r=await btn.boundingBox();assert(r&&r.height>=43&&r.width>=42,'learning menu too small '+size.name+' '+await btn.textContent());}
   assert(parseFloat(await page.locator('.nav button').first().evaluate(el=>getComputedStyle(el).fontSize))>=14,'learning menu text tiny '+size.name);
   if(size.width<=390 && size.height>=568){assert(fits(b['.game-launch'],s),'start lesson not reachable without scroll '+size.name);}
   await page.locator('.home-more > summary').click();
   assert(await page.locator('.home-more[open] .home-villages .village-launch').isVisible(),'collapsed village access lost');
   await page.locator('.home-more > summary').click();
   await page.goto(origin+'/village/?who=tae',{waitUntil:'domcontentloaded'});
   await page.locator('#start').waitFor({timeout:30000});
   s=await screen(page);b=await boxes(page,['#start','#lite','#learner-choices','.title-entry-links']);
   assert(s.docW<=s.vw+2,'village title horizontal overflow '+size.name);
   for(const sel of ['#start','#lite','#learner-choices'])assert(fits(b[sel],s),'village title action clipped '+size.name+': '+sel);
   if(size.height>=568){assert(fits(b['.title-entry-links'],s),'village learning shortcuts clipped '+size.name);}
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',undefined,{timeout:60000});
   s=await screen(page);b=await boxes(page,['#village-info','#vh-world-shortcuts','#vh-help','#world-scene-clock','#village-controls']);
   assert(s.docH<=s.vh+2,'village body scroll '+size.name);
   assert(s.docW<=s.vw+2,'village horizontal overflow '+size.name);
   for(const pair of [['#village-info','#vh-world-shortcuts'],['#vh-world-shortcuts','#vh-help'],['#vh-world-shortcuts','#world-scene-clock'],['#vh-help','#world-scene-clock'],['#vh-help','#village-controls']]){
    assert(!overlap(b[pair[0]],b[pair[1]]),'HUD overlap '+size.name+' '+pair.join('/')+' '+JSON.stringify(b));
   }
   const shortcutButtons=await page.locator('#vh-world-shortcuts > button').all();
   for(const btn of shortcutButtons){const r=await btn.boundingBox(),font=await btn.evaluate(el=>parseFloat(getComputedStyle(el).fontSize));
    assert(r&&r.width>=43&&r.height>=44,'village tiny tap target '+size.name+' '+await btn.textContent());
    assert(font>=12.5,'village text tiny '+size.name+' '+await btn.textContent());
   }
   await page.locator('#vh-pond').click();
   await page.locator('#village-dialog-wrap').waitFor({state:'visible',timeout:15000});
   const dlg=await boxes(page,['#village-dialog-wrap','.vh-dialog','.vh-dialog-body','.vh-dialog-title']);
   assert(dlg['.vh-dialog'].height<=s.vh+2,'pond dialog too tall '+size.name);
   assert(fits(dlg['.vh-dialog'],s),'pond dialog outside viewport '+size.name);
   console.log('PASS_READABLE_VIEWPORT',size.name,size.width+'x'+size.height,'entry/learning/title/village/dialog');
  }finally{await ctx.close();}
 }
 assert(!errors.length,'browser errors: '+errors.join('; '));
 console.log('PASS_READABILITY_V36',sizes.length,'viewport configurations');
}finally{await browser.close();}
