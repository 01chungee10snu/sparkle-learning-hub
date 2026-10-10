import {mergeLegacy} from './legacy.js';
import {gradeResponse,normalizeNumericResponse,NUMERIC_LIMIT} from './activities.js';
import * as IRT from './irt.js?v=public-isolated-2';
/** Device-local adapter. Keep this API when adding authenticated cloud persistence. */
// Older tabs only understand their catalog and can discard newer game records.
// Keep the new writer isolated; the old key is read once and never modified here.
export const KEY='sparkle-public-village-progress-v06';
export const PREVIOUS_KEY='sparkle-public-village-progress-v06-previous';
export const FIRST_KEY='sparkle-public-village-progress-v06-first';
export const LEARNER_KEY='sparkle-learner-v1';
export const LEGACY_KEY='sparkle-public-village-unit-garden-v06';
export const LEARNERS={
 tae:{name:'태희',emoji:'🌸',defaultStage:{math:3,korean:3,english:2},roundSize:5},
 se:{name:'세희',emoji:'🌙',defaultStage:{math:1,korean:1,english:1},roundSize:3}
};
const SUBJECT_IDS=['math','korean','english'];
export function configureIrtBank(bank){
 const expected=[...allowedQuestions.values()].reduce((sum,ids)=>sum+ids.size,0);
 if(!bank||bank.count!==expected||!Array.isArray(bank.items)||bank.items.length!==expected||bank.items.some(item=>!allowedQuestions.get(item.gameId)?.has(item.id)))throw new Error('난이도 색인과 문항 목록이 일치하지 않아요.');
 return IRT.configureBank(bank);
}
const ATTEMPT_LIMIT=5,ROUND_LIMIT=100;
const isBebsuOriginal = id => /^(?:bebsu-(?:g[1-6]|m[1-3])-original|magic-(?:g[1-6]|m[1-3])-challenge)$/.test(id);
const validPaperId = id => typeof id === 'string' && /^(?:kma-[0-9]{1,5}|magic-(?:g[1-6]|m[1-3])-(?:basic|challenge|advanced))$/.test(id);
const validRoundLength = (length, gameId, paperId) =>
 [3,5].includes(length) || (length === 25 && isBebsuOriginal(gameId) && validPaperId(paperId));
