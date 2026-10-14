import {createPlayground} from './playground-v13.js';

// Enhance the host's existing gated workshop. Its phase machine, close/listen actions,
// AREA_OPEN callback and answer-in-flight protection remain the sole navigation owner.
const sheet=document.createElement('link');
sheet.rel='stylesheet';sheet.href=new URL('./playground-v13.css',import.meta.url).href;
sheet.dataset.playgroundStyle='v13';document.head.append(sheet);
const root=document.querySelector('#village-ui');
if(root){
  const enhance=()=>{
    if(root.dataset.mode!=='workshop')return;
    const body=root.querySelector('#vh-body');
    if(!body||body.querySelector('.lp13'))return;
    const originalCards=[...body.querySelectorAll('.vh-mechanic-card')];
    if(originalCards.length!==3)return;
    const replacement=createPlayground();
    originalCards[0].before(replacement);
    originalCards.forEach(card=>card.remove());
    body.querySelector('.vh-story')?.remove();
    const title=root.querySelector('#vh-title');if(title)title.textContent='상상하고 만드는 생각 공방';
    const counter=root.querySelector('#vh-counter');if(counter)counter.textContent='마음껏 탐색해요';
    const note=root.querySelector('#vh-note');if(note)note.textContent='자유 놀이예요. 내 정원과 학습 기록은 바뀌지 않아요.';
    const learn=body.querySelector('.vh-wide');if(learn)learn.textContent='수학 모험에서 더 배워요';
    replacement.dataset.integrated='v13';
  };
  const observer=new MutationObserver(enhance);
  observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['data-mode']});
  enhance();
}
