/* Browser-only append-only consultation records. Hashes check consistency, not authorship or medicine. */
export const SCHEMA = 'public-consultation-store-0.1';
export const STORAGE_KEY = 'depressionkg.public-consultations.v1';
export const MAX_BYTES = 4 * 1024 * 1024;
export const MAX_EVENTS = 500;
export const QUALIFICATION = Object.freeze({semantic_status:'research_candidate',clinical_eligibility:'not_evaluated'});
const cp = (value) => Array.from(value);
const bytes = (value) => new TextEncoder().encode(value).length;
const copy = (value) => JSON.parse(JSON.stringify(value));
const fail = (code,message) => {const error=new Error(message);error.code=code;throw error;};
export function stableStringify(value) {
  if(value===null||typeof value==='boolean'||typeof value==='string')return JSON.stringify(value);
  if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
  if(Array.isArray(value))return '['+value.map(stableStringify).join(',')+']';
  if(value&&Object.getPrototypeOf(value)===Object.prototype)return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stableStringify(value[k])).join(',')+'}';
  fail('json','记录含不可保存的数据。');
}
export function sha256(text) {
  if (typeof text !== "string") fail("hash_input", "完整性核对需要文本。");
  const bytes = new TextEncoder().encode(text);
  const length = Math.ceil((bytes.length + 9) / 64) * 64;
  const data = new Uint8Array(length);
  data.set(bytes); data[bytes.length] = 0x80;
  const view = new DataView(data.buffer);
  view.setUint32(length - 8, Math.floor(bytes.length / 0x20000000));
  view.setUint32(length - 4, (bytes.length * 8) >>> 0);
  const k = [0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2];
  const h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const r = (value, n) => (value >>> n) | (value << (32 - n));
  const w = new Uint32Array(64);
  for (let offset = 0; offset < length; offset += 64) {
    for (let j = 0; j < 16; j += 1) w[j] = view.getUint32(offset + j * 4);
    for (let j = 16; j < 64; j += 1) {
      const a = w[j - 15], b = w[j - 2];
      w[j] = (w[j - 16] + (r(a,7)^r(a,18)^(a>>>3)) + w[j - 7] + (r(b,17)^r(b,19)^(b>>>10))) >>> 0;
    }
    let [a,b,c,d,e,f,g,i] = h;
    for (let j = 0; j < 64; j += 1) {
      const t1 = (i + (r(e,6)^r(e,11)^r(e,25)) + ((e&f)^(~e&g)) + k[j] + w[j]) >>> 0;
      const t2 = ((r(a,2)^r(a,13)^r(a,22)) + ((a&b)^(a&c)^(b&c))) >>> 0;
      i=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;
    }
    [a,b,c,d,e,f,g,i].forEach((value,j) => { h[j]=(h[j]+value)>>>0; });
  }
  return h.map((value) => value.toString(16).padStart(8,"0")).join("");
}

