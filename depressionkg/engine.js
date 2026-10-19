/* Pure browser engine. No requests, model calls, private references or secure-context requirement. */
export const STRATEGY = "browser_local_lexical_v1";
export const STORE_SCHEMA = "public-workbench-store-0.1";
export const MAX_EVENTS = 500;
export const MAX_STORE_BYTES = 2 * 1024 * 1024;
export const SOURCE_IDS = Object.freeze(["nimh-depression-2024", "nimh-bipolar-2025", "youth-screening-review-2024", "imaging-mdd-network-2020"]);
const CATEGORIES = ["retrieval", "source", "binding", "experience", "other"];
const STATUSES = ["open", "investigating", "planned", "resolved", "wont_fix"];
const HOSTS = new Set(["www.nimh.nih.gov", "nimh.nih.gov", "link.springer.com", "journals.plos.org", "creativecommons.org", "www.creativecommons.org", "doi.org"]);
const HEX = /^[a-f0-9]{64}$/u;
const cp = (text) => Array.from(text);
const clone = (value) => JSON.parse(JSON.stringify(value));
const fail = (code, message) => { const error = new Error(message); error.code = code; throw error; };

export function stableStringify(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && Object.getPrototypeOf(value) === Object.prototype) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  fail("json_value", "记录含不可保存的数据，尚未写入。");
}

// SHA-256 over UTF-8, implemented with ordinary JavaScript so HTTP also works.
// This is integrity bookkeeping, not authentication, encryption or medical validation.
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

export function safeURL(value) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return ["https:","http:"].includes(url.protocol) && !url.username && !url.password && HOSTS.has(url.hostname.toLowerCase()) ? url.href : null;
  } catch { return null; }
}

export function verifySpan(span, text) {
  if (typeof text !== "string" || !span || typeof span.quote !== "string" || !Number.isInteger(span.start) || !Number.isInteger(span.end)
    || span.start < 0 || span.end <= span.start || span.end > cp(text).length || cp(text).slice(span.start,span.end).join("") !== span.quote) fail("span", "片段位置与原文不一致，已停止显示。");
  return true;
}

function blockFor(corpus, sourceId, blockId) {
  const source = corpus.sources.find((s) => s.id === sourceId);
  const index = source?.blocks.findIndex((b) => b.id === blockId);
  if (!source || index < 0) fail("source_identity", "记录对应的材料不在当前公开范围中。");
  return { source, block: source.blocks[index], index };
}

export function corpusIdentity(corpus) {
  return sha256(stableStringify({id:corpus.id,sources:corpus.sources.map((s)=>({id:s.id,blocks:s.blocks.map((b)=>({id:b.id,sha256:b.sha256}))})),cases:(corpus.cases||[]).map((c)=>({id:c.id,answer_sha256:c.answer_sha256,relations:c.relations,answer_annotations:c.answer_annotations}))}));
}

