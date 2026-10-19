import {SPECIES,CARE} from './garden-state.js';
import {mountCareerExplorer} from './career-ui.js?v=career-v29-20261019';
import {STORY_QUESTS, STORY_DISTRICTS, findStory, recommendedStories, describeStoryForSpeech, storyCompletionText} from './story-quests.js';
import {FAIRY_STYLES, findFairyStyle, fairyPortrait, loadFairyStyle, saveFairyStyle} from './fairy-styles-v11.js';
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
    ' <p><span id="vh-area">내 마을</span><span class="vh-old-stars" hidden> · 옛 별 <span id="vh-stars">0</span>개</span></p>',
    ' <div class="vh-resource-hud" aria-label="과목별 획득 자원">',
    '  <span title="수학 수정">💎<b data-hud-resource="math">0</b></span>',
    '  <span title="국어 꽃잎">🌸<b data-hud-resource="korean">0</b></span>',
    '  <span title="영어 깃털">🪶<b data-hud-resource="english">0</b></span>',
    '  <span title="한자 먹방울">🖋️<b data-hud-resource="hanja">0</b></span>',
    ' </div>',
    ' <p id="vh-progress">오늘도 나만의 속도로 탐험해요</p>',
    ' <p id="vh-outfit" class="vh-outfit">✨ 장식 없음 · 선물 가게에서 꾸며요</p></div>',
    '</section>',
    '<p id="vh-help" class="vh-help">바닥을 터치해 이동하고 친구를 만나보세요.</p>',
    '<nav id="village-controls" aria-label="마법마을 바로가기">',
    ' <button id="vh-home" class="vh-action" type="button" aria-current="page"><span>🏡</span>내 마을</button>',
    ' <button id="vh-plaza" class="vh-action" type="button"><span>🌷</span>가족 광장</button>',
    ' <button id="vh-quest" class="vh-action" type="button"><span>✨</span>이야기 모험</button>',
    ' <button id="vh-bebsu" class="vh-action vh-challenge-action" type="button"><span>🏆</span>뱁수 25문제</button>',
    '</nav>',
    '<nav id="vh-learning-districts" aria-label="마법마을 학습 지역">',
    ' <button class="vh-district" data-district="math" type="button">🔢 수학 정원</button>',
    ' <button class="vh-district" data-district="korean" type="button">📖 이야기 도서관</button>',
    ' <button class="vh-district vh-hanja-district" data-district="hanja" type="button">📜 한자 수련관</button>',
    ' <button class="vh-district" data-district="english" type="button">🌍 영어 숲</button>',
    ' <button class="vh-district" data-district="kma" type="button">🏆 경시대회 성</button>',
    ' <button class="vh-district" data-district="practice" type="button">🧩 마법 연습장</button>',
    ' <button class="vh-district" data-district="academy" type="button">🪄 마법학교</button>',
    ' <button class="vh-district" data-district="growth" type="button">🌟 성장의 탑</button>',
    '</nav>',
    '<aside id="vh-world-shortcuts" aria-label="마법마을 특별 장소">',
    ' <button id="vh-map" type="button" class="vh-shortcut">🗺️ 모험 지도</button>',
    ' <button id="vh-garden" type="button" class="vh-shortcut">🌱 나무·꽃 키우기</button>',
    ' <button id="vh-adaptive" type="button" class="vh-shortcut vh-learning-shortcut">🧠 오늘의 3걸음</button>',
    ' <button id="vh-more" type="button" class="vh-shortcut" aria-expanded="false" aria-controls="vh-extra-tools">✨ 더 놀기</button>',
    ' <div id="vh-extra-tools" hidden>',
    ' <button id="vh-run" type="button" class="vh-shortcut" aria-pressed="false">🏃 달리기</button>',
    ' <button id="vh-hop" type="button" class="vh-shortcut">🪽 살짝 날기</button>',
    ' <button id="vh-motion" type="button" class="vh-shortcut" aria-pressed="false">🍃 움직임 줄이기</button>',
    ' <button id="vh-wave" type="button" class="vh-shortcut">👋 인사</button>',
    ' <button id="vh-wardrobe" type="button" class="vh-shortcut">🎀 요정 스타일</button>',
    ' <button id="vh-shop" type="button" class="vh-shortcut">🎁 별 상점</button>',
    ' <button id="vh-friends" type="button" class="vh-shortcut">💞 마을 친구들</button>',
    ' <button id="vh-ecology" type="button" class="vh-shortcut">🌿 배움 생태계</button>',
    ' <button id="vh-pond" type="button" class="vh-shortcut">🐠 생명 연못</button>',
    ' <button id="vh-ocean" type="button" class="vh-shortcut vh-ocean-shortcut">🌊 푸른 바다</button>',
    ' <button id="vh-career" type="button" class="vh-shortcut">🏛️ 미래 직업 탐색관</button>',
    ' <a id="vh-records" class="vh-shortcut vh-record-link" href="../learning.html?view=workbooks" aria-label="상세 문제집과 학습기록 열기">📚 학습기록</a>',
    ' <a id="vh-parent-dashboard" class="vh-shortcut vh-record-link" href="../learning.html?view=parents" aria-label="보호자 학습 대시보드 열기">👪 보호자 대시보드</a>',
    ' <button id="vh-pose" type="button" class="vh-shortcut" aria-pressed="false" hidden>🎭 8방향 시안</button>',
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
  // Production navigation uses the same approved illustrated props as the Unity
  // village. The unfinished eight-direction art toggle is not child-facing.
  const districtLabels = {
    math:'수학 정원',korean:'이야기 도서관',english:'영어 숲',hanja:'한자 수련관',pond:'생명 연못',ocean:'푸른 바다',career:'미래 직업 탐색관',
    kma:'경시대회 성',practice:'마법 연습장',academy:'마법학교',growth:'성장의 탑'
  };
  for(const [key, title] of Object.entries(districtLabels)){
    const destination=root.querySelector('[data-district="'+key+'"]');
    if(!destination)continue;
    const icon=document.createElement('img');
    icon.src='./assets/illustrations/'+key+'-icon.webp';
    icon.alt='';icon.width=30;icon.height=30;icon.loading='lazy';
    const name=document.createElement('span');name.textContent=title;
    destination.replaceChildren(icon,name);
  }
  const $ = id => root.querySelector('#' + id);
  const ui = {
    name:$('vh-name'), area:$('vh-area'), stars:$('vh-stars'),
    progress:$('vh-progress'), outfit:$('vh-outfit'), help:$('vh-help'),
    home:$('vh-home'), plaza:$('vh-plaza'), quest:$('vh-quest'), bebsu:$('vh-bebsu'),
    adaptive:$('vh-adaptive'), shop:$('vh-shop'), friends:$('vh-friends'), ecology:$('vh-ecology'), pose:$('vh-pose'), shortcuts:$('vh-world-shortcuts'),
    dialog:$('village-dialog-wrap'), title:$('vh-title'),
    counter:$('vh-counter'), body:$('vh-body'), exit:$('vh-exit'),
    listen:$('vh-listen'), hint:$('vh-hint'), note:$('vh-note'), controls:$('village-controls'),
    toast:$('village-toast')
  };
  let who = 'tae', zone = 'home', gameId = '', question = null;
  let phase = 'explore', busy = false, lastFocus = null, voiceText = '';
  let requestNumber = 0, pendingRequest = '', sessionRounds = 0;
  let mostRecentRoundId = '', reinforcementStars = 0;
  const resourceMeta={math:['💎','수정'],korean:['🌸','꽃잎'],english:['🪶','깃털'],hanja:['🖋️','먹방울']};
  const resourceBalancesByWho={tae:null,se:null};
  let gainedFromAnswer=[];
  let experimentalArt=false;
  // Decorative stories never change the authoritative host's questions, stars or IRT.
  let activeStory=null;
  let shopCategory='light', shopData=null, adaptiveSubject='math', adaptiveGrade='';
  let contentTarget=ui.body;
  let reducedMotion=Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  root.dataset.reducedMotion=String(reducedMotion);
  $('vh-motion').setAttribute('aria-pressed',String(reducedMotion));
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
  function scenicBanner(area, description='') {
    if(area==='hanja'){
      const scene=label('figure','','vh-area-banner vh-hanja-banner');
      scene.append(label('strong','📜 漢字','vh-hanja-banner-glyph'));
      if(description)scene.append(label('figcaption',description,'vh-area-caption'));
      return scene;
    }
    const allowed=new Set(['math','korean','english','kma','practice','academy','growth','garden','shop']);
    if(!allowed.has(area))return null;
    const scene=label('figure','','vh-area-banner');
    const image=document.createElement('img');
    image.src='./assets/illustrations/'+area+'.webp';
    image.alt='';image.loading='lazy';image.decoding='async';
    image.width=720;image.height=290;
    scene.append(image);
    if(description)scene.append(label('figcaption',description,'vh-area-caption'));
    return scene;
  }
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
    ui.help.textContent = root.dataset.lite==='true' ?
      '학습 지역을 골라 모험을 시작해요.' : next === 'plaza' ?
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
  const syncAvatarStyle=()=>{
    const selected=loadFairyStyle(who);
    root.dataset.avatarStyle=selected;
    sendToUnity('AVATAR_STYLE:'+selected);
    return selected;
  };
  function showFairyWardrobe(){
    if(!safeExplore())return;
    open();resetBody();phase='wardrobe';theme('scroll');root.dataset.mode='wardrobe';
    const selected=loadFairyStyle(who);
    ui.title.textContent='🎀 '+(who==='se'?'세희':'태희')+'의 요정 스타일';
    ui.counter.textContent='5가지 · 모두 무료';
    ui.note.textContent='별·문제·성장 기록과 관계없이 자유롭게 바꿀 수 있어요.';
    voiceText='원래 요정의 얼굴과 의상은 그대로 두고 주위에 꽃과 별빛을 더해요.';
    const hint=paragraph('원화의 얼굴과 머리, 별·달 장식은 그대로 유지해요. 꽃·별·책 등 분위기 장식을 골라 보세요.','vh-story vh-story-intro');
    hint.id='vh-wardrobe-intro';
    const options=label('div','','vh-style-grid');
    const entries=[];
    for(const style of FAIRY_STYLES){
      const card=label('button','','vh-style-card');
      card.type='button';card.dataset.style=style.id;
      card.setAttribute('aria-label',style.name+' 선택');
      const portrait=label('span','','vh-style-portrait');
      const source=document.createElement('img');
      source.src=fairyPortrait(who);source.alt='';source.width=124;source.height=124;
      source.loading='lazy';source.decoding='async';
      portrait.append(source,label('span',style.icon,'vh-style-motif'));
      const words=label('span','','vh-style-words');
      words.append(label('strong',style.name,'vh-style-name'),
        label('span',style.detail,'vh-style-description'));
      const selectedState=label('span','','vh-style-selected');
      card.append(portrait,words,selectedState);
      card.addEventListener('click',()=>{
        const saved=saveFairyStyle(who,style.id);
        root.dataset.avatarStyle=style.id;
        sendToUnity('AVATAR_STYLE:'+style.id);
        for(const entry of entries) {
          const active=entry.style.id===style.id;
          entry.card.setAttribute('aria-pressed',String(active));
          entry.state.textContent=active?'✓ 선택됨':'고르기';
        }
        if(!saved)announce('이 기기에서는 꾸미기 선택을 저장하지 못했어요. 화면에서는 사용할 수 있어요.');
      });
      options.append(card);entries.push({style,card,state:selectedState});
    }
    for(const entry of entries){
      const current=entry.style.id===selected;
      entry.card.setAttribute('aria-pressed',String(current));
      entry.state.textContent=current?'✓ 선택됨':'고르기';
    }
    ui.body.append(options,button('🏡 마을로 돌아가기',close,'vh-wide'));
    ui.listen.hidden=false;ui.title.focus({preventScroll:true});
  }
  $('vh-wardrobe').addEventListener('click',showFairyWardrobe);
  // A short illustrated story precedes the EXISTING AREA_OPEN screen. Never
  // grant a reward or open a new learning round from this narrative layer.
  function storyChoice(story) {
    if(!story||!safeExplore()&&phase!=='map'&&phase!=='story')return;
    phase='story';open();resetBody();theme('scroll');root.dataset.mode='story';
    ui.title.textContent=story.emoji+' '+story.title;
    ui.counter.textContent='내가 만드는 마법 이야기';
    ui.note.textContent='선택하지 않아도 괜찮아요. 별·기록은 기존 배움터 그대로예요.';
    voiceText=describeStoryForSpeech(story);
    const art=scenicBanner(story.district,story.guide+'가 기다리고 있어요');
    if(art)ui.body.append(art);
    paragraph(story.intro,'vh-story vh-story-intro');
    paragraph('어떤 길을 선택할까요?','vh-prompt');
    const choices=label('div','','vh-story-choices');
    for(const choice of story.choices){
      if(choice==='나중에 해 보기'){
        choices.append(button('🍃 다음에 하기',close,'vh-story-option vh-story-skip'));
        continue;
      }
      choices.append(button('✨ '+choice,()=>{
        if(busy)return;
        activeStory={...story,choice,learner:who};
        voiceText=describeStoryForSpeech(story,choice);
        travelToDistrict(story.district);
      },'vh-story-option'));
    }
    ui.body.append(choices);
    ui.body.append(button('🌿 그냥 마을에서 놀기',close,'vh-secondary vh-story-skip'));
    ui.listen.hidden=false;
    ui.title.focus({preventScroll:true});
  }
  let preferredGameId='';
  function travelToDistrict(id,preferred='') {
    preferredGameId=preferred;
    // A map selection guides the 3D fairy to the real building. Learning
    // appears only after Unity reaches the building's approach hotspot.
    // Lite mode lacks locomotion, so its accessible subject list opens directly.
    if(root.dataset.lite==='true'||id==='growth'||id==='ocean'){
      request('AREA_OPEN',{district:id});return;
    }
    const chosenStory=activeStory;
    close();activeStory=chosenStory;
    sendToUnity('GO_TO_DISTRICT:'+id);
  }
  function storyMap() {
    if(!safeExplore()&&phase!=='map'&&phase!=='story')return;
    phase='map';open();resetBody();theme('scroll');root.dataset.mode='map';
    ui.title.textContent='🗺️ 마법마을 모험 지도';
    ui.counter.textContent='어디든 갈 수 있어요';
    ui.note.textContent='원하는 곳부터 시작해요. 오늘 쉬었다가 내일 놀아도 괜찮아요.';
    voiceText='마음에 드는 장소를 골라서 마법 친구들의 이야기를 들어 보아요.';
    paragraph('어떤 친구를 만나러 갈까요?','vh-story vh-story-intro');
    const entries=label('div','','vh-map-district-buttons');
    for(const [id,name] of [['math','💎 수학학교'],['korean','🌸 이야기 도서관'],['english','🪶 영어학교'],['hanja','🖋️ 한자 수련관'],['kma','🏆 경시대회 성'],['pond','🐠 생명 연못'],['ocean','🌊 푸른 바다'],['career','🏛️ 미래 직업 탐색관']])
      entries.append(button(name,()=>travelToDistrict(id),'vh-map-district-entry'));
    ui.body.append(entries);
    const featured=new Set(recommendedStories(who).map(item=>item.id));
    const cards=label('div','','vh-story-map');
    for(const story of STORY_QUESTS){
      const card=label('article','','vh-story-card');
      const art=scenicBanner(story.district);if(art)card.append(art);
      const badge=label('div',(featured.has(story.id)?'💖 추천 모험 · ':'')+STORY_DISTRICTS[story.district],'vh-story-zone');
      const title=label('h3',story.emoji+' '+story.title,'vh-story-name');
      const detail=label('p',story.learning,'vh-story-detail');
      const start=button('만나러 가기 →',()=>storyChoice(story),'vh-story-go');
      card.append(badge,title,detail,start);
      cards.append(card);
    }
    ui.body.append(cards);
    const free=label('details','','vh-story-freeroam');
    const heading=label('summary','🌳 문제 없이 자유롭게 탐험하기');
    free.append(heading);
    const paths=label('div','','vh-story-paths');
    for(const [name,command] of [['🌳 열매 숲','GO_ORCHARD'],['🦋 꽃 초원','GO_MEADOW'],['✨ 별빛 언덕','GO_HILL'],['🧺 소풍길','GO_PICNIC'],['🌱 나의 정원','GO_GARDEN']])
      paths.append(button(name,()=>{close();sendToUnity(command);},'vh-garden-slot'));
    free.append(paths);ui.body.append(free);
    ui.title.focus({preventScroll:true});
  }
  $('vh-map').addEventListener('click',()=>{if(safeExplore())storyMap();});
  $('vh-garden').addEventListener('click',()=>{if(safeExplore())request('GARDEN_OPEN',{slot:-1});});
  $('vh-run').addEventListener('click',()=>{
    if(!safeExplore())return;runActive=!runActive;
    $('vh-run').setAttribute('aria-pressed',String(runActive));$('vh-run').textContent=runActive?'🚶 걷기':'🏃 달리기';
    sendToUnity('RUN_TOGGLE');
  });
  $('vh-hop').addEventListener('click',()=>{if(safeExplore())sendToUnity('HOP');});
  $('vh-motion').addEventListener('click',()=>{
    if(!safeExplore())return;
    reducedMotion=!reducedMotion;
    root.dataset.reducedMotion=String(reducedMotion);
    $('vh-motion').setAttribute('aria-pressed',String(reducedMotion));
    $('vh-motion').textContent=reducedMotion?'🍃 움직임 켜기':'🍃 움직임 줄이기';
    sendToUnity(reducedMotion?'MOTION_LOW':'MOTION_FULL');
  });
  $('vh-wave').addEventListener('click',()=>{if(safeExplore())sendToUnity('WAVE');});
  ui.friends.addEventListener('click',()=>{if(safeExplore())request('RELATIONSHIP_OPEN');});
  ui.ecology.addEventListener('click',()=>{if(safeExplore())request('ECOLOGY_OPEN');});
  $('vh-pond').addEventListener('click',()=>{if(safeExplore())travelToDistrict('pond');});
  $('vh-ocean').addEventListener('click',()=>{if(safeExplore())request('OCEAN_OPEN');});
  $('vh-career').addEventListener('click',()=>{if(safeExplore())travelToDistrict('career');});
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
    if(safeExplore())storyChoice(recommendedStories(who)[0]);
  });
  ui.bebsu.addEventListener('click',()=>{
    if (phase==='explore'&&!busy&&root.dataset.ready==='true') travelToDistrict('kma');
  });
  root.querySelectorAll('[data-district]').forEach(control=>{
    control.addEventListener('click',()=>{
      if(phase!=='explore'||busy||root.dataset.ready!=='true')return;
      travelToDistrict(control.dataset.district);
    });
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
    activeStory=null;
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
    figure.append(image,label('figcaption','뱁수 경시대회 원본 그림을 보고 풀어 보세요.','vh-small'));
    contentTarget.append(figure);
  }
  function showChallengePicker(result) {
    if (!Array.isArray(result.challenges)||!result.challenges.length) {
      announce('경시대회 시험지를 찾지 못했어요.');return;
    }
    phase='choose'; open();resetBody();
    const practice=result.publicPractice===true;
    ui.title.textContent=practice?'🧩 마법 수학 훈련장':'🏆 뱁수 수학 경시대회';
    ui.counter.textContent='25문항 도전';
    ui.note.textContent=practice?
      '자체 제작 연습문제예요. 실제 KMA 기출과 구분하며, 중간에 쉬었다 이어 풀 수 있어요.':
      'KMA 공개 기출문제예요. 중간에 쉬었다 이어 풀 수 있어요.';
    ui.listen.hidden=true;ui.hint.hidden=true;
    paragraph(practice?
      '마법마을에서 직접 만든 수학 문제를 기본·도전·심화로 연습해요. 통계적으로 보정된 난도는 아니에요.':
      'KMA 한국수학학력평가 공개 기출의 실제 1번부터 25번까지 풀어 보세요. 답과 풀이 출처를 확인해 보세요.','vh-story');
    ui.body.append(scenicBanner(practice?'practice':'kma'));
    if(who==='se'){
      paragraph('🌱 세희에게는 유아·기초 수학 모험을 먼저 권장해요. 이 시험지는 보호자와 함께 선택해요.','vh-child-guidance');
      ui.body.append(button('🌷 내 수준의 수학 먼저 탐험하기',()=>request('AREA_OPEN',{district:'math'}),'vh-secondary vh-child-route'));
    }
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
      preview.textContent='완주 특별 보너스: '+(practice?(result.completionBonus?.[who]??0):(who==='tae'?160:60))+'별 (시험지별 최초 1회)';
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
  function showAreaMissions(missions){
    if(!missions||!Array.isArray(missions.games))return;
    phase='choose';open();resetBody();theme('scroll');root.dataset.mode='district';
    ui.title.textContent=missions.title;
    ui.counter.textContent=missions.games.length+'가지 배움';
    ui.note.textContent='학습 기록은 태희·세희별로 보존되며, 문제와 별은 기존 배움터 기록을 이어 사용해요.';
    ui.listen.hidden=false;ui.hint.hidden=true;
    voiceText=missions.intro;
    if(activeStory && activeStory.district===missions.id && activeStory.learner===who){
      const lore=label('section','','vh-story-bridge');
      lore.append(label('strong',activeStory.emoji+' '+activeStory.guide+'의 부탁','vh-route-title'));
      lore.append(label('p','내가 고른 길: '+activeStory.choice,'vh-story-detail'));
      lore.append(label('p',activeStory.learning,'vh-story-detail'));
      ui.body.append(lore);
    }
    ui.body.append(scenicBanner(missions.id,missions.intro));
    if(missions.id==='hanja'){
      const openCards=label('a','📖 급수별 한자 학습카드 보기 →','vh-wide vh-hanja-card-link');
      openCards.href='../learning.html?view=hanja';
      ui.body.append(openCards);
      ui.note.textContent='IRT는 잠정 난이도 추정입니다. 급수 취득 판정은 하지 않으며, 별 보상과 학습기록은 기존 마을에 합산해요.';
    }
    const list=label('div','','vh-district-missions');
    const recommended=preferredGameId;
    preferredGameId='';
    const ordered=[...missions.games].sort((a,b)=>Number(b.id===recommended)-Number(a.id===recommended));
    let visible=Math.min(8,ordered.length);
    const render=()=>{
      list.replaceChildren();
      for(const game of ordered.slice(0,visible)){
        const card=label('article','','vh-route vh-mission-card');
        if(game.id===recommended)card.classList.add('vh-spotlight-mission');
        card.append(label('strong',(game.id===recommended?'✨ 추천 모험 · ':'')+(game.emoji||'🧩')+' '+game.title,'vh-route-title'));
        card.append(label('p',game.description||'오늘의 모험','vh-small'));
        card.append(label('p',(game.levelLabel||'')+' · '+game.questionCount+'문항 보유','vh-small'));
        card.append(label('p','📖 학습 '+(game.studied||0)+'개 · 🌿 숙달 '+(game.mastered||0)+'개 · 완료 '+(game.rounds||0)+'회','vh-building-progress'));
        card.append(button(game.resume?'이어서 배우기 →':'이곳에서 배우기 →',()=>{
          gameId=game.id;request('START',{gameId:game.id});
        },'vh-wide'));
        list.append(card);
      }
      if(visible<missions.games.length)list.append(button('다른 학습도 보기 ('+(missions.games.length-visible)+'개)',()=>{
        visible=Math.min(visible+8,missions.games.length);render();
      },'vh-wide'));
    };
    render();
    ui.body.append(list);
    ui.title.focus({preventScroll:true});
  }
  function showGrowthTower(items){
    if(!Array.isArray(items)||items.length!==3)return;
    phase='choose';open();resetBody();theme('scroll');root.dataset.mode='growth';
    ui.title.textContent='🌟 성장의 탑';
    ui.counter.textContent='내가 고르는 배움 길';
    ui.note.textContent='별 개수로 능력을 평가하지 않아요. 학습 단계는 보호자와 함께 선택합니다.';
    ui.listen.hidden=false;ui.hint.hidden=true;
    voiceText='잘하는 것과 더 연습하고 싶은 것을 살펴보고 내 단계에서 다음 모험을 골라요.';
    paragraph('수학·국어·영어의 배움 기록을 보고, 내게 적합한 모험을 선택해요. 숫자는 잠정적인 학습 참고자료입니다.','vh-story');
    ui.body.append(scenicBanner('growth'));
    const labels={math:'🔢 수학',korean:'📖 국어',english:'🌍 영어'};
    const levels=['','🌱 씨앗','🌿 새싹','🌸 꽃잎','✨ 열매'];
    const grid=label('div','','vh-district-missions');
    for(const item of items){
      const card=label('article','','vh-route vh-mission-card');
      card.append(label('strong',labels[item.subject]+' · '+levels[item.stage],'vh-route-title'));
      card.append(label('p',item.recommendation,'vh-small'));
      card.append(label('p','독립 첫 풀이 '+item.abilityEvidence+'문항 · 현재 단계 '+item.stage,'vh-small'));
      const select=label('select','','vh-challenge-select');
      select.setAttribute('aria-label',labels[item.subject]+' 단계 설정');
      for(let level=1;level<=4;level++){
        const option=label('option',levels[level]);option.value=String(level);select.append(option);
      }
      select.value=String(item.stage);
      card.append(select);
      card.append(button('보호자와 이 단계로 설정',()=>request('AREA_SET_STAGE',{
        subject:item.subject,stage:Number(select.value)}),'vh-wide'));
      grid.append(card);
    }
    ui.body.append(grid);
    ui.title.focus({preventScroll:true});
  }
  let selectedCareerId='';
  function showCareer(data){
    phase='career';open();resetBody();theme('scroll');root.dataset.mode='career';
    ui.title.textContent='🏛️ 미래 직업 탐색관';
    ui.counter.textContent='큰 꿈을 탐험해요';
    ui.note.textContent='직업의 경제적 기회는 보장되지 않으며, 좋아하는 일과 사회에 기여하는 방법을 함께 살펴봐요.';
    ui.listen.hidden=true;ui.hint.hidden=true;
    mountCareerExplorer(ui.body,{
      dreams:data?.dreams||[],
      unlocked:data?.unlocked||[],
      available:data?.available||{},
      selectedId:selectedCareerId,
      onSelect:id=>{selectedCareerId=id;},
      onDream:id=>request('CAREER_TOGGLE',{itemId:id}),
      onUnlock:(id,subjects)=>request('CAREER_UNLOCK',{itemId:id,subjects}),
      onTravel:subject=>travelToDistrict(subject)
    });
    ui.title.focus({preventScroll:true});
  }
  function showWaterHabitat(data,notice='',world='pond'){
    if(!data||!Array.isArray(data.fish))return;
    const ocean=world==='ocean',fishInWorld=data.fish.filter(f=>f.world===world);
    phase=world;open();resetBody();theme(ocean?'ocean':'garden');root.dataset.mode=world;
    ui.title.textContent=ocean?'🌊 푸른 바다 · 해양생물 탐험':'🐠 생명 연못 · 물고기 키우기';
    ui.counter.textContent=fishInWorld.filter(f=>f.owned).length+' / '+fishInWorld.length+'종 만났어요';
    ui.listen.hidden=false;ui.hint.hidden=true;
    voiceText=ocean?'바다에는 작은 물고기부터 상어와 고래까지 살아요. 다양한 과목을 배우면 더 넓은 바다를 만날 수 있어요.':'서로 다른 배움 자원을 모아 연못 물고기들에게 하루에 한 번 먹이를 줄 수 있어요.';
    ui.note.textContent=ocean?'바다 생물은 가상 보호구역에서 자유롭게 살아요. 상어·고래·바다거북을 실제로 사육하거나 먹이를 주는 놀이가 아닙니다.':'연못은 실제 동물 돌봄을 대신하지 않는 디지털 놀이입니다. 이전 별은 그대로 보존됩니다.';
    if(notice)paragraph(notice,'vh-feedback');
    const panorama=label('section','','vh-water-panorama '+(ocean?'vh-sea-panorama':'vh-pond-panorama'));
    panorama.setAttribute('aria-label',ocean?'바다 보호구역 풍경':'연못 풍경');
    panorama.append(label('div',ocean?'산호초에서 먼바다까지, 함께 넓어지는 세상':'작은 연못에서 시작하는 생명의 이야기','vh-water-caption'));
    const residents=label('div','','vh-water-residents');
    for(const resident of fishInWorld.filter(f=>f.owned)){
      const avatar=label('div','','vh-water-resident');avatar.style.setProperty('--swim-index',fishInWorld.indexOf(resident));
      const art=document.createElement('img');art.src=resident.art;art.alt=resident.name;art.width=170;art.height=125;art.loading='lazy';art.decoding='async';
      avatar.append(art);residents.append(avatar);
    }
    panorama.append(residents);ui.body.append(panorama);
    const resources=label('section','','vh-resource-grid');
    const currencies=[['math','💎','수정'],['korean','🌸','꽃잎'],['english','🪶','깃털'],['hanja','🖋️','먹방울']];
    for(const [id,emoji,name] of currencies){
      const card=label('div','','vh-resource-balance');
      card.append(label('strong',emoji+' '+name,'vh-resource-title'));
      card.append(label('span',String(data.available?.[id]??0),'vh-resource-count'));
      resources.append(card);
    }
    ui.body.append(resources);
    paragraph('새로운 문제를 스스로 해결하면 과목별 자원을 얻어요. 학습 성취와 자원이 쌓이면 '+(ocean?'작은 생물부터 거북·상어·고래까지 서식지가 열려요.':'연못의 새로운 친구가 찾아와요.')+' 세 과목을 같은 날 배우면 균형 보너스도 받아요.','vh-story');
    const list=label('div','','vh-pond-species');
    for(const fish of fishInWorld){
      const article=label('article','','vh-pond-fish');
      article.dataset.species=fish.id;
      const imageWrap=label('span','','vh-fish-emoji vh-fish-art');
      const art=document.createElement('img');art.src=fish.art;art.alt=fish.name+' 일러스트';art.width=144;art.height=116;art.loading='lazy';art.decoding='async';
      imageWrap.append(art);article.append(imageWrap);
      const copy=label('div','','vh-fish-copy');
      copy.append(label('strong',fish.name,'vh-fish-name'));
      copy.append(label('p',fish.description||'함께 키우는 물고기','vh-small'));
      if(fish.owned){
        copy.append(label('p',(fish.careMode==='observe'?'관찰한 날 ':'돌본 날 ')+fish.feedDays+'번 · 발견 '+(fish.growth+1)+'단계','vh-fish-growth'));
        const feed=button(fish.fedToday?'오늘 돌봄 완료 ✓':fish.careMode==='observe'?'🔭 멀리서 관찰하기':'🫧 오늘 먹이 주기',()=>request(ocean?'OCEAN_FEED':'POND_FEED',{itemId:fish.id}),'vh-pond-action');
        feed.disabled=fish.fedToday;
        copy.append(feed);
      }else{
        copy.append(label('p','새 문제 '+fish.minSolved+'개 · 세 과목 균형 학습 '+fish.minBalancedDays+'일 목표','vh-fish-milestone'));
        if(fish.remainingSolved||fish.remainingBalanced)copy.append(label('p','앞으로 새 문제 '+fish.remainingSolved+'개'+(fish.remainingBalanced?' · 균형 학습 '+fish.remainingBalanced+'일':'') ,'vh-fish-growth'));
        const tokens=currencies.map(([id,emoji])=>emoji+(fish.cost[id]||0)).join(' · ');
        copy.append(label('p',tokens,'vh-fish-cost'));
        const adopt=button(fish.canAdopt?(ocean?'🌊 바다 보호구역 열기':'🐟 연못에 초대하기'):fish.meetsLearning?'자원을 모으는 중':'학습을 통해 해금해요',()=>request(ocean?'OCEAN_ADOPT':'POND_ADOPT',{itemId:fish.id}),'vh-pond-action');
        adopt.disabled=!fish.canAdopt;copy.append(adopt);
      }
      article.append(copy);list.append(article);
    }
    ui.body.append(list);
    if(Object.values(data.deficits||{}).some(v=>v>0))
      paragraph('다른 기기의 구매 기록이 합쳐져 자원이 부족할 수 있습니다. 추가 교환은 잠시 중지하고 보호자와 기록을 확인해 주세요.','vh-small');
    ui.title.focus({preventScroll:true});
  }
  const showPond=(data,notice='')=>showWaterHabitat(data,notice,'pond');
  const showOcean=(data,notice='')=>showWaterHabitat(data,notice,'ocean');
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
    ui.body.append(scenicBanner('shop'));
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
  function showFriends(data){
    if(!Array.isArray(data.relationships)){announce('친구 관계를 다시 불러와 주세요.');return;}
    phase='friends';open();resetBody();theme('garden');root.dataset.mode='friends';
    ui.title.textContent='💞 나를 기억하는 마을 친구들';
    ui.counter.textContent='함께한 기억';ui.hint.hidden=true;ui.listen.hidden=true;
    ui.note.textContent='친구 관계는 방문과 오래 기억한 배움으로만 자라요. 점수나 순위는 없어요.';
    paragraph('친구들은 내가 전에 왔는지, 며칠 뒤에도 배운 것을 기억했는지를 알아봐요.','vh-story');
    const meta={
      bunny:['🐰','토끼 친구'],cat:['🐱','별 가게 고양이'],squirrel:['🐿️','다람쥐 탐험가'],
      owl:['🦉','부엉이 친구'],tutor:['📚','뱁수 선생님']
    };
    const levels={new:'처음 만나는 사이',familiar:'익숙한 사이',friend:'친구',special:'특별한 친구',guardian:'기억을 지키는 친구'};
    const grid=label('div','','vh-friend-grid');
    for(const relation of data.relationships){
      const [emoji,name]=meta[relation.id]||['✨',relation.id];
      const card=label('article','',`vh-friend-card ${relation.level||'new'}`);
      card.append(label('span',emoji,'vh-friend-icon'));
      const copy=label('div','','vh-friend-copy');
      copy.append(label('strong',name,'vh-friend-name'));
      copy.append(label('span',levels[relation.level]||levels.new,'vh-friend-level'));
      copy.append(label('p',relation.line1||'반가워!','vh-friend-line'));
      if(relation.memory30>0)copy.append(label('small','🌳 한 달의 기억이 수호수로 자라는 걸 함께 본 친구','vh-friend-memory'));
      else if(relation.memory14>0)copy.append(label('small','🌠 오래 기억한 배움을 함께 본 친구','vh-friend-memory'));
      else if(relation.memory7>0)copy.append(label('small','🦋 기억나비를 함께 본 친구','vh-friend-memory'));
      card.append(copy);grid.append(card);
    }
    ui.body.append(grid);
    const residents=label('section','','vh-resident-panel');
    residents.append(label('h3','마을에 머무는 특별한 친구','vh-learning-loop-title'));
    if(data.residents?.memoryButterfly)residents.append(label('p','🦋 기억나비 · 7일 이상 지난 배움을 스스로 다시 기억해 마을에 머물기 시작했어요.','vh-story-detail'));
    if(data.residents?.starlightOwl)residents.append(label('p','🦉✨ 별빛 기억 부엉이 · 14일 이상 지난 배움을 다시 기억해 별빛 언덕에 정착했어요.','vh-story-detail'));
    if(data.residents?.memoryGuardian)residents.append(label('p','🌳 기억 수호수 · 한 달 이상 지난 배움을 다시 기억해 마을에 깊게 뿌리내렸어요.','vh-story-detail'));
    if(!data.residents?.memoryButterfly&&!data.residents?.starlightOwl&&!data.residents?.memoryGuardian)residents.append(label('p','아직 희귀 친구가 정착하지 않았어요. 오래 지난 배움을 다시 떠올리면 자연스럽게 찾아와요.','vh-story-detail'));
    ui.body.append(residents);ui.title.focus({preventScroll:true});
  }
  function showEcology(data){
    if(!Array.isArray(data.ecology)){announce('배움 생태계를 다시 불러와 주세요.');return;}
    phase='ecology';open();resetBody();theme('garden');root.dataset.mode='ecology';
    ui.title.textContent='🌿 오래 기억한 배움 생태계';ui.counter.textContent='기억이 자라는 곳';
    ui.hint.hidden=true;ui.listen.hidden=true;ui.note.textContent='문제를 많이 푼 양이 아니라, 며칠 뒤에도 다시 기억한 배움만 자라요.';
    paragraph('오래 기억한 배움의 종류가 꽃·숲·길로 남아요. 아직 싹트지 않은 곳도 천천히 기다려요.','vh-story');
    const grid=label('div','','vh-ecology-grid');
    for(const habitat of data.ecology){
      const active=(habitat.events||0)>0,tier=habitat.tier||'';
      const card=label('article','',`vh-ecology-card ${active?'active':''} ${tier}`);
      card.append(label('span',habitat.emoji||'🌱','vh-ecology-icon'));
      const copy=label('div','','vh-ecology-copy');copy.append(label('strong',habitat.name||'배움터','vh-ecology-name'));
      copy.append(label('span',!active?'아직 씨앗을 기다리는 중':tier==='memory-30'?'30일 기억 · 깊게 뿌리내림':tier==='memory-14'?'14일 기억 · 환하게 자람':'7일 기억 · 새싹이 남음','vh-ecology-level'));
      if(active&&Array.isArray(habitat.skills)&&habitat.skills.length)copy.append(label('p',habitat.skills.slice(0,2).join(' · '),'vh-ecology-skills'));
      card.append(copy);grid.append(card);
    }
    ui.body.append(grid);
    const guardian=label('section','','vh-resident-panel');guardian.append(label('h3','🌳 기억 수호수','vh-learning-loop-title'));
    guardian.append(label('p',data.ecologyGuardian?'한 달 이상 지난 배움을 스스로 다시 기억해 수호수가 마을에 뿌리내렸어요.':'30일 이상 지난 배움을 다시 기억하면 수호수가 자라기 시작해요.','vh-story-detail'));
    ui.body.append(guardian);ui.title.focus({preventScroll:true});
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
    if(Array.isArray(model.learningPlan?.missions)&&model.learningPlan.missions.length){
      const loop=label('section','','vh-learning-loop');
      loop.append(label('h3','🧠 오늘의 3걸음','vh-learning-loop-title'));
      loop.append(label('p',model.learningPlan.principle||'다시 떠올리기 → 알맞은 도전 → 다른 맥락에 적용','vh-small'));
      const labels={review:'🔁 다시 떠올리기',foundation:'🌱 내 힘으로 시작',challenge:'🎯 알맞은 도전',transfer:'🧭 다른 곳에 써보기'};
      for(const mission of model.learningPlan.missions){
        const card=label('article','','vh-learning-step');
        card.append(label('strong',(mission.order||'')+' · '+(labels[mission.kind]||'✨ 오늘의 배움'),'vh-route-title'));
        card.append(label('p',mission.title+' · '+mission.reason,'vh-small'));
        card.append(button(mission.kind==='review'?'기억 꺼내기':'이 단계 시작',()=>{
          if(root.dataset.lite==='true'){
            gameId=mission.gameId;request('START',{gameId:mission.gameId,strategy:mission.strategy||'adaptive',purpose:mission.kind||''});
          }else travelToDistrict(mission.subject||'math',mission.gameId);
        },'vh-wide'));
        loop.append(card);
      }
      contentTarget.append(loop);
    }
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
        if(root.dataset.lite==='true'){
          gameId=route.gameId;request('START',{gameId:route.gameId});
        }else travelToDistrict(route.subject||'math',route.gameId);
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
    if(q.gameId?.startsWith('hanja-')||q.total===25||!['choice','build'].includes(q.interactionType||'choice'))return false;
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
    scenery.append(label('span',q.gameId==='kind-dialogue'?'📚 이야기 도서관':
      '✨ 마법마을 체험 학습','vh-spatial-place'));
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
    const skin=q.total===25?'tome':(q.gameId==='kind-dialogue'||q.gameId?.startsWith('hanja-'))?'scroll':'crystal';
    theme(skin);root.dataset.mode='question';
    ui.title.textContent=(q.gameId?.startsWith('hanja-')?'📜 ':'🧩 ')+(q.title || '생각해 볼까요?');
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
    if(q.gameId?.startsWith('hanja-'))ui.body.querySelector('.vh-visual-word')?.classList.add('vh-hanja-character');
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
    const coins=gainedFromAnswer.map(gain=>resourceMeta[gain.subject][0]+' '+resourceMeta[gain.subject][1]+' +'+gain.amount).join(' · ');
    paragraph(coins ? '🎉 새로 모은 배움 자원 '+coins :
      result.correct?'✨ 이미 만난 문제라도 다시 생각하는 힘이 자랐어요.':'오답을 살펴보며 새로운 배움을 준비했어요.','vh-prompt');
    if((result.recoveryEarned??0)>0)paragraph('🌱 어려웠던 문제를 스스로 다시 풀어냈어요!','vh-learning-bonus');
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
    const isChallenge=question?.total===25&&
      (gameId.startsWith('bebsu-')||gameId.startsWith('magic-'));
    ui.title.textContent=isChallenge?
      (gameId.startsWith('magic-')?'🧩 마법 연습 25문제 완주!':'🏆 경시대회 25문제 완주!'):
      '🌷 오늘의 마법 성공!';
    ui.counter.textContent='완료';
    showRoundCue(question?.total||3,question?.total||3);
    showRewardArt(isChallenge?'star_rainbow':'bloom');
    if(result.gardenAdded!==false)sessionRounds++;
    paragraph(result.gardenAdded===false?'이 이야기의 꽃은 이미 정원에 피어 있어요.':'마을에 새로운 꽃이 피었어요!','vh-feedback');
    if(['memory-30','memory-14','memory-7'].includes(result.memoryMoment)){
      const memory=label('section','',`vh-memory-moment ${result.memoryMoment==='memory-30'?'guardian':result.memoryMoment==='memory-14'?'rare':''}`);
      memory.append(label('span',result.memoryMoment==='memory-30'?'🌳':result.memoryMoment==='memory-14'?'🌠':'🦋','vh-memory-icon'));
      memory.append(label('strong',result.memoryMoment==='memory-30'?'기억 수호수가 자랐어요!':result.memoryMoment==='memory-14'?'별빛 기억축제!':'기억나비가 찾아왔어요!','vh-memory-title'));
      memory.append(label('p',`${result.memoryDays||7}일 이상 지난 내용을 힌트 없이 다시 기억했어요. ${result.memoryItems||1}개의 기억이 오래 남아 있어요.`,'vh-memory-copy'));
      ui.body.append(memory);
    }
    // Completion art is shown ONLY after host COMPLETE_WORLD acknowledgement.
    const storyResult=activeStory?.learner===who?
      storyCompletionText(activeStory,result.gardenAdded):'';
    if(storyResult) {
      const scene=label('section','','vh-story-success');
      scene.append(label('span',activeStory.emoji,'vh-story-success-icon'));
      scene.append(label('strong',storyResult,'vh-story-success-text'));
      ui.body.append(scene);
    }
    if(isChallenge)paragraph((result.challengeBonus||0)>0?
      '🎉 25문제 완주 특별 보너스 +'+result.challengeBonus+'별!':
      '🏅 이미 완주한 시험지는 보너스가 중복 지급되지 않아요.','vh-challenge-bonus');
    paragraph('내 마을의 꽃 '+(result.flowers ?? 0)+'송이 · 가족 광장 '+(result.familyFlowers ?? 0)+'송이','vh-prompt');
    paragraph('어떤 단서를 보고 답을 골랐나요? 가족에게 내 생각을 한 문장으로 들려주세요.','vh-explanation');
    if(sessionRounds>=3)paragraph('세 번의 이야기를 마쳤어요. 눈과 몸도 잠깐 쉬어볼까요?','vh-small');
    mostRecentRoundId=result.roundId||'';
    voiceText=result.memoryMoment==='memory-30'?'한 달 전 배운 것을 스스로 다시 기억했어요. 기억 수호수가 마을에 뿌리내렸어요.':result.memoryMoment==='memory-14'?'오래 지난 기억을 스스로 다시 꺼냈어요. 별빛 기억축제가 열렸어요.':result.memoryMoment==='memory-7'?'며칠 전 배운 것을 스스로 다시 기억했어요. 기억나비가 찾아왔어요.':'오늘도 새로운 것을 배웠어요. 마법마을이 조금 더 자랐어요.';
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
    if(data.action==='INIT'||data.action==='START'||data.action==='SHOW_BEBSU'||
      data.action==='SHOW_PRACTICE'||data.action==='AREA_OPEN'||!data.ok)
      ui.home.disabled=ui.plaza.disabled=ui.quest.disabled=ui.bebsu.disabled=false;
    if (data.who === 'tae' || data.who === 'se') {
      if(who!==data.who){zone='home';activeStory=null;ui.area.textContent='나의 마을';ui.home.setAttribute('aria-current','page');ui.plaza.setAttribute('aria-current','false');}
      who=data.who;
      root.dataset.who=who;
      ui.name.textContent=(children[who]||'요정')+'의 마법마을';
      if(data.action==='INIT')syncAvatarStyle();
    }
    // Four subject resources are the primary child-facing currency.
    gainedFromAnswer=[];
    if(data.resources?.available && typeof data.resources.available==='object'){
      const next={};
      for(const subject of Object.keys(resourceMeta)){
        const value=Number(data.resources.available[subject]);
        next[subject]=Number.isSafeInteger(value)&&value>=0?value:0;
        const node=root.querySelector('[data-hud-resource="'+subject+'"]');
        if(node)node.textContent=String(next[subject]);
      }
      const previous=resourceBalancesByWho[who];
      if(data.action==='SUBMIT'&&previous)
        gainedFromAnswer=Object.keys(resourceMeta).map(subject=>({
          subject,amount:Math.max(0,next[subject]-previous[subject])
        })).filter(gain=>gain.amount>0);
      resourceBalancesByWho[who]=next;
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
    else if(data.action==='AREA_OPEN'){
      if(data.district==='career')showCareer(data.career);
      else if(data.district==='pond')showPond(data.pondShop,data.pondNotice);
      else if(data.district==='ocean')showOcean(data.pondShop,data.pondNotice);
      else if(data.district==='kma'||data.district==='practice')showChallengePicker(data);
      else if(data.district==='shop')showShop(data.shop);
      else if(data.district==='garden')showGarden(data);
      else if(data.district==='growth')showGrowthTower(data.growth);
      else showAreaMissions(data.missions);
    }
    else if(['CAREER_OPEN','CAREER_TOGGLE','CAREER_UNLOCK'].includes(data.action))showCareer(data.career);
    else if(['POND_OPEN','POND_ADOPT','POND_FEED'].includes(data.action))showPond(data.pondShop,data.pondNotice);
    else if(['OCEAN_OPEN','OCEAN_ADOPT','OCEAN_FEED'].includes(data.action))showOcean(data.pondShop,data.pondNotice);
    else if(data.action==='SHOW_BEBSU'||data.action==='SHOW_PRACTICE')showChallengePicker(data);
    else if(data.action==='AREA_SET_STAGE')showGrowthTower(data.growth);
    else if(['SHOP_OPEN','SHOP_BUY','SHOP_EQUIP','SHOP_UNEQUIP'].includes(data.action))showShop(data.shop);
    else if(data.action==='ADAPTIVE_OFFER')showAdaptive(data.adaptive);
    else if(data.action==='RELATIONSHIP_OPEN')showFriends(data);
    else if(data.action==='ECOLOGY_OPEN')showEcology(data);
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
  return {update,announce,close,
    syncMotion:()=>sendToUnity(reducedMotion?'MOTION_LOW':'MOTION_FULL'),
    syncAvatarStyle};
}
