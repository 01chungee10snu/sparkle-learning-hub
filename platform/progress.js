import {mergeLegacy} from './legacy.js';
/** Device-local adapter. Keep this API when adding authenticated cloud persistence. */
export const KEY='sparkle-learning-progress-v1';
export const LEARNER_KEY='sparkle-learner-v1';
export const LEGACY_KEY='fairy-math-garden-v1';
export const LEARNERS={tae:{name:'태희',emoji:'🌸'},se:{name:'세희',emoji:'🌙'}};
let allowedQuestions=new Map();
export function configureCatalog(catalog){allowedQuestions=new Map(catalog.filter(g=>g.kind==='quiz').map(g=>[g.id,new Set(g.questionIds||[])]));}
let memory={version:1,profiles:{tae:{games:{}},se:{games:{}}}},selected='tae';
export let storageAvailable=true;
const knownId=id=>typeof id==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(id);
const safeJSON=(value)=>{try{return value?JSON.parse(value):null;}catch{return null;}};
const read=key=>{try{return safeJSON(localStorage.getItem(key));}catch{storageAvailable=false;return null;}};
const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));storageAvailable=true;}catch{storageAvailable=false;}};
const blankGame=()=>({records:{},round:null,finishedRounds:0,lastPlayed:0});
const blank=()=>({version:1,profiles:{tae:{games:{}},se:{games:{}}}});
export function clean(raw){
 if(!raw||raw.version!==1||!raw.profiles?.tae||!raw.profiles?.se)throw new Error('반짝 배움터의 기록 파일을 골라 주세요.');
 const next=blank();
 for(const learner of Object.keys(LEARNERS))for(const [id,g] of Object.entries(raw.profiles[learner].games||{})){
  if(!knownId(id)||!allowedQuestions.has(id)||!g||typeof g!=='object')continue;
  const dest=blankGame();
  for(const [qid,r]of Object.entries(g.records||{}))if(knownId(qid)&&allowedQuestions.get(id).has(qid)&&r&&[2,10].includes(r.best))dest.records[qid]={best:r.best,seen:Math.max(1,Math.min(100000,Math.floor(Number(r.seen)||1)))};
  dest.finishedRounds=Math.max(0,Math.floor(Number(g.finishedRounds)||0));dest.lastPlayed=Math.max(0,Number(g.lastPlayed)||0);
  const s=g.round;
  if(s&&Array.isArray(s.ids)&&s.ids.length===5&&s.ids.every(qid=>knownId(qid)&&allowedQuestions.get(id).has(qid))&&new Set(s.ids).size===5&&Number.isInteger(s.index)&&s.index>=0&&s.index<=5&&Array.isArray(s.answers)&&s.answers.length>=s.index&&s.answers.length<=Math.min(5,s.index+1)&&s.answers.every((a,i)=>a&&a.id===s.ids[i]&&Number.isInteger(a.choice)&&a.choice>=0&&a.choice<3&&Number.isInteger(a.earned)&&a.earned>=0&&a.earned<=10&&typeof a.correct==='boolean'))dest.round={ids:[...s.ids],index:s.index,answers:s.answers.map(a=>({...a})),finished:s.index===5,updatedAt:Number(s.updatedAt)||0};
  next.profiles[learner].games[id]=dest;
 }
 return next;
}
function load(){if(!storageAvailable)return memory;const raw=read(KEY);if(raw)try{memory=clean(raw);}catch{storageAvailable=false;}return memory;}
function save(state){memory=state;write(KEY,state);}
export function learner(){const shared=read(LEARNER_KEY);if(shared&&Object.hasOwn(LEARNERS,shared.id))selected=shared.id;else{const legacy=read(LEGACY_KEY);if(legacy&&Object.hasOwn(LEARNERS,legacy.selected))selected=legacy.selected;}return selected;}
export function selectLearner(id){if(!Object.hasOwn(LEARNERS,id))throw new Error('아이를 선택해 주세요.');selected=id;write(LEARNER_KEY,{id});}
export function gameProgress(id,who=learner()){return load().profiles[who].games[id]||blankGame();}
function updateGame(id,callback){if(!knownId(id))throw new Error('게임 이름을 확인해 주세요.');const state=load(),p=state.profiles[learner()];p.games[id]||=blankGame();const value=callback(p.games[id]);save(state);return value;}
export function beginRound(game){return updateGame(game.id,g=>{
 const old=g.round;
 if(old&&!old.finished&&old.ids.every(id=>game.questions.some(q=>q.id===id))){g.lastPlayed=Date.now();return old;}
 const ids=game.questions.map(q=>({id:q.id,rank:(g.records[q.id]?.best||0)*100+(g.records[q.id]?.seen||0)+Math.random()})).sort((a,b)=>a.rank-b.rank).slice(0,5).map(q=>q.id);
 if(ids.length<5)throw new Error('이 게임에는 다섯 문제 이상이 필요해요.');
 g.round={ids,index:0,answers:[],finished:false,updatedAt:Date.now()};g.lastPlayed=Date.now();return g.round;
 });}
export function answerQuestion(game,choice){return updateGame(game.id,g=>{
 const s=g.round;if(!s||s.finished||s.answers[s.index])return null;
 const q=game.questions.find(q=>q.id===s.ids[s.index]);if(!q||!Number.isInteger(choice)||choice<0||choice>=q.choices.length)throw new Error('답을 하나 골라 주세요.');
 const correct=choice===q.answer,prev=g.records[q.id]?.best||0,best=Math.max(prev,correct?10:2),earned=best-prev;
 g.records[q.id]={best,seen:(g.records[q.id]?.seen||0)+1};const a={id:q.id,choice,correct,earned};s.answers.push(a);s.updatedAt=Date.now();g.lastPlayed=Date.now();return a;
 });}
export function nextQuestion(id){return updateGame(id,g=>{const s=g.round;if(!s||s.finished||!s.answers[s.index])return s;s.index++;s.updatedAt=Date.now();if(s.index===5){s.finished=true;g.finishedRounds++;}return s;});}
const validLegacyId=id=>/^(length|weight|distance|mix)-(0[1-9]|1[0-2])$/.test(id);
export function legacyProgress(who=learner()){
 const p=read(LEGACY_KEY)?.profiles?.[who];const records=Object.fromEntries(Object.entries(p?.records||{}).filter(([id,r])=>validLegacyId(id)&&r&&[2,10].includes(r.best)));
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
 for(const who of Object.keys(LEARNERS))for(const [id,src]of Object.entries(incoming.profiles[who].games)){
  const g=current.profiles[who].games[id]||=blankGame();
  for(const [qid,r]of Object.entries(src.records)){const old=g.records[qid];g.records[qid]={best:Math.max(old?.best||0,r.best),seen:Math.max(old?.seen||0,r.seen)};}
  g.finishedRounds=Math.max(g.finishedRounds,src.finishedRounds);g.lastPlayed=Math.max(g.lastPlayed,src.lastPlayed);if(src.round&&(!g.round||src.round.updatedAt>g.round.updatedAt))g.round=src.round;
 }
 save(current);
 const legacy=mergeLegacy(read(LEGACY_KEY),raw.unitGarden);if(legacy)write(LEGACY_KEY,legacy);
}
