/** Village adaptive routes: the live catalog and IRT item bank are the only
 * sources of item difficulty. Never silently change the child's grade.
 * Provisional editorial parameters are recommendations, not a diagnosis.
 */
import * as IRT from './irt.js';
import * as Progress from './progress.js';

const SUBJECTS = new Set(['math', 'korean', 'english']);
const GRADE_ORDER = Object.freeze({K:0,G1:1,G2:2,G3:3,G4:4,G5:5,G6:6,M:7,M1:7,M2:8,M3:9});
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const allowed = (entry, subject, grade, stage) => {
  if (entry.kind !== 'quiz' || entry.status !== 'published' || entry.subject !== subject) return false;
  // Full contest papers have an independent strictly ordered 25-item mode.
  if (/^bebsu-(?:g[1-6]|m[1-3])-original$/.test(entry.id)) return false;
  // The child (or parent) explicitly sets grade. Recommendations never promote it.
  if (entry.gradeBand && (GRADE_ORDER[entry.gradeBand] ?? 100) > (GRADE_ORDER[grade] ?? -1))
    return false;
  if (Number.isInteger(entry.stage) && entry.stage > stage + 1) return false;
  return true;
};

export function recommendVillageRoutes(catalog, {
  who = Progress.learner(),
  subject = 'math',
  grade = who === 'se' ? 'K' : 'G1',
  limit = 4
} = {}) {
  if (!['tae','se'].includes(who) || !SUBJECTS.has(subject) ||
      !Object.hasOwn(GRADE_ORDER,grade) || !Number.isInteger(limit) || limit < 1 || limit > 8)
    throw new Error('적응형 도전의 학습자·과목·학년 정보를 확인해 주세요.');
  const stage = Progress.stageSelection(subject,who);
  const ability = Progress.ability(subject,who);
  const choices = catalog.filter(e => allowed(e,subject,grade,stage)).map(game=>{
    const records = Progress.gameProgress(game.id,who).records;
    const available = (game.questionIds||[]).map(id=>IRT.itemAt(game.id,id)).filter(Boolean);
    if (!available.length) return null;
    const recent = available.map(item=>{
      const p = IRT.predicted(ability.theta,item);
      const seen = records[item.id]?.seen||0;
      const ready = p>=0.38 && p<=0.93;
      // Fisher-style information is descriptive under a provisional 1PL model.
      const information = (1-item.c)*(1-item.c)*p*(1-p);
      return {id:item.id,p,seen,ready,information};
    });
    const newItems = recent.filter(q=>!q.seen);
    const eligible = newItems.length>=3 ? newItems : recent;
    const ranked = eligible.map(q=>({
      ...q,
      score:Math.abs(q.p-.74) + (q.ready?0:.6) + Math.min(q.seen,3)*.14 - q.information*.18
    })).sort((a,b)=>a.score-b.score||a.id.localeCompare(b.id));
    const focus = ranked.slice(0,Math.min(ranked.length,5));
    const predictedSuccess = focus.reduce((a,v)=>a+v.p,0)/focus.length;
    const novelty = clamp(newItems.length/Math.max(3,Math.min(5,available.length)),0,1);
    const score = focus.reduce((a,v)=>a+v.score,0)/focus.length
      - novelty*.22 + Math.min(10,Progress.gameProgress(game.id,who).finishedRounds)*.07;
    return {
      gameId:game.id,title:game.title,emoji:game.emoji||'🧩',
      subject,grade,stage:game.stage||null,
      questionCount:available.length,unseenCount:newItems.length,
      predictedSuccess:Number(predictedSuccess.toFixed(3)),
      relativeScore:Number(score.toFixed(4)),provisional:true
    };
  }).filter(Boolean);
  choices.sort((a,b)=>a.relativeScore-b.relativeScore||a.gameId.localeCompare(b.gameId));
  return {
    who,subject,grade,stage,
    ability:{theta:ability.theta,uncertainty:ability.uncertainty,evidence:ability.n,provisional:true},
    routes:choices.slice(0,limit),
    explanation:'1PL·추측 보정 잠정 추정입니다. 문항별 난도는 실증 보정 전이며 자동 진급·능력 진단에 사용하지 않아요.'
  };
}
