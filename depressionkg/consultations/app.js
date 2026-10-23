/* No fetch, analytics, model calls or patient-data uploads. All records stay in this browser. */
import * as store from './store.js';
const $=(id)=>document.getElementById(id);
const app={database:null,snapshot:null,sessionId:null,nodeId:null,busy:false,stale:false,blocked:false,rawBackup:null,downloadURL:null};
const element=(tag,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;if(className)node.className=className;return node;};
function message(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function uid(prefix){if(!globalThis.crypto?.getRandomValues)throw Error('当前浏览器无法生成记录身份，尚未保存。');return prefix+'-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');}
const meta=()=>({event_id:uid('pce'),created_at:new Date().toISOString()});
const session=()=>app.snapshot&&app.sessionId?store.sessionDetail(app.snapshot.store,app.sessionId):null;
let changes;
try{if(globalThis.BroadcastChannel){changes=new BroadcastChannel('depressionkg.public-consultations.changed');changes.onmessage=()=>{app.stale=true;controls();message('另一个页面已保存新记录。请刷新后核对，再继续追加；输入仍保留。',true);};}}catch{/* Transaction CAS still protects writes when notifications are unavailable. */}
function controls(){for(const button of document.querySelectorAll('[data-write]'))button.disabled=!app.database||!app.snapshot||app.blocked||app.busy||app.stale;
  if(app.sessionId&&app.snapshot&&!app.blocked){const selected=session();$('freeze-form').querySelector('button').disabled=$('freeze-form').querySelector('button').disabled||!selected.turns.some(t=>t.role==='patient');}
  $('export').disabled=!app.snapshot&&typeof app.rawBackup!=='string';document.body.classList.toggle('busy',app.busy);}
async function task(callback){if(app.busy)return;app.busy=true;controls();try{await callback();}catch(error){message(error.message||'操作未完成，原记录未被覆盖。',true);}finally{app.busy=false;controls();}}
async function refresh(){
  if(!app.database)throw Error('浏览器保存空间不可用，尚未写入。');
  try{app.snapshot=await store.readDatabase(app.database,uid('pcstore'));app.blocked=false;app.stale=false;app.rawBackup=null;
    if(app.sessionId&&!store.listSessions(app.snapshot.store).some(s=>s.id===app.sessionId)){app.sessionId=null;app.nodeId=null;}
    render();message('已核对本浏览器记录。内容不上传网站，请定期导出备份。');
  }catch(error){app.blocked=true;if(typeof error.rawBackup==='string')app.rawBackup=error.rawBackup;app.snapshot=null;render();throw Error('原记录未通过核对，已停止写入且不会自动重置。请先导出原始文本备份。');}
}
async function commit(next){
  if(app.blocked||app.stale||!app.snapshot)throw Error('请先刷新并核对浏览器记录；尚未写入。');
  try{app.snapshot=await store.commitDatabase(app.database,app.snapshot,next);changes?.postMessage({kind:'records-changed'});render();}
  catch(error){if(error.code==='storage_conflict')app.stale=true;throw error;}
}
function turnCard(turn){const card=element('article','','turn '+turn.role);card.append(element('p',`第 ${turn.ordinal} 轮 · ${turn.role==='patient'?'患者':'询问者'}`,'turn-label'),element('p',turn.text,'original'));return card;}
function render(){
  $('sessions').replaceChildren();
  if(!app.snapshot){$('empty').hidden=false;$('session').hidden=true;$('node-content').replaceChildren(element('p',app.blocked?'原记录未被覆盖。导出原件后，可按使用说明处理。':'尚未打开浏览器记录。','muted'));$('node-select').disabled=true;controls();return;}
  const sessions=store.listSessions(app.snapshot.store);
  if(!sessions.length)$('sessions').append(element('p','这里还没有会话。','muted'));
  for(const item of [...sessions].reverse()){
    const button=element('button',item.title,'session-button');button.type='button';button.classList.toggle('selected',item.id===app.sessionId);
    button.append(element('small',`${item.turns.length} 轮 · ${item.checkpoints.length} 个节点`));
    button.addEventListener('click',()=>{app.sessionId=item.id;app.nodeId=null;render();});$('sessions').append(button);
  }
  const current=session();$('empty').hidden=!!current;$('session').hidden=!current;
  if(current){$('session-title').textContent=current.title;$('session-meta').textContent=`${current.turns.length} 轮原话 · 仅本浏览器保存`;$('session-status').textContent=current.status==='waiting_for_model'?'等待真实模型':'记录原话中';
    $('turn-count').textContent=`${current.turns.length} / 200`;$('turns').replaceChildren();if(!current.turns.length)$('turns').append(element('p','尚未录入原话。','muted'));for(const turn of current.turns)$('turns').append(turnCard(turn));}
  renderNode(current);controls();
}
function renderNode(current){
  const select=$('node-select'),content=$('node-content');select.replaceChildren();content.replaceChildren();
  if(!current?.checkpoints.length){select.disabled=true;const option=element('option','尚无节点');option.value='';select.append(option);content.append(element('p','冻结后可查看当时的原样信息。尚无实际模型评估。','muted'));return;}
  select.disabled=false;if(!current.checkpoints.some(c=>c.id===app.nodeId))app.nodeId=current.active_checkpoint_id;
  for(const [index,checkpoint]of current.checkpoints.entries()){const option=element('option',`节点 ${index+1} · ${checkpoint.turn_count} 轮 · ${checkpoint.freshness==='current'?'当前':'已过时'}`);option.value=checkpoint.id;select.append(option);}select.value=app.nodeId;
  const checkpoint=current.checkpoints.find(c=>c.id===app.nodeId);
  content.append(element('span',checkpoint.freshness==='current'?'当前信息节点':'历史节点 · 已过时','badge'+(checkpoint.freshness==='current'?'':' stale')));
  content.append(element('p',checkpoint.freshness==='current'?'此节点保留当前冻结的信息。':'此后已有新增原话或新节点；这里展示当时的信息。','muted small'));
  content.append(element('div','等待真实模型。尚无实际评估、补问或答案；冻结并没有启动调用。','waiting'));
  content.append(element('h3','冻结的问题'),element('p',checkpoint.request.original_question,'node-question'),element('h3','当时可见的原话'));
  const turns=element('div','','node-turns');for(const turn of checkpoint.visible_turns)turns.append(turnCard(turn));content.append(turns);
  const details=element('details'),summary=element('summary','查看节点身份与请求');details.append(summary,element('pre',JSON.stringify(checkpoint,null,2)));content.append(details);
}
function showBackup(){
  const raw=app.snapshot?store.exportBackup(app.snapshot.store):app.rawBackup;
  if(typeof raw!=='string')throw Error('尚无可读取的记录。');
  $('backup-text').value=raw;$('backup-panel').hidden=false;
  if(app.downloadURL)URL.revokeObjectURL(app.downloadURL);
  app.downloadURL=URL.createObjectURL(new Blob([raw],{type:'application/json;charset=utf-8'}));$('download').href=app.downloadURL;$('download').download=app.blocked?'consultations-original-unreadable.json':'consultations-backup.json';
  $('backup-panel').scrollIntoView({block:'start'});message(app.blocked?'已保留原始记录文本。它未通过核对，导出不会修复或覆盖它。':'已展开完整备份。下载或复制后，请自行确认已保存。');
}
$('create-form').addEventListener('submit',event=>{event.preventDefault();task(async()=>{const id=uid('pcs'),payload={session_id:id};if($('title').value.trim())payload.title=$('title').value;const next=store.createSession(app.snapshot.store,payload,meta());await commit(next);app.sessionId=id;app.nodeId=null;$('title').value='';render();message('会话已保存到此浏览器。可以追加第一轮原话。');});});
$('turn-form').addEventListener('submit',event=>{event.preventDefault();task(async()=>{const current=session();const next=store.addTurn(app.snapshot.store,current.id,{expected_head:current.head_sha256,turn_id:uid('pct'),role:$('role').value,text:$('turn-text').value},meta());await commit(next);$('turn-text').value='';$('text-count').textContent='0 / 8000';message('这一轮已保存。旧节点原字保留并标为过时。');});});
$('freeze-form').addEventListener('submit',event=>{event.preventDefault();task(async()=>{const current=session(),checkpointId=uid('pcp'),payload={expected_head:current.head_sha256,checkpoint_id:checkpointId};if($('question').value.trim())payload.question=$('question').value;
  const next=store.freezeCheckpoint(app.snapshot.store,current.id,payload,meta());await commit(next);app.nodeId=checkpointId;render();message('当前节点已冻结并保存，仍等待真实模型；没有生成新判断或补问。');});});