export function validateCorpus(corpus) {
  if (!corpus || typeof corpus.id !== "string" || !Array.isArray(corpus.sources) || !Array.isArray(corpus.cases)
    || corpus.semantic_status !== "research_candidate" || corpus.clinical_eligibility !== "not_evaluated"
    || corpus.sources.length !== 4 || new Set(corpus.sources.map((s)=>s.id)).size !== 4
    || corpus.sources.some((s)=>!SOURCE_IDS.includes(s.id)) || corpus.capabilities?.new_model_answer !== false) fail("corpus_scope", "公开材料包范围或资格标记不符合要求，已停止载入。");
  for (const source of corpus.sources) {
    if (!safeURL(source.url) || !safeURL(source.license_url) || typeof source.attribution !== "string" || !source.attribution.trim() || !Array.isArray(source.blocks)) fail("source_metadata", "来源署名或许可信息不完整。");
    const ids = new Set();
    for (const block of source.blocks) {
      if (typeof block.id !== "string" || ids.has(block.id) || typeof block.text !== "string" || sha256(block.text) !== block.sha256) fail("source_hash", "公开文本的身份核对未通过，已停止载入。");
      ids.add(block.id);
    }
  }
  if (corpus.cases.length !== 1 || corpus.cases[0].id !== "d1-reg007") fail("case_scope", "当前公开候选只允许一份完整D1历史回答。");
  for (const item of corpus.cases) {
    if (sha256(item.answer_text) !== item.answer_sha256 || item.relations.length !== 8 || item.answer_annotations.length !== 2) fail("answer_identity", "历史回答数量或身份核对未通过。");
    const ids = new Set();
    for (const relation of item.relations) {
      if (ids.has(relation.id)) fail("binding_identity", "历史引用编号重复。");
      ids.add(relation.id);verifySpan(relation.answer_span,item.answer_text);
      const {block} = blockFor(corpus,relation.source_span.source_id,relation.source_span.block_id);
      verifySpan(relation.source_span,block.text);
      if (relation.source_span.text_sha256 !== block.sha256) fail("binding_hash", "历史引用的来源版本不一致。");
    }
    for (const gap of item.answer_annotations) {
      if (ids.has(gap.id) || gap.kind !== "evidence_gap" || gap.source_span) fail("gap_scope", "缺口标记不得伪造原文引用。");
      ids.add(gap.id);verifySpan(gap.answer_span,item.answer_text);
    }
  }
  return { identity:corpusIdentity(corpus), source_count:corpus.sources.length, block_count:corpus.sources.reduce((n,s)=>n+s.blocks.length,0) };
}

export const BILINGUAL_TERMS = Object.freeze({
  "情绪低落":["depressed","depression","low mood"],"兴趣":["interest","pleasure"],"时间":["duration","weeks","days"],"持续":["duration","lasting","lasted","persistent"],"两周":["two weeks","2 weeks"],"频率":["frequency","daily","every day","nearly every day","most of the day"],"症状":["symptom","symptoms"],"功能":["function","functioning","activities"],"日常":["daily","everyday","day-to-day","daily activities"],
  "青少年":["adolescent","teens"],"照护者":["parent","caregiver","report"],"老年":["older adults","memory"],"认知":["cognitive","thinking","memory"],
  "躯体":["medical","physical","somatic"],"药物":["medications","drugs"],"用药":["medications","drugs"],"物质":["substance","drugs"],
  "双相":["bipolar","hypomania","mania"],"躁狂":["manic","mania","hypomania"],"家族":["family history"],"病程":["lifetime","course","episodes"],
  "影像":["imaging","brain","classifier"],"语音":["speech","voice"],"量表":["questionnaire","screening"],"筛查":["screening"],"抑郁":["depression","depressive","depressed"]
});
// Public language groups, unrelated to any expected answer or source identity.
// Aliases within one concept cannot multiply its coverage score.
const CONCEPTS = [
  ["mood","情绪低落",["情绪低落","抑郁"],["depression","depressive","depressed","low mood"]],
  ["interest","兴趣",["兴趣"],["interest","pleasure"]],
  ["duration","持续时间",["时间","持续","两周"],["duration","weeks","days","lasting","lasted","persistent","two weeks","2 weeks"]],
  ["frequency","出现频率",["频率"],["frequency","daily","every day","nearly every day","most of the day"]],
  ["symptoms","症状",["症状"],["symptom","symptoms"]],
  ["function","日常功能",["功能","日常"],["function","functioning","activities","daily activities","everyday","day-to-day"]],
  ["youth","青少年",["青少年"],["adolescent","adolescents","teens","children","youth"]],
  ["caregiver","照护者报告",["照护者","父母","报告"],["parent","parents","caregiver","report"]],
  ["older","老年",["老年"],["older adults","older people","elderly"]],
  ["cognition","认知",["认知","记忆"],["cognitive","thinking","memory"]],
  ["physical","躯体",["躯体"],["medical","physical","somatic"]],
  ["medication","用药",["药物","用药"],["medications","medication","drugs"]],
  ["substance","物质",["物质"],["substance","alcohol","drugs"]],
  ["bipolar","双相与躁狂",["双相","躁狂"],["bipolar","hypomania","mania","manic","hypomanic"]],
  ["family","家族史",["家族"],["family history"]],
  ["course","病程",["病程","发作"],["lifetime","course","episodes","episode"]],
  ["imaging","影像",["影像"],["imaging","brain","classifier"]],
  ["speech","语音",["语音"],["speech","voice"]],
  ["screening","筛查与量表",["量表","筛查"],["questionnaire","screening"]],
].map(([id,label,triggers,terms])=>({id,label,triggers,terms}));
export const RETRIEVAL_POLICY = Object.freeze({id:"concept_coverage_saturated_terms_text_role_v1",strategy:STRATEGY,
  concepts:CONCEPTS,english_boundary:"whole_ascii_word",window_codepoints:420,prefix_codepoints:65,
  concept_weight:100,distinct_term_weight:5,occurrence_cap_per_term:3,reference_weight:0.18,short_heading_weight:0.55,
  identity_meaning:"public_lexical_policy_identity_not_quality_certification"});
