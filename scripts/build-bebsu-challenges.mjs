/** Generate a deterministic 25-item KMA challenge registry from approved imported items.
 * Relative paper difficulty uses provisional editorial IRT b; it is NOT
 * an empirical calibration and must not trigger grade promotion.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const bank=read('games/irt-bank.json');
const lookup=new Map(bank.items.map(item=>[item.id,item.b]));
const grades=[
 ['g1','초등 1학년'],['g2','초등 2학년'],['g3','초등 3학년'],
 ['g4','초등 4학년'],['g5','초등 5학년'],['g6','초등 6학년'],
 ['m1','중등 1학년'],['m2','중등 2학년'],['m3','중등 3학년']
];
const levels=['기본','도전','심화'];
const items=grades.map(([grade,title])=>{
 const gameId='bebsu-'+grade+'-original',game=read('games/'+gameId+'/game.json');
 const groups=new Map();
 for(const q of game.questions){
  const match=/^kma:([0-9]+):/.exec(q.source?.id??'');
  if(!match||!Number.isInteger(q.provenance?.examQuestionNo))continue;
  const exam=match[1];
  if(!groups.has(exam))groups.set(exam,[]);
  groups.get(exam).push(q);
 }
 const sheets=[];
 for(const [exam,questions] of groups){
  const qs=questions.filter(q=>q.provenance.examQuestionNo>=1&&q.provenance.examQuestionNo<=25)
   .sort((a,b)=>a.provenance.examQuestionNo-b.provenance.examQuestionNo);
  if(qs.length!==25||qs.some((q,i)=>q.provenance.examQuestionNo!==i+1))continue;
  if(qs.some(q=>q.provenance.answerVerificationStatus!=='machine_checked'||
     q.provenance.sourceLicenseStatus!=='allowed'||!q.problemImage||!q.solutionImage||
     !fs.existsSync(path.join(root,q.problemImage.replace(/^\.\//,'')))||
     !fs.existsSync(path.join(root,q.solutionImage.replace(/^\.\//,'')))))continue;
  const mean=qs.reduce((sum,q)=>sum+(lookup.get(q.id)??0),0)/25;
  sheets.push({paperId:'kma-'+exam,examId:Number(exam),
   title:qs[0].provenance.eventTitle||'KMA 경시대회',
   estimatedB:Math.round(mean*1000)/1000,questionIds:qs.map(q=>q.id)});
 }
 sheets.sort((a,b)=>a.estimatedB-b.estimatedB||a.examId-b.examId);
 assert(sheets.length>=3,grade+' lacks three complete 25-question papers');
 const pick=[sheets[0],sheets[Math.floor((sheets.length-1)/2)],sheets[sheets.length-1]];
 assert.equal(new Set(pick.map(p=>p.paperId)).size,3,grade+' duplicate difficulty papers');
 return {grade,title,gameId,papers:pick.map((sheet,i)=>({
   difficulty:['basic','challenge','advanced'][i],label:levels[i],...sheet
 }))};
});
const output={version:1,calibration:'editorial_provisional_not_psychometrically_calibrated',
 accuracyNote:'난이도는 잠정 문항 모수의 상대적 평균에 따른 시험지 추천이며 실제 정답률 기반 보정 전입니다.',
 itemCount:items.length*3*25,grades:items};
const target=path.join(root,'games/bebsu-challenges.json');
const bytes=JSON.stringify(output,null,2)+'\n';
if(process.argv.includes('--verify')){
 assert.equal(fs.readFileSync(target,'utf8'),bytes,'challenge registry is stale');
}else fs.writeFileSync(target,bytes);
console.log('PASS: Bebsu '+items.length+' grades x 3 estimated difficulty papers x 25 sequential questions = '+output.itemCount+' references.');
