class a extends Error{}class ve extends Error{}class G{value;constructor(t){this.value=t}}function xe(e){if(!Number.isFinite(e))throw new a("non-finite float");if(Number.isInteger(e)&&Math.abs(e)<1e16)return e.toFixed(1);const t=Math.abs(e);if(t!==0&&(t<1e-4||t>=1e16)){const[r,s]=e.toExponential().split("e"),o=s.startsWith("-")?"-":"+",l=s.replace(/^[+-]/,"").padStart(2,"0");return`${r}e${o}${l}`}return String(e)}function re(e,t=2,r=0){const s=" ".repeat(t*(r+1)),o=" ".repeat(t*r);if(e instanceof G)return xe(e.value);if(e==null)return"null";if(typeof e=="number"){if(!Number.isFinite(e))throw new a("non-finite number");return String(e)}if(typeof e=="boolean")return e?"true":"false";if(typeof e=="string")return JSON.stringify(e);if(Array.isArray(e))return e.length===0?"[]":`[
${e.map(h=>s+re(h,t,r+1)).join(`,
`)}
${o}]`;const l=Object.entries(e);return l.length===0?"{}":`{
${l.map(([h,u])=>`${s}${JSON.stringify(h)}: ${re(u,t,r+1)}`).join(`,
`)}
${o}}`}function ee(e,t){let r=e;for(const[s,o]of t)r=r.split(`{{ ${s} }}`).join(typeof o=="string"?o:re(o));return r}function X(e){if(e instanceof G)return xe(e.value);if(e==null)return"None";if(typeof e=="boolean")return e?"True":"False";if(typeof e=="number")return String(e);if(typeof e=="string"){const t=e.includes("'")&&!e.includes('"')?'"':"'";let r=t;for(const s of e){const o=s.codePointAt(0);s==="\\"?r+="\\\\":s===t?r+="\\"+t:s===`
`?r+="\\n":s==="\r"?r+="\\r":s==="	"?r+="\\t":o<32||o>=127&&o<=160?r+="\\x"+o.toString(16).padStart(2,"0"):o>160&&/[\p{C}\p{Z}]/u.test(s)?r+=o<=255?"\\x"+o.toString(16).padStart(2,"0"):o<=65535?"\\u"+o.toString(16).padStart(4,"0"):"\\U"+o.toString(16).padStart(8,"0"):r+=s}return r+t}return Array.isArray(e)?`[${e.map(X).join(", ")}]`:`{${Object.entries(e).map(([t,r])=>`${X(t)}: ${X(r)}`).join(", ")}}`}const j=e=>typeof e=="object"&&e!==null&&!Array.isArray(e);function M(e,t,r){const s=Object.keys(e).filter(o=>!t.includes(o));if(s.length)throw new a(`${r}: unexpected field(s) ${s.join(", ")}`)}function D(e,t){if(typeof e!="string")throw new a(`${t} must be a string`);return e}function le(e,t){if(!Array.isArray(e)||!e.every(r=>typeof r=="string"))throw new a(`${t} must be a list of strings`);return e}function me(e,t){if(e!=="low"&&e!=="medium"&&e!=="high")throw new a(`${t} must be low, medium or high`);return e}function pe(e,t){if(typeof e!="number"||!Number.isFinite(e))throw new a(`${t} must be a number`);return e}function Te(e,t){if(typeof e!="number"||!Number.isInteger(e))throw new a(`${t} must be an integer`);return e}function Ie(e){if(!j(e))throw new a("express_json must be an object");if(M(e,["expression_strategy","core_beliefs"],"express_json"),!j(e.expression_strategy))throw new a("expression_strategy must be an object");return{expression_strategy:e.expression_strategy,core_beliefs:e.core_beliefs===void 0?[]:le(e.core_beliefs,"core_beliefs")}}function qe(e){if(!j(e))throw new a("instant must be an object");return M(e,["closure_level","trust_level"],"instant"),{closure_level:me(e.closure_level,"closure_level"),trust_level:me(e.trust_level,"trust_level")}}function Ee(e){if(!j(e))throw new a("RawIntent must be an object");M(e,["answer_goal","content_to_reveal","content_to_hide","directness","answer_length","should_avoid_medical_terms"],"RawIntent");let t=null;if(e.directness!==void 0&&e.directness!==null&&(t=pe(e.directness,"directness"),t<0||t>1))throw new a("directness must be between 0 and 1");const r=e.answer_length;if(r!=="short"&&r!=="medium"&&r!=="long"&&r!=="unused")throw new a("answer_length is invalid");let s=!0;if(e.should_avoid_medical_terms!==void 0){if(e.should_avoid_medical_terms!==null&&typeof e.should_avoid_medical_terms!="boolean")throw new a("should_avoid_medical_terms must be a boolean");s=e.should_avoid_medical_terms}return{answer_goal:D(e.answer_goal,"answer_goal"),content_to_reveal:le(e.content_to_reveal,"content_to_reveal"),content_to_hide:le(e.content_to_hide,"content_to_hide"),directness:t,answer_length:r,should_avoid_medical_terms:s}}const he=["none","intent","humanizer","both"];function Ae(e){if(!j(e))throw new a("Judge output must be an object");M(e,["pass","passed","score","error_type","diagnosis","issues","feedback_to_intent_agent","feedback_to_humanizer_agent","intent_rule","humanizer_rule"],"JudgeResult");const t="pass"in e?e.pass:e.passed;if(typeof t!="boolean")throw new a("pass must be a boolean");const r=Te(e.score,"score");if(r<1||r>5)throw new a("score must be 1 to 5");const s=D(e.error_type,"error_type");if(!he.includes(s))throw new a("error_type is invalid");const o=y=>e[y]===void 0?"":D(e[y],y).trim(),l=e.issues===void 0?[]:e.issues;if(!Array.isArray(l))throw new a("issues must be a list");const h=l.map(y=>{if(!j(y))throw new a("issue must be an object");M(y,["dimension","evidence","why_problematic","repair_target","repair_instruction"],"JudgeIssue");const x={};for(const k of["dimension","evidence","why_problematic","repair_instruction"]){const g=D(y[k],k).trim();if(!g)throw new a("Judge issue fields must not be empty");x[k]=g}const v=D(y.repair_target,"repair_target");if(!he.includes(v))throw new a("repair_target is invalid");return{dimension:x.dimension,evidence:x.evidence,why_problematic:x.why_problematic,repair_target:v,repair_instruction:x.repair_instruction}}),u={pass:t,score:r,error_type:s,diagnosis:o("diagnosis"),issues:h,feedback_to_intent_agent:o("feedback_to_intent_agent"),feedback_to_humanizer_agent:o("feedback_to_humanizer_agent"),intent_rule:o("intent_rule"),humanizer_rule:o("humanizer_rule")};if(u.pass){if(u.error_type!=="none")throw new a("pass=true requires error_type none");if(u.issues.length)throw new a("pass=true requires empty issues");if(u.feedback_to_intent_agent||u.feedback_to_humanizer_agent||u.intent_rule||u.humanizer_rule)throw new a("pass=true requires empty feedback and rules");return u}if(u.error_type==="none")throw new a("pass=false requires an error_type");if(!u.issues.length)throw new a("pass=false requires at least one issue");if(u.issues.some(y=>y.repair_target==="none"))throw new a("failing issues need a repair target");if(["intent","both"].includes(u.error_type)&&(!u.feedback_to_intent_agent||!u.intent_rule))throw new a("intent issues need intent feedback and rule");if(["humanizer","both"].includes(u.error_type)&&(!u.feedback_to_humanizer_agent||!u.humanizer_rule))throw new a("humanizer issues need humanizer feedback and rule");return u}const ge=["up","down","unchanged"],fe=["none","weak","medium","strong"],we={weak:.1,medium:.2,strong:.3};function Oe(e){if(!j(e))throw new a("transition signal must be an object");M(e,["trust_direction","trust_intensity","openness_direction","openness_intensity","trust_reason","openness_reason","short_term_emotion"],"InstantStateTransitionSignal");const t=(s,o)=>{const l=D(e[s],s);if(!o.includes(l))throw new a(`${s} is invalid`);return l},r={trust_direction:t("trust_direction",ge),trust_intensity:t("trust_intensity",fe),openness_direction:t("openness_direction",ge),openness_intensity:t("openness_intensity",fe),trust_reason:D(e.trust_reason,"trust_reason").trim(),openness_reason:D(e.openness_reason,"openness_reason").trim(),short_term_emotion:e.short_term_emotion===void 0?{}:e.short_term_emotion};if(!j(r.short_term_emotion))throw new a("short_term_emotion must be an object");for(const s of["trust","openness"]){const o=r[`${s}_direction`],l=r[`${s}_intensity`];if(o==="unchanged"&&l!=="none")throw new a(`${s}: unchanged requires none`);if(o!=="unchanged"&&l==="none")throw new a(`${s}: up/down cannot be none`)}if(!r.trust_reason||!r.openness_reason)throw new a("state reasons must not be empty");return r}function He(e){if(e==null)return[];if(Array.isArray(e))return e.map(ye);if(!j(e))throw new a("history_json must be an object or a list");const t=e.history??[];if(!Array.isArray(t))throw new a("history_json.history must be a list");return t.map(ye)}function ye(e){return typeof e=="string"?e:X(e)}const ue=e=>({answer_goal:e.answer_goal,content_to_reveal:e.content_to_reveal,content_to_hide:e.content_to_hide,directness:e.directness===null?null:new G(e.directness),answer_length:e.answer_length,should_avoid_medical_terms:e.should_avoid_medical_terms}),de=e=>({turn_id:e.turn_id,doctor:e.doctor,raw_intent:e.raw_intent?ue(e.raw_intent):null,patient:e.patient}),te=e=>({background_text:e.background_text,history:e.history,long_term:{expression_strategy:e.long_term.expression_strategy,core_beliefs:e.long_term.core_beliefs},instant:{closure_level:e.instant.closure_level,trust_level:e.instant.trust_level}}),Ne=e=>({closure_score:new G(e.closure_score),trust_score:new G(e.trust_score),closure_evidence:e.closure_evidence,trust_evidence:e.trust_evidence,last_delta:Object.fromEntries(Object.entries(e.last_delta).map(([t,r])=>[t,new G(r)])),short_term_emotion:e.short_term_emotion});class Pe{calls=0;promptTokens=0;completionTokens=0;config;fetchImpl;signal;onCall;constructor(t,r,s,o){this.config=t,this.fetchImpl=r,this.signal=s,this.onCall=o}reasoningPayload(){const t=this.config.reasoningProtocol??"auto",r=this.config.reasoningEnabled??!1;return t==="omit"?{}:t==="thinking"?{thinking:{type:r?"enabled":"disabled"}}:t==="enable_thinking"?{enable_thinking:r}:t==="reasoning_effort"?{reasoning_effort:r?"medium":"none"}:this.config.model.toLowerCase().includes("deepseek")?{thinking:{type:r?"enabled":"disabled"}}:r?{thinking:{type:"enabled"}}:{}}async complete(t,r){const s={model:this.config.model,messages:[{role:"user",content:t}],max_tokens:this.config.maxTokens??15e3,temperature:r??this.config.temperature??.7,...this.reasoningPayload()};let o;try{o=await this.fetchImpl(`${this.config.baseUrl.replace(/\/+$/,"")}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${this.config.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(s),signal:this.signal})}catch(v){throw v.name==="AbortError"?v:new Error(`Could not reach the provider (network or CORS): ${v.message}`)}const l=await o.text();if(!o.ok){const v=l.slice(0,300);throw[401,403,404].includes(o.status)?new ve(`HTTP ${o.status}: ${v}`):new Error(`HTTP ${o.status}: ${v}`)}let h;try{h=JSON.parse(l)}catch{throw new Error("Provider response is not valid JSON.")}if(!j(h))throw new Error("Provider response must be an object.");if(h.error&&!h.choices)throw new Error(`Provider error: ${JSON.stringify(h.error).slice(0,300)}`);this.calls+=1,j(h.usage)&&(this.promptTokens+=Number(h.usage.prompt_tokens)||0,this.completionTokens+=Number(h.usage.completion_tokens)||0),this.onCall?.(this);const u=h.choices;if(!Array.isArray(u)||!u.length)throw new Error("Provider response has no choices.");const y=j(u[0])&&j(u[0].message)?u[0].message:{},x=Re(y.content).trim();if(!x)throw new Error("Provider returned empty content.");return x}async completeJson(t,r){const s=await this.complete(t,r);try{return Qe(s)}catch(o){throw new a(`Could not parse JSON (${o.message}); first 200 chars: ${s.slice(0,200)}`)}}}function Re(e){return e==null?"":typeof e=="string"?e:Array.isArray(e)?e.map(t=>typeof t=="string"?t:j(t)&&typeof t.text=="string"?t.text:"").join(""):String(e)}function Je(e){if(!e.startsWith("```"))return e;const t=e.split(/\r?\n/);return t[0].startsWith("```")&&t.shift(),t.length&&t[t.length-1].startsWith("```")&&t.pop(),t.join(`
`).trim()}function ze(e){const t=e.indexOf("{");if(t<0)throw new Error("no JSON object");let r=0,s=!1,o=!1;for(let l=t;l<e.length;l++){const h=e[l];if(o){o=!1;continue}if(h==="\\"){o=!0;continue}if(h==='"'){s=!s;continue}if(!s){if(h==="{")r++;else if(h==="}"&&--r===0)return e.slice(t,l+1)}}throw new Error("incomplete JSON object")}function Qe(e){const t=Je(e.trim());let r;try{r=JSON.parse(t)}catch{const s=ze(t);try{r=JSON.parse(s)}catch{r=JSON.parse(s.replace(/"(?:[^"\\]|\\.)*"/gs,o=>o.replace(/\r?\n/g,"\\n").replace(/\t/g,"\\t")),function(o,l){return j(l)?Object.fromEntries(Object.entries(l).map(([h,u])=>[h.replace(/\\n|\r|\n/g,""),u])):l})}}if(!j(r))throw new Error("JSON reply must be an object");return r}const be=e=>e<.33?"low":e<.66?"medium":"high",ke={low:.165,medium:.495,high:.83},ce=e=>Math.min(Math.max(e,0),1);async function Le(e,t,r,s){const o=s.onEvent??(()=>{}),l=s.fetchImpl??globalThis.fetch.bind(globalThis),h=s.sleep??(p=>new Promise(b=>setTimeout(b,p))),u=s.maxSelfEvolutionAttempts??2,y=s.instantStateWindowSize??3,x=s.errorRetryAttempts??5,v=s.errorRetrySleepMs??5e3,k=new Pe(t,l,s.signal,p=>o({type:"call",calls:p.calls,promptTokens:p.promptTokens,completionTokens:p.completionTokens})),{maxTurns:g,questions:S}=s;if(!Number.isInteger(g)||g<1)throw new a("max_turns must be a positive integer");if(g>S.length)throw new a(`Requested ${g} turns, but the fixed schedule has ${S.length} questions.`);if(!e.background_text.trim())throw new a("The patient background must not be empty.");const H=He(e.history_json),Q=Ie(e.express_json),U=e.scale_json,B={intent:new Map,humanizer:new Map},Y=(p,b,$)=>{const I=$.trim();I&&p.set(b,[...p.get(b)??[],I])};async function N(p,b){for(let $=1;;$++)try{return await b()}catch(I){if(I.name==="AbortError"||I instanceof ve)throw I;if($>=x)throw new Error(`${p} failed ${$} times: ${I.message}`);if(o({type:"retry",stage:p,attempt:$,max:x,error:I.message}),v&&await h(v),s.signal?.aborted)throw new DOMException("Aborted","AbortError")}}o({type:"stage",stage:"init"});let E=await N("instant_state_initialization_agent",async()=>{const p=await k.completeJson(ee(r.stateInit,[["background_text",e.background_text],["history",H],["long_term_patient_state",Q]]),0);return M(p,["instant"],"InstantStateInitializationResult"),qe(p.instant)});o({type:"state-initialized",instant:E});let L={closure_score:ke[E.closure_level],trust_score:ke[E.trust_level],closure_evidence:[],trust_evidence:[],last_delta:{},short_term_emotion:{mood:"unknown",toward_doctor:"cautiously cooperative"}},O={background_text:e.background_text,history:H,long_term:Q,instant:E};const R=[];for(let p=0;p<g;p++){const b=S[p];if(typeof b!="string"||!b.trim())throw new a("Doctor questions must be non-empty strings.");const $=R.map(de);let I="",K="",F,_="",A;for(let n=0;n<u;n++){o({type:"stage",stage:"intent",turn:p,attempt:n});const i=[...B.intent.get(b)??[]];F=await N(`turn_${p}.attempt_${n}.intent_agent`,async()=>Ee(await k.completeJson(ee(r.intent,[["patient_state",te(O)],["phq9_scale",U],["doctor_question",b],["dialogue_history",$],["judge_feedback",I],["retrieved_rules",i]])))),o({type:"stage",stage:"humanizer",turn:p,attempt:n});const d=[...B.humanizer.get(b)??[]];if(_=await N(`turn_${p}.attempt_${n}.humanizer_agent`,async()=>(await k.complete(ee(r.humanizer,[["patient_state",te(O)],["phq9_scale",U],["raw_intent",ue(F)],["doctor_question",b],["dialogue_history",$],["judge_feedback",K],["retrieved_rules",d]]))).trim().replace(/^"+|"+$/g,"")),o({type:"stage",stage:"judge",turn:p,attempt:n}),A=await N(`turn_${p}.attempt_${n}.judge_agent`,async()=>Ae(await k.completeJson(ee(r.judge,[["patient_state",te(O)],["phq9_scale",U],["raw_intent",ue(F)],["patient_answer",_],["doctor_question",b],["dialogue_history",$]])))),o({type:"candidate",turn:p,attempt:n,rawIntent:F,answer:_,judge:A}),A.pass)break;Y(B.intent,b,A.intent_rule),Y(B.humanizer,b,A.humanizer_rule),I=A.feedback_to_intent_agent,K=A.feedback_to_humanizer_agent}const ne={turn_id:p,doctor:b,raw_intent:F,patient:_};R.push(ne),o({type:"stage",stage:"state",turn:p});const W=R.slice(-y),J=L;L=await N(`turn_${p}.instant_state_transition_agent`,async()=>{const n=Oe(await k.completeJson(ee(r.stateTransition,[["patient_state",te(O)],["instant_state_tracker",Ne(J)],["dialogue_window",W.map(de)]]))),i=(T,q,f)=>ce(q==="unchanged"?T:T+(q==="down"?-we[f]:we[f])),d=i(J.trust_score,n.trust_direction,n.trust_intensity),m=i(1-J.closure_score,n.openness_direction,n.openness_intensity),w=ce(1-m);return{closure_score:w,trust_score:d,closure_evidence:[...J.closure_evidence,n.openness_reason].slice(-12),trust_evidence:[...J.trust_evidence,n.trust_reason].slice(-12),last_delta:{closure_score:w-J.closure_score,trust_score:d-J.trust_score},short_term_emotion:Object.keys(n.short_term_emotion).length?n.short_term_emotion:J.short_term_emotion}}),E={closure_level:be(L.closure_score),trust_level:be(L.trust_score)},O={...O,instant:E},o({type:"turn",turn:ne,instant:E,tracker:L})}return{patient_state:O,dialogue:R,stats:{calls:k.calls,promptTokens:k.promptTokens,completionTokens:k.completionTokens}}}function Ce(e){const t=e.phq9_gt??e.phq9??e;if(!Array.isArray(t.items))throw new a("PHQ-9 needs an items list");const r=[],s=new Map;for(const o of t.items){const l=o.key,h=o.question;if(typeof l!="string"||!l.trim()||typeof h!="string"||!h.trim())throw new a("PHQ-9 items require keys and question text");if(s.has(l))throw new a(`duplicate PHQ-9 key ${l}`);const u=pe(o.score,"score");if(u<0||u>3)throw new a("PHQ-9 item score must be in [0, 3]");s.set(l,u),r.push({key:l,question:h,max_score:3,score_rule:{0:"完全没有",1:"好几天",2:"超过一半天数",3:"几乎每天"}})}if(s.size!==9)throw new a("expected nine PHQ-9 items");return{definitions:r,targets:s}}function De(e,t){const r=e.map((s,o)=>({turn_id:s.turn_id??o,doctor:s.doctor.trim(),patient:s.patient.trim()}));return`你是“PHQ-9 长期一致性”评估员。
任务：只根据整段医患对话中患者暴露的信息，复现 PHQ-9 每个条目的分数。

重要规则：
- 只依据患者回答评分。
- 不要把医生问题当成患者症状。
- 所有输入条目都必须输出。
- 信息不足时仍给最保守的合理分数，并在 evidence 里说明“不足”。
- score 必须是 0 到 3 的数值。

只输出 JSON 对象：
{
  "items": [
    {
      "key": "sleep_problem",
      "score": 3,
      "evidence": "患者原话或简短概括"
    }
  ],
  "total": 0,
  "notes": ["可选简短观察"]
}

PHQ-9 条目：
${X(t)}

整段对话：
${X(r)}`}async function Fe(e,t,r,s={}){const{definitions:o,targets:l}=Ce(t),u=await new Pe(r,s.fetchImpl??globalThis.fetch.bind(globalThis),s.signal).completeJson(De(e,o),0);if(!Array.isArray(u.items))throw new a("judge output needs an items list");const y=new Set,x=u.items.map(g=>{const S=String(g.key);if(y.has(S)||!l.has(S))throw new a(`unknown or duplicate predicted key ${S}`);y.add(S);const H=pe(g.score??g.pred_score,"score");if(H<0||H>3)throw new a("PHQ-9 item score must be in [0, 3]");const Q=l.get(S);return{key:S,score:H,gt_score:Q,abs_error:Math.abs(H-Q),evidence:String(g.evidence??"")}});if(y.size!==l.size)throw new a("judge did not score every target item");const v=x.reduce((g,S)=>g+S.score,0),k=[...l.values()].reduce((g,S)=>g+S,0);return{pred_items:x,gt_total:k,pred_total:v,mean_abs_error:x.reduce((g,S)=>g+S.abs_error,0)/9,total_abs_error:Math.abs(v-k),notes:u.notes??[]}}function Me(e){return e.map(t=>`第 ${t.turn_id+1} 轮
医生：${t.doctor}
患者：${t.patient}`).join(`

`)+`
`}function Ue(e){return re({patient_state:te(e.patient_state),dialogue:e.dialogue.map(de)})+`
`}const Be=`你是 IntentAgent，负责站在患者内心视角，规划本轮“想说什么、暂时不说什么、说到什么程度”。

只输出 JSON 对象，不输出最终患者话术，不输出解释。Patient State 的 background_text 和 history 是只读事实背景，long_term 是稳定表现画像，instant 是当前互动状态；PHQ-9 Scale 是过去两周九项症状及频率的只读事实约束。不要修改任何输入。

如果 Judge Feedback 非空，优先按反馈修正。Retrieved Intent Rules 是可参考经验，但当前 patient_state、医生问题和对话历史优先。

硬性约束：
- 你可以适当体现或披露PatientState 中的core_beliefs，在相关的时候可以尝试去委婉提及，在何时的时候也可以直接表露；
- 如果 PHQ-9 Scale 非空，涉及 PHQ-9 症状的有无、过去两周频率和总分时，以其中对应 item 的 key、score、label 和 question 为最高优先级事实。score=0 表示完全没有，score=1 表示好几天，score=2 表示超过一半天数，score=3 表示几乎每天。
- background_text、history、long_term、instant 或既往对话若与 PHQ-9 Scale 的症状有无或频率冲突，不得据此改写量表事实；应按量表规划本轮回答，并避免延续冲突说法。
- 不要仅凭客观睡眠时长、周末补觉、工作时间、慢性病或生活压力，自行推断出量表中不存在的睡眠、疲倦或情绪症状。例如 sleep_problem=0 时，长睡眠时长本身不能被规划成“睡眠过多”的 PHQ 症状。
- PHQ-9 Scale 只约束事实，不要求患者主动说出分数、标签、量表名称或完整症状清单。只在当前医生问题相关时，把对应分值自然转换成患者能说出的频率。
- 不新增 background_text 和 history 中没有的关键事实。
- 患者已经来就诊，默认有基本求助意愿；普通症状、表层原因、频率、持续时间、影响和生活例子通常应披露。
- content_to_reveal 应多于 content_to_hide；只有高度敏感内容才隐藏，如自杀自伤和强烈羞耻等。
- 当directness较高时，患者可以选择不再隐藏，全部披露出来。
- 每轮至少提供一个和当前问题相关的新信息点，避免只重复“累、压力大、心情不好”等概括词。
- patient_state.instant 中的 trust_level/closure_level 是 low、medium、high 三档离散状态，只影响敏感内容的披露节奏，不应用来隐藏普通症状事实。
- 医生追问频率或程度时，可以自然说“几乎每天”“超过一半时间”“好几天”等，但只回答当前问题，不要一次性吐完整症状包。
- 不要默认总是 short；根据当前问题自然选择 short、medium 或 long。
- directness 必须在 0 到 1 之间。
- answer_length 只能是 short、medium、long。
- 字段必须严格符合 RawIntent schema。

RawIntent schema:
{
  "answer_goal": "str",
  "content_to_reveal": ["str"],
  "content_to_hide": ["str"],
  "directness": 0.0,
  "answer_length": "medium",
  "should_avoid_medical_terms": true
}

# Input

Patient State:
{{ patient_state }}

PHQ-9 Scale:
{{ phq9_scale }}

Dialogue History:
{{ dialogue_history }}

Judge Feedback:
{{ judge_feedback }}

Retrieved Intent Rules:
{{ retrieved_rules }}

Doctor Question:
{{ doctor_question }}
`,Ke=`你是 HumanizerAgent，负责把 RawIntent 写成患者自然说出的回答。

只输出患者回答文本，不输出解释、标签、引号或 JSON。

请参考 patient_state.long_term.expression_strategy、patient_state.long_term.core_beliefs、patient_state.instant 的当前状态，以及 patient_state.background_text 和 patient_state.history 的只读事实背景，自由决定语气、长短、含糊程度和情绪表现。PHQ-9 Scale 是过去两周九项症状及频率的只读事实约束。如果 Judge Feedback 非空，优先按反馈修正。Retrieved Humanizer Rules 是可参考经验，但不能覆盖 RawIntent 或 PHQ-9 Scale 的事实边界。

硬性约束：
- 如果 PHQ-9 Scale 非空，涉及 PHQ-9 症状时必须保持对应 item 的极性和频率：score=0 完全没有，score=1 好几天，score=2 超过一半天数，score=3 几乎每天。不得在口语化改写时把频率增强、减弱或迁移到其他症状。
- 若 RawIntent 与 PHQ-9 Scale 冲突，以 PHQ-9 Scale 为准，只修正冲突的症状事实，不自行增加其他内容。
- 不要仅凭客观睡眠时长、周末补觉、工作时间、慢性病或生活压力推断新的 PHQ-9 症状。量表条目为0时，应保持明确否认；可以自然提到背景事实，但不能把它表述成该症状。
- 不要向医生机械说出“PHQ-9”“某项几分”“several_days”等量表名称、分数或内部标签；应转换成自然患者语言，并且只回答当前问题相关的条目。
- 参考 RawIntent.answer_length：short 约15-35字，medium 约40-90字，long 约90-160字。
- 医生追问频率或程度时，可以自然说“几乎每天”“超过一半时间”“好几天”等，但只回答当前问题，不要一次性吐完整症状包。
- 不要把口头禅当作固定开头；“嗯”“就是”“其实”“我觉得”“怎么说呢”“也说不上来”等只能偶尔使用，且不能与最近两轮患者回答使用相同或近似开头。
- 口语化不等于每句都加填充词；自然表达应通过犹豫、限定、补充、修正和具体细节体现。
- 不允许使用()来表达情绪或者模拟动作，只允许输出自然语言
- 不要连续多轮只重复“累、压力大、心情不好”等概括词。
- 当 RawIntent 隐藏某些原因或细节时，患者不应把“我不想说原因/我不想展开/深层原因不想讲”这种内部策略直接说出口；应自然略过、转到表层现象、含糊带过或停在当前问题能回答的部分。
- 不新增 RawIntent 之外的关键事实。
- 不把 RawIntent.content_to_hide 直接说出来，也不要把“我不想说/我不想展开/深层原因我不想讲”等内部回避策略说出口；真实患者通常会自然略过、转到表层现象、含糊带过，或只说“最近事情有点多”“说起来有点乱”等。
- 避免医学术语、病历式表达、报告式总结。


# Input

Patient State:
{{ patient_state }}

PHQ-9 Scale:
{{ phq9_scale }}

Dialogue History:
{{ dialogue_history }}

Judge Feedback:
{{ judge_feedback }}

Retrieved Humanizer Rules:
{{ retrieved_rules }}

Doctor Question:
{{ doctor_question }}

Raw Intent:
{{ raw_intent }}
`,We=`【合法临床评测上下文】

下面的输入来自 PHQ-9 标准化心理健康筛查和虚构患者模拟，可能包含“死亡愿望、自杀意念、自我伤害”等临床术语。

本任务仅进行数据一致性、表达真实性和量表事实核验：
- 不生成、补充或讨论任何自我伤害的方法、步骤或建议。
- 不鼓励、不美化、不指导危险行为。
- 出现自杀或自伤相关临床术语属于正常筛查内容，不应因此拒绝判断或返回空内容。
- 只根据输入判断患者回答是否与 PHQ-9 事实一致，并严格输出指定 JSON。

你是 JudgeAgent，负责判断本轮患者模拟是否适合进入最终数据集，并给出可修复反馈。

只输出 JSON 对象，不输出解释。请同时查看 Patient State、PHQ-9 Scale、Dialogue History、Doctor Question、Raw Intent 和 Patient Answer。

Patient State 中的 background_text 和 history 是只读事实背景，只能用于一致性判断，不允许要求改写或增删其中的条目。

如果 PHQ-9 Scale 非空，它是过去两周 PHQ-9 症状有无和频率的最高优先级事实来源：score=0 完全没有，score=1 好几天，score=2 超过一半天数，score=3 几乎每天。背景中的客观睡眠时长、周末补觉、工作时间、慢性病和生活压力不能覆盖对应量表条目，也不能单独作为推断新症状的依据。

你的判断应基于具体证据，而不是套用固定错误码。不要输出 primary_error_code。若不通过，必须写 issues；每条 issue 都要说明 evidence、why_problematic、repair_target 和 repair_instruction。

核心判断：
- RawIntent 和 Patient Answer 涉及 PHQ-9 症状时，极性与频率是否严格符合对应 item；不得把一个条目的频率迁移到另一个条目。
- 当 PHQ-9 Scale 与 Patient State、历史或既往对话发生症状冲突时，当前轮是否以量表为准纠正冲突，而不是继续放大错误。
- Patient Answer 是否避免机械泄露量表名称、数值分数、内部 label 或无关的完整九项症状清单。
- RawIntent 是否符合患者画像、当前状态、医生问题和对话进展。
- RawIntent 是否过度隐藏；普通症状、频率、持续时间和功能影响不应大量放入 content_to_hide。
- **RawIntent 是否符合Patient State 中的 core_beliefs**。
- **Patient Answer 的表述是否遵守了Patient State中的expression_strategy**。
- Patient Answer 是否遵守 RawIntent，尤其不能新增关键事实或泄露 content_to_hide。

注意：
- Patient Answer 是否机械使用固定口头禅开头；如果连续多轮以“嗯”“就是”“其实”“我觉得”“怎么说呢”“也说不上来”等相同或近似填充表达开头，应判为 humanizer 问题。
- Patient Answer 是否提供了当前问题下的新信息；连续重复“累、压力大、心情不好”等概括而无新增细节，应判为问题。
- Patient Answer 是否与患者画像、症状、历史和前文冲突，是否像真实患者自然表达，而不是像报告、教材、病历或高度自我分析。
- PHQ-9 不一致的修复对象应按错误来源决定：RawIntent 已经与量表冲突时判 intent；RawIntent 正确但 Patient Answer 改错频率或极性时判 humanizer；两者都错时判 both。
- 不要因为客观睡眠时长看起来过长或过短，就否决符合 sleep_problem 条目的明确回答；也不要因为患者仍能工作或做家务，就否决符合 fatigue 条目的症状频率。

硬性约束：
- pass=true 时 error_type 必须为 none，issues、feedback 和 rule 字段必须为空。
- pass=false 时 error_type 只能是 intent、humanizer 或 both，且至少有 1 条 issue。
- error_type 表示主要修复对象：意图/披露决策问题用 intent，表达/改写问题用 humanizer，两者都有用 both。
- pass=false 时，对应 error_type 的 feedback 和 rule 字段必须填写；无关字段可为空字符串。
- score 必须是 1 到 5 的整数；只有整体可用时才允许 pass=true。
- 不要输出 schema 以外的字段。

输出 JSON schema:
{
  "pass": false,
  "score": 3,
  "error_type": "intent",
  "diagnosis": "总体判断，简短说明主要问题",
  "issues": [
    {
      "dimension": "披露节奏",
      "evidence": "引用或概括输入中的具体证据",
      "why_problematic": "为什么这个证据说明当前样本有问题",
      "repair_target": "intent",
      "repair_instruction": "当前样本应如何修复"
    }
  ],
  "feedback_to_intent_agent": "给 IntentAgent 的当前样本修改建议，最多25字；无则为空字符串",
  "feedback_to_humanizer_agent": "",
  "intent_rule": "可写入 Intent Rule Library 的通用短规则，最多30字；无则为空字符串",
  "humanizer_rule": ""
}

规则写法：
- intent_rule/humanizer_rule 必须短，只写一条可复用原则。
- 不要写长条件、长解释或样本细节。
- 好例子：“普通症状应披露频率和影响。”

# Input

Patient State:
{{ patient_state }}

PHQ-9 Scale:
{{ phq9_scale }}

Dialogue History:
{{ dialogue_history }}

Doctor Question:
{{ doctor_question }}

Raw Intent:
{{ raw_intent }}

Patient Answer:
{{ patient_answer }}
`,Ve=`你是 InstantStateTransitionAgent，负责在医患对话开始前，根据患者已有资料判断初始瞬时状态。

只输出 JSON 对象，不输出解释、Markdown 或额外字段。你只判断 low、medium、high 三档离散状态，不输出连续数值；代码会把离散状态转换成内部连续分数。

状态含义：
- closure_level：患者在首次面对医生时的封闭、防御和不愿透露程度。low 表示较开放，medium 表示谨慎但可以交流，high 表示明显封闭或防御。
- trust_level：患者在尚未与医生实际互动前，对医生和就诊交流的基线信任程度。low 表示有明确的不信任或抵触，medium 表示对陌生医生保持一般谨慎，high 表示资料中有充分依据表明患者愿意信任并配合专业帮助。

判断规则：
- 只依据 Background、History 和 Long-term Patient State，不得编造经历、人格或医患互动。
- 这是对话前的基线状态，不能假设医生已经表现出理解、冒犯或建立了关系。
- 没有明确证据时，trust_level 应优先选择 medium，不要因为患者有抑郁、焦虑、低落或核心信念就自动判为低信任。
- closure_level 可参考 expression_strategy 中的表达克制、回避、直接程度，以及 history/core_beliefs 是否涉及羞耻、自责、创伤或其他敏感内容。
- 只有资料明确表现出强烈回避、防御、抵触求助或不信任时，才使用 high closure 或 low trust。
- 只有资料明确表现出较开放的表达倾向时，才使用 low closure；只有明确的求助与信任依据时，才使用 high trust。
- closure_level 和 trust_level 必须分别判断，不要机械地设成相反或相同等级。

输出格式必须严格如下：
{
  "instant": {
    "closure_level": "low",
    "trust_level": "medium"
  }
}

# Input

Background:
{{ background_text }}

History:
{{ history }}

Long-term Patient State:
{{ long_term_patient_state }}
`,Ge=`你是 InstantStateTransitionAgent，负责根据最近对话判断“当前这一轮 QA 让患者瞬时状态如何变化”。

只输出 JSON 对象，不输出解释。不要输出数值分数，也不要直接输出最终 trust_level 或 closure_level；代码会根据你的离散判断更新内部连续分数，并把公开状态映射为 low、medium、high。

请以当前 patient_state.instant 的离散状态和 Instant State Tracker 的内部连续分数为背景，重点判断 Dialogue Window 最后一轮 QA 暴露出的变化。历史对话只用于理解上下文，不要让很早以前的内容重复计权。

patient_state.background_text 和 patient_state.history 是只读事实背景，只用于理解患者稳定经历，不要把它们当作需要更新的状态。

硬性约束：
- trust_direction 表示当前 QA 让患者对医生的信任相较上一轮上升、下降还是不变，只能是 "up"、"down"、"unchanged"。
- openness_direction 表示当前 QA 让患者开放/愿意透露的程度相较上一轮上升、下降还是不变，只能是 "up"、"down"、"unchanged"。
- trust_intensity 表示 trust 变化幅度，只能是 "none"、"weak"、"medium"、"strong"。
- openness_intensity 表示 openness 变化幅度，只能是 "none"、"weak"、"medium"、"strong"。
- direction 为 "unchanged" 时，对应 intensity 必须是 "none"。
- direction 为 "up" 或 "down" 时，对应 intensity 必须是 "weak"、"medium" 或 "strong"，不能是 "none"。
- trust_reason 用一句短话说明 trust_direction 和 trust_intensity 的依据。
- openness_reason 用一句短话说明 openness_direction 和 openness_intensity 的依据。
- short_term_emotion 由你生成并保存在内部 tracker 中，只作为后续状态更新的内部参考，不会暴露给其他 Agent。
- 不凭空新增长期症状、事件、家庭关系或人格设定。
- 不要因为患者重复一个长期压力源就机械提高或降低信任；要看当前回答是否更具体、更回避、更防御或更愿意展开。
- reason 字段只写简短证据依据，不要写长篇推理过程。
- 输出必须符合 InstantStateTransitionSignal schema。

判断参考：
- trust 上升：患者更接住医生问题，承认困难，愿意继续谈，或表现出被理解。
- trust 下降：患者抵触医生、怀疑医生意图、被问后退缩，或因医生回应不当而更防御。
- trust 不变：患者只是常规回答，缺少对医生态度变化的证据。
- openness 上升：患者提供更具体的细节、频率、影响、例子，或透露更敏感内容。
- openness 下降：患者回避、含糊、否认、转移话题、只给空泛回答，或从具体回答变成防御性短答。
- openness 不变：回答信息量和暴露程度与上一轮大致一致。
- weak：变化轻微、证据较弱或只是语气/长度的小变化。
- medium：变化明确，能看出透露程度、防御程度或信任态度发生了可见变化。
- strong：变化很明显，例如从明显回避转为具体透露，或从配合转为强烈退缩/抵触。

InstantStateTransitionSignal schema:
{
  "trust_direction": "up",
  "trust_intensity": "weak",
  "openness_direction": "down",
  "openness_intensity": "medium",
  "trust_reason": "患者仍谨慎，但愿意接住医生问题继续说",
  "openness_reason": "患者回答变含糊，回避了刚被问到的敏感细节",
  "short_term_emotion": {
    "mood": "str",
    "toward_doctor": "str"
  }
}

# Input

Patient State:
{{ patient_state }}

Instant State Tracker:
{{ instant_state_tracker }}

Dialogue Window:
{{ dialogue_window }}
`,Xe=["可以简单介绍一下你的年龄、学业或工作情况吗？","你这次主要是因为什么不舒服来就诊的？这种不舒服大概从什么时候开始的？持续了多长时间？","这段时间你心情低落、空虚、麻木或者高兴不起来的情况有多频繁？如果有类似情况的话，通常会在什么情境下更明显？","你对以前感兴趣或者愿意做的事情，现在还有兴趣吗？这种提不起兴趣的情况大概有多频繁，具体表现是什么？","你最近一天通常都怎么过？和以前相比，活动量、主动性有什么变化吗？这种变化大概有多频繁？","你最近睡眠问题有多频繁？如果有的话，具体是入睡困难、夜间醒来、早醒、睡得太少、睡得太多，还是白天困倦？","你最近食欲或体重变化有多频繁？如果有，具体是吃不下、吃太多、吃饭不香，还是体重明显变化？","你最近疲倦、没精力、身体沉重或者什么都不想动的情况有多频繁？如果有的话，具体会怎么影响你一天的状态？","你做事和思考的速度有没有变化？如果有的话，这种情况有多频繁，比如反应变慢、说话变少，或者坐立不安、心里烦躁？","你的注意力和记忆力最近怎么样？如果变差的话，这种难以集中、容易走神或记不住事情的情况有多频繁？","你有没有觉得自己做错了事、拖累别人、对不起家人，或者觉得自己很没用？如果有的话，这些想法大概有多频繁？","你有没有觉得活着没意思，或者出现过不想活、伤害自己的想法？这种想法出现过吗？出现几次？最近有多频繁？","这些状态对你的工作、学习、家务、自我照顾、社交和出门见人有影响吗？如果有影响的话，哪些方面受影响最明显？"],Ye=`这是一份为软件演示从零编写的虚构画像。小禾在虚构的云杉镇修理舞台道具，业余喜欢给木偶设计帽子。近两周工作坊调整了排练时间，小禾有几晚没睡踏实，第二天做事容易累。
`,Ze={expression_style:"先用短句回答，再用工作坊的一件小事说明感受。",cognitive_communication_level:"习惯描述具体经过，很少概括自己的性格。"},et=["把事情一点点说清楚，别人就能帮上忙。","即使工作慢了下来，留下的东西也值得认真做好。"],tt={expression_strategy:Ze,core_beliefs:et},nt=["上周把原定周末的木偶彩排挪到傍晚后，小禾花了几天才重新安排作息。","有一次小禾忘记给道具车贴标签，同伴帮忙重新核对了清单。"],rt={history:nt},st="PHQ-9",ot="fictional-workshop-001",it=[{key:"interest_loss",question:"做事缺乏兴趣",score:0,label:"完全没有",question_with_score:"做事缺乏兴趣：完全没有"},{key:"depressed_mood",question:"感到情绪低落",score:1,label:"有几天",question_with_score:"感到情绪低落：有几天"},{key:"sleep_problem",question:"入睡或保持睡眠困难，或睡太多",score:1,label:"有几天",question_with_score:"入睡或保持睡眠困难，或睡太多：有几天"},{key:"fatigue",question:"容易疲乏、精力不足",score:1,label:"有几天",question_with_score:"容易疲乏、精力不足：有几天"},{key:"appetite_change",question:"食欲改变",score:0,label:"完全没有",question_with_score:"食欲改变：完全没有"},{key:"self_blame",question:"觉得自己让别人失望",score:0,label:"完全没有",question_with_score:"觉得自己让别人失望：完全没有"},{key:"concentration_problem",question:"难以集中注意力",score:1,label:"有几天",question_with_score:"难以集中注意力：有几天"},{key:"psychomotor_change",question:"动作或说话变慢，或坐立难安",score:0,label:"完全没有",question_with_score:"动作或说话变慢，或坐立难安：完全没有"},{key:"suicidal_ideation",question:"想到死亡或伤害自己",score:0,label:"完全没有",question_with_score:"想到死亡或伤害自己：完全没有"}],at=4,ct={scale_name:st,sample_id:ot,items:it,total:at},lt={intent:Be,humanizer:Ke,judge:We,stateInit:Ve,stateTransition:Ge},Se=document.querySelector("[data-paws-try]");Se&&ut(Se);function ut(e){const t=JSON.parse(e.dataset.copy??"{}"),r=n=>e.querySelector(n),s=n=>r(`[data-field="${n}"]`),o=(n,i,d="")=>{const m=r(`[data-status="${n}"]`);m.textContent=i,m.dataset.kind=d},l="paws-try-connection",h=()=>{const n=[];try{n.push(localStorage)}catch{}try{n.push(sessionStorage)}catch{}return n},u=s("provider"),y=()=>{const n=u.selectedOptions[0];n.value!=="custom"&&(s("baseUrl").value=n.dataset.base??"",s("model").value=n.dataset.model??""),s("model").placeholder=n.dataset.model||"model-name"};u.addEventListener("change",y),y();try{for(const n of h()){const i=n.getItem(l);if(!i)continue;const d=JSON.parse(i);d.provider&&(u.value=d.provider,y());for(const m of["baseUrl","model","apiKey","temperature","maxTokens","reasoningProtocol"])typeof d[m]=="string"&&(s(m).value=d[m]);s("remember").checked=n===h()[0]&&h().length>1;break}}catch{}const x=()=>{const n={provider:u.value};for(const m of["baseUrl","model","apiKey","temperature","maxTokens","reasoningProtocol"])n[m]=s(m).value;const[i,d]=h();try{s("remember").checked&&i?(i.setItem(l,JSON.stringify(n)),d?.removeItem(l)):(i?.removeItem(l),(d??i)?.setItem(l,JSON.stringify(n)))}catch{}};e.querySelectorAll("[data-field]").forEach(n=>n.addEventListener("change",()=>{["provider","baseUrl","model","apiKey","temperature","maxTokens","reasoningProtocol","remember"].includes(n.dataset.field)&&x()})),r('[data-action="toggle-key"]').addEventListener("click",n=>{const i=s("apiKey"),d=i.type==="password";i.type=d?"text":"password",n.currentTarget.textContent=d?t.hide:t.show});const v=()=>{const n=s("baseUrl").value.trim(),i=s("model").value.trim(),d=s("apiKey").value.trim();if(!/^https:\/\//.test(n)&&!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(n+"/"))throw new Error(t.errBaseUrl);if(!i)throw new Error(t.errModel);if(!d)throw new Error(t.errKey);const m=Number(s("temperature").value),w=Number(s("maxTokens").value);return{baseUrl:n,model:i,apiKey:d,temperature:Number.isFinite(m)?m:.7,maxTokens:Number.isInteger(w)&&w>0?w:8192,reasoningProtocol:s("reasoningProtocol").value}},k=n=>{const i=n.message??String(n);return/HTTP 401|HTTP 403/.test(i)?`${t.errAuth} (${i.slice(0,160)})`:/HTTP 404/.test(i)?`${t.errNotFound} (${i.slice(0,160)})`:/network or CORS/.test(i)?t.errNetwork:/HTTP 429/.test(i)?`${t.errRate} (${i.slice(0,160)})`:i};r('[data-action="test"]').addEventListener("click",async()=>{let n;try{n=v()}catch(i){return o("connection",i.message,"error")}o("connection",t.testing);try{const i=await fetch(`${n.baseUrl.replace(/\/+$/,"")}/chat/completions`,{method:"POST",headers:{Authorization:`Bearer ${n.apiKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:n.model,messages:[{role:"user",content:"Reply with OK."}],max_tokens:16,temperature:0})}),d=await i.text();if(!i.ok)throw new Error(`HTTP ${i.status}: ${d.slice(0,200)}`);const m=JSON.parse(d);if(!Array.isArray(m.choices))throw new Error(t.errShape);o("connection",t.testOk.replace("{model}",m.model??n.model),"ok")}catch(i){o("connection",k(i.name==="TypeError"?new Error("network or CORS"):i),"error")}});const g=[...e.querySelectorAll("[data-phq]")],S=()=>{r("[data-phq-total]").textContent=t.total.replace("{n}",String(g.reduce((n,i)=>n+Number(i.value),0)))};g.forEach(n=>n.addEventListener("change",S));const H=n=>n.split(/\r?\n/).map(i=>i.trim()).filter(Boolean),Q=n=>{s("background").value=n.bg.trim();const i=Array.isArray(n.history)?n.history:n.history?.history??[];s("history").value=i.join(`
`),s("beliefs").value=(n.express?.core_beliefs??[]).join(`
`),s("style").value=n.express?.expression_strategy?.expression_style??"",s("cognition").value=n.express?.expression_strategy?.cognitive_communication_level??"";const d=new Map((n.phq?.items??[]).map(m=>[m.key,Number(m.score)]));g.forEach(m=>{m.value=String(d.get(m.dataset.phq)??0)}),S()},U={bg:Ye,express:tt,history:rt,phq:ct};Q(U),s("preset").addEventListener("change",n=>{Q(n.target.value==="blank"?{bg:"",express:{},history:[],phq:{}}:U),o("profile","")});const B=["完全没有","有几天","一半以上的天数","几乎每天"],Y=()=>{const n=s("background").value.trim();if(!n)throw new Error(t.errBackground);const i={},d=s("style").value.trim(),m=s("cognition").value.trim();d&&(i.expression_style=d),m&&(i.cognitive_communication_level=m);const w=g.map(T=>{const q=Number(T.value),f=B[q];return{key:T.dataset.phq,question:T.dataset.question,score:q,label:f,question_with_score:`${T.dataset.question}：${f}`}});return{background_text:n,express_json:{expression_strategy:i,core_beliefs:H(s("beliefs").value)},history_json:{history:H(s("history").value)},scale_json:{scale_name:"PHQ-9",sample_id:"web",items:w,total:w.reduce((T,q)=>T+q.score,0)}}},N=(n,i,d="application/json")=>{const m=URL.createObjectURL(new Blob([i],{type:`${d};charset=utf-8`})),w=document.createElement("a");w.href=m,w.download=n,document.body.append(w),w.click(),w.remove(),setTimeout(()=>URL.revokeObjectURL(m),1e3)};r('[data-action="export-profile"]').addEventListener("click",()=>{try{const n=Y();N("paws-profile.json",JSON.stringify({"bg.txt":n.background_text,"express.json":n.express_json,"history.json":n.history_json,"PHQ9.json":n.scale_json},null,2)+`
`)}catch(n){o("profile",n.message,"error")}});const E=s("importFile");r('[data-action="import"]').addEventListener("click",()=>E.click()),E.addEventListener("change",async()=>{const n=E.files?.[0];if(E.value="",!!n)try{const i=JSON.parse(await n.text());Q({bg:String(i["bg.txt"]??i.background_text??""),express:i["express.json"]??i.express_json??{},history:i["history.json"]??i.history_json??[],phq:i["PHQ9.json"]??i.scale_json??{}}),o("profile",t.imported.replace("{name}",n.name),"ok")}catch{o("profile",t.errImport,"error")}});const L=s("turns"),O=()=>{const n=Number(L.value),i=s("readback").checked?1:0;r("[data-estimate]").textContent=t.estimate.replace("{min}",String(1+4*n+i)).replace("{max}",String(1+7*n+i))};L.addEventListener("change",O),s("readback").addEventListener("change",O),O();let R=null,p=null;const b=r('[data-action="run"]'),$=r('[data-action="stop"]'),I=r("[data-results]"),K=r("[data-turns]"),F=r("[data-meter]"),_=(n,i,d)=>{const m=document.createElement(n);return i&&(m.className=i),d!==void 0&&(m.textContent=d),m},A=n=>t.levels[n]??n,ne=n=>{const i=n.turn!==void 0?t.turnN.replace("{n}",String(n.turn+1))+" · ":"",d=n.attempt?` · ${t.revision}`:"";return i+(t.stages[n.stage]??n.stage)+d};let W;b.addEventListener("click",async()=>{let n,i;try{n=v()}catch(c){return o("run",c.message,"error")}try{i=Y()}catch(c){return o("run",c.message,"error")}const d=Number(L.value);R=new AbortController,W=new Map,p=null,b.disabled=!0,$.disabled=!1,I.hidden=!1,K.replaceChildren(),r("[data-readback]").hidden=!0,r("[data-downloads]").hidden=!0,o("run",t.running);const m=new Date;let w=0,T=0,q=0,f="";const z=()=>{F.textContent=t.meter.replace("{stage}",f).replace("{calls}",String(w)).replace("{tin}",String(T)).replace("{tout}",String(q))},je=c=>{if(c.type==="stage")f=ne(c),z();else if(c.type==="call")w=c.calls,T=c.promptTokens,q=c.completionTokens,z();else if(c.type==="retry")f=t.retrying.replace("{stage}",c.stage).replace("{n}",String(c.attempt)).replace("{max}",String(c.max)),z();else if(c.type==="state-initialized"){const P=_("li","turn init");P.append(_("p","turn-label",t.initialState),_("p","state",t.stateLine.replace("{trust}",A(c.instant.trust_level)).replace("{closure}",A(c.instant.closure_level)))),K.append(P)}else if(c.type==="candidate"){const P=_("details","candidate"),se=_("summary",void 0,`${t.candidateN.replace("{n}",String(c.attempt+1))} · ${c.judge.pass?t.passed:t.failed} · ${t.score} ${c.judge.score}/5`);P.append(se);const Z=_("dl","plan"),C=(V,oe)=>{const ie=_("div");ie.append(_("dt",void 0,V));const ae=_("dd");if(Array.isArray(oe)){const _e=_("ul");oe.forEach($e=>_e.append(_("li",void 0,$e))),ae.append(_e)}else ae.textContent=oe;ie.append(ae),Z.append(ie)};C(t.goal,c.rawIntent.answer_goal),C(t.reveal,c.rawIntent.content_to_reveal),c.rawIntent.content_to_hide.length&&C(t.holdBack,c.rawIntent.content_to_hide),C(t.answer,c.answer),c.judge.pass||(C(t.judgeDiagnosis,c.judge.diagnosis||"—"),C(t.judgeIssues,c.judge.issues.map(V=>`${V.dimension}：${V.repair_instruction}`))),P.append(Z),W.set(c.turn,[...W.get(c.turn)??[],P])}else if(c.type==="turn"){const P=_("li","turn"),se=_("p","turn-label",t.turnN.replace("{n}",String(c.turn.turn_id+1))),Z=_("div","utterance doctor");Z.append(_("span","speaker",t.doctor),Object.assign(_("p",void 0,c.turn.doctor),{lang:"zh-Hans"}));const C=_("div","utterance patient");C.append(_("span","speaker",t.patient),Object.assign(_("p",void 0,c.turn.patient),{lang:"zh-Hans"}));const V=_("p","state",t.stateLine.replace("{trust}",A(c.instant.trust_level)).replace("{closure}",A(c.instant.closure_level)));P.append(se,Z,C,V,...W.get(c.turn.turn_id)??[]),K.append(P)}};try{const c=await Le(i,n,lt,{maxTurns:d,questions:Xe,signal:R.signal,onEvent:je});if(p={output:c,meta:{engine:"PAWS browser port of AndreJJXu/PAWS@2f0d815",model:n.model,base_url:n.baseUrl,started_at:m.toISOString(),finished_at:new Date().toISOString(),calls:c.stats.calls,prompt_tokens:c.stats.promptTokens,completion_tokens:c.stats.completionTokens}},r("[data-downloads]").hidden=!1,s("readback").checked){f=t.stages.readback,z();try{const P=await Fe(c.dialogue,i.scale_json,n,{signal:R.signal});p.readback=P,w+=1,z(),J(P)}catch(P){if(P.name==="AbortError")throw P;o("run",`${t.readbackFailed} ${k(P)}`,"error")}}f=t.done,z(),r('[data-status="run"]').dataset.kind!=="error"&&o("run",t.finished.replace("{n}",String(c.dialogue.length)),"ok")}catch(c){o("run",c.name==="AbortError"?t.stopped:`${t.failedRun} ${k(c)}`,"error")}finally{b.disabled=!1,$.disabled=!0,R=null}}),$.addEventListener("click",()=>R?.abort());const J=n=>{const i=r("[data-readback-table]"),d=_("thead"),m=_("tr");[t.item,t.target,t.readback,t.evidence].forEach(f=>m.append(Object.assign(_("th",void 0,f),{scope:"col"}))),d.append(m);const w=_("tbody"),T=new Map(g.map(f=>[f.dataset.phq,f.dataset.question]));for(const f of n.pred_items){const z=_("tr");f.abs_error&&(z.className="miss"),z.append(Object.assign(_("th",void 0,T.get(f.key)??f.key),{scope:"row",lang:"zh-Hans"}),_("td","num",String(f.gt_score)),_("td","num",String(f.score)+(f.abs_error?` ${t.mismatch}`:"")),Object.assign(_("td",void 0,f.evidence),{lang:"zh-Hans"})),w.append(z)}const q=_("tr","total");q.append(Object.assign(_("th",void 0,t.totalLabel),{scope:"row"}),_("td","num",String(n.gt_total)),_("td","num",String(n.pred_total)),_("td",void 0,t.mae.replace("{v}",n.mean_abs_error.toFixed(3)))),w.append(q),i.replaceChildren(d,w),r("[data-readback]").hidden=!1,r('[data-action="download-readback"]').hidden=!1};r('[data-action="download-json"]').addEventListener("click",()=>{p&&N("dialog.json",Ue(p.output))}),r('[data-action="download-txt"]').addEventListener("click",()=>{p&&N("dialog.txt",Me(p.output.dialogue),"text/plain")}),r('[data-action="download-readback"]').addEventListener("click",()=>{p?.readback&&N("readback.json",JSON.stringify({protocol:"paws-phq9-long-v1",...p.meta,payload:p.readback},null,2)+`
`)})}