export const RETRIEVAL_POLICY_IDENTITY = sha256(stableStringify(RETRIEVAL_POLICY));
const STOP = new Set(["a","an","the","and","or","is","are","of","for","to","in","what","how","can","do","with","it","this","that"]);
function bounded(value, maximum, label) {
  if (typeof value !== "string" || !value.trim() || cp(value).length > maximum) fail("input", `${label}为空或超过允许长度，尚未保存。`);
  return value.trim();
}
export function queryTerms(question) {
  return Array.from(new Set(queryConcepts(question).flatMap((concept)=>concept.terms)));
}
function occurrences(text, term) {
  const escaped=term.replace(/[.*+?^${}()|[\]\\]/gu,"\\$&");
  const pattern=/[A-Za-z0-9]/u.test(term)?`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`:escaped;
  return Array.from(text.matchAll(new RegExp(pattern,"giu")),(m)=>({start:cp(text.slice(0,m.index)).length,end:cp(text.slice(0,m.index+m[0].length)).length}));
}
export function queryConcepts(question) {
  const q=bounded(question,2000,"问题"),groups=CONCEPTS.filter((concept)=>concept.triggers.some((t)=>q.includes(t))||concept.terms.some((term)=>occurrences(q,term).length));
  const knownTerms=new Set(groups.flatMap((group)=>group.terms));
  const direct=(q.match(/[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*|[\p{Script=Han}]+/gu)||[]).map((s)=>s.toLowerCase()).filter((s)=>cp(s).length>1&&!STOP.has(s)&&!knownTerms.has(s));
  return [...groups.map(({id,label,terms})=>({id,label,terms:[...terms]})),...Array.from(new Set(direct)).map((term)=>({id:`literal:${term}`,label:`原问题词：${term}`,terms:[term]}))].slice(0,32);
}
function textRole(block) {
  const section=String(block.locator?.section||"");
  const explicit=/\b(references|bibliography)\b|参考文献/iu.test(section);
  const citationLines=(block.text.match(/(?:^|\n)\s*\d{1,3}[.)]\s+[^\n]{8,}(?:\b(?:19|20)\d{2}\b|https?:)/gu)||[]).length;
  if(explicit||citationLines>=3)return {kind:"reference_entries",label:"参考文献条目（机械降权）",weight:0.18};
  if(cp(block.text).length<=100&&!/[.!。！]/u.test(block.text)&&block.text.split(/\s+/u).length<=16)return {kind:"short_heading",label:"短标题（机械降权）",weight:0.55};
  return {kind:"body_or_unclassified",label:"正文或未分类文本",weight:1};
}
function scoreWindow(positions) {
  const concepts=new Set(positions.map((p)=>p.concept)),terms=new Set(positions.map((p)=>p.term));
  // Distinct concepts dominate; repeats saturate at three occurrences per term.
  const saturated=Array.from(terms).reduce((total,term)=>total+Math.min(3,positions.filter((p)=>p.term===term).length),0);
  return {coverage:concepts.size,score:concepts.size*100+terms.size*5+saturated,concepts:[...concepts],terms:[...terms]};
}

