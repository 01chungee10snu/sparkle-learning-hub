import * as THREE from '../vendor/three.module.min.js';
import {GLTFLoader} from '../vendor/GLTFLoader-v41.js';

/**
 * An independent, read-only Blender world renderer.
 * Never reads or writes learning records. Existing Unity remains the game host.
 */
const TITLES=Object.freeze({
 math:'수학 정원', korean:'이야기 도서관', english:'영어학교', hanja:'한자 수련관',
 kma:'경시대회 성', practice:'마법 연습장', academy:'마법학교', growth:'성장의 탑',
 pond:'생명 연못', ocean:'푸른 바다', career:'미래 직업 탐색관',
 garden:'나의 정원',plaza:'가족 광장'
});
const HIGHLIGHT=['math','korean','english','academy','pond'];
const MAX_PIXEL_RATIO=1.5;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const blenderDestinations=Object.freeze(TITLES);
export async function mountBlenderWorld(host,{
 modelUrl,mode='entry',onDestination=()=>{},autoAnimate=true
}={}){
 if(!(host instanceof HTMLElement)||typeof modelUrl!=='string'||!/^\.\.?\/assets\/blender-v41\/sparkle-magic-world-v41\.glb$/.test(modelUrl))
   throw new TypeError('Invalid Blender world host or model path');
 const canvas=document.createElement('canvas');
 canvas.className='blender-v41-canvas';canvas.tabIndex=0;
 canvas.setAttribute('aria-label','입체 마법마을: 좌우로 움직여 둘러보고 장소를 선택하세요');
 host.append(canvas);
 const labelLayer=document.createElement('div');
 labelLayer.className='blender-v41-labels';host.append(labelLayer);
 const hints=document.createElement('p');hints.className='blender-v41-hints';
 hints.textContent='손가락으로 회전 · 반짝이는 건물을 눌러 선택';
 host.append(hints);
 let renderer,root,mixer,scene,camera,clock,sunlight,hemilight,active=true,raf=0,resizeObserver;
 let yaw=0,targetYaw=0,dragging=false,dragStart=0,pointerStart=null,loaded=false;
 const poiMap=new Map(),markers=new Map(),raycaster=new THREE.Raycaster();
 const pointer=new THREE.Vector2(),worldPoint=new THREE.Vector3();
 const worldBox=new THREE.Box3();
 const isReduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const now=()=>performance.now();
 try{
   renderer=new THREE.WebGLRenderer({canvas,alpha:false,antialias:true,powerPreference:'low-power'});
   renderer.setPixelRatio(Math.min(MAX_PIXEL_RATIO,window.devicePixelRatio||1));
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   renderer.toneMapping=THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure=.86;
   // Soft shadows are progressive: disable on phones to protect GPU/memory.
   const softShadows=false; // Shadow-map bands observed in QA; enable only after GPU QA.
   renderer.shadowMap.enabled=softShadows;
   renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   scene=new THREE.Scene();
   scene.background=new THREE.Color(0x95cbd8);
   scene.fog=new THREE.Fog(0xa7d0d8,90,180);
   hemilight=new THREE.HemisphereLight(0xf1f8ff,0x91b49b,1.15);
   scene.add(hemilight);
   sunlight=new THREE.DirectionalLight(0xffe6bb,1.9);
   sunlight.position.set(24,37,30);
   sunlight.castShadow=softShadows;
   if(softShadows){
     sunlight.shadow.mapSize.set(1024,1024);
     sunlight.shadow.camera.left=-30;sunlight.shadow.camera.right=30;
     sunlight.shadow.camera.top=30;sunlight.shadow.camera.bottom=-30;
     sunlight.shadow.camera.near=2;sunlight.shadow.camera.far=140;
     sunlight.shadow.bias=-.0004;
   }
   scene.add(sunlight);
   const bounce=new THREE.DirectionalLight(0xaad8ff,.5);
   bounce.position.set(-18,24,-28);scene.add(bounce);
   camera=new THREE.PerspectiveCamera(34,1,.2,250);
   camera.position.set(29,33,34);camera.lookAt(0,0,0);
   clock=new THREE.Clock();
   const gltf=await new Promise((resolve,reject)=>
     new GLTFLoader().load(modelUrl,resolve,undefined,reject));
   if(!host.isConnected)throw new Error('World container detached');
   root=gltf.scene;scene.add(root);
   if(softShadows)root.traverse(obj=>{
     if(obj.isMesh&&!obj.name.startsWith('PICK_')){
       obj.castShadow=true;obj.receiveShadow=true;
     }
   });
   root.traverse(obj=>{
     if(obj.name.startsWith('POI_')&&Object.hasOwn(TITLES,obj.name.slice(4)))
       poiMap.set(obj.name.slice(4),obj);
   });
   if(poiMap.size<11)throw new Error('Missing Blender village destinations');
   worldBox.setFromObject(root);
   mixer=new THREE.AnimationMixer(root);
   for(const animation of gltf.animations){
     if(animation.tracks.length)mixer.clipAction(animation).setLoop(THREE.LoopRepeat).play();
   }
   for(const id of HIGHLIGHT){
     if(!poiMap.has(id))continue;
     const btn=document.createElement('button');btn.type='button';
     btn.className='blender-v41-marker';btn.dataset.destination=id;
     btn.textContent=TITLES[id];btn.setAttribute('aria-label',TITLES[id]+' 바로가기');
     btn.addEventListener('click',()=>onDestination(id));
     labelLayer.append(btn);markers.set(id,btn);
   }
   loaded=true;host.dataset.blenderReady='true';
 }catch(error){
   host.dataset.blenderReady='false';
   try{renderer?.dispose();}catch{}
   host.replaceChildren();
   throw error;
 }

 const pickers=[];
 root.traverse(node=>{if(node.isMesh&&node.name.startsWith('PICK_'))pickers.push(node);});
 function resize(){
   if(!renderer||!host.isConnected)return;
   const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
   renderer.setSize(width,height,false);
   camera.aspect=width/height;
   camera.fov=width<450?35:33;
   camera.updateProjectionMatrix();
 }
 resize();
 resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
 function highlight(id){
   for(const [key,marker] of markers)
     marker.dataset.selected=String(key===id);
 }
 function selectAt(clientX,clientY){
   const rect=canvas.getBoundingClientRect();
   const x=clientX-rect.left,y=clientY-rect.top;
   pointer.set((x/rect.width)*2-1,-(y/rect.height)*2+1);
   raycaster.setFromCamera(pointer,camera);
   scene.updateMatrixWorld(true);
   const hits=raycaster.intersectObjects(pickers,false);
   if(hits.length){
     let obj=hits[0].object;
     while(obj){
       if(obj.name.startsWith('POI_')){
         const id=obj.name.slice(4);
         if(Object.hasOwn(TITLES,id)){highlight(id);onDestination(id);return;}
       }
       obj=obj.parent;
     }
   }
   // A gesture's nearby label can also be selected without tiny hit targets.
   let nearest=null,dist=Infinity;
   for(const [id,marker] of markers){
     const box=marker.getBoundingClientRect();
     const dx=clientX-(box.left+box.width/2),dy=clientY-(box.top+box.height/2);
     const d=Math.hypot(dx,dy);
     if(d<dist){dist=d;nearest=id;}
   }
   if(dist<48&&nearest){highlight(nearest);onDestination(nearest);}
 }
 let downPoint=null,lastTime=0;
 const down=event=>{
   if(event.button!==0&&event.pointerType==='mouse')return;
   downPoint={x:event.clientX,y:event.clientY,yaw:targetYaw};
   dragging=false;
   canvas.setPointerCapture?.(event.pointerId);
 };
 const move=event=>{
   if(!downPoint)return;
   const dx=event.clientX-downPoint.x;
   if(Math.abs(dx)>7)dragging=true;
   if(dragging)targetYaw=clamp(downPoint.yaw+dx*.006,-.8,.8);
 };
 const up=event=>{
   if(!downPoint)return;
   const shouldSelect=!dragging;
   downPoint=null;dragging=false;
   if(shouldSelect)selectAt(event.clientX,event.clientY);
 };
 const keyboard=event=>{
   if(event.key==='ArrowLeft'||event.key==='ArrowRight'){
     targetYaw=clamp(targetYaw+(event.key==='ArrowLeft'?.22:-.22),-.8,.8);
     event.preventDefault();
   }else if(event.key==='Enter'||event.key===' '){
     highlight('math');onDestination('math');event.preventDefault();
   }
 };
 canvas.addEventListener('pointerdown',down);
 canvas.addEventListener('pointermove',move);
 canvas.addEventListener('pointerup',up);
 canvas.addEventListener('pointercancel',()=>{downPoint=null;});
 canvas.addEventListener('keydown',keyboard);
 function positionLabels(){
   // Fixed, horizontally scrollable buttons prevent labels from overlapping.
   if(mode==='entry'||mode==='map')return;
   const rect=canvas.getBoundingClientRect();
   const width=rect.width,height=rect.height;
   if(!width||!height)return;
   for(const [id,btn] of markers){
     const marker=poiMap.get(id);
     if(!marker)continue;
     marker.getWorldPosition(worldPoint);
     worldPoint.y+=5;
     worldPoint.project(camera);
     const px=(worldPoint.x+1)/2*width;
     const py=(1-worldPoint.y)/2*height;
     btn.style.left=px+'px';btn.style.top=py+'px';
     btn.hidden=worldPoint.z>1||worldPoint.z<0||px<-15||px>width+15||py<0||py>height;
   }
 }
 let lastEnv='';
 function syncEnvironment(){
   const daypart=document.documentElement.dataset.daypart||'noon';
   if(daypart===lastEnv)return;
   lastEnv=daypart;
   const options={
     sunrise:[0xc9c8d5,0xffd3b6,1.4,.78],
     noon:[0x95cbd8,0xffe6bb,1.9,.86],
     sunset:[0xdba7ae,0xffb78e,1.45,.80],
     night:[0x2d5273,0xa5c2f4,.85,.98]
   };
   const [background,light,intensity,exposure]=options[daypart]||options.noon;
   scene.background.setHex(background);
   scene.fog.color.setHex(background);
   sunlight.color.setHex(light);
   sunlight.intensity=intensity;
   hemilight.intensity=daypart==='night'?.75:1.15;
   renderer.toneMappingExposure=exposure;
 }
 syncEnvironment();
 let lastFrame=0;
 function tick(t){
   if(!active||!renderer)return;
   raf=requestAnimationFrame(tick);
   const interval=(window.innerWidth<700?33:16);
   if(t-lastFrame<interval)return;lastFrame=t;
   syncEnvironment();
   const dt=Math.min(clock.getDelta(),.05);
   if(mixer&&!isReduced&&autoAnimate)mixer.update(dt);
   yaw+=(targetYaw-yaw)*.12;
   root.rotation.y=yaw;
   if(!isReduced&&!downPoint)root.rotation.y+=Math.sin(t*.00033)*.02;
   renderer.render(scene,camera);
   positionLabels();
 }
 raf=requestAnimationFrame(tick);
 function setActive(value){
   if(!renderer)return;
   if(value===active)return;
   active=Boolean(value);
   if(active){clock.start();raf=requestAnimationFrame(tick);}
   else{cancelAnimationFrame(raf);clock.stop();}
 }
 const visibility=()=>setActive(!document.hidden);
 document.addEventListener('visibilitychange',visibility);
 function destroy(){
   active=false;cancelAnimationFrame(raf);
   document.removeEventListener('visibilitychange',visibility);
   canvas.removeEventListener('pointerdown',down);
   canvas.removeEventListener('pointermove',move);
   canvas.removeEventListener('pointerup',up);
   canvas.removeEventListener('keydown',keyboard);
   resizeObserver?.disconnect();
   scene?.traverse(node=>{
     if(node.isMesh){
       // Scene resources are from this one GLB viewer; glTF cache is not global.
       node.geometry?.dispose();
       for(const material of Array.isArray(node.material)?node.material:[node.material]){
         if(material){for(const value of Object.values(material))if(value?.isTexture)value.dispose();material.dispose();}
       }
     }
   });
   renderer?.dispose();
   canvas.remove();labelLayer.remove();hints.remove();
 }
 return {setActive,destroy,get destinations(){return [...poiMap.keys()];},get animations(){return mixer?mixer._actions.length:0;}};
}
