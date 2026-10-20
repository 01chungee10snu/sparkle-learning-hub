import * as Progress from './progress.js';

export const PLAY_BALANCE_KEY='sparkle-play-balance-v1';
const whoList=['tae','se'];
const blankProfile=()=>({plays:0,consumed:[]});
export const blankBalance=()=>({version:1,profiles:{tae:blankProfile(),se:blankProfile()}});
export function validateBalance(raw){
 if(!raw||raw.version!==1||!raw.profiles||Object.keys(raw.profiles).sort().join(',')!=='se,tae')throw Error('놀이 균형 기록을 확인해 주세요.');
 const result=blankBalance();
 for(const who of whoList){
  const p=raw.profiles[who];
  if(!p||!Number.isSafeInteger(p.plays)||p.plays<0||p.plays>1000000||!Array.isArray(p.consumed)||p.consumed.length>100000||p.consumed.some(s=>typeof s!=='string'||s.length>180||!/^[a-z0-9:-]+$/.test(s))||new Set(p.consumed).size!==p.consumed.length)throw Error('놀이 균형 기록을 확인해 주세요.');
  result.profiles[who]={plays:p.plays,consumed:[...p.consumed].sort()};
 }
 return result;
}
export function mergeBalance(a,b){
 a=validateBalance(a??blankBalance());b=validateBalance(b??blankBalance());
 const result=blankBalance();
 for(const who of whoList){result.profiles[who]={plays:Math.max(a.profiles[who].plays,b.profiles[who].plays),consumed:[...new Set([...a.profiles[who].consumed,...b.profiles[who].consumed])].sort()};}
 return validateBalance(result);
}
export function loadBalance(storage=globalThis.localStorage){
 const raw=storage.getItem(PLAY_BALANCE_KEY);
 return raw===null?blankBalance():validateBalance(JSON.parse(raw));
}
export function freshLearning(who,records=Progress.exportRecords()){
 if(!whoList.includes(who))throw Error('아이를 선택해 주세요.');
 const ids=[];
 for(const [gameId,game] of Object.entries(records.platform.profiles[who].games))for(const [qid,r] of Object.entries(game.records||{})){
  const attempts=[...(r.firstAttempt?[r.firstAttempt]:[]),...(r.attempts||[])];
  // Count genuine attempts on *new* questions, not right answers. A young
  // child can think hard, use a hint, and still deserve time to care for
  // their garden; accuracy belongs in the IRT model, never in a play gate.
  if(attempts.some(a=>typeof a.correct==='boolean'))ids.push(`${gameId}:${qid}`);
 }
 return [...new Set(ids)].sort();
}
export function checkPlay(who,{storage=globalThis.localStorage,records}={}){
 const state=loadBalance(storage),p=state.profiles[who];
 if(!p)throw Error('아이를 선택해 주세요.');
 const fresh=freshLearning(who,records).filter(id=>!p.consumed.includes(id));
 return {allowed:p.plays===0||fresh.length>0,fresh};
}
export function recordPlay(who,{storage=globalThis.localStorage,records}={}){
 const state=loadBalance(storage),p=state.profiles[who];
 if(!p)throw Error('아이를 선택해 주세요.');
 const fresh=freshLearning(who,records).filter(id=>!p.consumed.includes(id));
 if(p.plays>0&&!fresh.length)throw Error('새로운 문제를 하나 풀고 다시 놀러 와요!');
 p.plays++;
 p.consumed=[...new Set([...p.consumed,...fresh])].sort();
 storage.setItem(PLAY_BALANCE_KEY,JSON.stringify(state));
 return state;
}
export function importBalance(raw,{storage=globalThis.localStorage}={}){
 const state=mergeBalance(loadBalance(storage),raw);
 storage.setItem(PLAY_BALANCE_KEY,JSON.stringify(state));
 return state;
}
