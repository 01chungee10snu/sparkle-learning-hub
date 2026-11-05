import {ART46,cohesiveArt,rewardArt,assignCohesiveImage} from '../platform/cohesive-art-v46.js?v=cohesive-v46-20261105';

/** Read-only presentation adapter. It must never reinterpret a question or reward. */
const controls=Object.freeze({
 'vh-home':'home','vh-plaza':'flower','vh-quest':'book','vh-bebsu':'trophy',
 'vh-map':'map','vh-garden':'garden','vh-pond':'pond','vh-ocean':'ocean','vh-adaptive':'growth','vh-more':'map',
 'vh-run':'play','vh-hop':'feather','vh-motion':'pause','vh-wave':'heart','vh-wardrobe':'wardrobe',
 'vh-shop':'shop','vh-friends':'friend','vh-ecology':'leaf','vh-career':'career','vh-records':'records',
 'vh-parent-dashboard':'parent','vh-listen':'listen','vh-hint':'hint','vh-exit':'close'
});
const reward=Object.freeze({seed:'seed',sprout:'sprout',bud:'bud',bloom:'flower',gift:'chest',heart:'heart',
 badge_leaf:'leaf',badge_book:'book',badge_crown:'crown',magic_dust:'magic_dust',
 star_blue:'star_blue',star_purple:'star_purple',star_rainbow:'star_rainbow',star_yellow:'star'});
const characters=Object.freeze({taehee_original:'tae',sehee_original:'se',
 npc_bunny:'npc_bunny',npc_cat:'npc_cat',npc_squirrel:'npc_squirrel',npc_owl:'npc_owl',butterfly:'npc_butterfly',
 bebsu_brown_tutor:'npc_teacher',bebsu_pink_tutor:'npc_scholar',
 bebsu_brown:'npc_teacher',bebsu_pink:'npc_scholar'});
