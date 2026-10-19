import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const playwright=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=playwright.chromium?playwright:playwright.default;
const origin=(process.env.VILLAGE_QA_ORIGIN||'http://127.0.0.1:4199').replace(/\/$/,'');
const out=path.resolve(process.env.VILLAGE_QA_OUTPUT||'docs/qa-child-safety-v32');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const cases=[];
const shaming=/(?:바보|멍청|한심|낙오자|실패자|형편없|공부 못하는 아이|너는 틀렸|틀렸으니 벌|성적이 낮아서 가치가 없|돈을 못 벌면 가치가 없)/;
const validateCopy=(text,part)=>assert(!shaming.test(text),`Shaming/unsafe Korean on ${part}: ${String(text).match(shaming)?.[0]}`);
try{
 for(const config of [
  {name:'desktop',width:1440,height:900,who:'tae'},
  {name:'galaxy',width:390,height:844,who:'se'},
  {name:'tablet',width:768,height:1024,who:'tae'}
 ]){
  const context=await browser.newContext({viewport:{width:config.width,height:config.height},isMobile:config.name!=='desktop',hasTouch:config.name!=='desktop',locale:'ko-KR',reducedMotion:'reduce'});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.goto(origin+'/',{waitUntil:'domcontentloaded',timeout:45000});
   assert.equal(await page.locator('.entry-learner-choice').count(),2);
   assert.equal(await page.locator('.entry-portal').count(),2);
   await page.screenshot({path:path.join(out,config.name+'-kid-entry.png')});
   await page.goto(origin+'/village/',{waitUntil:'domcontentloaded',timeout:45000});
   await page.locator('#learner-choices [data-learner='+config.who+']').click();
   await page.locator('#lite').click();
   await page.waitForFunction(()=>document.querySelector('#village-ui')?.dataset.ready==='true',null,{timeout:40000});
   assert.equal(await page.locator('#village-ui').getAttribute('data-who'),config.who);
   const welcome=await page.locator('#village-ui').innerText();validateCopy(welcome,'welcome');
   assert(await page.locator('#vh-first-visit').innerText().then(t=>t.includes('첫 방문')));
   await page.locator('#vh-ocean').click();
   await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('푸른 바다'),null,{timeout:20000});
   assert((await page.locator('#vh-counter').innerText()).includes('40종'));
   let seen=0;
   for(let p=0;p<4;p++){
    const cards=page.locator('.vh-pond-fish');
    assert.equal(await cards.count(),10,`Ocean page ${p+1} should show 10 of 40 species`);
    const txt=await page.locator('#village-dialog-wrap').innerText();validateCopy(txt,`ocean page ${p+1}`);
    const images=cards.locator('img');
    for(let i=0;i<await images.count();i++){
     await images.nth(i).scrollIntoViewIfNeeded();
     const decoded=await images.nth(i).evaluate(img=>img.decode().then(()=>img.naturalWidth>150).catch(()=>false));
     assert(decoded,`Missing/broken premium animal original on ocean page ${p+1} card ${i+1}`);
    }
    seen+=await cards.count();
    if(p<3)await page.locator('.vh-water-paging').getByRole('button',{name:/다음/}).click();
   }
   assert.equal(seen,40);
   await page.screenshot({path:path.join(out,config.name+'-ocean-originals.png')});
   await page.locator('#vh-exit').click();
   await page.locator('#vh-pond').click();
   await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('생명 연못'),null,{timeout:12000});
   assert((await page.locator('#vh-counter').innerText()).includes('24종'));
   validateCopy(await page.locator('#village-dialog-wrap').innerText(),'freshwater');
   await page.locator('#vh-exit').click();
   await page.locator('#vh-map').click();
   await page.locator('.vh-map-district-entry').filter({hasText:'미래 직업 탐색관'}).click();
   await page.waitForFunction(()=>document.querySelector('#vh-title')?.textContent.includes('미래 직업 탐색관'),null,{timeout:16000});
   assert.equal(await page.locator('.career-card').count(),100);
   validateCopy(await page.locator('#village-dialog-wrap').innerText(),'career');
   await page.screenshot({path:path.join(out,config.name+'-career-kid-safe.png')});
   assert(!errors.length,'JavaScript errors: '+errors.join(' / '));
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+3);
   assert(!overflow,'Horizontal UI overflow on '+config.name);
   cases.push({device:config.name,learner:config.who,pass:true,pondSpecies:24,oceanSpecies:40,careerCards:100,shamingCopy:false,imagesDecode:true,jsErrors:errors.length});
   console.log('CHILD_SAFE_V32_PASS '+JSON.stringify(cases.at(-1)));
  }finally{await context.close();}
 }
 await fs.writeFile(path.join(out,'child-safety-browser-qa.json'),JSON.stringify({pass:true,generatedAt:new Date().toISOString(),cases},null,2)+'\n');
 console.log('CHILD_SAFE_V32_ALL_PASS '+cases.length);
}finally{await browser.close();}
