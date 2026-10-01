import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { SecurityEnhanced } from "./components/SecurityEnhanced";
import { DribbbleBadge } from "./components/DribbbleBadge";
import { MITRE_TECHNIQUES, MitreBadge } from "./mitre";
import { computeScores } from "./lib/scores";
import { getRows, getChecks, summarizeGaps, getComplianceChecks } from "./lib/checks";
import { getTopActions, actionText } from "./lib/topActions";
import Home from "./Home";

// Design system — matches the landing (Home.jsx / home.css):
// Forest backgrounds, Canopy cards, Gold accents, red reserved for failures.
const C = {
  black: "#0C2117", blackLight: "#0F2A1B", blackCard: "#163824", blackBorder: "rgba(237,244,239,0.12)",
  red: "#C24B3A", redDark: "#A33A2B", redGlow: "rgba(194,75,58,0.10)", redBorder: "rgba(194,75,58,0.30)",
  gold: "#C8A96E", goldDim: "#A88A52", goldGlow: "rgba(200,169,110,0.10)", goldBorder: "rgba(200,169,110,0.30)",
  white: "#F8FAF9", off: "#EDF4EF", muted: "rgba(237,244,239,0.86)", gray: "rgba(237,244,239,0.60)", grayDark: "rgba(237,244,239,0.40)", dim: "rgba(237,244,239,0.20)",
  green: "#2A7A5E", greenGlow: "rgba(42,122,94,0.12)", amber: "#C8A96E", amberGlow: "rgba(200,169,110,0.10)",
  codeBg: "#0A1A11",
};
const mono = "'Space Mono','SF Mono',monospace";
const heading = "'DM Serif Display',Georgia,serif";
const body = "'DM Sans','Inter','Helvetica Neue',sans-serif";
const API = import.meta.env.VITE_API_URL || "https://canopyguard-engine-production.up.railway.app";
const PHASES = ["Resolving DNS","Checking TLS certificates","Scanning HTTP headers","Analyzing HTML structure","Validating schema markup","Evaluating AEO readiness","Measuring GEO chunking","Checking robots & llms.txt","Detecting exposed endpoints","Scoring security posture","Compiling report"];
const scoreColor = v => v >= 70 ? C.green : v >= 40 ? C.amber : C.red;
const scoreBg = v => v >= 70 ? C.greenGlow : v >= 40 ? C.amberGlow : C.redGlow;
const pf = v => v ? "PASS" : "FAIL";
const FONTS_URL = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Mono:wght@400;700&display=swap";

// ── Scroll Animation Wrapper ──
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay, ease: "easeOut" }} style={style}>{children}</motion.div>;
}