export function attachContext(corpus, span) {
  const {source,block,index}=blockFor(corpus,span.source_id,span.block_id);
  verifySpan(span,block.text);
  if (span.text_sha256!==block.sha256) fail("source_version","此记录的材料版本与当前网页不一致，未重新绑定。");
  const project=(b)=>({block_id:b.id,text:b.text,start:0,end:cp(b.text).length,text_sha256:b.sha256});
  return {...clone(span),source_title:source.title,context:project(block),adjacent_blocks:[index-1,index+1].filter((i)=>i>=0&&i<source.blocks.length).map((i)=>project(source.blocks[i]))};
}

export function searchCorpus(corpus, question, limit=24) {
  const q=bounded(question,2000,"问题");
  if (!Number.isInteger(limit)||limit<1||limit>24) fail("limit","最多交付24个检索片段。");
  const concepts=queryConcepts(q),terms=queryTerms(q), matches=[];
  for (const source of corpus.sources) for (const block of source.blocks) {
    const positions=concepts.flatMap((concept)=>concept.terms.flatMap((term)=>occurrences(block.text,term).map((position)=>({...position,concept:concept.id,term}))));
    if (!positions.length) continue;
    const points=cp(block.text),role=textRole(block);
    let best=null;
    for (const position of positions) {
      const start=Math.max(0,position.start-65),end=Math.min(points.length,start+420);
      const score=scoreWindow(positions.filter((p)=>p.start>=start&&p.end<=end));
      if (!best||score.score>best.window_score||(score.score===best.window_score&&start<best.start)) best={start,end,window_score:score.score,concept_coverage:score.coverage,matched_concepts:score.concepts,matched_terms:score.terms};
    }
    matches.push({source_id:source.id,block_id:block.id,...best,quote:points.slice(best.start,best.end).join(""),text_sha256:block.sha256,score:best.window_score*role.weight,text_role:role.kind,text_role_label:role.label});
  }
  matches.sort((a,b)=>b.score-a.score||b.window_score-a.window_score||a.source_id.localeCompare(b.source_id,"en")||a.block_id.localeCompare(b.block_id,"en"));
  const spans=matches.slice(0,limit).map((span,i)=>attachContext(corpus,{...span,id:`span-${i+1}`}));
  return {question:q,strategy:STRATEGY,status:spans.length?"completed":"no_material",source_release:corpus.id,corpus_identity:corpusIdentity(corpus),query_terms:terms,
    query_expansion:{main:terms,contrary:[]},query_concepts:concepts,ranking_rule:RETRIEVAL_POLICY.id,retrieval_policy:{id:RETRIEVAL_POLICY.id,sha256:RETRIEVAL_POLICY_IDENTITY},
    query_trace:spans.map(({source_id,block_id,start,end,score,concept_coverage,matched_concepts,matched_terms,text_role})=>({source_id,block_id,start,end,score,concept_coverage,matched_concepts,matched_terms,text_role})),
    spans,candidate_blocks:matches.length,not_displayed_candidate_blocks:Math.max(0,matches.length-spans.length),
    answer_status:"not_generated_local_retrieval_only",semantic_status:"research_candidate",clinical_eligibility:"not_evaluated",quality_status:"not_evaluated",comparison_to_local_fts:"not_equivalent_not_evaluated"};
}

