import assert from 'node:assert/strict';

// Use real progress transitions and persisted backups to exercise the reward
// boundary, rather than manufacturing reward totals that mirror the module.
const storage=new Map();let blocked=false,writes=0;
globalThis.localStorage={
 getItem(key){if(blocked)throw new Error('Storage blocked');return storage.get(key)??null;},
 setItem(key,value){if(blocked)throw new Error('Storage blocked');writes++;storage.set(key,String(value));}
};
const P=await import('../platform/progress.js');
let imports=0;const fresh=()=>import(`../platform/rewards.js?check=${++imports}`);
const originalNow=Date.now;let now=1780000000000;Date.now=()=>++now;
const catalog=['math','korean','english'].map(subject=>({id:`reward-${subject}`,kind:'quiz',status:'published',subject,questionIds:Array.from({length:12},(_,index)=>`q-${subject}-${index+1}`)}));
catalog.push({id:'unit-garden',kind:'external',status:'published',subject:'math',progressAdapter:'unit-garden-v1'});
P.configureCatalog(catalog);
const quiz=(subject='math',size=5)=>({...catalog.find(entry=>entry.subject===subject&&entry.kind==='quiz'),questions:catalog.find(entry=>entry.subject===subject&&entry.kind==='quiz').questionIds.slice(0,size).map(id=>({id,choices:['yes','no','other'],answer:0}))});
const play=(game,correct=true)=>{
 const round=P.beginRound(game);
 for(let index=0;index<round.ids.length;index++){P.answerQuestion(game,correct?0:1);P.nextQuestion(game.id);}
 return P.gameProgress(game.id).round;
};
function reset(){
 storage.clear();storage.set(P.KEY,JSON.stringify({version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}}));P.selectLearner('tae');
}