$('turn-text').addEventListener('input',()=>{$('text-count').textContent=Array.from($('turn-text').value).length+' / 8000';});
$('node-select').addEventListener('change',()=>{app.nodeId=$('node-select').value;renderNode(session());});
$('refresh').addEventListener('click',()=>task(refresh));
$('export').addEventListener('click',()=>task(showBackup));$('close-backup').addEventListener('click',()=>{$('backup-panel').hidden=true;});
$('select-backup').addEventListener('click',()=>{$('backup-text').focus();$('backup-text').select();message('已全选备份。请手动复制并保存到本机文件。');});
$('import-form').addEventListener('submit',event=>{event.preventDefault();task(async()=>{const file=$('import-file').files?.[0],pasted=$('import-text').value;
  if(file&&pasted.trim())throw Error('请选择文件或粘贴文本中的一种，避免恢复错记录。');if(file&&file.size>store.MAX_BYTES)throw Error('备份超过4MiB容量。');
  const raw=file?await file.text():pasted;const imported=store.parseBackup(raw);await commit(imported);app.sessionId=null;app.nodeId=null;$('import-text').value='';$('import-file').value='';render();message('已按顺序与哈希核对并恢复原话及节点；未接收任何模型评估或答案。');});});
$('sample').addEventListener('click',()=>task(async()=>{const id=uid('pcs');let next=store.createSession(app.snapshot.store,{session_id:id,title:'合成示例 · 完全构造'},meta());
  for(const [role,text]of [['patient','合成示例：这是操作演示的构造文字。我想先记录最近的作息变化。'],['interviewer','合成示例：这是构造的询问者原话。你想从哪一项变化开始记录？']]){const current=store.sessionDetail(next,id);next=store.addTurn(next,id,{expected_head:current.head_sha256,turn_id:uid('pct'),role,text},meta());}
  const current=store.sessionDetail(next,id),checkpointId=uid('pcp');next=store.freezeCheckpoint(next,id,{expected_head:current.head_sha256,checkpoint_id:checkpointId,question:'合成示例：查看当前有哪些原话，哪些信息还未提供。'},meta());
  await commit(next);app.sessionId=id;app.nodeId=checkpointId;render();message('合成示例已保存。内容完全构造，不是真人记录、诊断或模型回答。');}));
if(location.protocol==='http:')$('transport-notice').textContent='当前站点使用 HTTP，建议仅保存匿名研究记录。内容留在此浏览器，可导出备份。';
task(async()=>{try{app.database=await store.openDatabase();app.database.onversionchange=()=>{app.database.close();app.database=null;app.blocked=true;controls();message('记录格式已由其他页面更新，请先导出并刷新。',true);};await refresh();}catch(error){app.blocked=true;throw error;}});
