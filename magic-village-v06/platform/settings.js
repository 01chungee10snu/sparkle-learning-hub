/** Family labels stay on this device. All returned labels are plain text, never HTML. */
export const SETTINGS_KEY='sparkle-public-village-family-settings-v06';
const learners=['tae','se'];
const defaults=()=>({tae:{place:'우리 학교'},se:{place:'우리 어린이집'}});
const clone=value=>({tae:{place:value.tae.place},se:{place:value.se.place}});
let memory=defaults(),loaded=false,available=true;

export function validateSettings(raw){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('가족 이야기 설정을 확인해 주세요.');
 const next=defaults();
 for(const who of learners){
  const item=Object.hasOwn(raw,who)?raw[who]:null;
  if(!item||typeof item!=='object'||Array.isArray(item)||!Object.hasOwn(item,'place')||typeof item.place!=='string')throw new Error('두 아이의 장소 이름을 모두 적어 주세요.');
  const place=item.place.trim();
  if(!place||Array.from(place).length>48||/[\u0000-\u001f\u007f-\u009f<>&]/u.test(item.place))throw new Error('장소 이름은 특수 기호 < > & 없이 1~48자로 적어 주세요.');
  next[who]={place};
 }
 return next;
}

function load(){
 if(loaded)return;
 loaded=true;
 let stored;
 try{stored=globalThis.localStorage.getItem(SETTINGS_KEY);available=true;}
 catch{available=false;return;}
 if(stored)try{memory=validateSettings(JSON.parse(stored));}catch{/* Keep safe defaults for an invalid stored value. */}
}

export function getSettings(){load();return clone(memory);}

/** Validation is atomic. A blocked store still keeps valid settings until the page closes. */
export function saveSettings(raw){
 const next=validateSettings(raw);
 try{globalThis.localStorage.setItem(SETTINGS_KEY,JSON.stringify(next));available=true;}
 catch{available=false;}
 memory=next;loaded=true;
 return clone(memory);
}

export function storageAvailable(){load();return available;}

/** Callers must use textContent or escape the complete result before inserting HTML. */
export function personalize(text,who,name){
 if(!learners.includes(who))throw new Error('아이를 선택해 주세요.');
 const values={place:getSettings()[who].place,name:typeof name==='string'?name:(who==='tae'?'태희':'세희')};
 return String(text??'').replace(/\{\{(place|name)\}\}/g,(_,key)=>values[key]);
}

function decodeSetup(encoded){
 if(!encoded||encoded.length>4096||!/^[A-Za-z0-9_-]+$/.test(encoded)||encoded.length%4===1)throw new Error('Invalid setup encoding');
 const base64=encoded.replace(/-/g,'+').replace(/_/g,'/');
 const binary=globalThis.atob(base64+'='.repeat((4-base64.length%4)%4));
 const bytes=Uint8Array.from(binary,char=>char.charCodeAt(0));
 const raw=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||raw.version!==1||!raw.places||typeof raw.places!=='object'||Array.isArray(raw.places)||!Object.hasOwn(raw.places,'tae')||!Object.hasOwn(raw.places,'se'))throw new Error('Invalid setup format');
 return validateSettings({tae:{place:raw.places.tae},se:{place:raw.places.se}});
}

/**
 * Import a #family=<base64url UTF-8 JSON> link without a request.
 * The fragment is removed before decoding, including invalid setup links.
 * Return null for no setup / success, or a user-facing error string.
 */
export function consumeSetupFragment(location=globalThis.location,history=globalThis.history){
 const hash=location?.hash||'';
 if(hash!=='#family'&&!hash.startsWith('#family='))return null;
 try{history.replaceState(history.state,'',`${location.pathname}${location.search||''}`);}
 catch{return '설정 주소를 정리하지 못했어요. 주소의 # 뒤를 지운 뒤 다시 열어 주세요.';}
 try{saveSettings(decodeSetup(hash.slice('#family='.length)));return null;}
 catch{return '가족 설정 링크를 읽지 못했어요. 기존 설정은 그대로 두었어요.';}
}
