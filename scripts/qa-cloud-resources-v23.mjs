import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.CLOUD_QA_ORIGIN||'http://127.0.0.1:4184').replace(/\/$/,'');
const out=process.env.CLOUD_QA_OUTPUT||'/Users/01chungee10/Github/sparkle-learning-gameplay-v10/docs/qa-pond-v23/cloud';
await fs.mkdir(out,{recursive:true});

const FAMILY='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LEARNERS={tae:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',se:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
const familyCode='MVFAMILY_7Qm8v2N4x6K9p3R5s1T0';
const server={devices:new Map(),snapshots:[],deviceCounter:0,indexed:new Set()};

function json(route,status,data,headers={}){
 return route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(data)});
}
function valid(body){return body?.p_code===familyCode;}
function ensureDevice(key){
 if(!server.devices.has(key)){
   server.deviceCounter++;
   server.devices.set(key,{id:'eeeeeeee-eeee-4eee-8eee-'+String(server.deviceCounter).padStart(12,'0'),device_key:key});
 }
 return server.devices.get(key);
}
async function mockSupabase(route){
 const req=route.request(),url=new URL(req.url()),method=req.method();
 if(method!=='POST')return json(route,405,{message:'method not allowed'});
 const body=JSON.parse(req.postData()||'{}');
 if(url.pathname==='/rest/v1/rpc/magic_family_pair'){
   if(!valid(body))return json(route,400,{message:'invalid family pairing code'});
   const device=ensureDevice(body.p_device_key);
   return json(route,200,{familyId:FAMILY,deviceId:device.id,learners:LEARNERS});
 }
 if(url.pathname==='/rest/v1/rpc/magic_family_index_snapshot'){
   if(!valid(body))return json(route,403,{message:'bad family code'});
   if(!server.snapshots.some(row=>row.content_sha256===body.p_content_sha256))return json(route,400,{message:'snapshot must already exist'});
   server.indexed.add(body.p_content_sha256);
   return json(route,200,{indexed:true});
 }
 if(url.pathname==='/rest/v1/rpc/magic_family_pull'){
   if(!valid(body))return json(route,400,{message:'invalid family pairing code'});
   const latest=[];
   for(const device of server.devices.values()){
     const rows=server.snapshots.filter(x=>x.device_id===device.id)
       .sort((a,b)=>b.client_revision-a.client_revision||new Date(b.created_at)-new Date(a.created_at));
     if(rows.length){
       const row=rows[0];
       latest.push({payload:row.payload,content_sha256:row.content_sha256,created_at:row.created_at,
         device_id:row.device_id,client_revision:row.client_revision});
     }
   }
   latest.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
   return json(route,200,latest);
 }
 if(url.pathname==='/rest/v1/rpc/magic_family_push'){
   if(!valid(body))return json(route,400,{message:'invalid family pairing code'});
   const device=ensureDevice(body.p_device_key);
   const duplicate=server.snapshots.some(x=>x.content_sha256===body.p_content_sha256);
   const current=Math.max(0,...server.snapshots.filter(x=>x.device_id===device.id).map(x=>x.client_revision));
   const revision=Math.max(current+1,Number(body.p_client_revision)||0);
   if(!duplicate)server.snapshots.push({
     family_id:FAMILY,device_id:device.id,client_revision:revision,payload:body.p_payload,
     content_sha256:body.p_content_sha256,created_at:new Date(Date.now()+server.snapshots.length).toISOString()
   });
   return json(route,200,{familyId:FAMILY,deviceId:device.id,revision,uploaded:!duplicate});
 }
 return json(route,404,{message:'unmocked '+url.pathname});
}

async function context(seedRelation=null,seedEcology=null){
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR',reducedMotion:'reduce'});
 await ctx.route('https://czynhzckftudetvcynjq.supabase.co/**',mockSupabase);
 if(seedRelation||seedEcology)await ctx.addInitScript(({seedRelation,seedEcology})=>{
   if(seedRelation)localStorage.setItem('sparkle-village-relationships-v1',JSON.stringify(seedRelation));
   if(seedEcology)localStorage.setItem('sparkle-village-ecology-v1',JSON.stringify(seedEcology));
 },{seedRelation,seedEcology});
 const page=await ctx.newPage(),errors=[];
 await page.exposeFunction('__cloudQaSnapshotCount',()=>server.snapshots.length);
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/learning.html',{waitUntil:'networkidle',timeout:100000});
 return {ctx,page,errors};
}
async function cloud(page,op,args=[]){
 return page.evaluate(async({op,args})=>{
   const C=await import('/platform/cloud-sync.js?v=pond-v22-20261017');
   return await C[op](...args);
 },{op,args});
}

