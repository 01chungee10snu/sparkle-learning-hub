// Embed in the existing parent modal; this component never opens its own modal.
export function createCloudSyncPanel({sync}={}) {
  if (!sync || typeof sync.createFamily !== 'function') throw Error('가족 동기화 엔진이 필요합니다.');
  const element=document.createElement('section');element.className='cloud17';element.setAttribute('aria-label','가족 기기 연결');
  element.innerHTML=`<h3>가족 기기 연결</h3><p>같은 가족 코드를 입력하면 마을 기록을 안전하게 공유할 수 있어요.</p><div class="cloud17-actions"><button type="button" data-action="create">새 가족 만들기</button><button type="button" data-action="join">기존 가족 연결</button></div><label>가족 연결 코드<input autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text" data-code type="password" placeholder="연결 코드 붙여넣기"></label><div class="cloud17-actions"><button type="button" data-action="copy">코드 복사</button><button type="button" data-action="reveal">코드 보기</button><button type="button" data-action="disconnect">연결 해제</button></div><p class="cloud17-status" role="status" aria-live="polite"></p><div class="cloud17-conflict" hidden><p>두 기기에서 마을이 함께 변경됐습니다. 사용할 기록을 직접 선택해 주세요. 다른 쪽 기록은 교체될 수 있습니다.</p><button type="button" data-action="remote">가족 서버 기록 사용</button><button type="button" data-action="local">이 기기 기록 사용</button></div>`;
  const field=element.querySelector('[data-code]'),status=element.querySelector('[role=status]'),conflicts=element.querySelector('.cloud17-conflict');
  let pending=false,destroyed=false;
  const refresh=()=>{const current=sync.getStatus();render(current.state,current.detail);};
  const render=(state,detail)=>{if(destroyed)return; const labels={synced:'동기화 완료',connected:'연결됨',disconnected:'연결되지 않음',pending:'변경사항 저장 중',offline:'네트워크 연결이 끊겨 변경사항을 보관 중',conflict:'기록 충돌 발생',destroyed:'연결 종료','storage-warning':'저장공간 확인 필요'};status.textContent=(labels[state]||state)+(detail?' · '+detail:'');conflicts.hidden=state!=='conflict';};
  const handler=async e=>{const btn=e.target.closest('button[data-action]');if(!btn||pending||destroyed)return;pending=true;let error=null;const priorFocus=document.activeElement;element.setAttribute('aria-busy','true');element.querySelectorAll('button').forEach(b=>b.disabled=true);
    try{switch(btn.dataset.action){
      case 'create':await sync.createFamily();field.value='';field.type='password';break;
      case 'join':await sync.joinFamily(field.value);field.value='';break;
      case 'reveal':{const code=sync.getPairCode();if(!code)throw Error('가족 연결을 먼저 시작해 주세요.');field.value=field.value===code?'':code;field.type=field.value?'text':'password';break;}
      case 'copy':{const code=sync.getPairCode();if(!code)throw Error('가족 연결을 먼저 시작해 주세요.');if(!globalThis.navigator?.clipboard?.writeText)throw Error('복사 기능을 사용할 수 없습니다. 코드를 직접 입력해 주세요.');await navigator.clipboard.writeText(code);break;}
      case 'disconnect':sync.disconnect();field.value='';field.type='password';break;
      case 'local':case 'remote':await sync.resolveConflict(btn.dataset.action);break;
    }}catch(cause){error=cause;}
    finally{pending=false;element.setAttribute('aria-busy','false');if(!destroyed){refresh();if(error)status.textContent='작업 실패 · '+(error.message||'다시 시도해 주세요.');element.querySelectorAll('button').forEach(b=>b.disabled=false);const focus=document.activeElement;if(element.isConnected&&btn.isConnected&&!btn.disabled&&(focus===document.body||focus===document.documentElement||focus===priorFocus&&priorFocus===btn))btn.focus({preventScroll:true});}}
  };
  element.addEventListener('click',handler);
  const onStatus=({state,detail})=>render(state,detail);
  // The owner forwards engine status updates here (or creates the panel before engine).
  return {element,onStatus,destroy(){destroyed=true;element.removeEventListener('click',handler);field.value='';element.remove();}};
}
