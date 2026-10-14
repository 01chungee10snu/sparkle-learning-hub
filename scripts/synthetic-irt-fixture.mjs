import * as IRT from '../platform/irt.js';
/** Provisional testing descriptors for fabricated quiz catalog items only. */
export function configureSyntheticBank(catalog){
 const items=catalog.filter(g=>g.kind==='quiz').flatMap(g=>g.questionIds.map((id,i)=>({gameId:g.id,id,subject:g.subject,skill:g.subject+'.fixture',b:(i%12-6)*0.18,c:0.2})));
 return IRT.configureBank({version:1,items});
}
