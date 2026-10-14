/** Deterministic learning illustrations; caller owns correctness, IRT and reward ledger. */
const MAX_ENTRIES=64;
const MAX_LABEL_LENGTH=80;
function boundedLabels(items,label) {
  if(!Array.isArray(items)||items.length>MAX_ENTRIES||!items.every(x=>typeof x==='string'&&x.length>0&&x.length<=MAX_LABEL_LENGTH)) throw new RangeError(label+' must contain at most 64 labels of 1-80 characters');
}
export function mergeNumber({left,right,accepted=false}={}) {
  if (![left,right].every(n=>Number.isSafeInteger(n)&&n>0)) throw new RangeError('positive safe integers required');
  const eligible=left===right, sum=eligible?left+right:null;
  if(sum!==null&&!Number.isSafeInteger(sum)) throw new RangeError('overflow');
  return Object.freeze({kind:'merge-number',eligible,result:accepted&&eligible?sum:null,state:accepted&&eligible?'illustrate':'observe',explanation:eligible?`${left} + ${right} = ${sum}; 같은 수 두 개를 합쳤어요.`:`${left}와 ${right}는 서로 다른 수예요.`});
}
export function composeRecipe({ingredients,required,accepted=false}={}) {
  boundedLabels(ingredients,'ingredients'); boundedLabels(required,'required');
  const count=a=>a.reduce((m,v)=>(m[v]=(m[v]||0)+1,m),Object.create(null));
  const a=count(ingredients),b=count(required),matched=Object.keys(a).length===Object.keys(b).length&&Object.keys(b).every(k=>a[k]===b[k]);
  return Object.freeze({kind:'recipe-composition',matched,result:accepted&&matched?'recipe-illustration':null,state:accepted&&matched?'illustrate':'observe',explanation:matched?'재료의 종류와 개수가 모두 맞아요.':'재료의 종류와 개수를 다시 비교해 보세요.'});
}
export function cooperativeGarden({contributions,requiredRoles,accepted=false}={}) {
  boundedLabels(requiredRoles,'requiredRoles');
  if(!Array.isArray(contributions)||contributions.length>MAX_ENTRIES||!contributions.every(c=>c&&typeof c.participant==='string'&&c.participant.length>0&&c.participant.length<=MAX_LABEL_LENGTH&&typeof c.role==='string'&&c.role.length>0&&c.role.length<=MAX_LABEL_LENGTH)) throw new RangeError('invalid contributions');
  const unique=new Map();
  for(const c of contributions) unique.set(JSON.stringify([c.participant,c.role]),c);
  const normalized=[...unique.values()];
  const rolesCovered=requiredRoles.every(r=>normalized.some(c=>c.role===r));
  const distinctParticipants=new Set(normalized.map(c=>c.participant)).size>=2;
  const bloom=accepted&&rolesCovered&&distinctParticipants;
  return Object.freeze({kind:'cooperative-garden',rolesCovered,distinctParticipants,result:bloom?'garden-bloom-illustration':null,state:bloom?'illustrate':'observe',explanation:!rolesCovered?'정원에 필요한 역할을 찾아보세요.':!distinctParticipants?'두 사람이 함께 도와줄 수 있어요.':'함께 역할을 완수해 꽃이 피었어요.'});
}
