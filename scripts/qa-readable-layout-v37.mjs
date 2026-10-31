#!/usr/bin/env node
/** Real-browser regression of v37 child-facing readability and in-flow gift. */
import assert from 'node:assert/strict';
let pw;
if(process.env.PLAYWRIGHT_MODULE)pw=await import(process.env.PLAYWRIGHT_MODULE);
else {try{pw=await import('playwright');}
      catch{pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}}
const {chromium}=pw.chromium?pw:pw.default;
const browser=await chromium.launch({headless:true,
 ...(process.env.CHROME_PATH||process.platform==='darwin'?{
   executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
 }:{}),args:['--enable-webgl','--use-angle=swiftshader']});
const origin=process.env.READABLE_QA_ORIGIN||'http://127.0.0.1:4194';
const sizes=[
 {width:280,height:653},{width:320,height:568},{width:360,height:740},
 {width:390,height:844},{width:430,height:932},{width:768,height:1024},
 {width:1024,height:768},{width:844,height:390},{width:667,height:375}];
const errors=[];
const probe=page=>page.evaluate(()=>{
 const w=innerWidth,h=innerHeight;
 const vis=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);
  return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden'&&!e.closest('[hidden]');};
 const text=[...document.querySelectorAll('main *,#village-ui *,#loading *')]
  .filter(e=>e.children.length===0&&vis(e)&&e.textContent.trim()&&getComputedStyle(e).overflowX!=='visible');
 const clips=text.filter(e=>e.scrollWidth>e.clientWidth+4)
  .filter(e=>!e.closest('[aria-hidden=true]'));
 return {viewport:[w,h],doc:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
  clips:clips.slice(0,8).map(e=>e.textContent.trim().slice(0,40))};
});
async function validate(page,label){
 const data=await probe(page);
 assert(data.doc[0]<=data.viewport[0]+2,label+' document horizontal overflow');
 assert(data.doc[1]<=data.viewport[1]+2,label+' unwanted full-document vertical overflow');
 assert.deepEqual(data.clips,[],label+' truncated text: '+data.clips.join('; '));
}
async function fit(page,sel,label){
 const r=await page.locator(sel).first().boundingBox();
 assert(r&&r.width>=43&&r.height>=43,label+' tap target too small '+sel);
 assert(r.x>=-2&&r.y>=-2&&r.x+r.width<=page.viewportSize().width+2&&
  r.y+r.height<=page.viewportSize().height+2,label+' important control outside viewport '+sel);
}
const font=async(loc)=>parseFloat(await loc.first().evaluate(el=>getComputedStyle(el).fontSize));
try{
 for(const sz of sizes){
  const ctx=await browser.newContext({viewport:sz,isMobile:true,hasTouch:true,
   locale:'ko-KR',reducedMotion:'reduce',deviceScaleFactor:1});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(sz.width+'x'+sz.height+':'+e.message));
  await page.route('**/*.supabase.co/**',route=>route.abort());
  try{
   await page.goto(origin+'/',{waitUntil:'domcontentloaded'});
   await validate(page,'landing '+sz.width+'x'+sz.height);
   await fit(page,'#entry-village-link','landing');
   await fit(page,'#entry-learning-link','landing');
   await page.goto(origin+'/learning.html?who=tae',{waitUntil:'domcontentloaded'});
   await page.locator('.home-more').waitFor({timeout:20000});
   await validate(page,'home '+sz.width+'x'+sz.height);
   if(sz.width<=390&&sz.height>=568)await fit(page,'.game-launch','first lesson');
   // Exercise the actual IRT-backed reading and answer surface, not only menus.
   await page.locator('.game-launch').first().click();
   await page.locator('.question-panel').waitFor({timeout:20000});
   if(await page.locator('.question-play').count())await page.locator('.question-play').click();
   const answerButtons=page.locator('.answers .answer');
   if(await answerButtons.count()){
    for(const button of await answerButtons.all()){
     const box=await button.boundingBox(),size=await font(button);
     assert(box&&box.height>=43&&size>=18,'Quiz answer small '+sz.width+'x'+sz.height);
    }
    if(sz.width>=320&&sz.width<=844&&sz.height<=844){
     const last=await answerButtons.last().boundingBox();
     assert(last&&last.y+last.height<=sz.height+1,
       'Quiz answer is behind the footer '+sz.width+'x'+sz.height);
    }
   }
   await page.goto(origin+'/learning.html?view=hanja',{waitUntil:'domcontentloaded'});
   await page.locator('.hanja-flashcard').first().waitFor({timeout:20000});
   await validate(page,'hanja '+sz.width+'x'+sz.height);
   assert(await font(page.locator('.hanja-flashcard strong'))>=14,'Hanja text too small');
   await page.goto(origin+'/village/?who=tae',{waitUntil:'domcontentloaded'});
   await validate(page,'village entry '+sz.width+'x'+sz.height);
   await fit(page,'#start','3D entry');await fit(page,'#lite','2D entry');
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',
    undefined,{timeout:50000});
   await validate(page,'village exploration '+sz.width+'x'+sz.height);
   await page.locator('#vh-more').click();
   await page.locator('#vh-career').click();
   await page.locator('#village-dialog-wrap').waitFor({state:'visible',timeout:12000});
   const cards=page.locator('.career-card');
   await cards.first().waitFor({timeout:12000});
   await validate(page,'career '+sz.width+'x'+sz.height);
   assert(await cards.count()>=10,'Career directory lost cards');
   const clipped=await page.evaluate(()=>[...document.querySelectorAll('.career-card-caption')]
    .filter(e=>e.scrollWidth>e.clientWidth+3||
      e.scrollHeight>e.clientHeight+3||
      parseFloat(getComputedStyle(e).fontSize)<14).length);
   assert.equal(clipped,0,'Career descriptions clipped or too tiny '+sz.width+'x'+sz.height);
   await page.keyboard.press('Escape');
   await page.locator('#vh-pond').click();
   await page.locator('#village-dialog-wrap').waitFor({state:'visible',timeout:12000});
   await validate(page,'pond '+sz.width+'x'+sz.height);
   const gifts=page.locator('.vh-first-visit-inline');
   assert(await gifts.isVisible(),'Pond first-visit gift should be in the dialog flow');
   assert(await page.locator('#vh-first-visit').isHidden(),'Floating gift covers the pond');
   assert((await gifts.textContent()).includes('첫 방문 선물'),'Gift announcement missing');
   console.log('PASS_V37_LAYOUT',sz.width+'x'+sz.height,'entry/home/hanja/career/pond');
  }finally{await ctx.close();}
 }
 assert.equal(errors.length,0,'Browser JS errors: '+errors.join('; '));
 console.log('PASS_READABLE_LAYOUT_V37',sizes.length,'responsive viewports');
}finally{await browser.close();}
