/** Build a separately versioned public Unity/KMA portal from the already
 * published KMA resources in this repository. Does not delete or rewrite
 * existing magic-village-v06 practice content or shared learner backups.
 * Execution: node scripts/assemble-kma-v06.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const targetRoot=path.resolve('.');
const sourceRoot='/Users/01chungee10/Github/sparkle-learning-hub-quality-v2';
const dest=path.join(targetRoot,'magic-village-kma-v06');
const read=(root,name)=>JSON.parse(fs.readFileSync(path.join(root,name),'utf8'));
const copy=(from,to=from)=>{
 const a=path.join(sourceRoot,from),b=path.join(dest,to);
 assert(fs.existsSync(a),'Missing developer source: '+from);
 fs.mkdirSync(path.dirname(b),{recursive:true});
 fs.cpSync(a,b,{recursive:true,force:true});
};
const patch=(name,pairs)=>{
 const filename=path.join(dest,name);
 let text=fs.readFileSync(filename,'utf8');
 for(const [before,after] of pairs){
  assert(text.includes(before),'Missing patch anchor in '+name+': '+before.slice(0,70));
  text=text.replaceAll(before,after);
 }
 fs.writeFileSync(filename,text);
};

if(fs.existsSync(dest)){
 if(!process.argv.includes('--rebuild'))throw new Error('Output already exists; pass --rebuild for this generated release folder: '+dest);
 fs.rmSync(dest,{recursive:true,force:true});
}
fs.mkdirSync(dest,{recursive:true});
for(const f of ['village/index.html','village/village-ui.js','village/village-bridge.js','village/village-ui.css','village/major-patch.css','village/village-state.js'])
 copy(f);
for(const dir of ['village/Build','village/assets','platform'])copy(dir);
const all=read(sourceRoot,'games/catalog.json');
const catalog=all.filter(game=>game.kind==='quiz'&&game.status==='published');
const names=new Set(catalog.map(entry=>entry.id));
const originalIds=['g1','g2','g3','g4','g5','g6','m1','m2','m3'].map(x=>'bebsu-'+x+'-original');
assert(originalIds.every(id=>names.has(id)));
for(const game of catalog){
 assert(/^\.\/games\/[a-z0-9-]+\/game\.json$/.test(game.source));
 copy(game.source.slice(2));
}
const originalBank=read(sourceRoot,'games/irt-bank.json');
const bankItems=originalBank.items.filter(item=>names.has(item.gameId));
assert.equal(bankItems.length,catalog.reduce((sum,game)=>sum+game.questionCount,0));
const bank={...originalBank,items:bankItems,count:bankItems.length};
fs.mkdirSync(path.join(dest,'games'),{recursive:true});
fs.writeFileSync(path.join(dest,'games/catalog.json'),JSON.stringify(catalog,null,2)+'\n');
fs.writeFileSync(path.join(dest,'games/irt-bank.json'),JSON.stringify(bank)+'\n');
copy('games/bebsu-challenges.json');

// KMA question/answer images were already present and publicly reachable under
// the root /assets/bebsu/math path before this release. Reference them in place.
const registry=read(dest,'games/bebsu-challenges.json');
assert.equal(registry.itemCount,675);
let scanCount=0;
for(const grade of registry.grades){
 assert.equal(grade.papers.length,3);
 const questions=read(dest,'games/'+grade.gameId+'/game.json').questions;
 for(const paper of grade.papers){
  assert.equal(paper.questionIds.length,25);
  for(let i=0;i<25;i++){
   const q=questions.find(x=>x.id===paper.questionIds[i]);
   assert(q&&q.provenance?.examQuestionNo===i+1,'Original exam sequence drift: '+grade.grade+'/'+paper.paperId+' #'+(i+1));
   for(const prop of ['problemImage','solutionImage']){
    const value=q[prop];
    assert(/^\.\/assets\/bebsu\/math\/[a-f0-9]{16}\.png$/.test(value),'Unsafe original image path');
    const file=path.join(targetRoot,value.slice(2));
    assert(fs.existsSync(file),'A referenced original image is missing from the published GitHub Pages root: '+file);
    assert(fs.statSync(file).size>1000,'Unexpected empty question image');
    scanCount++;
   }
  }
 }
}
assert.equal(scanCount,1350);
const keys=[
 ['platform/progress.js',"export const KEY='sparkle-learning-progress-v3';","export const KEY='sparkle-kma-public-progress-v06';"],
 ['platform/progress.js',"export const PREVIOUS_KEY='sparkle-learning-progress-v2';","export const PREVIOUS_KEY='sparkle-kma-public-progress-v06-previous';"],
 ['platform/progress.js',"export const FIRST_KEY='sparkle-learning-progress-v1';","export const FIRST_KEY='sparkle-kma-public-progress-v06-first';"],
 ['platform/progress.js',"export const LEGACY_KEY='fairy-math-garden-v1';","export const LEGACY_KEY='sparkle-kma-public-unit-v06';"],
 ['platform/rewards.js',"export const REWARDS_KEY='sparkle-rewards-v1';","export const REWARDS_KEY='sparkle-kma-public-rewards-v06';"],
 ['platform/settings.js',"export const SETTINGS_KEY='sparkle-family-settings-v1';","export const SETTINGS_KEY='sparkle-kma-public-settings-v06';"],
 ['village/village-state.js',"export const VILLAGE_KEY = 'sparkle-unity-village-v1';","export const VILLAGE_KEY = 'sparkle-kma-public-garden-v06';"]
];
for(const [name,before,after] of keys)patch(name,[[before,after]]);
patch('village/village-bridge.js',[
 ["? '../' + value.slice(2) : ''","? '../../' + value.slice(2) : ''"]
]);
patch('village/index.html',[
 ['<title>태희·세희의 마법마을 · 반짝 배움터</title>','<title>태희·세희의 마법마을 · 벡수 경시대회 v0.6</title>'],
 ['<a href="../">← 반짝 배움터</a>','<a href="../../">← 반짝 배움터</a>'],
 ['productVersion: \'0.6.0-dev\'','productVersion: \'0.6.0-kma\'']
]);
// Standardized cache key prevents old public practice chunks from being reused.
patch('village/index.html', [['20261010galaxy1','20261010kma-numpad1']]);
patch('village/village-ui.js',[
 ["    paragraph('학년과 도전 수준을 고르고, 진짜 경시대회 1번부터 25번까지 풀어 보세요.','vh-story');",
 "    paragraph('KMA 한국수학학력평가 공개 기출의 실제 1번부터 25번까지 풀어 보세요. 답과 풀이 출처를 확인해 보세요.','vh-story');"]
]);
fs.writeFileSync(path.join(dest,'index.html'),`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>마법마을 · 벡수 수학 경시대회</title><meta http-equiv="refresh" content="0;url=./village/"><a href="./village/">벡수 경시대회 마법마을 열기</a></html>\n`);
fs.writeFileSync(path.join(dest,'.nojekyll'),'');
fs.writeFileSync(path.join(dest,'README.md'),`# 공개 벡수 경시대회 마법 마을 v0.6

- 원본 KMA 한국수학학력평가 기출 문제 1~25번을 순차적으로 학습하는 게임형 인터페이스입니다.
- 출처: [KMA 한국수학학력평가 공개 기출](https://www.kma-e.com/data/after_problem.asp)
- 9개 학년 × 3개 시험 회차 × 25문항. 원본 문제·풀이 이미지는 기존 GitHub Pages의 공개 리소스를 경로 참조하며 중복 업로드하지 않습니다.
- 데이터 정확성: 답은 원본 지문/문제은행의 기계 검증에 의존하며 출제기관의 별도 채점 검수와 동일하지 않습니다.
- 학습 기록 키(sparkle-kma-public-*-v06)는 자체 제작 마법 수학 연습판 및 기존 배움터와 분리했습니다. 원본 KMA와 연습판의 별을 합산하지 않습니다.
- 난도/IRT는 잠정 편집 기준이며 실증적 능력진단으로 취급하지 않습니다.
- 제작본: 원본 게임 ID·문제·해설 이미지를 유지하고 화면과 게임 보상만 연결합니다. 출처의 공개 접근성만으로 저작권 이용허락 범위가 확정되는 것은 아닙니다.
`);
console.log('PUBLIC_KMA_PORTAL_READY',JSON.stringify({quizGames:catalog.length,irtItems:bank.count,papers:27,examQuestions:675,alreadyPublishedQuestionImages:scanCount,portal:dest}));
