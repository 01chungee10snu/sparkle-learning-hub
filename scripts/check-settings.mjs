import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const storage=new Map();
let blocked=false,writes=0;
globalThis.localStorage={
 getItem(key){if(blocked)throw new Error('Storage blocked');return storage.get(key)??null;},
 setItem(key,value){if(blocked)throw new Error('Storage blocked');writes++;storage.set(key,String(value));}
};
globalThis.fetch=()=>{throw new Error('Family settings must never make network requests');};
let imports=0;
const fresh=()=>import(`../platform/settings.js?test=${++imports}`);
const valid=()=>({tae:{place:'햇살 학교'},se:{place:'숲속 어린이집'}});
const encode=raw=>Buffer.from(JSON.stringify(raw),'utf8').toString('base64url');
const link=places=>`#family=${encode({version:1,places})}`;
function surface(hash){
 const location={hash,pathname:'/sparkle-learning-hub/',search:'?view=home'};
 const history={state:{view:'home'},calls:[],replaceState(state,title,url){this.calls.push({state,title,url});location.hash='';}};
 return {location,history};
}

const S=await fresh();
assert.deepEqual(S.getSettings(),{tae:{place:'우리 학교'},se:{place:'우리 어린이집'}});
assert.equal(S.storageAvailable(),true);
const saved=S.saveSettings({tae:{place:'  햇살 학교  '},se:{place:'  숲속 어린이집  '}});
assert.deepEqual(saved,valid());
assert.deepEqual(JSON.parse(storage.get(S.SETTINGS_KEY)),valid());
saved.tae.place='변경';const copy=S.getSettings();copy.se.place='변경';
assert.deepEqual(S.getSettings(),valid(),'Returned settings never expose mutable internal state');
assert.deepEqual((await fresh()).getSettings(),valid(),'Settings survive a fresh module/page load');
const validationWrites=writes;
assert.deepEqual(S.validateSettings({tae:{place:' 새 학교 '},se:{place:' 새 어린이집 '}}),{tae:{place:'새 학교'},se:{place:'새 어린이집'}});
assert.equal(writes,validationWrites);assert.deepEqual(S.getSettings(),valid(),'Read-only validation does not update settings');

for(const place of ['', '   ', '가'.repeat(49), '<학교>', '학교&유치원', '학교\n이름', '\t학교', '학교\u0000', '학교\u0085']){
 const before=storage.get(S.SETTINGS_KEY),count=writes;
 assert.throws(()=>S.saveSettings({tae:{place:'새 장소'},se:{place}}));
 assert.deepEqual(S.getSettings(),valid(),'Invalid second learner cannot partially mutate the first learner');
 assert.equal(storage.get(S.SETTINGS_KEY),before);assert.equal(writes,count);
}
for(const raw of [null,[],{}, {tae:{place:12},se:{place:'장소'}}, {tae:{place:'학교'}}])assert.throws(()=>S.saveSettings(raw));
S.saveSettings({tae:{place:'가'.repeat(48)},se:{place:'🌳'.repeat(48)}});
assert.equal(Array.from(S.getSettings().se.place).length,48,'Length is measured as Unicode characters');
S.saveSettings(valid());
assert.equal(S.personalize('{{name}}는 {{place}}에 가요. {{name}}! {{other}}','tae','태희'),'태희는 햇살 학교에 가요. 태희! {{other}}');
assert.equal(S.personalize('{{place}}의 {{name}}','se'),'숲속 어린이집의 세희');
assert.equal(S.personalize('{{name}}','tae','$& $` $\''),'$& $` $\'','Replacement values are literal, without replace-string interpolation');
assert.equal(S.personalize('{{name}}','tae','<b>이름</b>'),'<b>이름</b>','API returns plain text; rendering code must escape it');
assert.throws(()=>S.personalize('{{place}}','unknown','이름'));

let browser=surface(link({tae:'별빛 🌟 학교',se:'나무 🌳 어린이집'}));
assert.equal(S.consumeSetupFragment(browser.location,browser.history),null);
assert.deepEqual(S.getSettings(),{tae:{place:'별빛 🌟 학교'},se:{place:'나무 🌳 어린이집'}});
assert.equal(browser.location.hash,'');
assert.deepEqual(browser.history.calls,[{state:{view:'home'},title:'',url:'/sparkle-learning-hub/?view=home'}]);
const before=S.getSettings();
for(const hash of ['#family','#family=','#family=%','$not-family', '#family=a','#family=!!!!','#family='+Buffer.from([0xff,0xfe]).toString('base64url'), '#family='+encode({version:2,places:{tae:'학교',se:'어린이집'}}),link({tae:'학교',se:'<학교>'}),link({tae:'학교'})]){
 browser=surface(hash);
 const error=S.consumeSetupFragment(browser.location,browser.history);
 if(hash==='$not-family'){assert.equal(error,null);assert.equal(browser.location.hash,hash);assert.equal(browser.history.calls.length,0);}
 else{assert.equal(typeof error,'string');assert.ok(error.length);assert.equal(browser.location.hash,'');assert.equal(browser.history.calls.length,1);}
 assert.deepEqual(S.getSettings(),before,'Malformed setup leaves both previous labels intact');
}
browser=surface(link({tae:'우리 새 학교',se:'우리 새 어린이집'}));
browser.history.replaceState=()=>{throw new Error('History blocked');};
assert.equal(typeof S.consumeSetupFragment(browser.location,browser.history),'string');
assert.deepEqual(S.getSettings(),before,'A setup whose fragment cannot be cleared is not imported');

blocked=true;
const offline=await fresh();
assert.deepEqual(offline.getSettings(),{tae:{place:'우리 학교'},se:{place:'우리 어린이집'}});
assert.equal(offline.storageAvailable(),false);
offline.saveSettings(valid());assert.deepEqual(offline.getSettings(),valid());assert.equal(offline.storageAvailable(),false);
browser=surface(link({tae:'온기 학교',se:'다정 어린이집'}));
assert.equal(offline.consumeSetupFragment(browser.location,browser.history),null);
assert.equal(offline.getSettings().tae.place,'온기 학교');assert.equal(browser.location.hash,'');
blocked=false;
assert.equal(offline.getSettings().tae.place,'온기 학교','A recovered reader must not overwrite unsaved memory with stale storage');
offline.saveSettings(offline.getSettings());assert.equal(offline.storageAvailable(),true);
assert.equal((await fresh()).getSettings().tae.place,'온기 학교');
storage.set(S.SETTINGS_KEY,'{ broken');assert.equal((await fresh()).getSettings().tae.place,'우리 학교');
storage.set(S.SETTINGS_KEY,JSON.stringify({tae:{place:'<script>'},se:{place:'장소'}}));assert.equal((await fresh()).getSettings().se.place,'우리 어린이집');

const source=await readFile(new URL('../platform/settings.js',import.meta.url),'utf8');
assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket)\s*\(/,'No request API in the settings module');
console.log('PASS: family settings validation, atomic updates, Unicode boundaries, plain-text placeholders, UTF-8 setup, fragment removal, no requests, persistence and blocked-storage fallback');
