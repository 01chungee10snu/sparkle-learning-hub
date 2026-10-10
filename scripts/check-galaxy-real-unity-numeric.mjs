/** Live Unity WebGL + on-screen numeric touch integration for Samsung Galaxy.
 * Does NOT touch any connected physical Samsung device or its foreground apps.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const m=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=m.chromium?m:m.default;
const SERVER=process.env.MAGIC_GALAXY_ORIGIN||'http://127.0.0.1:4198';
const ROOT=process.env.MAGIC_GALAXY_PREFIX||'';
const base=ROOT+'/magic-village-kma-v06';
const output='/Users/01chungee10/AI-Interop/evidence/magic-galaxy-keypad-20261010';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
 args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:360,height:780},hasTouch:true,isMobile:true,
 deviceScaleFactor:3,locale:'ko-KR',reducedMotion:'reduce',
 userAgent:'Mozilla/5.0 (Linux; Android 15; SM-G991N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36'});
const page=await context.newPage();
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
try{
 await page.goto(SERVER+base+'/village/',{waitUntil:'networkidle'});
 await page.locator('#start').click();
 await page.waitForFunction(()=>document.querySelector('#loading').hidden,undefined,{timeout:180000});
 await page.waitForFunction(()=>document.querySelector('#village-ui').dataset.ready==='true',undefined,{timeout:30000});
 assert.equal(await page.locator('#canvas').isVisible(),true);
 await page.locator('#vh-bebsu').click();
 await page.getByRole('heading',{name:/벡수 수학 경시대회/}).waitFor({timeout:15000});
 const reg=await (await page.request.get(SERVER+base+'/games/bebsu-challenges.json')).json();
 const chosen=reg.grades[0].papers[2];
 const data=await (await page.request.get(SERVER+base+'/games/bebsu-g1-original/game.json')).json();
 const q=data.questions.find(question=>question.id===chosen.questionIds[0]);
 assert.equal(q.interaction.type,'numeric');
 await page.locator('.vh-challenge-select').nth(1).selectOption(chosen.paperId);
 await page.getByRole('button',{name:/1번 문제부터 시작/}).click();
 await page.waitForFunction(()=>document.querySelector('#vh-counter')?.textContent.replace(/\s/g,'')==='1/25',undefined,{timeout:20000});
 await page.waitForFunction(()=>{const image=document.querySelector('.vh-original-image');return image?.complete&&image.naturalWidth>0;},undefined,{timeout:12000});
 const input=page.getByRole('textbox',{name:'숫자 답'});
 assert.equal(await input.evaluate(el=>el.readOnly),true,'Android should use the internal touch keypad by default');
 const keypad=page.locator('.vh-number-keypad');
 await keypad.waitFor({state:'visible'});
 const answer=String(q.interaction.target);
 for(const ch of answer)await page.getByRole('button',{name:'숫자 '+ch}).click();
 assert.equal(await input.inputValue(),answer);
 await page.screenshot({path:path.join(output,'galaxy-real-unity-numeric-answer.png')});
 await page.locator('.vh-number-submit').click();
 await page.getByRole('button',{name:/다음 이야기/}).waitFor({state:'visible',timeout:20000});
 assert.match(await page.locator('#vh-title').textContent(),/멋진 발견/);
 const progress=await page.evaluate(async base=>{
  const p=await import(base+'/platform/progress.js');
  return p.gameProgress('bebsu-g1-original').round;
 },base);
 assert.equal(progress.answers.length,1);
 assert.equal(progress.answers[0].correct,true);
 assert.equal(errors.length,0,JSON.stringify(errors));
 console.log('PASS_GALAXY_REAL_UNITY_KMA',JSON.stringify({question:q.id,answer,canUseNumericPad:true,graded:true,originalProblemImage:true,errors:0}));
}finally{
 await Promise.race([context.close(),new Promise(resolve=>setTimeout(resolve,12000))]);
 await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,12000))]);
}
