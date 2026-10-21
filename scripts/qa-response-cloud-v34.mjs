#!/usr/bin/env node
/** End-to-end test against the already linked Supabase project.
 * Creates only a NEW synthetic family, submits three synthetic events from a
 * fresh browser, verifies only that family's counts, then deletes it by both
 * its random ID and exact name. No credentials/UUIDs are logged or written.
 *
 * Required: SUPABASE_WORKDIR=/absolute/path/to/the/linked/project
 * Optional: SUPABASE_BIN, PLAYWRIGHT_MODULE, CHROME_PATH
 * SQL goes through stdin; generated credentials stay in captured stdout memory.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {CLOUD_CONFIG} from '../platform/cloud-config.js';

const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const require=createRequire(import.meta.url);
const expectedProject=CLOUD_CONFIG.projectRef;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
let stage='project_guard',failureStage='',cleanupVerified=false,fixtureAttempted=false;
let server,browser,context,fixture,workdir;
// Allocate the cleanup identity before any network call. A timeout after a
// committed setup can therefore still be cleaned up without printing an ID.
const familyId=randomUUID();
const familyName='Synthetic response cloud QA v34 '+randomUUID().slice(0,8);
const sqlString=value=>"'"+String(value).replaceAll("'","''")+"'";
const ensure=(condition,label)=>{if(!condition)throw Error(label);};
const metrics={createdEvents:0,uploaded:0,pending:0,retained:0,repeatUploaded:0,databaseEvents:0};

function query(sql,label){
 let output;
 try{
  output=execFileSync(process.env.SUPABASE_BIN||'supabase',
   ['db','query','--linked','--file','/dev/stdin','--output','json','--workdir',workdir],
   {input:sql,encoding:'utf8',timeout:25000,maxBuffer:2*1024*1024,stdio:['pipe','pipe','pipe']});
 }catch{throw Error(label+' query failed');}
 try{
  const rows=JSON.parse(output.trim());
  ensure(Array.isArray(rows),label+' result format');
  return rows;
 }catch{throw Error(label+' result format');}
}

try{
 ensure(typeof process.env.SUPABASE_WORKDIR==='string'&&path.isAbsolute(process.env.SUPABASE_WORKDIR),'linked workdir required');
 workdir=await fs.realpath(process.env.SUPABASE_WORKDIR);
 // Supabase normally keeps .temp below supabase/. Accept a workdir that already
 // points at that directory as well, but reject every conflicting ref found.
 let refs=[];
 for(const relative of ['supabase/.temp/project-ref','.temp/project-ref']){
  try{refs.push((await fs.readFile(path.join(workdir,relative),'utf8')).trim());}
  catch(e){if(e.code!=='ENOENT')throw Error('project ref unreadable');}
 }
 ensure(refs.length>0&&refs.every(ref=>ref===expectedProject),'linked project mismatch');
 ensure(new URL(CLOUD_CONFIG.url).hostname===expectedProject+'.supabase.co','configured endpoint mismatch');

 stage='browser_setup';
 let playwright;
 if(process.env.PLAYWRIGHT_MODULE)playwright=await import(process.env.PLAYWRIGHT_MODULE);
 else {try{playwright=require('playwright');}catch{playwright=await import('/Users/01chungee10/Library/Caches/ms-playwright-go/1.57.0/package/index.js');}}
 const {chromium}=playwright.chromium?playwright:playwright.default;
 server=http.createServer(async(req,res)=>{try{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/__response_cloud_qa'){
   res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Synthetic response cloud test</title>');return;
  }
  const p=path.resolve(root,'.'+pathname);if(!p.startsWith(root+'/'))throw Error('outside root');
  res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.json')?'application/json':'text/plain');
  res.end(await fs.readFile(p));
 }catch{res.writeHead(404);res.end();}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 const origin=`http://127.0.0.1:${server.address().port}`;
 const executablePath=process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined);
 browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{})});
 context=await browser.newContext();
 const cloudOrigin=new URL(CLOUD_CONFIG.url).origin;
 await context.route('**/*',route=>{
  const url=new URL(route.request().url());
  if(url.origin===origin||(url.origin===cloudOrigin&&url.pathname==='/rest/v1/rpc/magic_family_append_responses'))return route.continue();
  return route.abort();
 });
 const page=await context.newPage();
 await page.goto(origin+'/__response_cloud_qa',{waitUntil:'domcontentloaded',timeout:15000});

 stage='synthetic_family_setup';fixtureAttempted=true;
 const setup=query(`
 WITH seed AS MATERIALIZED (
   SELECT replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','') AS code
 ), family AS (
   INSERT INTO public.magic_families(id,name)
   VALUES(${sqlString(familyId)}::uuid,${sqlString(familyName)}) RETURNING id
 ), pairing AS (
   INSERT INTO magic_private.magic_family_pairing_keys(family_id,code_hash)
   SELECT f.id,extensions.digest(s.code,'sha256') FROM family f CROSS JOIN seed s
   RETURNING family_id
 ), learners AS (
   INSERT INTO public.magic_learners(family_id,learner_key,display_name)
   SELECT f.id,v.learner_key,v.display_name FROM family f
   CROSS JOIN (VALUES('tae','Synthetic learner A'),('se','Synthetic learner B')) AS v(learner_key,display_name)
   RETURNING id,family_id,learner_key
 )
 SELECT jsonb_build_object('familyId',f.id,'code',s.code,
   'learners',(SELECT jsonb_object_agg(learner_key,id) FROM learners),
   'pairingCreated',(SELECT count(*) FROM pairing)) AS fixture
 FROM family f CROSS JOIN seed s;
 `,'synthetic setup');
 fixture=setup[0]?.fixture;
 ensure(fixture?.familyId===familyId&&UUID.test(fixture.learners?.tae||'')&&UUID.test(fixture.learners?.se||'')&&
  /^[a-f0-9]{64}$/.test(fixture.code||'')&&Number(fixture.pairingCreated)===1,'synthetic fixture verification');

 stage='browser_event_creation';
 const created=await page.evaluate(async()=>{
  const P=await import('/platform/progress.js'),L=await import('/platform/response-log.js');
  const catalog=await fetch('/games/catalog.json').then(r=>r.json()),bank=await fetch('/games/irt-bank.json').then(r=>r.json());
  P.configureCatalog(catalog);P.configureIrtBank(bank);P.selectLearner('se');
  const game=await fetch('/games/growth-math-1/game.json').then(r=>r.json());
  const q=game.questions.find(q=>Array.isArray(q.choices)&&Number.isInteger(q.answer)&&q.choices.length>1);
  if(!q)throw Error('synthetic question unavailable');
  const session='cloud-qa-'+crypto.randomUUID(),shownAt=Date.now()-500;
  const answer=P.answerGuidedQuestion(game,q.id,(q.answer+1)%q.choices.length,{sessionId:session,shownAt});
  if(answer.correct!==false)throw Error('expected synthetic incorrect response');
  P.recordGuidedHint(game,q.id,{sessionId:session,shownAt});
  P.recordPracticeRetry(game,q.id,q.answer,{sessionId:session,shownAt});
  await L.drainJournal();await L.drainJournal();
  const rows=await L.exportEvents(),pending=await L.pendingEvents();
  return {total:rows.length,pending:pending.length,types:rows.map(r=>r.event.eventType).sort(),
    incorrect:rows.filter(r=>r.event.eventType==='answer'&&r.event.isCorrect===false).length};
 });
 ensure(created.total===3&&created.pending===3&&created.incorrect===1&&created.types.join(',')==='answer,hint,retry','three synthetic events required');
 metrics.createdEvents=created.total;

 stage='browser_supabase_upload';
 const uploaded=await page.evaluate(async code=>{
  const C=await import('/platform/cloud-sync.js'),L=await import('/platform/response-log.js');
  const first=await C.syncResponseHistory(code),second=await C.syncResponseHistory(code);
  return {uploaded:first.uploaded,firstPending:first.pending,repeatUploaded:second.uploaded,
   repeatPending:second.pending,pending:(await L.pendingEvents()).length,total:(await L.exportEvents()).length};
 },fixture.code);
 ensure(uploaded.uploaded===3&&uploaded.firstPending===false&&uploaded.repeatUploaded===0&&
  uploaded.repeatPending===false&&uploaded.pending===0&&uploaded.total===3,'cloud upload and exact acknowledgement');
 Object.assign(metrics,{uploaded:uploaded.uploaded,pending:uploaded.pending,retained:uploaded.total,repeatUploaded:uploaded.repeatUploaded});

 stage='synthetic_database_counts';
 const counts=query(`
 SELECT jsonb_build_object(
   'total',count(*),'answers',count(*) FILTER(WHERE e.event_type='answer'),
   'incorrect',count(*) FILTER(WHERE e.event_type='answer' AND e.correct=false),
   'hints',count(*) FILTER(WHERE e.event_type='hint' AND e.correct IS NULL),
   'retries',count(*) FILTER(WHERE e.event_type='retry'),
   'tae',count(*) FILTER(WHERE l.learner_key='tae'),'se',count(*) FILTER(WHERE l.learner_key='se')
 ) AS counts
 FROM public.magic_response_events e JOIN public.magic_learners l ON l.id=e.learner_id
 WHERE l.family_id=${sqlString(familyId)}::uuid
   AND l.id IN (${sqlString(fixture.learners.tae)}::uuid,${sqlString(fixture.learners.se)}::uuid);
 `,'synthetic count')[0]?.counts;
 ensure(counts&&Number(counts.total)===3&&Number(counts.answers)===1&&Number(counts.incorrect)===1&&
  Number(counts.hints)===1&&Number(counts.retries)===1&&Number(counts.tae)===0&&Number(counts.se)===3,'database counts mismatch');
 metrics.databaseEvents=Number(counts.total);
}catch{
 failureStage=stage;
}finally{
 if(fixtureAttempted&&workdir){
  stage='synthetic_cleanup';
  try{
   query(`WITH removed AS (
     DELETE FROM public.magic_families WHERE id=${sqlString(familyId)}::uuid AND name=${sqlString(familyName)} RETURNING id
   ) SELECT count(*)::integer AS deleted FROM removed;`,'synthetic cleanup');
   const row=query(`SELECT count(*)::integer AS remaining FROM public.magic_families
     WHERE id=${sqlString(familyId)}::uuid;`,'cleanup verification')[0];
   cleanupVerified=Number(row?.remaining)===0;
   if(!cleanupVerified&&!failureStage)failureStage=stage;
  }catch{if(!failureStage)failureStage=stage;}
 }
 // Never serialize the captured fixture or the browser's evaluate argument.
 fixture=null;
 try{await context?.close();}catch{if(!failureStage)failureStage='browser_cleanup';}
 try{await browser?.close();}catch{if(!failureStage)failureStage='browser_cleanup';}
 if(server?.listening)await new Promise(resolve=>server.close(resolve));
}
if(!failureStage&&cleanupVerified){
 console.log(JSON.stringify({result:'PASS',tests:['linked project guard','fresh browser synthetic responses','browser to Supabase RPC',
  'exact event acknowledgement','no duplicate upload','synthetic database counts','synthetic family cascade cleanup'],...metrics,cleanupVerified:true}));
}else{
 console.log(JSON.stringify({result:'FAIL',stage:failureStage||'cleanup_unverified',cleanupVerified,syntheticFixtureAttempted:fixtureAttempted}));
 process.exitCode=1;
}