export function freezeSearch(result,id,createdAt) {
  return {id,created_at:createdAt,question:result.question,strategy:result.strategy,status:result.status,corpus_identity:result.corpus_identity,query_terms:clone(result.query_terms),
    query_concepts:clone(result.query_concepts||[]),ranking_rule:result.ranking_rule||"prior_browser_frequency_rule",retrieval_policy:clone(result.retrieval_policy||{id:"prior_browser_frequency_rule",sha256:null}),query_trace:clone(result.query_trace||[]),
    spans:result.spans.map(({id,source_id,block_id,start,end,quote,text_sha256,score,window_score,concept_coverage,matched_concepts,matched_terms,text_role,text_role_label})=>Object.fromEntries(Object.entries({id,source_id,block_id,start,end,quote,text_sha256,score,window_score,concept_coverage,matched_concepts,matched_terms,text_role,text_role_label}).filter(([,value])=>value!==undefined))),
    candidate_blocks:result.candidate_blocks,not_displayed_candidate_blocks:result.not_displayed_candidate_blocks};
}
export function restoreSearch(corpus,record) {
  if (record.corpus_identity!==corpusIdentity(corpus)||record.strategy!==STRATEGY) fail("source_version","这条记录属于另一版材料或检索策略，已保留记录，但不会默默改绑到当前来源。");
  return {...clone(record),source_release:corpus.id,spans:record.spans.map((s)=>attachContext(corpus,s)),query_expansion:{main:record.query_terms,contrary:[]},answer_status:"not_generated_local_retrieval_only"};
}
export function caseDetail(corpus,id) {
  const item=corpus.cases.find((c)=>c.id===id);
  if (!item) fail("case","当前公开包没有这份完整历史回答。");
  return {case_id:item.id,release_id:item.id,packet_id:item.id,status:"historical_actual_answer",question:item.question,answer_text:item.answer_text,
    bindings:item.relations.map((r)=>({...clone(r),...attachContext(corpus,r.source_span),id:r.id,answer_span:clone(r.answer_span),source_span:clone(r.source_span)})),
    gaps:clone(item.answer_annotations),answer_annotations:clone(item.answer_annotations),unresolved:clone(item.unresolved||[])};
}

