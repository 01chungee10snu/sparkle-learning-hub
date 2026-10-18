import * as IRT from './irt.js';
import {independentAttempts} from './retrieval.js?v=parent-v14-20261015';

export const BASE_HALF_LIFE_DAYS=7;
export const MIN_PERSONALIZATION_OBSERVATIONS=6;
const MIN_DELAY_DAYS=.25;
const MAX_HALF_LIFE_DAYS=28;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));

export function observations(games,subject){
 const rows=[];
 for(const [gameId,game] of Object.entries(games||{})){
  for(const [questionId,record] of Object.entries(game?.records||{})){
   const item=IRT.itemAt(gameId,questionId);
   if(!item||item.subject!==subject)continue;
   const attempts=independentAttempts(record);
   for(let i=1;i<attempts.length;i++){
    const previous=attempts[i-1],next=attempts[i];
    // Forgetting is estimated only after a successful independent retrieval.
    if(previous.correct!==true)continue;
    const delayDays=(next.at-previous.at)/(24*60*60*1000);
    if(!Number.isFinite(delayDays)||delayDays<MIN_DELAY_DAYS)continue;
    rows.push({
     gameId,questionId,skill:item.skill,delayDays,
     correct:next.correct,c:Number.isFinite(item.c)?item.c:0
    });
   }
  }
 }
 return rows.sort((a,b)=>a.delayDays-b.delayDays||a.gameId.localeCompare(b.gameId)||a.questionId.localeCompare(b.questionId));
}

const probability=(halfLifeDays,row)=>{
 const memory=Math.pow(.5,row.delayDays/halfLifeDays);
 return clamp(row.c+(1-row.c)*memory,1e-5,1-1e-5);
};

export function estimate(games,subject){
 const rows=observations(games,subject);
 let best={halfLifeDays:BASE_HALF_LIFE_DAYS,loss:Infinity};
 // A log prior centered on the default schedule prevents sparse histories from
 // producing extreme personalized intervals.
 for(let h=2;h<=MAX_HALF_LIFE_DAYS;h+=.25){
  let loss=.5*Math.pow(Math.log(h/BASE_HALF_LIFE_DAYS)/.62,2);
  for(const row of rows){
   const p=probability(h,row);
   loss-=row.correct?Math.log(p):Math.log(1-p);
  }
  if(loss<best.loss)best={halfLifeDays:h,loss};
 }
 const maxDelay=rows.reduce((m,r)=>Math.max(m,r.delayDays),0);
 const eligible=rows.length>=MIN_PERSONALIZATION_OBSERVATIONS&&maxDelay>=2;
 const rawFactor=best.halfLifeDays/BASE_HALF_LIFE_DAYS;
 const factor=eligible?clamp(rawFactor,.65,1.6):1;
 const halfLifeDays=eligible?best.halfLifeDays:BASE_HALF_LIFE_DAYS;
 const successes=rows.filter(r=>r.correct).length;
 return {
  subject,n:rows.length,successes,accuracy:rows.length?successes/rows.length:null,
  maxDelayDays:Number(maxDelay.toFixed(2)),
  halfLifeDays:Number(halfLifeDays.toFixed(2)),
  factor:Number(factor.toFixed(3)),
  eligible,
  evidenceStrength:Number(Math.min(1,rows.length/20).toFixed(2)),
  provisional:true
 };
}

export function predictedRetention(model,days,guessing=.1){
 if(!model||!Number.isFinite(days)||days<0)return null;
 const h=model.halfLifeDays||BASE_HALF_LIFE_DAYS;
 const memory=Math.pow(.5,days/h);
 return clamp(guessing+(1-guessing)*memory,0,1);
}
