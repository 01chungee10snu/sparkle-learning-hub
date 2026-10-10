import {gameProgress,learner,stageSelection,saveStageSelection,ability} from './progress.js';
import {growthProbability,bankSize} from './irt.js';
/** These thresholds are product assumptions, not a diagnostic or age-based standard. */
export const STAGES={
 1:{name:'씨앗',emoji:'🌱',description:'그림과 소리로 발견해요.',focus:'수 세기 · 말소리 · 듣고 고르기'},
 2:{name:'새싹',emoji:'🌿',description:'작은 규칙을 찾아보아요.',focus:'수 모으기 · 낱말 · 소리와 글자'},
 3:{name:'꽃잎',emoji:'🌷',description:'읽고 생각하며 풀어보아요.',focus:'생활 계산 · 문장 이해 · 짧은 표현'},
 4:{name:'열매',emoji:'🍓',description:'배운 것을 새로운 이야기에 써요.',focus:'단위와 비율 · 이유 찾기 · 문장 만들기'}
};
export const GROWTH_RULES=Object.freeze({recentAttempts:8,minimumDistinctCorrect:6,minimumCompletedRounds:2,advanceAccuracy:0.8,practiceAccuracy:0.5,reviewAfterDays:2});
export const selectedStage=(subject,who=learner())=>stageSelection(subject,who);
export function setStage(subject,n,who=learner()){return saveStageSelection(subject,n,who);}
export function recommendation(subject,catalog,who=learner()){
 const stage=selectedStage(subject,who),entries=catalog.filter(g=>g.growth===true&&g.stage===stage&&g.subject===subject&&g.kind==='quiz'&&g.status==='published');
 const all=[],completed=new Set();let reviewDue=false;
 const reviewBefore=Date.now()-GROWTH_RULES.reviewAfterDays*24*60*60*1000;
 for(const entry of entries){
  const p=gameProgress(entry.id,who),allowed=new Set(entry.questionIds||[]);
  // Count only complete rounds with recorded attempts for every question. Legacy
  // round counters preserve rewards but cannot establish current readiness.
  for(const r of p.completedRounds||[]){
   if(r.questionIds.every(qid=>allowed.has(qid)&&(p.records[qid]?.attempts||[]).some(a=>a.roundId===r.id&&a.at<=r.at)))completed.add(`${entry.id}:${r.id}`);
  }
  for(const [qid,r] of Object.entries(p.records)){
   if(!allowed.has(qid))continue;
   const questionKey=`${entry.id}:${qid}`,attempts=(r.attempts||[]).slice().sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));
   for(const a of attempts)if(a.assisted!==true){const item={...a,key:questionKey,gameId:entry.id};all.push(item);}
   const lastCorrect=attempts.filter(a=>a.correct).at(-1);
   if(lastCorrect&&lastCorrect.at<=reviewBefore)reviewDue=true;
  }
 }
 const recent=all.sort((a,b)=>b.at-a.at||b.id.localeCompare(a.id)).slice(0,GROWTH_RULES.recentAttempts);
 const recentCount=recent.length,accuracy=recentCount?recent.filter(a=>a.correct).length/recentCount:0;
 const recentLatest=new Map();for(const a of recent)if(!recentLatest.has(a.key))recentLatest.set(a.key,a);
 const distinctCorrect=[...recentLatest.values()].filter(a=>a.correct).length,completedRounds=completed.size;
 const enough=recentCount===GROWTH_RULES.recentAttempts&&distinctCorrect>=GROWTH_RULES.minimumDistinctCorrect&&completedRounds>=GROWTH_RULES.minimumCompletedRounds;
 const ready=enough&&accuracy>=GROWTH_RULES.advanceAccuracy;
 const hasNext=catalog.some(g=>g.growth===true&&g.stage===stage+1&&g.subject===subject&&g.kind==='quiz'&&g.status==='published');
 const model=ability(subject,who),nextProbability=growthProbability(model,stage+1);
 // Preserve the two-round and distinct-item requirements. An uncertain provisional
 // model may only veto extreme mismatches; it cannot promote without observed work.
 const modelAllows=!bankSize()||(model.n>=8&&nextProbability!==null&&nextProbability>=0.55);
 const canAdvance=stage<4&&hasNext&&ready&&modelAllows;
 const easier=stage>1&&completedRounds>=GROWTH_RULES.minimumCompletedRounds&&recentCount>=6&&accuracy<GROWTH_RULES.practiceAccuracy;
 const action=canAdvance?'advance':easier?'practice':'stay',suggestedStage=canAdvance?stage+1:easier?stage-1:stage;
 let reason='놀이를 더 해 보면 알맞은 다음 걸음을 추천해요.';
 if(canAdvance)reason='여러 문제에서 개념을 확인했어요. 다음 단계에 도전해 볼까요?';
 else if(easier)reason='이전 단계의 그림 놀이로 개념을 다시 만나 보아요.';
 else if(stage===4&&ready)reason='마지막 단계에서도 잘 풀고 있어요. 새 이야기와 복습을 이어가요.';
 else if(reviewDue)reason='전에 푼 개념을 다시 떠올릴 때예요. 같은 단계에서 복습해요.';
 else if(recentCount)reason='지금 단계의 다른 문제도 풀며 개념을 다져요.';
 return {subject,stage,suggestedStage,action,reviewDue,accuracy,recentCount,distinctCorrect,completedRounds,reason,canAdvance,abilityEvidence:model.n,abilityUncertainty:model.uncertainty,nextProbability,provisional:true};
}
