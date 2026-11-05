import {CONTENT_VERSION,CONTENT_ROOMS,contentArt,roomFor,decorateCountedObjects,countedProp} from '../platform/content-art-v45.js?v=interiors-v45-20261105';

/** Presentation-only adapter: existing host still owns questions, answers and all receipts. */
export function mountContentWorld({root,sendToUnity,getContext=()=>({})}){
  if(!root||typeof sendToUnity!=='function')throw new TypeError('Interior view requires the existing village host');
  const wrap=root.querySelector('#village-dialog-wrap');
  const board=wrap?.querySelector('.vh-dialog');
  if(!wrap||!board)throw new Error('Missing accessible learning surface');
  const stage=document.createElement('aside');stage.className='v45-room-stage';stage.setAttribute('aria-label','현재 활동 공간');
  const poster=document.createElement('img');poster.className='v45-room-fallback';poster.alt='';poster.decoding='async';poster.width=1000;poster.height=700;
  const caption=document.createElement('div');caption.className='v45-room-caption';
  const icon=document.createElement('img');icon.alt='';icon.width=64;icon.height=64;
  const copy=document.createElement('div'),title=document.createElement('strong'),detail=document.createElement('span');
  copy.append(title,detail);caption.append(icon,copy);
  const effect=document.createElement('img');effect.className='v45-room-feedback';effect.alt='';effect.hidden=true;
  stage.append(poster,caption,effect);wrap.prepend(stage);
  let key='',nativeKey='',taskKey='',disposed=false,queued=false,effectTimer=0;
  const send=command=>{try{sendToUnity(command);}catch{root.dataset.interiorRenderer='render';}};
  function close(){
    if(!key)return;
    send('INTERIOR:close');key='';nativeKey='';
    delete root.dataset.interior;delete root.dataset.interiorRenderer;
    effect.hidden=true;clearTimeout(effectTimer);
  }
  function sync(){
    queued=false;if(disposed)return;
    if(wrap.hidden||root.dataset.mode==='explore'){close();return;}
    const ctx=getContext()||{};
    const room=roomFor({...ctx,mode:root.dataset.mode||'map',district:ctx.district||root.dataset.district||''});
    if(!room){close();return;}
    const style=CONTENT_ROOMS[room];
    if(room!==key){
      key=room;nativeKey='';taskKey='';root.dataset.interior=room;root.dataset.interiorRenderer='render';
      root.style.setProperty('--content-accent',style.accent);
      root.style.setProperty('--content-prop','url("'+contentArt('props',style.prop)+'")');
      poster.src=contentArt('rooms',room);icon.src=contentArt('props',style.prop);
      title.textContent=style.name;detail.textContent=style.detail;
      effect.hidden=true;
    }
    // Lightweight mode uses the exact same authored scene rendered to WebP.
    // No second WebGL context and no hard dependency on the 3D acknowledgement.
    if(root.dataset.lite!=='true'&&root.dataset.ready==='true'&&nativeKey!==room){
      nativeKey=room;taskKey='';send('INTERIOR:'+room);
    }
    const nextObject=root.dataset.mode==='question'&&ctx.visual?.kind==='emoji'?countedProp(ctx.visual.emoji):'';
    if(nextObject!==taskKey){taskKey=nextObject;send('INTERIOR_OBJECT:'+(nextObject||'clear'));}
    decorateCountedObjects(root.querySelector('#vh-body'));
  }
  function schedule(){if(!queued){queued=true;queueMicrotask(sync);}}
  const observer=new MutationObserver(schedule);
  observer.observe(root,{attributes:true,attributeFilter:['data-mode','data-district','data-question-subject','data-ready','data-lite','data-who']});
  observer.observe(wrap,{attributes:true,attributeFilter:['hidden']});
  const objectsObserver=new MutationObserver(schedule);objectsObserver.observe(root.querySelector('#vh-body'),{childList:true,characterData:true,subtree:true});
  function ready(event){
    const report=event.detail;
    if(!report||report.version!==CONTENT_VERSION||!key)return;
    if(report.open&&report.room===key){root.dataset.interiorRenderer='native';stage.dataset.room=key;}
    else if(!report.open&&!wrap.hidden){nativeKey='';root.dataset.interiorRenderer='render';schedule();}
  }
  window.addEventListener('sparkle-interior-ready',ready);
  function pulse(kind){
    if(!['correct','learn','complete','select','hint'].includes(kind))return;
    sync();if(!key)return;
    send('INTERIOR_EFFECT:'+kind);
    effect.src=contentArt('props',kind==='correct'||kind==='complete'?'star':kind==='hint'?'lantern':kind==='learn'?'sprout':'crystal');
    effect.hidden=false;effect.dataset.effect=kind;
    root.dataset.contentFeedback=kind;
    clearTimeout(effectTimer);effectTimer=setTimeout(()=>{effect.hidden=true;delete root.dataset.contentFeedback;},2200);
  }
  queueMicrotask(sync);
  return {refresh:sync,pulse,close,destroy(){disposed=true;close();observer.disconnect();objectsObserver.disconnect();window.removeEventListener('sparkle-interior-ready',ready);stage.remove();}};
}
