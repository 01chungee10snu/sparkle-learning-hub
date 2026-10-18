import {independentAttempts,DAY_MS} from './retrieval.js?v=parent-v14-20261015';

export const MEMORY_MILESTONES=Object.freeze({
  seven:{kind:'memory-7',days:7,label:'기억나비'},
  fourteen:{kind:'memory-14',days:14,label:'별빛 기억축제'},
  thirty:{kind:'memory-30',days:30,label:'기억 수호수'}
});

export function retainedMemoryMoment(gameProgress,roundId){
  const none={kind:'',days:0,items:0,maxDelayDays:0,questionIds:[]};
  if(!gameProgress||typeof roundId!=='string'||!roundId)return none;
  const round=(gameProgress.completedRounds||[]).find(r=>r?.id===roundId);
  if(!round||round.purpose!=='review'||!Array.isArray(round.questionIds))return none;
  let items=0,maxDelayDays=0;const questionIds=[];
  for(const questionId of round.questionIds){
    const record=gameProgress.records?.[questionId];
    if((record?.attempts||[]).some(a=>a?.roundId===roundId&&a.assisted===true))continue;
    const attempts=independentAttempts(record);
    const currentIndex=attempts.findIndex(a=>a.roundId===roundId);
    if(currentIndex<0||attempts[currentIndex].correct!==true)continue;
    let previous=null;
    for(let i=currentIndex-1;i>=0;i--)if(attempts[i].correct===true){previous=attempts[i];break;}
    if(!previous)continue;
    const delay=(attempts[currentIndex].at-previous.at)/DAY_MS;
    if(!Number.isFinite(delay)||delay<7)continue;
    items++;questionIds.push(questionId);
    maxDelayDays=Math.max(maxDelayDays,delay);
  }
  if(!items)return none;
  const milestone=maxDelayDays>=30?MEMORY_MILESTONES.thirty:maxDelayDays>=14?MEMORY_MILESTONES.fourteen:MEMORY_MILESTONES.seven;
  return {kind:milestone.kind,days:milestone.days,items,maxDelayDays:Number(maxDelayDays.toFixed(2)),questionIds};
}
