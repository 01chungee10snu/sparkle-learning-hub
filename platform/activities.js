/** Shared, DOM-free interaction validation and grading. Arrays contain item indices. */
const TYPES=new Set(['choice','build','sequence','match','memory','numeric']);
export const NUMERIC_LIMIT=1000000;
const strings=(items,min,max=min)=>Array.isArray(items)&&items.length>=min&&items.length<=max&&Array.from(items).every(s=>typeof s==='string'&&s.trim())&&new Set(items).size===items.length;
const permutation=(items,size)=>Array.isArray(items)&&items.length===size&&Array.from(items).every(n=>Number.isInteger(n)&&n>=0&&n<size)&&new Set(items).size===size;
const labels=(items,size)=>items===undefined||(Array.isArray(items)&&items.length===size&&Array.from(items).every(s=>typeof s==='string'&&s.trim()));
const typeOf=q=>q?.interaction?.type??'choice';
const fail=()=>{throw new Error('놀이의 문제와 답 형식을 확인해 주세요.');};

/** Numeric answers use strings so older tap-choice answers retain their bounds. */
export function normalizeNumericResponse(response,max=NUMERIC_LIMIT,min=0){
 if(typeof response!=='string'||!Number.isSafeInteger(max)||!Number.isSafeInteger(min)||min< -NUMERIC_LIMIT||max>NUMERIC_LIMIT||min>max)throw new Error('숫자로 답을 확인해 주세요.');
 // Minus variants are accepted at entry, then stored as a single ASCII minus.
 const text=response.trim().replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/[−－]/g,'-');
 if(!/^-?[0-9]{1,7}$/.test(text))throw new Error('숫자로 답을 확인해 주세요.');
 const value=Number(text);
 if(!Number.isSafeInteger(value)||value<min||value>max)throw new Error('숫자로 답을 확인해 주세요.');
 return String(value);
}

export function validateInteraction(q){
 if(!q||typeof q!=='object')fail();
 const type=typeOf(q),i=q.interaction;
 if(!TYPES.has(type)||(i!==undefined&&(!i||typeof i!=='object'||Array.isArray(i)||typeof i.type!=='string')))fail();
 if(type==='choice'){
  if(!strings(q.choices,3,5)||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.choices.length)fail();
 }else{
  // A second answer definition would make grading and explanations disagree.
  if(q.choices!==undefined||q.answer!==undefined)fail();
  if(type==='numeric'&&(!Number.isSafeInteger(i.target)||!Number.isSafeInteger(i.max)||!Number.isSafeInteger(i.min===undefined?0:i.min)||(i.min??0)< -NUMERIC_LIMIT||i.target<(i.min??0)||i.max<i.target||i.max>NUMERIC_LIMIT))fail();
  if(type==='build'&&(!Number.isInteger(i.target)||!Number.isInteger(i.max)||i.target<0||i.max<i.target||i.max>20||typeof i.emoji!=='string'||!i.emoji||typeof i.unit!=='string'||!i.unit))fail();
  if(type==='sequence'||type==='memory'){
   if(!strings(i.items,3,type==='memory'?4:5)||!permutation(i.order,i.items.length)||!labels(i.itemLabels,i.items.length)||!['',' '].includes(i.joiner??' '))fail();
   if(type==='memory'&&!i.itemLabels)fail();
  }
  if(type==='match'&&(!strings(i.left,3)||!strings(i.right,3)||!permutation(i.pairs,3)||!labels(i.rightLabels,3)||(i.leftLang!==undefined&&!['ko-KR','en-US'].includes(i.leftLang))))fail();
 }
 return q;
}

/** Only complete submissions are accepted. UI drafts are deliberately not persisted here. */
export function normalizeResponse(q,response){
 validateInteraction(q);
 const type=typeOf(q),i=q.interaction;
 if(type==='numeric')return normalizeNumericResponse(response,i.max,i.min??0);
 if(type==='choice'||type==='build'){
  const max=type==='choice'?q.choices.length-1:i.max;
  if(!Number.isInteger(response)||response<0||response>max)throw new Error('답을 확인하고 다시 골라 주세요.');
  return response;
 }
 const size=type==='match'?i.left.length:i.items.length;
 if(!permutation(response,size))throw new Error('모든 그림이나 낱말을 한 번씩 골라 주세요.');
 return [...response];
}

function expected(q){
 const type=typeOf(q),i=q.interaction;
 return type==='choice'?q.answer:type==='numeric'?String(i.target):type==='build'?i.target:type==='match'?i.pairs:i.order;
}
export function gradeResponse(q,response){
 const normalized=normalizeResponse(q,response),answer=expected(q);
 return {correct:Array.isArray(answer)?answer.every((n,index)=>normalized[index]===n):normalized===answer,response:normalized};
}
export function responseText(q,response){
 const value=normalizeResponse(q,response),type=typeOf(q),i=q.interaction;
 if(type==='choice')return q.choices[value];
 if(type==='numeric')return value;
 if(type==='build')return `${value}${i.unit}`;
 if(type==='match')return i.left.map((left,n)=>`${left} → ${(i.rightLabels??i.right)[value[n]]}`).join(' · ');
 return value.map(n=>(i.itemLabels??i.items)[n]).join(i.joiner??' ');
}
export function answerText(q){validateInteraction(q);return responseText(q,expected(q));}
