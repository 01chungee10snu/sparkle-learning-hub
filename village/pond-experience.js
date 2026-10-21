/** A quiet, touch-friendly pond. The host owns every second and every receipt. */
const SUBJECTS={math:['💎','수정'],korean:['🌸','꽃잎'],english:['🪶','깃털'],hanja:['🖋️','먹방울']};
const clamp=(value,lo,hi)=>Math.max(lo,Math.min(hi,value));
const clock=ms=>{const seconds=Math.max(0,Math.ceil((ms||0)/1000));return Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');};
const node=(tag,className,text='')=>{const el=document.createElement(tag);el.className=className;el.textContent=text;return el;};
const control=(text,fn,className='pond-button')=>{const el=node('button',className,text);el.type='button';el.addEventListener('click',fn);return el;};

export function mountPondExperience(container,{fish=[],status=null,request,onLearn,onClose,reducedMotion=false}={}){
  if(!container||typeof request!=='function')throw new TypeError('A pond container and host request callback are required');
  let current=status,running=false,disposed=false,pausedReason='welcome',lastInput=performance.now();
  let frame=0,lastFrame=0,elapsed=0,tickPending=false,selected='',mode='hello';
  let heartbeat=0,sequence=0,announcedWarning=false;
  const actors=[],timers=new Set();
  const section=node('section','pond-experience');
  section.setAttribute('aria-label','물고기와 함께하는 연못');
  section.dataset.state='paused';
  const header=node('div','pond-session-strip');
  const timeLabel=node('strong','pond-time-label','함께할 시간');
  const time=node('span','pond-time','');time.setAttribute('aria-live','off');
  const cost=node('span','pond-cost','1분마다 배움 재료 1개');
  const progress=document.createElement('progress');progress.className='pond-time-progress';progress.max=1;progress.value=1;
  progress.setAttribute('aria-label','연못에 머무를 수 있는 시간');
  header.append(timeLabel,time,cost,progress);
  const scene=node('div','pond-scene');scene.dataset.motion=reducedMotion?'reduced':'full';
  const backdrop=document.createElement('img');backdrop.className='pond-scene-art';
  backdrop.src='../assets/pond-originals-v34/pond-landscape.webp';backdrop.alt='햇살이 물결에 비치는 수초와 연꽃의 연못';
  backdrop.width=1536;backdrop.height=1024;backdrop.decoding='async';
  const rays=node('div','pond-light-rays');rays.setAttribute('aria-hidden','true');
  const layer=node('div','pond-fish-layer');
  const effects=node('div','pond-effects');effects.setAttribute('aria-hidden','true');
  const response=node('p','pond-response','물고기를 누르면 반갑게 인사해요.');response.setAttribute('role','status');
  const overlay=node('div','pond-pause-panel');
  const panelTitle=node('strong','pond-pause-title');
  const panelText=node('p','pond-pause-text');
  const panelActions=node('div','pond-pause-actions');
  overlay.append(panelTitle,panelText,panelActions);
  scene.append(backdrop,rays,layer,effects,response,overlay);
  const toolbar=node('div','pond-interactions');toolbar.setAttribute('aria-label','물고기와 함께하기');
  const hello=control('👋 인사하기',()=>setMode('hello'));
  const follow=control('🫧 물결 따라오기',()=>setMode('follow'));
  const rest=control('🍃 잠깐 쉬기',()=>pause('rest'));
  for(const [button,icon,title] of [[hello,'👋','인사하기'],[follow,'🫧','따라오기'],[rest,'🍃','잠깐 쉬기']]){
    button.setAttribute('aria-label',button.textContent);
    button.replaceChildren(node('span','pond-control-icon',icon),node('span','pond-control-label',title));
  }
  hello.setAttribute('aria-pressed','true');follow.setAttribute('aria-pressed','false');
  toolbar.append(hello,follow,rest);
  const explanation=node('p','pond-session-explainer','연못을 보고 있는 동안 시간이 흘러요. 다른 화면을 보거나 잠깐 쉬면 시간과 재료 사용이 멈춰요.');
  section.append(header,scene,toolbar,explanation);container.append(section);

  function later(fn,delay){const id=setTimeout(()=>{timers.delete(id);if(!disposed)fn();},delay);timers.add(id);return id;}
  function announce(text){response.textContent=text;}
  function active(){return running&&!disposed&&!document.hidden&&current?.allowed!==false;}
  function setMode(next){if(!active())return;mode=next;lastInput=performance.now();hello.setAttribute('aria-pressed',String(mode==='hello'));follow.setAttribute('aria-pressed',String(mode==='follow'));announce(mode==='follow'?'물 위를 살짝 누르면 물고기가 물결을 따라와요.':'물고기에게 반갑게 인사해요.');}
  function pulse(x,y,kind='ripple'){
    const el=node('span','pond-'+kind);el.style.left=x+'%';el.style.top=y+'%';effects.append(el);
    later(()=>el.remove(),reducedMotion?600:1400);
  }
  function bubbles(actor,count=3){
    for(let i=0;i<count;i++)later(()=>pulse(actor.x+(actor.flip?5:-5),actor.y-i*3,'bubble'),i*140);
  }
  function react(actor,kind='hello'){
    if(!active()||!actor)return;
    lastInput=performance.now();selected=actor.fish.id;actor.reaction=kind;actor.reactionUntil=elapsed+2.1;
    actor.el.dataset.reaction=kind;actor.el.setAttribute('aria-label',actor.fish.name+' · 반갑게 인사해요');
    if(!reducedMotion){actor.targetX=clamp(actor.x+(sequence++%2?10:-10),12,88);actor.targetY=clamp(actor.y-8,24,79);}
    bubbles(actor,kind==='feed'?5:3);pulse(actor.x,actor.y,kind==='feed'?'sparkle':'ripple');
    announce(actor.fish.name+(kind==='feed'?'가 먹이를 먹고 지느러미를 살랑여요.':kind==='follow'?'가 물결을 따라 천천히 다가와요.':'가 꼬리를 흔들며 인사해요.'));
  }
  function addFish(f,index){
    const el=control('',()=>react(actor),'pond-swimmer');el.dataset.fish=f.id;
    el.setAttribute('aria-label',f.name+'에게 인사하기');el.disabled=true;
    const image=document.createElement('img');image.src=f.art;image.alt='';image.width=220;image.height=180;image.decoding='async';
    el.append(image);layer.append(el);
    const actor={fish:f,el,image,x:18+(index%4)*21,y:32+Math.floor(index/4)*28,targetX:18+(index%4)*21,targetY:32+Math.floor(index/4)*28,flip:index%2===1,phase:index*1.71,reactionUntil:0,reaction:''};
    el.style.setProperty('--fish-size',String(clamp(110+(f.size||.5)*45,126,175))+'px');
    actors.push(actor);draw(actor);return actor;
  }
  for(const f of fish.filter(f=>f.owned).slice(0,8))addFish(f,actors.length);
  function draw(actor){
    const edge=clamp(((actor.el.offsetWidth||126)/2+10)/Math.max(1,scene.clientWidth)*100,12,36);
    actor.x=clamp(actor.x,edge,100-edge);
    actor.el.style.left=actor.x+'%';actor.el.style.top=actor.y+'%';
    const bob=active()&&!reducedMotion?Math.sin(elapsed*1.6+actor.phase)*3:0;
    const tilt=active()&&!reducedMotion?Math.sin(elapsed*2.2+actor.phase)*(actor.reaction?7:2):0;
    actor.el.style.transform='translate(-50%, calc(-50% + '+bob+'px)) rotate('+tilt+'deg)';
    actor.image.style.transform='scaleX('+(actor.flip?-1:1)+')';
  }
  function animate(timestamp){
    if(disposed)return;
    const dt=lastFrame?Math.min((timestamp-lastFrame)/1000,.05):0;lastFrame=timestamp;
    if(active()){
      elapsed+=dt;
      if(!reducedMotion)for(const actor of actors){
        if(elapsed>actor.reactionUntil&&actor.reaction){actor.reaction='';actor.el.dataset.reaction='';}
        if(!actor.reaction){
          actor.targetX=50+Math.sin(elapsed*.16+actor.phase)*31;
          actor.targetY=53+Math.sin(elapsed*.29+actor.phase)*20;
        }
        const dx=actor.targetX-actor.x,dy=actor.targetY-actor.y;
        actor.x+=dx*Math.min(1,dt*(actor.reaction?.length?1.7:.32));
        actor.y+=dy*Math.min(1,dt*.8);
        if(Math.abs(dx)>.3)actor.flip=dx>0;
        draw(actor);
      }
    }
    frame=requestAnimationFrame(animate);
  }
  frame=requestAnimationFrame(animate);

  function updateMeter(){
    if(!current)return;
    time.textContent=clock(current.remainingMs)+' / '+clock(current.maxMs);
    progress.max=current.maxMs||1;progress.value=current.remainingMs||0;
    progress.setAttribute('aria-valuetext',clock(current.remainingMs)+' 남았어요');
    const next=Math.max(1,Math.ceil((current.nextChargeMs||60000)/1000));
    cost.textContent='1분마다 재료 1개'+(running?' · 다음 '+next+'초 후':'');
    if(running&&current.remainingMs<=30000&&!announcedWarning){announcedWarning=true;announce('30초 뒤에는 물고기들이 쉬어요. 우리도 배움 산책을 다녀와요.');}
  }
  function updateOverlay(){
    overlay.hidden=running;
    section.dataset.state=running?'active':'paused';
    for(const a of actors)a.el.disabled=!running;
    hello.disabled=follow.disabled=rest.disabled=!running;
    if(running)return;
    panelActions.replaceChildren();
    const blocked=current?.allowed===false;
    if(blocked&&['learning','time','resources','time-limit','resource-empty','exhausted','learning-required'].includes(current?.reason)){
      const l=current.learning||{},done=l.done||0,total=l.total||current.requiredItems||3;
      panelTitle.textContent='🌿 배움 산책을 다녀올까요?';
      panelText.textContent='물고기들이 잠깐 쉬어요. 여러 배움터에서 새 문제 '+total+'개를 만나 보아요. '+done+' / '+total+'개 살펴봤어요. 맞히지 않아도 괜찮아요.';
      panelActions.append(control('📚 배움 산책 시작',()=>{pause('learn');onLearn?.();},'pond-button pond-primary'));
    }else if(blocked){
      panelTitle.textContent='🍃 연못을 잠깐 쉬고 있어요';
      panelText.textContent=current.reason==='busy'||current.reason==='another-tab'?'다른 화면에서 연못을 보고 있어요. 그 화면을 쉬게 한 뒤 다시 와요.':'기록을 확인한 뒤 연못을 이어 볼 수 있어요.';
      panelActions.append(control('이어서 보기',start,'pond-button pond-primary'));
    }else{
      panelTitle.textContent=pausedReason==='welcome'?'🐠 물고기 친구들과 만나요':'🍃 연못을 잠깐 쉬고 있어요';
      panelText.textContent=pausedReason==='welcome'?'남은 시간 '+clock(current?.remainingMs)+'. 보고 있는 시간 1분마다 배움 재료 1개를 써요. 시간이 끝나면 여러 과목의 새 문제를 만나 보아요.':'지금은 시간과 재료를 쓰지 않아요. 다시 보고 싶으면 이어서 보기를 눌러요.';
      panelActions.append(control(pausedReason==='welcome'?'함께 보기 시작':'이어서 보기',start,'pond-button pond-primary'));
    }
    panelActions.append(control('마을에서 쉬기',()=>{pause('rest');onClose?.();},'pond-button pond-secondary'));
  }
  async function start(){
    if(disposed||running||tickPending)return;
    lastInput=performance.now();tickPending=true;
    try{await request(pausedReason==='welcome'?'POND_BEGIN':'POND_RESUME');}
    catch{announce('연못 기록을 확인하고 있어요. 잠시 뒤 다시 눌러요.');}
    finally{tickPending=false;}
  }
  function pause(reason='rest'){
    if(disposed)return;
    const wasRunning=running;running=false;pausedReason=reason;lastFrame=0;
    updateMeter();updateOverlay();
    if(wasRunning)void request('POND_PAUSE').catch(()=>{});
  }
  function receive(data){
    if(disposed)return;
    if(data?.pondSession)current=data.pondSession;
    if(data?.ok===false){pause('error');announce(data.error||'기록을 확인하고 다시 만나요.');return;}
    if(['POND_BEGIN','POND_RESUME'].includes(data?.action)){
      running=current?.allowed!==false&&data?.pondRunning!==false&&!document.hidden;pausedReason='rest';lastInput=performance.now();
    }
    if(current?.allowed===false)running=false;
    if(data?.action==='POND_PAUSE')running=false;
    updateMeter();updateOverlay();
    if(data?.itemChanged&&data?.action==='POND_FEED')react(actors.find(a=>a.fish.id===data.itemChanged),'feed');
  }
  function input(){if(running)lastInput=performance.now();}
  section.addEventListener('pointerdown',input);section.addEventListener('keydown',input);
  const visibility=()=>{if(document.hidden)pause('hidden');};
  const pageHide=()=>pause('hidden');
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',pageHide);
  scene.addEventListener('pointerdown',event=>{
    if(!active()||event.target.closest('button')||mode!=='follow')return;
    const rect=scene.getBoundingClientRect(),x=clamp((event.clientX-rect.left)/rect.width*100,12,88),y=clamp((event.clientY-rect.top)/rect.height*100,25,78);
    pulse(x,y);const actor=actors.find(a=>a.fish.id===selected)||actors[sequence++%Math.max(1,actors.length)];
    if(actor){react(actor,'follow');actor.targetX=x;actor.targetY=y;}
  });
  heartbeat=setInterval(async()=>{
    if(!active()||tickPending)return;
    if(performance.now()-lastInput>=60000){pause('idle');return;}
    tickPending=true;
    try{await request('POND_TICK');}catch{pause('error');}finally{tickPending=false;}
  },1000);
  updateMeter();updateOverlay();
  return {
    receive,pause,
    get running(){return running;},
    focusFish(id){
      if(!active())return;
      let actor=actors.find(a=>a.fish.id===id);
      if(!actor){const f=fish.find(f=>f.id===id&&f.owned);if(!f)return;if(actors.length>=8){actors.shift().el.remove();}actor=addFish(f,actors.length);actor.el.disabled=false;}
      react(actor);actor.el.focus({preventScroll:true});
    },
    setReducedMotion(value){reducedMotion=Boolean(value);scene.dataset.motion=reducedMotion?'reduced':'full';for(const a of actors)draw(a);},
    destroy(){
      if(disposed)return;const wasRunning=running;disposed=true;running=false;
      clearInterval(heartbeat);cancelAnimationFrame(frame);for(const id of timers)clearTimeout(id);
      document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',pageHide);
      if(wasRunning||current)void request('POND_CLOSE').catch(()=>{});
    }
  };
}