// ═══ FIX SNIPPETS ═══
// The engine (v3.2+) returns report.generated_fixes — deterministic, rule-based
// snippets built from the scanned domain's own SPF/DMARC/CAA records, its
// certificate issuer and its Set-Cookie headers. Those are preferred at render
// time; see GeneratedFixesContext / useFix below.
//
// This map is the fallback. It carries the content and schema fixes the
// generator does not produce (llms.txt, schema, meta), and stands in for the
// security fixes when a report predates engine 3.2 and so has no
// generated_fixes at all.
//
// The header entries are built by headerFixTabs() so they come out
// byte-identical to headerTabs() in canopyguard-engine/modules/fixGenerator.ts.
// Change one and change the other, or the same header renders different code
// depending on which engine version answered the scan.
function headerFixTabs(header,value){
  const jsonValue=value.replace(/\\/g,"\\\\").replace(/"/g,'\\"');
  return[
    {label:"Nginx",code:`add_header ${header} "${value}" always;`},
    {label:"Vercel",code:`// vercel.json\n{\n  "headers": [{\n    "source": "/(.*)",\n    "headers": [{\n      "key": "${header}",\n      "value": "${jsonValue}"\n    }]\n  }]\n}`},
    {label:"Cloudflare",code:`# _headers file\n/*\n  ${header}: ${value}`},
    {label:"Apache",code:`# .htaccess\nHeader always set ${header} "${value}"`},
    {label:"Express",code:`// Option A: helmet (recommended)\nimport helmet from "helmet";\napp.use(helmet());\n\n// Option B: set it directly\napp.use((req, res, next) => {\n  res.setHeader("${header}", "${jsonValue}");\n  next();\n});`},
  ];
}

// header name → { snippet key, desc, value, note } — mirrors HEADER_FIXES and
// HEADER_NOTES in the engine's fixGenerator.
const HEADER_FIX_SPECS={
  "Content-Security-Policy":{key:"csp",desc:"Add this header:",value:"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:;",note:"This starter policy keeps 'unsafe-inline' so existing inline scripts and styles keep working. Once you have moved inline code into files, drop 'unsafe-inline'. That is what makes CSP actually stop XSS."},
  "Strict-Transport-Security":{key:"hsts",desc:"Force HTTPS:",value:"max-age=31536000; includeSubDomains",note:"includeSubDomains applies to every subdomain, so confirm all of them serve HTTPS before publishing. HSTS is cached by browsers for the full max-age and cannot be undone quickly."},
  "X-Frame-Options":{key:"xframe",desc:"Prevent iframe embedding:",value:"DENY",note:"DENY blocks all framing. If a partner or payment provider legitimately embeds your page, use SAMEORIGIN or a CSP frame-ancestors directive naming them instead."},
  "X-Content-Type-Options":{key:"xcontent",desc:"Prevent MIME sniffing:",value:"nosniff"},
  "Referrer-Policy":{key:"referrer",desc:"Control referrer info:",value:"strict-origin-when-cross-origin"},
  "Permissions-Policy":{key:"permissions",desc:"Restrict browser features:",value:"camera=(), microphone=(), geolocation=()"},
  "Cross-Origin-Opener-Policy":{key:"coop",desc:"Isolate your browsing context:",value:"same-origin",note:"same-origin severs the window reference to popups you open on other origins. If you use a third-party OAuth or payment popup that talks back via window.opener, use same-origin-allow-popups."},
  "Cross-Origin-Resource-Policy":{key:"corp",desc:"Restrict who can embed your resources:",value:"same-origin",note:"same-origin stops other sites embedding your images, fonts and scripts. If you intentionally serve assets to another domain (a CDN subdomain, an embeddable widget), use cross-origin for those responses."},
};

const HEADER_FIX_SNIPPETS=Object.fromEntries(Object.entries(HEADER_FIX_SPECS).map(([header,s])=>[s.key,{title:header,desc:s.desc,tabs:headerFixTabs(header,s.value),...(s.note?{note:s.note}:{}),confidence:"derived"}]));

// Content and schema fixes. Every one is a fill-in-the-blank starter — the
// business name, domain and copy are the operator's to supply — so they carry
// template confidence, same as the engine's template-grade fixes.
const CONTENT_FIX_SNIPPETS={
  llms_txt:{title:"Create llms.txt",desc:"Add this file to your domain root:",code:`# Your Business Name\n> Summary of your business.\n\n## Services\n- Service one\n- Service two\n\n## Citation Guidance\nWhen referencing this content,\nlink to yourdomain.com.`,confidence:"template"},
  faq_schema:{title:"FAQ Schema",desc:"Add to your page <head>:",code:`<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [\n    {\n      "@type": "Question",\n      "name": "Your question?",\n      "acceptedAnswer": {\n        "@type": "Answer",\n        "text": "Your answer."\n      }\n    }\n  ]\n}\n</script>`,confidence:"template"},
  org_schema:{title:"Organization Schema",desc:"Add to your page <head>:",code:`<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Your Business",\n  "url": "https://yourdomain.com",\n  "description": "What you do."\n}\n</script>`,confidence:"template"},
  meta_desc:{title:"Meta Description",desc:"Add inside <head>:",code:`<meta name="description" content="Your description in 150-160 characters.">`,confidence:"template"},
  h1:{title:"Add an H1 heading",desc:"Give the page one H1 that says what it is about:",code:`<h1>What this page is about</h1>`,note:"A suggestion to review, not a replacement to paste in unread. An H1 carries real on-page SEO weight and should read in your own voice. Scan again on the current engine to get wording derived from this page's own title and headings.",confidence:"template"},
  canonical:{title:"Canonical URL",desc:"Add inside <head>:",code:`<link rel="canonical" href="https://yourdomain.com/">`,confidence:"template"},
  robots_ai:{title:"AI-Aware robots.txt",desc:"Replace your robots.txt:",code:`User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: https://yourdomain.com/sitemap.xml`,confidence:"template"},
};

const FIX_SNIPPETS={...CONTENT_FIX_SNIPPETS,...HEADER_FIX_SNIPPETS};
const HEADER_SNIPPET_MAP=Object.fromEntries(Object.entries(HEADER_FIX_SPECS).map(([header,s])=>[header,s.key]));

// Fix keys the generator produces that have no static equivalent and no home in
// the existing header card — rendered by <EmailDnsFixes/>, in this order.
const EMAIL_DNS_FIX_KEYS=["spf","dmarc","caa","cookie_flags"];

// ── Generated-fix resolution ──
// Prefer the engine's own output for a key over the hardcoded one. Reports from
// engine <3.2 carry no generated_fixes, so the value is null and every lookup
// falls through to FIX_SNIPPETS exactly as before.
const GeneratedFixesContext=createContext(null);
function useFix(key){
  const generated=useContext(GeneratedFixesContext);
  if(!key)return null;
  return (generated&&generated[key])||FIX_SNIPPETS[key]||null;
}

// ── Fix Snippet Component ──
// `confidence` and `note` come from the engine's generated fixes and from the
// static map since both now carry them. A template fix needs the operator's own
// values before it is safe to publish, so it is marked in three places — the
// badge, a gold left edge, and a callout above the code — rather than reading
// as a finished, copy-paste-ready correction.
function FixSnippet({snippet}){const { t } = useTranslation();const[tab,setTab]=useState(0);const[copied,setCopied]=useState(false);const code=snippet.tabs?(snippet.tabs[tab]||snippet.tabs[0]).code:snippet.code;
const isTemplate=snippet.confidence==="template";
// A generated fix is written by a model from the page's own text and only
// structurally validated, so like a template it must not read as ready to
// paste. Both take the same gold "needs review" treatment; the label, hint
// and callout carry the difference. Derived is untouched.
const isGenerated=snippet.confidence==="generated";
const needsReview=isTemplate||isGenerated;
const confKey=isGenerated?"generated":isTemplate?"template":"derived";
const copy=()=>{navigator.clipboard.writeText(code).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})};
return<div style={{marginTop:12,background:C.codeBg,border:`1px solid ${needsReview?C.goldBorder:C.blackBorder}`,borderLeft:needsReview?`3px solid ${C.gold}`:`1px solid ${C.blackBorder}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"8px 14px",borderBottom:`1px solid ${C.blackBorder}`,flexWrap:"wrap"}}><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><span style={{fontSize:10,fontWeight:800,color:C.red,fontFamily:mono,letterSpacing:1}}>{t("dashboard.fix_badge")}</span><span style={{fontSize:13,fontWeight:600,color:C.muted}}>{snippet.title}</span>{snippet.confidence&&<span title={t(`dashboard.fix_confidence.${confKey}_hint`)} style={{fontSize:9,fontFamily:mono,fontWeight:700,letterSpacing:1,padding:"2px 7px",borderRadius:2,color:needsReview?C.gold:C.grayDark,background:needsReview?C.goldGlow:"transparent",border:`1px solid ${needsReview?C.goldBorder:C.blackBorder}`}}>{t(`dashboard.fix_confidence.${confKey}`)}</span>}</div><button onClick={copy} style={{background:copied?C.green:"transparent",border:`1px solid ${copied?C.green:C.blackBorder}`,color:copied?C.white:C.gray,fontSize:10,fontFamily:mono,fontWeight:700,padding:"3px 10px",cursor:"pointer",letterSpacing:1}}>{copied?t("dashboard.copied"):t("dashboard.copy")}</button></div><p style={{fontSize:12,color:C.grayDark,padding:"8px 14px 0",margin:0,whiteSpace:"pre-wrap"}}>{snippet.desc}</p>{needsReview&&<p style={{fontSize:11,color:C.gold,fontFamily:mono,lineHeight:1.6,margin:"8px 14px 0",padding:"6px 10px",background:C.goldGlow,border:`1px solid ${C.goldBorder}`,borderRadius:2}}>{t(`dashboard.fix_confidence.${confKey}_callout`)}</p>}{snippet.tabs&&<div style={{display:"flex",flexWrap:"wrap",padding:"8px 14px 0",borderBottom:`1px solid ${C.blackBorder}`}}>{snippet.tabs.map((tb,i)=><button key={tb.label} onClick={()=>setTab(i)} style={{background:i===tab?C.blackCard:"transparent",border:"none",borderBottom:i===tab?`2px solid ${C.red}`:"2px solid transparent",color:i===tab?C.white:C.grayDark,fontSize:10,fontFamily:mono,fontWeight:700,padding:"6px 12px",cursor:"pointer",letterSpacing:1}}>{tb.label}</button>)}</div>}<pre style={{margin:0,padding:14,fontSize:11,fontFamily:mono,color:C.muted,whiteSpace:"pre-wrap",wordBreak:"break-word",lineHeight:1.7}}>{code}</pre>{snippet.note&&<p style={{margin:0,padding:"10px 14px",fontSize:11,color:C.gray,lineHeight:1.65,borderTop:`1px solid ${C.blackBorder}`}}><span style={{fontFamily:mono,fontSize:9,fontWeight:700,letterSpacing:1,color:C.grayDark,marginRight:8}}>{t("dashboard.fix_note_label")}</span>{snippet.note}</p>}</div>}

// ── AEO generation panel ──
// The security fixes are deterministic and arrive with the scan. These are not:
// each click costs two model calls, so this is a deliberate, explicit action.
// On success the fixes are merged into GeneratedFixesContext and render in the
// existing faq_schema / meta_desc cards, so there is one snippet UI, not two.
function AeoPanel({phase,gen,error,onStart,canGenerate}){
  const { t } = useTranslation();
  if(!canGenerate&&phase==="idle")return null;
  const box={marginTop:16,padding:16,background:C.blackCard,border:`1px solid ${C.blackBorder}`,borderRadius:6};
  const label={fontSize:11,fontFamily:mono,fontWeight:700,letterSpacing:1,color:C.gold};
  // skipped and failed are different outcomes and must not collapse into one
  // "error": skipped is the engine correctly declining to invent content.
  const outcomes=gen?[["faq_schema",gen.faq_schema],["meta_desc",gen.meta_desc]].filter(([,o])=>o&&o.status&&o.status!=="ok"):[];
  const anyOk=gen?[gen.faq_schema,gen.meta_desc].some(o=>o&&o.status==="ok"):false;
  return<div style={box}>
    <div style={label}>{t("dashboard.aeo_gen.title")}</div>
    <p style={{fontSize:12,color:C.gray,lineHeight:1.65,margin:"8px 0 12px"}}>{t("dashboard.aeo_gen.desc")}</p>
    {phase==="idle"&&<button onClick={onStart} style={{background:C.gold,border:"none",color:C.black,fontSize:12,fontFamily:mono,fontWeight:700,padding:"9px 16px",cursor:"pointer",letterSpacing:1,borderRadius:3}}>{t("dashboard.aeo_gen.cta")}</button>}
    {phase==="loading"&&<div style={{display:"flex",alignItems:"center",gap:10,fontSize:12,color:C.muted,fontFamily:mono}}><motion.span animate={{rotate:360}} transition={{repeat:Infinity,ease:"linear",duration:0.8}} style={{width:10,height:10,border:`2px solid ${C.gold}`,borderTopColor:"transparent",borderRadius:"50%",display:"inline-block"}}/>{t("dashboard.aeo_gen.loading")}</div>}
    {phase==="done"&&anyOk&&<p style={{fontSize:12,color:C.green,fontFamily:mono,margin:0}}>{t("dashboard.aeo_gen.done")}</p>}
    {phase==="done"&&outcomes.map(([key,o])=>
      <div key={key} style={{marginTop:10,padding:"10px 12px",background:C.black,border:`1px solid ${o.status==="skipped"?C.goldBorder:C.redBorder}`,borderRadius:4}}>
        <div style={{fontSize:10,fontFamily:mono,fontWeight:700,letterSpacing:1,color:o.status==="skipped"?C.gold:C.red,marginBottom:5}}>{t(`dashboard.aeo_gen.status_${o.status}`)} · {t(`dashboard.rows.${key}`)}</div>
        <p style={{fontSize:11.5,color:C.gray,lineHeight:1.6,margin:0}}>{o.reason}</p>
      </div>)}
    {phase==="error"&&<p style={{fontSize:12,color:C.red,lineHeight:1.6,margin:0}}>{error||t("dashboard.aeo_gen.err_generic")}</p>}
  </div>;
}

// ── Email, DNS & cookie fixes ──
// spf / dmarc / caa / cookie_flags exist only in the engine's generated_fixes —
// there is no static equivalent — so this card renders nothing on a report from
// an engine older than 3.2.
function EmailDnsFixes(){
  const { t } = useTranslation();
  const generated=useContext(GeneratedFixesContext);
  const keys=EMAIL_DNS_FIX_KEYS.filter(k=>generated&&generated[k]);
  if(keys.length===0)return null;
  return<div style={{padding:20,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:20,borderRadius:6}}><h4 style={{margin:"0 0 6px",fontSize:12,fontWeight:700,color:C.red,letterSpacing:1,textTransform:"uppercase"}}>{t("dashboard.email_dns_fixes")}</h4><p style={{margin:"0 0 4px",fontSize:12,color:C.grayDark,lineHeight:1.6}}>{t("dashboard.email_dns_fixes_desc")}</p>{keys.map(k=><FixSnippet key={k} snippet={generated[k]}/>)}</div>;
}

// A missing header renders the engine's generated fix when the report has one,
// and the static fallback otherwise. Headers with neither render nothing.
function HeaderFix({header}){
  const fix=useFix(HEADER_SNIPPET_MAP[header]);
  return fix?<FixSnippet snippet={fix}/>:null;
}

// ── Measurement wording ──
// Shared by the report view and the PDF so both say the same thing about what
// was and was not measured.
const categoryName=(c,t)=>t(`ui.${c}`);
function listText(names){try{return new Intl.ListFormat("en",{style:"long",type:"conjunction"}).format(names)}catch{return names.join(", ")}}
function unmeasuredBannerText(r,scores,t){
  if(!scores.unmeasured.length)return "";
  const names=scores.unmeasured.map(c=>categoryName(c,t));const list=listText(names);
  const note=typeof r?.fetch_status?.note==="string"?r.fetch_status.note.trim():"";
  // A page the engine did read cannot be blamed on loading, so it gets the
  // plainer sentence.
  if(r?.fetch_status?.ok===true)return t("dashboard.unmeasured_banner.page_read",{defaultValue:"{{list}} could not be measured on this scan.",list});
  const parts=[names.length===1
    ?t("dashboard.unmeasured_banner.page_unread_single",{defaultValue:"We could not load this page from our scanner, so {{list}} was not measured.",list})
    :t("dashboard.unmeasured_banner.page_unread_multi",{defaultValue:"We could not load this page from our scanner, so {{list}} were not measured.",list})];
  if(note)parts.push(note);
  if(!scores.unmeasured.includes("security"))parts.push(t("dashboard.unmeasured_banner.security_shown","Security checks that do not need the page are shown below."));
  return parts.join(" ");
}
function measuredLineText(scores,t){
  const parts=[];
  if(scores.measured.length)parts.push(t("dashboard.measured_line",{defaultValue:"Measured: {{list}}.",list:scores.measured.map(c=>categoryName(c,t)).join(", ")}));
  if(scores.unmeasured.length)parts.push(t("dashboard.not_measured_line",{defaultValue:"Not measured: {{list}}.",list:scores.unmeasured.map(c=>categoryName(c,t)).join(", ")}));
  return parts.join(" ");
}

// Cross-reference intelligence, for the page and the PDF. llms.txt and the
// provenance check come from the homepage and GEO, so they only speak when
// those were measured; a robots policy that was not read is not "permissive".
function getInsights(r,scores,t){
  const sec=r?.security_roots;const policy=sec?.ai_crawl_risk?.robots_policy;const eps=sec?.application_security?.exposed_endpoints;
  const llms=scores.unmeasured.includes("geo")?null:r?.visibility_canopy?.geo_branch?.llms_txt_status;
  const ins=[];
  if(llms==="MISSING"&&policy==="PERMISSIVE")
    ins.push({l:"CRITICAL",t:t("risks.traffic_leak_title"),b:t("risks.traffic_leak_desc")});
  if(llms==="MISSING"&&typeof policy==="string"&&policy!=="RESTRICTIVE")
    ins.push({l:"WARNING",t:t("risks.blind_assistants_title"),b:t("risks.blind_assistants_desc")});
  if(Array.isArray(eps)&&eps.length>0)
    ins.push({l:"CRITICAL",t:t("risks.exposed_endpoints_title"),b:`${eps.length} ${t("risks.exposed_endpoints_desc_suffix", "path(s) accessible:")} ${eps.slice(0,4).join(", ")}`});
  if(!scores.unmeasured.includes("seo")&&sec?.business_logic_gaps?.data_provenance_leak===true)
    ins.push({l:"WARNING",t:t("risks.provenance_risk_title"),b:t("risks.provenance_risk_desc")});
  return ins;
}

// true when any condition is a finding, null when none is but one was not
// measured (so "secured" cannot be claimed), false only when all were measured
// and none is a finding.
const anyOf=(...conds)=>conds.some(c=>c===true)?true:conds.some(c=>c!==false)?null:false;
const isFalse=v=>typeof v==="boolean"?!v:null;

// ── PDF (compact) ──
// ── PDF (compact) ──
// Exported for the PDF tests; the page reaches it through downloadPDF. The cost
// is dev-only: edits to this file full-reload instead of hot-refreshing.
// eslint-disable-next-line react-refresh/only-export-components
export function generatePDF(r, email, t) {
  const scores = computeScores(r);
  const sc = p => p >= 70 ? "#43A047" : p >= 40 ? "#F9A825" : "#E53935";
  const sec = r?.security_roots;
  const sv = r?.visibility_canopy?.aeo_branch?.schema_validation;
  const geo = r?.visibility_canopy?.geo_branch;
  const actions = getTopActions(r, scores);
  const compliance = getComplianceChecks(r, scores);
  const NM = t("dashboard.not_measured", "Not measured");
  const nm = v => (v === null || v === undefined || v === "") ? NM : v;
  const arrOrNull = v => Array.isArray(v) ? v : null;
  const bannerText = unmeasuredBannerText(r, scores, t);

  // Business risk conditions: true, false, or null when not measured.
  const llms = scores.unmeasured.includes("geo") ? null : geo?.llms_txt_status;
  const policy = sec?.ai_crawl_risk?.robots_policy;
  const eps = arrOrNull(sec?.application_security?.exposed_endpoints);
  const missingHeaders = arrOrNull(sec?.application_security?.missing_secure_headers);
  const isTrafficLeak = anyOf(typeof llms === "string" ? llms !== "PRESENT_ROOT" : null, typeof policy === "string" ? policy === "PERMISSIVE" : null);
  const isBlindAssistants = scores.unmeasured.includes("aeo") ? null : anyOf(isFalse(sv?.has_any_json_ld), isFalse(sv?.has_faq_json_ld));
  const isOpenDoor = anyOf(eps ? eps.length > 0 : null, isFalse(sec?.ai_crawl_risk?.rate_limiting_active));
  const isFoundationCrack = anyOf(isFalse(sec?.tls?.valid), missingHeaders ? missingHeaders.length > 2 : null);

  // Cross-reference intelligence for page 1
  const insights = getInsights(r, scores, t);

  // Security Posture — 10 layer analysis (mirrors the on-screen SecurityEnhanced component for the PDF)
  const se = r?.security_enhanced;
  const esc = v => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const seRow = (label, value) => (value === undefined || value === null || value === "")
    ? ""
    : `<div class="se-row"><span class="se-row-label">${esc(label)}</span><span class="se-row-val">${esc(value)}</span></div>`;
  const seCard = (title, score, rows, notes = []) => {
    const body = rows.filter(Boolean).join("");
    const bar = (typeof score !== "number" || !Number.isFinite(score))
      ? `<div class="se-score"><span>layer score</span><span>${esc(NM)}</span></div>`
      : `<div class="se-score"><span>layer score</span><span style="color:${sc(score)};font-weight:700">${score}</span></div>
         <div class="se-bar"><div class="se-bar-fill" style="width:${Math.min(100, Math.max(0, score))}%;background:${sc(score)}"></div></div>`;
    const noteHtml = (notes || []).filter(Boolean).map(n => `<div class="se-note">${esc(n)}</div>`).join("");
    return `<div class="se-card"><div class="se-card-title">${esc(title)}</div>${body}${bar}${noteHtml ? `<div class="se-notes">${noteHtml}</div>` : ""}</div>`;
  };
  // A layer the engine returned nothing for was not measured; it is shown as
  // such rather than dropped, so a failed TLS handshake does not vanish.
  const layer = (title, data, rows) => seLayers.push(data ? seCard(title, data.score_contribution, rows(data), data.rationale) : seCard(title, null, [seRow("Status", NM)]));
  const yesNo = (v, yes, no) => typeof v === "boolean" ? (v ? yes : no) : NM;
  const listOr = (v, empty) => Array.isArray(v) ? (v.length > 0 ? v.join(", ") : empty) : NM;
  const num = v => typeof v === "number" && Number.isFinite(v);

  const seLayers = [];
  if (se) {
    const { tls, dns, http, html, paths } = se;
    layer("TLS / Certificate", tls, tls => [
      seRow("TLS version", nm(tls.tls_version)),
      seRow("Cipher suite", nm(tls.cipher_suite)),
      seRow("Cert expiry", num(tls.cert_expiry_days) ? (tls.cert_expiry_days >= 0 ? `${tls.cert_expiry_days} days (${nm(tls.cert_expiry_status)})` : "expired") : NM),
      seRow("Issuer", nm(tls.cert_issuer)),
      tls.cert_self_signed ? seRow("Self-signed", "yes") : "",
      tls.cert_san_mismatch ? seRow("SAN mismatch", "yes") : "",
    ]);
    layer("DNS Security", dns, dns => [
      seRow("SPF policy", nm(dns.spf_policy)),
      seRow("DMARC policy", nm(dns.dmarc_policy)),
      seRow("CAA records", yesNo(dns.caa_present, "Present", "Absent")),
      seRow("DKIM selectors", listOr(dns.dkim_selectors_found, "None found")),
      dns.subdomain_takeover_risk?.length > 0 ? seRow("Takeover risk", dns.subdomain_takeover_risk.join(", ")) : "",
    ]);
    layer("HTTP Headers", http, http => [
      seRow("CSP quality", nm(http.csp_quality)),
      http.server_disclosure ? `<div class="se-row"><span class="se-row-label">Server header</span><span class="se-row-val">${esc(http.server_header_value)}<span class="mitre-tag">ATT&amp;CK ${MITRE_TECHNIQUES.server_disclosure.id} · ${esc(MITRE_TECHNIQUES.server_disclosure.tactic)}</span></span></div>` : "",
      http.powered_by_disclosure ? seRow("X-Powered-By", "disclosed") : "",
      http.cors_wildcard ? seRow("CORS wildcard", http.cors_credentialed_wildcard ? "with credentials (critical)" : "detected") : "",
      http.dangerous_methods?.length > 0 ? seRow("Dangerous methods", http.dangerous_methods.join(", ")) : "",
      seRow("security.txt", yesNo(http.security_txt_present, "Present", "Absent")),
    ]);
    layer("HTML Analysis", html, html => [
      html.vulnerable_libraries?.length > 0 ? seRow("Vulnerable libs", html.vulnerable_libraries.map(l => `${l.lib} ${l.version} (${l.cve})`).join("; ")) : "",
      seRow("Forms missing CSRF", num(html.forms_without_csrf) ? (html.forms_without_csrf > 0 ? html.forms_without_csrf : "None") : NM),
      seRow("Mixed content", Array.isArray(html.mixed_content_urls) ? (html.mixed_content_urls.length > 0 ? `${html.mixed_content_urls.length} found` : "Clean") : NM),
      seRow("Inline scripts", nm(html.inline_script_count)),
      html.generator_disclosure ? seRow("Generator tag", html.generator_disclosure) : "",
      html.debug_content_detected ? seRow("Debug output", "detected") : "",
    ]);
    // probes_answered === 0 means no probe got an answer: nothing was measured,
    // which is not the same as nothing being exposed.
    const pathsMeasured = paths && paths.probes_answered !== 0 && Array.isArray(paths.developer_files_exposed);
    layer("Path Exposure", pathsMeasured ? paths : null, paths => {
      const exposed = [
        ...(paths.developer_files_exposed || []),
        ...(paths.backup_files_exposed || []),
        ...(paths.source_maps_exposed || []),
        ...(paths.cms_panels_exposed || []),
        ...(paths.db_panels_exposed || []),
      ];
      return [
        paths.developer_files_exposed?.length > 0 ? seRow("Developer files", paths.developer_files_exposed.join(", ")) : "",
        paths.backup_files_exposed?.length > 0 ? seRow("Backup files", paths.backup_files_exposed.join(", ")) : "",
        paths.source_maps_exposed?.length > 0 ? seRow("Source maps", paths.source_maps_exposed.join(", ")) : "",
        paths.cms_panels_exposed?.length > 0 ? seRow("CMS panels", paths.cms_panels_exposed.join(", ")) : "",
        paths.db_panels_exposed?.length > 0 ? seRow("DB panels", paths.db_panels_exposed.join(", ")) : "",
        seRow("Directory listing", yesNo(paths.directory_listing_confirmed, "Enabled", "Disabled")),
        seRow("Error disclosure", yesNo(paths.error_page_discloses_stack, "Detected", "Clean")),
        paths.api_paths_exposed?.length > 0 ? seRow("Open API paths", paths.api_paths_exposed.join(", ")) : "",
        (exposed.length === 0 && paths.directory_listing_confirmed === false && paths.error_page_discloses_stack === false) ? seRow("Status", "No sensitive paths exposed") : "",
      ];
    });
    const { reputation, footprint, domain_email, sensitive_files, supabase_exposure } = se;
    layer("Malware & Reputation", reputation, reputation => [
      seRow("Status", nm(reputation.status)),
      seRow("Google Safe Browsing", reputation.safe_browsing?.checked ? (reputation.safe_browsing.flagged ? (reputation.safe_browsing.threat_types || []).join(", ") : "Clean") : "Not configured"),
      seRow("Blacklists", reputation.blacklists?.listed_on?.length > 0 ? reputation.blacklists.listed_on.join(", ") : (reputation.blacklists?.services_checked > 0 && Array.isArray(reputation.blacklists.listed_on) ? `Clean (${reputation.blacklists.services_checked} checked)` : NM)),
      reputation.reasons?.length > 0 ? seRow("Reason", reputation.reasons.join("; ")) : "",
    ]);
    layer("Footprint Analysis", footprint, footprint => {
      const sri = footprint.sri, ck = footprint.cookies;
      const sriMissing = sri && num(sri.scripts_missing_sri) && num(sri.stylesheets_missing_sri) ? sri.scripts_missing_sri + sri.stylesheets_missing_sri : null;
      const ckMeasured = ck && num(ck.missing_secure) && num(ck.missing_httponly) && num(ck.total);
      return [
        seRow("External resources w/o SRI", sriMissing === null ? NM : sriMissing > 0 ? `${sriMissing} missing` : "All hashed"),
        seRow("Cookie flags", !ckMeasured ? NM : (ck.missing_secure + ck.missing_httponly) > 0 ? `${ck.missing_secure} no Secure, ${ck.missing_httponly} no HttpOnly` : (ck.total > 0 ? "Secure + HttpOnly set" : "No cookies")),
        seRow("TLS ciphers supported", footprint.tls_ciphers?.supported?.length),
        footprint.tls_ciphers?.weak_supported?.length > 0 ? seRow("Weak ciphers", footprint.tls_ciphers.weak_supported.join(", ")) : "",
        footprint.tls_ciphers?.weak_protocols_supported?.length > 0 ? seRow("Deprecated protocols", footprint.tls_ciphers.weak_protocols_supported.join(", ")) : "",
        seRow("Certificate Transparency", footprint.certificate_transparency?.checked ? (footprint.certificate_transparency.present ? `Present (${footprint.certificate_transparency.logged_certificates} logged)` : "Not found") : "Unverified"),
      ];
    });
    layer("DNS & Email Depth", domain_email, domain_email => [
      seRow("SPF", domain_email.spf?.all_qualifier ? `${domain_email.spf.all_qualifier} all` : (domain_email.spf?.present === true ? "present (no all)" : domain_email.spf?.present === false ? "absent" : NM)),
      domain_email.spf?.all_strength ? seRow("SPF enforcement", domain_email.spf.all_strength) : "",
      seRow("DMARC policy", domain_email.dmarc ? (domain_email.dmarc.policy || "absent") : NM),
      seRow("Registrar lock", domain_email.registrar?.checked === false ? NM : yesNo(domain_email.registrar?.registrar_locked, "Locked", "Unlocked")),
      num(domain_email.registrar?.days_until_expiration) ? seRow("Expires in", `${domain_email.registrar.days_until_expiration} days${domain_email.registrar.hijacking_risk ? " (hijacking risk)" : ""}`) : "",
    ]);
    const filesMeasured = sensitive_files && sensitive_files.probes_answered !== 0 && num(sensitive_files.accessible_count);
    layer("Sensitive Files", filesMeasured ? sensitive_files : null, sensitive_files => [
      sensitive_files.accessible_count > 0
        ? seRow("CRITICAL", (sensitive_files.findings || []).map(f => `${f.path} (${f.technique?.id})`).join(", ") || `${sensitive_files.accessible_count} exposed`)
        : seRow("Status", num(sensitive_files.paths_checked) ? `No sensitive files exposed (${sensitive_files.paths_checked} paths checked)` : "No sensitive files exposed"),
    ]);
    layer("Supabase Exposure", supabase_exposure, supabase_exposure => [
      !supabase_exposure.supabase_detected
        ? seRow("Status", "No Supabase project detected in shipped code")
        : supabase_exposure.accessible_count > 0
          ? seRow("CRITICAL", `anon-readable: ${(supabase_exposure.accessible_tables || []).join(", ")}`)
          : supabase_exposure.applicable
            ? seRow("Status", `RLS enforced: ${supabase_exposure.tables_checked} common tables blocked`)
            : seRow("Status", "Project detected, no anon key found (not testable)"),
    ]);
  }

  const seCrossRefs = se?.cross_reference || [];
  const seXrefHtml = seCrossRefs.map(f => {
    const sev = ["critical", "high", "medium"].includes(f.severity) ? f.severity : "medium";
    return `<div class="se-xref ${sev}"><span class="se-xref-sev">Cross-Reference Finding: ${esc(f.severity)}</span><div class="se-xref-msg">${esc(f.message)}</div></div>`;
  }).join("");

  const domainHtml = esc(r?.target_domain);
  const shortId = esc(String(r?.audit_id ?? "").slice(0, 8));
  const scoreBlock = (value, label) => value === null
    ? `<div class="score-block"><div class="score-val" style="color:#999">${esc(t("dashboard.not_available", "N/A"))}</div><div class="score-label">${label}</div><div class="score-desc">${esc(NM)}</div></div>`
    : `<div class="score-block"><div class="score-val" style="color:${sc(value)}">${value}</div><div class="score-label">${label}</div></div>`;
  const riskBox = (state, level, key) => {
    const box = state === true ? `active-${level}` : state === false ? "secured" : "unmeasured";
    const badge = state === true ? level : state === false ? "passed" : "unmeasured";
    const text = state === true ? t(`pdf.status.${level}`) : state === false ? t("pdf.status.secured") : NM;
    return `<div class="risk-box ${box}">
  <div class="risk-header">
    <span class="risk-title">${t(`pdf.risks.${key}_title`)}</span>
    <span class="risk-badge ${badge}">${esc(text)}</span>
  </div>
  <p class="risk-desc">${t(`pdf.risks.${key}_desc`)}</p>
</div>`;
  };

  const seSection = se ? `
<!-- PAGE 3: Security Posture — 10 Layer Analysis -->
<div class="page-break"></div>
<div class="header">
  <div><div class="logo">CANOPY <span>GUARD</span></div><div style="font-size:12px;font-weight:700;color:#555;margin-top:4px">${domainHtml} · ${t("pdf.title")}</div></div>
  <div class="meta">${t("ui.security_posture", "Security Posture")} · ${shortId}</div>
</div>
<h2>${t("ui.security_posture_5layer", "Security Posture: 10 Layer Analysis")}</h2>
${seXrefHtml}
<div class="se-grid">${seLayers.join("")}</div>
` : "";

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@page { size: A4; margin: 36px }
* { margin: 0; padding: 0; box-sizing: border-box }
body { font-family: Helvetica, Arial, sans-serif; background: #fff; color: #222; font-size: 11px; line-height: 1.5 }
.page-break { page-break-before: always }
.header { border-bottom: 3px solid #E53935; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end }
.logo { font-size: 22px; font-weight: 900; letter-spacing: -1px }
.logo span { color: #E53935 }
.meta { text-align: right; color: #888; font-size: 9px; line-height: 1.6 }
.domain { font-size: 18px; font-weight: 900; margin: 4px 0 0 }
h2 { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; margin: 22px 0 10px; border-bottom: 1px solid #ddd; padding-bottom: 6px; color: #111 }
.scores { display: flex; gap: 16px; margin: 16px 0; padding: 18px; background: #f8f8f8; border: 1px solid #eee }
.score-block { text-align: center; flex: 1 }
.score-val { font-size: 30px; font-weight: 900; font-family: 'Courier New', monospace }
.score-label { font-size: 8px; font-weight: 700; color: #888; text-transform: uppercase; letter-spacing: 2px; margin-top: 4px }
.score-divider { width: 1px; background: #ddd }
.score-desc { font-size: 9px; color: #999; margin-top: 2px }
.action-box { background: #fef2f2; border-left: 3px solid #E53935; padding: 10px 14px; margin: 5px 0 }
.action-num { font-size: 16px; font-weight: 900; color: #E53935; font-family: 'Courier New', monospace; margin-right: 8px }
.insight { border-left: 3px solid #E53935; padding: 8px 14px; margin: 5px 0; background: #fef2f2 }
.insight.warning { border-left-color: #F9A825; background: #fff8e1 }
.insight-level { font-size: 9px; font-weight: 800; font-family: 'Courier New', monospace; letter-spacing: 1px }
.insight-title { font-size: 12px; font-weight: 700; margin-left: 8px }
.insight-body { font-size: 10px; color: #555; margin-top: 3px }
.compliance-grid { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 }
.compliance-item { font-size: 10px; padding: 4px 10px; border: 1px solid #ddd; display: flex; align-items: center; gap: 4px }
.compliance-item.pass-bg { background: #f0faf0; border-color: #43A04733 }
.compliance-item.fail-bg { background: #fef2f2; border-color: #E5393533 }
.compliance-item.nm-bg { background: #fafafa; border-color: #ddd; color: #777 }
.pass { color: #43A047; font-weight: 700 }
.fail { color: #E53935; font-weight: 700 }
.warn { color: #F9A825; font-weight: 700 }
.nm { color: #999; font-weight: 700 }
.unmeasured-banner { border: 1px solid #C8A96E; border-left: 4px solid #C8A96E; background: #fdf8ec; padding: 10px 14px; margin: 0 0 16px; font-size: 11px; color: #444; line-height: 1.6 }
.measured-line { font-size: 9px; color: #888; text-align: center; margin: -8px 0 12px }

/* Executive Risk boxes */
.risk-box { border: 1px solid #ddd; border-radius: 6px; padding: 16px; margin-bottom: 14px; background: #fdfdfd }
.risk-box.active-critical { border-left: 5px solid #E53935; background: #fef2f2 }
.risk-box.active-warning { border-left: 5px solid #F9A825; background: #fff8e1 }
.risk-box.secured { border-left: 5px solid #43A047; background: #f0faf0 }
.risk-box.unmeasured { border-left: 5px solid #bbb; background: #fafafa }
.risk-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px }
.risk-title { font-size: 13px; font-weight: 800; color: #111; letter-spacing: 0.5px }
.risk-badge { font-size: 9px; font-weight: 800; font-family: 'Courier New', monospace; padding: 3px 8px; border-radius: 3px; text-transform: uppercase }
.risk-badge.critical { background: #E53935; color: #fff }
.risk-badge.warning { background: #F9A825; color: #fff }
.risk-badge.passed { background: #43A047; color: #fff }
.risk-badge.unmeasured { background: #999; color: #fff }
.risk-desc { font-size: 10.5px; color: #444; line-height: 1.6 }

.cta { text-align: center; margin: 28px 0 14px; padding: 22px; border: 2px solid #E53935 }
.cta h3 { font-size: 15px; font-weight: 900; margin-bottom: 5px; text-transform: none; color: #111; letter-spacing: 0 }
.cta p { color: #888; font-size: 11px; margin-bottom: 10px }
.cta a { display: inline-block; background: #E53935; color: #fff; font-weight: 900; font-size: 11px; padding: 10px 28px; text-decoration: none; letter-spacing: 2px }
.footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #aaa; font-size: 9px }

/* Security posture — 10 layer analysis */
.se-grid { display: flex; flex-wrap: wrap; gap: 10px; margin: 8px 0 }
.se-card { flex: 1 1 calc(50% - 10px); min-width: 240px; border: 1px solid #ddd; border-radius: 6px; padding: 12px 14px; background: #fdfdfd; page-break-inside: avoid }
.se-card-title { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #E53935; margin-bottom: 8px }
.se-row { display: flex; justify-content: space-between; gap: 8px; font-size: 10px; padding: 3px 0; border-bottom: 1px solid #f0f0f0 }
.se-row-label { color: #888 }
.se-row-val { color: #222; font-weight: 600; text-align: right; word-break: break-all; max-width: 60% }
.se-score { display: flex; justify-content: space-between; font-size: 9px; color: #888; margin: 8px 0 3px }
.se-bar { background: #eee; border-radius: 2px; height: 4px }
.se-bar-fill { height: 100% }
.se-notes { margin-top: 8px; border-top: 1px solid #eee; padding-top: 6px }
.se-note { font-size: 9px; color: #777; line-height: 1.5; margin-bottom: 2px }
.mitre-tag { display: inline-block; font-size: 8px; font-weight: 700; letter-spacing: 0.04em; color: #8a6d3b; background: #f3ecd9; border: 1px solid #d8c79a; border-radius: 3px; padding: 1px 5px; margin-left: 6px; white-space: nowrap }
.se-xref { border: 1px solid #ddd; border-left: 4px solid #999; border-radius: 4px; padding: 8px 12px; margin-bottom: 8px; page-break-inside: avoid; background: #fafafa }
.se-xref.critical { border-left-color: #E53935; background: #fef2f2 }
.se-xref.high { border-left-color: #F9A825; background: #fff8e1 }
.se-xref.medium { border-left-color: #AAAA22; background: #fcfce8 }
.se-xref-sev { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #555 }
.se-xref-msg { font-size: 10.5px; color: #444; margin-top: 3px; line-height: 1.5 }
</style></head><body>

<!-- PAGE 1: Summary -->
<div class="header">
  <div>
    <div class="logo">CANOPY <span>GUARD</span></div>
    <div class="domain">${domainHtml}</div>
  </div>
  <div class="meta">
    ${shortId ? `Audit ID: ${shortId}<br>` : ""}
    ${r?.timestamp ? `${esc(new Date(r.timestamp).toLocaleString())}<br>` : ""}
    ${num(r?.scan_duration_ms) ? `Scan: ${r.scan_duration_ms}ms<br>` : ""}
    Report for: ${esc(email)}
  </div>
</div>

${bannerText ? `<div class="unmeasured-banner">${esc(bannerText)}</div>` : ""}

${actions.length ? `<h2>${t("pdf.top_actions")}</h2>
${actions.map((a, i) => { const tx = actionText(a, t); return `<div class="action-box"><span class="action-num">${i + 1}</span><strong>${esc(tx.title)}</strong><br><span style="color:#555;font-size:10px">${esc(tx.desc)}</span></div>`; }).join("")}` : ""}

<div class="scores">
  ${scoreBlock(scores.overall, t("pdf.overall_score"))}
  <div class="score-divider"></div>
  ${scoreBlock(scores.seo, t("pdf.seo_score"))}
  ${scoreBlock(scores.aeo, t("pdf.aeo_score"))}
  ${scoreBlock(scores.geo, t("pdf.geo_score"))}
  ${scoreBlock(scores.security, t("pdf.security_score"))}
</div>
<div class="measured-line">${esc(measuredLineText(scores, t))}</div>

${insights.length ? `<h2>${t("ui.cross_ref_intel")}</h2>
${insights.map(i => `<div class="insight ${i.l === 'WARNING' ? 'warning' : ''}"><span class="insight-level ${i.l === 'CRITICAL' ? 'fail' : 'warn'}">${i.l}</span><span class="insight-title">${esc(i.t)}</span><div class="insight-body">${esc(i.b)}</div></div>`).join("")}` : ""}

<h2>${t("dashboard.compliance_check")}</h2>
<div class="compliance-grid">
${compliance.map(c => c.pass === null
  ? `<div class="compliance-item nm-bg"><span class="nm">·</span> ${t(`dashboard.compliance.${c.key}`)}: ${esc(NM)}</div>`
  : `<div class="compliance-item ${c.pass ? 'pass-bg' : 'fail-bg'}"><span class="${c.pass ? 'pass' : 'fail'}">${c.pass ? '✓' : '✗'}</span> ${t(`dashboard.compliance.${c.key}`)}</div>`).join("")}
</div>

<!-- PAGE 2: Executive Risks Summary -->
<div class="page-break"></div>
<div class="header">
  <div><div class="logo">CANOPY <span>GUARD</span></div><div style="font-size:12px;font-weight:700;color:#555;margin-top:4px">${domainHtml} · ${t("pdf.title")}</div></div>
  <div class="meta">Page 2 · ${shortId}</div>
</div>

<h2>${t("pdf.risks_summary_title")}</h2>

${riskBox(isTrafficLeak, "critical", "traffic_leak")}
${riskBox(isBlindAssistants, "warning", "blind_assistants")}
${riskBox(isOpenDoor, "critical", "exposed_endpoints")}
${riskBox(isFoundationCrack, "critical", "foundation_crack")}

${seSection}

<div class="cta">
  <h3>${t("pdf.cta_title")}</h3>
  <p>${t("pdf.cta_desc")}</p>
  <a href="https://calendly.com/hello-merakislove/new-meeting">${t("pdf.cta_btn")}</a>
</div>

<div class="footer">
  ${t("pdf.footer")}
</div>

</body></html>`
}
function downloadPDF(r,e,t){const w=window.open("","_blank");if(w){w.document.write(generatePDF(r,e,t));w.document.close();setTimeout(()=>w.print(),400)}}
// Unmeasured categories go out as null, never 0, so a lead record cannot show
// a score the scan did not produce.
async function storeLead(email,r,name=""){const{seo,aeo,geo,security,overall}=computeScores(r);try{const res=await fetch(`${API}/api/canopyguard/leads`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,domain:r.target_domain,audit_id:String(r.audit_id??"").slice(0,8),scores:{seo,aeo,geo,security},overall,report_json:JSON.stringify(r),timestamp:r.timestamp})});const data=await res.json().catch(()=>null);return (data&&data.access_token)||null}catch(e){console.error("[CG] Lead store:",e);return null}}
// Generation is PAID — two model calls per request — so it only ever runs from
// an explicit click, never automatically on scan. The engine resolves faq_schema
// and meta_desc independently: either can come back ok, skipped (too little text
// on the page, no model call made) or failed (validation). Returns the whole
// payload so the caller can tell those apart.
async function requestAeoFixes({email,token,domain,content}){
  const res=await fetch(`${API}/api/canopyguard/generate-aeo-fixes`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,token,domain,content})});
  const data=await res.json().catch(()=>null);
  if(!res.ok||!data||!data.outcome||data.outcome.success!==true){
    const msg=(data&&data.outcome&&data.outcome.error_message)||`Generation failed (${res.status}).`;
    const err=new Error(msg);err.code=(data&&data.outcome&&data.outcome.error_code)||null;throw err;
  }
  return data;
}

