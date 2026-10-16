// Spatial 2D village: reuses authored Artcraft assets and existing learning handlers.
const scene=document.querySelector('#lite-village-scene');
const ui=document.querySelector('#village-ui');
if(scene&&ui){
  const art='./assets/artcraft-v12/';
  const image=(name,cls)=>'<img class="'+cls+'" src="'+art+name+'.png" alt="" decoding="async" draggable="false">';
  scene.classList.add('landscape20');
  scene.innerHTML='<div class="lv20-sun" aria-hidden="true"></div><div class="lv20-cloud cloud-a" aria-hidden="true"></div><div class="lv20-cloud cloud-b" aria-hidden="true"></div><div class="lv20-hills" aria-hidden="true"></div>'+
    '<div class="lv20-heading"><span>OUR LITTLE MAGIC WORLD</span><h2>배움이 자라는 마을</h2><p>가고 싶은 건물을 눌러 보세요</p></div>'+
    '<div class="lv20-stage" role="group" aria-label="마법마을 학습 장소">'+
    '<div class="lv20-island" aria-hidden="true"></div>'+
    '<svg class="lv20-paths" viewBox="0 0 1000 650" preserveAspectRatio="none" aria-hidden="true"><path d="M500 610 Q490 465 260 340 Q180 260 280 195 M500 490 Q730 455 755 300 M495 465 Q470 300 520 210" fill="none" stroke="#c9b58c" stroke-width="52" stroke-linecap="round"/><path d="M500 610 Q490 465 260 340 Q180 260 280 195 M500 490 Q730 455 755 300 M495 465 Q470 300 520 210" fill="none" stroke="#f8e8c5" stroke-width="42" stroke-linecap="round"/></svg>'+
    image('tree_blush','lv20-decor tree-left')+image('tree_lilac','lv20-decor tree-right')+
    '<div class="lv20-castle" aria-hidden="true">'+image('learning_castle','')+'<span>별빛 마법학교</span></div>'+
    '<button type="button" class="lv20-place place-korean" data-scene-district="korean" aria-label="이야기 도서관 열기">'+image('house_library','')+'<span><b>이야기 도서관</b><small>읽고 · 생각하고</small></span></button>'+
    '<button type="button" class="lv20-place place-math" data-scene-district="math" aria-label="수학 정원 열기">'+image('house_flower','')+'<span><b>수학 정원</b><small>발견하고 · 풀어 보고</small></span></button>'+
    '<button type="button" class="lv20-place place-english" data-scene-district="english" aria-label="영어 숲 열기">'+image('tree_lilac','')+'<span><b>영어 숲</b><small>듣고 · 말하고</small></span></button>'+
    '<button type="button" class="lv20-place place-garden" data-scene-action="vh-garden" aria-label="나의 정원 열기">'+image('pond','')+'<span><b>나의 정원</b><small>돌보고 · 키우고</small></span></button>'+
    '<div class="lv20-fairy" aria-hidden="true">'+image('taehee_original','fairy-tae')+image('sehee_original','fairy-se')+'</div>'+
    '<div class="lv20-flowers" aria-hidden="true">✿ <i>✿</i> ✿ <i>✿</i> ✿</div></div>';
  scene.addEventListener('click',event=>{
    const button=event.target.closest('button[data-scene-district],button[data-scene-action]');
    if(!button||scene.inert||ui.hidden)return;
    const target=button.dataset.sceneDistrict
      ?ui.querySelector('[data-district="'+button.dataset.sceneDistrict+'"]')
      :ui.querySelector('#'+button.dataset.sceneAction);
    if(target&&!target.disabled)target.click();
  });
  const sync=()=>{
    const blocked=!ui.querySelector('#village-dialog-wrap')?.hidden||ui.dataset.navigationOpen==='true';
    scene.inert=blocked;
    scene.dataset.learner=ui.dataset.who||'tae';
    scene.dataset.reducedMotion=ui.dataset.reducedMotion||'false';
    scene.dataset.area=ui.querySelector('#vh-zone')?.textContent?.includes('광장')?'plaza':scene.dataset.area||'home';
  };
  new MutationObserver(sync).observe(ui,{attributes:true,subtree:true,attributeFilter:['hidden','data-who','data-navigation-open','data-reduced-motion']});
  document.addEventListener('visibilitychange',()=>{scene.dataset.paused=String(document.hidden);});
  sync();
}
