import corpus from "./corpus.js";
import {STRATEGY,sha256,validateCorpus,safeURL,searchCorpus,freezeSearch,restoreSearch as restoreFrozenSearch,caseDetail,readStore,commitEvent,deriveRecords,verifyEventLog} from "./engine.js";
"use strict";

(() => {
  const $ = (id) => document.getElementById(id);
  const cp = (text) => Array.from(typeof text === "string" ? text : "");
  const short = (text, maximum = 100) => {
    const points = cp(text);
    return points.length > maximum ? `${points.slice(0, maximum).join("")}…` : points.join("");
  };
  const el = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const button = (text, className, handler) => {
    const node = el("button", text, className);
    node.type = "button";
    if (handler) node.addEventListener("click", handler);
    return node;
  };
  const state = {
    bootstrap: null, view: "materials", search: null, selectedSpan: null,
    currentCase: null, answer: null, selectedBinding: null, feedback: [],
    feedbackFilter: "all", feedbackAnchor: null, searchSequence: 0, answerSequence: 0,
    feedbackSequence: 0, searchBusy: false, dialogOpener: null,
  };
  const titles = { D1: "症状与功能", D2: "PHQ-9 量表", D3: "纵向病程", D4: "病史与用药", D5: "青少年报告", D6: "老年背景", D7: "孕产与 EPDS", D8: "影像与语音" };
  const kinds = { support: "候选支持", limitation: "限定条件", conflict: "相反材料", source_report: "来源陈述", unassessed: "仅定位", evidence_gap: "证据缺口" };
  const statuses = { open: "待核查", investigating: "核查中", planned: "已列入计划", resolved: "已处理", wont_fix: "暂不处理" };
  const categories = { retrieval: "检索材料", source: "原文内容", binding: "回答与引用", experience: "使用体验", other: "其他" };
  const pageInfo = {
    materials: ["从问题出发，回到原文。", "查找已有材料，核对它能说明什么，再记录尚未解决的问题。"],
    answers: ["让回答与依据，一起接受检查。", "查看真实保存的历史候选回答，沿每个片段双向核对原文。"],
    feedback: ["把观察，变成下一步改进。", "留下具体问题和处理经过，保留原始材料与回答。"],
  };

  function setStatus(node, message, error = false) {
    node.textContent = message;
    node.classList.toggle("is-error", error);
    node.setAttribute("role", error ? "alert" : "status");
  }

  function userMessage(error) {
    return error instanceof Error && error.message ? error.message : "这次本地读取没有完成，请稍后重试。";
  }

  const STORE_KEY = "depressionkg.public-workbench.records.v1";
  const browserId = `browser-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
  let lastSnapshot = null;
  let storageError = null;
  let unsavedSearch = null;
  let unsavedFeedback = null;
  let materialIdentity = null;
  let exportURL = null;
  const publicExamples = [
    ["D1","已知情绪低落、兴趣减少，还需要哪些时间、频率和功能信息？"],
    ["D3","当前有抑郁表现，怎样核查既往情绪发作与纵向病程？"],
    ["D4","有抑郁表现，哪些躯体病史、用药和物质信息值得核查？"],
    ["D5","青少年本人和照护者报告不同，如何区分原文依据与证据缺口？"],
    ["D6","老年人的情绪、记忆和躯体困扰，现有材料有哪些适用边界？"],
    ["D8","影像或语音分类结果，是否提供相对已有信息的增量依据？"],
  ].map(([need_id,question])=>({id:`public-${need_id.toLowerCase()}`,need_id,question}));
  const now = () => new Date().toISOString();
  const identifier = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,9)}`;

  function storageNotice(message, error=false) {
    $("storage-status").textContent=message;
    $("storage-status").classList.toggle("storage-error",error);
  }
  function readLocal() {
    try {
      lastSnapshot=readStore(window.localStorage,STORE_KEY,browserId);
      storageError=null;
      const records=deriveRecords(lastSnapshot.log);
      storageNotice(`${lastSnapshot.log.events.length} 条追加事件已核对；记录上限500条或2 MiB，可随时导出。`);
      return records;
    } catch(error) {
      storageError=error;
      storageNotice(`${userMessage(error)} 仍可检索和阅读；请导出检查，未自动重置记录。`,true);
      throw error;
    }
  }
  function persist(kind,payload) {
    readLocal();
    try {
      lastSnapshot=commitEvent(window.localStorage,STORE_KEY,lastSnapshot,kind,payload,now());
      storageError=null;
      storageNotice(`${lastSnapshot.log.events.length} 条追加事件已保存并核对；仅此浏览器，未上传网站。`);
      return deriveRecords(lastSnapshot.log);
    } catch(error) {
      storageError=error;
      storageNotice(userMessage(error),true);
      throw error;
    }
  }
  function enrichAnchor(anchor) {
    if(!anchor)return null;
    if(anchor.kind==="search_span"){
      if(state.search?.id!==anchor.search_id)throw new Error("当前片段的查找身份已改变，尚未保存问题。");
      const span=state.search.spans.find((s)=>s.id===anchor.span_id);
      if(!span)throw new Error("当前片段无法定位，尚未保存问题。");
      return {...anchor,corpus_identity:materialIdentity,source_id:span.source_id,block_id:span.block_id,start:span.start,end:span.end,text_sha256:span.text_sha256,quote_sha256:sha256(span.quote)};
    }
    const detail=caseDetail(corpus,"d1-reg007");
    const item=[...detail.bindings,...detail.gaps].find((r)=>r.id===anchor.binding_id);
    if(!item)throw new Error("当前历史片段无法定位，尚未保存问题。");
    return {...anchor,corpus_identity:materialIdentity,answer_sha256:corpus.cases[0].answer_sha256,answer_quote_sha256:sha256(item.answer_span.quote),kind_of_record:item.kind};
  }
  // Route-shaped calls below are in-process browser dispatch, never HTTP requests.
  async function api(path, { method="GET", body }={}) {
    if(path==="bootstrap"){
      const checked=validateCorpus(corpus);materialIdentity=checked.identity;
      let records={searches:[],feedback:[]};try{records=readLocal();}catch{}
      const item=corpus.cases[0];
      return {mode:"public_browser_workbench",source_release:corpus.id,...checked,examples:publicExamples,
        recent_searches:records.searches,capabilities:{new_model_answer:false},
        cases:[{id:item.id,title:item.title,release_id:item.id,packet_id:item.id,status:"historical_actual_answer"},
          {id:"d7-excluded",title:"D7：本公开包未包含",status:"excluded_public_scope",reason:"原回答包含本公开范围未纳入的来源引用，因此没有删减后作为完整历史回答发布。"},
          {id:"adhoc-excluded",title:"药物问题：本公开包未包含",status:"excluded_public_scope",reason:"原回答包含本公开范围未纳入的来源引用，因此没有删减后作为完整历史回答发布。"},
          {id:"d6",title:"D6：没有有效最终回答",status:"no_valid_final_answer"}]};
    }
    if(path==="searches"&&method==="POST"){
      if(body.strategy!==STRATEGY)throw new Error("此网页只使用浏览器词项新策略，不模拟本地索引路线。");
      const result=searchCorpus(corpus,body.question),created_at=now(),id=identifier("search");
      const frozen=freezeSearch(result,id,created_at);
      const detail={...result,id,created_at,saved_to_browser:false};
      try{persist("search_saved",frozen);detail.saved_to_browser=true;unsavedSearch=null;}
      catch(error){unsavedSearch=frozen;detail.save_error=userMessage(error);}
      return detail;
    }
    if(path.startsWith("searches/")){
      const id=decodeURIComponent(path.slice(9));
      if(unsavedSearch?.id===id)return {...restoreFrozenSearch(corpus,unsavedSearch),saved_to_browser:false};
      const item=readLocal().searches.find((s)=>s.id===id);
      if(!item)throw new Error("当前浏览器里没有这次查找；换设备不会自动同步，原有记录未被覆盖。");
      return {...restoreFrozenSearch(corpus,item),saved_to_browser:true};
    }
    if(path.startsWith("answers?")){
      const params=new URLSearchParams(path.split("?")[1]);
      if(params.get("release_id")!=="d1-reg007"||params.get("packet_id")!=="d1-reg007")throw new Error("当前公开包没有这份完整历史回答。");
      return caseDetail(corpus,"d1-reg007");
    }
    if(path==="feedback"&&method==="GET")return {items:readLocal().feedback};
    if(path==="feedback"&&method==="POST"){
      const payload={id:identifier("feedback"),title:body.title,description:body.description||"",category:body.category||"other",anchor:enrichAnchor(body.anchor)};
      unsavedFeedback=payload;
      const records=persist("feedback_created",payload);unsavedFeedback=null;
      return records.feedback.find((f)=>f.id===payload.id);
    }
    const match=path.match(/^feedback\/([^/]+)\/events$/u);
    if(match&&method==="POST"){
      const id=decodeURIComponent(match[1]);
      const records=persist("feedback_status",{feedback_id:id,status:body.status,note:body.note});
      return records.feedback.find((f)=>f.id===id);
    }
    throw new Error("此网页没有对应的本浏览器操作。");
  }
  function exportRecords() {
    let raw=null,readError=null;
    try{raw=window.localStorage.getItem(STORE_KEY);}catch(error){readError=userMessage(error);}
    let verified=null;
    try{if(raw!==null){verified=JSON.parse(raw);verifyEventLog(verified);}}catch{verified=null;}
    const content={schema_version:"public-workbench-personal-export-0.1",exported_at:now(),
      meaning:"仅由本人从当前浏览器导出；此前未上传网站，换设备不自动同步。",strategy:STRATEGY,corpus_identity:materialIdentity,
      verified_event_log:verified,unverified_original_storage:raw!==null&&!verified?raw:null,storage_read_error:readError,
      current_unsaved_search:unsavedSearch,current_unsaved_feedback:unsavedFeedback,
      current_feedback_draft:$("feedback-dialog").open?{title:$("feedback-title").value,description:$("feedback-description").value,category:$("feedback-category").value}:null};
    const serialized=JSON.stringify(content,null,2)+"\n";
    if(exportURL)URL.revokeObjectURL(exportURL);
    exportURL=null;
    $("export-json").value=serialized;
    $("export-panel").hidden=false;
    const link=$("download-records");link.removeAttribute("href");link.removeAttribute("download");
    try {
      exportURL=URL.createObjectURL(new Blob([serialized],{type:"application/json;charset=utf-8"}));
      link.href=exportURL;link.download=`depressionkg-personal-records-${new Date().toISOString().slice(0,10)}.json`;
      link.hidden=false;
      setStatus($("export-status"),"JSON 备份已准备，可下载或手动复制。尚未确认文件保存成功。");
    } catch {
      link.hidden=true;
      setStatus($("export-status"),"浏览器未能准备下载链接，请从备份文本全选并手动复制保存；尚未确认备份完成。",true);
    }
    storageNotice("已显示本浏览器完整 JSON 备份；请手动确认保存，网页没有接收或上传它。");
    $("export-heading").scrollIntoView({block:"nearest"});
  }

  function verifySpan(span, text) {
    const points = cp(text);
    if (!span || typeof span.quote !== "string" || !Number.isInteger(span.start)
      || !Number.isInteger(span.end) || span.start < 0 || span.end <= span.start
      || span.end > points.length || points.slice(span.start, span.end).join("") !== span.quote) {
      throw new Error("片段位置与保存的原文不一致，已停止显示这条记录。");
    }
  }

  function activateMark(mark, handler) {
    mark.setAttribute("role", "button");
    mark.tabIndex = 0;
    mark.addEventListener("click", handler);
    mark.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handler();
      }
    });
  }

  function moveTo(hash) {
    if (location.hash === hash) void readRoute();
    else location.hash = hash;
  }

  function showView(view) {
    state.view = view;
    for (const name of ["materials", "answers", "feedback"]) {
      $(`${name}-view`).hidden = name !== view;
    }
    for (const node of document.querySelectorAll("[data-view]")) {
      const active = node.dataset.view === view;
      node.classList.toggle("is-current", active);
      if (active) node.setAttribute("aria-current", "page");
      else node.removeAttribute("aria-current");
    }
    $("page-title").textContent = pageInfo[view][0];
    $("page-description").textContent = pageInfo[view][1];
    setStatus($("app-status"), "");
  }

  async function readRoute() {
    if (!state.bootstrap) return;
    let route;
    try { route = location.hash.slice(1).split("/").map((part) => decodeURIComponent(part)); }
    catch { setStatus($("app-status"), "页面位置无法读取，请从左侧重新选择。", true); return; }
    if (route[0] === "feedback") {
      showView("feedback");
      await loadFeedback();
    } else if (route[0] === "case" || route[0] === "answers") {
      showView("answers");
      const entry = state.bootstrap.cases.find((item) => item.id === route[1])
        || (!route[1] ? state.bootstrap.cases[0] : null);
      if (!entry) {
        showAnswerEmpty("没有找到这份历史记录。", "请重新选择上方保存的研究问题。");
        return;
      }
      await loadAnswer(entry);
    } else {
      showView("materials");
      if (route[0] === "search" && route[1]) {
        if (state.search?.id === route[1]) renderSearch();
        else await restoreSearch(route[1]);
      } else if (state.search) renderSearch();
    }
  }

  function loadingCard(title, message) {
    const node = el("div", undefined, "panel state-card is-loading");
    const heading = el("h2");
    heading.append(el("span", undefined, "loading-dot"), el("span", title));
    node.append(heading, el("p", message), el("div", undefined, "loading-line"), el("div", undefined, "loading-line short"));
    return node;
  }

  function showSearchLoading() {
    $("search-intro").hidden = true;
    $("search-results").hidden = false;
    $("search-results").replaceChildren(loadingCard("正在查找公开文本…", "只读取现有来源。这一步不会生成新回答。"));
    $("search-content").setAttribute("aria-busy", "true");
    clearReader($("search-reader"), "正在查找本次问题的材料。", "返回结果后，选择一个片段继续阅读。");
  }

  async function submitSearch(event) {
    event.preventDefault();
    if (state.searchBusy) return;
    const question = $("question-input").value.trim();
    if (!question) { $("question-input").focus(); return; }
    if (cp(question).length > 2000) {
      setStatus($("app-status"), "问题较长，请缩短到 2000 字以内。", true);
      return;
    }
    const sequence = ++state.searchSequence;
    state.searchBusy = true;
    $("question-input").disabled = true;
    $("strategy-select").disabled = true;
    $("search-submit").disabled = true;
    $("search-submit").firstElementChild.textContent = "正在查找…";
    setStatus($("app-status"), "");
    showSearchLoading();
    try {
      const result = await api("searches", { method: "POST", body: { question, strategy: $("strategy-select").value } });
      if (sequence !== state.searchSequence) return;
      verifySearch(result);
      state.search = result;
      state.selectedSpan = null;
      rememberSearch(result);
      if (state.view === "materials") moveTo(`#search/${encodeURIComponent(result.id)}`);
    } catch (error) {
      if (sequence !== state.searchSequence) return;
      if (state.view === "materials") showSearchError(userMessage(error));
    } finally {
      state.searchBusy = false;
      $("question-input").disabled = false;
      $("strategy-select").disabled = false;
      $("search-submit").disabled = false;
      $("search-submit").firstElementChild.textContent = "查找材料";
      $("search-content").setAttribute("aria-busy", "false");
    }
  }

  function verifySearch(result) {
    if (!result || typeof result.id !== "string" || typeof result.question !== "string"
      || !Array.isArray(result.spans) || !["completed", "no_material", "failed"].includes(result.status)
      || result.answer_status !== "not_generated_local_retrieval_only") {
      throw new Error("检索记录不完整，已停止显示。请重试或记录此问题。");
    }
    const ids = new Set();
    for (const span of result.spans) {
      if (typeof span.id !== "string" || ids.has(span.id) || typeof span.context?.text !== "string") {
        throw new Error("检索片段记录不完整，已停止显示。");
      }
      ids.add(span.id);
      verifySpan(span, span.context.text);
    }
  }

  async function restoreSearch(id) {
    const sequence = ++state.searchSequence;
    showSearchLoading();
    try {
      const result = await api(`searches/${encodeURIComponent(id)}`);
      if (sequence !== state.searchSequence) return;
      verifySearch(result);
      if (result.id !== id) throw new Error("保存的查找身份不一致，已停止显示。");
      state.search = result;
      state.selectedSpan = null;
      if (state.view === "materials") renderSearch();
    } catch (error) {
      if (sequence === state.searchSequence && state.view === "materials") showSearchError(userMessage(error));
    } finally {
      if (sequence === state.searchSequence) $("search-content").setAttribute("aria-busy", "false");
    }
  }

  function showSearchError(message) {
    $("search-intro").hidden = true;
    $("search-results").hidden = false;
    const card = el("section", undefined, "panel state-card");
    card.append(el("h2", "这次检索没有完成。"), el("p", message), button("记录检索问题", "button quiet", () => openFeedback(null, "检索未完成", "retrieval")));
    $("search-results").replaceChildren(card);
    $("search-content").setAttribute("aria-busy", "false");
    clearReader($("search-reader"), "没有可显示的新检索片段。", "可以调整问题后重新查找。");
  }

  function renderSearch() {
    const result = state.search;
    if (!result) return;
    if (result.saved_to_browser === false) setStatus($("app-status"), "材料可以阅读，但本次查找尚未保存；可导出当前结果。", true);
    $("question-input").value = result.question;
    if ([STRATEGY].includes(result.strategy)) $("strategy-select").value = result.strategy;
    $("search-intro").hidden = true;
    $("search-results").hidden = false;
    $("search-content").setAttribute("aria-busy", "false");
    const container = $("search-results");
    container.replaceChildren();
    if (!result.spans.length) {
      const card = el("section", undefined, "panel state-card");
      card.append(el("h2", result.status === "failed" ? "检索记录未能交付材料。" : "在当前材料中，没有找到可交付片段。"),
        el("p", "这不等于文献中没有证据。当前只查找公开文本，你可以改用量表名称、时间、适用人群等具体线索。"),
        button("调整问题", "button quiet", () => $("question-input").focus()),
        button("记录材料缺口", "text-button", () => openFeedback(null, "当前问题未找到材料", "retrieval")));
      container.append(card);
      appendQueryClues(container, result);
      clearReader($("search-reader"), "当前没有可阅读的检索片段。", "查无结果会保留为一次真实检索记录。");
      return;
    }
    const heading = el("div", undefined, "result-header");
    heading.append(el("h2", `${result.spans.length} 个可核对片段`), el("p", "选择材料 · 阅读上下文"));
    const list = el("div", undefined, "result-list");
    result.spans.forEach((span, index) => {
      const card = button(undefined, "result-card", () => selectSearchSpan(span.id));
      card.id = `result-${index}`;
      card.dataset.spanId = span.id;
      card.setAttribute("aria-pressed", String(span.id === state.selectedSpan));
      card.classList.toggle("is-selected", span.id === state.selectedSpan);
      const meta = el("div", undefined, "result-meta");
      meta.append(el("span", `材料 ${String(index + 1).padStart(2, "0")}`), el("span", "尚未用于新回答"));
      card.append(meta, el("p", span.source_title || "已保存来源", "result-source-title"),
        el("span", span.quote, "result-quote"), el("span", "阅读原文与上下文 ↗", "result-open"));
      if (span.text_role === "reference_entries" || span.text_role === "short_heading") card.append(el("span", span.text_role_label, "result-note"));
      list.append(card);
    });
    container.append(heading, list, el("p", "检索结果是待核查材料。未交付的内容和证据缺口仍需单独检查。", "result-note"));
    appendQueryClues(container, result);
    if (state.selectedSpan) selectSearchSpan(state.selectedSpan, false);
    else clearReader($("search-reader"), "选择一个检索片段，阅读对应原文。", "选中材料并不代表回答已采用它。");
  }

  function appendQueryClues(container, result) {
    const expansion = result.query_expansion;
    if (!expansion || (!Array.isArray(expansion.main) && !Array.isArray(expansion.contrary))) return;
    const details = el("details", undefined, "source-location");
    details.append(el("summary", "本次检索用了哪些线索？"));
    if (Array.isArray(result.query_concepts) && result.query_concepts.length) details.append(el("p", `问题词项分组：${result.query_concepts.map((item)=>item.label).join("；")}`));
    for (const [key, label] of [["main", "主要线索"], ["contrary", "反向与限制线索"]]) {
      const values = Array.isArray(expansion[key]) ? expansion[key].filter((value) => typeof value === "string") : [];
      if (values.length) details.append(el("p", `${label}：${values.join("；")}`));
    }
    details.append(el("p", result.retrieval_policy?.id === "concept_coverage_saturated_terms_text_role_v1"
      ? "先比较不同词项分组的覆盖，重复词频最多计三次；参考文献条目和短标题按机械规则降权。这些线索不能说明已穷尽证据，也不代表材料语义适用。"
      : "这是浏览器曾保存的查找，按原选中位置恢复，没有使用新规则重新排序。原线索不能说明已穷尽证据，也不代表材料语义适用。"));
    container.append(details);
  }

  function renderRecentSearches() {
    const recent = Array.isArray(state.bootstrap?.recent_searches) ? state.bootstrap.recent_searches : [];
    $("recent-search-details").hidden = recent.length === 0;
    $("recent-search-list").replaceChildren();
    for (const search of recent.slice(0, 6)) {
      if (typeof search.id !== "string" || typeof search.question !== "string") continue;
      const node = button(undefined, "example-button", () => moveTo(`#search/${encodeURIComponent(search.id)}`));
      node.append(el("span", `${formatTime(search.created_at)} · ${search.status === "no_material" ? "没有可交付片段" : "已保存查找"}`, "example-label"),
        el("span", short(search.question, 75)));
      $("recent-search-list").append(node);
    }
  }

  function rememberSearch(result) {
    if (!result.saved_to_browser) return;
    state.bootstrap.recent_searches = [result, ...(state.bootstrap.recent_searches || []).filter((item) => item.id !== result.id)].slice(0, 20);
    renderRecentSearches();
  }

  function clearReader(panel, title, message) {
    const header = el("div", undefined, "reader-heading");
    header.append(el("p", "READ THE SOURCE", "eyebrow"), el("h2", "原文与上下文"));
    const empty = el("div", undefined, "reader-empty");
    empty.append(el("span", "↔"), el("p", title), el("p", message));
    panel.replaceChildren(header, empty);
  }

  function selectSearchSpan(id, scroll = true) {
    const span = state.search?.spans.find((item) => item.id === id);
    if (!span) return;
    state.selectedSpan = id;
    for (const card of $("search-results").querySelectorAll("[data-span-id]")) {
      const active = card.dataset.spanId === id;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    }
    const back = () => {
      const card = Array.from($("search-results").querySelectorAll("[data-span-id]")).find((item) => item.dataset.spanId === id);
      card?.focus({ preventScroll: true });
      card?.scrollIntoView({ block: "nearest" });
    };
    renderReader($("search-reader"), {
      item: span, selected: span, releaseId: state.search.source_release,
      contextNote: "这是检索找到的材料，尚未用于生成新回答。",
      returns: [{ label: "返回选中的检索片段", handler: back }],
      anchor: { kind: "search_span", search_id: state.search.id, span_id: id }, category: "retrieval",
    });
    if (scroll && matchMedia("(max-width: 680px)").matches) requestAnimationFrame(() => {
      ($("search-reader").querySelector(".source-body mark") || $("search-reader")).scrollIntoView({ block: "center" });
    });
  }

  function renderReader(panel, { item, selected, releaseId, contextNote, returns, anchor, category }) {
    try { verifySpan(selected, item.context.text); }
    catch (error) { clearReader(panel, "片段核对未通过。", userMessage(error)); return; }
    const header = el("div", undefined, "reader-heading");
    header.append(el("p", "READ THE SOURCE", "eyebrow"), el("h2", "原文与上下文"));
    const title = el("h3", item.source_title || "已保存来源", "source-title");
    const note = el("p", contextNote, "source-context-label");
    const links = el("div", undefined, "source-link-row");
    const source = corpus.sources.find((entry) => entry.id === selected.source_id);
    const sourceURL = safeURL(source?.url);
    if (sourceURL) {
      const original = el("a", "到出版者页面核查 ↗");
      original.href = sourceURL;
      original.target = "_blank";
      original.rel = "noopener noreferrer";
      links.append(original);
    }
    links.append(el("span", "当前选段已标色", "quiet-label"));
    const points = cp(item.context.text);
    const body = el("div", undefined, "source-body");
    const mark = el("mark", selected.quote);
    mark.setAttribute("aria-label", "选中的原文；按回车返回对应片段");
    activateMark(mark, returns[0]?.handler || (() => {}));
    body.append(el("span", points.slice(0, selected.start).join("")), mark,
      el("span", points.slice(selected.end).join("")));
    const rights = el("section", undefined, "rights-note");
    rights.append(el("p", source?.attribution || "来源署名未提供"), el("p", source?.extraction_notice || "此处为提取文本；未发布图片和原始版面，提取可能不完整。"));
    const licenseURL = safeURL(source?.license_url);
    if (licenseURL) { const link = el("a", `许可说明：${source.license}`); link.href = licenseURL; link.target = "_blank"; link.rel = "noopener noreferrer"; rights.append(link); }
    panel.replaceChildren(header, title, note, rights, links, body);
    for (const adjacent of item.adjacent_blocks || []) {
      if (typeof adjacent.text !== "string") continue;
      const details = el("details", undefined, "source-neighbor");
      details.append(el("summary", "阅读相邻原文"), el("p", adjacent.text, "neighbor-text"));
      panel.append(details);
    }
    const back = el("section", undefined, "source-return");
    back.append(el("h3", category === "binding" ? "回到对应的回答" : "回到所选材料"));
    for (const item of returns) back.append(button(item.label, "text-button", item.handler));
    panel.append(back);
    const location = el("details", undefined, "source-location");
    location.append(el("summary", "查看原文定位"), el("p", `文本块 ${selected.block_id} · 字符 ${selected.start}–${selected.end}（不含末位）`));
    panel.append(location);
    const actions = el("div", undefined, "source-actions");
    actions.append(button("记录这里的问题", "button quiet", () => openFeedback(anchor, `${item.source_title || "来源"}：${short(selected.quote, 90)}`, category)));
    panel.append(actions);
    panel.scrollTop = 0;
    requestAnimationFrame(() => {
      if (getComputedStyle(panel).position === "sticky") {
        const top = mark.getBoundingClientRect().top - panel.getBoundingClientRect().top + panel.scrollTop;
        panel.scrollTop = Math.max(0, top - Math.min(180, panel.clientHeight / 3));
      }
    });
  }

  function showAnswerEmpty(title, message, entry) {
    $("answer-workspace").hidden = true;
    $("answer-empty").hidden = false;
    $("answer-empty").replaceChildren(el("h2", title), el("p", message));
    if (entry) {
      const example = state.bootstrap.examples.find((item) => item.need_id === "D6");
      if (entry.id === "d6" && example) $("answer-empty").append(button("用这道问题查找材料", "button quiet", () => useExample(example)));
    }
    $("answer-empty").append(button("记录待解决的问题", "text-button", () => openFeedback(null, entry?.title || title, "binding")));
  }

  async function loadAnswer(entry) {
    state.currentCase = entry;
    $("case-select").value = entry.id;
    if (entry.status !== "historical_actual_answer" || !entry.release_id) {
      state.answer = null;
      state.selectedBinding = null;
      showAnswerEmpty(entry.status === "no_valid_final_answer" ? "这道问题还没有有效最终回答。" : "这份历史记录暂时不能展示。",
        entry.status === "no_valid_final_answer" ? "保留原有失败。可以先核查材料，或把仍需解决的问题记入改进清单。" : entry.reason || "当前未能核对保存的历史记录，请重新选择或记录问题。", entry);
      return;
    }
    if (state.answer?.case_id === entry.id) { renderAnswer(); return; }
    const sequence = ++state.answerSequence;
    $("answer-workspace").hidden = true;
    $("answer-empty").hidden = false;
    $("answer-empty").replaceChildren(loadingCard("正在读取历史回答…", "读取实际保存的正文和原文引用。"));
    try {
      const query = new URLSearchParams({ release_id: entry.release_id, packet_id: entry.packet_id });
      const detail = await api(`answers?${query}`);
      if (sequence !== state.answerSequence || state.currentCase?.id !== entry.id) return;
      if (detail.status !== "historical_actual_answer" || detail.case_id !== entry.id
        || detail.release_id !== entry.release_id || typeof detail.answer_text !== "string" || !Array.isArray(detail.bindings)) {
        throw new Error("历史回答身份或正文不完整，已停止显示。");
      }
      for (const binding of detail.bindings) {
        verifySpan(binding.answer_span, detail.answer_text);
        verifySpan(binding.source_span, binding.context?.text);
      }
      detail.gaps = Array.isArray(detail.gaps) ? detail.gaps : Array.isArray(detail.answer_annotations)
        ? detail.answer_annotations.filter((item) => item.kind === "evidence_gap") : [];
      for (const gap of detail.gaps) {
        verifySpan(gap.answer_span, detail.answer_text);
        if (gap.source_span) throw new Error("缺口记录意外包含来源引用，已停止显示。");
      }
      state.answer = detail;
      state.selectedBinding = null;
      if (state.view === "answers") renderAnswer();
    } catch (error) {
      if (sequence === state.answerSequence && state.currentCase?.id === entry.id) showAnswerEmpty("读取没有完成。", userMessage(error), entry);
    }
  }

  function renderAnswerText() {
    const detail = state.answer;
    const points = cp(detail.answer_text);
    const boundaries = new Set([0, points.length]);
    const marks = [...detail.bindings, ...(detail.gaps || [])];
    for (const binding of marks) {
      boundaries.add(binding.answer_span.start);
      boundaries.add(binding.answer_span.end);
    }
    const stops = Array.from(boundaries).sort((a, b) => a - b);
    const container = $("answer-text");
    container.replaceChildren();
    for (let index = 0; index < stops.length - 1; index += 1) {
      const start = stops[index], end = stops[index + 1];
      const matches = marks.filter((binding) => binding.answer_span.start <= start && binding.answer_span.end >= end);
      const active = matches.find((binding) => binding.id === state.selectedBinding) || matches[0];
      const node = el(active ? "mark" : "span", points.slice(start, end).join(""));
      if (active) {
        const knownKind = Object.hasOwn(kinds, active.kind) ? active.kind : "unassessed";
        node.className = `kind-${knownKind}${matches.some((binding) => binding.id === state.selectedBinding) ? " is-selected" : ""}`;
        node.dataset.bindingIds = matches.map((binding) => binding.id).join(" ");
        node.setAttribute("aria-label", knownKind === "evidence_gap" ? "证据缺口；查看原回答中的缺口声明" : `${kinds[knownKind]}；核对这段回答的原文`);
        activateMark(node, () => selectBinding(active.id));
      }
      container.append(node);
    }
  }

  function renderAnswer() {
    const detail = state.answer;
    if (!detail) return;
    $("answer-empty").hidden = true;
    $("answer-workspace").hidden = false;
    $("answer-question").textContent = detail.question || state.currentCase?.title || "历史研究问题";
    renderAnswerText();
    $("binding-count").textContent = `${detail.bindings.length} 条原文引用 · ${(detail.gaps || []).length} 处缺口`;
    $("binding-list").replaceChildren();
    [...detail.bindings, ...(detail.gaps || [])].forEach((binding) => {
      const card = button(undefined, "binding-button", () => selectBinding(binding.id));
      card.dataset.bindingId = binding.id;
      card.setAttribute("aria-pressed", String(binding.id === state.selectedBinding));
      card.classList.toggle("is-selected", binding.id === state.selectedBinding);
      card.append(el("span", kinds[binding.kind] || "候选关系", "binding-kind"),
        el("span", binding.answer_span.quote, "binding-quote"),
        el("span", binding.kind === "evidence_gap" ? "原回答中的缺口声明，没有原文支持绑定 →" : "核对完整主张与原文范围 →", "binding-hint"));
      $("binding-list").append(card);
    });
    const unresolved = Array.isArray(detail.unresolved) ? detail.unresolved.filter((item) => typeof item === "string") : [];
    $("unresolved-details").hidden = unresolved.length === 0;
    $("unresolved-list").replaceChildren(...unresolved.map((item) => el("li", item)));
    if (state.selectedBinding) selectBinding(state.selectedBinding, false);
    else clearReader($("answer-reader"), "选择一个标记的回答片段，核对它的依据。", "选段精确，仍需检查是否支持整句主张。");
  }

  function focusAnswer(bindingId) {
    selectBinding(bindingId, false);
    const mark = Array.from($("answer-text").querySelectorAll("mark")).find((item) => item.dataset.bindingIds.split(" ").includes(bindingId));
    mark?.focus({ preventScroll: true });
    mark?.scrollIntoView({ block: "nearest" });
  }

  function selectBinding(id, scroll = true) {
    const binding = [...(state.answer?.bindings || []), ...(state.answer?.gaps || [])].find((item) => item.id === id);
    if (!binding) return;
    state.selectedBinding = id;
    renderAnswerText();
    for (const card of $("binding-list").querySelectorAll("[data-binding-id]")) {
      const active = card.dataset.bindingId === id;
      card.classList.toggle("is-selected", active);
      card.setAttribute("aria-pressed", String(active));
    }
    if (binding.kind === "evidence_gap" || !binding.source_span) {
      renderGapReader(binding);
      if (scroll && matchMedia("(max-width: 680px)").matches) $("answer-reader").scrollIntoView({ block: "start" });
      return;
    }
    const span = binding.source_span;
    const related = state.answer.bindings.filter((item) => item.source_span?.source_id === span.source_id
      && item.source_span?.block_id === span.block_id && item.source_span.start < span.end && item.source_span.end > span.start);
    renderReader($("answer-reader"), {
      item: binding, selected: span, releaseId: state.answer.release_id,
      contextNote: "原回答所选的来源片段。引用准确不代表它支持标记的全部主张。",
      returns: related.map((item) => ({ label: short(item.answer_span.quote, 90), handler: () => focusAnswer(item.id) })),
      anchor: { kind: "answer_binding", release_id: state.answer.release_id, packet_id: state.answer.packet_id, binding_id: id }, category: "binding",
    });
    if (scroll && matchMedia("(max-width: 680px)").matches) requestAnimationFrame(() => {
      ($("answer-reader").querySelector(".source-body mark") || $("answer-reader")).scrollIntoView({ block: "center" });
    });
  }

  function renderGapReader(gap) {
    const panel = $("answer-reader");
    const header = el("div", undefined, "reader-heading");
    header.append(el("p", "EVIDENCE GAP", "eyebrow"), el("h2", "原回答保留的材料缺口"));
    panel.replaceChildren(header, el("p", "此处是材料缺口，没有原文支持绑定。", "source-context-label"),
      el("p", gap.answer_span.quote, "source-body"),
      el("p", "这是实际历史回答中的缺口声明。它没有对应的支持引文，也不表示整个研究领域都没有证据。", "source-origin-note"));
    const back = el("section", undefined, "source-return");
    back.append(el("h3", "回到回答"), button("定位这条缺口声明", "text-button", () => focusAnswer(gap.id)));
    const actions = el("div", undefined, "source-actions");
    actions.append(button("记录这处缺口的问题", "button quiet", () => openFeedback({ kind: "answer_binding",
      release_id: state.answer.release_id, packet_id: state.answer.packet_id, binding_id: gap.id }, short(gap.answer_span.quote, 110), "binding")));
    panel.append(back, actions);
    panel.scrollTop = 0;
  }

  function useExample(example) {
    if (state.searchBusy) { setStatus($("app-status"), "当前检索正在进行，完成后可以继续换题。", false); return; }
    state.search = null;
    state.selectedSpan = null;
    $("search-intro").hidden = false;
    $("search-results").hidden = true;
    $("search-results").replaceChildren();
    clearReader($("search-reader"), "准备好问题后，点击“查找材料”。", "不会生成新的回答。");
    $("question-input").value = example.question;
    $("example-details").open = false;
    moveTo("#materials");
    $("question-input").focus();
    $("question-input").scrollIntoView({ block: "nearest" });
  }

  function formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "时间未记录";
    return new Intl.DateTimeFormat("zh-CN", { timeZone: "Asia/Shanghai", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  }

  async function loadFeedback() {
    const sequence = ++state.feedbackSequence;
    setStatus($("feedback-status"), "正在读取本浏览器改进清单…");
    $("refresh-feedback").disabled = true;
    try {
      const result = await api("feedback");
      if (sequence !== state.feedbackSequence) return;
      if (!Array.isArray(result.items)) throw new Error("本浏览器改进清单不完整，请重试。");
      state.feedback = result.items;
      renderFeedback();
      setStatus($("feedback-status"), result.unreadable_feedback_count ? `${result.unreadable_feedback_count} 条旧记录暂不可读，其他问题仍可查看和记录。` : "");
    } catch (error) {
      if (sequence === state.feedbackSequence) setStatus($("feedback-status"), userMessage(error), true);
    } finally {
      if (sequence === state.feedbackSequence) $("refresh-feedback").disabled = false;
    }
  }

  function renderFeedback() {
    $("feedback-count").hidden = state.feedback.length === 0;
    $("feedback-count").textContent = String(state.feedback.length);
    const filtered = state.feedback.filter((item) => state.feedbackFilter === "all"
      || (state.feedbackFilter === "active" ? !["resolved", "wont_fix"].includes(item.status) : ["resolved", "wont_fix"].includes(item.status)));
    const container = $("feedback-list");
    container.replaceChildren();
    if (!filtered.length) {
      const empty = el("div", undefined, "panel feedback-empty");
      empty.append(el("h2", state.feedback.length ? "这个分类下还没有记录。" : "还没有记录问题。"),
        el("p", "阅读材料或核查回答时，可以从具体片段记录问题，也可以先写一条使用观察。"),
        button("记录第一个问题", "button quiet", () => openFeedback()));
      container.append(empty);
      return;
    }
    for (const item of filtered) {
      const card = el("article", undefined, "panel feedback-card");
      const header = el("div", undefined, "feedback-card-head");
      header.append(el("h3", item.title), el("span", statuses[item.status] || "状态未识别", `status-pill${["resolved", "wont_fix"].includes(item.status) ? " is-closed" : ""}`));
      card.append(header, el("p", item.description || "没有补充说明。", "feedback-description"),
        el("p", `${categories[item.category] || "其他"} · ${item.anchor ? "已关联具体片段" : "一般观察"} · ${formatTime(item.updated_at || item.created_at)}`, "feedback-meta"));
      const details = el("details", undefined, "feedback-history");
      details.append(el("summary", `处理记录 · ${Array.isArray(item.events) ? item.events.length : item.event_count || 0} 条`));
      const events = el("ol", undefined, "feedback-events");
      for (const event of item.events || []) {
        const record = el("li");
        record.append(el("p", `${statuses[event.status] || "状态未识别"} · ${formatTime(event.created_at)}`), el("p", event.note, "event-note"));
        events.append(record);
      }
      details.append(events);
      if (item.anchor) details.append(button("回到问题发生的位置", "text-button", () => followAnchor(item.anchor)));
      const form = el("form", undefined, "feedback-update");
      const statusId = `status-${item.id}`, noteId = `note-${item.id}`;
      const label = el("label", "添加处理状态与说明");
      label.htmlFor = statusId;
      const select = el("select");
      select.id = statusId;
      for (const [value, text] of Object.entries(statuses)) select.append(new Option(text, value));
      select.value = Object.hasOwn(statuses, item.status) ? item.status : "open";
      const note = el("textarea");
      note.id = noteId;
      note.rows = 2;
      note.maxLength = 2000;
      note.required = true;
      note.placeholder = "写下核查结果或下一步处理说明";
      note.setAttribute("aria-label", "处理说明（必填）");
      const submit = el("button", "保存处理记录", "button quiet");
      submit.type = "submit";
      const status = el("p", "", "inline-status");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      form.append(label, select, note, submit, status);
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const text = note.value.trim();
        if (!text) { note.focus(); return; }
        submit.disabled = true;
        setStatus(status, "正在保存处理记录…");
        try {
          const updated = await api(`feedback/${encodeURIComponent(item.id)}/events`, { method: "POST", body: { status: select.value, note: text } });
          state.feedback = state.feedback.map((current) => current.id === updated.id ? updated : current);
          renderFeedback();
          setStatus($("feedback-status"), "处理记录已保存到此浏览器；未上传网站，原问题与既有记录已保留。");
        } catch (error) { setStatus(status, userMessage(error), true); }
        finally { submit.disabled = false; }
      });
      details.append(form);
      card.append(details);
      container.append(card);
    }
  }

  async function followAnchor(anchor) {
    if (anchor.corpus_identity !== materialIdentity) { setStatus($("feedback-status"), "这条记录属于另一版公开材料，原记录保留，未自动改绑。请导出核查。", true); return; }
    if (anchor.kind === "search_span") {
      showView("materials");
      await restoreSearch(anchor.search_id);
      if (state.search?.id === anchor.search_id) {
        selectSearchSpan(anchor.span_id);
        if (location.hash !== `#search/${anchor.search_id}`) location.hash = `#search/${encodeURIComponent(anchor.search_id)}`;
      }
    } else if (anchor.kind === "answer_binding") {
      const entry = state.bootstrap.cases.find((item) => item.release_id === anchor.release_id && item.packet_id === anchor.packet_id);
      if (!entry) { setStatus($("feedback-status"), "关联的历史回答不在当前可读取范围中。", true); return; }
      showView("answers");
      await loadAnswer(entry);
      if (state.answer?.case_id === entry.id) {
        selectBinding(anchor.binding_id);
        if (location.hash !== `#case/${entry.id}`) location.hash = `#case/${encodeURIComponent(entry.id)}`;
      }
    }
  }

  function openFeedback(anchor = null, description = "", category = "other") {
    state.dialogOpener = document.activeElement;
    state.feedbackAnchor = anchor;
    $("feedback-form").reset();
    $("feedback-category").value = Object.hasOwn(categories, category) ? category : "other";
    $("feedback-anchor").hidden = !description;
    $("feedback-anchor").textContent = description ? `${anchor ? "关联位置" : "正在核查"}：${description}` : "";
    setStatus($("feedback-save-status"), "");
    $("feedback-dialog").showModal();
    $("feedback-title").focus();
  }

  function closeFeedback() {
    if ($("save-feedback").disabled) return;
    $("feedback-dialog").close();
    state.feedbackAnchor = null;
    state.dialogOpener?.focus?.();
  }

  async function saveFeedback(event) {
    event.preventDefault();
    const title = $("feedback-title").value.trim();
    if (!title) { $("feedback-title").focus(); return; }
    const payload = { title, description: $("feedback-description").value.trim(), category: $("feedback-category").value };
    if (state.feedbackAnchor) payload.anchor = state.feedbackAnchor;
    $("save-feedback").disabled = true;
    setStatus($("feedback-save-status"), "正在保存到本浏览器…");
    try {
      const saved = await api("feedback", { method: "POST", body: payload });
      state.feedback = [saved, ...state.feedback.filter((item) => item.id !== saved.id)];
      renderFeedback();
      $("feedback-dialog").close();
      state.feedbackAnchor = null;
      setStatus($("app-status"), "问题已保存到此浏览器的改进清单；未上传网站，可以继续核查材料。");
      state.dialogOpener?.focus?.();
    } catch (error) { setStatus($("feedback-save-status"), userMessage(error), true); }
    finally { $("save-feedback").disabled = false; }
  }

  async function initialize() {
    try {
      const bootstrap = await api("bootstrap");
      if (bootstrap.mode !== "public_browser_workbench" || !Array.isArray(bootstrap.examples)
        || !Array.isArray(bootstrap.cases) || bootstrap.capabilities?.new_model_answer !== false) {
        throw new Error("工作台未取得完整的本地状态，请刷新后重试。");
      }
      state.bootstrap = bootstrap;
      $("library-summary").textContent = `${Number(bootstrap.source_count) || 0} 份公开文本 · ${Number(bootstrap.block_count) || 0} 个文本块`;
      $("question-input").disabled = false;
      $("search-submit").disabled = false;
      $("case-select").replaceChildren(...bootstrap.cases.map((entry) => new Option(entry.title, entry.id)));
      $("case-select").disabled = bootstrap.cases.length === 0;
      for (const example of bootstrap.examples) {
        if (typeof example.question !== "string") continue;
        const node = button(undefined, "example-button", () => useExample(example));
        node.append(el("span", titles[example.need_id] || "研究问题", "example-label"), el("span", example.question));
        $("example-list").append(node);
      }
      renderRecentSearches();
      await readRoute();
      if (bootstrap.unreadable_search_count && state.view === "materials") setStatus($("app-status"), `${bootstrap.unreadable_search_count} 条旧查找暂不可读，不影响新问题查找。`);
    } catch (error) {
      setStatus($("app-status"), userMessage(error), true);
      $("library-summary").textContent = "公开文本尚未连接";
      const retry = button("重新连接", "button quiet", () => location.reload());
      $("app-status").append(el("span", " "), retry);
    }
  }

  for (const nav of document.querySelectorAll("[data-view]")) nav.addEventListener("click", () => {
    const view = nav.dataset.view;
    if (view === "answers") moveTo(state.currentCase ? `#case/${encodeURIComponent(state.currentCase.id)}` : "#answers");
    else if (view === "materials") moveTo(state.search ? `#search/${encodeURIComponent(state.search.id)}` : "#materials");
    else moveTo("#feedback");
  });
  for (const filter of document.querySelectorAll("[data-filter]")) filter.addEventListener("click", () => {
    state.feedbackFilter = filter.dataset.filter;
    for (const node of document.querySelectorAll("[data-filter]")) {
      const active = node === filter;
      node.classList.toggle("is-current", active);
      node.setAttribute("aria-pressed", String(active));
    }
    renderFeedback();
  });
  $("question-form").addEventListener("submit", submitSearch);
  $("question-input").addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter" && !state.searchBusy) {
      event.preventDefault();
      $("question-form").requestSubmit();
    }
  });
  $("case-select").addEventListener("change", () => moveTo(`#case/${encodeURIComponent($("case-select").value)}`));
  $("new-feedback").addEventListener("click", () => openFeedback());
  $("refresh-feedback").addEventListener("click", () => void loadFeedback());
  $("feedback-form").addEventListener("submit", saveFeedback);
  $("close-feedback").addEventListener("click", closeFeedback);
  $("cancel-feedback").addEventListener("click", closeFeedback);
  $("feedback-dialog").addEventListener("cancel", (event) => {
    if ($("save-feedback").disabled) event.preventDefault();
  });
  for (const node of document.querySelectorAll(".add-general-feedback")) node.addEventListener("click", () => openFeedback(null, state.answer?.question || "历史回答", "binding"));
  window.addEventListener("hashchange", () => void readRoute());
  $("export-records").addEventListener("click", exportRecords);
  $("download-records").addEventListener("click", () => setStatus($("export-status"),"已请求下载；网页无法确认文件是否保存。若被拦，请全选 JSON 手动复制保存。"));
  $("select-export").addEventListener("click", () => {
    $("export-json").focus();$("export-json").select();
    setStatus($("export-status"),"已选中完整 JSON，请使用复制操作并保存到自己的文件；尚未确认备份完成。");
  });
  $("close-export").addEventListener("click", () => {
    $("export-panel").hidden=true;
    if(exportURL)URL.revokeObjectURL(exportURL);
    exportURL=null;$("download-records").removeAttribute("href");
    $("export-records").focus();
  });
  window.addEventListener("storage", (event) => { if (event.key === STORE_KEY) storageNotice("另一个页面更新了本浏览器记录，请刷新后继续；当前内容未自动覆盖。", true); });
  void initialize();
})();
