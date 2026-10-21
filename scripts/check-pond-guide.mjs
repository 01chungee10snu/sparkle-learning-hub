import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as IRT from '../platform/irt.js';
import {choosePondQuestion} from '../platform/pond-learning-guide.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../games/catalog.json',import.meta.url)));
IRT.configureBank(JSON.parse(fs.readFileSync(new URL('../games/irt-bank.json',import.meta.url))));
for(const who of ['se','tae']){
  const profile={games:{}},stages=who==='se'?{math:1,korean:1,english:1,hanja:1}:{math:3,korean:3,english:2,hanja:1};
  const counts={},subjects=new Set(),seen=new Set();let lastSubject='';
  const count=who==='se'?3:5,min=who==='se'?2:3;
  for(let n=0;n<count;n++){
    const neededSubjects=(who==='se'?['math','korean','english']:['math','korean','english','hanja']).filter(s=>!subjects.has(s)).slice(0,Math.max(0,min-subjects.size));
    const pick=choosePondQuestion({catalog,profile,who,stages,learning:{counts,neededSubjects},lastSubject});
    assert(pick,'A fresh, suitable item must be available');
    const key=pick.gameId+':'+pick.questionId;assert(!seen.has(key));seen.add(key);
    const item=IRT.itemAt(pick.gameId,pick.questionId);assert(item.stage<=stages[pick.subject]);
    assert(!/^(?:bebsu|magic)-/.test(pick.gameId));
    if(who==='se')assert.notEqual(pick.subject,'hanja');
    subjects.add(pick.subject);counts[pick.subject]=(counts[pick.subject]||0)+1;lastSubject=pick.subject;
    profile.games[pick.gameId]??={records:{}};
    profile.games[pick.gameId].records[pick.questionId]={seen:1,best:2,firstAttempt:{id:'test-'+n,at:1000+n,correct:false},attempts:[]};
  }
  assert(subjects.size>=min,'Even an all-wrong path covers the minimum subjects');
}
const subjects=['math','korean','english'];
const profile={games:{}};
for(const game of catalog.filter(g=>g.subject==='math')){
  profile.games[game.id]={records:Object.fromEntries((game.questionIds||[]).map((id,i)=>[id,{seen:1,best:10,firstAttempt:{correct:true,at:2000+i,id:'old-'+i}}]))};
}
const pick=choosePondQuestion({catalog,profile,who:'se',stages:{math:1,korean:1,english:1,hanja:1},learning:{counts:{},neededSubjects:[]}});
assert(['korean','english'].includes(pick.subject),'A heavily practiced subject cannot dominate the next fresh selection');
assert.equal(choosePondQuestion({catalog:[],profile:{games:{}},who:'se',stages:{},learning:{}}),null,'An exhausted pool is explicit, never a repeat disguised as new');
const conceptCatalog=[{id:'balanced-math',subject:'math',kind:'quiz',status:'published',stage:1,questionIds:['old-count','new-count','new-shape']}];
IRT.configureBank({version:1,items:conceptCatalog[0].questionIds.map(id=>({gameId:'balanced-math',id,subject:'math',stage:1,b:-2.8,c:.25,skill:id==='new-shape'?'모양':'수 세기'}))});
const conceptProfile={games:{'balanced-math':{records:{'old-count':{seen:1,best:2,firstAttempt:{id:'concept-old',correct:false,at:1000}}}}}};
assert.equal(choosePondQuestion({catalog:conceptCatalog,profile:conceptProfile,who:'se',stages:{math:1},learning:{}}).questionId,'new-shape','Comparable IRT difficulty should cover the less-practised concept');
console.log('PASS_POND_GUIDE: first-attempt novelty, age/stage bounds, IRT ranking, subject distribution after wrong answers, finite-pool signal');
