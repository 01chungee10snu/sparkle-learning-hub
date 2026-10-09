import {mergeLegacy} from './legacy.js';
/** Device-local adapter. Keep this API when adding authenticated cloud persistence. */
export const KEY='sparkle-learning-progress-v1';
export const LEARNER_KEY='sparkle-learner-v1';
export const LEGACY_KEY='fairy-math-garden-v1';
export const LEARNERS={
 tae:{name:'태희',emoji:'🌸',defaultStage:{math:3,korean:3,english:2},roundSize:5},
 se:{name:'세희',emoji:'🌙',defaultStage:{math:1,korean:1,english:1},roundSize:3}
};
const SUBJECT_IDS=['math','korean','english'];
const ATTEMPT_LIMIT=5,ROUND_LIMIT=100;
let allowedQuestions=new Map();
export function configureCatalog(catalog){allowedQuestions=new Map(catalog.filter(g=>g.kind==='quiz').map(g=>[g.id,new Set(g.questionIds||[])]));}
const blankGame=()=>({records:{},round:null,finishedRounds:0,lastPlayed:0,completedRounds:[]});
const blank=()=>({version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}});
let memory=blank(),selected='tae',sequence=0;
export let storageAvailable=true;
const knownId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(id);
const validTime=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=Number.MAX_SAFE_INTEGER;
const boundedCount=value=>Math.max(0,Math.min(100000,Math.floor(Number(value)||0)));
const safeJSON=value=>{try{return value?JSON.parse(value):null;}catch{return null;}};
const read=key=>{try{return safeJSON(localStorage.getItem(key));}catch{storageAvailable=false;return null;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));storageAvailable=true;}catch{storageAvailable=false;}};
const uniqueId=prefix=>`${prefix}-${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2,12)}`}`;
function validLearner(who){if(!Object.hasOwn(LEARNERS,who))throw new Error('아이를 선택해 주세요.');return who;}
function cleanAttempts(values){
 const byId=new Map();
 for(const a of Array.isArray(values)?values:[])if(a&&knownId(a.id)&&knownId(a.roundId)&&typeof a.correct==='boolean'&&validTime(a.at)){
  const item={id:a.id,correct:a.correct,at:a.at,roundId:a.roundId},old=byId.get(a.id);
  if(!old||item.at>old.at)byId.set(a.id,item);
 }
 return [...byId.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(-ATTEMPT_LIMIT);
}
function cleanCompleted(values,allowed){
 const byId=new Map();
 for(const r of Array.isArray(values)?values:[])if(r&&knownId(r.id)&&validTime(r.at)&&Array.isArray(r.questionIds)&&[3,5].includes(r.questionIds.length)&&new Set(r.questionIds).size===r.questionIds.length&&r.questionIds.every(id=>allowed.has(id))){
  const item={id:r.id,at:r.at,questionIds:[...r.questionIds]},old=byId.get(r.id);if(!old||item.at>old.at)byId.set(r.id,item);
 }
 return [...byId.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(-ROUND_LIMIT);
}
function cleanRound(s,allowed,gameId){
 if(!s||!Array.isArray(s.ids)||![3,5].includes(s.ids.length)||!s.ids.every(id=>knownId(id)&&allowed.has(id))||new Set(s.ids).size!==s.ids.length||!Number.isInteger(s.index)||s.index<0||s.index>s.ids.length||!Array.isArray(s.answers)||s.answers.length<s.index||s.answers.length>Math.min(s.ids.length,s.index+1))return null;
 if(!s.answers.every((a,i)=>a&&a.id===s.ids[i]&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<3&&[0,2,8,10].includes(a.earned)&&typeof a.correct==='boolean'))return null;
 const updatedAt=validTime(s.updatedAt)?s.updatedAt:0;
 // A stable migrated id keeps a resumed pre-growth round valid across page loads.
 const id=knownId(s.id)?s.id:`round-old-${gameId.slice(0,40)}-${Math.floor(updatedAt).toString(36)}`;
 return {id,ids:[...s.ids],index:s.index,answers:s.answers.map(a=>({id:a.id,choice:a.choice,correct:a.correct,earned:a.earned})),finished:s.index===s.ids.length,updatedAt};
}
export function clean(raw){
 if(!raw||raw.version!==1||!raw.profiles?.tae||!raw.profiles?.se)throw new Error('반짝 배움터의 기록 파일을 골라 주세요.');
 const next=blank();
 for(const who of Object.keys(LEARNERS)){
  const profile=raw.profiles[who];
  for(const subject of SUBJECT_IDS){
   const value=profile.stageSelections?.[subject];
   if(value&&Number.isInteger(value.stage)&&value.stage>=1&&value.stage<=4&&validTime(value.updatedAt))next.profiles[who].stageSelections[subject]={stage:value.stage,updatedAt:value.updatedAt};
  }
  for(const [id,g] of Object.entries(profile.games||{})){
   if(!knownId(id)||!allowedQuestions.has(id)||!g||typeof g!=='object')continue;
   const dest=blankGame(),allowed=allowedQuestions.get(id),globalAttempts=new Set();
   for(const [qid,r] of Object.entries(g.records||{}))if(knownId(qid)&&allowed.has(qid)&&r&&[2,10].includes(r.best)){
    const attempts=cleanAttempts(r.attempts).filter(a=>{if(globalAttempts.has(a.id))return false;globalAttempts.add(a.id);return true;});
    dest.records[qid]={best:r.best,seen:Math.max(1,boundedCount(r.seen)),attempts};
   }
   dest.completedRounds=cleanCompleted(g.completedRounds,allowed);
   dest.finishedRounds=Math.max(boundedCount(g.finishedRounds),dest.completedRounds.length);
   dest.lastPlayed=validTime(g.lastPlayed)?g.lastPlayed:0;
   dest.round=cleanRound(g.round,allowed,id);
   next.profiles[who].games[id]=dest;
  }
 }
 return next;
}
function load(){if(!storageAvailable)return memory;const raw=read(KEY);if(raw)try{memory=clean(raw);}catch{storageAvailable=false;}return memory;}
function save(state){memory=state;write(KEY,state);}
export function learner(){const shared=read(LEARNER_KEY);if(shared&&Object.hasOwn(LEARNERS,shared.id))selected=shared.id;else{const legacy=read(LEGACY_KEY);if(legacy&&Object.hasOwn(LEARNERS,legacy.selected))selected=legacy.selected;}return selected;}
export function selectLearner(id){selected=validLearner(id);write(LEARNER_KEY,{id});}
export function gameProgress(id,who=learner()){return load().profiles[validLearner(who)].games[id]||blankGame();}
export function stageSelection(subject,who=learner()){if(!SUBJECT_IDS.includes(subject))throw new Error('과목을 확인해 주세요.');return load().profiles[validLearner(who)].stageSelections[subject]?.stage??LEARNERS[who].defaultStage[subject];}
export function saveStageSelection(subject,stage,who=learner()){
 validLearner(who);if(!SUBJECT_IDS.includes(subject)||!Number.isInteger(stage)||stage<1||stage>4)throw new Error('학습 단계를 확인해 주세요.');
 const state=load();state.profiles[who].stageSelections[subject]={stage,updatedAt:Date.now()};save(state);return stage;
}
function updateGame(id,callback){if(!knownId(id)||!allowedQuestions.has(id))throw new Error('게임 이름을 확인해 주세요.');const state=load(),p=state.profiles[learner()];p.games[id]||=blankGame();const value=callback(p.games[id]);save(state);return value;}
export function beginRound(game,options={}){return updateGame(game.id,g=>{
 const old=g.round;
 if(old&&!old.finished&&old.ids.every(id=>game.questions.some(q=>q.id===id))){g.lastPlayed=Date.now();return old;}
 const size=options.size??LEARNERS[learner()].roundSize;
 if(![3,5].includes(size))throw new Error('한 번에 세 문제 또는 다섯 문제를 골라 주세요.');
 const ids=game.questions.map(q=>({id:q.id,rank:(g.records[q.id]?.best||0)*100+(g.records[q.id]?.seen||0)+Math.random()})).sort((a,b)=>a.rank-b.rank).slice(0,size).map(q=>q.id);
 if(ids.length<size||new Set(ids).size!==size)throw new Error('놀이에 필요한 문제가 부족해요.');
 g.round={id:uniqueId('round'),ids,index:0,answers:[],finished:false,updatedAt:Date.now()};g.lastPlayed=Date.now();return g.round;
 });}
export function answerQuestion(game,choice){return updateGame(game.id,g=>{
 const s=g.round;if(!s||s.finished||s.answers[s.index])return null;
 const q=game.questions.find(q=>q.id===s.ids[s.index]);if(!q||!Number.isInteger(choice)||choice<0||choice>=q.choices.length)throw new Error('답을 하나 골라 주세요.');
 const correct=choice===q.answer,prev=g.records[q.id]?.best||0,best=Math.max(prev,correct?10:2),earned=best-prev,at=Math.max(Date.now(),g.lastPlayed+1,s.updatedAt+1);
 const attempts=cleanAttempts([...(g.records[q.id]?.attempts||[]),{id:uniqueId('attempt'),correct,at,roundId:s.id}]);
 g.records[q.id]={best,seen:Math.min(100000,(g.records[q.id]?.seen||0)+1),attempts};const a={id:q.id,choice,correct,earned};s.answers.push(a);s.updatedAt=at;g.lastPlayed=at;return a;
 });}
export function nextQuestion(id){return updateGame(id,g=>{
 const s=g.round;if(!s||s.finished||!s.answers[s.index])return s;
 s.index++;s.updatedAt=Math.max(Date.now(),s.updatedAt);
 if(s.index===s.ids.length){s.finished=true;g.finishedRounds++;g.completedRounds=cleanCompleted([...g.completedRounds,{id:s.id,at:s.updatedAt,questionIds:[...s.ids]}],allowedQuestions.get(id));}
 return s;
 });}
const validLegacyId=id=>/^(length|weight|distance|mix)-(0[1-9]|1[0-2])$/.test(id);
export function legacyProgress(who=learner()){
 const p=read(LEGACY_KEY)?.profiles?.[validLearner(who)];const records=Object.fromEntries(Object.entries(p?.records||{}).filter(([id,r])=>validLegacyId(id)&&r&&[2,10].includes(r.best)));
 return {records,round:p?.active&&!p.active.finished?p.active:null,finishedRounds:p?.sessions||0};
}
export function summary(catalog,who=learner()){
 const games=catalog.filter(g=>g.status==='published').map(g=>{const p=g.progressAdapter==='unit-garden-v1'?legacyProgress(who):gameProgress(g.id,who),items=Object.values(p.records);return {id:g.id,subject:g.subject,stars:items.reduce((n,r)=>n+r.best,0),mastered:items.filter(r=>r.best===10).length,started:items.length,resume:Boolean(p.round&&!p.round.finished),rounds:p.finishedRounds};});
 return {games,stars:games.reduce((n,g)=>n+g.stars,0),mastered:games.reduce((n,g)=>n+g.mastered,0)};
}
export function exportRecords(){return {format:'sparkle-learning-backup',version:1,createdAt:new Date().toISOString(),platform:load(),unitGarden:read(LEGACY_KEY),learner:learner()};}
export function importRecords(raw){
 if(raw?.format!=='sparkle-learning-backup'||raw.version!==1)throw new Error('배움터에서 내보낸 기록 파일을 골라 주세요.');
 const incoming=clean(raw.platform),current=load();
 for(const who of Object.keys(LEARNERS)){
  for(const [subject,value] of Object.entries(incoming.profiles[who].stageSelections)){
   const old=current.profiles[who].stageSelections[subject];if(!old||value.updatedAt>old.updatedAt)current.profiles[who].stageSelections[subject]={...value};
  }
  for(const [id,src] of Object.entries(incoming.profiles[who].games)){
   const g=current.profiles[who].games[id]||=blankGame();
   for(const [qid,r] of Object.entries(src.records)){const old=g.records[qid];g.records[qid]={best:Math.max(old?.best||0,r.best),seen:Math.max(old?.seen||0,r.seen),attempts:cleanAttempts([...(old?.attempts||[]),...r.attempts])};}
   g.completedRounds=cleanCompleted([...g.completedRounds,...src.completedRounds],allowedQuestions.get(id));
   g.finishedRounds=Math.max(g.finishedRounds,src.finishedRounds,g.completedRounds.length);g.lastPlayed=Math.max(g.lastPlayed,src.lastPlayed);if(src.round&&(!g.round||src.round.updatedAt>g.round.updatedAt))g.round=src.round;
  }
 }
 save(clean(current));
 const legacy=mergeLegacy(read(LEGACY_KEY),raw.unitGarden);if(legacy)write(LEGACY_KEY,legacy);
}
