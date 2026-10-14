import assert from 'node:assert/strict';
import {createCloudSync} from '../village/cloud-sync-v17.js';
if (!globalThis.btoa) globalThis.btoa=s=>Buffer.from(s,'binary').toString('base64');
if (!globalThis.atob) globalThis.atob=s=>Buffer.from(s,'base64').toString('binary');
const blank=n=>({schema:17,learning:{version:1,profiles:{tae:{games:{},stageSelections:{}},se:{games:{},stageSelections:{}}}},life:{version:16,tae:{revision:n},se:{revision:0},family:{revision:0}}});
const table=new Map(),calls=[],statuses=[];
let unavailable=false;
async function fetchImpl(_url,options){
 if(unavailable) throw Error('network unavailable');
 const data=JSON.parse(options.body);calls.push(data);
 assert.match(data.auth,/^[a-f0-9]{64}$/);assert.match(data.familyId,/^[a-f0-9]{64}$/);
 assert(!('code' in data));assert(!('learning' in data));
 const old=table.get(data.familyId)||{version:0,payload:null,auth:data.auth};
 assert.equal(data.auth,old.auth);
 if(data.action==='read')return {status:200,json:async()=>({version:old.version,payload:old.payload})};
 assert.equal(data.action,'write');assert.deepEqual(Object.keys(data.payload).sort(),['ct','iv']);
 if(old.version!==data.expectedVersion)return {status:409,json:async()=>({version:old.version,payload:old.payload})};
 const next={version:old.version+1,payload:data.payload,auth:data.auth};table.set(data.familyId,next);
 return {status:200,json:async()=>({version:next.version,payload:next.payload})};
}
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k),keys:()=>m.keys()};};
function device(n,store=memory()){let local=blank(n);let applied=0;const sync=createCloudSync({endpoint:'https://example.invalid/functions/v1/cloud',namespace:'synthetic',storage:store,fetchImpl,readSnapshot:()=>local,applySnapshot:s=>{local=s;applied++;},mergeSnapshots:({base,local,remote,prefer})=>prefer?(prefer==='remote'?remote:local):null,onStatus:s=>statuses.push(s.state)});return {sync,store,get local(){return local;},set local(v){local=v;},get applied(){return applied;}};}
const a=device(1),code=await a.sync.createFamily();assert.match(code,/^[A-Za-z0-9_-]{43}$/);
assert.equal(a.sync.getStatus().version,1);assert.equal(calls[1].payload.ct.includes('revision'),false);
const b=device(1);await b.sync.joinFamily(code);assert.equal(b.sync.getStatus().conflict,false);assert.equal(b.sync.getStatus().version,1);
a.local=blank(2);await a.sync.flush();assert.equal(a.sync.getStatus().version,2);
await b.sync.flush();assert.equal(b.local.life.tae.revision,2);assert.equal(b.applied,1);
a.local=blank(3);b.local=blank(4);await a.sync.flush();await b.sync.flush();assert.equal(b.sync.getStatus().conflict,true);assert.equal(table.values().next().value.version,3);
await b.sync.resolveConflict('remote');assert.equal(b.local.life.tae.revision,3);assert.equal(b.sync.getStatus().conflict,false);
assert([...b.store.keys()].some(k=>k.endsWith(':last-conflict')));
b.local=blank(5);await b.sync.flush();assert.equal(table.values().next().value.version,5);
a.local=blank(6);await a.sync.flush();assert.equal(a.sync.getStatus().conflict,true);await a.sync.resolveConflict('local');assert.equal(table.values().next().value.version,6);
const evil=device(9);await assert.rejects(()=>evil.sync.joinFamily('bad'));assert.equal(evil.sync.getStatus().connected,false);
const other=device(0);await other.sync.createFamily();assert.notEqual([...table.keys()][0],[...table.keys()][1]);
const persisted=memory(),before=device(77,persisted),secret=await before.sync.createFamily();before.sync.destroy();assert(persisted.getItem('sparkle-family-sync-v17:synthetic'));const after=device(77,persisted);await after.sync.start();assert.equal(after.sync.getPairCode(),secret);after.sync.disconnect();assert.equal(persisted.getItem('sparkle-family-sync-v17:synthetic'),null);after.sync.destroy();
unavailable=true;b.local=blank(10);await b.sync.flush();assert.equal(b.sync.getStatus().pending,true);assert(statuses.includes('offline'));unavailable=false;
const idle=device(0);idle.sync.notifyLocalChange();assert.equal(idle.sync.getStatus().state,'disconnected');idle.sync.destroy();
// A local write during the remote read must not be overwritten by that remote snapshot.
let changeOnRead=true;
const remoteStore=memory();let remoteLocal=blank(6), readCalls=0;
const race=createCloudSync({endpoint:'https://example.invalid/functions/v1/cloud',namespace:'race',storage:remoteStore,fetchImpl:async(url,options)=>{const result=await fetchImpl(url,options);if(JSON.parse(options.body).action==='read'&&++readCalls===2&&changeOnRead){remoteLocal=blank(99);changeOnRead=false;}return result;},readSnapshot:()=>remoteLocal,applySnapshot:s=>{remoteLocal=s;},mergeSnapshots:()=>null});
await race.joinFamily(code);assert.equal(race.getStatus().conflict,false);a.local=blank(7);await a.sync.flush();await race.flush();assert.equal(race.getStatus().conflict,true);assert.equal(remoteLocal.life.tae.revision,99);race.destroy();
a.sync.destroy();b.sync.destroy();evil.sync.destroy();other.sync.destroy();
console.log(JSON.stringify({result:'PASS',cases:['256-bit pairing','distinct HKDF identities','encrypted transport','write CAS','remote import','manual conflict','conflict choices','durable encrypted loser backup','bad code','offline pending','destroy keeps credential','reconnect restores credential','explicit disconnect deletes credential','disconnected notification ignored','remote read race preserves local'],requests:calls.length}));