let allowedQuestions=new Map(),numericGames=new Set(),choiceLimits=new Map(),numericMins=new Map();
export function configureCatalog(catalog){allowedQuestions=new Map(catalog.filter(g=>g.kind==='quiz').map(g=>[g.id,new Set(g.questionIds||[])]));numericGames=new Set(catalog.filter(g=>g.kind==='quiz'&&g.modes?.includes('numeric')).map(g=>g.id));choiceLimits=new Map(catalog.filter(g=>g.kind==='quiz').map(g=>[g.id,Number.isInteger(g.maxChoices)&&g.maxChoices>=3&&g.maxChoices<=5?g.maxChoices:3]));numericMins=new Map(catalog.filter(g=>numericGames.has(g.id)).map(g=>[g.id,Number.isSafeInteger(g.numericMin)&&g.numericMin>= -NUMERIC_LIMIT&&g.numericMin<=0?g.numericMin:0]));}
const blankGame=()=>({records:{},round:null,finishedRounds:0,lastPlayed:0,completedRounds:[]});
const blank=()=>({version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}});
let memory=blank(),selected='tae',sequence=0,progressDirty=false;
export let storageAvailable=true;
const knownId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(id);
const validTime=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=Number.MAX_SAFE_INTEGER;
const boundedCount=value=>Math.max(0,Math.min(100000,Math.floor(Number(value)||0)));
const safeJSON=value=>{try{return value?JSON.parse(value):null;}catch{return null;}};
const read=key=>{try{return safeJSON(localStorage.getItem(key));}catch{storageAvailable=false;return null;}};
// Success on a small auxiliary key does not mean the larger progress write worked.
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{storageAvailable=false;return false;}};
const uniqueId=prefix=>`${prefix}-${globalThis.crypto?.randomUUID?.()||`${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2,12)}`}`;
function validLearner(who){if(!Object.hasOwn(LEARNERS,who))throw new Error('아이를 선택해 주세요.');return who;}
function cleanAttempts(values){
 const byId=new Map();
 for(const a of Array.isArray(values)?values:[])if(a&&knownId(a.id)&&knownId(a.roundId)&&typeof a.correct==='boolean'&&validTime(a.at)){
  if(a.assisted!==undefined&&typeof a.assisted!=='boolean')continue;
  if(a.durationMs!==undefined&&(!Number.isInteger(a.durationMs)||a.durationMs<0||a.durationMs>600000))continue;
  const item={id:a.id,correct:a.correct,at:a.at,roundId:a.roundId,...(a.assisted===true?{assisted:true}:{}),...(a.durationMs!==undefined?{durationMs:a.durationMs}:{})},old=byId.get(a.id);
  if(!old||item.at>old.at)byId.set(a.id,item);
 }
 return [...byId.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(-ATTEMPT_LIMIT);
}
function cleanCompleted(values,allowed,gameId){
 const byId=new Map();
 for(const r of Array.isArray(values)?values:[])if(r&&knownId(r.id)&&validTime(r.at)&&Array.isArray(r.questionIds)&&validRoundLength(r.questionIds.length,gameId,r.paperId)&&new Set(r.questionIds).size===r.questionIds.length&&r.questionIds.every(id=>allowed.has(id))){
  const item={id:r.id,at:r.at,questionIds:[...r.questionIds],...(r.questionIds.length===25?{paperId:r.paperId}:{})},old=byId.get(r.id);if(!old||item.at>old.at)byId.set(r.id,item);
 }
 return [...byId.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(-ROUND_LIMIT);
}
function cleanRound(s,allowed,gameId){
 if(!s||!Array.isArray(s.ids)||!validRoundLength(s.ids.length,gameId,s.paperId)||!s.ids.every(id=>knownId(id)&&allowed.has(id))||new Set(s.ids).size!==s.ids.length||!Number.isInteger(s.index)||s.index<0||s.index>s.ids.length||!Array.isArray(s.answers)||s.answers.length<s.index||s.answers.length>Math.min(s.ids.length,s.index+1))return null;
 const validResponse=value=>{if(typeof value==='string'){if(!numericGames.has(gameId))return false;try{return normalizeNumericResponse(value,NUMERIC_LIMIT,numericMins.get(gameId)??0)===value;}catch{return false;}}return Number.isInteger(value)?value>=0&&value<=20:Array.isArray(value)&&value.length>=3&&value.length<=5&&value.every(n=>Number.isInteger(n)&&n>=0&&n<value.length)&&new Set(value).size===value.length;};
 const response=a=>Object.hasOwn(a,'response')?a.response:a.choice;
 if(!s.answers.every((a,i)=>a&&a.id===s.ids[i]&&validResponse(response(a))&&(a.choice===undefined||(Number.isInteger(a.choice)&&a.choice>=0&&a.choice<(choiceLimits.get(gameId)??3)&&response(a)===a.choice))&&[0,2,8,10].includes(a.earned)&&typeof a.correct==='boolean'))return null;
 const updatedAt=validTime(s.updatedAt)?s.updatedAt:0;
 // A stable migrated id keeps a resumed pre-growth round valid across page loads.
 const id=knownId(s.id)?s.id:`round-old-${gameId.slice(0,40)}-${Math.floor(updatedAt).toString(36)}`;
 return {id,ids:[...s.ids],...(s.ids.length===25?{paperId:s.paperId}:{}),index:s.index,answers:s.answers.map(a=>({id:a.id,...(a.choice!==undefined?{choice:a.choice}:{}),response:Array.isArray(response(a))?[...response(a)]:response(a),correct:a.correct,earned:a.earned})),finished:s.index===s.ids.length,updatedAt,shownAt:validTime(s.shownAt)?s.shownAt:0,hinted:s.hinted===true};
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
    const first=cleanAttempts(r.firstAttempt?[r.firstAttempt]:[])[0];
    dest.records[qid]={best:r.best,seen:Math.max(1,boundedCount(r.seen)),attempts,...(first?{firstAttempt:first}:{})};
   }
   dest.completedRounds=cleanCompleted(g.completedRounds,allowed,id);
   dest.finishedRounds=Math.max(boundedCount(g.finishedRounds),dest.completedRounds.length);
   dest.lastPlayed=validTime(g.lastPlayed)?g.lastPlayed:0;
   dest.round=cleanRound(g.round,allowed,id);
   next.profiles[who].games[id]=dest;
  }
 }
 return next;
}
function load(){
 // A failed write leaves the latest answers only in memory. Do not reload stale
 // disk data until a later progress save succeeds (export still uses this copy).
 if(progressDirty)return memory;
 try{
  const stored=localStorage.getItem(KEY);
  if(stored!==null){memory=clean(JSON.parse(stored));return memory;}
  const previous=localStorage.getItem(PREVIOUS_KEY)??localStorage.getItem(FIRST_KEY);
  const migrated=previous!==null?clean(JSON.parse(previous)):blank();
  save(migrated); // The new key itself is the durable one-time migration marker.
 }catch{storageAvailable=false;}
 return memory;
}
function save(state){
 memory=state;progressDirty=true;
 if(write(KEY,state)){progressDirty=false;storageAvailable=true;}
}
export function learner(){const shared=read(LEARNER_KEY);if(shared&&Object.hasOwn(LEARNERS,shared.id))selected=shared.id;else{const legacy=read(LEGACY_KEY);if(legacy&&Object.hasOwn(LEARNERS,legacy.selected))selected=legacy.selected;}return selected;}
export function selectLearner(id){selected=validLearner(id);write(LEARNER_KEY,{id});}
export function gameProgress(id,who=learner()){return load().profiles[validLearner(who)].games[id]||blankGame();}
export function ability(subject,who=learner()){
 const profile=load().profiles[validLearner(who)];
 return IRT.estimateSubject(profile.games,subject,stageSelection(subject,who));
}
export function workbookSuggestion(grade,who=learner()){
 const profile=load().profiles[validLearner(who)];
 return IRT.workbookRecommendation(profile,grade);
}
export function stageSelection(subject,who=learner()){if(!SUBJECT_IDS.includes(subject))throw new Error('과목을 확인해 주세요.');return load().profiles[validLearner(who)].stageSelections[subject]?.stage??LEARNERS[who].defaultStage[subject];}
export function saveStageSelection(subject,stage,who=learner()){
 validLearner(who);if(!SUBJECT_IDS.includes(subject)||!Number.isInteger(stage)||stage<1||stage>4)throw new Error('학습 단계를 확인해 주세요.');
 const state=load();state.profiles[who].stageSelections[subject]={stage,updatedAt:Date.now()};save(state);return stage;
}
function updateGame(id,callback){if(!knownId(id)||!allowedQuestions.has(id))throw new Error('게임 이름을 확인해 주세요.');const state=load(),p=state.profiles[learner()];p.games[id]||=blankGame();const value=callback(p.games[id],p);save(state);return value;}
export function beginRound(game,options={}){return updateGame(game.id,(g,p)=>{
 const old=g.round;
 const paperId=options.paperId;
 if(old&&!old.finished&&old.ids.every(id=>game.questions.some(q=>q.id===id))&&
    (!paperId||(old.paperId===paperId&&old.ids.length===25))){if(!old.shownAt)old.shownAt=Date.now();g.lastPlayed=Date.now();return old;}
 const size=paperId?25:(options.size??LEARNERS[learner()].roundSize);
 if(!validRoundLength(size,game.id,paperId))throw new Error('일반 놀이는 3·5문제, 경시대회는 25문제를 선택해 주세요.');
 let questions=game.questions;
 if(game.adventure===true){
  const level=options.level??stageSelection(game.subject),minimum=Math.min(...game.questions.map(q=>q.level));
  if(!Number.isInteger(level)||level<1||level>4||!Number.isInteger(minimum))throw new Error('놀이의 도전 단계를 확인해 주세요.');
  questions=game.questions.filter(q=>q.level<=Math.max(level,minimum));
 }
 const stage=options.level??stageSelection(game.subject);
 let ids;
 if(paperId){
  if(!isBebsuOriginal(game.id)||!validPaperId(paperId))throw new Error('경시대회 시험지를 다시 선택해 주세요.');
  const exam=paperId.slice(4);
  const origin=paperId.startsWith('magic-') ? 'magic:'+paperId+':' : 'kma:'+exam+':';
  const selected=game.questions.filter(q=>q.source?.id?.startsWith(origin) &&
    Number.isInteger(q.provenance?.examQuestionNo) && q.provenance.examQuestionNo>=1 && q.provenance.examQuestionNo<=25)
   .sort((a,b)=>a.provenance.examQuestionNo-b.provenance.examQuestionNo);
  if(selected.length!==25||selected.some((q,i)=>q.provenance.examQuestionNo!==i+1))
   throw new Error('1번부터 25번까지 확인된 시험지가 아니에요.');
  ids=selected.map(q=>q.id);
 }else{
  const adaptive=IRT.bankSize()?IRT.selectQuestions({game,candidates:questions,profile:p,size,stage}):[];
  ids=adaptive.length===size?adaptive:questions.map(q=>({id:q.id,rank:(g.records[q.id]?.best||0)*100+(g.records[q.id]?.seen||0)+Math.random()})).sort((a,b)=>a.rank-b.rank).slice(0,size).map(q=>q.id);
 }
 if(ids.length<size||new Set(ids).size!==size)throw new Error('놀이에 필요한 문제가 부족해요.');
 g.round={id:uniqueId('round'),ids,...(paperId?{paperId}:{}),index:0,answers:[],finished:false,updatedAt:Date.now(),shownAt:Date.now(),hinted:false};g.lastPlayed=Date.now();return g.round;
 });}
