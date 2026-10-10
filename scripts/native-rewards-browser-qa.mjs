import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL,fileURLToPath} from 'node:url';

const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const origin=process.env.SPARKLE_QA_ORIGIN||'http://127.0.0.1:4179';
const output=process.env.SPARKLE_QA_OUTPUT||path.join(repo,'docs','evidence','native-art');
const playwrightPath='/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js';
const executablePath='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ids=['star_yellow','star_blue','star_purple','star_rainbow','seed','sprout','bud','bloom','gift','heart','badge_book','badge_leaf','badge_crown','magic_dust','ui_mission_panel','ui_star_pill','ui_button','taehee_original','sehee_original'];
const usedNativeIds=new Set();
const sourcePaths=['app.js','experience.css','index.html','village/village-ui.js','village/village-ui.css',...ids.map(id=>'village/assets/'+id+'.png')];
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const report={timestamp:new Date().toISOString(),scope:'headless Chrome isolated synthetic context; actual root hub UI; no physical-device claim',origin,checks:[],sourceHashes:{},pageErrors:[],consoleErrors:[],screenshots:[]};
let browser,context,page;
async function check(name,run){await run();report.checks.push({name,passed:true});console.log('PASS '+name);}
async function shot(name){const target=path.join(output,name+'.png');await page.screenshot({path:target,fullPage:true});report.screenshots.push(target);}
async function nativeImages(){
 await page.waitForFunction(()=>[...document.querySelectorAll('img.native-art')].filter(im=>im.getBoundingClientRect().width>0).every(im=>im.complete&&im.naturalWidth>0),null,{timeout:15000});
}
async function wallet(){return page.evaluate(async()=>{
 const [R,C,P]=await Promise.all([import('./platform/rewards.js?v=gifts-20261009'),import('./platform/catalog.js'),import('./platform/progress.js')]);
 return R.wallet(await C.loadCatalog(),P.learner());
});}
async function round(){return page.evaluate(async()=>{
 const P=await import('./platform/progress.js');return P.gameProgress(window.__nativeQAGame.id).round;
});}
async function stage(expected){await nativeImages();assert.equal(await page.locator('.round-growth').getAttribute('data-stage'),expected);assert.ok((await page.locator('.round-growth img').getAttribute('src')).endsWith('/'+expected+'.png'));}
try{
 await mkdir(output,{recursive:true});await access(executablePath);await access(playwrightPath);
 const module=await import(pathToFileURL(playwrightPath).href);
 const chromium=module.chromium||module.default.chromium;
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 context=await browser.newContext({viewport:{width:1100,height:850},deviceScaleFactor:1});
 page=await context.newPage();
 page.on('pageerror',error=>report.pageErrors.push(error.message));
 page.on('response',response=>{const match=new URL(response.url()).pathname.match(/^\/village\/assets\/([^/]+)\.png$/);if(response.status()===200&&match&&ids.includes(match[1]))usedNativeIds.add(match[1]);});
 page.on('console',message=>{if(message.type()==='error')report.consoleErrors.push(message.text());});
 await check('served source and 19 native PNGs match the isolated repo byte-for-byte',async()=>{
  for(const rel of sourcePaths){
   const bytes=await readFile(path.join(repo,rel)),response=await context.request.get(origin+'/'+rel);
   assert.equal(response.status(),200,rel);assert.equal(sha(await response.body()),sha(bytes),rel);
   report.sourceHashes[rel]=sha(bytes);
  }
 });
 await page.goto(origin+'/',{waitUntil:'networkidle',timeout:60000});
 await page.locator('.home-screen').waitFor({state:'visible'});
 const initial=await wallet();
 await check('fresh context has zero stars, no purchased gifts, and four locked badges',async()=>{
  assert.equal(initial.available,0);assert.equal(initial.spent,0);assert.equal(initial.purchases.length,0);
  assert.equal(initial.badges.length,4);assert.ok(initial.badges.every(b=>!b.unlocked));
 });
 await check('header and fairy portrait use real native images and semantic action buttons',async()=>{
  await nativeImages();
  assert.equal(await page.locator('.brand-star img').getAttribute('src'),'./village/assets/magic_dust.png');
  assert.equal(await page.locator('.header-star img').getAttribute('src'),'./village/assets/star_yellow.png');
  assert.match(await page.locator('.companion-portrait .fairy-portrait').evaluate(el=>getComputedStyle(el).backgroundImage),/taehee_original\.png/);
  assert.match(await page.locator('nav button[data-action="collection"]').evaluate(el=>getComputedStyle(el).backgroundImage),/ui_button\.png/);
 });
 await page.locator('nav button[data-action="collection"]').click();
 await page.locator('[data-action="collection-tab"][data-tab="badges"]').click();
 await check('locked badge cards show only seed images and keep their locked text',async()=>{
  await nativeImages();assert.equal(await page.locator('.success-card.locked').count(),4);
  const srcs=await page.locator('.success-card img').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));
  assert.ok(srcs.every(src=>src==='./village/assets/seed.png'));assert.equal(await page.locator('.success-card:not(.locked)').count(),0);
 });
 await shot('native-hub-badges-locked');
 await page.locator('[data-action="collection-tab"][data-tab="rewards"]').click();
 const seen=new Set(),nativeGiftIds=new Set();
 await check('all 48 gifts keep their wallet prices, disabled purchase state, and native mapped artwork',async()=>{
  const byId=new Map(initial.items.map(item=>[item.id,item]));assert.equal(byId.size,48);
  for(let turns=0;turns<48;turns++){
   await nativeImages();
   const cards=await page.locator('.reward-card').evaluateAll(nodes=>nodes.map(n=>({
    id:n.querySelector('[data-reward]').dataset.reward,
    price:n.querySelector('.reward-cost').textContent.trim(),
    disabled:n.querySelector('[data-reward]').disabled,
    image:n.querySelector('.reward-symbol img')?.getAttribute('src')||null
   })));
   for(const card of cards){
    const item=byId.get(card.id);assert.ok(item,card.id);seen.add(card.id);
    assert.equal(Number(card.price.replace(/[^0-9]/g,'')),item.cost,card.id);
    assert.equal(card.disabled,true,card.id);
    if(card.image)nativeGiftIds.add(card.image.split('/').pop().replace('.png',''));
   }
   const next=page.locator('[data-action="collection-page"][data-direction="1"]');
   if(await next.isDisabled())break;
   const previous=cards[0].id;await next.click();
   await page.waitForFunction(previous=>document.querySelector('[data-reward]')?.dataset.reward!==previous,previous);
  }
  assert.equal(seen.size,48);assert.deepEqual([...nativeGiftIds].sort(),['star_yellow','star_blue','star_purple','star_rainbow','heart','sprout','bloom','gift'].sort());
 });
 await check('browsing the full gift and badge collection does not change stars or receipts',async()=>{
  const after=await wallet();for(const key of ['available','lifetime','spent'])assert.equal(after[key],initial[key],key);
  assert.deepEqual(after.purchases,initial.purchases);
 });
 const game=await page.evaluate(async()=>{
  const C=await import('./platform/catalog.js'),entry=(await C.loadCatalog()).find(g=>g.growth&&g.subject==='korean'&&g.stage===1);
  if(!entry)throw Error('Korean stage-one fixture is absent');window.__nativeQAGame=await C.loadGame(entry);return window.__nativeQAGame;
 });
 assert.ok(game.questions.every(q=>!q.interaction||q.interaction.type==='choice'),'The real Korean stage-one fixture must use choices');
 await page.locator('nav button[data-action="growth"]').click();
 await page.locator('[data-action="growth-subject"][data-subject="korean"]').click();
 await page.locator('[data-action="stage"][data-subject="korean"][data-stage="1"]').click();
 await page.locator('.question-panel').waitFor({state:'visible'});
 await check('an unanswered round starts with a seed cue and a real mission panel',async()=>{
  const r=await round();assert.equal(r.ids.length,5);assert.equal(r.answers.length,0);await stage('seed');
  assert.match(await page.locator('.question-panel').evaluate(el=>getComputedStyle(el).backgroundImage),/ui_mission_panel\.png/);
 });
 let retryEarned=0;
 await check('actual answers and one retry drive the cue and show the same-unit Korean star image',async()=>{
  for(let i=0;i<5;i++){
   const r=await round(),q=game.questions.find(q=>q.id===r.ids[r.index]);assert.ok(q);
   const play=page.locator('[data-action="question-play"]');if(await play.count())await play.click();
   await page.locator('[data-action="answer"][data-choice="'+q.answer+'"]').click();
   await page.locator('#feedback').waitFor({state:'visible'});
   const answered=await round();assert.equal(answered.answers.length,i+1);
   assert.equal(answered.answers[i].correct,true);assert.equal(answered.answers[i].earned,10);
   await stage(i===4?'bloom':(i+1)/5<.5?'sprout':'bud');
   assert.equal(await page.locator('.earned img').getAttribute('src'),'./village/assets/star_purple.png');
   if(i===0){
    await page.locator('[data-action="retry"]').click();await page.locator('[data-action="answer"][data-choice="'+q.answer+'"]').click();
    await page.locator('#feedback').waitFor({state:'visible'});
    assert.match(await page.locator('.earned').innerText(),/노력 \+1/);await stage('sprout');retryEarned=1;
   }
   await page.locator('[data-action="next"]').click();
   if(i<4){await page.locator('.question-panel').waitFor({state:'visible'});await stage((i+1)/5<.5?'sprout':'bud');}
  }
  await page.locator('.result').waitFor({state:'visible'});assert.equal((await round()).finished,true);
  assert.equal(await page.locator('.result-icon img').getAttribute('src'),'./village/assets/bloom.png');
  const after=await wallet();assert.equal(after.learningStars,50);assert.equal(after.effortStars,3+retryEarned);assert.equal(after.available,54);assert.equal(after.spent,0);
 });
 await page.locator('nav button[data-action="collection"]').click();
 await page.locator('[data-action="collection-tab"][data-tab="badges"]').click();
 await check('only actual earned badges switch to leaf and crown; book and two-day badges remain locked',async()=>{
  await nativeImages();const w=await wallet(),unlocked=w.badges.filter(b=>b.unlocked).map(b=>b.id).sort();
  assert.deepEqual(unlocked,['first-round','try-again']);assert.equal(await page.locator('.success-card:not(.locked)').count(),2);
  const earned=await page.locator('.success-card:not(.locked) img').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src').split('/').pop()).sort());
  assert.deepEqual(earned,['badge_crown.png','badge_leaf.png']);const locked=await page.locator('.success-card.locked img').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src')));
  assert.ok(locked.every(src=>src==='./village/assets/seed.png'));
 });
 await shot('native-hub-badges-earned');
 await check('three actual subject rounds unlock the book badge and render all fourteen native reward images',async()=>{
  for(const subject of ['math','english']){
   const extra=await page.evaluate(async subject=>{
    const C=await import('./platform/catalog.js'),entry=(await C.loadCatalog()).find(g=>g.growth&&g.subject===subject&&g.stage===1);
    window.__nativeQAGame=await C.loadGame(entry);return window.__nativeQAGame;
   },subject);
   assert.ok(extra.questions.every(q=>!q.interaction||q.interaction.type==='choice'));
   await page.locator('nav button[data-action="growth"]').click();
   await page.locator('[data-action="growth-subject"][data-subject="'+subject+'"]').click();
   await page.locator('[data-action="stage"][data-subject="'+subject+'"][data-stage="1"]').click();
   await page.locator('.question-panel').waitFor({state:'visible'});await stage('seed');
   for(let i=0;i<5;i++){
    const r=await round(),q=extra.questions.find(q=>q.id===r.ids[r.index]);assert.ok(q);
    const play=page.locator('[data-action="question-play"]');if(await play.count())await play.click();
    await page.locator('[data-action="answer"][data-choice="'+q.answer+'"]').click();
    await page.locator('#feedback').waitFor({state:'visible'});const answered=await round();
    assert.equal(answered.answers.length,i+1);assert.equal(answered.answers[i].correct,true);assert.equal(answered.answers[i].earned,10);
    await stage(i===4?'bloom':(i+1)/5<.5?'sprout':'bud');
    assert.equal(await page.locator('.earned img').getAttribute('src'),'./village/assets/'+(subject==='english'?'star_blue':'star_yellow')+'.png');
    await page.locator('[data-action="next"]').click();
    if(i<4)await page.locator('.question-panel').waitFor({state:'visible'});
   }
   await page.locator('.result').waitFor({state:'visible'});assert.equal((await round()).finished,true);
  }
  const w=await wallet();assert.equal(w.learningStars,150);assert.equal(w.effortStars,4);assert.equal(w.available,154);assert.equal(w.spent,0);
  assert.deepEqual(w.badges.filter(b=>b.unlocked).map(b=>b.id).sort(),['first-round','three-subjects','try-again']);
  await page.locator('nav button[data-action="collection"]').click();await page.locator('[data-action="collection-tab"][data-tab="badges"]').click();
  await nativeImages();
  const earned=await page.locator('.success-card:not(.locked) img').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('src').split('/').pop()).sort());
  assert.deepEqual(earned,['badge_book.png','badge_crown.png','badge_leaf.png']);
  assert.deepEqual(ids.slice(0,14).filter(id=>!usedNativeIds.has(id)),[]);
 });
 await shot('native-hub-badges-three-subjects');
 const taeWallet=await wallet();
 await check('native character switch preserves separate wallets and all nineteen images load in real UI',async()=>{
  await page.locator('[data-action="profiles"]').click();await page.locator('[data-action="select-profile"][data-profile="se"]').click();
  await page.locator('.home-screen').waitFor({state:'visible'});
  assert.match(await page.locator('.companion-portrait .fairy-portrait').evaluate(el=>getComputedStyle(el).backgroundImage),/sehee_original\.png/);
  const seWallet=await wallet();assert.equal(seWallet.available,0);assert.equal(seWallet.purchases.length,0);assert.ok(seWallet.badges.every(b=>!b.unlocked));
  report.siblingWallet={who:seWallet.who,available:seWallet.available,unlockedBadges:seWallet.badges.filter(b=>b.unlocked).length};
  await page.locator('[data-action="profiles"]').click();await page.locator('[data-action="select-profile"][data-profile="tae"]').click();
  await page.locator('.home-screen').waitFor({state:'visible'});await nativeImages();
  const restored=await wallet();for(const key of ['available','lifetime','spent','learningStars','effortStars'])assert.equal(restored[key],taeWallet[key],key);
  assert.deepEqual(ids.filter(id=>!usedNativeIds.has(id)),[]);
 });
 await check('root UI completed without page errors or console errors',async()=>{assert.deepEqual(report.pageErrors,[]);assert.deepEqual(report.consoleErrors,[]);});
 report.passed=true;report.nativeArtUsage={expectedIds:ids,usedIds:[...usedNativeIds].sort(),missingIds:ids.filter(id=>!usedNativeIds.has(id))};report.giftIds=[...seen].sort();report.nativeGiftIds=[...nativeGiftIds].sort();report.finalWallet=await wallet();
}catch(error){report.passed=false;report.error=error.stack;process.exitCode=1;console.error(error.stack);if(page)try{await shot('native-hub-failure');}catch{}}
finally{
 if(context)await context.close();if(browser)await browser.close();
 await mkdir(output,{recursive:true});await writeFile(path.join(output,'native-rewards-browser-qa.json'),JSON.stringify(report,null,2)+'\n');
 console.log('Native rewards browser QA '+(report.passed?'PASS':'FAIL')+' ('+report.checks.length+' checks), '+path.join(output,'native-rewards-browser-qa.json'));
}
