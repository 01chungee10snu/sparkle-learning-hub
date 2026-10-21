import assert from 'node:assert/strict';
import * as Pond from '../platform/pond-session.js';
import * as Resources from '../platform/resource-economy.js';
import * as Progress from '../platform/progress.js';
import * as IRT from '../platform/irt.js';

const catalog=['math','korean','english','hanja'].map(subject=>({
 id:'unit-'+subject,subject,kind:'quiz',status:'published',questionCount:30,
 questionIds:Array.from({length:30},(_,n)=>'q-'+subject+'-'+n)
}));
const emptyRecords=()=>({platform:{profiles:{tae:{games:{}},se:{games:{}}}}});
const fixture=()=>{
 const backing=new Map(),storage={getItem:k=>backing.get(k)??null,setItem:(k,v)=>backing.set(k,String(v)),removeItem:k=>backing.delete(k)};
 globalThis.localStorage=storage;Progress.configureCatalog(catalog);Resources.configure(catalog);Pond.configure(catalog);
 let clock=0,wall=Date.now()-86400000;
 return {storage,backing,clock:()=>clock,wall:()=>wall,advance:ms=>{clock+=ms;wall+=ms;},records:emptyRecords()};
};
const options=f=>({storage:f.storage,catalog,records:f.records,clock:f.clock,wall:f.wall,locks:null});
const current=(f,who)=>Pond.status(who,{storage:f.storage,catalog,nowWall:f.wall()});
const attempt=(f,who,subject,n,correct=false)=>{
 f.advance(10);
 return Pond.recordLearning(who,{gameId:'unit-'+subject,itemId:'q-'+subject+'-'+n,subject,correct,assisted:true,at:f.wall()},
  {storage:f.storage,catalog,nowWall:f.wall()});
};
const total=f=>who=>Resources.RESOURCE_SUBJECTS.reduce((n,s)=>n+Resources.wallet(catalog,who,f.storage).available[s],0);
const seed=(f,who)=>{for(const id of ['home','plaza','math','korean','english','hanja'])Resources.awardFirstVisit(id,who,f.storage);};
const tick=(f,visit,ms=1000)=>{f.advance(ms);return Pond.tickVisit(visit,{nowMono:f.clock(),nowWall:f.wall()});};

