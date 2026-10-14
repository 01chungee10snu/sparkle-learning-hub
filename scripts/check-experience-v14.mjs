import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createExperienceController} from '../village/experience-controller-v14.js';

const html=readFileSync(new URL('../village/index.html',import.meta.url),'utf8');
const ui=readFileSync(new URL('../village/village-ui.js',import.meta.url),'utf8');
const entry=readFileSync(new URL('../village/entry-v14.js',import.meta.url),'utf8');
assert.match(html,/src="\.\/entry-v14\.js/);
assert.match(html,/production-v14\.css/);
assert.match(ui,/createExperienceController\(/);
assert.match(ui,/experience\.open\(\)/);
assert.match(ui,/experience\.close\(\)/);
assert.match(entry,/BUILD_VERSION = 'production-v14-20261014'/);
assert.match(entry,/await orphan\.Quit\(\)/);
assert.match(entry,/if\(cleanupFailure\)start\.disabled=true/);
assert.match(entry,/productVersion: '0\.14\.0-production-v14'/);
const css=readFileSync(new URL('../village/production-v14.css',import.meta.url),'utf8');
assert.match(css,/#village-dialog-wrap \.vh-dialog \{width:100%;max-width:100%/);
assert.match(css,/font-size:16px!important/);
assert.match(css,/font-size:14px!important/);

class Target {
  constructor(){this.events=new Map();this.hidden=false;this.disabled=false;this.isConnected=true;this.tabIndex=0;}
  addEventListener(name,cb){this.events.set(name,cb);}
  removeEventListener(name){this.events.delete(name);}
  dispatch(name,event={}){this.events.get(name)?.(event);}
  focus(){doc.activeElement=this;}
  closest(selector){return selector==='[hidden]'?null:null;}
  getClientRects(){return [1];}
  querySelector(){return trigger;}
  querySelectorAll(){return [first,last];}
}
const doc=new Target(),trigger=new Target(),root=new Target(),dialog=new Target(),title=new Target(),exit=new Target(),first=new Target(),last=new Target();
root.ownerDocument=doc;doc.activeElement=trigger;dialog.hidden=true;
const controls=new Target(),help=new Target(),shortcuts=new Target();
const messages=[];let cancelled=0;
const ctl=createExperienceController({root,dialog,title,exit,controls,help,shortcuts,sendToUnity:x=>messages.push(x),onCancel:()=>{cancelled++;ctl.close();}});
ctl.open();
assert.equal(dialog.hidden,false);assert.equal(doc.activeElement,title);
assert.equal(controls.hidden,true);assert.equal(messages.at(-1),'PAUSE_EXPLORE');
const event=key=>({key,shiftKey:false,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){}});
last.focus();let ev=event('Tab');root.dispatch('keydown',ev);assert.equal(doc.activeElement,first);assert.equal(ev.defaultPrevented,true);
ev=event('Escape');root.dispatch('keydown',ev);assert.equal(cancelled,1);assert.equal(dialog.hidden,true);assert.equal(doc.activeElement,trigger);
doc.hidden=true;doc.dispatch('visibilitychange');assert.equal(messages.at(-1),'APP_PAUSE');
doc.hidden=false;doc.dispatch('visibilitychange');assert.equal(messages.at(-1),'APP_RESUME');
assert.equal(cancelled,1,'visibility must not cancel the active question');
ctl.open();doc.hidden=true;doc.dispatch('visibilitychange');doc.hidden=false;doc.dispatch('visibilitychange');
assert.equal(dialog.hidden,false,'active modal must survive backgrounding');
assert.equal(messages.at(-1),'APP_RESUME');
ctl.destroy();assert.equal(root.events.size,0);
console.log('PASS v14 modal focus, keyboard, visibility and actual entry integration');
