import * as Progress from './progress.js';
import * as Retrieval from './retrieval.js?v=parent-v14-20261015';
import * as MemoryModel from './memory-model.js?v=parent-v14-20261015';
import * as IRT from './irt.js';

export const SUBJECTS=['math','korean','english'];
export const DELAY_BUCKETS=Object.freeze([2,4,7,14,30]);
const DAY=Retrieval.DAY_MS;
const rate=(n,d)=>d?n/d:null;

function nearestBucket(days){
 if(days<1)return null;
 return DELAY_BUCKETS.reduce((best,value)=>
   Math.abs(Math.log(days/value))<Math.abs(Math.log(days/best))?value:best,DELAY_BUCKETS[0]);
}

function gameRows(catalog,profile,subject,now,memory){
 const titleById=new Map(catalog.map(g=>[g.id,g.title]));
 const rows=[];
 for(const [gameId,game] of Object.entries(profile.games||{})){
  for(const [questionId,record] of Object.entries(game.records||{})){
   const item=IRT.itemAt(gameId,questionId);
   if(!item||item.subject!==subject)continue;
   const attempts=Array.isArray(record.attempts)?record.attempts:[];
   const independent=Retrieval.independentAttempts(record);
   const review=Retrieval.reviewStatus(record,now,{factor:memory.factor});
   const dueAt=review.last?.correct===true?review.last.at+review.intervalDays*DAY:record.seen?now:null;
   rows.push({gameId,gameTitle:titleById.get(gameId)||gameId,questionId,skill:item.skill,record,attempts,independent,review,dueAt});
  }
 }
 return rows;
}

function delayedRecall(rows){
 const buckets=Object.fromEntries(DELAY_BUCKETS.map(days=>[days,{days,n:0,correct:0,rate:null}]));
 for(const row of rows){
  const attempts=row.independent;
  for(let i=1;i<attempts.length;i++){
   const before=attempts[i-1],after=attempts[i];
   if(before.correct!==true)continue;
   const delay=(after.at-before.at)/DAY,bucket=nearestBucket(delay);
   if(!bucket)continue;
   buckets[bucket].n++;buckets[bucket].correct+=Number(after.correct===true);
  }
 }
 for(const bucket of Object.values(buckets))bucket.rate=rate(bucket.correct,bucket.n);
 return DELAY_BUCKETS.map(days=>buckets[days]);
}

function recovery(rows){
 let opportunities=0,recovered=0;
 for(const row of rows){
  const list=row.independent;
  for(let i=0;i<list.length-1;i++){
   if(list[i].correct!==false)continue;
   opportunities++;recovered+=Number(list[i+1].correct===true);
  }
 }
 return {opportunities,recovered,rate:rate(recovered,opportunities)};
}

function attemptMetric(rows,purpose){
 const attempts=rows.flatMap(row=>row.independent).filter(a=>!purpose||a.purpose===purpose);
 const correct=attempts.filter(a=>a.correct===true).length;
 return {n:attempts.length,correct,rate:rate(correct,attempts.length)};
}

function hintMetric(rows){
 const attempts=rows.flatMap(row=>row.attempts);
 const hinted=attempts.filter(a=>a.assisted===true).length;
 return {n:attempts.length,hinted,rate:rate(hinted,attempts.length)};
}

function recentRounds(profile,catalog,now){
 const weekAgo=now-7*DAY,known=new Set(catalog.map(g=>g.id));let count=0;
 for(const [gameId,game] of Object.entries(profile.games||{})){
  if(!known.has(gameId))continue;
  count+=(game.completedRounds||[]).filter(r=>r.at>=weekAgo&&r.at<=now).length;
 }
 return count;
}