const hash = (value) => sha256(stableStringify(value));
function fields(value, required, optional=[]) {
  if(!value||Object.getPrototypeOf(value)!==Object.prototype||required.some(k=>!Object.hasOwn(value,k))||Object.keys(value).some(k=>![...required,...optional].includes(k)))fail('fields','备份含未知或缺少字段，已停止处理。');
}
function text(value,max,label) {
  if(typeof value!=='string'||!value.trim()||cp(value).length>max||/[\uD800-\uDFFF]/u.test(value))fail('text',label+'为空、类型不符或超过字符限制。');
  return value;
}
function id(value,prefix) {if(typeof value!=='string'||!new RegExp('^'+prefix+'-[a-f0-9]{32}$','u').test(value))fail('identity','记录身份不符合当前格式。');return value;}
function when(value) {if(typeof value!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/u.test(value)||new Date(value).toISOString()!==value)fail('time','记录时间格式不正确。');}
function same(a,b) {return stableStringify(a)===stableStringify(b);}
function qualify(value) {if(value.semantic_status!=='research_candidate'||value.clinical_eligibility!=='not_evaluated')fail('qualification','记录仍须为研究候选、临床未评估。');}
function base(store) {return {schema_version:SCHEMA,store_id:store.store_id,...QUALIFICATION};}
export function createStore(storeId) {id(storeId,'pcstore');const initial=base({store_id:storeId});return {...initial,events:[],head_sha256:hash(initial)};}
function turnIdentity(turns) {return hash(turns.map(t=>({id:t.id,ordinal:t.ordinal,role:t.role,text_sha256:t.text_sha256,text_codepoints:t.text_codepoints,text_utf8_bytes:t.text_utf8_bytes})));}
function makeCheckpoint(session,checkpointId,question,createdAt) {
  id(checkpointId,'pcp');text(question,2000,'问题');
  if(!session.turns.some(t=>t.role==='patient'))fail('empty','先追加一轮患者原话，再冻结当前信息。');
  const known=[],turnMap=[];let cpCursor=0,byteCursor=0;
  for(const [index,t]of session.turns.entries()) {
    const lead=t.role+': ',line=lead+t.text;known.push(line);
    turnMap.push({turn_id:t.id,ordinal:t.ordinal,role:t.role,text:t.text,text_sha256:t.text_sha256,text_codepoints:t.text_codepoints,text_utf8_bytes:t.text_utf8_bytes,known_information_index:index,
      known_information_span:{start:cp(lead).length,end:cp(line).length,utf8_start:bytes(lead),utf8_end:bytes(line)},
      prefix_span:{start:cpCursor+cp(lead).length,end:cpCursor+cp(line).length,utf8_start:byteCursor+bytes(lead),utf8_end:byteCursor+bytes(line)}});
    cpCursor+=cp(line).length+1;byteCursor+=bytes(line)+1;
  }
  const prefixHash=sha256(known.join('\n'));
  const binding={session_id:session.id,checkpoint_id:checkpointId,head_sha256:session.head_sha256,patient_prefix_sha256:prefixHash};
  const visible=session.turns.map(t=>({id:t.id,turn_id:t.id,ordinal:t.ordinal,role:t.role,text:t.text,text_sha256:t.text_sha256,text_codepoints:t.text_codepoints,text_utf8_bytes:t.text_utf8_bytes}));
  const request={schema_version:'0.2',id:checkpointId,original_question:question,target_premise:question,population:{age_group:'unknown',description:'仅使用当前可见原话，不自动推定人群'},setting:'浏览器本地研究记录',intended_use:'记录可见信息与缺口，不作为临床诊断',known_information:[...known,'checkpoint_binding='+stableStringify(binding),'visible_turns='+stableStringify(visible)],unknown_information:[],corpus_release:'not-connected-browser-only',
    budget:{max_jobs:4,timeout_seconds:1200,max_input_bytes:180224},public_task_requirements:[{id:'visible-only',kind:'scope',text:'仅当前可见轮次，不读取未来原话、标签或旧答案。'},{id:'research-question',kind:'request_dimension',text:question},{id:'no-dispatch',kind:'behavior',text:'本节点未执行模型，不能声称已评估或已生成补问。'}]};
  if(bytes(stableStringify(request))>180224)fail('request_bytes','当前信息超过节点容量，原话已保留；没有截断后继续冻结。');
  return {schema_version:'public-consultation-checkpoint-0.1',id:checkpointId,session_id:session.id,created_at:createdAt,base_head_sha256:session.head_sha256,observed_turns_sha256:turnIdentity(session.turns),patient_prefix_sha256:prefixHash,binding,turn_count:session.turns.length,visible_turns:visible,turn_map:turnMap,request,request_sha256:hash(request),status:'waiting_for_model',...QUALIFICATION};
}
export const DEFAULT_QUESTION='根据当前可见原话，区分已知信息与缺口，说明判断边界和下一项补问的用途。';
function replay(store) {
  fields(store,['schema_version','store_id','semantic_status','clinical_eligibility','events','head_sha256']);
  if(store.schema_version!==SCHEMA)fail('schema','备份版本不受支持。');id(store.store_id,'pcstore');qualify(store);
  if(!Array.isArray(store.events)||store.events.length>MAX_EVENTS)fail('events','记录数量超过当前容量。');
  const sessions=new Map(),identities=new Set();let previous=hash(base(store));
  for(const [index,event] of store.events.entries()) {
    fields(event,['id','seq','previous_sha256','kind','payload','created_at','sha256']);id(event.id,'pce');when(event.created_at);
    if(identities.has(event.id))fail('duplicate','记录编号重复。');identities.add(event.id);
    const {sha256:declared,...body}=event;
    if(event.seq!==index+1||event.previous_sha256!==previous||declared!==hash(body))fail('event_hash','保存记录的顺序或哈希发生变化，已停止载入。');
    const p=event.payload;
    if(event.kind==='session_created') {
      fields(p,['session_id','title']);id(p.session_id,'pcs');text(p.title,80,'标题');
      if(sessions.has(p.session_id)||sessions.size>=30)fail('session','会话编号重复或数量超过30。');
      sessions.set(p.session_id,{id:p.session_id,title:p.title,created_at:event.created_at,head_sha256:declared,turns:[],checkpoints:[],active_checkpoint_id:null,...QUALIFICATION});
    } else if(event.kind==='turn_added'||event.kind==='checkpoint_created') {
      fields(p,event.kind==='turn_added'?['session_id','expected_head','turn_id','role','text']:['session_id','expected_head','checkpoint']);
      const session=sessions.get(p.session_id);if(!session)fail('session_scope','记录引用了不存在或不同的会话。');
      if(p.expected_head!==session.head_sha256)fail('head_conflict','会话已变化，请刷新后再保存。');
      if(event.kind==='turn_added') {
        id(p.turn_id,'pct');if(identities.has(p.turn_id))fail('duplicate','原话编号重复。');identities.add(p.turn_id);
        if(!['patient','interviewer'].includes(p.role))fail('role','只接受患者或询问者原话，不接受上传的助手答案。');
        text(p.text,8000,'原话');if(session.turns.length>=200||session.turns.reduce((n,t)=>n+t.text_utf8_bytes,0)+bytes(p.text)>128000)fail('turn_limit','当前会话容量已满，请保留并导出原记录。');
        session.turns.push({id:p.turn_id,ordinal:session.turns.length+1,role:p.role,text:p.text,text_sha256:sha256(p.text),text_codepoints:cp(p.text).length,text_utf8_bytes:bytes(p.text),created_at:event.created_at});
      } else {
        if(session.checkpoints.length>=100)fail('checkpoint_limit','当前会话的冻结节点已满。');
        const checkpoint=p.checkpoint;id(checkpoint?.id,'pcp');
        if(identities.has(checkpoint.id))fail('duplicate','冻结节点编号重复。');identities.add(checkpoint.id);
        const expected=makeCheckpoint(session,checkpoint.id,checkpoint.request?.original_question,event.created_at);
        if(!same(checkpoint,expected))fail('checkpoint_hash','冻结节点与当时可见原话或绑定身份不一致。');
        session.checkpoints.push(copy(checkpoint));session.active_checkpoint_id=checkpoint.id;
      }
      session.head_sha256=declared;
    } else fail('unsupported_event','只接受原话与冻结节点备份，不接受上传的评估或答案。');
    previous=declared;
  }
  if(store.head_sha256!==previous)fail('head_hash','记录头与完整历史不一致。');
  for(const session of sessions.values()) {
    const observed=turnIdentity(session.turns);
    session.checkpoints=session.checkpoints.map(c=>({...c,freshness:c.id===session.active_checkpoint_id&&c.observed_turns_sha256===observed?'current':'stale'}));
    session.status=session.checkpoints.some(c=>c.freshness==='current')?'waiting_for_model':'collecting';
  }
  return [...sessions.values()];
}
export function validateStore(store) {const sessions=replay(store);if(bytes(stableStringify(store)+'\n')>MAX_BYTES)fail('store_bytes','备份超过4MiB容量。');return {sessions,head_sha256:store.head_sha256};}
export function listSessions(store) {return copy(validateStore(store).sessions);}
export function sessionDetail(store,sessionId) {id(sessionId,'pcs');const session=listSessions(store).find(s=>s.id===sessionId);if(!session)fail('session_scope','当前备份中没有这份会话。');return session;}
function append(store,kind,payload,meta) {
  validateStore(store);fields(meta,['event_id','created_at']);id(meta.event_id,'pce');when(meta.created_at);
  if(store.events.length>=MAX_EVENTS)fail('events','记录容量已满，请导出保留。');
  const body={id:meta.event_id,seq:store.events.length+1,previous_sha256:store.head_sha256,kind,payload:copy(payload),created_at:meta.created_at};
  const event={...body,sha256:hash(body)},next={...copy(store),events:[...copy(store.events),event],head_sha256:event.sha256};
  validateStore(next);return next;
}
export function createSession(store,payload,meta) {fields(payload,['session_id'],['title']);return append(store,'session_created',{session_id:payload.session_id,title:Object.hasOwn(payload,'title')?payload.title:'未命名会话'},meta);}
export function addTurn(store,sessionId,payload,meta) {fields(payload,['expected_head','turn_id','role','text']);return append(store,'turn_added',{session_id:sessionId,...payload},meta);}
export function freezeCheckpoint(store,sessionId,payload,meta) {
  fields(payload,['expected_head','checkpoint_id'],['question']);const session=sessionDetail(store,sessionId);
  if(payload.expected_head!==session.head_sha256)fail('head_conflict','会话已变化，请刷新后再冻结。');
  const checkpoint=makeCheckpoint(session,payload.checkpoint_id,Object.hasOwn(payload,'question')?payload.question:DEFAULT_QUESTION,meta.created_at);
  return append(store,'checkpoint_created',{session_id:sessionId,expected_head:payload.expected_head,checkpoint},meta);
}
export function exportBackup(store) {validateStore(store);return stableStringify(store)+'\n';}
export function parseBackup(raw) {
  if(typeof raw!=='string'||bytes(raw)>MAX_BYTES)fail('import_bytes','备份为空或超过4MiB容量。');
  let store;try{strictJSON(raw);store=JSON.parse(raw);}catch{fail('import_json','备份JSON不完整，或包含重复字段、无效数字及Unicode。');}
  validateStore(store);return copy(store);
}
function strictJSON(raw) {
  let at=0;const white=()=>{while(/[\t\n\r ]/u.test(raw[at]||'x'))at++;};
  function string(){const start=at++;while(at<raw.length){if(raw[at]==='\\'){at+=2;continue;}if(raw[at++]==='"'){const value=JSON.parse(raw.slice(start,at));if(/[\uD800-\uDFFF]/u.test(value))throw Error('unicode');return value;}}throw Error('string');}
  function value(depth=0){if(depth>100)throw Error('depth');white();const c=raw[at];
    if(c==='"'){string();return;}
    if(c==='{'){at++;white();const names=new Set();if(raw[at]==='}'){at++;return;}while(true){white();if(raw[at]!=='"')throw Error('key');const key=string();if(names.has(key))throw Error('duplicate');names.add(key);white();if(raw[at++]!==':')throw Error('colon');value(depth+1);white();const end=raw[at++];if(end==='}')return;if(end!==',')throw Error('object');}}
    if(c==='['){at++;white();if(raw[at]===']'){at++;return;}while(true){value(depth+1);white();const end=raw[at++];if(end===']')return;if(end!==',')throw Error('array');}}
    const token=raw.slice(at).match(/^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/u)?.[0];
    if(!token)throw Error('value');if(!['true','false','null'].includes(token)&&!Number.isFinite(Number(token)))throw Error('number');at+=token.length;
  }
  value();white();if(at!==raw.length)throw Error('trailing');
}
export function loadStore(storage,key,emptyStoreId) {
  const raw=storage.getItem(key);
  return {raw,store:raw===null?createStore(emptyStoreId):parseBackup(raw)};
}
function extension(current,next) {
  if(current.events.length===0)return;
  if(current.store_id!==next.store_id||next.events.length<current.events.length||!same(current.events,next.events.slice(0,current.events.length)))fail('history_conflict','备份不能覆盖现有历史；请保留当前备份并在空浏览器恢复。');
}
export function commitStore(storage,key,snapshot,next) {
  checkSnapshot(snapshot);validateStore(next);extension(snapshot.store,next);
  if(storage.getItem(key)!==snapshot.raw)fail('storage_conflict','另一个页面已修改记录，请刷新后再保存。');
  const raw=exportBackup(next);storage.setItem(key,raw);
  if(storage.getItem(key)!==raw)fail('storage_conflict','保存期间记录发生变化，请刷新并核对原件。');
  return {raw,store:copy(next)};
}
export function importBackup(storage,key,snapshot,raw) {return commitStore(storage,key,snapshot,parseBackup(raw));}
function checkSnapshot(snapshot) {
  fields(snapshot,['raw','store']);validateStore(snapshot.store);
  if(snapshot.raw!==null&&!same(parseBackup(snapshot.raw),snapshot.store)||snapshot.raw===null&&snapshot.store.events.length!==0)fail('snapshot','读取快照与原始记录不一致。');
}