async function sendReportEmail(email,report,name=""){const{seo,aeo,geo,security,overall}=computeScores(report);try{await fetch(`/api/send-report`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,name,domain:report.target_domain,scores:{seo,aeo,geo,security,overall}})})}catch(e){console.error("[CG] Email send:",e)}}

// ── Report Components ──
// Renders the final value on first paint. The old count-up ran on
// requestAnimationFrame, which background tabs throttle, so a report opened
// in another tab could sit mid-count for a minute with every score reading
// nearly the same. score is the 0-100 integer from computeScores, or null.
function ScoreBlock({score,label,size=40,testId}){const { t } = useTranslation();const measured=typeof score==="number";return<div data-testid={testId} style={{textAlign:"center",minWidth:80}}><div style={{fontSize:size,fontWeight:700,fontFamily:mono,color:measured?scoreColor(score):C.gray,lineHeight:1}}>{measured?score:t("dashboard.not_available","N/A")}</div><div style={{fontSize:9,fontWeight:700,color:C.gray,textTransform:"uppercase",letterSpacing:2,marginTop:8}}>{label}</div>{!measured&&<div style={{fontSize:11,color:C.gray,marginTop:4}}>{t("dashboard.not_measured","Not measured")}</div>}</div>}
function Badge({good}){const { t } = useTranslation();return<span style={{fontFamily:mono,fontSize:10,fontWeight:700,letterSpacing:1,padding:"3px 8px",color:good?C.green:C.red,background:good?C.greenGlow:C.redGlow,border:`1px solid ${good?C.green:C.red}22`,borderRadius:2}}>{good?t("dashboard.pass"):t("dashboard.fail")}</span>}
function NotMeasuredBadge(){const { t } = useTranslation();return<span style={{fontFamily:mono,fontSize:10,fontWeight:700,letterSpacing:1,padding:"3px 8px",color:C.gray,background:"transparent",border:`1px solid ${C.blackBorder}`,borderRadius:2}}>{t("dashboard.not_measured_badge","NOT MEASURED")}</span>}
function formatMetric(row,t){if(row.unit==="clicks")return`${row.value} ${t("dashboard.clicks")}`;if(row.unit==="count")return row.value||t("dashboard.none");if(row.unit==="pct")return`${(row.value*100).toFixed(0)}%`;return row.value}
// A failing row renders its fix inline the moment one exists, the same way
// HeaderFix and EmailDnsFixes already do. There is no show/hide toggle: every
// fix a row can reach is present by the time the row renders, so the click only
// ever hid something the scan had already produced. That covers h1, canonical,
// llms_txt and org_schema, all of which arrive with the scan at no extra cost.
// The security row for HSTS deliberately passes no snippet: HeaderFix already
// renders that exact fix in Missing Headers, and once both rendered inline the
// same card appeared on the page twice. faq_schema and meta_desc are the
// nuance rather than the exception --
// they render the static template on load and swap to the engine's generated
// version when the AEO panel's explicit, paid call returns, which reaches this
// component through GeneratedFixesContext and so needs no second click. The
// generation trigger itself lives in AeoPanel and is untouched.
// row comes from getRows (src/lib/checks.js). A row that was not measured
// shows a neutral badge and never a fix: there is nothing observed to fix.
function Row({row}){const { t } = useTranslation();const fix=useFix(row.snippet);const isCheck=row.kind==="check";const measured=isCheck?row.pass!==null:row.value!==null;const hasFix=!!fix&&isCheck&&row.pass===false;return<div data-row={row.key}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${C.blackBorder}`}}><span style={{color:C.gray,fontSize:14}}>{t(row.labelKey,row.label)}</span><div style={{display:"flex",alignItems:"center",gap:8}}>{!measured?<NotMeasuredBadge/>:isCheck?<Badge good={row.pass}/>:<span style={{color:C.white,fontSize:13,fontFamily:mono,fontWeight:600}}>{formatMetric(row,t)}</span>}</div></div>{hasFix&&<FixSnippet snippet={fix}/>}</div>}
function Section({title,tag,desc,children}){return<div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:24,borderRadius:6}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><h3 style={{margin:0,fontSize:15,fontWeight:700,color:C.white,fontFamily:heading,textTransform:"uppercase",letterSpacing:0.5}}>{title}</h3><span style={{fontSize:9,fontWeight:700,fontFamily:mono,color:C.gold,letterSpacing:2,padding:"2px 8px",border:`1px solid ${C.goldBorder}`,borderRadius:2}}>{tag}</span></div>{desc&&<p style={{fontSize:12,color:C.grayDark,marginBottom:14,lineHeight:1.6}}>{desc}</p>}{children}</div>}
function ActionItem({action,index}){const { t } = useTranslation();const[show,setShow]=useState(false);const fix=useFix(action.fixKey);const text=actionText(action,t);return<div data-action={action.key}><div style={{display:"flex",gap:14,alignItems:"flex-start"}}><div style={{fontSize:20,fontWeight:700,fontFamily:mono,color:C.gold,lineHeight:1,minWidth:24}}>{index+1}</div><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{fontSize:14,fontWeight:700,color:C.white}}>{text.title}</div>{fix&&<button onClick={()=>setShow(!show)} style={{background:show?C.redGlow:"transparent",border:`1px solid ${show?C.red:C.blackBorder}`,color:show?C.red:C.grayDark,fontSize:9,fontFamily:mono,fontWeight:700,padding:"2px 8px",cursor:"pointer",letterSpacing:1,borderRadius:2}}>{show?t("dashboard.hide_code"):t("dashboard.show_fix")}</button>}</div><div style={{fontSize:13,color:C.gray,lineHeight:1.5,marginTop:3}}>{text.desc}</div>{show&&fix&&<FixSnippet snippet={fix}/>}</div></div></div>}
function Insights({data,scores}){
  const { t } = useTranslation();
  const ins=getInsights(data,scores,t);
  if(!ins.length)return null;
  return<div style={{background:C.blackCard,border:`1px solid ${C.goldBorder}`,padding:24,marginBottom:20,borderRadius:6}}><h3 style={{margin:"0 0 20px",fontSize:14,fontWeight:700,color:C.gold,fontFamily:heading,textTransform:"uppercase",letterSpacing:1}}>{t("ui.cross_ref_intel", "Cross-Reference Intelligence")}</h3><div style={{display:"flex",flexDirection:"column",gap:16}}>{ins.map((i,x)=><div key={x} style={{borderLeft:`3px solid ${i.l==="CRITICAL"?C.red:C.amber}`,paddingLeft:16}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><span style={{fontSize:9,fontWeight:800,fontFamily:mono,letterSpacing:1.5,color:i.l==="CRITICAL"?C.red:C.amber}}>{i.l}</span><span style={{fontSize:14,fontWeight:700,color:C.white}}>{i.t}</span></div><p style={{margin:0,fontSize:13,color:C.gray,lineHeight:1.65}}>{i.b}</p></div>)}</div></div>;
}

// ── Measurement cards ──
function UnmeasuredBanner({report,scores}){const { t } = useTranslation();const text=unmeasuredBannerText(report,scores,t);if(!text)return null;return<div role="status" data-testid="unmeasured-banner" style={{border:`1px solid ${C.amber}`,borderLeft:`3px solid ${C.amber}`,background:C.amberGlow,padding:"14px 18px",borderRadius:6,marginBottom:24,fontSize:13,color:C.muted,lineHeight:1.65}}>{text}</div>}
const cardStyle={background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:24,borderRadius:6,display:"flex",flexDirection:"column",gap:12};
const cardLabel={fontSize:10,fontWeight:700,fontFamily:mono,color:C.gray,letterSpacing:1.5,textTransform:"uppercase"};
// Built only from the categories that were measured, with the matching divisor,
// so the sum on screen can be checked by hand against the overall above it.
function FormulaCard({scores}){
  const { t } = useTranslation();
  const terms=scores.measured.map(c=>`${categoryName(c,t)} ${scores[c]}`);
  return<div style={cardStyle} data-testid="formula-card">
    <span style={cardLabel}>{t("dashboard.formula.title","How your score is calculated")}</span>
    {scores.overall===null
      ?<div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>{t("dashboard.formula.none","No category could be measured on this scan, so there is no overall score.")}</div>
      :<><div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>{t("dashboard.formula.desc","Your overall score is the average of the category scores we measured.")}</div>
        <div data-testid="formula" style={{fontSize:15,fontFamily:mono,fontWeight:700,color:C.white,lineHeight:1.5}}>({terms.join(" + ")}) ÷ {scores.measured.length} = {scores.overall}</div></>}
    {scores.unmeasured.length>0&&scores.overall!==null&&<div style={{fontSize:11,color:C.gray}}>{t("dashboard.formula.excluded",{defaultValue:"Not measured and left out: {{list}}.",list:scores.unmeasured.map(c=>categoryName(c,t)).join(", ")})}</div>}
  </div>;
}
// Counts the same pass/fail values the detail rows render; not-measured rows
// are in neither number.
function GapsCard({checks}){
  const { t } = useTranslation();
  const g=summarizeGaps(checks);
  const breakdown=Object.entries(g.byCategory).map(([c,n])=>`${categoryName(c,t)} ${n}`).join(" · ");
  return<div style={cardStyle} data-testid="gaps-card">
    <span style={cardLabel}>{t("dashboard.gaps.title","Gaps found")}</span>
    {g.total===0
      ?<div style={{fontSize:13,color:C.muted}}>{t("dashboard.gaps.none","No checks could be measured on this scan.")}</div>
      :<><div data-testid="gaps-headline" data-failing={g.failing} data-total={g.total} style={{fontSize:26,fontWeight:700,fontFamily:mono,color:g.failing>0?C.red:C.green,lineHeight:1.2}}>{g.total===1?t("dashboard.gaps.headline_single",{defaultValue:"{{failing}} of 1 check failing",failing:g.failing}):t("dashboard.gaps.headline",{defaultValue:"{{failing}} of {{total}} checks failing",failing:g.failing,total:g.total})}</div>
        <div style={{fontSize:12,fontFamily:mono,color:C.muted}}>{breakdown}</div></>}
    <div style={{fontSize:11,color:C.gray,lineHeight:1.6}}>{t("dashboard.gaps.note","Counted from the pass and fail rows below. Rows we could not measure are left out.")}</div>
  </div>;
}
function CategoryRows({rows,category}){return rows.filter(r=>r.category===category).map(r=><Row key={r.key} row={r}/>)}
function EmailGate({onSubmit,onClose,intent="report"}){const isAeo=intent==="aeo";const { t } = useTranslation();const[email,setEmail]=useState("");const[name,setName]=useState("");const[sending,setSending]=useState(false);const ref=useRef(null);useEffect(()=>{ref.current?.focus()},[]);const submit=async()=>{if(!email.includes("@"))return;setSending(true);await onSubmit(email,name);setSending(false)};return<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}><motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{duration:0.2}} style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:40,maxWidth:420,width:"100%",borderRadius:8}} onClick={e=>e.stopPropagation()}><h2 style={{fontSize:22,fontWeight:700,color:C.white,margin:"0 0 6px",fontFamily:heading}}>{t("dashboard.email_gate.title_get")} <span style={{color:C.gold}}>{t(isAeo?"dashboard.email_gate.title_fixes":"dashboard.email_gate.title_report")}</span></h2><p style={{color:C.gray,fontSize:14,margin:"0 0 28px",lineHeight:1.7}}>{t(isAeo?"dashboard.email_gate.desc_aeo":"dashboard.email_gate.desc")}</p><div style={{display:"flex",flexDirection:"column",gap:12}}><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={t("dashboard.email_gate.name_placeholder")} style={{background:C.black,border:`1px solid ${C.blackBorder}`,color:C.white,padding:"14px 16px",fontSize:14,outline:"none",borderRadius:4}}/><input ref={ref} type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={t("dashboard.email_gate.email_placeholder")} style={{background:C.black,border:`1px solid ${C.blackBorder}`,color:C.white,padding:"14px 16px",fontSize:14,fontFamily:mono,outline:"none",borderRadius:4}}/><button onClick={submit} disabled={sending||!email.includes("@")} style={{background:sending?C.grayDark:C.gold,border:"none",color:C.black,fontWeight:700,fontSize:14,padding:"16px 32px",cursor:sending?"default":"pointer",letterSpacing:1,opacity:!email.includes("@")?0.5:1,borderRadius:4}}>{sending?t("dashboard.email_gate.btn_processing"):t(isAeo?"dashboard.email_gate.btn_generate":"dashboard.email_gate.btn_download")}</button></div><p style={{color:C.grayDark,fontSize:10,marginTop:16,fontFamily:mono}}>{t("dashboard.email_gate.spam_notice")}</p></motion.div></div>}

// ═══ METHODOLOGY PAGE ═══
function MethodologyPage({onBack}){
  const S=p=><div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:28,marginBottom:16,borderRadius:6,...(p.style||{})}}>{p.children}</div>;
  const H=({children})=><h3 style={{fontSize:18,fontWeight:700,color:C.white,fontFamily:heading,margin:"0 0 14px"}}>{children}</h3>;
  const P=({children})=><p style={{fontSize:15,color:C.muted,lineHeight:1.8,margin:"0 0 10px"}}>{children}</p>;
  const W=({label,val})=><div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.blackBorder}`}}><span style={{color:C.muted,fontSize:14}}>{label}</span><span style={{color:C.white,fontSize:14,fontFamily:mono,fontWeight:700}}>{val}</span></div>;
  return<div style={{minHeight:"100vh",background:C.black,color:C.white}}><link href={FONTS_URL} rel="stylesheet"/><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 28px",borderBottom:`1px solid ${C.blackBorder}`}}><span style={{fontSize:15,fontWeight:700,fontFamily:heading,cursor:"pointer"}} onClick={onBack}>CANOPY <span style={{color:C.gold}}>GUARD</span></span><button onClick={onBack} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.gray,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:4}}>Back</button></div>
  <div style={{maxWidth:760,margin:"0 auto",padding:"48px 20px"}}><p style={{color:C.grayDark,fontSize:10,fontFamily:mono,letterSpacing:2,margin:"0 0 8px"}}>DOCUMENTATION</p><h1 style={{fontSize:36,fontWeight:700,fontFamily:heading,letterSpacing:-1,margin:"0 0 8px"}}>Scoring <span style={{color:C.gold}}>Methodology</span></h1><p style={{fontSize:16,color:C.muted,lineHeight:1.8,margin:"0 0 48px"}}>How every score is calculated, what the weights are, and why. Published so you can verify, challenge, and improve.</p>
  <S><H>SEO Score (0 to 100) · 14 Signals</H><P>Measures how well search engines can crawl, index, and rank your site. Scoring 100 requires fast response, 1500+ words, 20+ internal links, perfect meta tags, and a sitemap.</P><W label="Crawlable" val="0.10"/><W label="Exactly 1 H1 (multiple penalized)" val="0.10"/><W label="Meta description + ideal length (120-160)" val="0.10"/><W label="Title tag + ideal length (30-60)" val="0.10"/><W label="Canonical URL match" val="0.08"/><W label="Viewport meta tag" val="0.05"/><W label="HTML lang attribute" val="0.03"/><W label="Image alt text coverage" val="0.08"/><W label="Word count (gradient: 200/500/1500+)" val="0.10"/><W label="Internal links (gradient: 5/10/20+)" val="0.10"/><W label="Sitemap.xml exists" val="0.06"/><W label="Response time (under 1s/3s/3s+)" val="0.05"/><W label="H2 heading structure" val="0.05"/></S>
  <S><H>AEO Score (0 to 100) · 10 Signals</H><P>Measures how well AI answer engines can extract and cite your content. Requires multiple schema types, 5+ FAQ items, and strong Q&A density for full marks.</P><W label="Any JSON-LD present" val="0.10"/><W label="Organization schema" val="0.12"/><W label="FAQ schema" val="0.10"/><W label="FAQ item count (1/3/5+)" val="0.12"/><W label="LocalBusiness schema" val="0.08"/><W label="Breadcrumb schema" val="0.06"/><W label="Schema type diversity (1/2/4+)" val="0.10"/><W label="Zero validation errors" val="0.10"/><W label="Q&A density" val="0.12"/><W label="JSON-LD block count (1/2/3+)" val="0.10"/></S>
  <S><H>GEO Score (0 to 100) · 8 Signals</H><P>Measures how generative AI models chunk, retrieve, and cite your pages. Based on how RAG systems process content.</P><W label="Chunking efficiency" val="0.25"/><W label="Citation precision" val="0.20"/><W label="llms.txt present + length bonus" val="0.23"/><W label="Content depth by word count" val="0.10"/><W label="Lists present" val="0.05"/><W label="Tables present" val="0.04"/><W label="Heading-to-content ratio" val="0.08"/><W label="Baseline reachability" val="0.05"/></S>
  <S><H>Security Score (0 to 100) · 73 Signals</H><P>External security posture. Individual headers weighted by protective scope. Scoring 100 requires all headers, HSTS 1yr+, HTTPS redirect, balanced AI policy, and secure cookies. The 15 weighted signals below form the base posture score; v3.3 blends in additional checks across ten enhanced layers: TLS certificate depth, DNS security quality, HTTP response analysis, HTML source parsing, path/exposure probing, malware &amp; reputation (Google Safe Browsing + blacklists), expanded footprint (Subresource Integrity, cookie flags, full TLS cipher enumeration, certificate transparency), DNS &amp; email depth (SPF mechanisms, DMARC policy, registrar lock + expiration), sensitive-file exposure, and Supabase anonymous exposure (anonymous PostgREST reads against a Supabase anon key shipped in the site's own code). That brings the total to 73 security signals. Each finding identifies the exposure condition associated with a MITRE ATT&amp;CK technique.</P><W label="TLS valid" val="0.10"/><W label="HSTS + max-age bonus" val="0.08"/><W label="HTTPS redirect" val="0.08"/><W label="Content-Security-Policy" val="0.08"/><W label="Strict-Transport-Security" val="0.06"/><W label="X-Frame-Options" val="0.05"/><W label="X-Content-Type-Options" val="0.04"/><W label="Referrer-Policy" val="0.04"/><W label="Permissions-Policy" val="0.04"/><W label="Cookie security flags" val="0.06"/><W label="AI crawl policy" val="0.08"/><W label="Bot awareness" val="0.06"/><W label="Rate limiting" val="0.04"/><W label="No exposed endpoints" val="0.08"/><W label="Data provenance" val="0.04"/></S>
  <S style={{borderColor:C.goldBorder}}><H>Open Methodology</H><P>This scoring system is published so anyone can verify how their score was calculated. If you believe a weight is wrong or a signal is missing, reach out. The methodology improves from real-world feedback.</P><P>Adam McClarin, CISSP · Meraki is Love Digital | Soulful Tech™</P></S>
  </div></div>}

