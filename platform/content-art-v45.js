/** Fixed local art registry. Visual metadata only; no learner or reward state. */
export const CONTENT_VERSION='interiors-v45-20261105';
export const CONTENT_ROOMS=Object.freeze({
  math:{name:'수학 공방',detail:'주판과 저울로 생각을 펼쳐요',prop:'abacus',accent:'#567fba'},
  korean:{name:'이야기 도서관',detail:'마법책을 펼치고 이야기를 만나요',prop:'book',accent:'#9271af'},
  english:{name:'영어 숲 교실',detail:'보고, 듣고, 새로운 말을 찾아요',prop:'globe',accent:'#598f67'},
  hanja:{name:'한자 수련관',detail:'붓과 두루마리로 글자의 뜻을 찾아요',prop:'brush',accent:'#ab645a'},
  challenge:{name:'도전의 전당',detail:'한 문제씩 차근차근 도전해요',prop:'trophy',accent:'#8064aa'},
  practice:{name:'마법 연습 공방',detail:'틀려도 괜찮아요. 다른 방법을 찾아요',prop:'cube',accent:'#ad7863'},
  pond:{name:'연못 관찰실',detail:'내 물고기를 돌보고 함께 쉬어요',prop:'shell',accent:'#448e99'},
  ocean:{name:'바다 탐험실',detail:'새로운 바다 친구를 만나봐요',prop:'globe',accent:'#477faa'},
  garden:{name:'나무·꽃 온실',detail:'씨앗을 심고 천천히 가꾸어요',prop:'watering',accent:'#518777'},
  shop:{name:'별빛 보물상점',detail:'모은 별로 마음에 드는 선물을 골라요',prop:'chest',accent:'#ad718d'},
  career:{name:'미래 직업 전시실',detail:'세상의 여러 가지 일을 살펴봐요',prop:'globe',accent:'#4c8c8b'},
  growth:{name:'발견의 기록실',detail:'별과 이해는 달라요. 배운 과정을 돌아봐요',prop:'sprout',accent:'#896bb1'},
  commons:{name:'마법마을 안내실',detail:'오늘 만나고 싶은 이야기를 골라요',prop:'book',accent:'#806ca3'}
});
export const CONTENT_PROPS=Object.freeze(['book','scroll','abacus','balance','globe','brush','trophy','hourglass','chest','watering','sprout','flower','star','crystal','shell','seed','cube','apple','lantern','sun','note','frame','cat','dog','rabbit','fish','strawberry','banana','carrot','cup','ball','tree']);
export function contentArt(kind,key,prefix='../'){
  if(!['./','../'].includes(prefix))return '';
  const valid=kind==='rooms'?Object.hasOwn(CONTENT_ROOMS,key):kind==='props'&&CONTENT_PROPS.includes(key);
  return valid?prefix+'assets/interiors-v45/'+kind+'/'+key+(kind==='rooms'?'.webp':'.png'):'';
}
export function roomFor({mode='',subject='',district='',gameId='',total=0,view=''}={}){
  if(['explore',''].includes(mode)&&!view)return '';
  const direct={pond:'pond',ocean:'ocean',garden:'garden',shop:'shop',career:'career',growth:'growth',wardrobe:'shop',friends:'commons',ecology:'garden',map:'commons',story:'commons',adaptive:'commons','pond-learning-complete':'pond'};
  if(direct[mode])return direct[mode];
  if(view==='collection')return 'shop';
  if(view==='growth'||view==='parents'||view==='records')return 'growth';
  if(view==='workbooks')return 'math';
  if(view==='hanja')return 'hanja';
  if(view==='home')return 'commons';
  if(['question','feedback','complete','reflection'].includes(mode)||view==='quiz'){
    if(gameId.startsWith('hanja-')||subject==='hanja')return 'hanja';
    if(total===25&&gameId.startsWith('magic-'))return 'practice';
    if(total===25&&gameId.startsWith('bebsu-'))return 'challenge';
    if(Object.hasOwn(CONTENT_ROOMS,subject))return subject;
  }
  const districtMap={kma:'challenge',practice:'practice',academy:'korean',growth:'growth',math:'math',korean:'korean',english:'english',hanja:'hanja'};
  return districtMap[district]||'commons';
}
// Replace only these exact pictograms in counting visuals; do not reinterpret question text.
const TOKENS=Object.freeze({'🍎':'apple','🧊':'cube','⭐':'star','🌱':'sprout','🐱':'cat','🐈':'cat','🐶':'dog','🐰':'rabbit','🐟':'fish','🍓':'strawberry','🍌':'banana','🥕':'carrot','☕':'cup','🌳':'tree'});
export const countedProp=token=>TOKENS[token]||'';
export function decorateCountedObjects(container,prefix='../'){
  if(!container)return;
  for(const node of container.querySelectorAll('.vh-counted,.build-items>span,.question-picture .picture-object,.question-picture .picture-emoji,.memory-preview span,.vh-spatial-collected')){
    if(node.childElementCount)continue;
    const text=node.textContent;
    const tokens=text.trim().split(/\s+/).filter(Boolean);
    if(!tokens.length||tokens.length>30||tokens.some(t=>!countedProp(t)))continue;
    const frag=document.createDocumentFragment();
    for(const token of tokens){
      const image=document.createElement('img');image.src=contentArt('props',countedProp(token),prefix);
      image.alt=token;image.width=44;image.height=44;image.className='v45-counted-object';image.draggable=false;
      frag.append(image);
    }
    node.replaceChildren(frag);node.dataset.contentObject='true';
  }
  // Picture choices retain the original answer index, text, labels and event handlers.
  // Only registered literal emoji glyphs become corresponding authored pictures.
  const tokenPattern=new RegExp('('+Object.keys(TOKENS).join('|')+')','gu');
  const targets=container.querySelectorAll('.vh-option,.vh-spatial-gate,.answer>span:last-child,.match-tile,.sequence-tiles button');
  for(const target of targets){
    const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT);const leaves=[];
    while(walker.nextNode())leaves.push(walker.currentNode);
    for(const leaf of leaves){
      const text=leaf.nodeValue||'';tokenPattern.lastIndex=0;
      if(text.length>300||!tokenPattern.test(text))continue;
      const control=target.closest('button');
      if(control&&!control.hasAttribute('aria-label'))control.setAttribute('aria-label',control.textContent);
      tokenPattern.lastIndex=0;const frag=document.createDocumentFragment();
      for(const part of text.split(tokenPattern)){
        const prop=countedProp(part);
        if(!prop){frag.append(document.createTextNode(part));continue;}
        const image=document.createElement('img');image.src=contentArt('props',prop,prefix);image.alt=part;
        image.width=52;image.height=52;image.className='v45-choice-object';image.draggable=false;frag.append(image);
      }
      leaf.replaceWith(frag);
    }
  }
}
