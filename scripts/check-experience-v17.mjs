import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createExperienceController} from '../village/experience-controller-v14.js';

const html=readFileSync(new URL('../village/index.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../village/village-ui.js',import.meta.url),'utf8');
const entry=readFileSync(new URL('../village/entry-v17.js',import.meta.url),'utf8');
assert.match(html,/src="\.\/entry-v17\.js/);
assert.match(html,/navigation-v15\.css/);
for(const pattern of [/createExperienceController\(/,/experience\.open\(\)/,/experience\.close\(\)/,/focusFallback:/])
  assert.match(ui,pattern);
assert.match(entry,/BUILD_VERSION = 'connected-v17-20261014'/);
assert.match(entry,/await orphan\.Quit\(\)/);
assert.match(entry,/retryBlocked = true/);
assert.match(entry,/productVersion:'0\.17\.0-connected-v17'/);

class Target {
  constructor(){this.events=new Map();this.hidden=false;this.disabled=false;this.isConnected=true;this.tabIndex=0;this.hiddenAncestor=false;this.inertAncestor=false;}
  addEventListener(name,callback){this.events.set(name,callback);}
  removeEventListener(name){this.events.delete(name);}
  dispatch(name,event={}){this.events.get(name)?.(event);}
  focus(){doc.activeElement=this;}
  closest(selector){return selector==='[hidden]'&&this.hiddenAncestor?this:selector==='[inert]'&&this.inertAncestor?this:null;}
  getClientRects(){return this.hiddenAncestor?[]:[1];}
  querySelector(){return trigger;}
  querySelectorAll(){return [first,last];}
}
const doc=new Target(),trigger=new Target(),root=new Target(),dialog=new Target(),title=new Target(),exit=new Target();
const first=new Target(),last=new Target(),fallback=new Target();
root.ownerDocument=doc;doc.activeElement=trigger;dialog.hidden=true;
const controls=new Target(),help=new Target(),shortcuts=new Target();
const messages=[];let cancelled=0;
const ctl=createExperienceController({root,dialog,title,exit,controls,help,shortcuts,
  sendToUnity:value=>messages.push(value),focusFallback:()=>fallback,
  onCancel:()=>{cancelled++;ctl.close();}});
ctl.open();
assert.equal(dialog.hidden,false);assert.equal(doc.activeElement,title);
assert.equal(controls.hidden,true);assert.equal(messages.at(-1),'PAUSE_EXPLORE');
const event=(key,shiftKey=false)=>({key,shiftKey,defaultPrevented:false,
  preventDefault(){this.defaultPrevented=true;},stopPropagation(){}});
last.focus();let ev=event('Tab');root.dispatch('keydown',ev);
assert.equal(doc.activeElement,first);assert(ev.defaultPrevented);
ev=event('Tab',true);root.dispatch('keydown',ev);assert.equal(doc.activeElement,last);
root.dispatch('keydown',event('Escape'));
assert.equal(cancelled,1);assert(dialog.hidden);assert.equal(doc.activeElement,trigger);
doc.hidden=true;doc.dispatch('visibilitychange');assert.equal(messages.at(-1),'APP_PAUSE');
doc.hidden=false;doc.dispatch('visibilitychange');assert.equal(messages.at(-1),'APP_RESUME');
assert.equal(cancelled,1,'Background changes must not cancel a question');
ctl.open();doc.hidden=true;doc.dispatch('visibilitychange');doc.hidden=false;doc.dispatch('visibilitychange');
assert.equal(dialog.hidden,false,'Open learning panel must survive a visibility cycle');
trigger.hiddenAncestor=true;ctl.close();assert.equal(doc.activeElement,fallback,'Hidden original trigger must fall back to the visible navigation dock');
trigger.hiddenAncestor=false;doc.activeElement=trigger;ctl.open();trigger.inertAncestor=true;ctl.close();
assert.equal(doc.activeElement,fallback,'Inert old controls must not receive focus');
ctl.destroy();assert.equal(root.events.size,0);
console.log('PASS v17 modal focus, Tab/Shift+Tab, Escape, visibility preservation, visible dock fallback and current entry integration');
