import * as Progress from './progress.js';
import * as Growth from './growth.js';
import * as IRT from './irt.js';
import * as Retrieval from './retrieval.js?v=parent-v14-20261015';
import * as MemoryModel from './memory-model.js?v=parent-v14-20261015';

const SUBJECTS=['math','korean','english','hanja'];
export const REVIEW_AFTER_MS=2*Retrieval.DAY_MS; // minimum interval; later successes expand to 4/7/14/30 days.
const EXCLUDED=id=>/^bebsu-(?:g[1-6]|m[1-3])-original$/.test(id)||/^magic-(?:g[1-6]|m[1-3])-challenge$/.test(id);
const isPlayable=e=>e?.kind==='quiz'&&e.status==='published'&&!EXCLUDED(e.id);
export function reviewDue(record,now=Date.now()){return Retrieval.isReviewDue(record,now);}
function compatible(entry,subject,stage){
 if(!isPlayable(entry)||entry.subject!==subject)return false;
 // The Hanja grade path is independently chosen. Start the daily mixed
 // curriculum with the 8급 foundation; never auto-certify a higher grade.
 if(subject==='hanja')return entry.id==='hanja-h8';
 if(entry.growth===true)return entry.stage===stage;
 if(entry.adventure===true)return (entry.minStage??1)<=stage&&(entry.maxStage??4)>=stage;
 return false;
}
function dueStats(entry,who,now,factor=1){
 const records=Progress.gameProgress(entry.id,who).records;
 const due=(entry.questionIds||[]).filter(id=>Retrieval.isReviewDue(records[id],now,{factor}));
 return {count:due.length,ids:due};
}
function skillMatch(entry,skill){
 if(!skill)return 0;
 let n=0;
 for(const id of entry.questionIds||[])if(IRT.itemAt(entry.id,id)?.skill===skill)n++;
 return n;
}
function subjectState(catalog,who,subject,now,profile){
 const stage=Progress.stageSelection(subject,who),rec=Growth.recommendation(subject,catalog,who),memory=MemoryModel.estimate(profile.games,subject);
 const skills=IRT.skillEvidence(profile.games,subject,stage);
 const focus=skills.find(s=>s.n>=2&&s.gap>0.04)||skills.find(s=>s.n>=2)||null;
 const games=catalog.filter(e=>compatible(e,subject,stage));
 const due=games.map(entry=>({entry,...dueStats(entry,who,now,memory.factor)})).filter(x=>x.count>0)
   .sort((a,b)=>b.count-a.count||Progress.gameProgress(a.entry.id,who).lastPlayed-Progress.gameProgress(b.entry.id,who).lastPlayed||a.entry.id.localeCompare(b.entry.id));
 return {subject,stage,rec,focus,games,due,memory};
}
const mission=(order,kind,entry,strategy,reason,skill='')=>({
 order,kind,gameId:entry.id,subject:entry.subject,title:entry.title,emoji:entry.emoji||'✨',
 strategy,reason,skill,provisional:true
});
export function plan(catalog,{who=Progress.learner(),now=Date.now(),preferredSubject=''}={}){
 if(!['tae','se'].includes(who)||!Array.isArray(catalog))throw new Error('학습 계획의 학습자와 게임 목록을 확인해 주세요.');
 if(preferredSubject&&!SUBJECTS.includes(preferredSubject))preferredSubject='';
 const profile=Progress.exportRecords().platform.profiles[who],summary=Progress.summary(catalog,who);
 const loads=Object.fromEntries(SUBJECTS.map(subject=>[subject,summary.games.filter(g=>g.subject===subject).reduce((sum,g)=>sum+g.rounds,0)]));
 const states=SUBJECTS.map(subject=>subjectState(catalog,who,subject,now,profile));
 const used=new Set(),missions=[];

 // 1) Retrieval first: revisit an independently attempted item only when it is wrong or spaced by >=2 days.
 const review=states.flatMap(s=>s.due.map(d=>({state:s,...d})))
   .sort((a,b)=>b.count-a.count||Number(b.state.subject===preferredSubject)-Number(a.state.subject===preferredSubject)||a.entry.id.localeCompare(b.entry.id))[0];
 if(review){
  const reason=review.count===1?'전에 만난 문제를 힌트 없이 다시 떠올려 봐요.':
    '전에 만난 문제 '+review.count+'개가 다시 떠올릴 때가 되었어요.';
  missions.push(mission(1,'review',review.entry,'review',reason,review.state.focus?.skill||''));
  used.add(review.entry.id);
 }

 // 2) Productive challenge: focus on the largest descriptive skill gap, without changing stage.
 const challengeStates=[...states].sort((a,b)=>{
  const ag=Math.max(0,a.focus?.gap||0),bg=Math.max(0,b.focus?.gap||0);
  const ap=Number(a.subject===preferredSubject),bp=Number(b.subject===preferredSubject);
  return (bg+bp*.12)-(ag+ap*.12)||(loads[a.subject]||0)-(loads[b.subject]||0)||a.subject.localeCompare(b.subject);
 });
 let challenge=null,challengeState=null;
 for(const state of challengeStates){
  const ranked=state.games.filter(e=>!used.has(e.id)).map(entry=>({
   entry,match:skillMatch(entry,state.focus?.skill),growth:Number(entry.growth===true),
   rounds:Progress.gameProgress(entry.id,who).finishedRounds,last:Progress.gameProgress(entry.id,who).lastPlayed
  })).sort((a,b)=>b.match-a.match||b.growth-a.growth||a.rounds-b.rounds||a.last-b.last||a.entry.id.localeCompare(b.entry.id));
  if(ranked.length){challenge=ranked[0].entry;challengeState=state;break;}
 }
 if(challenge){
  const focus=challengeState.focus;
  const reason=focus&&focus.n>=2&&focus.gap>0.04?
    '최근 풀이에서 더 연습할 가치가 있는 '+focus.skill+'을(를) 알맞은 난도로 연습해요.':
    '현재 단계에서 새 문제를 적정 난도로 만나며 이해를 넓혀요.';
  missions.push(mission(missions.length+1,'challenge',challenge,'adaptive',reason,focus?.skill||''));
  used.add(challenge.id);
 }

 // 3) Transfer: prefer an adventure sharing the focus skill but in another context.
 const targetState=challengeState||states.find(s=>s.subject===preferredSubject)||states[0];
 const transferPool=catalog.filter(e=>isPlayable(e)&&e.adventure===true&&!used.has(e.id)).map(entry=>{
  const state=states.find(s=>s.subject===entry.subject),stage=state?.stage??1;
  if((entry.minStage??1)>stage||(entry.maxStage??4)<stage)return null;
  const focus=entry.subject===targetState.subject?targetState.focus:null;
  return {entry,match:skillMatch(entry,focus?.skill),same:Number(entry.subject===targetState.subject),
    rounds:Progress.gameProgress(entry.id,who).finishedRounds,last:Progress.gameProgress(entry.id,who).lastPlayed,
    focus};
 }).filter(Boolean).sort((a,b)=>b.match-a.match||b.same-a.same||a.rounds-b.rounds||a.last-b.last||a.entry.id.localeCompare(b.entry.id));
 if(transferPool.length){
  const pick=transferPool[0],reason=pick.match>0&&pick.focus?.skill?
    pick.focus.skill+'을(를) 다른 이야기와 활동에서 다시 써 봐요.':
    '배운 방법을 다른 이야기와 활동에 적용해 전이해 봐요.';
  missions.push(mission(missions.length+1,'transfer',pick.entry,'adaptive',reason,pick.focus?.skill||''));
  used.add(pick.entry.id);
 }

 // New learners may not yet have a spaced review; still keep three short, distinct steps.
 if(!review&&missions.length<3){
  const state=states.slice().sort((a,b)=>Number(b.subject===preferredSubject)-Number(a.subject===preferredSubject)||
    (loads[a.subject]||0)-(loads[b.subject]||0)||a.subject.localeCompare(b.subject))[0];
  const fresh=state.games.filter(e=>!used.has(e.id)).sort((a,b)=>
    Progress.gameProgress(a.id,who).finishedRounds-Progress.gameProgress(b.id,who).finishedRounds||a.id.localeCompare(b.id))[0];
  if(fresh){
   missions.unshift(mission(1,'foundation',fresh,'adaptive','오늘 처음 만나는 문제를 내 힘으로 먼저 생각해 봐요.',state.focus?.skill||''));
   for(let i=0;i<missions.length;i++)missions[i].order=i+1;
  }
 }
 return {
  who,preferredSubject:SUBJECTS.includes(preferredSubject)?preferredSubject:'',
  missions:missions.slice(0,3),
  principle:'다시 떠올리기 → 알맞은 도전 → 다른 맥락에 적용',
  note:'게임 진행용 추천이며 학업 능력·IQ·발달 진단이 아닙니다. 난이도는 기존 IRT 근거만 사용합니다.'
 };
}
