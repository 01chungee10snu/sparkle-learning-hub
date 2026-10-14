// Child-friendly, offline-first life play. No clock-based decay or quiz rewards.
export const LIFE_CROPS = Object.freeze({
  carrot: Object.freeze({title:'당근',emoji:'🥕',steps:3}),
  strawberry: Object.freeze({title:'딸기',emoji:'🍓',steps:3}),
  tomato: Object.freeze({title:'토마토',emoji:'🍅',steps:3})
});
export const LIFE_FISH = Object.freeze({
  goldfish:Object.freeze({title:'금붕어',emoji:'🐠'}),
  guppy:Object.freeze({title:'구피',emoji:'🐟'})
});
export const LIFE_PETS = Object.freeze({
  rabbit:Object.freeze({title:'토끼',emoji:'🐰'}),
  hamster:Object.freeze({title:'햄스터',emoji:'🐹'})
});
export const LIFE_ACTIONS = Object.freeze([
  'PLANT','CARE_PLANT','HARVEST','ADOPT_FISH','CARE_FISH','ADOPT_PET','CARE_PET','RENAME','DECORATE'
]);
const OWNERS=['tae','se','family'];
const PLANT_CARE=['water','sun','tend'];
const FISH_CARE=['feed','clean','observe'];
const PET_CARE=['feed','play','rest'];
const DECOR={pond:['lily','stones','reeds'],pets:['meadow','flowers','cozy']};
const MAX_COUNT=1000000;
const fail=(text)=>{throw new Error(text);};
const has=(o,k)=>Object.hasOwn(o,k);
const int=(x,min=0,max=MAX_COUNT)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
const plain=(x)=>x!==null&&typeof x==='object'&&!Array.isArray(x)&&Object.getPrototypeOf(x)===Object.prototype;
const exactKeys=(x,keys)=>plain(x)&&Object.keys(x).length===keys.length&&keys.every(k=>has(x,k));
const selectedOwner=(who,area)=>{
  if(!['tae','se'].includes(who)||!['home','plaza'].includes(area))fail('요정과 마을 위치를 확인해 주세요.');
  return area==='plaza'?'family':who;
};
const blank=()=>({revision:0,plots:[],harvest:{carrot:0,strawberry:0,tomato:0},fish:[],pets:[],decor:{pond:'lily',pets:'meadow'}});
const safeName=(value)=>{
  if(typeof value!=='string')fail('이름을 확인해 주세요.');
  const name=value.trim();
  if(!name||/[\p{Cc}\p{Cf}<>\\&]/u.test(name))fail('사용할 수 없는 이름이에요.');
  const length=typeof Intl.Segmenter==='function'
    ?[...new Intl.Segmenter('ko',{granularity:'grapheme'}).segment(name)].length
    :Array.from(name).length;
  if(length>12)fail('이름은 12글자까지 지을 수 있어요.');
  return name;
};
const validAnimal=(x,catalog,measure)=>{
  if(!exactKeys(x,['id','species','name',measure,'careStep'])||!int(x.id,1)||!has(catalog,x.species)||typeof x.name!=='string'||!int(x[measure],0,3)||!int(x.careStep)||x.careStep< x[measure])return false;
  try{return safeName(x.name)===x.name;}catch{return false;}
};
const validState=(s)=>{
  if(!exactKeys(s,['revision','plots','harvest','fish','pets','decor'])||!int(s.revision)||!Array.isArray(s.plots)||s.plots.length>6||!plain(s.harvest)||!plain(s.decor)||!Array.isArray(s.fish)||s.fish.length>3||!Array.isArray(s.pets)||s.pets.length>2)return false;
  if(!Object.keys(LIFE_CROPS).every(k=>int(s.harvest[k]))||Object.keys(s.harvest).length!==3||!Object.keys(DECOR).every(k=>DECOR[k].includes(s.decor[k]))||Object.keys(s.decor).length!==2)return false;
  const slots=new Set(),ids=new Set();
  for(const p of s.plots){
    if(!exactKeys(p,['slot','species','stage','cycle'])||!int(p.slot,0,5)||slots.has(p.slot)||!has(LIFE_CROPS,p.species)||!int(p.stage,0,3)||!int(p.cycle))return false;
    slots.add(p.slot);
  }
  for(const a of s.fish){
    if(!validAnimal(a,LIFE_FISH,'growth')||ids.has(a.id))return false;
    ids.add(a.id);
  }
  for(const a of s.pets){
    if(!validAnimal(a,LIFE_PETS,'bond')||ids.has(a.id))return false;
    ids.add(a.id);
  }
  return true;
};
const validateRoot=(root)=>{
  if(!plain(root)||root.version!==16||!OWNERS.every(k=>validState(root[k]))||Object.keys(root).length!==4)fail('저장된 마을 정보가 올바르지 않아요. 기존 기록을 보존했어요.');
};
const canonical=(who,area,s)=>({...structuredClone(s),who,area});
export function createLifeStore({storage,namespace='/'}={}){
  if(typeof namespace!=='string'||namespace.length>512)fail('저장 위치가 올바르지 않아요.');
  const key='sparkle-life-v16:'+namespace;
  // Resolve storage on use so module imports work in Node and SSR.
  const store=()=>{try{
    const target=storage===undefined?globalThis.localStorage:storage;
    if(!target||typeof target.getItem!=='function'||typeof target.setItem!=='function')throw Error();
    return target;
  }catch{fail('마을 저장 공간에 접근하지 못했어요.');}};
  const load=()=>{
    let raw;
    try{raw=store().getItem(key);}catch{fail('마을 기록을 읽지 못했어요.');}
    if(raw===null)return {version:16,tae:blank(),se:blank(),family:blank()};
    let data;
    try{data=JSON.parse(raw);}catch{fail('저장된 마을 정보가 손상되었어요. 기존 기록을 보존했어요.');}
    validateRoot(data);
    return data;
  };
  return Object.freeze({
    snapshot(who,area='home'){
      const owner=selectedOwner(who,area);
      return canonical(who,area,load()[owner]);
    },
    dispatch(action){
      if(!plain(action))fail('놀이 요청을 확인해 주세요.');
      const {who,area='home',type,expectedRevision}=action;
      const owner=selectedOwner(who,area);
      const root=load(),s=root[owner];
      if(!int(expectedRevision)||expectedRevision!==s.revision)fail('마을이 이미 변경되었어요. 새 화면을 확인해 주세요.');
      if(!LIFE_ACTIONS.includes(type))fail('놀이 종류를 확인해 주세요.');
      const {slot,species,care,id,expectedStage,expectedCycle,expectedStep,kind,value}=action;
      let message='';
      if(type==='PLANT'){
        if(!int(slot,0,5)||!has(LIFE_CROPS,species)||s.plots.some(p=>p.slot===slot))fail('씨앗이나 빈 밭을 확인해 주세요.');
        s.plots.push({slot,species,stage:0,cycle:0});
        s.plots.sort((a,b)=>a.slot-b.slot);
        message=LIFE_CROPS[species].title+' 씨앗을 심었어요!';
      }else if(type==='CARE_PLANT'||type==='HARVEST'){
        const p=s.plots.find(x=>x.slot===slot);
        if(!p||!int(expectedCycle)||p.cycle!==expectedCycle)fail('밭이 변경되었어요. 다시 확인해 주세요.');
        if(type==='CARE_PLANT'){
          if(p.stage===3||expectedStage!==p.stage||care!==PLANT_CARE[p.stage])fail('지금 필요한 식물 돌봄을 확인해 주세요.');
          p.stage++;
          message=p.stage===3?'수확할 만큼 자랐어요!':'새싹이 자랐어요!';
        }else{
          if(p.stage!==3||s.harvest[p.species]>=MAX_COUNT||p.cycle>=MAX_COUNT)fail('수확할 수 있는 열매를 확인해 주세요.');
          s.harvest[p.species]++;
          p.stage=0;p.cycle++;
          message=LIFE_CROPS[p.species].title+'을 수확했어요!';
        }
      }else if(type==='ADOPT_FISH'||type==='ADOPT_PET'){
        const fish=type==='ADOPT_FISH',list=fish?s.fish:s.pets,catalog=fish?LIFE_FISH:LIFE_PETS;
        if(!has(catalog,species)||list.length>=(fish?3:2))fail('친구를 초대할 공간이 부족해요.');
        const ids=[...s.fish,...s.pets].map(x=>x.id);
        const next=Math.max(0,...ids)+1;
        if(!int(next,1))fail('새 친구를 등록할 수 없어요.');
        list.push({id:next,species,name:catalog[species].title,...(fish?{growth:0}:{bond:0}),careStep:0});
        message=catalog[species].title+' 친구가 왔어요!';
      }else if(type==='CARE_FISH'||type==='CARE_PET'){
        const fish=type==='CARE_FISH',a=(fish?s.fish:s.pets).find(x=>x.id===id);
        const seq=fish?FISH_CARE:PET_CARE,measure=fish?'growth':'bond';
        if(!a||!int(expectedStep)||a.careStep!==expectedStep||care!==seq[a.careStep%3]||a.careStep>=MAX_COUNT)fail('친구의 돌봄 순서를 다시 확인해 주세요.');
        a.careStep++;a[measure]=Math.min(3,a[measure]+1);
        message='친구와 즐겁게 시간을 보냈어요!';
      }else if(type==='RENAME'){
        if(!['fish','pet'].includes(kind))fail('이름을 붙일 친구를 확인해 주세요.');
        const a=(kind==='fish'?s.fish:s.pets).find(x=>x.id===id);
        if(!a)fail('이름을 붙일 친구를 확인해 주세요.');
        a.name=safeName(action.name);message='새 이름으로 불러 줄게요!';
      }else if(type==='DECORATE'){
        if(!has(DECOR,kind)||!DECOR[kind].includes(value))fail('꾸미기 장식을 확인해 주세요.');
        s.decor[kind]=value;message='마을이 더 예뻐졌어요!';
      }
      if(s.revision>=MAX_COUNT)fail('마을 기록의 변경 한도를 확인해 주세요.');
      s.revision++;
      validateRoot(root);
      try{store().setItem(key,JSON.stringify(root));}catch{fail('마을 기록을 저장하지 못했어요. 다시 시도해 주세요.');}
      return {snapshot:canonical(who,area,s),message};
    }
  });
}
