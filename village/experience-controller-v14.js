// Controls the DOM modal independently of host-owned learning and reward state.
export function createExperienceController({root, dialog, title, exit, controls, help, shortcuts, sendToUnity, onCancel, focusFallback}) {
  let previousFocus = null;
  let pausedForVisibility = false;
  const focusable = () => [...dialog.querySelectorAll('button,input,select,textarea,a[href],[tabindex]')]
    .filter(el => !el.disabled && !el.hidden && el.tabIndex >= 0 && !el.closest('[hidden]') && el.getClientRects().length);
  function focusInside() { (title || focusable()[0] || exit)?.focus({preventScroll:true}); }
  function open() {
    if (dialog.hidden) previousFocus = root.ownerDocument.activeElement;
    dialog.hidden = false;
    controls.hidden = true; help.hidden = true; shortcuts.hidden = true;
    sendToUnity('PAUSE_EXPLORE');
    focusInside();
  }
  function close() {
    if(dialog.hidden)return;
    dialog.hidden = true;
    controls.hidden = false; help.hidden = false; shortcuts.hidden = false;
    sendToUnity('CLOSE_QUEST');
    const candidate=previousFocus?.isConnected && !previousFocus.closest('[hidden]') && !previousFocus.closest('[inert]') ? previousFocus : null;
    const target=candidate || focusFallback?.() || controls.querySelector('button');
    target?.focus({preventScroll:true});
    previousFocus = null;
  }
  function keydown(event) {
    if(dialog.hidden || event.defaultPrevented)return;
    if(event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel(); return; }
    if(event.key !== 'Tab')return;
    const items = focusable();
    if(!items.length){event.preventDefault();focusInside();return;}
    const current = root.ownerDocument.activeElement;
    const index = items.indexOf(current);
    if(event.shiftKey && (index <= 0)){ event.preventDefault();items.at(-1).focus(); }
    else if(!event.shiftKey && (index === -1 || index === items.length-1)){event.preventDefault();items[0].focus();}
  }
  // The pointer event must not reach an underlying WebGL surface or move the player.
  function blockPointer(event) {
    if(event.target === root && dialog.hidden)return;
    if(!dialog.hidden || event.target.closest('button,input,select,textarea,a,.vh-dialog,.vh-shortcut,.vh-district')) {
      event.stopPropagation();
      sendToUnity('UI_POINTER');
    }
  }
  function visibility() {
    if(root.ownerDocument.hidden){pausedForVisibility=true;sendToUnity('APP_PAUSE');return;}
    if(pausedForVisibility){pausedForVisibility=false;sendToUnity('APP_RESUME');}
  }
  root.addEventListener('keydown',keydown,true);
  for(const name of ['pointerdown','pointerup','pointercancel','touchcancel']) root.addEventListener(name,blockPointer);
  root.ownerDocument.addEventListener('visibilitychange',visibility);
  return {open,close,isOpen:()=>!dialog.hidden, destroy(){root.removeEventListener('keydown',keydown,true);for(const name of ['pointerdown','pointerup','pointercancel','touchcancel'])root.removeEventListener(name,blockPointer);root.ownerDocument.removeEventListener('visibilitychange',visibility);}};
}
