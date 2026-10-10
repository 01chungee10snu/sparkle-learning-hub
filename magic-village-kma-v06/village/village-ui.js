import {SPECIES,CARE} from './garden-state.js';
// DOM-driven game HUD, designed for readable mobile buttons and accessibility.
// It never scores an answer: the established learning platform remains authoritative.
function nativeProgressArt(answered,total){
 if(!Number.isInteger(total)||total<=0)return 'seed';
 const count=Number.isFinite(answered)?Math.min(total,Math.max(0,Math.floor(answered))):0;
 return count===0?'seed':count>=total?'bloom':count/total<.5?'sprout':'bud';
}
export function createVillageUI({root, sendToUnity, sendRequest}) {
  if (!root || typeof sendToUnity !== 'function' || typeof sendRequest !== 'function')
    throw new TypeError('village UI needs an element and bridge callbacks');
  root.innerHTML = [
    '<section id="village-info" class="vh-card" aria-label="마을 상태">',
    ' <div class="vh-avatar" aria-hidden="true"></div>',
    ' <div class="vh-meta"><h2 id="vh-name">마법마을</h2>',
    ' <p><span id="vh-area">내 마을</span> · <span class="vh-stars"><img class="vh-currency-art" src="./assets/star_yellow.png" alt="" width="20" height="20"> <span id="vh-stars">0</span>개</span></p>',
    ' <p id="vh-progress">오늘도 나만의 속도로 탐험해요</p>',
    ' <p id="vh-outfit" class="vh-outfit">✨ 장식 없음 · 선물 가게에서 꾸며요</p></div>',
    '</section>',
    '<p id="vh-help" class="vh-help">바닥을 터치해 이동하고 친구를 만나보세요.</p>',
    '<nav id="village-controls" aria-label="마법마을 바로가기">',
    ' <button id="vh-home" class="vh-action" type="button" aria-current="page"><span>🏡</span>내 마을</button>',
    ' <button id="vh-plaza" class="vh-action" type="button"><span>🌷</span>가족 광장</button>',
    ' <button id="vh-quest" class="vh-action" type="button"><span>🐰</span>오늘의 부탁</button>',
    ' <button id="vh-bebsu" class="vh-action vh-challenge-action" type="button"><span>🏆</span>벡수 25문제</button>',
    '</nav>',
    '<aside id="vh-world-shortcuts" aria-label="마법마을 특별 장소">',
    ' <button id="vh-map" type="button" class="vh-shortcut">🗺️ 탐험 지도</button>',
    ' <button id="vh-garden" type="button" class="vh-shortcut">🌱 나무·꽃 키우기</button>',
    ' <button id="vh-more" type="button" class="vh-shortcut" aria-expanded="false" aria-controls="vh-extra-tools">✨ 더 놀기</button>',
    ' <div id="vh-extra-tools" hidden>',
    ' <button id="vh-run" type="button" class="vh-shortcut" aria-pressed="false">🏃 달리기</button>',
    ' <button id="vh-hop" type="button" class="vh-shortcut">🪽 살짝 날기</button>',
    ' <button id="vh-wave" type="button" class="vh-shortcut">👋 인사</button>',
    ' <button id="vh-adaptive" type="button" class="vh-shortcut">🔮 적응 모험</button>',
    ' <button id="vh-shop" type="button" class="vh-shortcut">🎁 별 상점</button>',
    ' <button id="vh-pose" type="button" class="vh-shortcut" aria-pressed="false">🎭 8방향 시안</button>',
    ' </div>',
    '</aside>',
    '<p id="village-toast" role="alert" hidden></p>',
    '<div id="village-dialog-wrap" hidden aria-busy="false">',
    ' <section class="vh-dialog" role="dialog" aria-modal="true" aria-labelledby="vh-title">',
    '  <header class="vh-dialog-title"><h2 id="vh-title" tabindex="-1">배움 이야기</h2>',
    '    <span class="vh-progress" id="vh-counter"></span></header>',
    '  <div class="vh-dialog-body" id="vh-body"></div>',
    '  <footer class="vh-dialog-footer"><button class="vh-secondary" id="vh-listen" type="button">🔊 읽어줘</button>',
    '   <button class="vh-secondary" id="vh-hint" type="button" hidden>💡 힌트</button>',
    '   <button class="vh-secondary" id="vh-exit" type="button">잠깐 쉬기</button>',
    '   <p class="vh-small" id="vh-note">틀려도 괜찮아요. 하나씩 생각해요.</p></footer>',
    ' </section>',
    '</div>'
  ].join('');
  root.dataset.who = 'tae';
  const $ = id => root.querySelector('#' + id);
  const ui = {
    name:$('vh-name'), area:$('vh-area'), stars:$('vh-stars'),
    progress:$('vh-progress'), outfit:$('vh-outfit'), help:$('vh-help'),
    home:$('vh-home'), plaza:$('vh-plaza'), quest:$('vh-quest'), bebsu:$('vh-bebsu'),
    adaptive:$('vh-adaptive'), shop:$('vh-shop'), pose:$('vh-pose'), shortcuts:$('vh-world-shortcuts'),
    dialog:$('village-dialog-wrap'), title:$('vh-title'),
    counter:$('vh-counter'), body:$('vh-body'), exit:$('vh-exit'),
    listen:$('vh-listen'), hint:$('vh-hint'), note:$('vh-note'), controls:$('village-controls'),
    toast:$('village-toast')
  };
  let who = 'tae', zone = 'home', gameId = '', question = null;
  let phase = 'explore', busy = false, lastFocus = null, voiceText = '';
  let requestNumber = 0, pendingRequest = '', sessionRounds = 0;
  let mostRecentRoundId = '', reinforcementStars = 0;
  let experimentalArt=false;
  let shopCategory='light', shopData=null, adaptiveSubject='math', adaptiveGrade='';
  let contentTarget=ui.body;
  const theme = value => {
    ui.dialog.dataset.theme=value;
    ui.dialog.querySelector('.vh-dialog').dataset.theme=value;
  };
  const retiredRequests = new Set();
  const children = {tae:'태희', se:'세희'};
  const nextId = () => 'webui-' + (++requestNumber);
  const label = (tag, text, className) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = String(text ?? '');
    return element;
  };
  const button = (text, onClick, css = 'vh-option') => {
    const element = label('button', text, css);
    element.type = 'button';
    element.addEventListener('click',onClick);
    return element;
  };
  function announce(message) {
    ui.toast.textContent = message;
    ui.toast.hidden = !message;
    if (message) console.warn('[마법마을]', message);
  }
  function request(action, extra = {}) {
    if (busy) return;
    busy = true;
    ui.dialog.setAttribute('aria-busy','true');
    const requestId=nextId(); pendingRequest=requestId;
    return Promise.resolve().then(()=>sendRequest({
      action, requestId, gameId, area:zone, ...extra
    })).catch(e => {
      if(retiredRequests.has(requestId))return;
      pendingRequest='';
      busy = false;
      ui.dialog.setAttribute('aria-busy','false');
      announce(e?.message || '요청에 문제가 발생했어요.');
    });
  }
  function setZone(next) {
    if (phase !== 'explore' || busy || root.dataset.ready!=='true' || zone===next) return;
    busy=true; ui.home.disabled=ui.plaza.disabled=ui.quest.disabled=ui.bebsu.disabled=true;
    zone = next;
    ui.home.setAttribute('aria-current',next === 'home'?'page':'false');
    ui.plaza.setAttribute('aria-current',next === 'plaza'?'page':'false');
    ui.area.textContent = next === 'plaza' ? '가족 공용 광장' : '나의 마을';
    ui.help.textContent = next === 'plaza' ?
      '함께 피운 꽃을 구경하고 우체국 친구를 만나보세요.' :
      '바닥을 터치해 이동하고 친구를 만나보세요.';
    sendToUnity(next === 'plaza' ? 'GO_PLAZA' : 'GO_HOME');
  }

  let careGarden=null, runActive=false;
  function collapseTools(){ $('vh-extra-tools').hidden=true;$('vh-more').setAttribute('aria-expanded','false'); }
  $('vh-more').addEventListener('click',()=>{
    if(!safeExplore())return;
    const expanded=$('vh-extra-tools').hidden;
    $('vh-extra-tools').hidden=!expanded;$('vh-more').setAttribute('aria-expanded',String(expanded));
  });
  const safeExplore=()=>phase==='explore'&&!busy&&root.dataset.ready==='true';
  $('vh-map').addEventListener('click',()=>{
    if(!safeExplore())return;
    open();resetBody();phase='map';theme('scroll');root.dataset.mode='map';
    ui.title.textContent='🗺️ 마법마을 탐험 지도';ui.counter.textContent='새로운 길을 찾아요';
    voiceText='열매 숲, 꽃 초원, 별빛 언덕, 소풍길과 나의 정원을 탐험해요.';
    paragraph('어디로 가고 싶나요? 장소를 고르면 요정이 길을 따라 이동해요.','vh-story');
    const grid=label('div','','vh-garden-grid');
    for(const [name,command] of [['🌳 열매 숲','GO_ORCHARD'],['🦋 꽃 초원','GO_MEADOW'],['✨ 별빛 언덕','GO_HILL'],['🧺 소풍길','GO_PICNIC'],['🌱 나의 정원','GO_GARDEN']])
      grid.append(button(name,()=>{close();sendToUnity(command);},'vh-garden-slot'));
    ui.body.append(grid);ui.note.textContent='탐험과 가꾸기는 자유롭게 즐길 수 있어요.';
  });
  $('vh-garden').addEventListener('click',()=>{if(safeExplore())request('GARDEN_OPEN',{slot:-1});});
  $('vh-run').addEventListener('click',()=>{
    if(!safeExplore())return;runActive=!runActive;
    $('vh-run').setAttribute('aria-pressed',String(runActive));$('vh-run').textContent=runActive?'🚶 걷기':'🏃 달리기';
    sendToUnity('RUN_TOGGLE');
  });
  $('vh-hop').addEventListener('click',()=>{if(safeExplore())sendToUnity('HOP');});
  $('vh-wave').addEventListener('click',()=>{if(safeExplore())sendToUnity('WAVE');});
  function showGarden(data) {
    if(!data.garden)return;
    careGarden=data.garden;open();resetBody();phase='garden';theme('garden');root.dataset.mode='garden';
    ui.title.textContent='🌱 '+(zone==='plaza'?'함께 가꾸는 정원':'나의 나무·꽃 정원');
    ui.counter.textContent='씨앗은 자유롭게 골라요';
    ui.note.textContent='다음에 와도 그대로예요. 쉬는 동안 시들지 않아요.';
    ui.listen.hidden=false;voiceText='씨앗을 심고, 물과 햇빛과 노래로 나무와 꽃을 키워요.';
    if(data.gardenMessage)paragraph(data.gardenMessage,'vh-feedback');
    const selected=Number.isInteger(data.gardenSlot)?data.gardenSlot:-1;
    const grid=label('div','','vh-garden-grid');
    for(let slot=0;slot<8;slot++) {
      const plant=careGarden.plants.find(p=>p.slot===slot), kind=plant&&SPECIES[plant.species];
      const text=plant?kind.emoji+' '+kind.title+' '+plant.stage+'/'+kind.steps:'🌰 '+(slot+1)+'번 흙자리';
      const b=button(text,()=>request('GARDEN_OPEN',{slot}),'vh-garden-slot');
      b.setAttribute('aria-pressed',String(selected===slot));grid.append(b);
    }
    ui.body.append(grid);
    if(selected<0||selected>7) {paragraph('빈 흙자리를 골라 씨앗을 심어요. 자라는 식물도 눌러 보세요.','vh-story');return;}
    const plant=careGarden.plants.find(p=>p.slot===selected);
    if(!plant) {
      paragraph((selected+1)+'번 자리에서 무엇을 키울까요?','vh-prompt');
      const seeds=label('div','','vh-garden-grid');
      for(const [species,kind] of Object.entries(SPECIES))
        seeds.append(button(kind.emoji+' '+kind.title,()=>request('GARDEN_PLANT',{slot:selected,species}),'vh-garden-slot'));
      ui.body.append(seeds);
    } else {
      const kind=SPECIES[plant.species],finished=plant.stage>=kind.steps;
      const scene=label('figure','','vh-growing-scene');
      scene.setAttribute('aria-label',kind.title+' 성장 모습');
      const visual=label('div','','vh-growing-plant');
      const art=plant.stage===0?'seed':plant.stage===1?'sprout':plant.stage===2?'bud':null;
      if(art){const image=document.createElement('img');image.src='./assets/'+art+'.png';image.alt='';visual.append(image);}
      else if(['flowers_pink','flowers_sun'].includes(plant.species)){
        const image=document.createElement('img');image.src='./assets/gameplay/'+plant.species+'.png';image.alt='';visual.append(image);
      } else visual.textContent=kind.emoji;
      visual.style.setProperty('--plant-scale',String(.65+.35*plant.stage/kind.steps));
      scene.append(visual,label('figcaption',plant.stage===0?'내가 심은 씨앗':plant.stage===1?'작은 새싹':plant.stage===2?'쑥쑥 자라는 중':finished?'내가 가꾼 '+kind.title:'더 크게 자라는 '+kind.title));
      if(data.action==='GARDEN_CARE'){
        const effect=label('span',['💧','☀️','🎵'][(plant.stage-1)%3],'vh-care-effect');
        effect.setAttribute('aria-hidden','true');scene.append(effect);
        scene.dataset.cared='true';
      }
      ui.body.append(scene);
      const progress=document.createElement('progress');progress.max=kind.steps;progress.value=plant.stage;
      progress.setAttribute('aria-label',kind.title+' 성장 '+plant.stage+'/'+kind.steps);ui.body.append(progress);
      paragraph(finished?'내가 가꾼 '+kind.title+'! 마을에서도 구경해요.':
        kind.title+'에게 '+['물을','햇빛을','노래를'][plant.stage%3]+' 선물해 주세요.','vh-prompt');
      if(!finished) {
        const actions=label('div','','vh-garden-care');
        for(const [index,name] of ['💧 물주기','☀️ 햇빛','🎵 노래'].entries()) {
          const b=button(name,()=>request('GARDEN_CARE',{slot:selected,care:CARE[index],expectedStage:plant.stage}),'vh-garden-slot');
          b.disabled=index!==plant.stage%3;actions.append(b);
        }
        ui.body.append(actions);
      }
      ui.body.append(button('🧚 정원으로 걸어가기',()=>{close();sendToUnity('GO_GARDEN');},'vh-wide'));
    }
  }
  ui.home.addEventListener('click',()=>setZone('home'));
  ui.plaza.addEventListener('click',()=>setZone('plaza'));
  ui.quest.addEventListener('click',()=>{
    if (phase === 'explore' && !busy && root.dataset.ready==='true') {
      busy=true;ui.home.disabled=ui.plaza.disabled=ui.quest.disabled=ui.bebsu.disabled=true;
      sendToUnity('START_RECOMMENDED');
    }
  });
  ui.bebsu.addEventListener('click',()=>{
    if (phase==='explore'&&!busy&&root.dataset.ready==='true') request('SHOW_BEBSU');
  });
  ui.shop.addEventListener('click',()=>{
    if (phase==='explore'&&!busy&&root.dataset.ready==='true') request('SHOP_OPEN');
  });
  ui.pose.addEventListener('click',()=>{
    if(phase!=='explore'||busy||root.dataset.ready!=='true')return;
    experimentalArt=!experimentalArt;
    ui.pose.setAttribute('aria-pressed',String(experimentalArt));
    ui.pose.textContent=experimentalArt?'🎨 고화질 원화':'🎭 8방향 시안';
    root.dataset.prototypeArt=experimentalArt?'eight':'premium';
    sendToUnity(experimentalArt?'ART_PREVIEW8':'ART_PREMIUM');
    announce(experimentalArt?
      '8방향 독립 원화 시안이에요. 고해상도 최종본은 아직 추가 작업이 필요해요.':'고화질 캐릭터 원화로 돌아왔어요.');
  });
  ui.adaptive.addEventListener('click',()=>{
    if (phase==='explore'&&!busy&&root.dataset.ready==='true') {
      adaptiveGrade=who==='se'?'K':'G1';adaptiveSubject='math';
      request('ADAPTIVE_OFFER',{subject:adaptiveSubject,grade:adaptiveGrade});
    }
  });
  root.addEventListener('pointerdown', e => { if (e.target.closest('button,input,select,a,.vh-dialog')) sendToUnity('UI_POINTER'); },true);
  root.addEventListener('pointerup', e => { if (e.target.closest('button,input,select,a,.vh-dialog')) sendToUnity('UI_POINTER'); },true);
  ui.exit.addEventListener('click',close);
  ui.hint.addEventListener('click',()=>{if (phase==='question') request('HINT');});
  root.addEventListener('keydown',event=>{
    if (ui.dialog.hidden || event.key!=='Tab') return;
    const controls=[...ui.dialog.querySelectorAll('button,input,select,[tabindex="0"]')].filter(el=>!el.hidden&&!el.disabled&&el.getClientRects().length);
    if(!controls.length)return;
    const first=controls[0],last=controls.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
  ui.listen.addEventListener('click',()=>{
    if (!('speechSynthesis' in window)) {
      announce('이 브라우저에서는 음성 읽어주기를 지원하지 않아요.'); return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(voiceText);
    utterance.lang = 'ko-KR';
    utterance.rate = who === 'se' ? 0.84 : 0.94;
    window.speechSynthesis.speak(utterance);
  });
  function close() {
    if (pendingRequest) retiredRequests.add(pendingRequest);
    if (retiredRequests.size>128) retiredRequests.delete(retiredRequests.values().next().value);
    pendingRequest='';
    Promise.resolve().then(()=>sendRequest({action:'CANCEL',requestId:nextId(),gameId})).catch(()=>{});
    window.speechSynthesis?.cancel();
    ui.dialog.hidden = true;
    ui.controls.hidden = false;
    ui.help.hidden = false;
    ui.shortcuts.hidden=false;
    ui.dialog.removeAttribute('data-theme');
    ui.dialog.querySelector('.vh-dialog').removeAttribute('data-theme');
    root.dataset.mode='explore';
    phase = 'explore';
    busy = false;
    question = null;
    sendToUnity('CLOSE_QUEST');
    (lastFocus?.isConnected ? lastFocus : ui.quest).focus({preventScroll:true});
  }
  function open() {
    collapseTools();
    sendToUnity("PAUSE_EXPLORE");
    if (phase === 'explore') lastFocus = document.activeElement;
    ui.dialog.hidden = false;
    ui.controls.hidden = true;
    ui.help.hidden = true;
    ui.shortcuts.hidden=true;
    ui.exit.hidden = false;
    ui.hint.hidden = true;
    ui.listen.hidden = false;
    ui.note.hidden = false;
    ui.title.focus({preventScroll:true});
  }
  function resetBody() {
    // Numeric submit stays pinned above the footer on small Galaxy screens.
    ui.dialog.querySelectorAll('.vh-number-submit').forEach(el=>el.remove());
    ui.dialog.querySelector('.vh-dialog-footer')?.classList.remove('vh-has-keypad');
    ui.body.replaceChildren();
    contentTarget=ui.body;
    ui.dialog.setAttribute('aria-busy','false');
    busy = false;
  }
  function paragraph(text, className) {
    const p = label('p',text,className);
    contentTarget.append(p);
    return p;
  }
  function submit(answer) {
    if (busy || phase !== 'question') return;
    request('SUBMIT',{response:JSON.stringify(answer)});
  }
  function numericQuestion(q, kind) {
    if (kind === 'build') {
      const row = label('div','', 'vh-row');
      let amount = 0;
      const count = label('span',(q.emoji || '🍓') + ' ' + amount + (q.unit||''),'vh-number');
      const minus = button('−',()=>{amount=Math.max(0,amount-1);count.textContent=(q.emoji||'🍓')+' '+amount+(q.unit||'')},'vh-stepper');
      const plus = button('+',()=>{amount=Math.min(q.max,amount+1);count.textContent=(q.emoji||'🍓')+' '+amount+(q.unit||'')},'vh-stepper');
      minus.setAttribute('aria-label','하나 줄이기');
      plus.setAttribute('aria-label','하나 늘리기');
      row.append(minus,count,plus);
      contentTarget.append(row,button('이만큼 담았어요 ✨',()=>submit(amount),'vh-wide'));
      return;
    }
    // Android WebGL and the Samsung IME can lose keyboard focus on top of
    // a canvas. Always provide a true DOM touch keypad, independent of the OS.
    const min=Number.isSafeInteger(q.numericMin)?q.numericMin:0;
    const max=Number.isSafeInteger(q.numericMax)?q.numericMax:1000000;
    const allowMinus=min<0;
    const coarse=typeof window.matchMedia==='function'&&
      window.matchMedia('(pointer: coarse)').matches;
    const input=label('input','','vh-input vh-numeric-input');
    input.type='text';
    input.autocomplete='off';
    input.spellcheck=false;
    input.inputMode=coarse?'none':'numeric';
    input.readOnly=coarse;
    input.maxLength=8;
    input.setAttribute('aria-label','숫자 답');
    input.setAttribute('enterkeyhint','done');
    input.placeholder='아래 숫자판으로 답 입력';
    const live=label('output','','vh-numeric-sr');
    live.setAttribute('aria-live','polite');
    const holder=label('div','','vh-number-entry');
    holder.append(label('p','아래 숫자 버튼을 눌러 답을 입력해요.','vh-number-instruction'),input,live);
    const pad=label('div','','vh-number-keypad');
    pad.setAttribute('role','group');
    pad.setAttribute('aria-label','게임 숫자 키패드');
    const check=button('정답 확인 ✨',()=>submitNumeric(),'vh-wide vh-number-submit');
    check.disabled=true;
    function clean(value){
      const source=String(value??'').trim()
        .replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0))
        .replace(/[−－]/g,'-');
      const sign=allowMinus&&source.startsWith('-')?'-':'';
      let digits=source.replace(/[^0-9]/g,'').slice(0,7);
      if(digits.length>1)digits=digits.replace(/^0+(?=[0-9])/,'');
      return sign+digits;
    }
    function ready(){
      if(!/^-?[0-9]{1,7}$/.test(input.value))return false;
      const value=Number(input.value);
      return Number.isSafeInteger(value)&&value>=min&&value<=max;
    }
    function refresh(){
      const cleaned=clean(input.value);
      if(input.value!==cleaned)input.value=cleaned;
      check.disabled=!ready();
      live.textContent=input.value&&input.value!=='-'?
        '입력한 답 '+input.value:'아직 답을 입력하지 않았어요';
    }
    function setValue(value){
      input.value=value;
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
    function press(value){
      // Button taps must work even if Android refuses to launch its keyboard.
      if(document.activeElement===input&&!input.readOnly)input.blur();
      if(value==='back')setValue(input.value.slice(0,-1));
      else if(value==='clear')setValue('');
      else if(value==='minus'&&allowMinus)
        setValue(input.value.startsWith('-')?input.value.slice(1):'-'+input.value);
      else if(/^[0-9]$/.test(value))setValue(input.value+value);
    }
    function submitNumeric(){
      refresh();
      if(!ready()){
        announce('숫자를 입력하고 답을 확인해 주세요.');
        return;
      }
      submit(input.value.trim());
    }
    const rows=[
      ['1','2','3'],['4','5','6'],['7','8','9'],
      ['back','0','clear']
    ];
    for(const row of rows)for(const value of row){
      const shown=value==='back'?'⌫':value==='clear'?'지우기':value;
      const name=value==='back'?'마지막 숫자 지우기':
        value==='clear'?'전체 지우기':'숫자 '+value;
      const key=button(shown,()=>press(value),'vh-number-key');
      key.setAttribute('aria-label',name);
      key.dataset.key=value;
      pad.append(key);
    }
    if(allowMinus){
      const sign=button('＋ / −',()=>press('minus'),'vh-number-key vh-number-sign');
      sign.setAttribute('aria-label','양수 음수 전환');
      pad.append(sign);
    }
    input.addEventListener('input',refresh);
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'){
        event.preventDefault();
        submitNumeric();
      }
    });
    if(coarse){
      const native=button('⌨️ 휴대전화 키보드 사용',()=>{
        input.readOnly=false;
        input.inputMode='numeric';
        input.focus();
      },'vh-numeric-native');
      holder.append(native);
    }
    contentTarget.append(holder,pad);
    const footer=ui.dialog.querySelector('.vh-dialog-footer');
    footer.classList.add('vh-has-keypad');
    footer.prepend(check);
    refresh();
  }
  function matchQuestion(q) {
    const left = q.left?.length ? q.left : q.items;
    const right = q.right?.length ? q.right : q.items;
    if (!left?.length || !right?.length) {
      paragraph('문제를 표시할 수 없어요. 기존 배움터에서 학습해 주세요.','vh-story');
      return;
    }
    const panel = label('div','', 'vh-pairs');
    const picks = left.map(()=>-1);
    const selects = [];
    const refresh = () => selects.forEach((sel,i)=>{sel.value=String(picks[i])});
    left.forEach((part,i)=>{
      const line = label('div','', 'vh-pair');
      const leftText = label('span',part,'vh-pair-label');
      const sel = document.createElement('select');
      sel.setAttribute('aria-label',part+'의 짝 선택');
      const empty=label('option','짝을 골라 주세요'); empty.value='-1'; sel.append(empty);
      right.forEach((text,j)=>{
        const opt=label('option',(j+1)+'. '+text);
        opt.value=String(j);
        sel.append(opt);
      });
      sel.value='-1';
      sel.addEventListener('change',()=>{
        const next=Number(sel.value);
        const other=picks.indexOf(next);
        if (next>=0 && other!==-1 && other!==i) picks[other]=picks[i];
        picks[i]=next;
        refresh();
      });
      selects.push(sel);
      line.append(leftText,sel);
      panel.append(line);
    });
    contentTarget.append(panel,button('모두 연결했어요 ✨',()=>{
      if(picks.some(n=>n<0)){announce('모든 짝을 하나씩 골라 주세요.');return;}
      submit(picks);
    },'vh-wide'));
    paragraph('같은 번호를 고르면 기존 연결과 자리를 바꿔요.','vh-small');
  }
  function showVisual(visual) {
    if (!visual || typeof visual!=='object') return;
    const panel=label('div','','vh-visual');
    if(visual.kind==='groups'){
      for(const group of visual.groups||[]){
        const card=label('div','','vh-visual-group');
        card.append(label('span',group.label||'','vh-visual-label'));
        const count=Math.max(0,Math.min(30,Math.floor(Number(group.count)||0)));
        const objects=label('div',count?Array(count).fill(group.emoji||'●').join(' '):'비어 있어요','vh-counted');
        objects.setAttribute('role','img');
        objects.setAttribute('aria-label',(group.label||'물건')+' '+count+'개');
        card.append(objects);panel.append(card);
      }
    }else if(visual.kind==='counters'){
      panel.append(label('span',Array(Math.max(0,Math.min(30,Number(visual.left)||0))).fill(visual.emoji||'●').join(' ')||'0','vh-counted'));
      panel.append(label('strong',visual.operator||'','vh-operator'));
      panel.append(label('span',Array(Math.max(0,Math.min(30,Number(visual.right)||0))).fill(visual.emoji||'●').join(' ')||'0','vh-counted'));
      panel.setAttribute('aria-label',(visual.left||0)+' '+(visual.operator||'')+' '+(visual.right||0));
    }else if(visual.kind==='word')panel.append(label('strong',visual.text||'','vh-visual-word'));
    else if(visual.kind==='emoji')panel.append(label('span',visual.emoji||'','vh-counted'));
    if(panel.childNodes.length)contentTarget.append(panel);
  }
  function showOriginalImage(src,title) {
    if (!src) return;
    const figure=label('figure','','vh-original-figure');
    const image=document.createElement('img');
    image.src=src; image.alt=title; image.loading='lazy';
    image.decoding='async'; image.className='vh-original-image';
    figure.append(image,label('figcaption','벡수 경시대회 원본 그림을 보고 풀어 보세요.','vh-small'));
    contentTarget.append(figure);
  }
  function showChallengePicker(result) {
    if (!Array.isArray(result.challenges)||!result.challenges.length) {
      announce('경시대회 시험지를 찾지 못했어요.');return;
    }
    phase='choose'; open();resetBody();
    ui.title.textContent='🏆 벡수 수학 경시대회';
    ui.counter.textContent='25문항 도전';
    ui.note.textContent='25문제에 차례대로 도전해요. 중간에 쉬었다 이어 풀 수 있어요.';
    ui.listen.hidden=true;ui.hint.hidden=true;
    paragraph('KMA 한국수학학력평가 공개 기출의 실제 1번부터 25번까지 풀어 보세요. 답과 풀이 출처를 확인해 보세요.','vh-story');
    const gradeLabel=label('label','학년 선택','vh-select-label');
    const gradeSelect=document.createElement('select');gradeSelect.className='vh-challenge-select';
    for(const grade of result.challenges){const opt=label('option',grade.title);opt.value=grade.grade;gradeSelect.append(opt);}
    gradeSelect.value=who==='tae'?'g1':'g1';
    gradeLabel.append(gradeSelect);ui.body.append(gradeLabel);
    const levelLabel=label('label','도전 수준','vh-select-label');
    const levelSelect=document.createElement('select');levelSelect.className='vh-challenge-select';
    levelLabel.append(levelSelect);ui.body.append(levelLabel);
    const paperInfo=paragraph('','vh-challenge-paper');
    const preview=paragraph('','vh-small');
    const currentPaper=()=>result.challenges.find(g=>g.grade===gradeSelect.value)?.papers
      .find(p=>p.paperId===levelSelect.value);
    const updateInfo=()=>{
      const paper=currentPaper();if(!paper)return;
      paperInfo.textContent='📜 '+paper.title+' · 1~25번 순서대로';
      preview.textContent='완주 특별 보너스: '+(who==='tae'?'160':'60')+'별 (시험지별 최초 1회)';
    };
    gradeSelect.addEventListener('change',()=>{
      const grade=result.challenges.find(g=>g.grade===gradeSelect.value);
      levelSelect.replaceChildren();
      for(const p of grade.papers){const opt=label('option',p.label+' · 25문항');opt.value=p.paperId;levelSelect.append(opt);}
      levelSelect.value=grade.papers[1]?.paperId||grade.papers[0].paperId;
      updateInfo();
    });
    levelSelect.addEventListener('change',updateInfo);
    gradeSelect.dispatchEvent(new Event('change'));
    ui.body.append(button('✨ 1번 문제부터 시작하기',()=>{
      const grade=result.challenges.find(g=>g.grade===gradeSelect.value);
      const paper=currentPaper();if(!grade||!paper)return;
      gameId=grade.gameId;
      request('START',{paperId:paper.paperId});
    },'vh-wide'));
    paragraph(result.difficultyNote||'도전 수준은 임시 상대 난도이며 실증 검증 전입니다.','vh-small');
    ui.title.focus({preventScroll:true});
  }
  function showShop(shop) {
    if (!shop || !Array.isArray(shop.items)) {announce('별 상점에 다시 들어와 주세요.');return;}
    shopData=shop;phase='shop';open();resetBody();
    theme('market');
    root.dataset.mode='shop';
    ui.title.textContent='🎁 별빛 마법상점';
    ui.counter.textContent='⭐ '+shop.available+'개';
    ui.hint.hidden=true;ui.listen.hidden=true;
    ui.note.textContent='착용한 꾸미기는 마을의 요정과 별빛에 바로 반영돼요.';
    paragraph('모은 별을 써서 나만의 요정을 꾸며요. 선물을 선택하면 바로 입어 볼 수 있어요.','vh-story');
    const categories=[
      ['light','✨ 별빛'],['background','🌈 마을 하늘'],['friend','🐰 친구'],
      ['mark','🎀 응원 마크'],['title','🏷️ 이름표']
    ];
    const nav=label('div','','vh-shop-tabs');
    for(const [category,title] of categories){
      const control=button(title,()=>{shopCategory=category;showShop(shopData);},'vh-shop-tab');
      control.setAttribute('aria-pressed',String(shopCategory===category));
      nav.append(control);
    }
    contentTarget.append(nav);
    const active=shop.look?.[shopCategory]?.id||'';
    const selected=shop.items.filter(item=>item.category===shopCategory);
    const gallery=label('div','','vh-shop-grid');
    for(const item of selected){
      const card=label('article','','vh-shop-item');
      const icon=label('span',item.emoji||'✦','vh-shop-icon');
      icon.setAttribute('aria-hidden','true');
      card.append(icon,label('strong',item.title,'vh-shop-name'));
      card.append(label('p',item.description||'','vh-shop-description'));
      const command=item.equipped?'SHOP_UNEQUIP':item.owned?'SHOP_EQUIP':'SHOP_BUY';
      const text=item.equipped?'✓ 착용 중 · 해제':item.owned?'장착하기':'⭐ '+item.cost+'개로 받기';
      const action=button(text,()=>request(command,command==='SHOP_UNEQUIP'?
        {category:item.category}:{itemId:item.id}),'vh-shop-buy');
      action.disabled=!item.equipped&&!item.owned&&!item.canPurchase;
      card.dataset.owned=String(Boolean(item.owned));
      card.dataset.equipped=String(Boolean(item.equipped));
      card.append(action);gallery.append(card);
    }
    contentTarget.append(gallery);
    if(active)contentTarget.append(button('이 종류의 장식을 해제하기',()=>{
      request('SHOP_UNEQUIP',{category:shopCategory});
    },'vh-shop-clear'));
    ui.title.focus({preventScroll:true});
  }
  function showAdaptive(model) {
    if (!model || !Array.isArray(model.routes)) {announce('적응형 문항 추천을 확인할 수 없어요.');return;}
    phase='adaptive';open();resetBody();
    theme('crystal');root.dataset.mode='adaptive';
    ui.title.textContent='🔮 마법 수정구슬의 추천';
    ui.counter.textContent='맞춤 탐험';
    ui.listen.hidden=true;ui.hint.hidden=true;
    ui.note.textContent='추천은 잠정 IRT 정보로 계산하며 학년을 자동 변경하지 않아요.';
    paragraph('마법 수정구슬이 최근 풀이를 살펴보고 새로운 문제 정원을 추천해요.','vh-story');
    const controls=label('div','','vh-route-controls');
    const subject=document.createElement('select'),grade=document.createElement('select');
    subject.className=grade.className='vh-challenge-select';
    subject.setAttribute('aria-label','추천 과목');
    grade.setAttribute('aria-label','추천 학년');
    for(const [id,title] of [['math','수학'],['korean','국어'],['english','영어']]){
      const option=label('option',title);option.value=id;subject.append(option);
    }
    for(const [id,title] of [['K','유아·기초'],['G1','초1'],['G2','초2'],['G3','초3'],
      ['G4','초4'],['G5','초5'],['G6','초6'],['M1','중1'],['M2','중2'],['M3','중3']]){
      const option=label('option',title);option.value=id;grade.append(option);
    }
    subject.value=model.subject;grade.value=model.grade;
    const changed=()=>{
      adaptiveSubject=subject.value;adaptiveGrade=grade.value;
      request('ADAPTIVE_OFFER',{subject:adaptiveSubject,grade:adaptiveGrade});
    };
    subject.addEventListener('change',changed);grade.addEventListener('change',changed);
    controls.append(subject,grade);contentTarget.append(controls);
    const evidence=label('div',
      '추천의 불확실성 '+(model.ability?.uncertainty??'?')+
      ' · 서로 다른 첫 풀이 '+(model.ability?.evidence??0)+'문항',
      'vh-irt-disclaimer');contentTarget.append(evidence);
    const gallery=label('div','','vh-route-grid');
    for(const route of model.routes){
      const card=label('article','','vh-route');
      card.append(label('strong',(route.emoji||'🧩')+' '+route.title,'vh-route-title'));
      card.append(label('p','새 문항 '+route.unseenCount+
        '개 · 예상 정답확률 약 '+Math.round(route.predictedSuccess*100)+'%', 'vh-small'));
      card.append(button('🔮 이 정원에 도전',()=>{
        gameId=route.gameId;request('START',{gameId:route.gameId});
      },'vh-wide'));
      gallery.append(card);
    }
    if(!model.routes.length)gallery.append(label('p',
      '선택한 학년에서 추천 가능한 새 문제가 부족해요. 다른 과목이나 학년을 직접 골라 주세요.',
      'vh-story'));
    contentTarget.append(gallery);
    paragraph(model.explanation||'난도는 통계적으로 검증되지 않은 잠정 추정입니다.','vh-small');
    ui.title.focus({preventScroll:true});
  }

  // About 40% of eligible non-exam questions are presented as touchable
  // world actions; IDs, source answers, scoring and IRT evidence stay unchanged.
  function useSpatialInteraction(q) {
    if(q.total===25||!['choice','build'].includes(q.interactionType||'choice'))return false;
    if(q.interactionType==='choice'&&(!q.choices?.length||q.choices.length>5))return false;
    const hash=[...(q.questionId||'')].reduce((value,char)=>
      (Math.imul(value,31)+char.charCodeAt(0))>>>0,2166136261);
    return hash%5<2;
  }
  function spatialStage(q){
    const stage=label('section','','vh-spatial-stage');
    stage.setAttribute('aria-label','마법마을 안에서 직접 움직이는 학습');
    const scenery=label('div','','vh-spatial-landscape');
    const guide=document.createElement('img');
    guide.src='./assets/gameplay/npc_bunny.png';guide.alt='토끼 친구';guide.className='vh-spatial-guide';
    scenery.append(guide);
    scenery.append(label('span','✨ 마법 수학 정원','vh-spatial-place'));
    stage.append(scenery);
    contentTarget.append(stage);
    return stage;
  }
  function spatialChoice(q){
    const stage=spatialStage(q);
    const hint=label('p','정답이 있다고 생각하는 마법문을 눌러 열어 봐요.','vh-spatial-instruction');
    stage.append(hint);
    const gates=label('div','','vh-spatial-gates');
    for(let i=0;i<q.choices.length;i++){
      const gate=button((i+1)+'번 문 · '+q.choices[i],()=>submit(i),'vh-spatial-gate');
      gate.setAttribute('aria-label',(i+1)+'번째 마법문 '+q.choices[i]);
      gate.prepend(label('span','✦','vh-gate-star'));
      gates.append(gate);
    }
    stage.append(gates);
  }
  function spatialBuild(q){
    const stage=spatialStage(q);
    stage.append(label('p','마법 열매를 장바구니에 하나씩 넣어 보세요.','vh-spatial-instruction'));
    let total=0;
    const basket=label('div','','vh-spatial-basket');
    const value=label('output','0','vh-spatial-count');value.setAttribute('aria-live','polite');
    const items=label('div','','vh-spatial-collected');
    const icon=q.emoji||'🍎';
    const refresh=()=>{
      value.textContent=total+(q.unit||'개');
      items.textContent=(Array(Math.min(16,total)).fill(icon).join(' ')||'비어 있어요')+
        (total>16?' 외 '+(total-16)+'개':'');
    };
    basket.append(label('strong','🧺 마법 바구니','vh-spatial-basket-title'),value,items);
    stage.append(basket);
    const controls=label('div','','vh-spatial-controls');
    const add=button('➕ '+icon+' 담기',()=>{total=Math.min(q.max||20,total+1);refresh()},'vh-spatial-add');
    const remove=button('➖ 한 개 꺼내기',()=>{total=Math.max(0,total-1);refresh()},'vh-spatial-remove');
    add.setAttribute('aria-label','바구니에 하나 넣기');remove.setAttribute('aria-label','바구니에서 하나 빼기');
    controls.append(add,remove);
    stage.append(controls,button('🌟 이만큼 모았어요 · 정답 확인',()=>submit(total),'vh-wide'));
    refresh();
  }

  function showQuestion(q) {
    if (!q) return;
    phase='question'; question=q; gameId=q.gameId;
    open(); resetBody();
    const skin=q.total===25?'tome':q.gameId==='kind-dialogue'?'scroll':'crystal';
    theme(skin);root.dataset.mode='question';
    ui.title.textContent='🧩 '+(q.title || '생각해 볼까요?');
    ui.counter.textContent=(q.index || 1)+' / '+(q.total || 3);
    showRoundCue(Math.max(0,(q.index||1)-1),q.total||3);
    voiceText=[q.story,q.prompt,...(q.choices||[])].filter(Boolean).join('. ');
    if(skin==='tome'){
      const book=label('section','','vh-book-spread');
      const left=label('section','','vh-book-page vh-book-left');
      const right=label('section','','vh-book-page vh-book-right');
      book.append(left,right);ui.body.append(book);
      contentTarget=left;
    }
    if (q.story) paragraph(q.story,'vh-story');
    showOriginalImage(q.problemImage,'경시대회 '+(q.index||1)+'번 문제 그림');
    if(skin==='tome')contentTarget=ui.body.querySelector('.vh-book-right');
    paragraph(q.prompt || '무엇을 선택할까요?','vh-prompt');
    showVisual(q.visual);
    const mode=q.interactionType || 'choice';
    if(useSpatialInteraction(q)){
      if(mode==='choice')spatialChoice(q);
      else spatialBuild(q);
    } else if (mode==='choice') {
      const options = label('div','', 'vh-options');
      (q.choices||[]).forEach((text,i)=>{
        options.append(button((i+1)+'. '+text,()=>submit(i)));
      });
      contentTarget.append(options);
    } else if (mode==='build' || mode==='numeric') numericQuestion(q,mode);
    else if (['match','sequence','memory'].includes(mode)) matchQuestion(q);
    else paragraph('아직 지원하지 않는 학습 유형이에요. 반짝 배움터에서 이어서 풀 수 있어요.','vh-story');
    contentTarget=ui.body;
    ui.listen.hidden = false;
    ui.note.textContent='힌트와 해설을 보며 천천히 배워요.';
    ui.hint.hidden=!q.hintAvailable;
    ui.hint.disabled=false;
    ui.exit.hidden = false;
    ui.title.focus({preventScroll:true});
  }
  function showRoundCue(answered,total) {
    const stage=nativeProgressArt(answered,total),image=document.createElement('img');
    image.src='./assets/'+stage+'.png';image.alt='';image.width=20;image.height=20;image.className='vh-round-image';
    ui.counter.dataset.stage=stage;ui.counter.setAttribute('aria-label',Math.min(total,Math.max(0,answered))+' / '+total+'개 답 확인');
    ui.counter.prepend(image);
  }
  function showRewardArt(id) {
    const holder=label('div','','vh-reward-art');
    const img=document.createElement('img');
    img.src='./assets/'+id+'.png'; img.alt=''; img.width=88; img.height=88;
    holder.append(img);ui.body.append(holder);
  }
  function showFeedback(result) {
    phase='feedback'; open();resetBody();
    theme(question?.total===25?'tome':gameId==='kind-dialogue'?'scroll':'crystal');
    root.dataset.mode='feedback';
    ui.title.textContent=result.correct ? '🌟 멋진 발견!' : '🌱 다시 생각하는 힘';
    ui.counter.textContent='이번 문제';
    showRoundCue(question?.index||1,question?.total||3);
    showRewardArt(result.correct && (result.earned??0)>0 ? (gameId==='kind-dialogue'?'star_purple':'star_yellow') : 'sprout');
    showOriginalImage(question?.solutionImage,'경시대회 '+(question?.index||1)+'번 풀이 그림');
    paragraph(result.correct ? '좋아요! 생각한 답이 맞았어요.' : '다른 방법을 하나 배웠어요.','vh-feedback');
    paragraph((result.earned??0)>0 ? '새롭게 모은 별 '+result.earned+'개' : '이미 만난 문제를 다시 생각하는 힘이 자랐어요.','vh-prompt');
    if((result.recoveryEarned??0)>0)paragraph('🌱 오답을 새 회차에서 스스로 고쳐 +'+result.recoveryEarned+'별!','vh-learning-bonus');
    paragraph(result.explanation || '차근차근 생각해 봐요.','vh-explanation');
    voiceText=result.explanation||'';
    ui.body.append(button('다음 이야기 →',()=>request('NEXT'),'vh-wide'));
    ui.note.textContent='틀린 문제도 배운 흔적이 남아요.';
    ui.listen.hidden = !voiceText;
    ui.title.focus({preventScroll:true});
  }
  function complete(result) {
    phase='complete';open();resetBody();
    theme('celebrate');root.dataset.mode='complete';
    const isChallenge=question?.total===25&&gameId.startsWith('bebsu-');
    ui.title.textContent=isChallenge?'🏆 경시대회 25문제 완주!':'🌷 오늘의 마법 성공!';
    ui.counter.textContent='완료';
    showRoundCue(question?.total||3,question?.total||3);
    showRewardArt(isChallenge?'star_rainbow':'bloom');
    if(result.gardenAdded!==false)sessionRounds++;
    paragraph(result.gardenAdded===false?'이 이야기의 꽃은 이미 정원에 피어 있어요.':'마을에 새로운 꽃이 피었어요!','vh-feedback');
    if(isChallenge)paragraph((result.challengeBonus||0)>0?
      '🎉 25문제 완주 특별 보너스 +'+result.challengeBonus+'별!':
      '🏅 이미 완주한 시험지는 보너스가 중복 지급되지 않아요.','vh-challenge-bonus');
    paragraph('내 마을의 꽃 '+(result.flowers ?? 0)+'송이 · 가족 광장 '+(result.familyFlowers ?? 0)+'송이','vh-prompt');
    paragraph('어떤 단서를 보고 답을 골랐나요? 가족에게 내 생각을 한 문장으로 들려주세요.','vh-explanation');
    if(sessionRounds>=3)paragraph('세 번의 이야기를 마쳤어요. 눈과 몸도 잠깐 쉬어볼까요?','vh-small');
    mostRecentRoundId=result.roundId||'';
    voiceText='오늘도 새로운 것을 배웠어요. 마법마을이 조금 더 자랐어요.';
    if(mostRecentRoundId)ui.body.append(button('💬 배운 방법을 말로 설명하고 기록하기',()=>showReflection(mostRecentRoundId),'vh-reflect-cta'));
    ui.body.append(button('🏡 마을로 돌아가기',close,'vh-wide'));
    ui.exit.hidden=true;
    ui.listen.hidden=false;
    ui.title.focus({preventScroll:true});
  }
  function showReflection(roundId){
    phase='reflecting';open();resetBody();theme('scroll');root.dataset.mode='reflection';
    ui.title.textContent='📣 나의 생각 설명하기';ui.counter.textContent='하루 최대 2번 · 각 +2별';
    ui.hint.hidden=true;ui.listen.hidden=false;
    voiceText='가족이나 요정에게 내가 어떻게 생각해서 풀었는지 말로 설명해 주세요. 그리고 사용한 방법을 골라요.';
    paragraph('방금 푼 문제에서 어떤 방법이 도움이 되었나요? 직접 말로 설명한 다음 방법을 골라 주세요.','vh-story');
    const choices=[['count','🔢 하나씩 세어 보기'],['compare','⚖️ 서로 비교하기'],
      ['pattern','🧠 규칙 찾아보기'],['draw','✏️ 그림 그려보기'],['explain','💡 다른 말로 설명하기']];
    const grid=label('div','','vh-strategy-grid');let selected='';
    const confirm=button('✨ 이야기 마쳤어요 · 생각 기록하기',()=>{
      if(!selected)return;
      request('REFLECT',{roundId,strategy:selected});
    },'vh-wide');confirm.disabled=true;
    for(const [code,text] of choices){
      const choice=button(text,()=>{
        selected=code;confirm.disabled=false;
        for(const b of grid.querySelectorAll('button'))b.setAttribute('aria-pressed',String(b===choice));
      },'vh-strategy');choice.setAttribute('aria-pressed','false');grid.append(choice);
    }
    ui.body.append(grid,confirm);
    paragraph('이 보상은 설명 행동을 기록하는 작은 응원 별이에요. 정답 실력 측정에는 포함되지 않아요.','vh-small');
    ui.note.textContent='실제 설명 내용을 검사하거나 음성을 저장하지 않아요.';
    ui.title.focus({preventScroll:true});
  }
  function showReflectionResult(result){
    phase='reflection-result';open();resetBody();theme('celebrate');
    ui.title.textContent=result.reflectionEarned>0?'🌟 생각을 설명했어요!':'🌱 오늘의 생각을 기억해요';
    ui.counter.textContent='설명 보상';showRewardArt(result.reflectionEarned>0?'star_blue':'sprout');
    paragraph(result.reflectionEarned>0?'설명하며 배운 힘! +'+result.reflectionEarned+'별':
      result.reflectionReason==='daily-cap'?'오늘의 설명 별은 모두 받았어요. 다음에 또 도전해요!':
      '이미 기록한 생각이에요. 같은 완료 회차에는 별을 중복 지급하지 않아요.','vh-learning-bonus');
    ui.body.append(button('🏡 마을로 돌아가기',close,'vh-wide'));
    ui.listen.hidden=true;ui.exit.hidden=true;
    ui.title.focus({preventScroll:true});
  }
  function update(data) {
    if (!data || typeof data !== 'object') return;
    if(retiredRequests.has(data.requestId)||data.action==='CANCEL')return;
    if((data.action==='SUBMIT'||data.action==='HINT')&&phase!=='question')return;
    if(data.action==='NEXT'&&phase!=='feedback'&&phase!=='waiting')return;
    if(data.action==='REFLECT'&&phase!=='reflecting')return;
    if(data.action==='COMPLETE_WORLD'&&phase!=='waiting')return;
    if(data.requestId?.startsWith('webui-') && pendingRequest && data.requestId!==pendingRequest)return;
    if(data.requestId===pendingRequest)pendingRequest='';
    busy = false;
    ui.dialog.setAttribute('aria-busy','false');
    if (!data.ok) {
      ui.home.disabled=ui.plaza.disabled=ui.quest.disabled=ui.bebsu.disabled=false;
      announce(data.error || '문제가 발생했어요. 다시 시도해 주세요.');
      return;
    }
    announce('');
    if (data.action === 'INIT') root.dataset.ready = 'true';
    if(data.action==='INIT'||data.action==='START'||data.action==='SHOW_BEBSU'||!data.ok)
      ui.home.disabled=ui.plaza.disabled=ui.quest.disabled=ui.bebsu.disabled=false;
    if (data.who === 'tae' || data.who === 'se') {
      if(who!==data.who){zone='home';ui.area.textContent='나의 마을';ui.home.setAttribute('aria-current','page');ui.plaza.setAttribute('aria-current','false');}
      who=data.who;
      root.dataset.who=who;
      ui.name.textContent=(children[who]||'요정')+'의 마법마을';
    }
    ui.stars.textContent=String(data.available??0);
    if(data.cosmetics&&typeof data.cosmetics==='object'){
      const equipped=Object.values(data.cosmetics).filter(Boolean);
      ui.outfit.textContent=equipped.length?
        '🎀 요정 꾸미기 '+equipped.length+'종 적용 중':'✨ 선물 가게에서 요정을 꾸며요';
      root.dataset.outfit=equipped.length?'equipped':'plain';
      root.dataset.light=data.cosmetics.light||'';
      root.dataset.friend=data.cosmetics.friend||'';
      root.dataset.background=data.cosmetics.background||'';
    }
    if(Number.isFinite(data.reinforcementStars))reinforcementStars=data.reinforcementStars;
    if (Number.isFinite(data.flowers) && Number.isFinite(data.familyFlowers)) {
      ui.progress.textContent='배움 꽃 '+data.flowers+'송이 · 가족 꽃 '+data.familyFlowers+'송이'+
        (data.garden?' · 가꾸는 식물 '+data.garden.plants.length+'개':'')+
        (reinforcementStars>0?' · 생각·복습 별 '+reinforcementStars+'개':'');
    }
    if(data.action.startsWith('GARDEN_'))showGarden(data);
    else if(data.action==='SHOW_BEBSU')showChallengePicker(data);
    else if(['SHOP_OPEN','SHOP_BUY','SHOP_EQUIP','SHOP_UNEQUIP'].includes(data.action))showShop(data.shop);
    else if(data.action==='ADAPTIVE_OFFER')showAdaptive(data.adaptive);
    else if (data.action==='START' || data.action==='NEXT') {
      if (data.finished) {
        phase='waiting';
        ui.dialog.setAttribute('aria-busy','true');
        return;
      }
      if(data.answered){question=data.question;gameId=data.question.gameId;showFeedback(data);}
      else if (data.question) showQuestion(data.question);
    } else if(data.action==='HINT' && phase==='question') {
      const old=ui.body.querySelector('.vh-hint-text');
      if(!old){paragraph(data.hint,'vh-explanation vh-hint-text');}
      ui.hint.disabled=true;
      voiceText=data.hint||voiceText;
      ui.note.textContent='힌트를 보고 내 힘으로 답을 골라요.';
    } else if(data.action==='SUBMIT') {
      showFeedback(data);
    } else if(data.action==='COMPLETE_WORLD') {
      complete(data);
    } else if(data.action==='REFLECT') {
      showReflectionResult(data);
    }
  }
  return {update,announce,close};
}