try{
 reset();let R=await fresh();
 storage.set(P.LEGACY_KEY,JSON.stringify({version:1,selected:'tae',profiles:{tae:{records:{'length-01':{best:10},'weight-01':{best:10}},sessions:2},se:{records:{'length-01':{best:2}},sessions:1}}}));
 assert.equal(R.syncRewards(catalog,'tae').lifetime,20,'Existing unit-garden stars are immediately spendable, without copying or deleting them');
 assert.equal(R.wallet(catalog,'se').lifetime,2,'Sibling legacy stars remain isolated');
 assert.equal(P.summary(catalog,'tae').stars,20);
 assert.equal(R.wallet(catalog,'tae').badges.find(b=>b.id==='two-days').unlocked,false,'Legacy star totals do not invent timestamped correctness');
 const emptyBackup=R.exportRewards();
 const beforeStorage=storage.get(P.LEGACY_KEY);
 const first=play(quiz('math'));
 let w=R.syncRewards(catalog,'tae');assert.equal(w.learningStars,70);assert.equal(w.effortStars,3);assert.equal(w.badges[0].unlocked,true);
 assert.equal(storage.get(P.LEGACY_KEY),beforeStorage,'Rewards never rewrite legacy learning records');
 assert.equal(R.recordEffort({who:'tae',eventId:'reflection-first',kind:'reflection',gameId:'reward-math',roundId:first.id}).earned,0,'Reflection cannot double the completed-round award');
 play(quiz('math'));assert.equal(R.syncRewards(catalog,'tae').effortStars,3,'Multiple same-day rounds share a three-star effort cap');

 const questionId='q-math-1';
 assert.equal(R.recordEffort({who:'tae',eventId:'hint-one',kind:'hint',gameId:'reward-math',questionId}).earned,1);
 assert.equal(R.recordEffort({who:'tae',eventId:'hint-one',kind:'hint',gameId:'reward-math',questionId}).earned,0,'Double event submission has no extra credit');
 assert.equal(R.recordEffort({who:'tae',eventId:'retry-two',kind:'retry',gameId:'reward-math',questionId}).earned,1);
 assert.equal(R.recordEffort({who:'tae',eventId:'hint-three',kind:'hint',gameId:'reward-math',questionId}).earned,0,'Hint and retry combined stop at two stars per question for life');
 assert.equal(R.wallet(catalog,'se').effortStars,0,'Effort credit never crosses profiles');

 const cosmetic=R.purchaseReward('trail-stars',catalog,'tae');assert.equal(cosmetic.ok,true);assert.equal(cosmetic.wallet.spent,30);assert.equal(cosmetic.wallet.equipped,'trail-stars');
 assert.equal(R.purchaseReward('trail-stars',catalog,'tae').duplicate,true);assert.equal(R.wallet(catalog,'tae').spent,30);
 assert.equal(R.purchaseReward('comet',catalog,'tae').ok,false,'An unaffordable request cannot create a receipt');
 assert.equal(R.wallet(catalog,'tae').available,45);
 const story=R.purchaseReward('story',catalog,'tae');assert.equal(story.ok,true);assert.equal(story.purchase.id,'request-story-1');assert.equal(story.purchase.completedAt,undefined,'Buying a coupon creates a request, never a completed activity');
 assert.equal(R.purchaseReward('story',catalog,'tae').duplicate,true,'Only one pending request per family activity');
 assert.equal(R.wallet(catalog,'tae').spent,70);assert.equal(R.wallet(catalog,'tae').available,5);
 assert.equal(R.wallet(catalog,'se').spent,0);assert.throws(()=>R.equipReward('trail-stars','se'));
 const lateBackup=R.exportRewards();R.importRewards(emptyBackup);assert.equal(R.wallet(catalog,'tae').spent,70,'Old backup cannot restore spent stars');
 const exported=R.exportRewards();R.importRewards(exported);R.importRewards(exported);assert.deepEqual(R.exportRewards(),exported,'Repeated backup imports do not duplicate earned events or purchases');
 const done=R.completeFamilyReward(story.purchase.id,'tae');assert.equal(typeof done.completedAt,'number');assert.equal(R.completeFamilyReward(story.purchase.id,'tae').completedAt,done.completedAt,'Repeated parent completion is idempotent');
 R.importRewards(lateBackup);assert.equal(R.wallet(catalog,'tae').requests[0].completedAt,done.completedAt,'Old backup cannot undo parent completion');
 R.equipReward(null,'tae');R.importRewards(lateBackup);assert.equal(R.wallet(catalog,'tae').equipped,null,'Older equipment backup cannot undo a newer removal');

 now+=86400000;play(quiz('math'),false);play(quiz('math'),true);play(quiz('korean'));play(quiz('english'));
 w=R.syncRewards(catalog,'tae');assert.equal(w.effortStars,8,'A later date adds only three round stars, alongside the lifetime question cap');
 assert.equal(w.badges.find(b=>b.id==='try-again').unlocked,true,'Retry badge follows actual wrong-then-correct attempts');
 assert.equal(w.badges.find(b=>b.id==='two-days').unlocked,true,'Correct attempts on two dates certify the return badge');
 assert.equal(w.badges.find(b=>b.id==='three-subjects').unlocked,true);
 assert.equal(R.purchaseReward('story',catalog,'tae').purchase.id,'request-story-2','A new family request is available after explicit completion and sufficient stars');

 // Invalid imports are atomic and cannot mint unknown rewards or negative costs.
 const valid=R.exportRewards(),unchanged=storage.get(R.REWARDS_KEY);
 const corruptions=[
  b=>{b.state.profiles.tae.purchases['cosmetic-trail-stars'].cost=-30;},
  b=>{b.state.profiles.tae.purchases['cosmetic-trail-stars'].cost=1;},
  b=>{b.state.profiles.tae.events.injected={id:'injected',kind:'hint',gameId:'unknown-game',questionId:'unknown-question',at:now};},
  b=>{b.state.profiles.tae.events.injected={id:'injected',kind:'hint',gameId:'reward-math',questionId:'unknown-question',at:now};},
  b=>{b.state.profiles.tae.equipped={id:'comet',at:now};},
  b=>{b.state.profiles.tae.purchases['request-story-1'].completedAt=undefined;},
  b=>{b.state.profiles.tae.purchases['request-story-2'].completedAt=-1;},
  b=>{b.state.profiles.se=null;},
  b=>{b.state.profiles.tae.events.constructor={id:'constructor',kind:'hint',gameId:'reward-math',questionId:'q-math-1',at:now+86400000};}
 ];
 for(const mutate of corruptions){const bad=structuredClone(valid);mutate(bad);assert.throws(()=>R.importRewards(bad));assert.equal(storage.get(R.REWARDS_KEY),unchanged,'A rejected import leaves all reward records untouched');}
 assert.throws(()=>R.importRewards({format:'wrong',version:1,state:valid.state}));
 assert.throws(()=>R.recordEffort({who:'tae',eventId:'fake-reflection',kind:'reflection',gameId:'reward-math',roundId:'round-fake'}));

 // Full progress + rewards restore, including two children, remains idempotent.
 P.selectLearner('se');play(quiz('english',3));R.syncRewards(catalog,'se');
 const progressBackup=P.exportRecords(),rewardBackup=R.exportRewards(),taeBefore=R.wallet(catalog,'tae'),seBefore=R.wallet(catalog,'se');
 reset();R=await fresh();R.syncRewards(catalog,'tae');assert.throws(()=>R.importRewards(rewardBackup),'Spending cannot be restored without its funding progress');
 P.importRecords(progressBackup);R.importRewards(rewardBackup);R.importRewards(rewardBackup);
 assert.equal(R.wallet(catalog,'tae').lifetime,taeBefore.lifetime);assert.equal(R.wallet(catalog,'tae').spent,taeBefore.spent);assert.equal(R.wallet(catalog,'se').lifetime,seBefore.lifetime);
 const restored=await fresh();assert.deepEqual(restored.exportRewards(),R.exportRewards(),'Reward ledger survives a new page/module instance');

 // If a device refuses writes, continue in memory and preserve that memory when
 // storage becomes readable again, until a successful save flushes it.
 blocked=true;const offline=await fresh();offline.wallet(catalog,'se');assert.equal(offline.rewardStorageAvailable(),false);
 assert.equal(offline.recordEffort({who:'se',eventId:'offline-hint',kind:'hint',gameId:'reward-english',questionId:'q-english-1'}).earned,1);
 blocked=false;assert.ok(offline.exportRewards().state.profiles.se.events['offline-hint'],'Recovering reads must not discard unsaved rewards');
 offline.recordEffort({who:'se',eventId:'offline-hint-two',kind:'hint',gameId:'reward-english',questionId:'q-english-1'});
 assert.equal(offline.rewardStorageAvailable(),true);assert.ok((await fresh()).exportRewards().state.profiles.se.events['offline-hint']);
 assert.equal(offline.wallet(catalog,'tae').spent,taeBefore.spent,'Storage recovery preserves pre-existing purchase receipts as well as unsaved effort');
 // A graded direct retry receives its motivational badge while preserving the
 // original wrong answer that is used for independent growth/readiness checks.
 reset();const guided=await fresh();guided.syncRewards(catalog,'se');P.selectLearner('se');
 const practiceGame=quiz('math',3),practiceRound=P.beginRound(practiceGame),practiceId=practiceRound.ids[0];
 P.answerQuestion(practiceGame,1);
 const originalAnswer=structuredClone(P.gameProgress(practiceGame.id,'se'));
 assert.equal(guided.wallet(catalog,'se').badges.find(b=>b.id==='try-again').unlocked,false);
 guided.recordEffort({who:'se',eventId:'guided-hint-one',kind:'hint',gameId:practiceGame.id,questionId:practiceId});
 guided.recordEffort({who:'se',eventId:'guided-hint-two',kind:'hint',gameId:practiceGame.id,questionId:practiceId});
 const {gradeResponse}=await import('../platform/activities.js');
 assert.equal(gradeResponse(practiceGame.questions.find(q=>q.id===practiceId),0).correct,true);
 const guidedRetry=guided.recordEffort({who:'se',eventId:'guided-retry-correct',kind:'retry',gameId:practiceGame.id,questionId:practiceId});
 assert.equal(guidedRetry.added,true);assert.equal(guidedRetry.earned,0,'Successful practice is retained after the two-star hint/retry cap without another credit');
 assert.equal(guided.wallet(catalog,'se').badges.find(b=>b.id==='try-again').unlocked,true,'A validated direct retry unlocks the practice badge');
 assert.deepEqual(P.gameProgress(practiceGame.id,'se'),originalAnswer,'Guided retry must not overwrite an independent wrong answer or invent a correct attempt');
 assert.equal(P.gameProgress(practiceGame.id,'se').records[practiceId].attempts[0].correct,false);
 assert.throws(()=>guided.recordEffort({who:'se',eventId:'unanswered-retry',kind:'retry',gameId:'reward-math',questionId:'q-math-12'}),'A known but never answered question cannot certify a practice badge');
 // A legacy light purchase and a full five-slot outfit must coexist, reload,
 // and merge without reviving removed gifts or charging for re-equipping.
 reset();const gifts=await fresh();P.selectLearner('tae');
 play(quiz('math'));play(quiz('korean'));play(quiz('english'));
 const catalogIds=new Set(gifts.REWARD_ITEMS.map(item=>item.id));
 assert.equal(catalogIds.size,48,'All 48 gifts have unique IDs');
 assert.deepEqual(gifts.REWARD_CATEGORIES.map(c=>gifts.REWARD_ITEMS.filter(i=>i.category===c.id).length),[9,8,8,8,8,7]);
 gifts.syncRewards(catalog,'tae');
 const oldFormat=gifts.exportRewards();for(const p of Object.values(oldFormat.state.profiles))delete p.outfit;
 for(const id of ['trail-stars','bg-sky','friend-rabbit','mark-flower','title-curious']){
  const purchase=gifts.purchaseReward(id,catalog,'tae');assert.equal(purchase.ok,true,id);
  const spent=gifts.wallet(catalog,'tae').spent;
  assert.equal(gifts.purchaseReward(id,catalog,'tae').duplicate,true,id+' cannot charge twice');
  gifts.equipReward(id,'tae');assert.equal(gifts.wallet(catalog,'tae').spent,spent,'Wearing an owned gift is free');
 }
 let outfit=gifts.wallet(catalog,'tae');
 assert.equal(outfit.equipped,'trail-stars','The original light equipment field remains compatible');
 assert.equal(Object.values(outfit.look).filter(Boolean).length,5,'Five gift kinds can be worn together');
 assert.equal(gifts.wallet(catalog,'se').spent,0);assert.equal(Object.values(gifts.wallet(catalog,'se').look).filter(Boolean).length,0);
 assert.throws(()=>gifts.equipReward('friend-rabbit','se'),'One child cannot use another child’s gifts');
 const dressed=gifts.exportRewards();gifts.importRewards(oldFormat);
 assert.equal(gifts.wallet(catalog,'tae').look.friend.id,'friend-rabbit','Old version-1 backups without outfit preserve new equipment');
 gifts.unequipCategory('friend','tae');gifts.importRewards(dressed);
 assert.equal(gifts.wallet(catalog,'tae').look.friend,null,'Old backups do not re-equip a removed friend');
 assert.equal(gifts.wallet(catalog,'tae').items.find(i=>i.id==='friend-rabbit').owned,true,'Removing a gift preserves ownership');
 assert.equal((await fresh()).wallet(catalog,'tae').look.background.id,'bg-sky','Outfit reloads from storage');
 const badSlot=gifts.exportRewards();badSlot.state.profiles.tae.outfit.friend={id:'bg-sky',at:now};
 assert.throws(()=>gifts.importRewards(badSlot),'Equipment cannot cross category slots');
 const unowned=gifts.exportRewards();unowned.state.profiles.tae.outfit.friend={id:'friend-cat',at:now};
 assert.throws(()=>gifts.importRewards(unowned),'A backup cannot equip an unowned new gift');
 const beforeGifts=gifts.wallet(catalog,'tae').spent;
 gifts.equipReward('friend-rabbit','tae');assert.equal(gifts.wallet(catalog,'tae').spent,beforeGifts);
 assert.ok(writes>0);
 console.log('PASS: preserved legacy stars, two-child isolation, bounded effort, evidence-backed badges, safe spending, double-click prevention, family request completion, monotone old-backup merge, atomic validation, full backup restore and blocked-storage recovery; 48 unique gifts, five-slot outfits, free re-equipping and old-v1 outfit compatibility');
}finally{Date.now=originalNow;}