function subjectSummary(catalog,who,profile,subject,now){
 const memory=MemoryModel.estimate(profile.games,subject);
 const rows=gameRows(catalog,profile,subject,now,memory);
 const independent=attemptMetric(rows),review=attemptMetric(rows,'review'),transfer=attemptMetric(rows,'transfer');
 const hints=hintMetric(rows),recover=recovery(rows),dueRows=rows.filter(row=>row.review.due);
 const schedule=rows.filter(row=>row.dueAt!==null).sort((a,b)=>a.dueAt-b.dueAt||a.gameId.localeCompare(b.gameId));
 const stage=Progress.stageSelection(subject,who),ability=Progress.ability(subject,who);
 const gaps=IRT.skillEvidence(profile.games,subject,stage).filter(g=>g.n>=2).slice(0,3);
 return {subject,memory,independent,review,transfer,hints,recovery:recover,delayed:delayedRecall(rows),dueCount:dueRows.length,
  nextDueAt:schedule[0]?.dueAt??null,
  schedule:schedule.slice(0,5).map(row=>({gameId:row.gameId,gameTitle:row.gameTitle,questionId:row.questionId,skill:row.skill,dueAt:row.dueAt,due:row.review.due,intervalDays:row.review.intervalDays})),
  ability:{theta:ability.theta,uncertainty:ability.uncertainty,n:ability.n,provisional:true},gaps};
}

export function build(catalog,{who=Progress.learner(),now=Date.now()}={}){
 if(!['tae','se'].includes(who)||!Array.isArray(catalog))throw new Error('보호자 대시보드의 학습자와 게임 목록을 확인해 주세요.');
 const profile=Progress.exportRecords().platform.profiles[who];
 const subjects=SUBJECTS.map(subject=>subjectSummary(catalog,who,profile,subject,now));
 const total=(key,field)=>subjects.reduce((sum,s)=>sum+(s[key]?.[field]||0),0);
 const independentN=total('independent','n'),independentCorrect=total('independent','correct');
 const hintN=total('hints','n'),hinted=total('hints','hinted');
 const transferN=total('transfer','n'),transferCorrect=total('transfer','correct');
 const recoveryN=subjects.reduce((n,s)=>n+s.recovery.opportunities,0),recovered=subjects.reduce((n,s)=>n+s.recovery.recovered,0);
 const dueCount=subjects.reduce((n,s)=>n+s.dueCount,0),personalizedSubjects=subjects.filter(s=>s.memory.eligible).length;
 const schedule=subjects.flatMap(s=>s.schedule.map(item=>({...item,subject:s.subject}))).sort((a,b)=>a.dueAt-b.dueAt||a.subject.localeCompare(b.subject)).slice(0,8);
 const actions=[];
 if(dueCount)actions.push('지금 복습할 문항이 '+dueCount+'개 있어요. 정답을 보여주기 전에 스스로 떠올릴 시간을 주세요.');
 if(hintN>=5&&hinted/hintN>.3)actions.push('힌트 사용 비율이 높은 편입니다. 첫 10초는 문제를 다시 말해 보게 하고, 그 다음 힌트를 써 보세요.');
 if(recoveryN>=3&&recovered/recoveryN<.6)actions.push('오답 뒤 회복이 아직 불안정합니다. 같은 날 반복보다 다음 날 짧게 다시 꺼내는 편을 우선해 보세요.');
 if(transferN<3)actions.push('전이 기록이 아직 적습니다. 배운 방법을 집의 물건·다른 이야기에서 어디에 쓸 수 있는지 물어보세요.');
 if(personalizedSubjects===0)actions.push('개인화 복습 간격은 아직 기본값을 사용합니다. 지연회상 관측이 과목별 6회 이상 쌓이면 자동 조정합니다.');
 if(!actions.length)actions.push('현재 기록은 안정적입니다. 정답 확인보다 “왜 그렇게 생각했는지”를 설명하게 하는 상호작용을 유지해 주세요.');
 return {who,name:Progress.LEARNERS[who].name,generatedAt:now,recentRounds7d:recentRounds(profile,catalog,now),
  independent:{n:independentN,correct:independentCorrect,rate:rate(independentCorrect,independentN)},
  hints:{n:hintN,hinted,rate:rate(hinted,hintN)},transfer:{n:transferN,correct:transferCorrect,rate:rate(transferCorrect,transferN)},
  recovery:{n:recoveryN,recovered,rate:rate(recovered,recoveryN)},dueCount,personalizedSubjects,subjects,schedule,actions:actions.slice(0,3),
  note:'이 대시보드는 학습 지원용 기술 지표입니다. 학교 성취도·IQ·발달 수준의 진단이나 형제 비교에 사용하지 않습니다.'};
}
