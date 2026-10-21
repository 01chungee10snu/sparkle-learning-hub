import * as IRT from './irt.js';

const SUBJECTS=['math','korean','english','hanja'];
const GRADES={K:0,G1:1,G2:2,G3:3,G4:4,G5:5,G6:6,M:7,M1:7,M2:8,M3:9};
const excluded=id=>/^(?:bebsu-(?:g[1-6]|m[1-3])-original|magic-(?:g[1-6]|m[1-3])-challenge)$/.test(id);

/** Content balance is decided before the provisional IRT difficulty ranking. */
export function choosePondQuestion({catalog,profile,who,stages,learning={},lastSubject=''}={}){
  const permitted=who==='se'?SUBJECTS.slice(0,3):SUBJECTS;
  const loads=Object.fromEntries(SUBJECTS.map(s=>[s,0]));
  const lastAt=Object.fromEntries(SUBJECTS.map(s=>[s,0]));
  const seenFamilies=new Set();
  const skillLoads=new Map(),exposures=[];
  for(const entry of catalog){
    for(const [id,record] of Object.entries(profile.games?.[entry.id]?.records||{})){
      if(!record.seen)continue;
      loads[entry.subject]=(loads[entry.subject]||0)+1;
      lastAt[entry.subject]=Math.max(lastAt[entry.subject]||0,record.firstAttempt?.at||record.attempts?.[0]?.at||0);
      const evidence=IRT.itemAt(entry.id,id),family=evidence?.family;if(family)seenFamilies.add(family);
      if(evidence?.skill){const key=entry.subject+':'+evidence.skill;skillLoads.set(key,(skillLoads.get(key)||0)+1);exposures.push({key,at:record.firstAttempt?.at||record.attempts?.[0]?.at||0});}
    }
  }
  const recentSkills=new Map();
  for(const row of exposures.sort((a,b)=>b.at-a.at).slice(0,20))recentSkills.set(row.key,(recentSkills.get(row.key)||0)+1);
  const groups=new Map();
  for(const subject of permitted){
    const stage=stages[subject]||1,model=IRT.estimateSubject(profile.games,subject,stage),pool=[];
    for(const entry of catalog){
      if(entry.kind!=='quiz'||entry.status!=='published'||entry.subject!==subject||excluded(entry.id))continue;
      if(subject==='hanja'&&entry.id!=='hanja-h8')continue;
      if(subject!=='hanja'&&entry.gradeBand&&(GRADES[entry.gradeBand]??99)>(who==='se'?0:1))continue;
      if(entry.stage&&entry.stage>stage)continue;
      for(const id of entry.questionIds||[]){
        const evidence=IRT.itemAt(entry.id,id),record=profile.games?.[entry.id]?.records?.[id];
        if(record?.seen||!evidence||evidence.stage>stage||(evidence.family&&seenFamilies.has(evidence.family)))continue;
        const p=IRT.predicted(model.theta,evidence);
        // An accessible start, followed by a slightly broader challenge once
        // that subject has independent evidence. Wrong answers lower theta.
        const target=model.n<3?.84:.78;
        pool.push({gameId:entry.id,questionId:id,subject,predictedSuccess:p,
          score:Math.abs(p-target),difficulty:evidence.b,skill:evidence.skill,provisional:true});
      }
    }
    pool.sort((a,b)=>a.score-b.score||a.difficulty-b.difficulty||a.gameId.localeCompare(b.gameId)||a.questionId.localeCompare(b.questionId));
    if(pool.length){
      // Among similarly suitable IRT candidates, cover less-practised concepts.
      // The tolerance bounds the difficulty trade-off instead of sending a
      // child to a much harder item merely to fill a content quota.
      const nearby=pool.filter(item=>item.score<=pool[0].score+.08);
      nearby.sort((a,b)=>(recentSkills.get(subject+':'+a.skill)||0)-(recentSkills.get(subject+':'+b.skill)||0)||
        (skillLoads.get(subject+':'+a.skill)||0)-(skillLoads.get(subject+':'+b.skill)||0)||a.score-b.score||a.questionId.localeCompare(b.questionId));
      groups.set(subject,nearby);
    }
  }
  const counts=learning.counts||{},needed=new Set(learning.neededSubjects||[]);
  const subjects=[...groups.keys()].sort((a,b)=>
    Number(needed.has(b))-Number(needed.has(a))||
    (counts[a]||0)-(counts[b]||0)||Number(a===lastSubject)-Number(b===lastSubject)||
    (loads[a]||0)-(loads[b]||0)||(lastAt[a]||0)-(lastAt[b]||0)||SUBJECTS.indexOf(a)-SUBJECTS.indexOf(b));
  if(!subjects.length)return null;
  return {...groups.get(subjects[0])[0],availableSubjects:subjects};
}