// The public page uses these transactions (also on HTTP). JSON raw is the sole
// authority; IndexedDB supplies atomic compare-and-swap rather than an index.
export function openDatabase(factory=globalThis.indexedDB) {
  return new Promise((resolve,reject)=>{
    if(!factory){reject(Error('当前浏览器无法安全保存，请换用支持IndexedDB的浏览器。'));return;}
    const request=factory.open('DepressionKGPublicConsultationsV1',1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('records'))request.result.createObjectStore('records');};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(Error('无法打开浏览器保存空间，尚未写入。'));
    request.onblocked=()=>reject(Error('另一个旧页面阻止打开保存空间，请关闭后重试。'));
  });
}
export function readRawDatabase(database,key=STORAGE_KEY) {
  return new Promise((resolve,reject)=>{
    let transaction,raw=null;
    try{transaction=database.transaction('records','readonly');const request=transaction.objectStore('records').get(key);request.onsuccess=()=>{raw=request.result??null;};}
    catch{reject(Error('无法读取浏览器原记录。'));return;}
    transaction.oncomplete=()=>resolve(raw);transaction.onabort=transaction.onerror=()=>reject(Error('读取失败，原记录未改变。'));
  });
}
export async function readDatabase(database,emptyStoreId,key=STORAGE_KEY) {
  const raw=await readRawDatabase(database,key);
  try{return {raw,store:raw===null?createStore(emptyStoreId):parseBackup(raw)};}
  catch(error){error.rawBackup=raw;throw error;}
}
export function commitDatabase(database,snapshot,next,key=STORAGE_KEY) {
  checkSnapshot(snapshot);validateStore(next);extension(snapshot.store,next);const raw=exportBackup(next);
  return new Promise((resolve,reject)=>{
    let transaction,reason=null;
    try{
      transaction=database.transaction('records','readwrite');const records=transaction.objectStore('records'),request=records.get(key);
      request.onsuccess=()=>{
        if((request.result??null)!==snapshot.raw){reason=Object.assign(Error('另一个页面已更新，请刷新后再保存；原输入仍保留。'),{code:'storage_conflict'});transaction.abort();return;}
        records.put(raw,key);
      };
    }catch{reject(Error('无法建立保存事务，尚未写入。'));return;}
    transaction.oncomplete=()=>resolve({raw,store:copy(next)});
    transaction.onabort=transaction.onerror=()=>reject(reason||Error('浏览器未完成保存，可能容量不足；请保留原输入并导出已有记录。'));
  });
}

