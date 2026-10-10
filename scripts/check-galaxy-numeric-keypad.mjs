/** Galaxy S21 Android Chrome touch-keypad regression, without mutating real
 * user progress or changing the connected phone's foreground Pokémon app.
 * Uses a device-emulated Chrome page and synthetic vetted DOM test questions.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const m=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=m.chromium?m:m.default;
const SERVER=process.env.MAGIC_GALAXY_ORIGIN||'http://127.0.0.1:4198';
const ROOT=process.env.MAGIC_GALAXY_PREFIX||'';
const output='/Users/01chungee10/AI-Interop/evidence/magic-galaxy-keypad-20261010';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const failures=[],proof=[];
const cases=[
 {name:'kma-galaxy-portrait',portal:'magic-village-kma-v06',touch:true,width:360,height:780},
 {name:'kma-galaxy-landscape',portal:'magic-village-kma-v06',touch:true,width:780,height:360},
 {name:'practice-galaxy-portrait',portal:'magic-village-v06',touch:true,width:390,height:844},
 {name:'kma-desktop',portal:'magic-village-kma-v06',touch:false,width:1280,height:800}
];
function sample(name,options={}){
 return {gameId:'bebsu-g1-original',questionId:name,title:'숫자 답 터치 테스트',story:'토끼와 숫자를 함께 읽어 봐요.',
  prompt:'정답 숫자를 눌러 입력해 주세요.',interactionType:'numeric',choices:[],
  index:7,total:25,hintAvailable:false,problemImage:'',solutionImage:'',
  numericMin:options.min??0,numericMax:options.max??100};
}
for(const c of cases){
 const context=await browser.newContext({
  viewport:{width:c.width,height:c.height},hasTouch:c.touch,isMobile:c.touch,
  deviceScaleFactor:c.touch?3:1,locale:'ko-KR',reducedMotion:'reduce',
  userAgent:c.touch?'Mozilla/5.0 (Linux; Android 15; SM-G991N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Mobile Safari/537.36':undefined
 });
 const page=await context.newPage();
 page.on('pageerror',e=>failures.push(c.name+': '+e.message));
 try{
  await page.goto(SERVER+ROOT+'/'+c.portal+'/village/',{waitUntil:'networkidle'});
  await page.evaluate(async({base,q})=>{
    const {createVillageUI}=await import(base+'/village/village-ui.js');
    const root=document.querySelector('#village-ui');
    root.hidden=false;root.dataset.ready='true';
    document.querySelector('#loading').hidden=true;
    window.qaMessages=[];
    window.qaVillage=createVillageUI({
      root,
      sendToUnity:()=>{},
      sendRequest:request=>{window.qaMessages.push(request);}
    });
    window.qaVillage.update({action:'INIT',ok:true,who:'tae',displayName:'태희',requestId:'test-init',
      available:0,flowers:0,familyFlowers:0});
    window.qaVillage.update({action:'START',ok:true,who:'tae',requestId:'test-question',
      available:0,flowers:0,familyFlowers:0,question:q});
  },{base:ROOT+'/'+c.portal,q:sample('galaxy-numeric')});
  const pad=page.locator('.vh-number-keypad'),field=page.getByRole('textbox',{name:'숫자 답'});
  await pad.waitFor({state:'visible'});
  assert.equal(await page.locator('.vh-number-key').count(),12);
  assert.equal(await field.getAttribute('readonly'),c.touch?'':null,'touch input should default to internal keypad');
  // Browser markup does not serialize a false readOnly flag into an attribute.
  const state=await field.evaluate(el=>({readOnly:el.readOnly,inputMode:el.inputMode}));
  assert.equal(state.readOnly,c.touch,'wrong touch detection');
  assert.equal(state.inputMode,c.touch?'none':'numeric');
  assert.equal(await page.locator('.vh-number-submit').isDisabled(),true);
  const digit=async n=>page.getByRole('button',{name:'숫자 '+n}).click();
  await digit(1);await digit(2);
  assert.equal(await field.inputValue(),'12');
  await page.getByRole('button',{name:'마지막 숫자 지우기'}).click();
  assert.equal(await field.inputValue(),'1');
  await page.getByRole('button',{name:'전체 지우기'}).click();
  assert.equal(await field.inputValue(),'');
  await digit(0);await digit(0);await digit(4);
  assert.equal(await field.inputValue(),'4','leading zero canonicalization');
  await page.getByRole('button',{name:'전체 지우기'}).click();
  await digit(9);await digit(9);await digit(9);
  assert.equal(await page.locator('.vh-number-submit').isDisabled(),true,'range limit must prevent invalid answer');
  await page.getByRole('button',{name:'전체 지우기'}).click();
  await digit(4);await digit(2);
  assert.equal(await page.locator('.vh-number-submit').isEnabled(),true);
  await page.screenshot({path:path.join(output,c.name+'.png')});
  await page.locator('.vh-number-submit').click();
  await page.waitForFunction(()=>window.qaMessages.some(m=>m.action==='SUBMIT'));
  const message=await page.evaluate(()=>window.qaMessages.find(m=>m.action==='SUBMIT'));
  assert.equal(JSON.parse(message.response),'42');
  assert.equal(await page.evaluate(()=>window.qaMessages.filter(m=>m.action==='SUBMIT').length),1);
  proof.push({case:c.name,submitted:'42',numericPad:true,android:c.touch});
  if(c.touch&&c.name==='kma-galaxy-portrait'){
   await page.evaluate(q=>window.qaVillage.update({action:'START',ok:true,who:'tae',requestId:'negative-fixture',
      available:0,flowers:0,familyFlowers:0,question:q}),sample('test-negative',{min:-200,max:100}));
   await page.getByRole('button',{name:'양수 음수 전환'}).click();
   await digit(1);await digit(2);
   assert.equal(await field.inputValue(),'-12');
   await page.locator('.vh-number-submit').click();
   await page.waitForFunction(()=>window.qaMessages.filter(m=>m.action==='SUBMIT').length===2);
   assert.equal(JSON.parse((await page.evaluate(()=>window.qaMessages[1])).response),'-12');
   await page.evaluate(q=>window.qaVillage.update({action:'START',ok:true,who:'tae',requestId:'normalize-fixture',
      available:0,flowers:0,familyFlowers:0,question:q}),sample('normalize',{min:-200,max:100}));
   const editable=page.getByRole('textbox',{name:'숫자 답'});
   await page.getByRole('button',{name:/휴대전화 키보드 사용/}).click();
   assert.equal(await editable.evaluate(el=>el.readOnly),false);
   await editable.fill('−１２'); // Unicode minus + full-width Samsung digits
   assert.equal(await editable.inputValue(),'-12');
   assert.equal(await page.locator('.vh-number-submit').isEnabled(),true);
  }
  if(!c.touch){
   await page.evaluate(q=>window.qaVillage.update({action:'START',ok:true,who:'tae',requestId:'pc-typing',
      available:0,flowers:0,familyFlowers:0,question:q}),sample('test-desktop',{max:100}));
   await page.getByRole('textbox',{name:'숫자 답'}).fill('73');
   await page.getByRole('textbox',{name:'숫자 답'}).press('Enter');
   await page.waitForFunction(()=>window.qaMessages.filter(m=>m.action==='SUBMIT').length===2);
   assert.equal(JSON.parse((await page.evaluate(()=>window.qaMessages[1])).response),'73');
  }
 }catch(e){failures.push(c.name+': '+e.stack);throw e}
 finally{await Promise.race([context.close(),new Promise(resolve=>setTimeout(resolve,10000))]);}
}
await Promise.race([browser.close(),new Promise(resolve=>setTimeout(resolve,10000))]);
await fs.writeFile(path.join(output,'report.json'),JSON.stringify({proof,failures,generatedAt:new Date().toISOString()},null,2));
assert.equal(failures.length,0,JSON.stringify(failures));
assert.equal(proof.length,4);
console.log('PASS_GALAXY_KEYPAD',JSON.stringify({cases:proof.length,plusMinus:true,fullwidthConversion:true,invalidRange:true,noKeyboardRequired:true,oldUIUnchanged:true}));
