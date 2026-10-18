export const RELATIONSHIP_KEY='sparkle-village-relationships-v1';
const KIDS=new Set(['tae','se']);
export const NPCS=Object.freeze(['bunny','cat','squirrel','owl','tutor']);
const NPC_SET=new Set(NPCS);
const SUBJECT_NPC=Object.freeze({math:'owl',korean:'bunny',english:'cat',hanja:'tutor'});
const MAX_EVENTS=5000;
const SAFE_EVENT=/^[a-zA-Z0-9:_-]{1,420}$/;
const plain=v=>v!==null&&typeof v==='object'&&!Array.isArray(v)&&
  (Object.getPrototypeOf(v)===Object.prototype||Object.getPrototypeOf(v)===null);
const bag=()=>Object.create(null);
const blankProfile=()=>({events:bag()});
export const emptyRelationships=()=>({version:1,profiles:{tae:blankProfile(),se:blankProfile()}});

function cleanEvent(id,value){
 if(!SAFE_EVENT.test(id)||!plain(value))return null;
 if(!['visit','memory'].includes(value.type)||!NPC_SET.has(value.npcId))return null;
 if(!Number.isSafeInteger(value.at)||value.at<0)return null;
 if(value.type==='visit'){
   if(!/^[0-9]{8}$/.test(value.day||''))return null;
   return {type:'visit',npcId:value.npcId,at:value.at,day:value.day};
 }
 if(!['memory-7','memory-14','memory-30'].includes(value.tier)||typeof value.roundId!=='string'||value.roundId.length>128)
   return null;
 if(value.subject!==undefined&&!['math','korean','english','hanja'].includes(value.subject))return null;
 return {type:'memory',npcId:value.npcId,at:value.at,tier:value.tier,roundId:value.roundId,
   ...(value.subject?{subject:value.subject}:{})};
}
export function cleanRelationships(raw){
 const out=emptyRelationships();
 if(!plain(raw)||raw.version!==1)return out;
 for(const who of KIDS){
   const source=raw.profiles?.[who]?.events;
   if(!plain(source))continue;
   const entries=Object.entries(source);
   if(entries.length>MAX_EVENTS)throw new Error('친구 관계 기록 저장 한도를 초과했어요.');
   for(const [id,value] of entries){
     const event=cleanEvent(id,value);
     if(event)out.profiles[who].events[id]=event;
   }
 }
 return out;
}
const dateKey=at=>{
 const d=new Date(at);
 const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');
 return ''+y+m+day;
};
export function recordVisit(state,{who,npcId,at=Date.now()}){
 if(!KIDS.has(who)||!NPC_SET.has(npcId)||!Number.isSafeInteger(at)||at<0)
   throw new Error('친구 만남 정보를 확인해 주세요.');
 const out=cleanRelationships(state),day=dateKey(at),id='visit:'+npcId+':'+day;
 const added=!out.profiles[who].events[id];
 if(added)out.profiles[who].events[id]={type:'visit',npcId,at,day};
 return {state:out,added,eventId:id};
}
export function recordMemory(state,{who,subject='',tier,roundId,at=Date.now()}){
 if(!KIDS.has(who)||!['memory-7','memory-14','memory-30'].includes(tier)||
    typeof roundId!=='string'||!roundId||roundId.length>128||!Number.isSafeInteger(at)||at<0)
   throw new Error('기억 친구 기록을 확인해 주세요.');
 if(subject&&!['math','korean','english','hanja'].includes(subject))throw new Error('기억 과목을 확인해 주세요.');
 const npcId=SUBJECT_NPC[subject]||'squirrel';
 const out=cleanRelationships(state),id='memory:'+tier+':'+roundId;
 const added=!out.profiles[who].events[id];
 if(added)out.profiles[who].events[id]={type:'memory',npcId,at,tier,roundId,...(subject?{subject}:{})};
 return {state:out,added,eventId:id,npcId};
}
const defaults=Object.freeze({
 bunny:['친구야, 문제를 풀러 갈까?','길을 누르면 내가 안내해!'],
 cat:['별은 선물 가게에서 써!','오늘도 네 마을을 구경할래.'],
 squirrel:['길을 터치하면 움직여!','수정구슬이 오늘의 배움을 추천해!'],
 owl:['생각하는 힘을 천천히 펼쳐 봐!','전에 배운 방법도 다시 떠올려 보자.'],
 tutor:['오늘도 차근차근 만나 보자!','네가 생각한 방법을 말해 줘.']
});
function npcSummary(events,npcId){
 const rows=Object.values(events).filter(e=>e.npcId===npcId);
 const visits=rows.filter(e=>e.type==='visit').length;
 const memory7=rows.filter(e=>e.type==='memory'&&e.tier==='memory-7').length;
 const memory14=rows.filter(e=>e.type==='memory'&&e.tier==='memory-14').length;
 const memory30=rows.filter(e=>e.type==='memory'&&e.tier==='memory-30').length;
 const lastSeenAt=rows.reduce((m,e)=>Math.max(m,e.at||0),0);
 const level=memory30>0?'guardian':memory14>0?'special':memory7>0||visits>=4?'friend':visits>0?'familiar':'new';
 return {id:npcId,visits,memory7,memory14,memory30,lastSeenAt,level};
}
function linesFor(summary){
 const [first,second]=defaults[summary.id]||['반가워!','마을에서 다시 만나자.'];
 if(summary.memory30>0){
   if(summary.id==='owl')return ['한 달 전 배운 방법을 다시 꺼냈구나!','기억 수호수가 네 배움을 오래 지켜보고 있어.'];
   return ['한 달이 지나도 그 배움을 기억하고 있구나!','기억 수호수가 마을에 뿌리내렸어.'];
 }
 if(summary.memory14>0){
   if(summary.id==='owl')return ['오래전 배운 방법을 다시 꺼냈구나!','별빛 언덕에서도 네 기억을 봤어.'];
   return ['오래 지난 기억을 스스로 다시 찾았구나!','우리 마을에 별빛 친구가 머물기 시작했어.'];
 }
 if(summary.memory7>0)return ['며칠 전 배운 걸 아직 기억하고 있네!','기억나비도 네 곁에 놀러 왔어.'];
 if(summary.visits>=4)return ['또 왔구나! 이제 네 발소리도 알아.','오늘은 어떤 배움을 마을에 남길까?'];
 if(summary.visits>0)return ['다시 만나서 반가워!','지난번보다 마을이 조금 더 익숙하지?'];
 return [first,second];
}
export function familyResidentSnapshot(state){
 const clean=cleanRelationships(state),events=['tae','se'].flatMap(who=>Object.values(clean.profiles[who].events));
 const memory7=events.filter(e=>e.type==='memory'&&e.tier==='memory-7').length;
 const memory14=events.filter(e=>e.type==='memory'&&e.tier==='memory-14').length;
 const memory30=events.filter(e=>e.type==='memory'&&e.tier==='memory-30').length;
 return {memoryButterfly:memory7+memory14+memory30>0,starlightOwl:memory14+memory30>0,memoryGuardian:memory30>0};
}
export function relationshipSnapshot(state,who){
 if(!KIDS.has(who))throw new Error('학습자를 확인해 주세요.');
 const clean=cleanRelationships(state),events=clean.profiles[who].events;
 const npcs=NPCS.map(id=>{const row=npcSummary(events,id),[line1,line2]=linesFor(row);return {...row,line1,line2};});
 const all=Object.values(events),memory7=all.filter(e=>e.type==='memory'&&e.tier==='memory-7').length,
   memory14=all.filter(e=>e.type==='memory'&&e.tier==='memory-14').length,
   memory30=all.filter(e=>e.type==='memory'&&e.tier==='memory-30').length;
 return {who,npcs,residents:{memoryButterfly:memory7+memory14+memory30>0,starlightOwl:memory14+memory30>0,memoryGuardian:memory30>0},
   totals:{visits:all.filter(e=>e.type==='visit').length,memory7,memory14,memory30}};
}
let inMemory=emptyRelationships(),dirty=false;
export function loadRelationships(storage=globalThis.localStorage){
 if(dirty)return cleanRelationships(inMemory);
 try{
   const raw=storage?.getItem(RELATIONSHIP_KEY);
   inMemory=raw?cleanRelationships(JSON.parse(raw)):emptyRelationships();
   return cleanRelationships(inMemory);
 }catch{return cleanRelationships(inMemory);}
}
export function saveRelationships(state,storage=globalThis.localStorage){
 inMemory=dirty?mergeRelationships(inMemory,state):cleanRelationships(state);dirty=true;
 if(!storage)return false;
 try{
   const raw=storage.getItem(RELATIONSHIP_KEY);
   if(raw)inMemory=mergeRelationships(cleanRelationships(JSON.parse(raw)),inMemory);
   storage.setItem(RELATIONSHIP_KEY,JSON.stringify(inMemory));dirty=false;return true;
 }catch{return false;}
}
export function mergeRelationships(current,incoming){
 const a=cleanRelationships(current),b=cleanRelationships(incoming);
 for(const who of KIDS)Object.assign(a.profiles[who].events,b.profiles[who].events);
 return cleanRelationships(a);
}
export function exportRelationships(storage=globalThis.localStorage){return cleanRelationships(loadRelationships(storage));}
export function importRelationships(raw,storage=globalThis.localStorage){
 const merged=mergeRelationships(loadRelationships(storage),raw);
 saveRelationships(merged,storage);return merged;
}
