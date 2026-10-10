/** Provisional Bayesian 1PL-style IRT, adjusted for guessing on choice items.
 * Editorial difficulty anchors are not population-calibrated parameters.
 * Only a distinct item's earliest independent answer enters ability inference.
 * Stars and response time have no effect on ability estimation.
 */
export const MODEL_VERSION=1;
export const STAGE_DIFFICULTY=Object.freeze({1:-2.2,2:-1.25,3:-0.25,4:0.75});
export const GRADE_DIFFICULTY=Object.freeze({K:-2.3,G1:0.2,G2:1.6,G3:2.7,G4:3.7,G5:4.7,G6:5.7,M:6.3,M1:7,M2:8,M3:9});
const SUBJECTS=new Set(['math','korean','english']);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const validId=value=>typeof value==='string'&&/^[a-z][a-z0-9-]{0,79}$/.test(value);
let bankIndex=new Map();
export function configureBank(bank){
 if(!bank||bank.version!==MODEL_VERSION||!Array.isArray(bank.items)||!bank.items.length)throw new Error('적응형 문항 자료가 올바르지 않아요.');
 const next=new Map();
 for(const item of bank.items){
  if(!validId(item.gameId)||!validId(item.id)||!SUBJECTS.has(item.subject)||typeof item.skill!=='string'||!item.skill.trim()||item.skill.length>180||!Number.isFinite(item.b)||item.b< -4||item.b>11||!Number.isFinite(item.c)||item.c<0||item.c>0.34)throw new Error('문항 난이도 자료가 올바르지 않아요.');
  const key=item.gameId+':'+item.id;
  if(next.has(key))throw new Error('중복된 문항 난이도 자료가 있어요.');
  next.set(key,Object.freeze({...item}));
 }
 bankIndex=next;
 return bankIndex.size;
}
export function bankSize(){return bankIndex.size;}
export function itemAt(gameId,questionId){return bankIndex.get(gameId+':'+questionId);}
const logistic=x=>1/(1+Math.exp(-clamp(x,-30,30)));
export function predicted(theta,item){
 if(!item||!Number.isFinite(theta))return null;
 return item.c+(1-item.c)*logistic(theta-item.b);
}
function firstAttempt(record){
 if(record?.firstAttempt&&typeof record.firstAttempt.correct==='boolean')return record.firstAttempt;
 const attempts=Array.isArray(record?.attempts)?record.attempts:[];
 // Legacy records that lost their first try to a five-attempt cap are excluded.
 if(!attempts.length||record?.seen>attempts.length)return null;
 return [...attempts].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))[0];
}
export function evidenceFor(games,subject,maxItems=120){
 if(!SUBJECTS.has(subject))throw new Error('과목을 확인해 주세요.');
 const evidence=[];
 for(const [gameId,game] of Object.entries(games||{})){
  for(const [qid,record] of Object.entries(game?.records||{})){
   const item=itemAt(gameId,qid);
   if(!item||item.subject!==subject)continue;
   const answer=firstAttempt(record);
   if(!answer||answer.assisted===true||typeof answer.correct!=='boolean'||!Number.isFinite(answer.at))continue;
   evidence.push({item,correct:answer.correct,at:answer.at,id:gameId+':'+qid});
  }
 }
 return evidence.sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id)).slice(0,maxItems);
}
/** Maximum-a-posteriori ability with N(grade starting point, 1.35^2) prior. */
export function estimate(evidence=[],priorMean=0,priorSD=1.35){
 const recent=Array.isArray(evidence)?evidence.slice(0,120):[];
 const mean=clamp(Number.isFinite(priorMean)?priorMean:0,-3,9);
 let theta=mean,information=0;
 for(let j=0;j<32;j++){
  let score=-(theta-mean)/(priorSD*priorSD);
  information=1/(priorSD*priorSD);
  for(const {item,correct} of recent){
   if(!item||!Number.isFinite(item.b)||typeof correct!=='boolean')continue;
   const s=logistic(theta-item.b),c=item.c||0;
   const p=clamp(c+(1-c)*s,1e-8,1-1e-8);
   const dp=(1-c)*s*(1-s),variance=p*(1-p);
   score+=((correct?1:0)-p)*dp/variance;
   information+=dp*dp/variance;
  }
  const step=clamp(score/information,-0.6,0.6);
  theta=clamp(theta+step,-3.8,10);
  if(Math.abs(step)<1e-6)break;
 }
 information=1/(priorSD*priorSD);
 for(const {item} of recent){
  const s=logistic(theta-item.b),c=item.c||0;
  const p=clamp(c+(1-c)*s,1e-8,1-1e-8),dp=(1-c)*s*(1-s);
  information+=dp*dp/(p*(1-p));
 }
 const correctCount=recent.filter(e=>e.correct===true).length;
 return {theta:Number(theta.toFixed(3)),uncertainty:Number((1/Math.sqrt(information)).toFixed(3)),n:recent.length,correct:correctCount,accuracy:recent.length?correctCount/recent.length:0,provisional:true};
}
export function estimateSubject(games,subject,stage=2){
 return estimate(evidenceFor(games,subject),STAGE_DIFFICULTY[stage]??0);
}
/** Descriptive concept gaps, provisional and based on independent first answers. */
export function skillEvidence(games,subject,stage=2){
 const evidence=evidenceFor(games,subject);
 const theta=estimate(evidence,STAGE_DIFFICULTY[stage]??0).theta;
 const groups=new Map();
 for(const e of evidence){
  const skill=e.item.skill;
  const group=groups.get(skill)||{skill,n:0,correct:0,expected:0};
  group.n++;group.correct+=Number(e.correct);group.expected+=predicted(theta,e.item);
  groups.set(skill,group);
 }
 return [...groups.values()].map(g=>({
  skill:g.skill,n:g.n,accuracy:g.correct/g.n,
  // Positive means more mistakes than difficulty-adjusted predictions.
  gap:Number(((g.expected-g.correct)/g.n).toFixed(3)),
  provisional:true
 })).sort((a,b)=>b.gap-a.gap||b.n-a.n||a.skill.localeCompare(b.skill));
}
export function selectQuestions({game,candidates,profile,size,stage}){
 if(!Array.isArray(candidates)||!candidates.length||!Number.isInteger(size)||size<1)return [];
 if(candidates.some(q=>!itemAt(game.id,q.id)))return [];
 const records=profile?.games?.[game.id]?.records||{};
 const model=estimateSubject(profile?.games||{},game.subject,stage);
 const skillNeeds=new Map(skillEvidence(profile?.games||{},game.subject,stage).filter(g=>g.n>=3).map(g=>[g.skill,g.gap]));
 const chosen=[],usedSkills=new Map();
 const goals=size===3?[0.84,0.72,0.62]:[0.84,0.74,0.68,0.61,0.76];
 for(let i=0;i<size;i++){
  const remaining=candidates.filter(q=>!chosen.includes(q.id));
  if(!remaining.length)break;
  const fresh=remaining.filter(q=>!(records[q.id]?.seen));
  // New items prevent memorized responses from dominating learning paths.
  const pool=fresh.length?fresh:remaining;
  const target=goals[i%goals.length];
  const ranked=pool.map(q=>{
   const item=itemAt(game.id,q.id),p=predicted(model.theta,item);
   const seen=records[q.id]?.seen||0,last=records[q.id]?.attempts?.at(-1);
   const skillPenalty=(usedSkills.get(item.skill)||0)*0.2;
   const score=2*Math.abs(p-target)+skillPenalty+Math.min(8,seen)*0.12+(last?.correct?0.09:0)-Math.max(0,skillNeeds.get(item.skill)||0)*0.7;
   return {q,score};
  }).sort((a,b)=>a.score-b.score||a.q.id.localeCompare(b.q.id));
  const pick=ranked[0].q;
  chosen.push(pick.id);
  const skill=itemAt(game.id,pick.id).skill;
  usedSkills.set(skill,(usedSkills.get(skill)||0)+1);
 }
 return chosen.length===size?chosen:[];
}
export function growthProbability(model,nextStage){
 if(!model||!Object.hasOwn(STAGE_DIFFICULTY,nextStage))return null;
 return predicted(model.theta,{b:STAGE_DIFFICULTY[nextStage],c:0.18});
}
/** Optional parent-visible suggestion; never changes a child's grade selection. */
export function workbookRecommendation(profile,grade){
 const grades=['K','G1','G2','G3','G4','G5','G6','M','M1','M2','M3'];
 const pos=grades.indexOf(grade);
 if(pos<0||pos===grades.length-1)return null;
 const answers=evidenceFor(profile?.games||{},'math',120).filter(e=>e.item.gradeBand===grade);
 if(answers.length<12)return null;
 const last=answers.slice(0,20),accuracy=last.filter(a=>a.correct).length/last.length;
 const stage=grade==='K'?1:grade==='G1'?3:4;
 const model=estimateSubject(profile?.games||{},'math',stage);
 const success=predicted(model.theta,{b:GRADE_DIFFICULTY[grades[pos+1]],c:0.1});
 return accuracy>=0.8&&success>=0.55?{next:grades[pos+1],accuracy,distinct:answers.length,probability:success}:null;
}