export function createEventLog(storeId) {
  bounded(storeId,120,"浏览器记录标识");
  const base={schema_version:STORE_SCHEMA,store_id:storeId};
  return {...base,events:[],head_sha256:sha256(stableStringify(base))};
}
function validatePayload(kind,payload,feedbackIds) {
  if (!payload||Object.getPrototypeOf(payload)!==Object.prototype) fail("event_payload","记录事件结构损坏，原件未覆盖。");
  if (kind==="search_saved") {
    bounded(payload.id,160,"查找标识");bounded(payload.question,2000,"问题");
    if(payload.strategy!==STRATEGY||!HEX.test(payload.corpus_identity)||!Array.isArray(payload.spans)||payload.spans.length>24) fail("search_record","保存的查找记录结构不符合要求。");
  } else if (kind==="feedback_created") {
    bounded(payload.id,160,"问题标识");bounded(payload.title,160,"标题");
    if (feedbackIds.has(payload.id)||typeof payload.description!=="string"||cp(payload.description).length>4000||!CATEGORIES.includes(payload.category)) fail("feedback_record","问题记录身份或内容不符合要求。");
    if (payload.anchor && (!HEX.test(payload.anchor.corpus_identity)||!["search_span","answer_binding"].includes(payload.anchor.kind))) fail("anchor","记录位置的材料身份不完整。");
    feedbackIds.add(payload.id);
  } else if(kind==="feedback_status") {
    if(!feedbackIds.has(payload.feedback_id)||!STATUSES.includes(payload.status)) fail("status_reference","处理记录没有对应的原问题，原件未覆盖。");
    bounded(payload.note,2000,"处理说明");
  } else fail("event_kind","浏览器记录含未知事件，原件未覆盖。");
}
export function verifyEventLog(log) {
  if(!log||log.schema_version!==STORE_SCHEMA||typeof log.store_id!=="string"||!Array.isArray(log.events)||log.events.length>MAX_EVENTS) fail("store_corrupt","浏览器记录无法核对，原件已保留，未自动清空或覆盖。");
  let previous=sha256(stableStringify({schema_version:log.schema_version,store_id:log.store_id}));
  const feedbackIds=new Set();
  log.events.forEach((event,i)=>{
    if(event.sequence!==i+1||event.previous_sha256!==previous||typeof event.created_at!=="string"||Number.isNaN(Date.parse(event.created_at))) fail("event_chain","浏览器记录的先后链不一致，原件未覆盖。");
    const {event_sha256,...base}=event;
    if(sha256(stableStringify(base))!==event_sha256) fail("event_hash","浏览器记录内容发生变化，原件未覆盖。");
    validatePayload(event.kind,event.payload,feedbackIds);previous=event_sha256;
  });
  if(log.head_sha256!==previous) fail("event_head","浏览器记录尾部身份不一致，原件未覆盖。");
  if(new TextEncoder().encode(stableStringify(log)).length>MAX_STORE_BYTES) fail("store_capacity","浏览器记录达到本工具容量上限，请先导出；新记录尚未保存。");
  return true;
}
export function appendEvent(log,kind,payload,createdAt) {
  verifyEventLog(log);
  if(log.events.length>=MAX_EVENTS) fail("store_capacity","已达到500条追加事件上限，请先导出；原记录保留，新记录尚未保存。");
  const next=clone(log),event={sequence:log.events.length+1,kind,created_at:createdAt,payload:clone(payload),previous_sha256:log.head_sha256};
  event.event_sha256=sha256(stableStringify(event));next.events.push(event);next.head_sha256=event.event_sha256;
  verifyEventLog(next);return next;
}
export function readStore(storage,key,storeId) {
  let raw;
  try{raw=storage.getItem(key);}catch{fail("storage_read","浏览器拒绝读取保存空间；仍可阅读材料，记录尚未保存。");}
  if(raw===null)return {raw:null,log:createEventLog(storeId)};
  let log;try{log=JSON.parse(raw);}catch{fail("store_corrupt","浏览器记录不是有效JSON，原件已保留，未自动清空。");}
  verifyEventLog(log);return {raw,log};
}
export function commitEvent(storage,key,snapshot,kind,payload,createdAt) {
  const next=appendEvent(snapshot.log,kind,payload,createdAt),raw=stableStringify(next);
  let before;
  try{before=storage.getItem(key);}catch{fail("storage_read","浏览器保存空间暂不可读，新记录尚未保存。");}
  if(before!==snapshot.raw)fail("storage_conflict","另一页面更新了本浏览器记录，请刷新后重试；未覆盖其他记录。");
  try{storage.setItem(key,raw);}catch{fail("storage_write","浏览器未能保存（可能空间不足或被限制）；原记录保留，请导出当前内容，新记录尚未保存。");}
  let persisted;try{persisted=storage.getItem(key);}catch{fail("storage_verify","写入后未能核对，请导出并检查，暂不声明保存成功。");}
  if(persisted!==raw)fail("storage_conflict","写入后记录发生变化，暂不声明保存成功，请导出并检查。");
  return {raw,log:next};
}
export function deriveRecords(log) {
  verifyEventLog(log);const searches=[],feedback=[];
  for(const event of log.events){
    if(event.kind==="search_saved")searches.push(clone(event.payload));
    if(event.kind==="feedback_created")feedback.push({...clone(event.payload),status:"open",created_at:event.created_at,updated_at:event.created_at,events:[{sequence:1,status:"open",note:"已记录在此浏览器；未上传网站。",created_at:event.created_at}]});
    if(event.kind==="feedback_status"){
      const item=feedback.find((f)=>f.id===event.payload.feedback_id);item.status=event.payload.status;item.updated_at=event.created_at;
      item.events.push({sequence:item.events.length+1,status:item.status,note:event.payload.note,created_at:event.created_at});
    }
  }
  return {searches:searches.reverse(),feedback:feedback.reverse()};
}
