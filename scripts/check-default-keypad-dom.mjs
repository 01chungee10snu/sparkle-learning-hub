// DOM event regression; does not claim browser layout or physical device coverage.
import assert from 'node:assert/strict';
const {JSDOM}=await import(process.env.JSDOM_MODULE||'jsdom');
for(const portal of ['', 'magic-village-kma-v06/', 'magic-village-v06/'])for(const touch of [true,false]){
 const dom=new JSDOM('<div id="root"></div>');
 globalThis.window=dom.window;globalThis.document=window.document;globalThis.Event=window.Event;
 window.matchMedia=()=>({matches:touch});
 const {createVillageUI}=await import('../'+portal+'village/village-ui.js');
 const root=document.querySelector('#root'),messages=[];
 const ui=createVillageUI({root,sendToUnity:()=>{},sendRequest:m=>messages.push(m)});
 const question=(min=0,max=100)=>ui.update({action:'START',ok:true,who:'tae',question:{gameId:'test',interactionType:'numeric',numericMin:min,numericMax:max,index:1,total:25}});
 const tap=k=>root.querySelector(`[data-key="${k}"]`).click();
 question();let input=root.querySelector('input');assert.equal(input.readOnly,touch);
 const check=()=>root.querySelector('.vh-number-submit');assert(check().disabled);
 tap('1');tap('2');assert.equal(input.value,'12');tap('back');assert.equal(input.value,'1');tap('clear');assert.equal(input.value,'');
 tap('0');assert(!check().disabled);tap('clear');tap('9');tap('9');tap('9');assert(check().disabled);
 tap('clear');tap('4');tap('2');check().click();check().click();await Promise.resolve();await Promise.resolve();
 assert.equal(messages.length,1);assert.equal(JSON.parse(messages[0].response),'42');
 ui.update({action:'SUBMIT',ok:true,correct:true,earned:4});assert.equal(root.querySelectorAll('.vh-number-submit').length,0);
 question(-200,100);input=root.querySelector('input');root.querySelector('.vh-number-sign').click();tap('1');tap('2');assert.equal(input.value,'-12');
 if(touch)root.querySelector('.vh-numeric-native').click();assert.equal(input.readOnly,false);
 input.value='−１２';input.dispatchEvent(new Event('input'));assert.equal(input.value,'-12');
 input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await Promise.resolve();await Promise.resolve();assert.equal(messages.length,2);
 question();assert.equal(root.querySelectorAll('.vh-number-submit').length,1);
 ui.close();assert(root.querySelector('#village-dialog-wrap').hidden);
 dom.window.close();
}
console.log('PASS: 3 portals × touch/desktop DOM input, zero, range, delete, clear, duplicate submission, negative/fullwidth, Enter, footer cleanup and cancel');