export function markHint(id){return updateGame(id,g=>{
 const s=g.round;if(!s||s.finished||s.answers[s.index])return false;
 s.hinted=true;return true;
});}
export function answerQuestion(game,response){return updateGame(game.id,g=>{
 const s=g.round;if(!s||s.finished||s.answers[s.index])return null;
 const q=game.questions.find(q=>q.id===s.ids[s.index]);if(!q)throw new Error('현재 문제를 다시 열어 주세요.');
 const graded=gradeResponse(q,response),correct=graded.correct,prev=g.records[q.id]?.best||0,best=Math.max(prev,correct?10:2),earned=best-prev,at=Math.max(Date.now(),g.lastPlayed+1,s.updatedAt+1);
 const attempt={id:uniqueId('attempt'),correct,at,roundId:s.id,...(s.hinted?{assisted:true}:{}),...(s.shownAt?{durationMs:Math.min(600000,Math.max(0,at-s.shownAt))}:{})};
 const prior=g.records[q.id];
 const attempts=cleanAttempts([...(prior?.attempts||[]),attempt]);
 g.records[q.id]={best,seen:Math.min(100000,(prior?.seen||0)+1),attempts,...(prior?.firstAttempt?{firstAttempt:prior.firstAttempt}:!prior?{firstAttempt:attempt}:{})};const a={id:q.id,...((q.interaction?.type??'choice')==='choice'?{choice:graded.response}:{}),response:graded.response,correct,earned};s.answers.push(a);s.updatedAt=at;g.lastPlayed=at;return a;
 });}
