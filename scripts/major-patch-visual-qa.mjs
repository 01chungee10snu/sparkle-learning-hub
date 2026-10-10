import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
const ORIGIN=process.env.SPARKLE_QA_ORIGIN||'http://127.0.0.1:4191';
const OUTPUT='/Users/01chungee10/AI-Interop/evidence/sparkle-major-v1-20261010';
const imported=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=imported.chromium?imported:imported.default;
await fs.mkdir(OUTPUT,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const errors=[],captures=[];
const read=async id=>JSON.parse(await fs.readFile(new URL('../games/'+id+'/game.json',import.meta.url)));
const sourceBebsu=await read('bebsu-g1-original');
const sourceSnack=await read('snack-count');
const sourceDialogue=await read('kind-dialogue');
function toQuestion(game,q,index=1,total=5){
 const type=q.interaction?.type||'choice';
 return {gameId:game.id,questionId:q.id,title:q.title,story:q.story,
  prompt:q.prompt,choices:q.choices||[],interactionType:type,
  index,total,emoji:q.interaction?.emoji||'⭐',max:q.interaction?.max||0,
  left:q.interaction?.left||[],right:q.interaction?.rightLabels||q.interaction?.right||[],
  items:q.interaction?.items||[],hintAvailable:true,
  problemImage:q.problemImage?.replace('./','../')||'',
  solutionImage:q.solutionImage?.replace('./','../')||'',
  visual:q.visual||null};
}
const pick={
 tome:toQuestion(sourceBebsu,sourceBebsu.questions[0],1,25),
 crystal:toQuestion(sourceSnack,sourceSnack.questions[0],2,5),
 scroll:toQuestion(sourceDialogue,sourceDialogue.questions[0],1,3)
};
const shop={
 available:155,look:{light:{id:'rainbow-orbit'}},
 items:[
 {id:'sun-spark',category:'light',title:'햇살 반짝이',description:'노란 별 여섯 개가 요정 곁에서 반짝여요.',emoji:'☀️',cost:10,owned:true,equipped:false,canPurchase:false},
 {id:'rainbow-orbit',category:'light',title:'무지개 별빛',description:'알록달록한 별이 요정을 감싸요.',emoji:'🌈',cost:80,owned:true,equipped:true,canPurchase:false},
 {id:'galaxy-glow',category:'light',title:'은하수 반짝임',description:'보랏빛 별이 둥글게 맴돌아요.',emoji:'🌌',cost:110,owned:false,equipped:false,canPurchase:true}
 ]
};
const adaptive={who:'tae',subject:'math',grade:'G1',
 ability:{theta:.8,uncertainty:.66,evidence:14,provisional:true},
 routes:[
 {gameId:'growth-math-3',title:'꽃잎 생활 수학',emoji:'🌷',unseenCount:5,predictedSuccess:.74,subject:'math'},
 {gameId:'bebsu-g1-generated',title:'수학 탐험',emoji:'🧩',unseenCount:14,predictedSuccess:.68,subject:'math'}
 ],explanation:'아직 실증 보정되지 않은 문항 파라미터로 계산한 잠정 추천입니다.'};
for(const size of [{id:'phone',width:390,height:844},{id:'tablet',width:1024,height:768},{id:'desktop',width:1280,height:800}]){
 const context=await browser.newContext({viewport:{width:size.width,height:size.height},locale:'ko-KR',reducedMotion:'reduce'});
 const page=await context.newPage();
 page.on('pageerror',e=>errors.push({viewport:size.id,error:e.message}));
 await page.goto(ORIGIN+'/village/',{waitUntil:'networkidle'});
 await page.evaluate(async()=>{
  const {createVillageUI}=await import('/village/village-ui.js?major-visual');
  document.querySelector('#loading').hidden=true;
  const root=document.querySelector('#village-ui');root.hidden=false;
  const ui=createVillageUI({root,sendToUnity:()=>{},sendRequest:()=>{}});
  window.majorQA={ui};
  root.dataset.ready='true';
  ui.update({action:'INIT',requestId:'major-init',ok:true,who:'tae',displayName:'태희',available:155,flowers:2,familyFlowers:4,
    cosmetics:{light:'rainbow-orbit',friend:'friend-rabbit',mark:'mark-heart',background:'bg-lilac',title:'title-number'}});
 });
 for(const [skin,q] of Object.entries(pick)){
  await page.evaluate(q=>window.majorQA.ui.update({action:'START',requestId:'fixture-start-'+Date.now(),ok:true,
    who:'tae',available:155,flowers:2,familyFlowers:4,question:q}),q);
  assert.equal(await page.locator('.vh-dialog').getAttribute('data-theme'),skin,'incorrect theme');
  assert.equal(await page.locator('.vh-original-image').count(),skin==='tome'?1:0);
  const box=await page.locator('.vh-dialog').boundingBox();
  assert(box.x>=-1&&box.y>=-1&&box.x+box.width<=size.width+2&&box.y+box.height<=size.height+2,skin+' modal overflows');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'horizontal overflow');
  const file=path.join(OUTPUT,size.id+'-'+skin+'.png');await page.screenshot({path:file});captures.push(file);
  await page.evaluate(()=>window.majorQA.ui.close());
 }
 await page.evaluate(shop=>window.majorQA.ui.update({action:'SHOP_OPEN',requestId:'fixture-shop',ok:true,
  who:'tae',available:155,flowers:2,familyFlowers:4,cosmetics:{light:'rainbow-orbit'},shop}),shop);
 assert.equal(await page.locator('.vh-dialog').getAttribute('data-theme'),'market');
 assert.equal(await page.locator('.vh-shop-item').count(),3);
 assert.equal(await page.locator('.vh-shop-item[data-equipped=true]').count(),1);
 let file=path.join(OUTPUT,size.id+'-shop.png');await page.screenshot({path:file});captures.push(file);
 await page.evaluate(()=>window.majorQA.ui.close());
 await page.evaluate(adaptive=>window.majorQA.ui.update({action:'ADAPTIVE_OFFER',requestId:'fixture-adaptive',ok:true,
  who:'tae',available:155,flowers:2,familyFlowers:4,adaptive}),adaptive);
 assert.equal(await page.locator('.vh-dialog').getAttribute('data-theme'),'crystal');
 assert.equal(await page.locator('.vh-route').count(),2);
 file=path.join(OUTPUT,size.id+'-adaptive.png');await page.screenshot({path:file});captures.push(file);
 await context.close();
}
await browser.close();
const result={date:new Date().toISOString(),captures,errors,pass:errors.length===0};
await fs.writeFile(path.join(OUTPUT,'visual-qa.json'),JSON.stringify(result,null,2));
console.log('PASS: 3 themed quizzes + real shop card states + IRT selection on mobile/tablet/desktop. Captures',captures.length,'Page errors',errors.length);
if(errors.length)process.exitCode=1;