const relationA={version:1,profiles:{
 tae:{events:{'visit:bunny:20261015':{type:'visit',npcId:'bunny',at:Date.now()-1000,day:'20261015'}}},
 se:{events:{}}
}};
const ecologyA={version:1,profiles:{
 tae:{events:{'ecology:memory-30:qa-r30':{type:'memory',tier:'memory-30',subject:'math',
   roundId:'qa-r30',at:Date.now()-500,skills:['규칙성']}}},
 se:{events:{}}
}};

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
try{
 // Invalid family code must not pair a device or persist a code.
 const Invalid=await context();
 await assert.rejects(()=>cloud(Invalid.page,'pairFamily',['WRONG_FAMILY_CODE_1234567890']),/가족 동기화 코드/);
 assert.equal(await Invalid.page.evaluate(()=>localStorage.getItem('sparkle-family-pairing-code-v1')),null);
 await Invalid.ctx.close();

 // Device A pairs and uploads local learning/world evidence.
 const A=await context(relationA,ecologyA);
 await A.page.evaluate(async()=>{
   const P=await import('/platform/progress.js?v=ecology-v19-20261015');
   const backup=P.exportRecords(),at=Date.now()-10000;
   backup.platform.profiles.tae.games['growth-math-3']={
     records:{'growth-math-3-01':{best:10,seen:1,attempts:[{id:'cloudqa-a1',roundId:'cloudqa-round1',correct:true,at}],
       firstAttempt:{id:'cloudqa-a1',roundId:'cloudqa-round1',correct:true,at}}},
     round:null,finishedRounds:0,lastPlayed:at,completedRounds:[]
   };
   P.importRecords(backup);
 });
 const added=await A.page.evaluate(async()=>{
   const P=await import('/platform/progress.js?v=ecology-v19-20261015');
   const R=await import('/platform/resource-economy.js?v=pond-economy-v1');
   const catalog=await (await fetch('/games/catalog.json')).json();
   const backup=P.exportRecords(),at=Date.now()-20000;
   for(const subject of ['math','korean','english','hanja']){
     const entry=catalog.find(row=>row.subject===subject&&row.kind==='quiz'&&row.status==='published'&&row.questionIds?.length>=8&&row.id!=='growth-math-3');
     if(!entry)throw new Error('missing games for '+subject);
     const records={};
     for(let i=0;i<8;i++){
       const id=entry.questionIds[i],attempt={id:'cloudqa-'+subject+'-'+i,roundId:'cloudqa-simulation-'+subject,correct:true,at:at+i};
       records[id]={best:10,seen:1,attempts:[attempt],firstAttempt:attempt};
     }
     backup.platform.profiles.tae.games[entry.id]={records,round:null,finishedRounds:0,lastPlayed:at,completedRounds:[]};
   }
   P.importRecords(backup);R.configure(catalog);
   const adoption=R.adoptFish('goldfish',catalog,'tae');
   const feed=R.feedFish('guppy',catalog,'tae');
   const career=R.unlockCareer('doctor',['math','english'],catalog,'tae');
   return {adoption:adoption.ok,feed:feed.ok,career:career.ok,balances:R.wallet(catalog,'tae').available};
 });
 assert(added.adoption&&added.feed&&added.career,'cannot generate resource-backed fish and career purchases');
 await cloud(A.page,'pairFamily',[familyCode]);
 const a1=await cloud(A.page,'syncNow');
 assert.equal(a1.uploaded,true);
 assert.equal(server.snapshots.length,1);
 const unchanged=await cloud(A.page,'syncNow');
 assert.equal(unchanged.uploaded,false,'An unchanged snapshot must not create another DB revision');
 assert.equal(server.snapshots.length,1,'Idle cloud sync should be idempotent');
 const first=server.snapshots[0].payload;
 assert(first.relationships?.profiles?.tae?.events?.['visit:bunny:20261015']);
 assert(first.ecology?.profiles?.tae?.events?.['ecology:memory-30:qa-r30']);
 assert.equal(first.platform?.profiles?.tae?.games?.['growth-math-3']?.records?.['growth-math-3-01']?.seen,1);
 assert(first.resources?.profiles?.tae?.adoptions?.goldfish,'fish receipt included in Supabase snapshot');
 assert(first.resources?.profiles?.tae?.careerUnlocks?.doctor,'career unlock receipt included in Supabase snapshot');
 assert(first.resources?.profiles?.tae?.feedEvents&&Object.keys(first.resources.profiles.tae.feedEvents).length===1);
 const serialized=JSON.stringify(first);
 assert(!serialized.includes(familyCode),'family pairing code leaked into cloud snapshot');
 assert(!serialized.includes('service_role'),'server credential leaked into cloud snapshot');

 // Device B pairs with the same one-time family code and downloads A.
 const B=await context();
 await cloud(B.page,'pairFamily',[familyCode]);
 const b1=await cloud(B.page,'syncNow');
 assert.equal(b1.downloaded,true);
 const bImported=await B.page.evaluate(async()=>{
   const R=await import('/village/relationship-state.js?v=ecology-v19-20261015');
   const E=await import('/village/ecology-state.js?v=ecology-v19-20261015');
   const P=await import('/platform/progress.js?v=ecology-v19-20261015');
   return {r:R.relationshipSnapshot(R.loadRelationships(),'tae'),e:E.ecologySnapshot(E.loadEcology(),'tae'),
     seen:P.gameProgress('growth-math-3','tae').records?.['growth-math-3-01']?.seen||0};
 });
 assert.equal(bImported.seen,1);
 const resourcesB=await B.page.evaluate(async()=>{const R=await import('/platform/resource-economy.js?v=career-v27-20261019');const c=await (await fetch('/games/catalog.json')).json();const w=R.wallet(c,'tae');const adoption=R.adoptFish('neon',c,'tae');const career=R.unlockCareer('dentist',['korean','hanja'],c,'tae');return {goldfish:w.fish.find(x=>x.id==='goldfish'),guppy:w.fish.find(x=>x.id==='guppy'),neon:adoption.ok,fromOtherDevice:career.ok,doctor:w.careerUnlocked.includes('doctor')};});
 assert(resourcesB.goldfish.owned&&resourcesB.guppy.feedDays===1&&resourcesB.neon&&resourcesB.fromOtherDevice&&resourcesB.doctor,'synced fish, career unlock receipts and resources');
 assert.equal(bImported.r.npcs.find(n=>n.id==='bunny').visits,1);
 assert.equal(bImported.e.guardianTree,true);

 // B adds distinct evidence and uploads.
 await B.page.evaluate(async()=>{
   const R=await import('/village/relationship-state.js?v=ecology-v19-20261015');
   const state=R.recordVisit(R.loadRelationships(),{who:'tae',npcId:'cat',at:Date.now()}).state;
   R.saveRelationships(state);
 });
 const b2=await cloud(B.page,'syncNow');
 assert.equal(b2.uploaded,true);
 assert(server.snapshots.length>=2);
 assert.equal(new Set(server.snapshots.map(x=>x.content_sha256)).size,server.snapshots.length);

 // A merges B without losing its own learning/world branch.
 const a2=await cloud(A.page,'syncNow');
 assert.equal(a2.downloaded,true);
 const aMerged=await A.page.evaluate(async()=>{
   const R=await import('/village/relationship-state.js?v=ecology-v19-20261015');
   const E=await import('/village/ecology-state.js?v=ecology-v19-20261015');
   const P=await import('/platform/progress.js?v=ecology-v19-20261015');
   return {r:R.relationshipSnapshot(R.loadRelationships(),'tae'),e:E.ecologySnapshot(E.loadEcology(),'tae'),
     seen:P.gameProgress('growth-math-3','tae').records?.['growth-math-3-01']?.seen||0};
 });
 assert.equal(aMerged.seen,1);
 const resourceMerge=await A.page.evaluate(async()=>{const R=await import('/platform/resource-economy.js?v=career-v27-20261019');const c=await (await fetch('/games/catalog.json')).json();const w=R.wallet(c,'tae');return {goldfish:w.fish.find(x=>x.id==='goldfish').owned,neon:w.fish.find(x=>x.id==='neon').owned,guppyFeedDays:w.fish.find(x=>x.id==='guppy').feedDays,careers:w.careerUnlocked,seFish:R.wallet(c,'se').fish.filter(x=>x.owned).length,seCareers:R.wallet(c,'se').careerUnlocked.length};});
 assert(resourceMerge.goldfish&&resourceMerge.neon&&resourceMerge.guppyFeedDays===1&&resourceMerge.seFish===1&&resourceMerge.seCareers===0&&resourceMerge.careers.includes('doctor')&&resourceMerge.careers.includes('dentist'),'two-device fish/career merge and sibling isolation');
 assert.equal(aMerged.r.npcs.find(n=>n.id==='bunny').visits,1);
 assert.equal(aMerged.r.npcs.find(n=>n.id==='cat').visits,1);
 assert.equal(aMerged.e.guardianTree,true);

 // Debounced auto-sync uploads a later local change.
 const beforeScheduled=server.snapshots.length;
 await A.page.evaluate(async()=>{
   const R=await import('/village/relationship-state.js?v=ecology-v19-20261015');
   const C=await import('/platform/cloud-sync.js?v=pond-v22-20261017');
   const state=R.recordVisit(R.loadRelationships(),{who:'tae',npcId:'squirrel',at:Date.now()+86400000}).state;
   R.saveRelationships(state);C.scheduleSync(250);
 });
 await A.page.waitForFunction(before=>window.__cloudQaSnapshotCount?.()>before,beforeScheduled,{timeout:5000}).catch(()=>{});
 await A.page.waitForTimeout(800);
 assert(server.snapshots.length>beforeScheduled);
 assert(Object.values(server.snapshots.at(-1).payload.relationships.profiles.tae.events).some(e=>e.npcId==='squirrel'));

 // Parent UI shows pairing state and no account fields.
 await A.page.locator('[data-action="parents"]').click();
 await A.page.locator('.parent-cloud.connected').waitFor();
 const cloudText=await A.page.locator('.parent-cloud.connected').innerText();
 assert(cloudText.includes('가족 마법마을 연결됨'));
 assert.equal(await A.page.locator('#cloud-email').count(),0);
 assert.equal(await A.page.locator('#cloud-password').count(),0);
 await A.page.screenshot({path:path.join(out,'family-device-connected.png'),animations:'disabled'});

 // Direct village load keeps family pairing and auto-sync path.
 await A.page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:100000});
 assert.equal(await A.page.evaluate(()=>Boolean(localStorage.getItem('sparkle-family-pairing-code-v1'))),true);

 // Unpairing removes only cloud pairing; local learning/world evidence stays.
 await cloud(A.page,'unpairFamily');
 const afterUnpair=await A.page.evaluate(async()=>{
   const R=await import('/village/relationship-state.js?v=ecology-v19-20261015');
   const raw=JSON.parse(localStorage.getItem('sparkle-learning-progress-v3')||'{}');
   return {pair:localStorage.getItem('sparkle-family-pairing-code-v1'),
     bunny:R.relationshipSnapshot(R.loadRelationships(),'tae').npcs.find(n=>n.id==='bunny').visits,
     seen:raw.profiles?.tae?.games?.['growth-math-3']?.records?.['growth-math-3-01']?.seen||0};
 });
 assert.equal(afterUnpair.pair,null);
 assert.equal(afterUnpair.bunny,1);
 assert.equal(afterUnpair.seen,1);
 assert.equal(A.errors.length,0,'A JS errors: '+A.errors.join('; '));
 assert.equal(B.errors.length,0,'B JS errors: '+B.errors.join('; '));

 const report={pass:true,snapshots:server.snapshots.length,deviceCount:server.devices.size,
   indexedSnapshots:server.indexed.size,resourceMerge:true,resourceSeparation:true,
   bunnyVisits:1,catVisits:1,guardianTree:true,learningAttemptMerged:true,
   pairingCodePersistedInSnapshot:false,authLoginRequired:false,localDataSurvivesUnpair:true,
   physicalDevice:false,mockedSupabaseTransport:true};
 await fs.writeFile(path.join(out,'cloud-resources-qa.json'),JSON.stringify(report,null,2)+'\n');
 console.log('CLOUD_RESOURCES_BROWSER_QA_PASS',JSON.stringify(report));
 await A.ctx.close();await B.ctx.close();
}finally{await browser.close();}
