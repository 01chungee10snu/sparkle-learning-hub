import {validateInteraction} from './activities.js';
export const SUBJECTS={all:{name:'모두',emoji:'✨'},math:{name:'수학',emoji:'🔢'},korean:{name:'국어',emoji:'🌷'},english:{name:'영어',emoji:'🍎'}};
const validStage=n=>Number.isInteger(n)&&n>=1&&n<=4;
export function validateCatalog(data){
 if(!Array.isArray(data)||!data.length)throw new Error('놀이 목록을 불러오지 못했어요.');
 const ids=new Set();
 for(const g of data){if(!/^[a-z][a-z0-9-]+$/.test(g.id)||ids.has(g.id)||!['math','korean','english'].includes(g.subject)||!['published','draft'].includes(g.status)||!['quiz','external'].includes(g.kind)||typeof g.title!=='string'||typeof g.description!=='string')throw new Error('놀이 목록의 형식을 확인해 주세요.');ids.add(g.id);if(g.growth===true&&(!Number.isInteger(g.stage)||g.stage<1||g.stage>4||g.kind!=='quiz'))throw new Error('성장 단계의 형식을 확인해 주세요.');if(g.kind==='quiz'&&g.status==='published'&&(!Array.isArray(g.questionIds)||g.questionIds.length!==g.questionCount||new Set(g.questionIds).size!==g.questionIds.length))throw new Error('게임의 문항 목록을 확인해 주세요.');if(g.kind==='quiz'&&!/^\.\/games\/[a-z][a-z0-9-]+\/game\.json$/.test(g.source))throw new Error('안전한 게임 경로가 필요해요.');if(g.kind==='external'&&!/^\.\.\/[a-z][a-z0-9-]*\/$/.test(g.url))throw new Error('연결할 놀이 주소를 확인해 주세요.');}
 for(const g of data){if(g.adventure!==undefined&&typeof g.adventure!=='boolean')throw new Error('모험 놀이의 형식을 확인해 주세요.');if(g.adventure===true&&(g.growth===true||g.kind!=='quiz'||!validStage(g.minStage)||!validStage(g.maxStage)||g.minStage>g.maxStage))throw new Error('모험 놀이의 단계를 확인해 주세요.');}
 return data;
}
export function validateGame(game,entry){
 if(!game||game.id!==entry.id||game.subject!==entry.subject||!Array.isArray(game.questions)||game.questions.length<5)throw new Error('문제를 준비하지 못했어요.');
 const ids=new Set();
 for(const q of game.questions){if(!/^[a-z][a-z0-9-]+$/.test(q.id)||ids.has(q.id)||!Array.isArray(q.explanation)||q.explanation.length<1||q.explanation.some(s=>typeof s!=='string'||!s.trim())||typeof q.story!=='string'||typeof q.prompt!=='string'||typeof q.title!=='string')throw new Error('문제 형식을 확인해 주세요.');ids.add(q.id);validateInteraction(q);
  if(q.choiceMode==='picture'&&(!Array.isArray(q.choiceLabels)||q.choiceLabels.length!==3||q.choiceLabels.some(x=>typeof x!=='string'||!x)))throw new Error('그림 보기의 이름이 필요해요.');
  if(q.cue&&(!['ko-KR','en-US'].includes(q.cue.lang)||typeof q.cue.text!=='string'||!q.cue.text))throw new Error('듣기 문제를 확인해 주세요.');
  const v=q.visual;
  if(v?.kind==='groups'&&(!Array.isArray(v.groups)||!v.groups.length||v.groups.length>4||v.groups.some(g=>!Number.isInteger(g.count)||g.count<0||g.count>20||typeof g.label!=='string'||typeof g.emoji!=='string')))throw new Error('수량 그림을 확인해 주세요.');
  if(v?.kind==='bars'&&(!Array.isArray(v.bars)||v.bars.length<1||v.bars.length>4||v.bars.some(b=>typeof b.label!=='string'||!Number.isFinite(b.value)||b.value<=0)))throw new Error('길이 그림을 확인해 주세요.');
  if(v?.kind==='fraction'&&(!Number.isInteger(v.parts)||v.parts<2||v.parts>20||!Number.isInteger(v.filled)||v.filled<0||v.filled>v.parts||typeof v.label!=='string'))throw new Error('나누기 그림을 확인해 주세요.');
 }
 if(entry.growth&&(game.stage!==entry.stage||game.questions.some(q=>typeof q.skill!=='string'||!q.skill)||typeof game.offline!=='string'||typeof game.prerequisite!=='string'))throw new Error('성장 놀이의 개념과 실물 활동을 확인해 주세요.');
 if(entry.adventure===true){
  if(game.adventure!==true||game.growth===true||game.minStage!==entry.minStage||game.maxStage!==entry.maxStage||!validStage(game.minStage)||!validStage(game.maxStage)||game.minStage>game.maxStage||typeof game.offline!=='string'||!game.offline.trim()||typeof game.prerequisite!=='string'||!game.prerequisite.trim())throw new Error('모험 놀이의 개념과 단계를 확인해 주세요.');
  if(game.questions.some(q=>!validStage(q.level)||q.level<game.minStage||q.level>game.maxStage||typeof q.skill!=='string'||!q.skill.trim()||q.explanation.length<2)||game.questions.filter(q=>q.level===game.minStage).length<6||game.questions.filter(q=>q.level===game.maxStage).length<6)throw new Error('모험 놀이의 단계별 문제가 부족하거나 형식이 맞지 않아요.');
 }
 if(entry.questionIds&&JSON.stringify(game.questions.map(q=>q.id))!==JSON.stringify(entry.questionIds))throw new Error('게임과 문항 목록이 일치하지 않아요.');
 return game;
}
export async function loadCatalog(){const r=await fetch('./games/catalog.json');if(!r.ok)throw new Error('놀이 목록에 연결하지 못했어요.');return validateCatalog(await r.json());}
export async function loadGame(entry){const r=await fetch(entry.source);if(!r.ok)throw new Error('이 놀이를 불러오지 못했어요.');return validateGame(await r.json(),entry);}
