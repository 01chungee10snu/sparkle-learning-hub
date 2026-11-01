import assert from 'node:assert/strict';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.CLOUD_QA_ORIGIN||'http://127.0.0.1:52118').replace(/\/$/,'');
const FAMILY='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LEARNERS={tae:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',se:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
const CODE='MVFAMILY_v35_Canonical_7Qm8v2N4x6K9p3R5s1T0';
const server={devices:new Map(),canonical:null,legacy:[],commits:0,conflicts:0,indexed:new Set(),commitBarrier:null};

function json(route,status,data){return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});}
function device(key){
 if(!server.devices.has(key))server.devices.set(key,{id:'eeeeeeee-eeee-4eee-8eee-'+String(server.devices.size+1).padStart(12,'0')});
 return server.devices.get(key);
}
// Mirror the canonical RPC's compare-and-swap response. No real Supabase access.
function commitResponse(body){
 const expected=Number(body.p_expected_version)||0,current=server.canonical;
 if(current&&current.version!==expected){
  server.conflicts++;
  return {committed:false,conflict:true,version:current.version,
   contentSha256:current.hash,payload:current.payload,updatedAt:current.updatedAt};
 }
 if(!current&&expected!==0){
  server.conflicts++;return {committed:false,conflict:true,version:0};
 }
 if(current?.hash===body.p_content_sha256)
  return {committed:false,conflict:false,unchanged:true,version:current.version,contentSha256:current.hash};
 server.commits++;
 server.canonical={version:(current?.version||0)+1,hash:body.p_content_sha256,
  payload:body.p_payload,updatedAt:Date.now()};
 return {committed:true,conflict:false,version:server.canonical.version,contentSha256:server.canonical.hash};
}

// Hold BOTH requests until they arrive with the SAME expected version.
// Only then let the server commit one and reject the other's stale version.
// The chosen winner is independent of network timing; both retry paths are tested.
function raceCommit(route,body){
 const barrier=server.commitBarrier;
 if(!barrier?.active)return json(route,200,commitResponse(body));
 return new Promise((resolve,reject)=>{
  barrier.pending.push({route,body,resolve,reject});
  if(barrier.pending.length!==2)return;
  barrier.active=false;
  try{
   assert.equal(server.canonical.version,barrier.baseVersion,'canonical changed before race');
   const requests=barrier.pending;
   for(const request of requests)
    assert.equal(Number(request.body.p_expected_version),barrier.baseVersion,'both must commit from the same base version');
   assert.equal(new Set(requests.map(request=>request.body.p_device_key)).size,2,'race needs two distinct devices');
   const ordered=requests.sort((a,b)=>
    Number(b.body.p_device_key===barrier.winnerKey)-Number(a.body.p_device_key===barrier.winnerKey));
   assert.equal(ordered[0].body.p_device_key,barrier.winnerKey,'selected winner must be in the race');
   barrier.expectedVersions=requests.map(request=>Number(request.body.p_expected_version));
   barrier.arrivals=2;
   for(const request of ordered)request.resolve(json(request.route,200,commitResponse(request.body)));
  }catch(error){
   for(const request of barrier.pending)request.reject(error);
  }
 });
}
function armRace(baseVersion,winnerKey){
 assert.equal(server.commitBarrier?.active??false,false,'previous barrier must be released');
 server.commitBarrier={active:true,baseVersion,winnerKey,pending:[],arrivals:0,expectedVersions:[]};
}
async function withDeadline(promise,label,ms=20000){
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(new Error(label+' exceeded '+ms+' ms; race requests: '+
   (server.commitBarrier?.pending.length??0))),ms);
 })]);}finally{clearTimeout(timer);}
}

async function mock(route){
 const req=route.request(),url=new URL(req.url()),body=JSON.parse(req.postData()||'{}');
 if(body.p_code!==CODE)return json(route,400,{message:'invalid family pairing code'});
 if(url.pathname.endsWith('/magic_family_pair')){
  const d=device(body.p_device_key);return json(route,200,{familyId:FAMILY,deviceId:d.id,learners:LEARNERS});
 }
 if(url.pathname.endsWith('/magic_family_pull'))return json(route,200,server.legacy);
 if(url.pathname.endsWith('/magic_family_state_pull')){
  if(!server.canonical)return json(route,200,{exists:false,version:0});
  return json(route,200,{exists:true,version:server.canonical.version,contentSha256:server.canonical.hash,
   payload:server.canonical.payload,updatedAt:server.canonical.updatedAt});
 }
 if(url.pathname.endsWith('/magic_family_state_commit')){
  device(body.p_device_key);
  return raceCommit(route,body);
 }
 if(url.pathname.endsWith('/magic_family_index_snapshot')){
  server.indexed.add(body.p_content_sha256);return json(route,200,{indexed:true});
 }
 if(url.pathname.endsWith('/magic_family_append_responses'))return json(route,200,{stored:true,inserted:0,eventIds:[]});
 return json(route,404,{message:'unmocked '+url.pathname});
}

