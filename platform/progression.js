import * as Progress from './progress.js';
import * as Rewards from './rewards.js?v=unified-20261013';
import * as VillageState from '../village/village-state.js';

export const GOAL_KEY='sparkle-growth-goal-v1';
export const GOALS=Object.freeze({
 balanced:{id:'balanced',emoji:'✨',name:'균형 성장',description:'수학·국어·영어·한자와 마을 돌보기를 고르게 이어가요.'},
 math:{id:'math',emoji:'🔢',name:'수학 집중',description:'수학 모험을 조금 더 자주 만나되 다른 과목도 놓치지 않아요.'},
 korean:{id:'korean',emoji:'📖',name:'이야기 집중',description:'읽기·말하기·낱말 모험을 중심으로 이어가요.'},
 english:{id:'english',emoji:'🌍',name:'영어 탐험',description:'듣기와 표현을 자주 만나며 영어 숲을 키워요.'},
 hanja:{id:'hanja',emoji:'📜',name:'한자 수련',description:'8급부터 나의 속도로 한자의 뜻과 소리를 발견해요.'},
 garden:{id:'garden',emoji:'🌱',name:'정원 돌보기',description:'학습을 마칠 때마다 마을과 정원이 자라는 경험을 강조해요.'}
});
export const RANKS=Object.freeze([
 {level:1,min:0,name:'별씨앗',emoji:'🌱'},
 {level:2,min:45,name:'빛새싹',emoji:'🌿'},
 {level:3,min:120,name:'꿈꽃',emoji:'🌷'},
 {level:4,min:240,name:'별나무',emoji:'🌳'},
 {level:5,min:420,name:'마법정원사',emoji:'🧚'},
 {level:6,min:700,name:'마을수호자',emoji:'🏰'}
]);
const KIDS=new Set(Object.keys(Progress.LEARNERS));
const safeJson=value=>{try{return value?JSON.parse(value):null;}catch{return null;}};
function blankGoals(){return {version:1,profiles:{tae:{goal:'balanced',updatedAt:0},se:{goal:'balanced',updatedAt:0}}};}
function clean(raw){
 const result=blankGoals();
 if(!raw||raw.version!==1)return result;
 for(const who of KIDS){
  const value=raw.profiles?.[who];
  if(value&&Object.hasOwn(GOALS,value.goal)&&Number.isSafeInteger(value.updatedAt)&&value.updatedAt>=0)
   result.profiles[who]={goal:value.goal,updatedAt:value.updatedAt};
 }
 return result;
}
function load(storage=globalThis.localStorage){
 try{return clean(safeJson(storage?.getItem(GOAL_KEY)));}
 catch{return blankGoals();}
}
export function goal(who=Progress.learner(),storage=globalThis.localStorage){
 if(!KIDS.has(who))throw new Error('아이를 선택해 주세요.');
 return GOALS[load(storage).profiles[who].goal];
}
export function setGoal(id,who=Progress.learner(),storage=globalThis.localStorage){
 if(!KIDS.has(who)||!Object.hasOwn(GOALS,id))throw new Error('성장 목표를 확인해 주세요.');
 const state=load(storage);state.profiles[who]={goal:id,updatedAt:Date.now()};
 try{storage?.setItem(GOAL_KEY,JSON.stringify(state));}catch{}
 return GOALS[id];
}
export function exportGoals(storage=globalThis.localStorage){return clean(load(storage));}
export function importGoals(raw,storage=globalThis.localStorage){
 const incoming=clean(raw),current=load(storage);
 for(const who of KIDS)if(incoming.profiles[who].updatedAt>current.profiles[who].updatedAt)
  current.profiles[who]=incoming.profiles[who];
 try{storage?.setItem(GOAL_KEY,JSON.stringify(current));}catch{}
 return clean(current);
}
export function snapshot(catalog,who=Progress.learner()){
 if(!KIDS.has(who))throw new Error('아이를 선택해 주세요.');
 const summary=Progress.summary(catalog,who),wallet=Rewards.wallet(catalog,who);
 const village=VillageState.villageSummary(VillageState.loadVillage(),who);
 const rounds=summary.games.reduce((sum,g)=>sum+g.rounds,0);
 const subjects=new Set(summary.games.filter(g=>g.started||g.rounds).map(g=>g.subject)).size;
 const badges=wallet.badges.filter(b=>b.unlocked).length;
 // This is a game-progression score, not an academic ability or developmental diagnosis.
 const points=summary.mastered*3+rounds*5+village.flowers*6+badges*12+Math.min(120,wallet.effortStars);
 let rank=RANKS[0];
 for(const candidate of RANKS)if(points>=candidate.min)rank=candidate;
 const next=RANKS.find(r=>r.min>rank.min)||null;
 const rankProgress=next?Math.max(0,Math.min(1,(points-rank.min)/(next.min-rank.min))):1;
 return {who,points,rank,next,rankProgress,rounds,mastered:summary.mastered,subjects,badges,flowers:village.flowers,familyFlowers:village.familyFlowers,stars:wallet.lifetime,availableStars:wallet.available,goal:goal(who)};
}
