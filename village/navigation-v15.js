// Four destinations, one drawer, and the existing game actions as the source of truth.
export const NAVIGATION_V15 = Object.freeze({
  learn: {label:'배움', icon:'📚', items:[
    ['vh-quest','이야기 모험'],['district:math','수학'],['district:korean','국어'],['district:english','영어'],
    ['district:growth','성장'],['district:kma','경시'],['district:practice','연습'],
    ['district:academy','학교'],['vh-adaptive','추천'],['vh-workshop','생각 공방']]},
  explore: {label:'탐험',icon:'🗺️',items:[
    ['vh-home','내 마을'],['vh-plaza','가족 광장'],['vh-map','모험 지도'],
    ['vh-run','달리기'],['vh-wave','인사'],['vh-hop','날기']]},
  decorate: {label:'꾸미기',icon:'🌱',items:[
    ['vh-garden','정원'],['vh-wardrobe','스타일'],['vh-shop','별 상점']]},
  settings: {label:'설정',icon:'⚙️',items:[
    ['vh-motion','움직임'],['vh-nav-listen','읽기 안내'],['vh-records','학습기록']]}
});

export function createNavigationV15({root, onNavigationChange=()=>{},canOpen=()=>true,additions={}}) {
  // Keep the existing destinations intact; feature panels add original DOM actions.
  const definitions=Object.fromEntries(Object.entries(NAVIGATION_V15).map(([category,definition])=>[
    category,{...definition,items:[...definition.items,...(additions[category]||[])]}
  ]));
  const doc=root.ownerDocument;
  const oldControls=root.querySelector('#village-controls');
  const oldDistricts=root.querySelector('#vh-learning-districts');
  const oldShortcuts=root.querySelector('#vh-world-shortcuts');
  const extra=root.querySelector('#vh-extra-tools');
  const dock=doc.createElement('nav');
  dock.id='vh-navigation-dock';
  dock.setAttribute('aria-label','마법마을 메뉴');
  const layer=doc.createElement('div');
  layer.id='vh-navigation-layer';
  layer.hidden=true;
  const backdrop=doc.createElement('button');
  backdrop.id='vh-navigation-backdrop';
  backdrop.type='button';
  backdrop.tabIndex=-1;
  backdrop.setAttribute('aria-label','메뉴 닫기');
  const panel=doc.createElement('section');
  panel.id='vh-navigation-panel';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.setAttribute('aria-labelledby','vh-navigation-title');
  const header=doc.createElement('div');
  header.className='vh-nav-heading';
  const heading=doc.createElement('h2');
  heading.id='vh-navigation-title';
  const closeButton=doc.createElement('button');
  closeButton.type='button';closeButton.id='vh-navigation-close';
  closeButton.textContent='✕ 닫기';closeButton.setAttribute('aria-label','메뉴 닫기');
  header.append(heading,closeButton);
  const items=doc.createElement('div');items.id='vh-navigation-items';
  panel.append(header,items);layer.append(backdrop,panel);
  root.append(dock,layer);
  let opened=null,returnFocus=null;
  const muted=[];
  const triggers=new Map();
  const registry=new Map();
  function entry(key){
    if(key.startsWith('district:')) return oldDistricts?.querySelector('[data-district="'+key.slice(9)+'"]');
    return root.querySelector('#'+key);
  }
  const listen=doc.createElement('button');
  listen.id='vh-nav-listen';
  listen.type='button';
  listen.textContent='🔊 읽기 안내';
  listen.addEventListener('click',()=>{
    if('speechSynthesis' in window){
      window.speechSynthesis.cancel();
      const utterance=new SpeechSynthesisUtterance('배움, 탐험, 꾸미기, 설정 메뉴에서 원하는 활동을 고르세요.');
      utterance.lang='ko-KR';window.speechSynthesis.speak(utterance);
    } else {listen.textContent='음성 안내를 사용할 수 없어요';}
  });
  const allKeys=new Set();
  for(const [category,definition] of Object.entries(definitions)){
    const trigger=doc.createElement('button');
    trigger.type='button';trigger.className='vh-nav-trigger';
    trigger.dataset.category=category;
    trigger.setAttribute('aria-controls','vh-navigation-layer');
    trigger.setAttribute('aria-expanded','false');
    trigger.innerHTML='<span aria-hidden="true">'+definition.icon+'</span><span>'+definition.label+'</span>';
    trigger.addEventListener('click',()=>opened===category?close():open(category));
    dock.append(trigger);triggers.set(category,trigger);
    const group=doc.createElement('div');
    group.dataset.navCategory=category;
    group.className='vh-nav-group';
    group.hidden=true;
    for(const [key,label] of definition.items){
      if(allKeys.has(key))throw new Error('Duplicate navigation destination: '+key);
      allKeys.add(key);
      const action=key==='vh-nav-listen'?listen:entry(key);
      if(!action)throw new Error('Missing navigation action: '+key);
      action.dataset.navAction=key;
      action.classList.add('vh-nav-item');
      // Visible original wording is also the accessible name.
      if(key!=='vh-nav-listen')action.removeAttribute('aria-label');
      // Existing action handlers execute after this listener. Close first so
      // a newly opened learning modal owns keyboard focus and pointer input.
      if(key!=='vh-nav-listen' && key!=='vh-motion'){
        action.addEventListener('click',()=>{if(!action.disabled)close();},{capture:true});
      }
      group.append(action);
      registry.set(key,{category,label,element:action,threeDOnly:['vh-run','vh-hop','vh-wave'].includes(key)});
    }
    items.append(group);
  }
  oldControls.hidden=true;
  oldDistricts.hidden=true;
  oldShortcuts.hidden=true;
  if(extra)extra.hidden=true;
  if(oldShortcuts)oldShortcuts.setAttribute('aria-hidden','true');
  const focusable=()=>[...panel.querySelectorAll('button:not([disabled]),a[href],input,select,[tabindex]:not([tabindex="-1"])')]
    .filter(el=>!el.closest('[hidden]') && el.getClientRects().length>0);
  function open(category){
    if(!Object.hasOwn(definitions,category) || !canOpen() || root.querySelector('#village-dialog-wrap')?.hidden===false)return;
    if(!opened)returnFocus=doc.activeElement;
    opened=category;layer.hidden=false;
    for(const child of root.children){
      if(child===layer || child.hasAttribute('inert'))continue;
      child.setAttribute('inert','');
      muted.push(child);
    }
    heading.textContent=definitions[category].icon+' '+definitions[category].label;
    for(const group of items.children)group.hidden=group.dataset.navCategory!==category;
    for(const [name,button] of triggers)button.setAttribute('aria-expanded',String(name===category));
    root.dataset.navigationOpen='true';onNavigationChange(true);
    closeButton.focus({preventScroll:true});
  }
  function close({restoreFocus=true}={}){
    if(!opened)return;
    opened=null;layer.hidden=true;root.dataset.navigationOpen='false';
    for(const child of muted)child.removeAttribute('inert');
    muted.length=0;
    for(const button of triggers.values())button.setAttribute('aria-expanded','false');
    onNavigationChange(false);
    if(restoreFocus){
      const target=returnFocus?.isConnected?returnFocus:triggers.get('learn');
      target?.focus({preventScroll:true});
    }
    returnFocus=null;
  }
  backdrop.addEventListener('click',()=>close());
  closeButton.addEventListener('click',()=>close());
  function keydown(event){
    if(!opened || event.defaultPrevented)return;
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key!=='Tab')return;
    const focus=focusable();
    if(!focus.length)return;
    const current=focus.indexOf(doc.activeElement);
    if(event.shiftKey && current<=0){event.preventDefault();focus.at(-1).focus();}
    else if(!event.shiftKey && current===focus.length-1){event.preventDefault();focus[0].focus();}
  }
  root.addEventListener('keydown',keydown,true);
  // Capture UI touch before it can move the Unity character.
  for(const type of ['pointerdown','pointerup','pointercancel','touchcancel'])
    layer.addEventListener(type,e=>e.stopPropagation());
  function syncMode(){
    const lite=root.dataset.lite==='true';
    for(const value of registry.values())if(value.threeDOnly){value.element.hidden=lite;value.element.disabled=lite;}
    root.dataset.navigationMode=lite?'2d':'3d';
  }
  function snapshot(){return {open:opened,mode:root.dataset.navigationMode,categoryCount:4,groups:Object.fromEntries(Object.keys(NAVIGATION_V15).map(category=>[category,[...registry.entries()].filter(([,value])=>value.category===category && !value.element.hidden).map(([key])=>key)])),available:[...registry.entries()].filter(([,value])=>!value.element.hidden).map(([key])=>key),aliases:{'vh-bebsu':'district:kma'}};}
  root.dataset.navigation='v15';root.dataset.navigationOpen='false';syncMode();
  return {open,close,isOpen:()=>Boolean(opened),registry,syncMode,snapshot,
    destroy(){root.removeEventListener('keydown',keydown,true);layer.remove();dock.remove();}};
}