// No starting resources: complete varied, new attempts, including wrong/hinted
// answers. One subject alone, retries and existing old items cannot pay the gate.
{
 const f=fixture();
 const oldAt=f.wall()-1000;
 Pond.recordLearning('se',{gameId:'unit-math',itemId:'q-math-0',subject:'math',correct:true,at:oldAt},{storage:f.storage,catalog,nowWall:f.wall()});
 let status=current(f,'se');
 assert.equal(status.allowed,false);assert.equal(status.reason,'resources');
 assert.equal(status.learning.done,0);assert.equal(status.learning.total,3);assert.equal(status.learning.minSubjects,2);
 assert(!status.learning.neededSubjects.includes('hanja'));
 status=attempt(f,'se','math',0);assert.equal(status.learning.done,0,'Repeating an existing question is not fresh learning');
 status=attempt(f,'se','math',1);assert.equal(status.learning.done,1);
 status=attempt(f,'se','math',1,true);assert.equal(status.learning.done,1,'A retry cannot add participation');
 status=attempt(f,'se','math',2);assert.equal(status.allowed,false);
 status=attempt(f,'se','math',3);assert.equal(status.allowed,false,'Three items in one subject do not complete a mixed cycle');
 status=attempt(f,'se','korean',1);
 assert.equal(status.allowed,true);assert.equal(status.cycleId,'pond-1');assert.equal(status.justCompleted,true);
 assert.equal(status.completedLearning.done,4);assert.equal(status.completedLearning.total,3);assert.equal(status.completedCycleId,'pond-0');
 assert.equal(Pond.exportPond(f.storage).profiles.se.cycles['0'].consumedIds.length,4,'All credited participation is consumed, including extra items before subject balance is met');
 assert.equal(total(f)('se'),3,'Wrong and assisted attempts still provide enough resources for a full next visit');
 const awarded=Resources.exportResources();
 assert.equal(Object.keys(awarded.profiles.se.pondRefills).length,1);
 Pond.importPond(Pond.exportPond(f.storage),{storage:f.storage});Resources.importResources(awarded,f.storage);
 assert.equal(total(f)('se'),3,'Duplicate imports cannot duplicate participation resources');
 assert.equal(current(f,'tae').allowed,false,'Sibling resources and cycles stay separate');

 // Exact minute boundary, foreground pause and sleep gap. No catch-up billing.
 let visit=await Pond.openVisit('se',options(f));assert.equal(visit.allowed,true);
 for(let i=0;i<59;i++)tick(f,visit);
 assert.equal(visit.status.activeMs,59000);assert.equal(total(f)('se'),3);
 tick(f,visit);assert.equal(visit.status.activeMs,60000);assert.equal(total(f)('se'),2);
 Pond.pauseVisit(visit);f.advance(120000);Pond.tickVisit(visit,{active:false});
 assert.equal(current(f,'se').activeMs,60000);assert.equal(total(f)('se'),2);
 await Pond.resumeVisit(visit);tick(f,visit,20000);
 assert.equal(visit.status.activeMs,60000,'Long throttled or sleeping gaps are not active time');
 tick(f,visit);assert.equal(visit.status.activeMs,61000);
 const beforeReload=Pond.exportPond(f.storage);
 Pond.closeVisit(visit);visit=await Pond.openVisit('se',options(f));
 assert.equal(visit.status.activeMs,61000,'Closing and reopening preserves spent time');
 for(let i=0;i<119;i++)tick(f,visit);
 assert.equal(visit.status.activeMs,180000);assert.equal(visit.status.allowed,false);assert.equal(visit.status.reason,'time-limit');
 assert.equal(total(f)('se'),0);assert.equal(Object.keys(Resources.exportResources().profiles.se.pondCharges).length,3);
 Resources.importResources(awarded,f.storage);assert.equal(total(f)('se'),0,'Old resource snapshots cannot refund minute charges');
 assert.equal(Resources.spendPondMinute('pond-1',1,catalog,'se',f.storage).duplicate,true);
 Pond.importPond(beforeReload,{storage:f.storage});
 assert.equal(current(f,'se').activeMs,180000,'An older cloud snapshot cannot refund time');
 assert.equal(current(f,'se').allowed,false);
 const reopen=await Pond.openVisit('se',options(f));assert.equal(reopen.allowed,false);
 const baseline=current(f,'se').learning.done;
 attempt(f,'se','math',1,true);assert.equal(current(f,'se').learning.done,baseline,'Old items cannot reopen the next cycle');
}

// A completed cycle consumes the actual question identities, not only a time
// interval. Offline clocks and equal timestamps may overlap a later gate, but
// the old participation cannot grant another refill or reopen that gate.
{
 const f=fixture();current(f,'se');
 attempt(f,'se','math',0);attempt(f,'se','korean',0);attempt(f,'se','english',0);
 const completed=Pond.exportPond(f.storage),oldCycle=completed.profiles.se.cycles['0'];
 const consumed=['unit-english:q-english-0','unit-korean:q-korean-0','unit-math:q-math-0'];
 assert.deepEqual(oldCycle.consumedIds,consumed);
 const overlapping=structuredClone(completed),next=overlapping.profiles.se.cycles['1'];
 next.gate={...oldCycle.gate,reason:'time-limit'};
 next.visits['offline-time']={ms:180000,at:f.wall()};
 Pond.importPond(overlapping,{storage:f.storage});
 let result=current(f,'se');
 assert.equal(result.cycleId,'pond-1');assert.equal(result.allowed,false);
 assert.equal(result.learning.done,0,'Prior consumed IDs remain ineligible even when the later gate has an earlier timestamp');
 assert.equal(Object.keys(Resources.exportResources().profiles.se.pondRefills).length,1,'Overlapping time windows cannot double-award a completed set');
 Pond.importPond(completed,{storage:f.storage});
 assert.equal(current(f,'se').learning.done,0,'Repeated older snapshots cannot erase consumption receipts');
 result=attempt(f,'se','math',0,true);assert.equal(result.learning.done,0);
 attempt(f,'se','math',1);attempt(f,'se','korean',1);result=attempt(f,'se','english',1);
 assert.equal(result.cycleId,'pond-2');assert.equal(result.justCompleted,true);
 assert.deepEqual(Pond.exportPond(f.storage).profiles.se.cycles['1'].consumedIds,
  ['unit-english:q-english-1','unit-korean:q-korean-1','unit-math:q-math-1']);
}

