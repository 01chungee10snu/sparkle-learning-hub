// Korean-time seasons and lighting; never infer the visitor's locale or location.
// Fixed clock bands are an artistic game schedule, not official astronomical
// sunrise/sunset forecasts.
const KST_OFFSET_MS=9*60*60*1000;
const SEASONS=Object.freeze({
 spring:Object.freeze({name:'봄',emoji:'🌸',description:'벚꽃이 피고 새싹이 돋아나는 계절'}),
 summer:Object.freeze({name:'여름',emoji:'🌿',description:'푸른 잎과 반짝이는 바다의 계절'}),
 autumn:Object.freeze({name:'가을',emoji:'🍁',description:'황금빛 숲과 단풍의 계절'}),
 winter:Object.freeze({name:'겨울',emoji:'❄️',description:'눈꽃과 별빛이 빛나는 계절'})
});
const DAYPARTS=Object.freeze({
 sunrise:Object.freeze({name:'일출',emoji:'🌅',description:'황금빛 아침 햇살'}),
 noon:Object.freeze({name:'낮',emoji:'☀️',description:'파란 하늘과 밝은 햇살'}),
 sunset:Object.freeze({name:'일몰',emoji:'🌇',description:'주황빛 석양과 분홍 구름'}),
 night:Object.freeze({name:'밤',emoji:'🌙',description:'달과 은은한 별빛'})
});
export {SEASONS,DAYPARTS};
export function koreaScene(at=Date.now()){
 const timestamp=at instanceof Date?at.getTime():Number(at);
 if(!Number.isFinite(timestamp))throw new TypeError('현재 시간을 확인해 주세요.');
 const kst=new Date(timestamp+KST_OFFSET_MS);
 const year=kst.getUTCFullYear(),month=kst.getUTCMonth()+1,
       day=kst.getUTCDate(),hour=kst.getUTCHours(),minute=kst.getUTCMinutes();
 const season=month>=3&&month<=5?'spring':month>=6&&month<=8?'summer':month>=9&&month<=11?'autumn':'winter';
 const daypart=hour>=5&&hour<9?'sunrise':hour>=9&&hour<17?'noon':hour>=17&&hour<20?'sunset':'night';
 return Object.freeze({year,month,day,hour,minute,season,daypart,
   seasonLabel:SEASONS[season].name,timeLabel:DAYPARTS[daypart].name,
   displayClock:`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}`,
   displayDate:`${year}.${String(month).padStart(2,'0')}.${String(day).padStart(2,'0')}`,
   signature:season+':'+daypart});
}
export function applyKoreaScene(scene=koreaScene(),target=globalThis.document?.documentElement){
 if(!target)return scene;
 target.dataset.season=scene.season;target.dataset.daypart=scene.daypart;
 const label=target.ownerDocument?.querySelector('#world-kst-badge');
 if(label)label.textContent=`${SEASONS[scene.season].emoji} ${scene.seasonLabel} · ${DAYPARTS[scene.daypart].emoji} ${scene.timeLabel} ${scene.displayClock} KST`;
 return scene;
}