const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
async function makeContext(){
 const ctx=await browser.newContext({viewport:{width:390,height:844},locale:'ko-KR'});
 await ctx.route('https://czynhzckftudetvcynjq.supabase.co/**',mock);
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/learning.html',{waitUntil:'networkidle',timeout:60000});
 return {ctx,page,errors};
}
async function cloud(page,op,args=[]){return page.evaluate(async({op,args})=>{
 const C=await import('/platform/cloud-sync.js?v=canonical-v35-20261023');return C[op](...args);
},{op,args});}
async function seed(page,who,gameId,questionId,eventId,at){
 return page.evaluate(async({who,gameId,questionId,eventId,at})=>{
  const P=await import('/platform/progress.js');
  const backup=P.exportRecords(),attempt={id:eventId,roundId:'round-'+eventId,correct:true,at};
  backup.platform.profiles[who].games[gameId]={
   records:{[questionId]:{best:10,seen:1,attempts:[attempt],firstAttempt:attempt}},
   round:null,finishedRounds:0,lastPlayed:at,completedRounds:[]
  };
  P.importRecords(backup);
 },{who,gameId,questionId,eventId,at});
}
async function profiles(page){
 return page.evaluate(async()=>{
  const P=await import('/platform/progress.js');
  return P.exportRecords().platform.profiles;
 });
}

const EXPECTED={
 tae:[
  ['growth-math-1','growth-math-1-01','attempt-v35-initial-tae'],
  ['growth-english-1','growth-english-1-01','attempt-v35-race1-tae'],
  ['growth-korean-2','korean-growth-2-01','attempt-v35-race2-tae']
 ],
 se:[
  ['growth-english-1','growth-english-1-01','attempt-v35-race1-se'],
  ['growth-math-1','growth-math-1-01','attempt-v35-race2-se']
 ]
};
function verifyLearners(data,label){
 assert.ok(data?.tae?.games&&data?.se?.games,label+' must contain both learner profiles');
 for(const [who,rows] of Object.entries(EXPECTED)){
  for(const [gameId,questionId,eventId] of rows){
   const record=data[who].games[gameId]?.records?.[questionId];
   assert.ok(record,label+': missing '+who+'/'+gameId+'/'+questionId);
   assert.deepEqual((record.attempts||[]).map(a=>a.id),[eventId],
    label+': missing or repeated attempt for '+who+'/'+gameId);
   assert.equal(record.seen,1,label+': seen must not increase on repeated sync');
   assert.equal(record.firstAttempt?.id,eventId,label+': original first attempt must survive');
   const other=who==='tae'?'se':'tae';
   const otherAttempts=data[other].games[gameId]?.records?.[questionId]?.attempts||[];
   assert.equal(otherAttempts.some(a=>a.id===eventId),false,
    label+': '+who+' attempt leaked into '+other);
  }
 }
 // Inventory every attempt, not just expected question locations: a misplaced
 // or duplicated event under another learner/game must fail the test as well.
 const expected=Object.entries(EXPECTED).flatMap(([who,rows])=>
  rows.map(([gameId,questionId,eventId])=>[who,gameId,questionId,eventId]));
 const actual=Object.entries(data).flatMap(([who,profile])=>
  Object.entries(profile.games||{}).flatMap(([gameId,game])=>
   Object.entries(game.records||{}).flatMap(([questionId,record])=>
    (record.attempts||[]).map(attempt=>[who,gameId,questionId,attempt.id]))));
 const sortRows=rows=>rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
 assert.deepEqual(sortRows(actual),sortRows(expected),
  label+': full event inventory must contain each synthetic attempt exactly once');
}
async function converge(A,B){
 await cloud(A.page,'syncNow');
 await cloud(B.page,'syncNow');
}
async function concurrentRound(A,B,{a,b,winnerKey,loser}){
 const baseVersion=server.canonical.version,conflictsBefore=server.conflicts;
 await seed(A.page,...a);
 await seed(B.page,...b);
 armRace(baseVersion,winnerKey);
 const [aResult,bResult]=await withDeadline(Promise.all([
  cloud(A.page,'syncNow'),cloud(B.page,'syncNow')
 ]),'concurrent canonical commits');
 const barrier=server.commitBarrier;
 assert.equal(barrier.arrivals,2,'both clients must reach the server before either commit completes');
 assert.deepEqual(barrier.expectedVersions,[baseVersion,baseVersion],
  'both browsers must submit exactly the same expected version');
 assert.equal(server.conflicts,conflictsBefore+1,'a stale concurrent commit MUST be rejected');
 assert.equal(aResult.conflictRetries+bResult.conflictRetries,1,'the loser MUST retry exactly once');
 assert.equal((loser==='A'?aResult:bResult).conflictRetries,1,
  'designated losing browser must execute the actual retry path');
 assert.equal((loser==='A'?bResult:aResult).conflictRetries,0);
 assert.equal(server.canonical.version,baseVersion+2,'winner and retry must both commit');
 return {baseVersion,expectedVersions:barrier.expectedVersions,
  winner:loser==='A'?'B':'A',loser,conflicts:server.conflicts-conflictsBefore,
  conflictRetries:{A:aResult.conflictRetries,B:bResult.conflictRetries},
  resultingVersion:server.canonical.version};
}