// Legacy completion windows are migrated once from their own snapshot. The
// durable identity set then merges by union, including independent offline
// completions, without depending on merge order or losing older receipts.
{
 const f=fixture();current(f,'se');
 attempt(f,'se','math',0);attempt(f,'se','korean',0);attempt(f,'se','english',0);
 const original=Pond.exportPond(f.storage),legacy=structuredClone(original),p=legacy.profiles.se,c=p.cycles['0'];
 for(const cycle of Object.values(p.cycles))delete cycle.consumedIds;
 p.attempts['unit-math:q-math-5']={gameId:'unit-math',itemId:'q-math-5',subject:'math',at:c.gate.at-1};
 p.attempts['unit-math:q-math-6']={gameId:'unit-math',itemId:'q-math-6',subject:'math',at:c.completedAt+1};
 const migrated=Pond.validatePond(legacy);
 assert.deepEqual(migrated.profiles.se.cycles['0'].consumedIds,original.profiles.se.cycles['0'].consumedIds);
 assert.deepEqual(migrated.profiles.se.cycles['1'].consumedIds,[]);
 assert.deepEqual(Pond.validatePond(migrated),migrated,'Legacy consumption migration is idempotent');
 const a=structuredClone(original),b=structuredClone(original),d=structuredClone(original);
 a.profiles.se.cycles['0'].consumedIds=['unit-math:q-math-0'];
 b.profiles.se.cycles['0'].consumedIds=['unit-korean:q-korean-0'];
 d.profiles.se.cycles['0'].consumedIds=['unit-english:q-english-0'];
 const ab=Pond.mergePond(a,b);
 assert.deepEqual(ab,Pond.mergePond(b,a));assert.deepEqual(Pond.mergePond(ab,ab),ab);
 const abd=Pond.mergePond(ab,d);
 assert.deepEqual(abd,Pond.mergePond(a,Pond.mergePond(b,d)));
 assert.deepEqual(abd.profiles.se.cycles['0'].consumedIds,original.profiles.se.cycles['0'].consumedIds);
 assert.deepEqual(Pond.mergePond(Pond.mergePond(legacy,b),d),Pond.mergePond(legacy,Pond.mergePond(b,d)),'Legacy migration preserves associative identity receipt merges');
 const invalid=structuredClone(original);
 invalid.profiles.se.cycles['0'].consumedIds=['not-an-item-key'];assert.throws(()=>Pond.validatePond(invalid));
 invalid.profiles.se.cycles['0'].consumedIds=['unit-math:q-math-0','unit-math:q-math-0'];assert.throws(()=>Pond.validatePond(invalid));
 invalid.profiles.se.cycles['0'].consumedIds=[];
 invalid.profiles.se.cycles['1'].consumedIds=['unit-math:q-math-0'];assert.throws(()=>Pond.validatePond(invalid),'Only completed cycles may hold consumption receipts');
}

// Sub-second visits still accumulate. Repeatedly leaving before the next timer
// interval cannot provide free viewing, and paused wall time remains excluded.
{
 const f=fixture();seed(f,'se');
 let visit=await Pond.openVisit('se',options(f));
 f.advance(750);Pond.pauseVisit(visit);assert.equal(current(f,'se').activeMs,750);
 f.advance(120000);await Pond.resumeVisit(visit);f.advance(250);Pond.closeVisit(visit);
 assert.equal(current(f,'se').activeMs,1000);
 const starting=total(f)('se');
 for(let i=0;i<118;i++){
  visit=await Pond.openVisit('se',options(f));f.advance(500);Pond.closeVisit(visit);
 }
 assert.equal(current(f,'se').activeMs,60000);
 assert.equal(total(f)('se'),starting-1,'Minute costs survive a sequence of short visits');
}

