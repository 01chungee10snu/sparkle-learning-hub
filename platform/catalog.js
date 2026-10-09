export const SUBJECTS={all:{name:'모두',emoji:'✨'},math:{name:'수학',emoji:'🔢'},korean:{name:'국어',emoji:'🌷'},english:{name:'영어',emoji:'🍎'}};
export function validateCatalog(data){
 if(!Array.isArray(data)||!data.length)throw new Error('놀이 목록을 불러오지 못했어요.');
 const ids=new Set();
 for(const g of data){if(!/^[a-z][a-z0-9-]+$/.test(g.id)||ids.has(g.id)||!['math','korean','english'].includes(g.subject)||!['published','draft'].includes(g.status)||!['quiz','external'].includes(g.kind)||typeof g.title!=='string'||typeof g.description!=='string')throw new Error('놀이 목록의 형식을 확인해 주세요.');ids.add(g.id);if(g.kind==='quiz'&&g.status==='published'&&(!Array.isArray(g.questionIds)||g.questionIds.length!==g.questionCount||new Set(g.questionIds).size!==g.questionIds.length))throw new Error('게임의 문항 목록을 확인해 주세요.');if(g.kind==='quiz'&&!/^\.\/games\/[a-z][a-z0-9-]+\/game\.json$/.test(g.source))throw new Error('안전한 게임 경로가 필요해요.');if(g.kind==='external'&&!/^\.\.\/[a-z][a-z0-9-]*\/$/.test(g.url))throw new Error('연결할 놀이 주소를 확인해 주세요.');}
 return data;
}
export function validateGame(game,entry){
 if(!game||game.id!==entry.id||game.subject!==entry.subject||!Array.isArray(game.questions)||game.questions.length<5)throw new Error('문제를 준비하지 못했어요.');
 const ids=new Set();
 for(const q of game.questions){if(!/^[a-z][a-z0-9-]+$/.test(q.id)||ids.has(q.id)||!Array.isArray(q.choices)||q.choices.length!==3||q.choices.some(x=>typeof x!=='string')||new Set(q.choices).size!==3||!Number.isInteger(q.answer)||q.answer<0||q.answer>2||!Array.isArray(q.explanation)||q.explanation.length<1||typeof q.story!=='string'||typeof q.prompt!=='string'||typeof q.title!=='string')throw new Error('문제 형식을 확인해 주세요.');ids.add(q.id);}
 if(entry.questionIds&&JSON.stringify(game.questions.map(q=>q.id))!==JSON.stringify(entry.questionIds))throw new Error('게임과 문항 목록이 일치하지 않아요.');
 return game;
}
export async function loadCatalog(){const r=await fetch('./games/catalog.json');if(!r.ok)throw new Error('놀이 목록에 연결하지 못했어요.');return validateCatalog(await r.json());}
export async function loadGame(entry){const r=await fetch(entry.source);if(!r.ok)throw new Error('이 놀이를 불러오지 못했어요.');return validateGame(await r.json(),entry);}
