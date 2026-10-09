import fs from 'node:fs/promises';
import path from 'node:path';
const [id,subject,title]=process.argv.slice(2);
if(!/^[a-z][a-z0-9-]+$/.test(id||'')||!['math','korean','english'].includes(subject)||!title){console.error('사용법: npm run new:game -- clock-adventure math "시계 탐험"');process.exit(1);}
const root=process.cwd(),catalogPath=path.join(root,'games/catalog.json');
const catalog=JSON.parse(await fs.readFile(catalogPath,'utf8'));
if(catalog.some(g=>g.id===id))throw new Error('같은 ID의 게임이 이미 있습니다. 기존 게임을 덮어쓰지 않습니다.');
const dir=path.join(root,'games',id);await fs.mkdir(dir,{recursive:false});
const game={id,subject,title,description:'게임 소개를 한 문장으로 작성하세요.',emoji:'🌟',questions:[{id:id+'-01',title:'문제 제목',story:'아이에게 친숙한 상황을 작성하세요.',prompt:'정확히 무엇을 구하는지 질문하세요.',choices:['정답','오답 하나','오답 둘'],answer:0,explanation:['이유를 짧게 설명하세요.','생각을 다른 상황에 연결해 주세요.'],visual:{kind:'emoji',emoji:'🌟'}}]};
await fs.writeFile(path.join(dir,'game.json'),JSON.stringify(game,null,2)+'\n',{flag:'wx'});
catalog.push({id,subject,title,description:game.description,emoji:game.emoji,kind:'quiz',source:`./games/${id}/game.json`,levelLabel:'학습 수준을 작성하세요',questionCount:1,questionIds:[id+'-01'],status:'draft'});
await fs.writeFile(catalogPath,JSON.stringify(catalog,null,2)+'\n');
console.log(`초안 생성: games/${id}/game.json\n문항을 5개 이상 작성하고 npm run check로 검증한 뒤 catalog의 status를 published로 변경하세요. 초안은 어린이 화면에 나오지 않습니다.`);
