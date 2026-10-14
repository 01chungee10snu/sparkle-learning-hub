import {createPlaygroundState,reducePlayground,playgroundObservation,SEED_VALUES,MATERIALS,GARDEN_TOOLS,RECIPES} from './playground-state-v13.js';

const assetBase=new URL('./assets/game-elements-v13/',import.meta.url);
const img=(id,cls='lp-art')=>`<img class="${cls}" src="${new URL(id+'.svg',assetBase).href}" alt="" width="512" height="512" decoding="async">`;
const tabs=[['merge','수 정원','seed-pair'],['recipe','만들기','workbench'],['garden','꾸미기','garden-island'],['together','함께하기','cooperation-tree']];
const pressed=(value)=>`aria-pressed="${String(Boolean(value))}"`;
const btn=(text,action,value='',extra='')=>`<button type="button" data-action="${action}" data-value="${value}" ${extra}>${text}</button>`;
const material=(id)=>img('token-'+id,'lp-token');

export function createPlayground(){
  const host=document.createElement('section');host.className='lp13';host.setAttribute('aria-label','상상하고 만드는 생각 공방');
  let state=createPlaygroundState();
  let message='두 씨앗을 눌러 수를 바꿔 보세요.';

  function mergePanel(){
    const {left,right,active,planted}=state.seeds;
    const seeds=['left','right'].map(side=>btn(`${img('token-seed','lp-seed-art')}<strong class="lp-seed-value">${state.seeds[side]}</strong><span>${side==='left'?'왼쪽':'오른쪽'} 씨앗</span>`, 'seed-side',side,`${pressed(active===side)} class="lp-seed" aria-label="${side==='left'?'왼쪽':'오른쪽'} 씨앗 ${state.seeds[side]} 선택"`)).join('');
    return `<div class="lp-scene lp-merge-scene ${planted?'lp-is-planted':''}">
      <div class="lp-seed-pair">${seeds}</div>
      ${planted?`<div class="lp-merged-plant">${img('tile-flower')}<strong>${left+right}</strong></div>`:''}
      <span class="lp-scene-caption">${planted?'같은 수가 만나 새 꽃이 되었어요.':'어떤 씨앗을 함께 심을까요?'}</span></div>
      <div class="lp-details"><h3>같은 수가 만나면?</h3><p>씨앗을 고르고, 수를 바꿔요.</p>
      <div class="lp-number-palette" aria-label="선택한 씨앗의 수">${SEED_VALUES.map(n=>btn(String(n),'seed-value',n,`${pressed(state.seeds[active]===n)} aria-label="씨앗 수 ${n}"`)).join('')}</div>
      ${btn(planted?'한 번 더 살펴보기':'함께 심어 보기','merge','','class="lp-primary"')}
      <p class="lp-question">두 씨앗이 같은 수일 때<br>어떤 수의 꽃이 될까요?</p></div>`;
  }

  function recipePanel(){
    const {index,basket,assembled}=state.recipe;const recipe=RECIPES[index];
    return `<div class="lp-scene lp-workbench-scene">${img(assembled?recipe.art:'workbench','lp-feature-art')}
      <div class="lp-basket" aria-label="놓은 재료">${basket.length?basket.map((id,i)=>`<span class="lp-basket-token" title="${MATERIALS[id]}">${material(id)}<span class="lp-sr">${MATERIALS[id]} ${i+1}</span></span>`).join(''):'<span>여기에 재료가 모여요.</span>'}</div>
      <span class="lp-scene-caption">${assembled?recipe.name+' 모양을 만들었어요.':'하나씩 놓아 보고 조합해요.'}</span></div>
      <div class="lp-details"><h3>무엇을 만들까요?</h3>
      <div class="lp-recipe-choices">${RECIPES.map((r,i)=>btn(r.name,'recipe',i,pressed(i===index))).join('')}</div>
      <div class="lp-recipe-target" aria-label="${recipe.name}의 재료">${recipe.parts.map(id=>`<span>${material(id)}<b>${MATERIALS[id]}</b></span>`).join('<i aria-hidden="true">+</i>')}</div>
      <div class="lp-materials">${Object.keys(MATERIALS).map(id=>btn(`${material(id)}<span>${MATERIALS[id]}</span>`,'material',id,`aria-label="${MATERIALS[id]} 하나 놓기" ${basket.length>=6?'disabled':''}`)).join('')}</div>
      <div class="lp-action-row">${btn('하나 빼기','remove-material','','class="lp-secondary" '+(!basket.length?'disabled':''))}${btn('조합해 보기','assemble','','class="lp-primary"')}</div></div>`;
  }

  function gardenPanel(){
    const {cells,tool,history}=state.garden;
    return `<div class="lp-scene lp-garden-scene"><div class="lp-garden-grid" role="group" aria-label="네 줄 네 칸 상상 정원">${cells.map((id,i)=>btn(img('tile-'+id,'lp-tile-art'),'place',i,`class="lp-garden-cell" aria-label="${Math.floor(i/4)+1}행 ${i%4+1}열 ${GARDEN_TOOLS[id]}: ${GARDEN_TOOLS[tool]} 놓기"`)).join('')}</div>
      <span class="lp-scene-caption">소품을 고른 뒤 원하는 칸을 눌러요.</span></div>
      <div class="lp-details"><h3>내가 만드는 작은 정원</h3><p>꽃길, 연못, 다리…<br>어디에 놓으면 좋을까요?</p>
      <div class="lp-garden-palette">${Object.entries(GARDEN_TOOLS).map(([id,title])=>btn(`${img('tile-'+id,'lp-palette-art')}<span>${title}</span>`,'garden-tool',id,`${pressed(tool===id)} aria-label="${title} 고르기"`)).join('')}</div>
      <div class="lp-action-row">${btn('되돌리기','undo','','class="lp-secondary" '+(!history.length?'disabled':''))}${btn('처음 정원','reset','','class="lp-secondary"')}</div>
      <p class="lp-question">나무에서 연못까지<br>어떤 길을 만들까요?</p></div>`;
  }

  function togetherPanel(){
    const {water,sun,swapped}=state.together;const bloomed=water&&sun;
    return `<div class="lp-scene lp-together-scene ${bloomed?'lp-bloomed':''}">${img('cooperation-tree','lp-feature-art')}
      <div class="lp-role-glows"><span class="${water?'lp-role-on':''}">${material('water')}</span><span class="${sun?'lp-role-on':''}">${material('sun')}</span></div>
      ${bloomed?`<div class="lp-bloom-cluster">${img('token-flower')}${img('token-flower')}${img('token-flower')}</div>`:''}
      <span class="lp-scene-caption">${bloomed?'두 가지 도움이 모여 꽃이 피었어요.':'어떤 도움을 나눠 볼까요?'}</span></div>
      <div class="lp-details"><h3>함께 가꾸는 나무</h3><p>혼자 두 역할을 해도 좋아요.</p>
      <div class="lp-role-controls">${btn(`${material('water')}<span><small>친구 ${swapped?'둘':'하나'}</small><b>물 나누기</b></span><em>${water?'함께했어요':'해 보기'}</em>`,'role','water',`${pressed(water)} class="lp-role-button"`)}
      ${btn(`${material('sun')}<span><small>친구 ${swapped?'하나':'둘'}</small><b>햇빛 비추기</b></span><em>${sun?'함께했어요':'해 보기'}</em>`,'role','sun',`${pressed(sun)} class="lp-role-button"`)}</div>
      ${btn('역할 바꾸기','swap','','class="lp-secondary"')}
      <p class="lp-question">서로 어떤 도움을 주었나요?</p></div>`;
  }

  function render(focusKey){
    const panels={merge:mergePanel,recipe:recipePanel,garden:gardenPanel,together:togetherPanel};
    host.innerHTML=`<nav class="lp-tabs" aria-label="공방 활동 고르기">${tabs.map(([id,title,art])=>btn(`${img(art,'lp-tab-art')}<span>${title}</span>`,'mode',id,pressed(state.mode===id))).join('')}</nav>
      <div class="lp-panel" data-play-mode="${state.mode}">${panels[state.mode]()}</div>
      <output class="lp-observation" aria-live="polite" aria-atomic="true"></output>`;
    host.querySelector('.lp-observation').textContent=message;
    if(focusKey){
      const target=[...host.querySelectorAll('button')].find(b=>b.dataset.action===focusKey.action&&b.dataset.value===focusKey.value&&!b.disabled);
      target?.focus({preventScroll:true});
    }
  }

  host.addEventListener('click',event=>{
    const button=event.target.closest('button[data-action]');if(!button||!host.contains(button))return;
    const type=button.dataset.action;
    const numeric=['seed-value','recipe','place'].includes(type);
    const value=numeric?Number(button.dataset.value):button.dataset.value;
    state=reducePlayground(state,{type,value});
    const observation=playgroundObservation(state);
    if(type==='mode')message={merge:'두 씨앗을 눌러 수를 바꿔 보세요.',recipe:'위의 조합을 보고 재료를 하나씩 놓아 보세요.',garden:'정원 꾸미기는 정해진 답이 없어요. 마음껏 바꿔 보세요.',together:'두 역할을 나누어 해 보세요.'}[value];
    else if(type==='merge')message=observation.explanation;
    else if(type==='assemble')message=observation.matched?'재료가 모였어요. 어떤 순서로 놓았는지 말해 볼까요?':observation.explanation;
    else if(type==='role'||type==='swap')message=observation.rolesCovered&&observation.distinctParticipants?'물과 햇빛이 모였어요. 둘 중 하나가 빠지면 어떻게 보일까요?':'물과 햇빛 역할을 함께 해 보세요.';
    else if(type==='place')message=`${Math.floor(value/4)+1}행 ${value%4+1}열에 ${GARDEN_TOOLS[state.garden.tool]}을 놓았어요.`;
    else if(type==='undo')message='바로 전 정원 모습으로 돌아왔어요.';
    else if(type==='garden-tool')message=GARDEN_TOOLS[value]+'을 놓을 칸을 골라요.';
    else if(type==='material'||type==='remove-material')message='제작대의 재료 '+state.recipe.basket.length+'개를 살펴보세요.';
    else if(type==='seed-side')message=(value==='left'?'왼쪽':'오른쪽')+' 씨앗의 수를 바꿀 수 있어요.';
    else if(type==='seed-value')message='두 씨앗의 수가 같은지 살펴보세요.';
    else if(type==='recipe')message=RECIPES[value].name+'의 재료를 놓아 보세요.';
    else if(type==='reset')message='처음 모습으로 돌아왔어요.';
    render({action:type,value:String(value)});
  });

  host.addEventListener('keydown',event=>{
    const target=event.target.closest('[data-action="place"]');if(!target)return;
    const offsets={ArrowLeft:-1,ArrowRight:1,ArrowUp:-4,ArrowDown:4};
    if(!Object.hasOwn(offsets,event.key))return;
    event.preventDefault();const i=Number(target.dataset.value);
    const next=Math.min(15,Math.max(0,i+offsets[event.key]));
    host.querySelector(`[data-action="place"][data-value="${next}"]`)?.focus();
  });
  render();return host;
}