try{
 const A=await makeContext(),B=await makeContext();
 await cloud(A.page,'pairFamily',[CODE]);await cloud(B.page,'pairFamily',[CODE]);
 const deviceKeys=await Promise.all([A.page,B.page].map(p=>p.evaluate(async()=>{
  const C=await import('/platform/cloud-sync.js?v=canonical-v35-20261023');
  return C.cloudState().deviceKey;
 })));
 assert.notEqual(deviceKeys[0],deviceKeys[1],'distinct browsers need distinct device keys');

 const base=Date.now()-10000;
 await seed(A.page,'tae','growth-math-1','growth-math-1-01','attempt-v35-initial-tae',base);
 const initial=await cloud(A.page,'syncNow');
 assert.equal(initial.canonicalVersion,1);assert.equal(server.canonical.version,1);
 const inherited=await cloud(B.page,'syncNow');
 assert.equal(inherited.downloaded,true,'browser B must download the initial canonical head');
 assert.equal((await profiles(B.page)).tae.games['growth-math-1'].records['growth-math-1-01'].firstAttempt.id,
  'attempt-v35-initial-tae');

 // RACE 1: two browsers independently change the SAME question, but for
 // DIFFERENT learners. Browser B must detect a stale version and retry.
 const round1=await concurrentRound(A,B,{
  a:['tae','growth-english-1','growth-english-1-01','attempt-v35-race1-tae',base+1000],
  b:['se','growth-english-1','growth-english-1-01','attempt-v35-race1-se',base+2000],
  winnerKey:deviceKeys[0],loser:'B'
 });
 await converge(A,B);

 // RACE 2: reverse the winner to exercise browser A's retry logic too.
 const round2=await concurrentRound(A,B,{
  a:['tae','growth-korean-2','korean-growth-2-01','attempt-v35-race2-tae',base+3000],
  b:['se','growth-math-1','growth-math-1-01','attempt-v35-race2-se',base+4000],
  winnerKey:deviceKeys[1],loser:'A'
 });
 await converge(A,B);

 assert.equal(server.canonical.version,5);
 assert.equal(server.commits,5,'one initial commit and two versions per collision');
 assert.equal(server.conflicts,2,'both simultaneous conflicts must occur');
 verifyLearners(server.canonical.payload.platform.profiles,'canonical');
 verifyLearners(await profiles(A.page),'browser A');
 verifyLearners(await profiles(B.page),'browser B');

 const stableVersion=server.canonical.version,stableHash=server.canonical.hash;
 for(let round=0;round<3;round++){
  await converge(A,B);
  assert.equal(server.canonical.version,stableVersion,'idle sync must not create a revision');
  assert.equal(server.canonical.hash,stableHash,'idle sync must keep the same canonical hash');
  verifyLearners(server.canonical.payload.platform.profiles,'canonical repeated '+round);
  verifyLearners(await profiles(A.page),'browser A repeated '+round);
  verifyLearners(await profiles(B.page),'browser B repeated '+round);
 }
 const statuses=await Promise.all([A.page,B.page].map(p=>p.evaluate(async()=>{
  const C=await import('/platform/cloud-sync.js?v=canonical-v35-20261023');return C.status();
 })));
 for(const status of statuses){
  assert.equal(status.sourceOfTruth,'supabase-family-canonical-v1');
  assert.equal(status.canonicalVersion,server.canonical.version);
 }
 assert.deepEqual(A.errors,[],'browser A runtime errors');
 assert.deepEqual(B.errors,[],'browser B runtime errors');
 console.log(JSON.stringify({result:'PASS',environment:'two isolated Chromium contexts, synthetic records, mocked RPC',
  canonicalVersion:server.canonical.version,commits:server.commits,conflicts:server.conflicts,
  deviceCount:server.devices.size,races:[round1,round2],idleSyncRounds:3,
  expectedAttemptCount:Object.values(EXPECTED).reduce((total,rows)=>total+rows.length,0),
  checks:['same-base concurrent commit barrier','CAS conflict detected','both browsers retried',
   'tae/se separation including same question','no missing attempts','no repeated attempts',
   'firstAttempt preserved','idle synchronization is idempotent','source-of-truth status']}));
 await A.ctx.close();await B.ctx.close();
}finally{await browser.close();}