// The 7-year-old profile has a five-minute cap and five fresh items from three
// subjects. First-visit resources do not themselves fulfil learning conditions.
{
 const f=fixture();seed(f,'tae');
 const visit=await Pond.openVisit('tae',options(f)),initial=total(f)('tae');
 assert.equal(visit.status.maxMs,300000);
 for(let i=0;i<300;i++)tick(f,visit);
 assert.equal(visit.status.allowed,false);assert.equal(total(f)('tae'),initial-5);
 attempt(f,'tae','math',0);attempt(f,'tae','math',1);attempt(f,'tae','korean',0);attempt(f,'tae','korean',1);
 assert.equal(current(f,'tae').allowed,false);
 const ready=attempt(f,'tae','english',0);
 assert.equal(ready.allowed,true);assert.equal(ready.cycleId,'pond-1');
 const award=Resources.exportResources().profiles.tae.pondRefills['pond-0'];
 assert.equal(Object.values(award.cost).reduce((n,v)=>n+v,0),0,'Already sufficient funds do not receive an unnecessary bonus');
 Pond.closeVisit(visit);
}

// Same-origin multi-tab fallback lease: only one active timer. Pausing releases
// ownership; an old runtime cannot continue charging after another tab takes it.
{
 const f=fixture();seed(f,'tae');
 const one=await Pond.openVisit('tae',{...options(f),ownerId:'tab-one'});
 const two=await Pond.openVisit('tae',{...options(f),ownerId:'tab-two'});
 assert.equal(one.allowed,true);assert.equal(two.allowed,false);assert.equal(two.status.reason,'another-tab');
 tick(f,one);assert.equal(current(f,'tae').activeMs,1000);
 Pond.pauseVisit(one);await Pond.resumeVisit(two);assert.equal(two.allowed,true);
 tick(f,two);assert.equal(current(f,'tae').activeMs,2000);
 await Pond.resumeVisit(one);assert.equal(one.allowed,false);
 assert.equal(current(f,'tae').activeMs,2000);
 Pond.closeVisit(one);Pond.closeVisit(two);
}

// Native Web Locks path, including a fast pause/resume and denial without
// stealing the lock. The lease remains a fallback for browsers without Locks.
{
 const f=fixture();seed(f,'tae');const held=new Set();
 const locks={request:async(name,_options,callback)=>{
  if(held.has(name))return callback(null);
  held.add(name);try{return await callback({name});}finally{held.delete(name);}
 }};
 const visit=await Pond.openVisit('tae',{...options(f),locks});
 const other=await Pond.openVisit('tae',{...options(f),locks});
 assert.equal(visit.allowed,true);assert.equal(other.allowed,false);
 Pond.pauseVisit(visit);await Pond.resumeVisit(visit);assert.equal(visit.allowed,true);
 await Pond.resumeVisit(visit);assert.equal(visit.allowed,true,'Repeated resume does not deadlock on its own Web Lock');
 Pond.closeVisit(visit);await visit._lockTask;
 assert.equal(held.size,0);
}

// Ledger merge laws: duplicate per-visit counters use max, different visits add,
// consumed time is bounded, and a completed cycle does not disappear on merge.
{
 const f=fixture();seed(f,'tae');const visit=await Pond.openVisit('tae',options(f));tick(f,visit);
 const a=Pond.exportPond(f.storage),b=structuredClone(a);
 b.profiles.tae.cycles['0'].visits[visit.id].ms=4000;
 b.profiles.tae.cycles['0'].visits['remote-visit']={ms:10000,at:f.wall()};
 const ab=Pond.mergePond(a,b),ba=Pond.mergePond(b,a);
 assert.deepEqual(ab,ba);assert.deepEqual(Pond.mergePond(ab,ab),ab);
 Pond.importPond(ab,{storage:f.storage});assert.equal(current(f,'tae').activeMs,14000);
 const c=structuredClone(a);c.profiles.tae.cycles['0'].visits['offline-other']={ms:300000,at:f.wall()};
 assert.deepEqual(Pond.mergePond(Pond.mergePond(a,b),c),Pond.mergePond(a,Pond.mergePond(b,c)));
 Pond.importPond(c,{storage:f.storage});assert.equal(current(f,'tae').activeMs,300000);
 Pond.closeVisit(visit);
}

