import assert from 'node:assert/strict';

const pw=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');
const {chromium}=pw.chromium?pw:pw.default;
const origin=(process.env.CLOUD_QA_ORIGIN||'http://127.0.0.1:52118').replace(/\/$/,'');
const FAMILY='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LEARNERS={tae:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',se:'dddddddd-dddd-4ddd-8ddd-dddddddddddd'};
const CODE='MVFAMILY_v35_Canonical_7Qm8v2N4x6K9p3R5s1T0';
const server={devices:new Map(),canonical:null,legacy:[],commits:0,conflicts:0,indexed:new Set()};

function json(route,status,data){return route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});}
function device(key){
 if(!server.devices.has(key))server.devices.set(key,{id:'eeeeeeee-eeee-4eee-8eee-'+String(server.devices.size+1).padStart(12,'0')});
 return server.devices.get(key);
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
  const expected=Number(body.p_expected_version)||0,current=server.canonical;
  if(current&&current.version!==expected){
   server.conflicts++;
   return json(route,200,{committed:false,conflict:true,version:current.version,
    contentSha256:current.hash,payload:current.payload,updatedAt:current.updatedAt});
  }
  if(!current&&expected!==0){server.conflicts++;return json(route,200,{committed:false,conflict:true,version:0});}
  if(current?.hash===body.p_content_sha256)
   return json(route,200,{committed:false,conflict:false,unchanged:true,version:current.version,contentSha256:current.hash});
  server.commits++;
  server.canonical={version:(current?.version||0)+1,hash:body.p_content_sha256,payload:body.p_payload,updatedAt:Date.now()};
  return json(route,200,{committed:true,conflict:false,version:server.canonical.version,contentSha256:server.canonical.hash});
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
  const P=await import('/platform/progress.js?v=pond-v34-20261021');
  const backup=P.exportRecords(),attempt={id:eventId,roundId:'round-'+eventId,correct:true,at};
  backup.platform.profiles[who].games[gameId]={
   records:{[questionId]:{best:10,seen:1,attempts:[attempt],firstAttempt:attempt}},
   round:null,finishedRounds:0,lastPlayed:at,completedRounds:[]
  };
  P.importRecords(backup);
 },{who,gameId,questionId,eventId,at});
}
async function has(page,who,gameId,questionId){
 return page.evaluate(async({who,gameId,questionId})=>{
  const P=await import('/platform/progress.js?v=pond-v34-20261021');
  return Boolean(P.gameProgress(gameId,who).records?.[questionId]);
 },{who,gameId,questionId});
}

try{
 const A=await makeContext(),B=await makeContext();
 await cloud(A.page,'pairFamily',[CODE]);await cloud(B.page,'pairFamily',[CODE]);

 const base=Date.now()-5000;
 await seed(A.page,'tae','growth-math-1','growth-math-1-01','attempt-v35-a',base);
 const a1=await cloud(A.page,'syncNow');
 assert.equal(a1.canonicalVersion,1);assert.equal(server.canonical.version,1);

 const b1=await cloud(B.page,'syncNow');
 const bHasMath=await has(B.page,'tae','growth-math-1','growth-math-1-01');
 assert.equal(b1.downloaded,true);assert.equal(bHasMath,true);

 // Both devices now branch offline from the same canonical version.
 await seed(A.page,'tae','growth-english-1','growth-english-1-01','attempt-v35-a2',base+1000);
 await seed(B.page,'tae','growth-korean-2','korean-growth-2-01','attempt-v35-b2',base+2000);
 const a2=await cloud(A.page,'syncNow');assert.equal(a2.canonicalVersion,2);
 const b2=await cloud(B.page,'syncNow');
 assert.equal(b2.conflictRetries>=0,true);
 assert.equal(server.canonical.version,3);
 assert.equal(await has(B.page,'tae','growth-math-1','growth-math-1-01'),true);
 assert.equal(await has(B.page,'tae','growth-english-1','growth-english-1-01'),true);
 assert.equal(await has(B.page,'tae','growth-korean-2','korean-growth-2-01'),true);

 const a3=await cloud(A.page,'syncNow');
 assert.equal(await has(A.page,'tae','growth-english-1','growth-english-1-01'),true);
 assert.equal(await has(A.page,'tae','growth-korean-2','korean-growth-2-01'),true);
 assert.equal(a3.canonicalVersion,server.canonical.version);

 const status=await A.page.evaluate(async()=>{const C=await import('/platform/cloud-sync.js?v=canonical-v35-20261023');return C.status();});
 assert.equal(status.sourceOfTruth,'supabase-family-canonical-v1');
 assert.equal(status.canonicalVersion,server.canonical.version);
 assert.equal(A.errors.length,0);assert.equal(B.errors.length,0);
 console.log(JSON.stringify({result:'PASS',canonicalVersion:server.canonical.version,commits:server.commits,
  conflicts:server.conflicts,deviceCount:server.devices.size,cases:[
   'device A creates canonical family state','device B inherits A','two offline branches merge without loss',
   'canonical version advances','device A later inherits B','Supabase canonical source reported'
  ]}));
 await A.ctx.close();await B.ctx.close();
}finally{await browser.close();}
