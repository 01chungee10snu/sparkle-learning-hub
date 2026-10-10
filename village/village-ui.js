// DOM-driven game HUD, designed for readable mobile buttons and accessibility.
// It never scores an answer: the established learning platform remains authoritative.
export function createVillageUI({root, sendToUnity, sendRequest}) {
  if (!root || typeof sendToUnity !== 'function' || typeof sendRequest !== 'function')
    throw new TypeError('village UI needs an element and bridge callbacks');
  root.innerHTML = [
    '<section id="village-info" class="vh-card" aria-label="마을 상태">',
    ' <div class="vh-avatar" aria-hidden="true"></div>',
    ' <div class="vh-meta"><h2 id="vh-name">마법마을</h2>',
    ' <p><span id="vh-area">내 마을</span> · <span class="vh-stars">⭐ <span id="vh-stars">0</span>개</span></p>',
    ' <p id="vh-progress">오늘도 나만의 속도로 탐험해요</p></div>',
    '</section>',
    '<p id="vh-help" class="vh-help">바닥을 터치해 이동하고 친구를 만나보세요.</p>',
    '<nav id="village-controls" aria-label="마법마을 바로가기">',
    ' <button id="vh-home" class="vh-action" type="button" aria-current="page"><span>🏡</span>내 마을</button>',
    ' <button id="vh-plaza" class="vh-action" type="button"><span>🌷</span>가족 광장</button>',
    ' <button id="vh-quest" class="vh-action" type="button"><span>🐰</span>오늘의 부탁</button>',
    '</nav>',
    '<p id="village-toast" role="alert" hidden></p>',
    '<div id="village-dialog-wrap" hidden aria-busy="false">',
    ' <section class="vh-dialog" role="dialog" aria-modal="true" aria-labelledby="vh-title">',
    '  <header class="vh-dialog-title"><h2 id="vh-title" tabindex="-1">배움 이야기</h2>',
    '    <span class="vh-progress" id="vh-counter"></span></header>',
    '  <div class="vh-dialog-body" id="vh-body"></div>',
    '  <footer class="vh-dialog-footer"><button class="vh-secondary" id="vh-listen" type="button">🔊 읽어줘</button>',
    '   <button class="vh-secondary" id="vh-exit" type="button" hidden>마을로 돌아가기</button>',
    '   <p class="vh-small" id="vh-note">틀려도 괜찮아요. 하나씩 생각해요.</p></footer>',
    ' </section>',
    '</div>'
  ].join('');
  root.dataset.who = 'tae';
  const $ = id => root.querySelector('#' + id);
  const ui = {
    name:$('vh-name'), area:$('vh-area'), stars:$('vh-stars'),
    progress:$('vh-progress'), help:$('vh-help'),
    home:$('vh-home'), plaza:$('vh-plaza'), quest:$('vh-quest'),
    dialog:$('village-dialog-wrap'), title:$('vh-title'),
    counter:$('vh-counter'), body:$('vh-body'), exit:$('vh-exit'),
    listen:$('vh-listen'), note:$('vh-note'), controls:$('village-controls'),
    toast:$('village-toast')
  };
  let who = 'tae', zone = 'home', gameId = '', question = null;
  let phase = 'explore', busy = false, lastFocus = null, voiceText = '';
  let requestNumber = 0;
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
    return Promise.resolve(sendRequest({
      action, requestId: nextId(), gameId, ...extra
    })).catch(e => {
      busy = false;
      ui.dialog.setAttribute('aria-busy','false');
      announce(e?.message || '요청에 문제가 발생했어요.');
    });
  }
  function setZone(next) {
    if (phase !== 'explore') return;
    zone = next;
    ui.home.setAttribute('aria-current',next === 'home'?'page':'false');
    ui.plaza.setAttribute('aria-current',next === 'plaza'?'page':'false');
    ui.area.textContent = next === 'plaza' ? '가족 공용 광장' : '나의 마을';
    ui.help.textContent = next === 'plaza' ?
      '함께 피운 꽃을 구경하고 우체국 친구를 만나보세요.' :
      '바닥을 터치해 이동하고 친구를 만나보세요.';
    sendToUnity(next === 'plaza' ? 'GO_PLAZA' : 'GO_HOME');
  }
  ui.home.addEventListener('click',()=>setZone('home'));
  ui.plaza.addEventListener('click',()=>setZone('plaza'));
  ui.quest.addEventListener('click',()=>{
    if (phase === 'explore') sendToUnity('START_RECOMMENDED');
  });
  ui.exit.addEventListener('click',close);
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
    window.speechSynthesis?.cancel();
    ui.dialog.hidden = true;
    ui.controls.hidden = false;
    ui.help.hidden = false;
    phase = 'explore';
    busy = false;
    question = null;
    sendToUnity('CLOSE_QUEST');
    (lastFocus?.isConnected ? lastFocus : ui.quest).focus({preventScroll:true});
  }
  function open() {
    if (phase === 'explore') lastFocus = document.activeElement;
    ui.dialog.hidden = false;
    ui.controls.hidden = true;
    ui.help.hidden = true;
    ui.exit.hidden = true;
    ui.listen.hidden = false;
    ui.note.hidden = false;
    ui.title.focus({preventScroll:true});
  }
  function resetBody() {
    ui.body.replaceChildren();
    ui.dialog.setAttribute('aria-busy','false');
    busy = false;
  }
  function paragraph(text, className) {
    const p = label('p',text,className);
    ui.body.append(p);
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
      ui.body.append(row,button('이만큼 담았어요 ✨',()=>submit(amount),'vh-wide'));
      return;
    }
    const input = label('input','', 'vh-input');
    input.type = 'text'; input.inputMode = 'numeric'; input.autocomplete = 'off';
    input.setAttribute('aria-label','숫자 답');
    input.placeholder='정답 숫자';
    const holder = label('div','', 'vh-row');
    holder.append(input);
    ui.body.append(holder,button('정답 확인 ✨',()=>submit(input.value.trim()),'vh-wide'));
  }
  function matchQuestion(q) {
    const left = q.left?.length ? q.left : q.items;
    const right = q.right?.length ? q.right : q.items;
    if (!left?.length || !right?.length) {
      paragraph('문제를 표시할 수 없어요. 기존 배움터에서 학습해 주세요.','vh-story');
      return;
    }
    const panel = label('div','', 'vh-pairs');
    const picks = left.map((_,i)=>i);
    const selects = [];
    const refresh = () => selects.forEach((sel,i)=>{sel.value=String(picks[i])});
    left.forEach((part,i)=>{
      const line = label('div','', 'vh-pair');
      const leftText = label('span',part,'vh-pair-label');
      const sel = document.createElement('select');
      sel.setAttribute('aria-label',part+'의 짝 선택');
      right.forEach((text,j)=>{
        const opt=label('option',(j+1)+'. '+text);
        opt.value=String(j);
        sel.append(opt);
      });
      sel.value=String(i);
      sel.addEventListener('change',()=>{
        const next=Number(sel.value);
        const other=picks.indexOf(next);
        if (other!==-1 && other!==i) picks[other]=picks[i];
        picks[i]=next;
        refresh();
      });
      selects.push(sel);
      line.append(leftText,sel);
      panel.append(line);
    });
    ui.body.append(panel,button('모두 연결했어요 ✨',()=>submit(picks),'vh-wide'));
    paragraph('같은 번호를 고르면 기존 연결과 자리를 바꿔요.','vh-small');
  }
  function showQuestion(q) {
    if (!q) return;
    phase='question'; question=q; gameId=q.gameId;
    open(); resetBody();
    ui.title.textContent='🧩 '+(q.title || '생각해 볼까요?');
    ui.counter.textContent=(q.index || 1)+' / '+(q.total || 3);
    voiceText=[q.story,q.prompt,...(q.choices||[])].filter(Boolean).join('. ');
    if (q.story) paragraph(q.story,'vh-story');
    paragraph(q.prompt || '무엇을 선택할까요?','vh-prompt');
    const mode=q.interactionType || 'choice';
    if (mode==='choice') {
      const options = label('div','', 'vh-options');
      (q.choices||[]).forEach((text,i)=>{
        options.append(button((i+1)+'. '+text,()=>submit(i)));
      });
      ui.body.append(options);
    } else if (mode==='build' || mode==='numeric') numericQuestion(q,mode);
    else if (['match','sequence','memory'].includes(mode)) matchQuestion(q);
    else paragraph('아직 지원하지 않는 학습 유형이에요. 반짝 배움터에서 이어서 풀 수 있어요.','vh-story');
    ui.listen.hidden = false;
    ui.note.textContent='힌트와 해설을 보며 천천히 배워요.';
    ui.exit.hidden = true;
    ui.title.focus({preventScroll:true});
  }
  function showFeedback(result) {
    phase='feedback'; open();resetBody();
    ui.title.textContent=result.correct ? '🌟 멋진 발견!' : '🌱 다시 생각하는 힘';
    ui.counter.textContent='이번 문제';
    paragraph(result.correct ? '좋아요! 생각한 답이 맞았어요.' : '다른 방법을 하나 배웠어요.','vh-feedback');
    paragraph('이번 문제에서 받은 별 '+(result.earned??0)+'개','vh-prompt');
    paragraph(result.explanation || '차근차근 생각해 봐요.','vh-explanation');
    voiceText=result.explanation||'';
    ui.body.append(button('다음 이야기 →',()=>request('NEXT'),'vh-wide'));
    ui.note.textContent='틀린 문제도 배운 흔적이 남아요.';
    ui.listen.hidden = !voiceText;
    ui.title.focus({preventScroll:true});
  }
  function complete(result) {
    phase='complete';open();resetBody();
    ui.title.textContent='🌷 오늘의 마법 성공!';
    ui.counter.textContent='완료';
    paragraph('마을에 새로운 꽃이 피었어요!','vh-feedback');
    paragraph('내 마을의 꽃 '+(result.flowers ?? 0)+'송이 · 가족 광장 '+(result.familyFlowers ?? 0)+'송이','vh-prompt');
    paragraph('오늘 발견한 생각을 가족에게 이야기해볼까요?','vh-explanation');
    voiceText='오늘도 새로운 것을 배웠어요. 마법마을이 조금 더 자랐어요.';
    ui.body.append(button('🏡 마을로 돌아가기',close,'vh-wide'));
    ui.exit.hidden=true;
    ui.listen.hidden=false;
    ui.title.focus({preventScroll:true});
  }
  function update(data) {
    if (!data || typeof data !== 'object') return;
    busy = false;
    ui.dialog.setAttribute('aria-busy','false');
    if (!data.ok) {
      announce(data.error || '문제가 발생했어요. 다시 시도해 주세요.');
      return;
    }
    announce('');
    if (data.action === 'INIT') root.dataset.ready = 'true';
    if (data.who === 'tae' || data.who === 'se') {
      who=data.who;
      root.dataset.who=who;
      ui.name.textContent=(children[who]||'요정')+'의 마법마을';
    }
    ui.stars.textContent=String(data.available??0);
    if (Number.isFinite(data.flowers) && Number.isFinite(data.familyFlowers)) {
      ui.progress.textContent='내 꽃 '+data.flowers+'송이 · 가족 꽃 '+data.familyFlowers+'송이';
    }
    if (data.action==='START' || data.action==='NEXT') {
      if (data.finished) {
        phase='waiting';
        ui.dialog.setAttribute('aria-busy','true');
        return;
      }
      if (data.question) showQuestion(data.question);
    } else if(data.action==='SUBMIT') {
      showFeedback(data);
    } else if(data.action==='COMPLETE_WORLD') {
      complete(data);
    }
  }
  return {update,announce,close};
}
