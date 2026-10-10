/** Create a complete, source-derived item index. No source questions are edited.
 * Usage: node scripts/build-irt-bank.mjs [--verify]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {STAGE_DIFFICULTY,GRADE_DIFFICULTY} from '../platform/irt.js';
import {validateCatalog,validateGame} from '../platform/catalog.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const file=p=>path.join(root,p);
const catalogBytes=fs.readFileSync(file('games/catalog.json'));
const catalog=validateCatalog(JSON.parse(catalogBytes));
const sha=crypto.createHash('sha256').update(catalogBytes);
const stats={bySubject:{},byGrade:{},byMode:{},byVerification:{},byQuality:{}};
const inc=(group,key)=>stats[group][key]=(stats[group][key]||0)+1;
const round=value=>Math.round(value*1000)/1000;
const seen=new Set();
const items=[];
let imageFilesVerified=0;
for(const entry of catalog){
 if(entry.status!=='published'||entry.kind!=='quiz')continue;
 const relative=entry.source.replace(/^\.\//,'');
 const bytes=fs.readFileSync(file(relative));
 sha.update(entry.id+'\n').update(bytes);
 const game=validateGame(JSON.parse(bytes),entry);
 assert.equal(game.questions.length,entry.questionCount,entry.id);
 for(const [position,q] of game.questions.entries()){
  assert(!seen.has(q.id),'Duplicated global ID: '+q.id);
  seen.add(q.id);
  const provenance=q.provenance||{};
  if(provenance.source==='kma_public_original'){
   for(const kind of ['problemImage','solutionImage']){
    assert.equal(typeof q[kind],'string','KMA image missing: '+q.id+':'+kind);
    assert(fs.statSync(file(q[kind].replace(/^\.\//,''))).isFile(),'KMA image file missing: '+q.id+':'+kind);
    imageFilesVerified++;
   }
  }
  const band=entry.gradeBand||null;
  const stage=Number.isInteger(q.level)?q.level:Number.isInteger(entry.stage)?entry.stage:null;
  const anchor=band?GRADE_DIFFICULTY[band]:stage?STAGE_DIFFICULTY[stage]:entry.subject==='english'?-1.1:-0.3;
  assert(Number.isFinite(anchor),'Missing difficulty anchor for '+q.id);
  // KMA legacy difficultyB=0 denotes missing differentiation, not calibrated b=0.
  const raw=Number.isFinite(provenance.difficultyB)?Math.max(-2,Math.min(2,provenance.difficultyB)):0;
  let offset=raw*0.28;
  if(band&&provenance.source==='kma_public_original'&&Number.isInteger(provenance.examQuestionNo)){
   offset+=(Math.min(25,Math.max(1,provenance.examQuestionNo))-13)*0.025;
  }else if(!band){
   offset+=(position/Math.max(1,game.questions.length-1)-0.5)*0.24;
  }
  const mode=q.interaction?.type||'choice';
  const guess=mode==='choice'?1/q.choices.length:0;
  const skill=String(provenance.skillCode||q.skill||game.strand||entry.subject+'.general');
  const verification=String(provenance.answerVerificationStatus||'not_independently_verified');
  const quality=entry.sourceGroup==='bebsu'
   ?provenance.source==='kma_public_original'?'needs_expert_review'
    :verification==='independently_arithmetic_checked'?'arithmetic_checked':'generated_not_calibrated'
   :'app_authored_not_calibrated';
  const item={gameId:entry.id,id:q.id,subject:entry.subject,skill,b:round(anchor+offset),c:round(guess),stage,gradeBand:band,mode,verification,quality};
  items.push(item);
  inc('bySubject',item.subject);inc('byGrade',band||'base');
  inc('byMode',mode);inc('byVerification',verification);inc('byQuality',quality);
 }
}
const bank={version:1,model:'bayesian_fixed_slope_guess_adjusted',calibration:'editorial_provisional',sourceSha256:sha.digest('hex'),count:items.length,items};
const dest=file('games/irt-bank.json');
const content=JSON.stringify(bank)+'\n';
const verify=process.argv.includes('--verify');
if(verify){
 assert(fs.existsSync(dest),'IRT bank is missing; run npm run irt:build');
 assert.equal(fs.readFileSync(dest,'utf8'),content,'IRT bank is stale; run npm run irt:build');
}else fs.writeFileSync(dest,content);
const csvCols=['gameId','id','subject','skill','b','c','stage','gradeBand','mode','verification','quality'];
const cell=value=>'"'+String(value??'').replaceAll('"','""')+'"';
const csv='\uFEFF'+csvCols.join(',')+'\n'+items.map(item=>csvCols.map(k=>cell(item[k])).join(',')).join('\n')+'\n';
const csvPath=file('docs/IRT_ITEM_INVENTORY.csv');
const rows=group=>Object.entries(stats[group]).sort((a,b)=>b[1]-a[1]).map(([key,n])=>'| '+key+' | '+n.toLocaleString('en-US')+' |').join('\n');
const report=[
 '# 전체 문항 IRT 사전 점검 · 2026-10-10',
 '',
 '## 범위',
 '',
 '- 플랫폼 내부 문항: **'+items.length.toLocaleString('en-US')+'개**, '+catalog.filter(e=>e.kind==='quiz'&&e.status==='published').length+'개 문제 게임',
 '- 외부 단위 정원 48문항은 별도 앱에서 운영(본 문항 색인과 개별 능력 추정에는 미포함).',
 '- 기존 Bebsu 수학 문항에서 부적합하다고 판정되어 통합 대상에서 제외한 15문항은 출제하지 않음.',
 '- 원본 문제·정답·해설·이미지 수정 없음. 문항 색인은 식별자·주제·초기 난이도·검증 상태만 보관.',
 '- KMA 원본 문제 그림과 풀이 그림 '+imageFilesVerified.toLocaleString('en-US')+'개 파일의 로컬 존재 여부 확인(그림 내용의 수학적 정답 검증을 뜻하지 않음).',
 '',
 '## 문항 형식',
 '| 형식 | 문항 |','|---|---:|',rows('byMode'),'',
 '## 문항 검증 정보',
 '| 기존 기록상 상태 | 문항 |','|---|---:|',rows('byVerification'),'',
 '## 출제 품질 분류',
 '| 분류 | 문항 |','|---|---:|',rows('byQuality'),'',
 '## 난이도 산정 규칙',
 '',
 '- 초깃값은 성장 단계(씨앗 ~ 열매), 문제집 학년(K ~ M3) 및 기존 메타데이터를 연결한 **저자 설정 난이도**.',
 '- 응답 확률 P(정답)=c+(1-c)×logistic(theta-b); c는 선택형일 경우 보기 수 역수, 그 외 0.',
 '- 선택형 추측 보정과 동일 기울기(1PL)는 잠정 모형. 실증 자료로 문항 난이도 b와 변별도 a를 추정한 것이 아님.',
 '- KMA OCR을 재해석하여 정답을 재검증한 것은 아님. 이미지에 있는 원문을 교사/보호자가 확인해야 함.',
 '- 문제 번호가 높은 문항은 잠정적으로 약간 높은 난이도로 배치하나 시험 안의 실제 정렬이 검증된 것은 아님.',
 '- 문항 반응 자료가 축적되기 전에는 능력 추정의 불확실성을 함께 보고, 학년 자동 변경/진단에 사용하지 않음.',
 '- 정답률, 서로 다른 문항, 회차 수에 따른 성장 추천은 유지하고, 처음 응답이 독립적이었던 서로 다른 문항만 선택해 그 첫 응답을 능력 모형에 사용.',
 '- 힌트 받은 문항과 같은 문제의 연속 재시도는 능력 추정에서 배제. 응답 시간은 벌점이나 능력치에 사용하지 않음.',
 '',
 '## 운영 리스크와 후속 검증',
 '',
 '1. **모수 미보정**: 최소 수십~수백 명의 독립적인 응답을 확보하기 전에는 공식 IRT 난이도/변별도라고 표시하지 않는다.',
 '2. **정답 검증**: machine_checked는 사람의 수학 풀이 대조를 뜻하지 않는다. 특히 KMA 도형·단위·고학년 문항을 우선 표본검수한다.',
 '3. **모형 불변성**: 유아, 초등, 중등을 하나의 가정적 척도로 연결했으므로 학습자 집단이 확보되면 단일차원성/문항기능차이 검토가 필요하다.',
 '4. **반복 효과**: 처음 응답이 독립적이었던 서로 다른 문항만 사용해 외운 정답에 의한 실력 과대평가를 완화한다. 충분한 새 문항과 실물 활동으로 성장을 확인한다.',
 '5. **개인정보**: 결과는 현재 브라우저에만 저장. 외부 로그 수집·아동 서열화·점수 비교 기능 없음.',
 '',
 '세부 문항별 근거: [IRT_ITEM_INVENTORY.csv](./IRT_ITEM_INVENTORY.csv).',
 '생성 스크립트: node scripts/build-irt-bank.mjs; 신선도 검증: node scripts/build-irt-bank.mjs --verify.',
 ''
].join('\n');
const reportPath=file('docs/IRT_QUESTION_AUDIT_20261010.md');
if(verify){
 assert.equal(fs.readFileSync(csvPath,'utf8'),csv,'IRT inventory is stale');
 assert.equal(fs.readFileSync(reportPath,'utf8'),report,'IRT audit report is stale');
}else{
 fs.writeFileSync(csvPath,csv);fs.writeFileSync(reportPath,report);
}
console.log((verify?'VERIFIED':'BUILT')+': '+items.length+' item descriptors, '+imageFilesVerified+' source images, '+Object.keys(stats.byQuality).length+' quality groups; '+bank.sourceSha256);