const retiredSource = image=>image.closest('.vh-original-figure,.original-figure,.original-problem,.original-solution,[data-original-source]');
const leading=/^[\s\uFE0F\u200D]*(?:[\p{Extended_Pictographic}\uFE0F\u200D✨⭐🌱📚]|[\s])+\s*/u;
function decorateImage(img){
 if(img.dataset.art46||img.dataset.art46Failed||retiredSource(img))return;
 const src=img.getAttribute('src')||'';if(!src||src.includes('/cohesive-v46/'))return;
 let url;try{url=new URL(src,document.baseURI);}catch{return;}
 const name=decodeURIComponent(url.pathname.split('/').pop()||'').replace(/\.(png|webp|svg)$/i,'');
 if(!/\.(png|webp|svg)$/i.test(url.pathname))return;
 let mapping;
 if(characters[name])mapping=['characters',characters[name]];
 else if((/marine-premium|pond-originals|marine-gallery/.test(url.pathname))&&ART46.marine.includes(name))mapping=['marine',name];
 else if(/career/.test(url.pathname)&&ART46.careers.includes(name))mapping=['careers',name];
 else if((/\/(?:Rewards|rewards)\//.test(url.pathname)||/\/village\/assets\//.test(url.pathname))&&reward[name])mapping=['icons',reward[name]];
 else if(/\/gameplay\//.test(url.pathname)&&ART46.scenery.includes(name))mapping=['scenery',name];
 else if(/\/assets\/bebsu\/art\/states\//.test(url.pathname))mapping=['characters',/pink/.test(name)?'npc_scholar':'npc_teacher'];
 else if(/\/assets\/bebsu\/art\/badges\//.test(url.pathname))mapping=['icons',name==='review'?'sprout':name==='steady'?'star_rainbow':'star'];
 else if(/\/assets\/bebsu\/art\/icons\//.test(url.pathname))mapping=['icons',({scholar:'book',abacus:'crystal',cheer:'star',lightbulb:'hint'})[name]||'book'];
 if(mapping)assignCohesiveImage(img,...mapping);
}
function buttonIcon(button,key){
 if(!button||button.querySelector('.v46-control-icon'))return;
 button.dataset.cohesiveControl=key;
 // Only known navigation controls. Never remove a glyph from problem/answer text.
 const image=document.createElement('img');image.src=cohesiveArt('icons',key);image.alt='';image.className='v46-control-icon';image.width=30;image.height=30;image.setAttribute('aria-hidden','true');
 const slot=button.firstElementChild;
 if(slot?.tagName==='SPAN'&&!slot.children.length&&slot.textContent.trim().length<=5)slot.replaceChildren(image);
 else{
  const first=button.firstChild;
  if(first?.nodeType===Node.TEXT_NODE)first.nodeValue=first.nodeValue.replace(leading,'');
  button.prepend(image);
 }
}
export function refreshCohesiveUI(scope=document){
 for(const img of scope.querySelectorAll('img'))decorateImage(img);
 if(scope instanceof HTMLImageElement)decorateImage(scope);
 for(const [id,key] of Object.entries(controls))buttonIcon(scope.querySelector('#'+id),key);
 for(const el of scope.querySelectorAll('.vh-resource-hud > span')){
  if(el.dataset.cohesiveControl)continue;
  const subject=el.querySelector('[data-hud-resource]')?.dataset.hudResource;
  const key={math:'crystal',korean:'flower',english:'feather',hanja:'ink'}[subject];if(!key)continue;
  el.dataset.cohesiveControl=key;
  const first=el.firstChild;if(first?.nodeType===Node.TEXT_NODE)first.nodeValue='';
  const im=document.createElement('img');im.src=cohesiveArt('icons',key);im.alt='';im.width=24;im.height=24;im.className='v46-resource-icon';el.prepend(im);
 }
 for(const card of scope.querySelectorAll('.reward-card')){
  const id=card.querySelector('[data-reward]')?.dataset.reward;
  const symbol=card.querySelector('.reward-symbol');
  if(!id||!rewardArt(id)||!symbol||symbol.dataset.reward46===id)continue;
  symbol.dataset.reward46=id;
  const old=symbol.innerHTML,image=document.createElement('img');image.src=rewardArt(id);image.alt='';image.className='native-art v46-gift-art';image.width=76;image.height=76;
  image.addEventListener('error',()=>{symbol.innerHTML=old;},{once:true});symbol.replaceChildren(image);
 }
 for(const symbol of scope.querySelectorAll('[data-gift-id]')){
  const id=symbol.dataset.giftId;if(!rewardArt(id)||symbol.dataset.reward46===id)continue;
  symbol.dataset.reward46=id;const image=document.createElement('img');image.src=rewardArt(id);image.alt='';image.width=40;image.height=40;image.className='v46-equipped-gift';symbol.replaceChildren(image);
 }
 const modal=scope.querySelector('.overlay .dialog');
 if(modal&&!modal.dataset.cohesivePanel){modal.dataset.cohesivePanel='true';
  const heading=modal.querySelector('h2');if(heading){const icon=document.createElement('img');icon.src=cohesiveArt('icons','records');icon.alt='';icon.className='v46-panel-icon';icon.width=36;icon.height=36;heading.prepend(icon);}}
}
let mounted=false;
export function mountCohesiveUI(){
 if(mounted)return;mounted=true;document.documentElement.dataset.artRevision='46';
 let queued=false;
 const refresh=()=>{queued=false;refreshCohesiveUI(document);};
 const schedule=()=>{if(!queued){queued=true;queueMicrotask(refresh);}};
 const observer=new MutationObserver(records=>{
  if(records.some(r=>r.type==='attributes'||Object.hasOwn(controls,r.target.id||'')||[...r.addedNodes].some(n=>n.nodeType===Node.ELEMENT_NODE)))schedule();
 });
 observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src']});
 refresh();window.addEventListener('pagehide',()=>observer.disconnect(),{once:true});
}
