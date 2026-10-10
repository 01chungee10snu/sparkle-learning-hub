import assert from 'node:assert/strict';
import {access,mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const ORIGIN=process.env.SPARKLE_QA_ORIGIN||'http://127.0.0.1:4179';
const OUTPUT=process.env.SPARKLE_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/sparkle-quality-20261010/browser';
const CHROME=process.env.SPARKLE_QA_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PLAYWRIGHT=process.env.SPARKLE_QA_PLAYWRIGHT||'/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js';
const full=process.argv.includes('--webgl');
await Promise.all([access(CHROME),access(PLAYWRIGHT),mkdir(OUTPUT,{recursive:true})]);
const playwrightModule=await import(PLAYWRIGHT);
const {chromium}=playwrightModule.chromium?playwrightModule:playwrightModule.default;
const browser=await chromium.launch({headless:true,executablePath:CHROME,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const results=[],pageErrors=[],screenshots=[],roundEvidence=[],pointerObservations=[];
async function check(viewport,name,fn){
 try{await fn();results.push({viewport,name,pass:true});console.log('PASS',viewport,name);}
 catch(error){results.push({viewport,name,pass:false,error:error.message});console.error('FAIL',viewport,name,error.message);}
}
const snacks=JSON.parse(await readFile(new URL('../games/snack-count/game.json',import.meta.url)));
const measure=JSON.parse(await readFile(new URL('../games/measure-lab/game.json',import.meta.url)));
function publicItem(item,gameId='snack-count'){
 const kind=item.interaction?.type??'choice';
 const text=value=>String(value??'').replaceAll('{{place}}','우리 배움터').replaceAll('{{name}}','세희');
 return {gameId,questionId:item.id,title:text(item.title),story:text(item.story),prompt:text(item.prompt),visual:item.visual??null,choices:(item.choices??[]).map(text),
 interactionType:kind,left:item.interaction?.left??[],right:item.interaction?.rightLabels??item.interaction?.right??[],items:item.interaction?.items??[],
 emoji:item.interaction?.emoji??'⭐',unit:item.interaction?.unit??'',target:kind==='build'?item.interaction.target:0,max:kind==='build'?item.interaction.max:0,
 hintAvailable:true,index:1,total:3};
}
const sourceFiles=['village/village-ui.js','village/village-bridge.js','village/village-ui.css','village/index.html','village/village-state.js','platform/progress.js','platform/rewards.js','platform/reward-catalog.js','platform/irt.js','games/catalog.json','games/irt-bank.json','games/snack-count/game.json','games/measure-lab/game.json','games/kind-dialogue/game.json','scripts/village-browser-qa.mjs','village/assets/ui_mission_panel.png','village/assets/ui_star_pill.png','village/assets/ui_button.png','village/assets/star_yellow.png','village/assets/sprout.png','village/assets/bloom.png'];
const sourceHashes={},buildHashes={};
if(full)for(const name of ['WebGL','sparkle-fairy-village'])for(const ext of ['loader.js','data','data.unityweb','framework.js','framework.js.unityweb','wasm','wasm.unityweb']){
 const relative='village/Build/'+name+'.'+ext;
 try{buildHashes[relative]=createHash('sha256').update(await readFile(new URL('../'+relative,import.meta.url))).digest('hex');}catch(error){if(error.code!=='ENOENT')throw error;}
}
for(const name of sourceFiles)sourceHashes[name]=createHash('sha256').update(await readFile(new URL('../'+name,import.meta.url))).digest('hex');
async function setup(page){
 await page.goto(ORIGIN+'/village/',{waitUntil:'networkidle'});
 await page.evaluate(async()=>{
  const {createVillageUI}=await import('/village/village-ui.js?browser-qa');
  const original=document.querySelector('#village-ui'),root=document.createElement('div');root.id='village-ui';original.replaceWith(root);
  document.querySelector('#loading').hidden=true;
  const requests=[],commands=[];const ui=createVillageUI({root,sendToUnity:c=>commands.push(c),sendRequest:r=>{requests.push(structuredClone(r));}});
  window.qa={ui,root,requests,commands,seq:0,show:q=>ui.update({action:'START',requestId:'fixture-'+ ++window.qa.seq,ok:true,who:'se',available:30,flowers:2,familyFlowers:4,question:q}),
   reply:(request,extra={})=>ui.update({action:request.action,requestId:request.requestId,ok:true,who:'se',available:30,flowers:2,familyFlowers:4,...extra})};
  ui.update({action:'INIT',requestId:'fixture-init',ok:true,who:'se',available:30,flowers:2,familyFlowers:4});
 });
}
async function show(page,q){await page.evaluate(q=>{window.qa.ui.close();window.qa.requests.length=0;window.qa.show(q);},q);await page.waitForTimeout(0);}
async function lastRequest(page,action){await page.waitForFunction(action=>window.qa.requests.some(r=>r.action===action),action);return page.evaluate(action=>window.qa.requests.filter(r=>r.action===action).at(-1),action);}
async function respond(page,request,extra){await page.evaluate(({request,extra})=>window.qa.reply(request,extra),{request,extra});}
try{
 if(!full){
  for(const size of [{name:'phone-portrait',width:390,height:844},{name:'phone-landscape',width:844,height:390},{name:'tablet',width:1024,height:768},{name:'desktop',width:1440,height:900}]){
   const context=await browser.newContext({viewport:{width:size.width,height:size.height},locale:'ko-KR',reducedMotion:'reduce'});
   const page=await context.newPage();page.on('pageerror',e=>pageErrors.push({viewport:size.name,error:e.message}));
   await setup(page);
   const choice=publicItem(snacks.questions.find(q=>q.id==='snack-count-02'));
   await check(size.name,'real counted orange visual and responsive dialog',async()=>{
    await show(page,choice);
    assert.equal(await page.locator('.vh-counted').textContent(),'🍊 🍊 🍊 🍊');
    assert.equal(await page.locator('.vh-counted').getAttribute('aria-label'),'바구니 4개');
    const box=await page.locator('.vh-dialog').boundingBox();
    assert.ok(box.x>=-1&&box.y>=-1&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,'Dialog remains in the viewport');
    const spill=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(spill,false);
    assert.equal(await page.locator('#vh-hint').isVisible(),true);
    const file=path.join(OUTPUT,size.name+'-choice.png');await page.screenshot({path:file});screenshots.push(file);
   });
   await check(size.name,'modal focus containment and pause return',async()=>{
    const ids=await page.evaluate(()=>[...document.querySelectorAll('#village-dialog-wrap button,input,select,[tabindex="0"]')].filter(e=>!e.hidden&&!e.disabled&&e.getClientRects().length).map(e=>{if(!e.id)e.id='qa-focus-'+Math.random().toString(36).slice(2);return e.id;}));
    await page.locator('#'+ids[0]).focus();await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(()=>document.activeElement.id),ids.at(-1));
    await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),ids[0]);
    await page.locator('#vh-exit').click();assert.equal(await page.locator('#village-dialog-wrap').isVisible(),false);
    assert.equal(await page.evaluate(()=>document.activeElement.id),'vh-quest');
    assert.ok((await page.evaluate(()=>window.qa.commands)).includes('CLOSE_QUEST'));
   });
   await check(size.name,'hint UI single display and double submit guard',async()=>{
    await show(page,choice);await page.locator('#vh-hint').click();
    const hint=await lastRequest(page,'HINT');await respond(page,hint,{hint:'그림의 물건을 한 개씩 짚어 세어 봐요.'});
    assert.equal(await page.locator('.vh-hint-text').count(),1);assert.equal(await page.locator('#vh-hint').isDisabled(),true);
    await page.locator('.vh-option').nth(1).dblclick();
    const submit=await lastRequest(page,'SUBMIT');assert.equal(JSON.parse(submit.response),1);
    assert.equal(await page.evaluate(()=>window.qa.requests.filter(r=>r.action==='SUBMIT').length),1);
    await respond(page,submit,{correct:true,earned:10,explanation:'물건을 하나씩 세어 네 개를 찾았어요.'});
    assert.match(await page.locator('#vh-title').textContent(),/발견/);
    assert.equal(await page.locator('#vh-hint').isVisible(),false);
   });
   await check(size.name,'pause drops pending and already consumed stale replies',async()=>{
    await show(page,choice);await page.locator('.vh-option').first().click();
    const pending=await lastRequest(page,'SUBMIT');await page.locator('#vh-exit').click();
    await respond(page,pending,{correct:false,earned:2,explanation:'delayed answer'});
    assert.equal(await page.locator('#village-dialog-wrap').isVisible(),false,'Pending response must stay retired');
    await show(page,choice);await page.locator('.vh-option').first().click();
    const consumed=await lastRequest(page,'SUBMIT');await respond(page,consumed,{correct:false,earned:2,explanation:'graded answer'});
    await page.locator('#vh-exit').click();await respond(page,consumed,{correct:false,earned:2,explanation:'replayed answer'});
    assert.equal(await page.locator('#village-dialog-wrap').isVisible(),false,'Consumed old reply must not reopen a paused dialog');
   });
   await check(size.name,'stale unrelated response cannot replace pending question',async()=>{
    await show(page,choice);await page.locator('.vh-option').first().click();
    const pending=await lastRequest(page,'SUBMIT');
    await respond(page,{action:'SUBMIT',requestId:'webui-obsolete'},{correct:true,earned:999,explanation:'obsolete'});
    assert.match(await page.locator('#vh-title').textContent(),/귤/);
    await page.locator('#vh-exit').click();
   });
   await check(size.name,'answered resume renders feedback and one NEXT',async()=>{
    await page.evaluate(q=>{window.qa.ui.close();window.qa.requests.length=0;window.qa.ui.update({action:'START',requestId:'fixture-resume',ok:true,who:'se',available:30,flowers:2,familyFlowers:4,question:q,answered:true,correct:true,earned:0,explanation:'이미 고른 답의 풀이를 다시 살펴봐요.'});},choice);
    assert.equal(await page.locator('.vh-option').count(),0,'A graded answer cannot reappear as disabled/answerable options');
    assert.match(await page.locator('#vh-title').textContent(),/발견/);
    assert.match(await page.locator('.vh-prompt').textContent(),/다시 생각/);
    await page.getByRole('button',{name:'다음 이야기 →'}).dblclick();
    const next=await lastRequest(page,'NEXT');assert.equal(await page.evaluate(()=>window.qa.requests.filter(r=>r.action==='NEXT').length),1);
    await respond(page,next,{question:{...choice,index:2}});assert.equal(await page.locator('#vh-counter').textContent(),'2 / 3');
   });
   await check(size.name,'empty matching defaults and duplicate mapping ownership',async()=>{
    const q=publicItem(measure.questions.find(q=>q.interaction?.type==='match'),'measure-lab');
    await show(page,q);assert.deepEqual(await page.locator('.vh-pair select').evaluateAll(es=>es.map(e=>e.value)),q.left.map(()=>'-1'));
    await page.locator('.vh-wide').click();
    assert.equal(await page.evaluate(()=>window.qa.requests.filter(r=>r.action==='SUBMIT').length),0);
    assert.match(await page.locator('#village-toast').textContent(),/모든 짝/);
    const selects=page.locator('.vh-pair select');
    await selects.nth(0).selectOption('0');await selects.nth(1).selectOption('0');
    assert.equal(await selects.nth(0).inputValue(),'-1','A right-hand choice belongs to only one left-hand item');
    for(let i=0;i<q.left.length;i++)await selects.nth(i).selectOption(String(i));
    await page.locator('.vh-wide').click();
    const request=await lastRequest(page,'SUBMIT');assert.deepEqual(JSON.parse(request.response),q.left.map((_,i)=>i));
    const file=path.join(OUTPUT,size.name+'-matching.png');await page.screenshot({path:file});screenshots.push(file);
   });
   await check(size.name,'real zero group has no phantom object',async()=>{
    const q=publicItem(snacks.questions.find(q=>q.id==='snack-count-12'));await show(page,q);
    const empty=page.locator('.vh-visual-group').first();
    assert.match(await empty.textContent(),/비어 있어요/);
    assert.equal((await empty.textContent()).includes('🍪'),false);
    assert.equal(await empty.locator('[role=img]').getAttribute('aria-label'),'둥근 접시 0개');
    assert.equal((await page.locator('.vh-visual-group').nth(1).textContent()).split('🍪').length-1,6);
   });
   await check(size.name,'build stepper and numeric widget retain selected answer',async()=>{
    const q=publicItem(snacks.questions[0]);await show(page,q);
    for(let i=0;i<3;i++)await page.getByRole('button',{name:'하나 늘리기'}).click();
    await page.locator('.vh-wide').click();let submitted=await lastRequest(page,'SUBMIT');assert.equal(JSON.parse(submitted.response),3);
    await show(page,{...choice,questionId:'synthetic-numeric',interactionType:'numeric',choices:[],visual:null});
    await page.getByRole('textbox',{name:'숫자 답'}).fill('12');await page.getByRole('textbox',{name:'숫자 답'}).press('Enter');
    submitted=await lastRequest(page,'SUBMIT');assert.equal(JSON.parse(submitted.response),'12');
   });
   await context.close();
  }
 }else{
  async function startUnity(page,who){
   await page.locator('#start').click();
   await page.waitForFunction(()=>document.querySelector('#loading').hidden,undefined,{timeout:180000});
   await page.waitForFunction(()=>document.querySelector('#village-ui').dataset.ready==='true',undefined,{timeout:30000});
   assert.equal(await page.locator('#canvas').isVisible(),true);
   assert.equal(await page.locator('#village-ui').getAttribute('data-who'),who);
   await page.waitForTimeout(1000); // Allow the actual smooth camera to reach its initial portrait framing.
  }
  async function capture(page,name){
   const file=path.join(OUTPUT,name+'.png');await page.screenshot({path:file});screenshots.push(file);console.log('SCREENSHOT',file);
  }
  async function snapshot(page,who){
   return page.evaluate(async child=>{
    const P=await import('/platform/progress.js'),R=await import('/platform/rewards.js'),V=await import('/village/village-state.js');
    const catalog=await (await fetch('/games/catalog.json')).json(),raw=P.exportRecords(),other=child==='tae'?'se':'tae';
    const wallet=R.wallet(catalog,child),sibling=R.wallet(catalog,other);
    return {who:P.learner(),wallet:{available:wallet.available,lifetime:wallet.lifetime,learningStars:wallet.learningStars,effortStars:wallet.effortStars,spent:wallet.spent},
     siblingAvailable:sibling.available,siblingGames:Object.keys(raw.platform.profiles[other].games),
     flowers:V.villageSummary(V.loadVillage(),child),
     games:Object.entries(raw.platform.profiles[child].games).map(([id,g])=>({id,finishedRounds:g.finishedRounds,records:Object.keys(g.records),
      round:g.round,completedRounds:g.completedRounds}))};
   },who);
  }
  for(const child of [{who:'tae',name:'태희',total:5,viewport:{width:1280,height:800}},{who:'se',name:'세희',total:3,viewport:{width:390,height:844}}]){
   const context=await browser.newContext({viewport:child.viewport,locale:'ko-KR',reducedMotion:'reduce'});
   const page=await context.newPage(),label='webgl-'+child.who;page.on('pageerror',e=>pageErrors.push({viewport:label,error:e.message}));
   let completed;
   try{
    await page.goto(ORIGIN+'/village/',{waitUntil:'networkidle'});
    await page.evaluate(async who=>{const P=await import('/platform/progress.js');P.selectLearner(who);},child.who);
    await check(label,'actual selected profile and Unity INIT with empty isolated records',async()=>{
     await startUnity(page,child.who);assert.equal(await page.locator('#vh-name').textContent(),child.name+'의 마법마을');
     const initial=await snapshot(page,child.who);assert.equal(initial.who,child.who);assert.equal(initial.wallet.available,0);
     assert.equal(initial.flowers.flowers,0);assert.equal(initial.flowers.familyFlowers,0);assert.equal(initial.siblingAvailable,0);
     assert.deepEqual(initial.games,[]);assert.deepEqual(initial.siblingGames,[]);
     await capture(page,label+'-world');
    });
    if(!results.at(-1).pass)continue;
    await check(label,'real '+child.total+'-question round submits and completes through Unity bridge',async()=>{
     await page.locator('#vh-quest').click();await page.waitForFunction(()=>!document.querySelector('#village-dialog-wrap').hidden,undefined,{timeout:30000});
     for(let count=0;count<child.total;count++){
      const data=await page.evaluate(async()=>{const P=await import('/platform/progress.js');const raw=P.exportRecords(),who=P.learner();const g=Object.entries(raw.platform.profiles[who].games).find(([,g])=>g.round&&!g.round.finished);return g?{gameId:g[0],round:g[1].round}:null;});
      assert.ok(data,'A real active round must exist for each question');assert.equal(data.round.ids.length,child.total);assert.equal(data.round.index,count);
      assert.equal((await page.locator('#vh-counter').textContent()).replaceAll(' ',''),(count+1)+'/'+child.total);
      const json=await page.evaluate(async gameId=>(await fetch('/games/'+gameId+'/game.json')).json(),data.gameId);
      const q=json.questions.find(q=>q.id===data.round.ids[count]);assert.ok(q,'Current round question must belong to actual game source');
      const mode=q.interaction?.type??'choice';
      if(mode==='choice')await page.locator('.vh-option').nth(q.answer).click();
      else if(mode==='build'){for(let i=0;i<q.interaction.target;i++)await page.getByRole('button',{name:'하나 늘리기'}).click();await page.locator('.vh-wide').click();}
      else if(mode==='numeric'){await page.getByRole('textbox',{name:'숫자 답'}).fill(String(q.interaction.target));await page.locator('.vh-wide').click();}
      else{const selections=mode==='match'?q.interaction.pairs:q.interaction.order;for(let i=0;i<selections.length;i++)await page.locator('.vh-pair select').nth(i).selectOption(String(selections[i]));await page.locator('.vh-wide').click();}
      await page.getByRole('button',{name:'다음 이야기 →'}).waitFor({state:'visible',timeout:30000});
      assert.equal(await page.locator('.vh-reward-art img').getAttribute('src'),'./assets/star_yellow.png');
      const graded=await snapshot(page,child.who),game=graded.games.find(g=>g.id===data.gameId);
      assert.equal(game.round.answers.length,count+1);assert.equal(game.round.answers[count].correct,true);
      await page.getByRole('button',{name:'다음 이야기 →'}).click();
      await page.waitForFunction(({index,total})=>{const c=document.querySelector('#vh-counter').textContent.replaceAll(' ','');return index===total?c==='완료':c===(index+1)+'/'+total;},{index:count+1,total:child.total},{timeout:30000});
     }
     assert.equal(await page.locator('#vh-counter').textContent(),'완료');
     assert.equal(await page.locator('.vh-reward-art img').getAttribute('src'),'./assets/bloom.png');
     completed=await snapshot(page,child.who);await capture(page,label+'-completed-round');
    });
    if(!results.at(-1).pass)continue;
    await check(label,'one personal and one family flower with bounded stars and sibling isolation',async()=>{
     assert.equal(completed.flowers.flowers,1);assert.equal(completed.flowers.familyFlowers,1);
     assert.equal(completed.wallet.learningStars,child.total*10);
     assert.equal(completed.wallet.effortStars,3);
     assert.equal(completed.wallet.available,child.total*10+3);assert.equal(completed.wallet.spent,0);
     assert.equal(completed.siblingAvailable,0);assert.deepEqual(completed.siblingGames,[]);
     const game=completed.games.find(g=>g.finishedRounds===1);assert.ok(game);assert.equal(game.records.length,child.total);
     assert.equal(game.completedRounds.length,1);assert.equal(game.completedRounds[0].questionIds.length,child.total);
     assert.equal(game.round.finished,true);assert.equal(game.round.answers.length,child.total);
     assert.equal(await page.locator('#vh-progress').textContent(),'내 꽃 1송이 · 가족 꽃 1송이');
     assert.equal(await page.locator('#vh-stars').textContent(),String(completed.wallet.available));
     roundEvidence.push({profile:child.who,expectedQuestions:child.total,...completed});
    });
    await check(label,'return village then family plaza and own village retain exact rewards',async()=>{
     await page.getByRole('button',{name:'🏡 마을로 돌아가기'}).click();
     await page.waitForFunction(()=>document.querySelector('#village-dialog-wrap').hidden&&!document.querySelector('#vh-plaza').disabled,undefined,{timeout:30000});
     await page.locator('#vh-plaza').click();
     await page.waitForFunction(()=>document.querySelector('#vh-area').textContent==='가족 공용 광장'&&!document.querySelector('#vh-home').disabled,undefined,{timeout:30000});
     assert.equal(await page.locator('#vh-plaza').getAttribute('aria-current'),'page');
     assert.deepEqual(await snapshot(page,child.who),completed);await capture(page,label+'-family-plaza');
     await page.locator('#vh-home').click();
     await page.waitForFunction(()=>document.querySelector('#vh-area').textContent==='나의 마을'&&!document.querySelector('#vh-quest').disabled,undefined,{timeout:30000});
     assert.equal(await page.locator('#vh-home').getAttribute('aria-current'),'page');assert.deepEqual(await snapshot(page,child.who),completed);
    });
    await check(label,'reload preserves selected profile flowers stars and completed round without replay credit',async()=>{
     await page.reload({waitUntil:'networkidle'});await startUnity(page,child.who);
     assert.deepEqual(await snapshot(page,child.who),completed);
     assert.equal(await page.locator('#vh-progress').textContent(),'내 꽃 1송이 · 가족 꽃 1송이');
     assert.equal(await page.locator('#vh-stars').textContent(),String(completed.wallet.available));
     await capture(page,label+'-reloaded-world');
    });
    const box=await page.locator('#canvas').boundingBox();
    const floor={x:box.x+box.width*.62,y:box.y+box.height*.57};
    await page.mouse.click(floor.x,floor.y);await page.waitForTimeout(1000);
    await capture(page,label+'-floor-pointer-after-1s');
    const afterFloor=await snapshot(page,child.who);
    assert.deepEqual(afterFloor.wallet,completed.wallet);assert.deepEqual(afterFloor.flowers,completed.flowers);
    // This is a coordinate-based input observation, not a measured C# transform assertion.
    await page.reload({waitUntil:'networkidle'});await startUnity(page,child.who);
    const npcBox=await page.locator('#canvas').boundingBox(),aspect=npcBox.width/npcBox.height;
    const size=Math.max(14.8,10.8/Math.max(.35,aspect)),pixels=npcBox.height/(2*size);
    const npc={x:npcBox.x+npcBox.width/2-3.465*pixels,y:npcBox.y+npcBox.height/2-2.12*pixels};
    await page.mouse.click(npc.x,npc.y);
    let npcOpened=false,npcError='';
    try{await page.waitForFunction(()=>!document.querySelector('#village-dialog-wrap').hidden,undefined,{timeout:12000});npcOpened=true;}
    catch(error){npcError=error.message;}
    const afterNpc=await snapshot(page,child.who);
    const active=afterNpc.games.find(g=>g.round&&!g.round.finished);
    if(npcOpened){assert.ok(active);assert.equal(active.id,'snack-count');await capture(page,label+'-npc-pointer-question');await page.locator('#vh-exit').click();}
    assert.deepEqual(afterNpc.wallet,completed.wallet);assert.deepEqual(afterNpc.flowers,completed.flowers);
    pointerObservations.push({profile:child.who,input:'headless mouse click on actual Unity canvas',floor,afterOneSecond:label+'-floor-pointer-after-1s.png',movementAssertion:'manual visual observation only; no transform measurement',npc:{...npc,opened:npcOpened,gameId:active?.id??null,error:npcError}});
    console.log('POINTER',child.who,'NPC_OPENED',npcOpened);
   }finally{await context.close();}
  }
 }
}finally{
 await browser.close();
 const report={createdAt:new Date().toISOString(),mode:full?'headless-webgl':'headless-dom-fixtures',origin:ORIGIN,chrome:CHROME,
 realDevice:false,childStorage:'isolated synthetic browser contexts',sourceHashes,buildHashes,tests:results,pageErrors,screenshots,roundEvidence,pointerObservations,
 pass:results.length>0&&results.every(r=>r.pass)&&pageErrors.length===0};
 const output=path.join(OUTPUT,full?'qa-webgl.json':'qa-dom.json');await writeFile(output,JSON.stringify(report,null,2)+'\n');
 console.log('REPORT',output,'PASS',report.pass,'TESTS',results.length,'ERRORS',pageErrors.length);
 if(!report.pass)process.exitCode=1;
}
