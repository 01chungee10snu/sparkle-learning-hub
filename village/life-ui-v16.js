import {createLifeStore,LIFE_CROPS,LIFE_FISH,LIFE_PETS} from './life-state-v16.js';

const plantCare=['water','sun','tend'];
const fishCare=['feed','clean','observe'];
const petCare=['feed','play','rest'];
const careLabels={water:'💧 물 주기',sun:'☀️ 햇빛 주기',tend:'🌿 돌보기',feed:'🍎 먹이 주기',clean:'🫧 물 깨끗이',observe:'👀 관찰하기',play:'🎾 함께 놀기',rest:'💤 쉬어 가기'};
const plantArt=['./assets/seed.png','./assets/sprout.png','./assets/bud.png','./assets/bloom.png'];
const tabTitles={farm:'🌱 텃밭',pond:'🐟 연못',pets:'🐰 친구들'};
const htmlSafe=(s)=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const art=(path,alt='')=>`<img src="${new URL(path,import.meta.url).href}" alt="${htmlSafe(alt)}" loading="lazy">`;
const button=(title,act,value='',attrs='')=>`<button type="button" data-life-action="${act}" data-life-value="${htmlSafe(value)}" ${attrs}>${title}</button>`;

export function createLifePanel({who,area='home',tab='farm',storage,namespace='/',onSnapshot=()=>{},worldAvailable=false,onWorldCommand=()=>{}}={}){
  const element=document.createElement('section');
  element.className='life16';
  element.dataset.lifeBusy='false';
  element.setAttribute('aria-label','내 마을 생활 놀이');
  const store=createLifeStore({storage,namespace});
  let currentTab=Object.hasOwn(tabTitles,tab)?tab:'farm';
  let selectedSlot=0;
  let selectedFish=null,selectedPet=null;
  let chosenCrop='carrot',message='무엇부터 해 볼까요?';
  let state=null,destroyed=false,pending=false,effect='',effectTimer=null;
  function flash(care){
    if(effectTimer!==null)clearTimeout(effectTimer);
    effect=care;
    effectTimer=setTimeout(()=>{effectTimer=null;effect='';if(!destroyed)render();},900);
  }
  function refresh(){
    try{state=store.snapshot(who,area);return true;}
    catch(err){message=err.message||'마을 기록을 열지 못했어요.';return false;}
  }
  function snapshot(){return state?structuredClone(state):null;}
  function sceneFarm(){
    return `<div class="life-scene life-farm-scene"><div class="life-ground" aria-hidden="true"></div>
      <div class="life-plots" role="group" aria-label="여섯 칸 텃밭">${Array.from({length:6},(_,i)=>{
        const p=state.plots.find(x=>x.slot===i),name=p?LIFE_CROPS[p.species].title:'빈 밭';
        const graphic=p?.stage===3?`<span class="life-ripe" aria-hidden="true">${LIFE_CROPS[p.species].emoji}</span>`:art(p?plantArt[p.stage]:plantArt[0]);
        return button(`${graphic}<small>${i+1}번 · ${name}</small>`,'slot',i,`aria-pressed="${selectedSlot===i}" aria-label="${i+1}번 ${name}${p?' 성장 '+p.stage+'단계':''}"`);
      }).join('')}</div></div>`;
  }
  function farmPanel(){
    const p=state.plots.find(x=>x.slot===selectedSlot);
    const stageText=['씨앗이 흙에서 쉬고 있어요.','작은 새싹이 나왔어요.','열매가 자라고 있어요.','수확할 준비가 됐어요!'];
    const controls=p
      ?`<h3>${selectedSlot+1}번 밭 · ${LIFE_CROPS[p.species].title}</h3>
        <p>${stageText[p.stage]}</p><div class="life-actions">${p.stage===3
          ?button('🧺 수확하기','harvest','','class="life-primary"')
          :button(careLabels[plantCare[p.stage]],'care-plant','','class="life-primary"')}</div>`
      :`<h3>${selectedSlot+1}번 밭에 무엇을 심을까요?</h3><p>씨앗은 언제나 무료예요.</p>
        <div class="life-choices">${Object.entries(LIFE_CROPS).map(([id,c])=>button(c.emoji+' '+c.title,'crop',id,`aria-pressed="${chosenCrop===id}"`)).join('')}</div>
        <div class="life-actions">${button('🌱 씨앗 심기','plant','','class="life-primary"')}</div>`;
    return sceneFarm()+`<div class="life-details">${controls}<div class="life-basket">🧺 나의 수확 바구니 · ${Object.entries(LIFE_CROPS).map(([id,c])=>`${c.emoji} ${state.harvest[id]}개`).join('　')}</div></div>`;
  }
  function animalStage(kind){
    const fish=kind==='fish',list=fish?state.fish:state.pets,catalog=fish?LIFE_FISH:LIFE_PETS,selected=fish?selectedFish:selectedPet;
    const scene=fish?'life-pond-scene':'life-pet-scene';
    const picture=fish?art('./assets/artcraft-v12/pond.png'):'';
    const decoration=fish?{lily:'🪷 🪷',stones:'🪨 🪨',reeds:'🌾 🌾'}[state.decor.pond]:{meadow:'🌿 🌱',flowers:'🌸 🌼',cozy:'🧺 🛖'}[state.decor.pets];
    return `<div class="life-scene ${scene}" data-decor="${fish?state.decor.pond:state.decor.pets}" data-effect="${effect}">${picture.replace('src="','class="life-pond-art" src="')}
      <div class="life-scene-decor" aria-hidden="true">${decoration}</div>
      <div class="${fish?'life-fish-stage':'life-pet-stage'}">${list.length?list.map(a=>`<div class="life-animal">
        <div class="life-animal-visual" data-growth="${fish?a.growth:0}" style="--life-growth:${fish?a.growth:0}">
        ${!fish&&a.species==='rabbit'?art('./assets/artcraft-v12/npc_bunny.png'): `<span class="life-emoji" aria-hidden="true">${catalog[a.species].emoji}</span>`}</div>
        ${!fish?`<span class="life-hearts" aria-label="친밀함 ${a.bond}단계">${'💗'.repeat(a.bond)}${'♡'.repeat(3-a.bond)}</span>`:''}
        <strong data-life-name="${a.id}"></strong></div>`).join(''):`<div class="life-empty">${fish?'맑은 연못에 친구를 초대해요!':'폭신한 풀밭에 친구를 초대해요!'}</div>`}</div></div>
      <div class="life-animals-list">${list.map(a=>button(catalog[a.species].emoji+' '+htmlSafe(a.name),'select-'+kind,a.id,`aria-pressed="${selected===a.id}"`)).join('')}</div>`;
  }
  function animalPanel(kind){
    const fish=kind==='fish',list=fish?state.fish:state.pets,catalog=fish?LIFE_FISH:LIFE_PETS,selected=fish?selectedFish:selectedPet;
    const picked=list.find(a=>a.id===selected);
    const max=fish?3:2,care=fish?fishCare:petCare,measure=fish?'growth':'bond';
    const title=fish?'우리 연못':'우리 동물 친구';
    const adopt=Object.entries(catalog).map(([id,c])=>button(c.emoji+' '+c.title+' 초대','adopt-'+kind,id)).join('');
    const decor=fish?{lily:'🪷 수련',stones:'🪨 조약돌',reeds:'🌾 갈대'}:{meadow:'🌿 초원',flowers:'🌸 꽃밭',cozy:'🧺 포근한 집'};
    return animalStage(kind)+`<div class="life-details"><h3>${title} (${list.length}/${max})</h3>
      ${list.length<max?`<p>함께할 친구를 골라요. 모두 무료예요.</p><div class="life-choices">${adopt}</div>`:''}
      ${picked?`<p class="life-subtext">${fish?'자란 모습':'친밀함'} ${picked[measure]}/3 ${fish?'🫧':'💗'} · 함께한 시간 ${picked.careStep}번</p>
        <div class="life-actions">${button(careLabels[care[picked.careStep%3]],'care-'+kind,'','class="life-primary"')}</div>
        <form class="life-name-form" data-life-name-form="${kind}">
          <label class="life-subtext" for="life-name-${kind}">친구 이름</label>
          <input id="life-name-${kind}" name="friendName" maxlength="24" autocomplete="off" aria-label="새 친구 이름" required>
          <button type="submit">이름 바꾸기</button>
        </form>`:list.length?'<p>아래에서 친구를 골라 보세요.</p>':''}
      ${!fish&&worldAvailable&&list.length?`<div class="life-world-controls" role="group" aria-label="3D 마을 동물 행동">
        <h3>3D 마을에서 함께 놀기</h3>
        <div class="life-actions">${button('🐾 마을에서 산책','world','LIFE_ROAM')}${button('💗 나를 따라와','world','LIFE_FOLLOW')}${button('💤 잠깐 쉬기','world','LIFE_REST')}</div>
      </div>`:''}
      <h3>우리 공간 꾸미기</h3>
      <div class="life-choices">${Object.entries(decor).map(([id,label])=>button(label,'decor-'+kind,id,`aria-pressed="${state.decor[fish?'pond':'pets']===id}"`)).join('')}</div></div>`;
  }
  function render(focus){
    if(destroyed)return;
    const ok=refresh();
    if(!ok){element.replaceChildren();const output=document.createElement('p');output.className='life-message';output.tabIndex=-1;output.setAttribute('role','alert');output.textContent=message;element.append(output);output.focus({preventScroll:true});return;}
    if(!state.fish.some(a=>a.id===selectedFish))selectedFish=state.fish[0]?.id??null;
    if(!state.pets.some(a=>a.id===selectedPet))selectedPet=state.pets[0]?.id??null;
    element.innerHTML=`<nav class="life-tabs" aria-label="생활 놀이 선택">${Object.entries(tabTitles).map(([id,label])=>button(label,'tab',id,`aria-pressed="${currentTab===id}"`)).join('')}</nav>
      <div data-life-tab="${currentTab}">${currentTab==='farm'?farmPanel():animalPanel(currentTab==='pond'?'fish':'pet')}</div>
      <output class="life-message" tabindex="-1" aria-live="polite" aria-atomic="true"></output>`;
    for(const nameNode of element.querySelectorAll('[data-life-name]')){
      const id=Number(nameNode.dataset.lifeName);
      nameNode.textContent=[...state.fish,...state.pets].find(a=>a.id===id)?.name??'친구';
    }
    element.querySelector('.life-message').textContent=message;
    if(pending)element.querySelectorAll('button[data-life-action], form button[type="submit"]').forEach(b=>{if(!['tab','slot','crop','select-fish','select-pet'].includes(b.dataset.lifeAction))b.disabled=true;});
    if(focus){
      const candidate=[...element.querySelectorAll('[data-life-action]')].find(b=>b.dataset.lifeAction===focus.action&&b.dataset.lifeValue===focus.value&&!b.disabled);
      (candidate||element.querySelector('.life-message'))?.focus?.({preventScroll:true});
    }
  }
  async function dispatch(action,focus){
    if(!state||pending||destroyed)return;
    const expectedRevision=state.revision;
    pending=true;
    element.dataset.lifeBusy='true';
    render(focus);
    try{
      const execute=()=>store.dispatch({who,area,expectedRevision,...action});
      const locks=globalThis.navigator?.locks;
      const result=typeof locks?.request==='function'
        ?await locks.request('sparkle-life-v16:'+namespace,{mode:'exclusive'},execute)
        :execute();
      if(destroyed)return;
      message=result.message;
      state=result.snapshot;
      if(action.type==='CARE_PET')flash(action.care);
      if(action.type==='CARE_FISH')flash(action.care);
      try{onSnapshot(snapshot());}catch(error){console.warn('Life snapshot observer failed',error);}
    }catch(err){if(!destroyed)message=err.message||'저장하지 못했어요.';}
    finally{pending=false;element.dataset.lifeBusy='false';if(!destroyed)render(focus);}
  }
  function onClick(e){
    if(pending)return;
    const target=e.target.closest('button[data-life-action]');
    if(!target||!element.contains(target))return;
    const act=target.dataset.lifeAction,value=target.dataset.lifeValue;
    const focus={action:act,value};
    if(act==='world'&&worldAvailable&&currentTab==='pets'&&state?.pets.length&&['LIFE_ROAM','LIFE_FOLLOW','LIFE_REST'].includes(value)){
      onWorldCommand(value);
      return;
    }
    if(act==='tab'){currentTab=value;message={farm:'씨앗을 심어 봐요.',pond:'물고기 친구를 만나 봐요.',pets:'토끼와 햄스터를 만나 봐요.'}[value];render(focus);return;}
    if(act==='slot'){selectedSlot=Number(value);render(focus);return;}
    if(act==='crop'){chosenCrop=value;render(focus);return;}
    if(act==='select-fish'){selectedFish=Number(value);render(focus);return;}
    if(act==='select-pet'){selectedPet=Number(value);render(focus);return;}
    const p=state?.plots.find(x=>x.slot===selectedSlot);
    if(act==='plant')return dispatch({type:'PLANT',slot:selectedSlot,species:chosenCrop},focus);
    if(act==='care-plant'&&p)return dispatch({type:'CARE_PLANT',slot:selectedSlot,care:plantCare[p.stage],expectedStage:p.stage,expectedCycle:p.cycle},focus);
    if(act==='harvest'&&p)return dispatch({type:'HARVEST',slot:selectedSlot,expectedCycle:p.cycle},focus);
    if(act==='adopt-fish'||act==='adopt-pet')return dispatch({type:act==='adopt-fish'?'ADOPT_FISH':'ADOPT_PET',species:value},focus);
    if(act==='decor-fish'||act==='decor-pet')return dispatch({type:'DECORATE',kind:act==='decor-fish'?'pond':'pets',value},focus);
    if(act==='care-fish'||act==='care-pet'){
      const fish=act==='care-fish',a=(fish?state.fish:state.pets).find(x=>x.id===(fish?selectedFish:selectedPet));
      if(a)return dispatch({type:fish?'CARE_FISH':'CARE_PET',id:a.id,care:(fish?fishCare:petCare)[a.careStep%3],expectedStep:a.careStep},focus);
    }
  }
  function onSubmit(e){
    const form=e.target.closest('form[data-life-name-form]');
    if(!form||!element.contains(form))return;
    e.preventDefault();
    if(pending)return;
    const fish=form.dataset.lifeNameForm==='fish',id=fish?selectedFish:selectedPet;
    const value=form.elements.namedItem('friendName')?.value;
    if(id!=null)dispatch({type:'RENAME',kind:fish?'fish':'pet',id,name:value},{action:'select-'+(fish?'fish':'pet'),value:String(id)});
  }
  function onVisibility(){element.dataset.pageHidden=String(document.hidden);}
  element.addEventListener('click',onClick);
  element.addEventListener('submit',onSubmit);
  document.addEventListener('visibilitychange',onVisibility);
  onVisibility();
  render();
  return {element,snapshot,refresh:()=>render(),get pending(){return pending;},destroy(){
    if(destroyed)return;
    destroyed=true;
    if(effectTimer!==null)clearTimeout(effectTimer);
    element.removeEventListener('click',onClick);
    element.removeEventListener('submit',onSubmit);
    document.removeEventListener('visibilitychange',onVisibility);
    element.replaceChildren();
  }};
}
