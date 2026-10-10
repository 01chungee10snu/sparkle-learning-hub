import assert from 'node:assert/strict';

// Failure injection exercises public transitions against the persisted ledger.
// None of these fixtures assign earned-star totals or replace the IRT engine.
const store=new Map();let failRead=false,failWrite=false,reads=0,onRead=null;
globalThis.localStorage={
 getItem(key){if(failRead)throw new Error('blocked read');if(key==='sparkle-rewards-v1'){reads++;onRead?.(reads);}return store.get(key)??null;},
 setItem(key,value){if(failWrite)throw new Error('blocked write');store.set(key,String(value));},
 removeItem(key){store.delete(key);}
};
const P=await import('../platform/progress.js');
let importId=0;const fresh=()=>import('../platform/rewards.js?integrity='+ ++importId);
const originalNow=Date.now;let now=1790000000000;Date.now=()=>++now;
const catalog=['math','korean'].map(subject=>({
 id:'integrity-'+subject,kind:'quiz',status:'published',subject,
 questionIds:Array.from({length:12},(_,i)=>'q-'+subject+'-'+(i+1))
}));
const game=subject=>({...catalog.find(g=>g.subject===subject),questions:catalog.find(g=>g.subject===subject).questionIds.map(id=>({id,choices:['yes','no','other'],answer:0}))});
P.configureCatalog(catalog);
function reset(){store.clear();failRead=false;failWrite=false;onRead=null;P.selectLearner('tae');}
function finish(subject){const g=game(subject),r=P.beginRound(g);for(const id of r.ids){P.answerQuestion(g,0);P.nextQuestion(g.id);}return P.gameProgress(g.id,'tae').round;}
try{
 reset();let R=await fresh();
 const empty={format:'sparkle-rewards-backup',version:1,state:{version:1,profiles:{tae:{events:{},purchases:{},equipped:null,outfit:{}},se:{events:{},purchases:{},equipped:null,outfit:{}}}}};
 assert.throws(()=>R.importRewards(empty),/놀이 목록/,'No catalog means no unverified wallet import');
 assert.equal(store.has(R.REWARDS_KEY),false);
 R.syncRewards(catalog,'tae');
 const g=game('math'),r=P.beginRound(g),q=r.ids[0],unseen=g.questions.find(x=>!r.ids.includes(x.id)).id;
 assert.equal(R.recordEffort({who:'tae',eventId:'current-help',kind:'hint',gameId:g.id,questionId:q}).earned,1);
 const before=JSON.stringify(R.exportRewards());
 assert.throws(()=>R.recordEffort({who:'tae',eventId:'unseen-help',kind:'hint',gameId:g.id,questionId:unseen}));
 assert.throws(()=>R.recordEffort({who:'tae',eventId:'unanswered-practice',kind:'retry',gameId:g.id,questionId:q}));
 assert.equal(JSON.stringify(R.exportRewards()),before,'No fake effort mutation');
 const completed=finish('math');R.syncRewards(catalog,'tae');
 const purchase=R.purchaseReward('trail-stars',catalog,'tae');assert.equal(purchase.ok,true);
 assert.equal(R.purchaseReward('trail-stars',catalog,'tae').duplicate,true);
 assert.equal(R.wallet(catalog,'tae').spent,30);
 store.delete(R.REWARDS_KEY);
 assert.equal(R.wallet(catalog,'tae').spent,0,'Cleared durable key cannot resurrect old in-memory receipts');
 assert.equal(R.wallet(catalog,'se').lifetime,0);

 // A failed write must not publish ownership or spendable balance in memory.
 R=await fresh();R.syncRewards(catalog,'tae');
 const originalLedger=store.get(R.REWARDS_KEY),originalWallet=R.wallet(catalog,'tae');
 failWrite=true;
 const blocked=R.purchaseReward('trail-stars',catalog,'tae');
 assert.equal(blocked.ok,false);assert.equal(blocked.reason,'storage-unavailable');
 assert.equal(R.wallet(catalog,'tae').spent,originalWallet.spent);
 assert.equal(R.wallet(catalog,'tae').items.find(i=>i.id==='trail-stars').owned,false);
 assert.equal(R.rewardStorageAvailable(),false,'Successful reads do not hide a failed write');
 assert.equal(store.get(R.REWARDS_KEY),originalLedger);
 assert.throws(()=>R.importRewards({format:'sparkle-rewards-backup',version:1,state:JSON.parse(originalLedger)}),/저장할/,'Failed backup restore cannot claim a committed ledger');
 assert.equal(store.get(R.REWARDS_KEY),originalLedger);
 failWrite=false;assert.equal(R.purchaseReward('trail-stars',catalog,'tae').ok,true,'Purchase can retry once storage really works');

 // Simulate another tab committing a different purchase between the balance
 // read and the final save. The final merge must reject an unfunded union.
 reset();R=await fresh();finish('math');R.syncRewards(catalog,'tae');
 const durable=R.exportRewards(),other=structuredClone(durable.state);
 other.profiles.tae.purchases['cosmetic-halo']={id:'cosmetic-halo',rewardId:'halo',cost:60,at:now};
 // This tab has 53 stars, so use a valid 40-star family request instead.
 delete other.profiles.tae.purchases['cosmetic-halo'];
 other.profiles.tae.purchases['request-story-1']={id:'request-story-1',rewardId:'story',cost:40,at:now};
 const history=[];
 onRead=n=>{history.push(n);if(new Error().stack.includes('at save (')){store.set(R.REWARDS_KEY,JSON.stringify(other));onRead=null;}};
 const conflict=R.purchaseReward('trail-stars',catalog,'tae');
 assert.equal(conflict.ok,false);assert.equal(conflict.reason,'balance-changed');
 assert.ok(history.length>0);
 assert.equal(R.wallet(catalog,'tae').spent,40);
 assert.equal(R.wallet(catalog,'tae').available,13);
 assert.equal(R.wallet(catalog,'tae').items.find(i=>i.id==='trail-stars').owned,false);

 // Real completed rounds with the same imported ID remain separate by game.
 reset();R=await fresh();const a=finish('math');now+=86400000;finish('korean');
 const progress=JSON.parse(store.get(P.KEY)),k=progress.profiles.tae.games['integrity-korean'];
 k.completedRounds[0].id=a.id;store.set(P.KEY,JSON.stringify(progress));
 const w=R.syncRewards(catalog,'tae');
 assert.equal(w.effortStars,6,'Two dated game completions retain both credits');
 let backup=R.exportRewards(),events=backup.state.profiles.tae.events;
 const firstKey=Object.keys(events).find(id=>events[id].gameId==='integrity-math');
 events['session-'+a.id]={...events[firstKey],id:'session-'+a.id};delete events[firstKey];
 store.set(R.REWARDS_KEY,JSON.stringify(backup.state));
 assert.equal(R.syncRewards(catalog,'tae').effortStars,6,'Migration does not award old sessions again');
 assert.equal(Object.keys(R.exportRewards().state.profiles.tae.events).length,2);
 backup=R.exportRewards();const snapshot=store.get(R.REWARDS_KEY);
 const forged=structuredClone(backup);
 forged.state.profiles.tae.events['forged-session']={id:'forged-session',kind:'session',gameId:'integrity-math',roundId:'round-never-played',at:now};
 assert.throws(()=>R.importRewards(forged),/완료한 학습 회차/);
 const falseTime=structuredClone(backup);Object.values(falseTime.state.profiles.tae.events)[0].at++;
 assert.throws(()=>R.importRewards(falseTime),/시간/);
 const sibling=structuredClone(backup);
 sibling.state.profiles.se.events['sibling-help']={id:'sibling-help',kind:'hint',gameId:'integrity-math',questionId:a.ids[0],at:now};
 assert.throws(()=>R.importRewards(sibling),/학습 기록/);
 assert.equal(store.get(R.REWARDS_KEY),snapshot,'All rejected imports are atomic');

 const V=await import('../village/village-state.js?integrity');
 let v=V.emptyVillage();
 v=V.addVillageCompletion(v,{who:'tae',gameId:'a_b',roundId:'c'}).state;
 v=V.addVillageCompletion(v,{who:'tae',gameId:'a',roundId:'b_c'}).state;
 assert.equal(V.villageSummary(v,'tae').flowers,2,'Tuple IDs cannot collide on underscore concatenation');
 const longEvent={who:'se',gameId:'g'.repeat(128),roundId:'r'.repeat(128)};
 v=V.addVillageCompletion(v,longEvent).state;
 assert.equal(V.addVillageCompletion(v,longEvent).added,false);
 assert.equal(V.saveVillage(v),true);
 assert.equal(V.villageSummary(V.loadVillage(),'se').flowers,1,'Maximum valid source IDs survive sanitization');
 const legacy=V.emptyVillage();legacy.profiles.tae.events['snack-count_round-1']=true;legacy.family.events['forged-family-only']=true;
 const clean=V.cleanVillage(legacy);
 assert.equal(V.villageSummary(clean,'tae').familyFlowers,1,'Shared plaza follows actual profile events');
 assert.equal(V.addVillageCompletion(clean,{who:'tae',gameId:'snack-count',roundId:'round-1'}).added,false,'Legacy village receipt remains idempotent');
 assert.equal(V.saveVillage(clean),true);
 const grown=V.addVillageCompletion(V.loadVillage(),{who:'se',gameId:'snack-count',roundId:'round-2'}).state;
 failWrite=true;assert.equal(V.saveVillage(grown),false);
 failWrite=false;
 assert.equal(V.villageSummary(V.loadVillage(),'se').flowers,2,'Unsaved personal flowers survive read recovery alongside older durable sibling records');
 assert.equal(V.saveVillage(V.loadVillage()),true);
 const reloaded=await import('../village/village-state.js?reload-integrity');
 assert.equal(reloaded.villageSummary(reloaded.loadVillage(),'se').flowers,2);
 assert.equal(V.saveVillage(V.emptyVillage(),null),false,'Missing storage cannot report success');
 console.log('PASS: verified effort; no unconfigured imports; cleared-wallet memory; purchase write failure rollback and recovery; concurrent spend merge; game-round identity migration; forged receipt and sibling import atomicity; collision-free/long village IDs; derived family plaza; offline village persistence.');
}finally{Date.now=originalNow;}