// Submission recovery from Progress uses immutable first exposure and does not
// require correctness, while a truncated legacy log cannot turn a retry fresh.
{
 const f=fixture();current(f,'se');f.advance(100);
 const records=emptyRecords();
 records.platform.profiles.se.games={
  'unit-math':{records:{'q-math-1':{seen:1,firstAttempt:{correct:false,assisted:true,at:f.wall()},attempts:[]},
   'q-math-2':{seen:5,attempts:[{correct:true,at:f.wall()}]}}},
  'unit-korean':{records:{'q-korean-1':{seen:1,attempts:[{correct:false,at:f.wall()}]},'q-korean-2':{seen:1,firstAttempt:{correct:false,at:f.wall()},attempts:[]}}}
 };
 const result=Pond.refreshLearning('se',{records,storage:f.storage,catalog,nowWall:f.wall()});
 assert.equal(result.allowed,true);
 const attempted=Pond.exportPond(f.storage).profiles.se.attempts;
 assert.equal(Object.keys(attempted).length,4);
 assert.equal(attempted['unit-math:q-math-2'].legacySeen,true);
 assert.equal(attempted['unit-math:q-math-2'].at,0,'Unknown first exposure is a non-crediting tombstone, not a fabricated recent attempt');
 const invalid=structuredClone(Pond.exportPond(f.storage));invalid.profiles.se.cycles['0'].visits.bad={ms:-1,at:f.wall()};
 assert.throws(()=>Pond.validatePond(invalid));
 const resourceInvalid=Resources.exportResources();
 resourceInvalid.profiles.se.pondCharges['pond-0:5']={id:'pond-0:5',at:Date.now(),cost:{math:1,korean:0,english:0,hanja:0}};
 assert.throws(()=>Resources.importResources(resourceInvalid,f.storage));
}

// The gate only counts the same age/stage pool available to the question guide,
// excluding higher grades, non-foundation Hanja and higher item stages.
{
 const f=fixture();
 const pool=[
  {id:'growth-math-1',subject:'math',stage:1,ids:['math-low','math-high']},
  {id:'korean-low',subject:'korean',stage:1,ids:['korean-one']},
  {id:'english-upper',subject:'english',stage:3,ids:['english-one']},
  {id:'bebsu-g4-generated',subject:'math',gradeBand:'G4',ids:['math-grade-four']},
  {id:'hanja-h7',subject:'hanja',ids:['hanja-grade-seven']}
 ].map(g=>({...g,kind:'quiz',status:'published',questionIds:g.ids,questionCount:g.ids.length}));
 const items=pool.flatMap(g=>g.ids.map(id=>({gameId:g.id,id,subject:g.subject,stage:id==='math-high'?3:1,b:-2,c:0,skill:g.subject})));
 IRT.configureBank({version:1,items});Progress.configureCatalog(pool);Pond.configure(pool);
 const result=Pond.status('se',{storage:f.storage,catalog:pool,nowWall:f.wall()});
 assert.deepEqual(result.eligibleSubjects,['math','korean']);
 assert.deepEqual(result.availableItemCounts,{math:1,korean:1,english:0});
 assert.equal(result.learning.total,2,'A genuinely smaller remaining pool receives a finishable count');
 assert.equal(result.learning.minSubjects,2);
 assert.equal(result.learningContentAvailable,true);
}

console.log('PASS_POND_SESSION: real-time minute charges, age limits, wrong/hinted varied participation, fresh-item and completed-cycle dedupe, resource top-ups, pause/sleep/reload, sibling isolation, native/fallback tab ownership, immutable snapshot merges, legacy consumption migration, first-exposure recovery');