// ═══ MAIN APP ═══
// initialReport opens straight onto the report view with a given scan result.
// The site never passes it; the render tests use it to mount the real report
// view with a fixture.
export default function CanopyGuard({initialReport=null}={}){
  const { t } = useTranslation();
  const[domain,setDomain]=useState(initialReport?.target_domain||"");const[phase,setPhase]=useState(initialReport?"report":"landing");const[scanIndex,setScanIndex]=useState(0);
  const[report,setReport]=useState(initialReport);const[scanError,setScanError]=useState("");
  const[showGate,setShowGate]=useState(false);const[leadCaptured,setLeadCaptured]=useState(false);const[capturedEmail,setCapturedEmail]=useState("");
  const[showMethodology,setShowMethodology]=useState(false);const ref=useRef(null);
  // AEO generation. leadToken comes back from the same lead capture that gates
  // the PDF, so an email already given is never asked for twice. gateIntent
  // records what the gate was opened FOR, since it now serves two actions.
  const[leadToken,setLeadToken]=useState(null);/* {token,domain} — the engine mints per email+domain */const[gateIntent,setGateIntent]=useState("report");
  const[aeoPhase,setAeoPhase]=useState("idle");const[aeoGen,setAeoGen]=useState(null);const[aeoError,setAeoError]=useState("");const[aeoFixes,setAeoFixes]=useState(null);

  const startScan=async(sd)=>{const cleaned=(sd||domain).replace(/^https?:\/\//,"").replace(/\/+$/,"").trim();if(!cleaned)return;setDomain(cleaned);setPhase("scanning");setScanIndex(0);setScanError("");setAeoPhase("idle");setAeoGen(null);setAeoError("");setAeoFixes(null);let idx=0;const ticker=setInterval(()=>{if(idx<PHASES.length-1){idx++;setScanIndex(idx)}},600);try{const res=await fetch(`${API}/api/scan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({domain:cleaned})});clearInterval(ticker);if(!res.ok){const err=await res.json();throw new Error(err.error||"Scan failed")}const data=await res.json();setScanIndex(PHASES.length-1);setTimeout(()=>{setReport(data);setPhase("report")},500)}catch(err){clearInterval(ticker);setScanError(err.message||"Scan failed.");setTimeout(()=>setPhase("landing"),3000)}};
  const reset=()=>{setPhase("landing");setDomain("");setReport(null);setLeadCaptured(false);setCapturedEmail("");setShowGate(false);setScanError("");setLeadToken(null);setGateIntent("report");setAeoPhase("idle");setAeoGen(null);setAeoError("");setAeoFixes(null)};
  const runAeo=useCallback(async(email,token)=>{
    if(!token){setAeoPhase("error");setAeoError(t("dashboard.aeo_gen.err_no_token"));return}
    setAeoPhase("loading");setAeoError("");
    try{
      const data=await requestAeoFixes({email,token,domain:report.target_domain,content:report.content_extract||{}});
      setAeoGen(data.generation||null);
      // Only keys the engine actually produced; a skipped or failed field is
      // simply absent, so nothing half-rendered reaches the fix cards.
      setAeoFixes(data.generated_fixes&&Object.keys(data.generated_fixes).length?data.generated_fixes:null);
      setAeoPhase("done");
    }catch(e){setAeoError(e.message||t("dashboard.aeo_gen.err_generic"));setAeoPhase("error")}
  },[report,t]);
  const handleEmail=useCallback(async(email,name)=>{const token=await storeLead(email,report,name);sendReportEmail(email,report,name);setCapturedEmail(email);setLeadToken(token?{token,domain:report.target_domain}:null);setLeadCaptured(true);setShowGate(false);if(gateIntent==="aeo"){runAeo(email,token)}else{downloadPDF(report,email,t)}},[report,t,gateIntent,runAeo]);
  // Reuses the captured email when there is one; only opens the gate otherwise.
  const startAeo=useCallback(async()=>{
    if(!(leadCaptured&&capturedEmail)){setGateIntent("aeo");setShowGate(true);return}
    if(leadToken&&leadToken.domain===report.target_domain){runAeo(capturedEmail,leadToken.token);return}
    // Same person, different domain: mint a token for this one without asking
    // for the address again.
    setAeoPhase("loading");setAeoError("");
    const token=await storeLead(capturedEmail,report);
    setLeadToken(token?{token,domain:report.target_domain}:null);
    runAeo(capturedEmail,token);
  },[leadCaptured,capturedEmail,leadToken,report,runAeo]);

  // Deep link: a ?domain= query (e.g. from the report delivery email) prefills
  // and auto-runs the scan so the recipient lands on their report to download.
  useEffect(()=>{if(typeof window==="undefined")return;const qd=new URLSearchParams(window.location.search).get("domain");if(!qd)return;const cleaned=qd.replace(/^https?:\/\//,"").replace(/\/+$/,"").trim();if(cleaned){setDomain(cleaned);startScan(cleaned)}/* eslint-disable-next-line react-hooks/exhaustive-deps */},[]);

  if(showMethodology)return<MethodologyPage onBack={()=>setShowMethodology(false)}/>;

  // ═══ LANDING — redesigned homepage (Home.jsx) ═══
  if(phase==="landing"){
    return <Home domain={domain} setDomain={setDomain} startScan={startScan} scanError={scanError} inputRef={ref}/>;
  }

  // ═══ SCANNING ═══
  if(phase==="scanning"){return<div style={{minHeight:"100vh",background:C.black,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,fontFamily:body}}><link href={FONTS_URL} rel="stylesheet"/><div style={{maxWidth:440,width:"100%"}}><h2 style={{color:C.white,fontSize:18,fontWeight:700,margin:"0 0 4px",fontFamily:heading}}>Scanning <span style={{color:C.gold}}>{domain}</span></h2><p style={{color:C.gray,fontSize:13,fontFamily:mono,margin:"0 0 32px"}}>{PHASES[scanIndex]}...</p><div style={{width:"100%",height:2,background:C.blackBorder,marginBottom:32,borderRadius:1}}><motion.div animate={{width:`${((scanIndex+1)/PHASES.length)*100}%`}} transition={{duration:0.3}} style={{height:"100%",background:C.gold,borderRadius:1}}/></div><div style={{display:"flex",flexDirection:"column",gap:2}}>{PHASES.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 0",opacity:i<=scanIndex?1:0.25,transition:"opacity 0.3s"}}><span style={{fontFamily:mono,fontSize:11,color:i<scanIndex?C.green:i===scanIndex?C.gold:C.grayDark,width:16}}>{i<scanIndex?"✓":i===scanIndex?"▸":"·"}</span><span style={{fontSize:13,color:i<=scanIndex?C.muted:C.grayDark}}>{p}</span></div>)}</div></div></div>}

  // ═══ REPORT ═══
  const d=report;const sec=d.security_roots;const scores=computeScores(d);const actions=getTopActions(d,scores);const compliance=getComplianceChecks(d,scores);
  const rows=getRows(d,scores);const checks=getChecks(d,scores);
  const missingHeaders=Array.isArray(sec?.application_security?.missing_secure_headers)?sec.application_security.missing_secure_headers:[];
  const aeoMeasured=!scores.unmeasured.includes("aeo");
  const hs=d.visibility_canopy?.seo_branch?.html_structure;const sv=d.visibility_canopy?.aeo_branch?.schema_validation;
  const scanMeta=[d.timestamp?new Date(d.timestamp).toLocaleString():null,d.audit_id?String(d.audit_id).slice(0,8):null,typeof d.scan_duration_ms==="number"?`${d.scan_duration_ms}ms`:null].filter(Boolean).join(" · ");
  const mergedFixes=aeoFixes?{...(d.generated_fixes||{}),...aeoFixes}:(d.generated_fixes||null);
  return<GeneratedFixesContext.Provider value={mergedFixes}><div style={{minHeight:"100vh",background:C.black,fontFamily:body,color:C.white}}><link href={FONTS_URL} rel="stylesheet"/>{showGate&&<EmailGate intent={gateIntent} onSubmit={handleEmail} onClose={()=>{setShowGate(false);setGateIntent("report")}}/>}
  {/* Nav */}
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",borderBottom:`1px solid ${C.blackBorder}`}}><span style={{fontSize:14,fontWeight:700,fontFamily:heading,cursor:"pointer"}} onClick={reset}>CANOPY <span style={{color:C.gold}}>GUARD</span></span><div style={{display:"flex",gap:8,alignItems:"center"}}>{!leadCaptured?<button onClick={()=>setShowGate(true)} style={{background:C.gold,border:"none",color:C.black,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,borderRadius:3}}>{t("dashboard.get_report")}</button>:<button onClick={()=>downloadPDF(report,capturedEmail,t)} style={{background:"transparent",border:`1px solid ${C.green}`,color:C.green,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:mono,borderRadius:3}}>↓ PDF</button>}<button onClick={()=>setShowMethodology(true)} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.grayDark,padding:"6px 14px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:mono,letterSpacing:1,borderRadius:3}}>{t("dashboard.docs")}</button><button onClick={reset} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.gray,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:3}}>{t("dashboard.new_scan")}</button></div></div>
  <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px"}}>
  <div style={{marginBottom:32}}><p style={{color:C.grayDark,fontSize:10,fontFamily:mono,letterSpacing:2,margin:"0 0 8px"}}>{t("dashboard.audit_report")}</p><h1 style={{fontSize:"clamp(24px,4vw,36px)",fontWeight:700,margin:"0 0 4px",fontFamily:heading,letterSpacing:-1}}>{d.target_domain}</h1>{scanMeta&&<p style={{color:C.grayDark,fontSize:11,fontFamily:mono}}>{scanMeta}</p>}</div>
  <UnmeasuredBanner report={d} scores={scores}/>
  {/* Top Actions */}
  {actions.length>0&&<div data-testid="top-actions" style={{marginBottom:24,padding:24,background:C.blackCard,border:`1px solid ${C.goldBorder}`,borderRadius:6}}><h3 style={{fontSize:14,fontWeight:700,color:C.gold,fontFamily:heading,textTransform:"uppercase",letterSpacing:1,margin:"0 0 16px"}}>{t("dashboard.top_actions")}</h3><div style={{display:"flex",flexDirection:"column",gap:14}}>{actions.map((a,i)=><ActionItem key={a.key} action={a} index={i}/>)}</div></div>}
  {/* Scores */}
  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.5}} style={{padding:"40px 24px 20px",marginBottom:24,border:`1px solid ${C.blackBorder}`,background:C.blackCard,borderRadius:6}}>
    <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",flexWrap:"wrap",gap:40}}>
      <ScoreBlock score={scores.overall} label={t("dashboard.overall")} size={72} testId="score-overall"/>
      <div style={{width:1,height:60,background:C.blackBorder}}/>
      <ScoreBlock score={scores.seo} label={t("dashboard.seo")} testId="score-seo"/><ScoreBlock score={scores.aeo} label={t("dashboard.aeo")} testId="score-aeo"/><ScoreBlock score={scores.geo} label={t("dashboard.geo")} testId="score-geo"/><ScoreBlock score={scores.security} label={t("dashboard.security")} testId="score-security"/>
    </div>
    <p data-testid="measured-line" style={{textAlign:"center",fontSize:11,color:C.gray,fontFamily:mono,margin:"24px 0 0"}}>{measuredLineText(scores,t)}</p>
  </motion.div>

  {/* How the score is calculated, and what failed */}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:24}}>
    <FormulaCard scores={scores}/>
    <GapsCard checks={checks}/>
  </div>

  <Insights data={d} scores={scores}/>
  {/* Detail Grid */}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
    <Section title={t("dashboard.sections.seo_title")} tag={t("dashboard.sections.seo_tag")} desc={t("dashboard.sections.seo_desc")}><CategoryRows rows={rows} category="seo"/></Section>
    <Section title={t("dashboard.sections.aeo_title")} tag={t("dashboard.sections.aeo_tag")} desc={t("dashboard.sections.aeo_desc")}><CategoryRows rows={rows} category="aeo"/>{aeoMeasured&&<AeoPanel phase={aeoPhase} gen={aeoGen} error={aeoError} onStart={startAeo} canGenerate={d.content_extract!==null&&(sv?.has_faq_json_ld===false||hs?.missing_meta_descriptions===true)}/>}</Section>
    <Section title={t("dashboard.sections.geo_title")} tag={t("dashboard.sections.geo_tag")} desc={t("dashboard.sections.geo_desc")}><CategoryRows rows={rows} category="geo"/></Section>
    <Section title={t("dashboard.sections.security_title")} tag={t("dashboard.sections.security_tag")} desc={t("dashboard.sections.security_desc")}><CategoryRows rows={rows} category="security"/></Section>
  </div>
  {/* Enhanced 9-layer security posture (v3.1) */}
  {d.security_enhanced && <SecurityEnhanced data={d.security_enhanced}/>}
  {/* Compliance */}
  <div style={{padding:24,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:20,borderRadius:6}}><h4 style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:heading,textTransform:"uppercase",letterSpacing:1,margin:"0 0 16px"}}>{t("dashboard.compliance_check")}</h4><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8}}>{compliance.map(c=>{const nm=c.pass===null;const col=nm?C.gray:c.pass?C.green:C.red;return<div key={c.key} data-compliance={c.key} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:nm?"transparent":c.pass?C.greenGlow:C.redGlow,border:`1px solid ${nm?C.blackBorder:col+"22"}`,borderRadius:3,flexWrap:"wrap"}}><span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:col}}>{nm?"·":c.pass?"✓":"✗"}</span><span style={{fontSize:12,color:C.muted}}>{t(`dashboard.compliance.${c.key}`)}</span>{nm&&<span style={{fontSize:9,fontFamily:mono,fontWeight:700,letterSpacing:1,color:C.gray}}>{t("dashboard.not_measured_badge","NOT MEASURED")}</span>}</div>})}</div></div>
  {/* Missing Headers */}
  {missingHeaders.length>0&&<div style={{padding:20,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:20,borderRadius:6}}><h4 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.red,letterSpacing:1,textTransform:"uppercase"}}>{t("dashboard.missing_headers")}</h4><div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>{missingHeaders.map(h=>{const m=MITRE_TECHNIQUES[h];return<div key={h} style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:8}}><code style={{padding:"4px 10px",fontSize:11,fontFamily:mono,fontWeight:600,background:C.redGlow,color:C.red,border:`1px solid ${C.red}33`,borderRadius:2}}>{h}</code>{m&&<MitreBadge technique={m}/>}</div>})}</div>{missingHeaders.map(h=><HeaderFix key={h} header={h}/>)}</div>}
  {/* Email, DNS & cookie fixes — engine-generated only (v3.2+) */}
  <EmailDnsFixes/>
  {/* CTA */}
  <div style={{textAlign:"center",padding:48,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:32,borderRadius:6}}>
    {!leadCaptured?<><h2 style={{fontSize:28,fontWeight:700,margin:"0 0 8px",fontFamily:heading}}>{t("dashboard.cta.get_full_title")} <span style={{color:C.gold}}>{t("dashboard.cta.get_full_report")}</span></h2><p style={{color:C.gray,fontSize:14,margin:"0 0 28px",maxWidth:440,marginLeft:"auto",marginRight:"auto",lineHeight:1.7}}>{t("dashboard.cta.download_desc")}</p><button onClick={()=>setShowGate(true)} style={{background:C.gold,color:C.black,border:"none",fontWeight:700,fontSize:14,padding:"18px 44px",letterSpacing:1,cursor:"pointer",fontFamily:heading,borderRadius:4}}>{t("dashboard.cta.btn_get_report")}</button></>:<><div style={{fontSize:36,marginBottom:12,color:C.green}}>✓</div><h2 style={{fontSize:28,fontWeight:700,margin:"0 0 8px",fontFamily:heading}}>{t("dashboard.cta.delivered_to")} <span style={{color:C.gold}}>{capturedEmail}</span></h2><p style={{color:C.gray,fontSize:14,margin:"0 0 28px",maxWidth:460,marginLeft:"auto",marginRight:"auto",lineHeight:1.7}}>{t("dashboard.cta.resolve_desc")}</p><a href="https://calendly.com/hello-merakislove/new-meeting" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",background:C.gold,color:C.black,fontWeight:700,fontSize:14,padding:"18px 44px",textDecoration:"none",letterSpacing:1,fontFamily:heading,borderRadius:4}}>{t("dashboard.cta.btn_walkthrough")}</a><div style={{marginTop:16}}><button onClick={()=>downloadPDF(report,capturedEmail,t)} style={{background:"transparent",border:"none",color:C.gray,fontSize:12,cursor:"pointer",fontFamily:mono,textDecoration:"underline"}}>{t("dashboard.cta.download_again")}</button></div></>}
    <p style={{color:C.grayDark,fontSize:11,marginTop:24,fontFamily:mono}}>{t("dashboard.cta.author")}</p>
  </div>
  <div style={{textAlign:"center",padding:"20px 0",borderTop:`1px solid ${C.blackBorder}`}}><p style={{fontSize:11,color:C.grayDark,margin:"0 0 4px"}}>{t("dashboard.footer.built_by")}</p><a href="/privacy" style={{fontSize:11,color:C.grayDark,textDecoration:"underline"}}>{t("dashboard.footer.privacy_policy")}</a></div>
  </div></div></GeneratedFixesContext.Provider>}