export function nextQuestion(id){return updateGame(id,g=>{
 const s=g.round;if(!s||s.finished||!s.answers[s.index])return s;
 s.index++;s.updatedAt=Math.max(Date.now(),s.updatedAt);s.shownAt=s.updatedAt;s.hinted=false;
 if(s.index===s.ids.length){s.finished=true;g.finishedRounds++;g.completedRounds=cleanCompleted([...g.completedRounds,{id:s.id,at:s.updatedAt,questionIds:[...s.ids],...(s.paperId?{paperId:s.paperId}:{})}],allowedQuestions.get(id),id);}
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
   for(const [qid,r] of Object.entries(src.records)){const old=g.records[qid];
    const first=[old?.firstAttempt,r.firstAttempt].filter(Boolean).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))[0];
    g.records[qid]={best:Math.max(old?.best||0,r.best),seen:Math.max(old?.seen||0,r.seen),attempts:cleanAttempts([...(old?.attempts||[]),...r.attempts]),...(first?{firstAttempt:first}:{})};}
   g.completedRounds=cleanCompleted([...g.completedRounds,...src.completedRounds],allowedQuestions.get(id),id);
   g.finishedRounds=Math.max(g.finishedRounds,src.finishedRounds,g.completedRounds.length);g.lastPlayed=Math.max(g.lastPlayed,src.lastPlayed);if(src.round&&(!g.round||src.round.updatedAt>g.round.updatedAt))g.round=src.round;
  }
 }
 save(clean(current));
 const legacy=mergeLegacy(read(LEGACY_KEY),raw.unitGarden);if(legacy)write(LEGACY_KEY,legacy);
}
