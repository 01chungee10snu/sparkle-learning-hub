import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.CLOUD_QA_ORIGIN||'http://127.0.0.1:4179').replace(/\/$/,'');
const out=process.env.CLOUD_QA_OUTPUT||'/Users/01chungee10/AI-Interop/evidence/magic-village-cloud-v20';
await fs.mkdir(out,{recursive:true});

const FAMILY='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const LEARNERS={tae:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',se:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
const email='parent.qa@example.test',password='CloudQA!1234';
const server={devices:new Map(),snapshots:[],deviceCounter:0,tokenCounter:0};

function json(route,status,data,headers={}){
 return route.fulfill({status,contentType:'application/json',headers,body:JSON.stringify(data)});
}
async function mockSupabase(route){
 const req=route.request(),url=new URL(req.url()),method=req.method();
 if(url.pathname==='/auth/v1/signup'&&method==='POST'){
   const body=JSON.parse(req.postData()||'{}');
   return json(route,200,{user:{id:USER,email:body.email||email}});
 }
 if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='password'){
   server.tokenCounter++;
   return json(route,200,{access_token:'access-'+server.tokenCounter,refresh_token:'refresh-'+server.tokenCounter,
     expires_in:3600,user:{id:USER,email}});
 }
 if(url.pathname==='/auth/v1/token'&&url.searchParams.get('grant_type')==='refresh_token'){
   server.tokenCounter++;
   return json(route,200,{access_token:'access-'+server.tokenCounter,refresh_token:'refresh-'+server.tokenCounter,
     expires_in:3600,user:{id:USER,email}});
 }
 if(url.pathname==='/auth/v1/logout')return json(route,200,{});
 if(url.pathname==='/rest/v1/rpc/bootstrap_magic_family')return json(route,200,FAMILY);
 if(url.pathname==='/rest/v1/magic_learners'){
   return json(route,200,[
     {id:LEARNERS.tae,learner_key:'tae',display_name:'태희'},
     {id:LEARNERS.se,learner_key:'se',display_name:'세희'}
   ]);
 }
 if(url.pathname==='/rest/v1/magic_devices'&&method==='GET'){
   return json(route,200,[...server.devices.values()].map(x=>({id:x.id,device_key:x.device_key})));
 }
 if(url.pathname==='/rest/v1/magic_devices'&&method==='POST'){
   const body=JSON.parse(req.postData()||'{}'),key=body.device_key;
   if(!server.devices.has(key)){
     server.deviceCounter++;
     server.devices.set(key,{id:'eeeeeeee-eeee-4eee-8eee-'+String(server.deviceCounter).padStart(12,'0'),device_key:key});
   }
   return json(route,201,[server.devices.get(key)]);
 }
 if(url.pathname==='/rest/v1/magic_device_snapshots'&&method==='GET'){
   let rows=[...server.snapshots];
   const family=url.searchParams.get('family_id');
   if(family?.startsWith('eq.'))rows=rows.filter(x=>x.family_id===family.slice(3));
   const device=url.searchParams.get('device_id');
   if(device?.startsWith('eq.'))rows=rows.filter(x=>x.device_id===device.slice(3));
   rows.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)||b.client_revision-a.client_revision);
   const limit=Number(url.searchParams.get('limit')||rows.length);
   const select=url.searchParams.get('select')||'*';
   rows=rows.slice(0,limit).map(row=>{
     if(select==='client_revision')return {client_revision:row.client_revision};
     return {payload:row.payload,content_sha256:row.content_sha256,created_at:row.created_at,
       device_id:row.device_id,client_revision:row.client_revision};
   });
   return json(route,200,rows);
 }
 if(url.pathname==='/rest/v1/magic_device_snapshots'&&method==='POST'){
   const body=JSON.parse(req.postData()||'{}');
   if(server.snapshots.some(x=>x.family_id===body.family_id&&x.content_sha256===body.content_sha256))
     return json(route,409,{message:'duplicate snapshot hash'});
   if(server.snapshots.some(x=>x.device_id===body.device_id&&x.client_revision===body.client_revision))
     return json(route,409,{message:'duplicate device revision'});
   server.snapshots.push({...body,created_at:new Date(Date.now()+server.snapshots.length).toISOString()});
   return route.fulfill({status:201,body:''});
 }
 return json(route,404,{message:'unmocked '+method+' '+url.pathname+url.search});
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
   const C=await import('./platform/cloud-sync.js?v=cloud-v20-20261015');
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
 // Sign-up without auto-confirm must require email confirmation and persist no session/password.
 const Signup=await context();
 const signup=await cloud(Signup.page,'signUp',[email,password]);
 assert.equal(signup.needsConfirmation,true);
 assert.equal(await Signup.page.evaluate(()=>localStorage.getItem('sparkle-cloud-session-v1')),null);
 assert(!JSON.stringify(await Signup.page.evaluate(()=>Object.fromEntries(Object.entries(localStorage)))).includes(password));
 await Signup.ctx.close();

 // Device A uploads its local world state.
 const A=await context(relationA,ecologyA);
 await A.page.evaluate(async()=>{
   const P=await import('./platform/progress.js?v=ecology-v19-20261015');
   const backup=P.exportRecords(),at=Date.now()-10000;
   backup.platform.profiles.tae.games['growth-math-3']={
     records:{'growth-math-3-01':{best:10,seen:1,attempts:[{id:'cloudqa-a1',roundId:'cloudqa-round1',correct:true,at}],firstAttempt:{id:'cloudqa-a1',roundId:'cloudqa-round1',correct:true,at}}},
     round:null,finishedRounds:0,lastPlayed:at,completedRounds:[]
   };
   P.importRecords(backup);
 });
 await cloud(A.page,'signIn',[email,password]);
 const a1=await cloud(A.page,'syncNow');
 assert.equal(a1.uploaded,true);
 assert.equal(server.snapshots.length,1);
 const first=server.snapshots[0].payload;
 assert(first.relationships?.profiles?.tae?.events?.['visit:bunny:20261015']);
 assert(first.ecology?.profiles?.tae?.events?.['ecology:memory-30:qa-r30']);
 assert.equal(first.platform?.profiles?.tae?.games?.['growth-math-3']?.records?.['growth-math-3-01']?.seen,1,'learning attempt missing from cloud snapshot');
 const serialized=JSON.stringify(first);
 assert(!serialized.includes(password),'password leaked into cloud snapshot');
 assert(!serialized.includes('service_role'),'server credential leaked into cloud snapshot');

 // Device B starts empty, downloads A, then adds a distinct cat visit and uploads.
 const B=await context();
 await cloud(B.page,'signIn',[email,password]);
 const b1=await cloud(B.page,'syncNow');
 assert.equal(b1.downloaded,true);
 const bImported=await B.page.evaluate(async()=>{
   const R=await import('./village/relationship-state.js?v=ecology-v19-20261015');
   const E=await import('./village/ecology-state.js?v=ecology-v19-20261015');
   const P=await import('./platform/progress.js?v=ecology-v19-20261015');
   return {r:R.relationshipSnapshot(R.loadRelationships(),'tae'),e:E.ecologySnapshot(E.loadEcology(),'tae'),
     seen:P.gameProgress('growth-math-3','tae').records?.['growth-math-3-01']?.seen||0};
 });
 assert.equal(bImported.seen,1,'device B did not import learning attempt');
 assert.equal(bImported.r.npcs.find(n=>n.id==='bunny').visits,1);
 assert.equal(bImported.e.guardianTree,true);
 await B.page.evaluate(async()=>{
   const R=await import('./village/relationship-state.js?v=ecology-v19-20261015');
   const state=R.recordVisit(R.loadRelationships(),{who:'tae',npcId:'cat',at:Date.now()}).state;
   R.saveRelationships(state);
 });
 const b2=await cloud(B.page,'syncNow');
 assert.equal(b2.uploaded,true);
 assert(server.snapshots.length>=2,'device B should create a new merged snapshot');
 assert.equal(new Set(server.snapshots.map(x=>x.content_sha256)).size,server.snapshots.length,'identical cloud snapshots must not duplicate');

 // Device A merges B without losing its own original bunny/ecology evidence.
 const a2=await cloud(A.page,'syncNow');
 assert.equal(a2.downloaded,true);
 const aMerged=await A.page.evaluate(async()=>{
   const R=await import('./village/relationship-state.js?v=ecology-v19-20261015');
   const E=await import('./village/ecology-state.js?v=ecology-v19-20261015');
   return {r:R.relationshipSnapshot(R.loadRelationships(),'tae'),e:E.ecologySnapshot(E.loadEcology(),'tae')};
 });
 assert.equal(aMerged.r.npcs.find(n=>n.id==='bunny').visits,1);
 assert.equal(aMerged.r.npcs.find(n=>n.id==='cat').visits,1);
 assert.equal(aMerged.e.guardianTree,true);

 // Debounced auto-sync: a local squirrel visit should upload without pressing the sync button.
 const beforeScheduled=server.snapshots.length;
 await A.page.evaluate(async()=>{
   const R=await import('./village/relationship-state.js?v=ecology-v19-20261015');
   const C=await import('./platform/cloud-sync.js?v=cloud-v20-20261015');
   const state=R.recordVisit(R.loadRelationships(),{who:'tae',npcId:'squirrel',at:Date.now()+86400000}).state;
   R.saveRelationships(state);
   C.scheduleSync(250);
 });
 await A.page.waitForFunction(before=>{
   return window.__cloudQaSnapshotCount?.() > before;
 },beforeScheduled,{timeout:5000}).catch(()=>{});
 await A.page.waitForTimeout(800);
 assert(server.snapshots.length>beforeScheduled,'debounced auto-sync did not upload changed local state');
 const latest=server.snapshots.at(-1).payload;
 assert(latest.relationships?.profiles?.tae?.events && Object.values(latest.relationships.profiles.tae.events).some(e=>e.npcId==='squirrel'));
 assert.equal(A.errors.length,0,'A JS errors: '+A.errors.join('; '));
 assert.equal(B.errors.length,0,'B JS errors: '+B.errors.join('; '));

 // Parent UI reflects signed-in cloud state without exposing password.
 await A.page.locator('[data-action="parents"]').click();
 await A.page.locator('.parent-cloud.connected').waitFor();
 const cloudText=await A.page.locator('.parent-cloud.connected').innerText();
 assert(cloudText.includes('클라우드 연결됨'));
 assert(!cloudText.includes(password));
 await A.page.screenshot({path:path.join(out,'parent-cloud-connected.png'),animations:'disabled'});

 // Village direct load on a signed-in device must keep the same session and auto-sync path.
 await A.page.goto(origin+'/village/',{waitUntil:'networkidle',timeout:100000});
 assert.equal(await A.page.evaluate(()=>Boolean(localStorage.getItem('sparkle-cloud-session-v1'))),true);

 const report={pass:true,snapshots:server.snapshots.length,
   deviceCount:server.devices.size,bunnyVisits:1,catVisits:1,guardianTree:true,
   passwordPersisted:false,serviceCredentialPersisted:false,physicalDevice:false,mockedSupabaseTransport:true};
 await fs.writeFile(path.join(out,'cloud-sync-qa.json'),JSON.stringify(report,null,2)+'\n');
 console.log('CLOUD_SYNC_BROWSER_QA_PASS',JSON.stringify(report));
 await A.ctx.close();await B.ctx.close();
}finally{await browser.close();}
