// End-to-end encrypted family synchronisation. Never transmit the pairing secret.
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const subtle = () => { if (!globalThis.crypto?.subtle || !globalThis.crypto?.getRandomValues) throw Error('안전한 암호화를 사용할 수 없습니다.'); return globalThis.crypto.subtle; };
const hex = bytes => [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
const b64 = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = s => { if (typeof s !== 'string' || !/^[A-Za-z0-9_-]+$/.test(s)) throw Error('암호화 데이터 형식이 잘못됐습니다.'); const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)); return Uint8Array.from(raw, x => x.charCodeAt(0)); };
const canonicalCode = code => { if (typeof code !== 'string') throw Error('가족 연결 코드를 입력해 주세요.'); const s = code.trim(); if (!/^[A-Za-z0-9_-]{43}$/.test(s) || unb64(s).length !== 32) throw Error('가족 연결 코드가 유효하지 않습니다.'); return s; };
async function derive(code) {
  const seed = await subtle().importKey('raw', unb64(canonicalCode(code)), 'HKDF', false, ['deriveBits', 'deriveKey']);
  const salt = encoder.encode('sparkle-family-sync-v17');
  const bits = async label => new Uint8Array(await subtle().deriveBits({ name:'HKDF', hash:'SHA-256', salt, info:encoder.encode(label) }, seed, 256));
  const [id, auth, key] = await Promise.all([bits('family-id'), bits('server-auth'), bits('aes-gcm-payload')]);
  return { familyId:hex(id), auth:hex(auth), key:await subtle().importKey('raw', key, 'AES-GCM', false, ['encrypt','decrypt']) };
}
const digest = async value => hex(new Uint8Array(await subtle().digest('SHA-256', encoder.encode(JSON.stringify(value)))));
const validPayload = p => p && Object.keys(p).length === 2 && typeof p.iv === 'string' && typeof p.ct === 'string';
async function seal(value, credentials) {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ct = await subtle().encrypt({ name:'AES-GCM', iv, additionalData:encoder.encode(credentials.familyId) }, credentials.key, encoder.encode(JSON.stringify(value)));
  return { iv:b64(iv), ct:b64(new Uint8Array(ct)) };
}
async function unseal(payload, credentials) {
  if (!validPayload(payload)) throw Error('암호화된 가족 기록이 손상되었어요.');
  try {
    const iv = unb64(payload.iv), ct = unb64(payload.ct);
    if (iv.length !== 12 || ct.length < 16) throw Error();
    return JSON.parse(decoder.decode(await subtle().decrypt({ name:'AES-GCM', iv, additionalData:encoder.encode(credentials.familyId) }, credentials.key, ct)));
  } catch { throw Error('가족 기록을 해독할 수 없습니다. 연결 코드나 저장 기록을 확인해 주세요.'); }
}
const clone = value => JSON.parse(JSON.stringify(value));
const sleepBackoff = failures => Math.min(60000, 1000 * 2 ** Math.min(failures, 6));
export function createCloudSync({endpoint,namespace='/',storage,readSnapshot,applySnapshot,mergeSnapshots,onStatus=()=>{},fetchImpl=globalThis.fetch}={}) {
  if (typeof endpoint !== 'string' || !/^https:\/\//.test(endpoint) && !/^http:\/\/localhost(?::\d+)?\//.test(endpoint)) throw Error('HTTPS 동기화 주소가 필요합니다.');
  if (typeof readSnapshot !== 'function' || typeof applySnapshot !== 'function' || typeof fetchImpl !== 'function') throw Error('동기화 연결 함수를 확인해 주세요.');
  if (typeof namespace !== 'string' || namespace.length > 512) throw Error('마을 주소가 올바르지 않습니다.');
  const keyName = 'sparkle-family-sync-v17:' + namespace;
  const session = storage === undefined ? globalThis.localStorage : storage;
  const baseKey=()=>keyName+':'+credentials.familyId+':base',conflictKey=()=>keyName+':'+credentials.familyId+':conflict',archiveKey=()=>keyName+':'+credentials.familyId+':last-conflict';
  let credentials=null, code=null, version=0, base=null, baseHash=null, timer=null, debounce=null, active=false, destroyed=false, inFlight=null, pending=false, conflict=null, failCount=0, nextAttempt=0, generation=0, lastState='disconnected',lastDetail='';
  const aborters=new Set();
  const status = (state, detail='') => {lastState=state;lastDetail=detail; try { onStatus({state,detail,connected:!!credentials,version,pending,conflict:!!conflict}); } catch {} };
  const ensure = () => { if (destroyed) throw Error('종료된 동기화 연결입니다.'); };
  const live = gen => gen === generation && active && !destroyed;
  const readLocal = async () => { const snap = await readSnapshot(); if (!snap || snap.schema !== 17 || typeof snap.learning !== 'object' || !snap.life || snap.life.version !== 16) throw Error('동기화할 마을 기록의 구조가 올바르지 않습니다.'); return clone(snap); };
  const storeEncrypted=async (key,value)=>{const sealed=await seal(value,credentials);if(JSON.stringify(sealed).length>2800000)throw Error('가족 기록 저장 용량을 초과했습니다.');try{session?.setItem(key,JSON.stringify(sealed));}catch{throw Error('가족 연결 정보를 안전하게 저장하지 못했습니다.');}};
  const loadEncrypted=async key=>{let raw;try{raw=session?.getItem(key);}catch{throw Error('가족 연결 정보를 읽지 못했습니다.');}if(!raw)return null;try{return await unseal(JSON.parse(raw),credentials);}catch{throw Error('저장된 연결 기록을 해독하지 못했습니다.');}};
  const preserveConflict=async value=>{await storeEncrypted(conflictKey(),value);conflict=value;pending=true;};
  const attemptMerge=async (local,remote,remoteVersion)=>{if(typeof mergeSnapshots!=='function'||!remote)return false;let merged;try{merged=await mergeSnapshots({base:base?clone(base):null,local:clone(local),remote:clone(remote)});}catch(error){if(typeof error?.code==='string'&&/^[A-Z][A-Z0-9_]*_CONFLICT$/.test(error.code))return false;throw error;}if(!merged)return false;if(merged.schema!==17||!merged.life||merged.life.version!==16||!merged.learning)throw Error('병합된 가족 기록이 올바르지 않습니다.');await applySnapshot(clone(merged),{base:clone(local),expectedLocal:clone(local)});base=clone(remote);baseHash=await changes(remote);version=remoteVersion;pending=true;status('pending');return true;};
  const request = async (action, extras={}) => {
    const controller=new AbortController();aborters.add(controller);
    const timeout=setTimeout(()=>controller.abort(),15000);timeout.unref?.();
    let res,data;try{res=await fetchImpl(endpoint,{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({action,familyId:credentials.familyId,auth:credentials.auth,...extras})});data=await res.json();}finally{clearTimeout(timeout);aborters.delete(controller);}
    if (res.status !== 200 && res.status !== 409) throw Error('가족 서버 응답 오류 ('+res.status+')');
    if (!data || !Number.isSafeInteger(data.version) || data.version < 0 || (data.payload !== null && !validPayload(data.payload))) throw Error('가족 서버 응답이 올바르지 않습니다.');
    return { conflict:res.status === 409, ...data };
  };
  const changes = async (value) => digest(value);
  function arm() { if (timer) clearTimeout(timer); if (!active || destroyed) return; timer=setTimeout(() => { timer=null; if (!globalThis.document || document.visibilityState === 'visible') flush().catch(()=>{}); arm(); },5000); timer.unref?.(); }
  const settle = async (snapshot, remoteVersion,gen=generation) => {const next=clone(snapshot);await storeEncrypted(baseKey(),{version:remoteVersion,base:next});if(!live(gen))return;base=next;baseHash=await changes(next);version=remoteVersion;pending=false;conflict=null;failCount=0;nextAttempt=0;try{session?.removeItem(conflictKey());}catch{throw Error('충돌 기록 저장을 완료하지 못했습니다.');}status('synced');};
  async function cycle() {
    if (!active || !credentials || destroyed) return;
    const gen=generation;
    if (conflict) { status('conflict','다른 기기에서 같은 기록을 변경했습니다.'); return; }
    if (Date.now()<nextAttempt) return;
    try {
      let local=await readLocal(), localHash=await changes(local);
      if (!live(gen)) return;
      const baseFingerprint=base ? baseHash ?? await changes(base) : null;
      let hasLocalChange=base ? localHash!==baseFingerprint : true;
      const remote=await request('read');
      if (!live(gen)) return;
      const server=remote.payload===null?null:await unseal(remote.payload, credentials);
      if (server && (server.schema!==17 || !server.life || server.life.version!==16 || !server.learning)) throw Error('서버의 기록 형식이 일치하지 않습니다.');
      if (!live(gen)) return;
      const refreshed=await readLocal(), refreshedHash=await changes(refreshed);if(!live(gen))return;
      if(refreshedHash!==localHash){local=refreshed;localHash=refreshedHash;pending=true;}
      hasLocalChange=base ? localHash!==baseFingerprint : true;
      if (remote.version !== version || !base) {
        if (server && hasLocalChange && base && (await changes(server)) !== baseFingerprint) {
          if(await attemptMerge(local,server,remote.version))return;await preserveConflict({local,remote:server,version:remote.version}); status('conflict','서로 다른 기기에서 기록이 변경됐습니다. 선택해 주세요.'); return;
        }
        if (server && !hasLocalChange) { await applySnapshot(clone(server),{base:clone(local),expectedLocal:clone(local)}); if (!live(gen)) return; await settle(server,remote.version,gen); return; }
        if (server && !base) {
          // A new device may already have progress. Explicit choice prevents overwriting either side.
          if (await changes(local) !== await changes(server)) {if(await attemptMerge(local,server,remote.version))return;await preserveConflict({local,remote:server,version:remote.version}); status('conflict','이 기기와 가족 기록 중 사용할 데이터를 선택해 주세요.'); return; }
          await settle(server,remote.version,gen); return;
        }
        version=remote.version;
      }
      if (!server || hasLocalChange || pending) {
        const snapshot=await readLocal(); const written=await request('write',{expectedVersion:remote.version,payload:await seal(snapshot,credentials)});
        if (!live(gen)) return;
        if (written.conflict) {
          const changed=written.payload===null?null:await unseal(written.payload,credentials);
          if(await attemptMerge(snapshot,changed,written.version))return;await preserveConflict({local:snapshot,remote:changed,version:written.version});status('conflict','동시에 변경된 기록이 있어 선택이 필요합니다.'); return;
        }
        await settle(snapshot,written.version,gen); return;
      }
      await settle(local,remote.version,gen);
    } catch (err) {
      if (!live(gen)) return;
      pending=true;failCount++;nextAttempt=Date.now()+sleepBackoff(failCount);
      status('offline',err instanceof Error?err.message:'연결 오류');
    }
  }
  async function flush() { ensure(); if (!active) return; if (inFlight) return inFlight; inFlight=cycle().finally(()=>{inFlight=null;}); return inFlight; }
  function schedule() {if(!active||!credentials||destroyed)return;pending=true;status('pending');if (debounce) clearTimeout(debounce); debounce=setTimeout(()=>{debounce=null;flush().catch(()=>{});},500);debounce.unref?.(); }
  async function connect(nextCode) {
    ensure(); const next=await derive(nextCode); stop();
    code=canonicalCode(nextCode); credentials=next; version=0;base=null;baseHash=null;conflict=null;pending=false;failCount=0;nextAttempt=0;
    const remembered=await loadEncrypted(baseKey());if(remembered){if(!Number.isSafeInteger(remembered.version)||remembered.version<0||remembered.base?.schema!==17)throw Error('저장된 동기화 기준이 올바르지 않습니다.');base=remembered.base;version=remembered.version;baseHash=await changes(base);}
    const unresolved=await loadEncrypted(conflictKey());if(unresolved){if(!Number.isSafeInteger(unresolved.version)||!unresolved.local||!('remote' in unresolved))throw Error('저장된 기록 충돌이 손상됐습니다.');conflict=unresolved;pending=true;}
    try { session?.setItem(keyName,code); } catch { status('storage-warning','연결 코드가 이번 화면에서만 유지됩니다.'); }
    active=true;status(conflict?'conflict':'connected');arm();await flush();return {familyId:credentials.familyId};
  }
  async function createFamily() { const secret=globalThis.crypto.getRandomValues(new Uint8Array(32)); const pair=b64(secret); await connect(pair);return pair; }
  const joinFamily = async pair => { await connect(pair); };
  async function start() { ensure(); let remembered=null;try{remembered=session?.getItem(keyName);}catch{status('storage-warning','동기화 연결 코드를 저장 공간에서 읽지 못했습니다.');}if(remembered) await connect(remembered);else status('disconnected'); }
  function stop(){generation++;active=false;if(timer)clearTimeout(timer);if(debounce)clearTimeout(debounce);timer=null;debounce=null;for(const controller of aborters)controller.abort();aborters.clear();inFlight=null;}
  function disconnect(){const keys=credentials?[baseKey(),conflictKey()]:[];stop();try{for(const key of [keyName,...keys])session?.removeItem(key);}catch{status('storage-warning','연결 코드 삭제에 실패했습니다.');}credentials=null;code=null;base=null;baseHash=null;conflict=null;pending=false;version=0;status('disconnected');}
  async function resolveConflict(choice) {
    ensure();if (!conflict) throw Error('해결할 기록 충돌이 없습니다.');if (!['local','remote'].includes(choice)) throw Error('사용할 기록을 선택해 주세요.');
    const gen=generation,c=conflict,local=await readLocal();if(!live(gen))return;
    if(typeof mergeSnapshots!=='function')throw Error('양쪽 기록의 보존 병합 함수가 필요합니다.');
    const merged=await mergeSnapshots({base:base?clone(base):null,local:clone(local),remote:c.remote?clone(c.remote):null,prefer:choice});
    if(!merged||merged.schema!==17||!merged.life||merged.life.version!==16||!merged.learning)throw Error('양쪽 기록을 보존할 수 없어 해결을 중단했습니다.');
    await storeEncrypted(archiveKey(),{local,remote:c.remote,version:c.version});if(!live(gen))return;
    const written=await request('write',{expectedVersion:c.version,payload:await seal(merged,credentials)});if(!live(gen))return;
    if(written.conflict){const latest=written.payload===null?null:await unseal(written.payload,credentials);await preserveConflict({local:await readLocal(),remote:latest,version:written.version});status('conflict','다른 기기에서 기록을 다시 변경했습니다.');return;}
    await applySnapshot(clone(merged),{base:clone(local),expectedLocal:clone(local),prefer:choice});if(!live(gen))return;await settle(merged,written.version,gen);
  }
  function destroy(){stop();destroyed=true;status('destroyed');}
  return Object.freeze({start,createFamily,joinFamily,getPairCode:()=>code,disconnect,flush,destroy,notifyLocalChange:schedule,resolveConflict,getStatus:()=>({state:lastState,detail:lastDetail,connected:!!credentials,version,pending,conflict:!!conflict})});
}
