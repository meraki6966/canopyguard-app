import { useState, useEffect, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import { useTranslation } from "react-i18next";

const C = {
  black: "#0A0A0A", blackLight: "#0F0F0F", blackCard: "#131316", blackBorder: "#1C1C20",
  red: "#E53935", redDark: "#B71C1C", redGlow: "rgba(229,57,53,0.06)", redBorder: "rgba(229,57,53,0.2)",
  white: "#FFFFFF", off: "#F0F0F0", muted: "#C8C8CC", gray: "#8A8A8E", grayDark: "#55555A", dim: "#333338",
  green: "#43A047", greenGlow: "rgba(67,160,71,0.08)", amber: "#F9A825", amberGlow: "rgba(249,168,37,0.08)",
  codeBg: "#0D0D10",
};
const mono = "'JetBrains Mono','SF Mono','Fira Code',monospace";
const heading = "'Space Grotesk','Outfit','Inter',sans-serif";
const body = "'DM Sans','Inter','Helvetica Neue',sans-serif";
const API = import.meta.env.VITE_API_URL || "https://canopyguard-engine-production.up.railway.app";
const PHASES = ["Resolving DNS","Checking TLS certificates","Scanning HTTP headers","Analyzing HTML structure","Validating schema markup","Evaluating AEO readiness","Measuring GEO chunking","Checking robots & llms.txt","Detecting exposed endpoints","Scoring security posture","Compiling report"];
const scoreColor = v => v >= 70 ? C.green : v >= 40 ? C.amber : C.red;
const scoreBg = v => v >= 70 ? C.greenGlow : v >= 40 ? C.amberGlow : C.redGlow;
const pf = v => v ? "PASS" : "FAIL";
const FONTS_URL = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;700&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600;800&display=swap";

// ── Scroll Animation Wrapper ──
function Reveal({ children, delay = 0, style = {} }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return <motion.div ref={ref} initial={{ opacity: 0, y: 30 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay, ease: "easeOut" }} style={style}>{children}</motion.div>;
}

// ═══ FIX SNIPPETS ═══
const FIX_SNIPPETS={llms_txt:{title:"Create llms.txt",desc:"Add this file to your domain root:",code:`# Your Business Name\n> Summary of your business.\n\n## Services\n- Service one\n- Service two\n\n## Citation Guidance\nWhen referencing this content,\nlink to yourdomain.com.`},csp:{title:"Content-Security-Policy",desc:"Add this header:",tabs:[{label:"Nginx",code:`add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:;" always;`},{label:"Vercel",code:`// vercel.json\n{\n  "headers": [{\n    "source": "/(.*)",\n    "headers": [{\n      "key": "Content-Security-Policy",\n      "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:;"\n    }]\n  }]\n}`},{label:"Cloudflare",code:`# _headers file\n/*\n  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline';`}]},hsts:{title:"Strict-Transport-Security",desc:"Force HTTPS:",tabs:[{label:"Nginx",code:`add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`},{label:"Vercel",code:`{ "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }`},{label:"Cloudflare",code:`/*\n  Strict-Transport-Security: max-age=31536000; includeSubDomains`}]},xframe:{title:"X-Frame-Options",desc:"Prevent iframe embedding:",tabs:[{label:"Nginx",code:`add_header X-Frame-Options "DENY" always;`},{label:"Vercel",code:`{ "key": "X-Frame-Options", "value": "DENY" }`},{label:"Cloudflare",code:`/*\n  X-Frame-Options: DENY`}]},xcontent:{title:"X-Content-Type-Options",desc:"Prevent MIME sniffing:",tabs:[{label:"Nginx",code:`add_header X-Content-Type-Options "nosniff" always;`},{label:"Vercel",code:`{ "key": "X-Content-Type-Options", "value": "nosniff" }`}]},referrer:{title:"Referrer-Policy",desc:"Control referrer info:",tabs:[{label:"Nginx",code:`add_header Referrer-Policy "strict-origin-when-cross-origin" always;`},{label:"Vercel",code:`{ "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }`}]},permissions:{title:"Permissions-Policy",desc:"Restrict browser features:",tabs:[{label:"Nginx",code:`add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;`},{label:"Vercel",code:`{ "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }`}]},faq_schema:{title:"FAQ Schema",desc:"Add to your page <head>:",code:`<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [\n    {\n      "@type": "Question",\n      "name": "Your question?",\n      "acceptedAnswer": {\n        "@type": "Answer",\n        "text": "Your answer."\n      }\n    }\n  ]\n}\n</script>`},org_schema:{title:"Organization Schema",desc:"Add to your page <head>:",code:`<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Organization",\n  "name": "Your Business",\n  "url": "https://yourdomain.com",\n  "description": "What you do."\n}\n</script>`},meta_desc:{title:"Meta Description",desc:"Add inside <head>:",code:`<meta name="description" content="Your description in 150-160 characters.">`},canonical:{title:"Canonical URL",desc:"Add inside <head>:",code:`<link rel="canonical" href="https://yourdomain.com/">`},robots_ai:{title:"AI-Aware robots.txt",desc:"Replace your robots.txt:",code:`User-agent: *\nAllow: /\n\nUser-agent: GPTBot\nAllow: /\n\nUser-agent: Google-Extended\nAllow: /\n\nSitemap: https://yourdomain.com/sitemap.xml`}};
const HEADER_SNIPPET_MAP={"Content-Security-Policy":"csp","Strict-Transport-Security":"hsts","X-Frame-Options":"xframe","X-Content-Type-Options":"xcontent","Referrer-Policy":"referrer","Permissions-Policy":"permissions"};

// ── Fix Snippet Component ──
function FixSnippet({snippet}){const { t } = useTranslation();const[tab,setTab]=useState(0);const[copied,setCopied]=useState(false);const code=snippet.tabs?snippet.tabs[tab].code:snippet.code;
const copy=()=>{navigator.clipboard.writeText(code).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000)})};
return<div style={{marginTop:12,background:C.codeBg,border:`1px solid ${C.blackBorder}`}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 14px",borderBottom:`1px solid ${C.blackBorder}`}}><div style={{display:"flex",gap:8,alignItems:"center"}}><span style={{fontSize:10,fontWeight:800,color:C.red,fontFamily:mono,letterSpacing:1}}>{t("dashboard.fix_badge")}</span><span style={{fontSize:13,fontWeight:600,color:C.muted}}>{snippet.title}</span></div><button onClick={copy} style={{background:copied?C.green:"transparent",border:`1px solid ${copied?C.green:C.blackBorder}`,color:copied?C.white:C.gray,fontSize:10,fontFamily:mono,fontWeight:700,padding:"3px 10px",cursor:"pointer",letterSpacing:1}}>{copied?t("dashboard.copied"):t("dashboard.copy")}</button></div><p style={{fontSize:12,color:C.grayDark,padding:"8px 14px 0",margin:0}}>{snippet.desc}</p>{snippet.tabs&&<div style={{display:"flex",padding:"8px 14px 0",borderBottom:`1px solid ${C.blackBorder}`}}>{snippet.tabs.map((t,i)=><button key={t.label} onClick={()=>setTab(i)} style={{background:i===tab?C.blackCard:"transparent",border:"none",borderBottom:i===tab?`2px solid ${C.red}`:"2px solid transparent",color:i===tab?C.white:C.grayDark,fontSize:10,fontFamily:mono,fontWeight:700,padding:"6px 12px",cursor:"pointer",letterSpacing:1}}>{t.label}</button>)}</div>}<pre style={{margin:0,padding:14,fontSize:11,fontFamily:mono,color:C.muted,whiteSpace:"pre-wrap",wordBreak:"break-all",lineHeight:1.7}}>{code}</pre></div>}

function getTopActions(r){const a=[];const s=r.security_roots;const g=r.visibility_canopy.geo_branch;const ae=r.visibility_canopy.aeo_branch;const se=r.visibility_canopy.seo_branch;
if(g.llms_txt_status!=="PRESENT_ROOT")a.push({p:1,a:"Add an llms.txt file to your domain root",i:"AI engines will know how to cite your content instead of summarizing without attribution.",s:"llms_txt",key:"llms_txt"});
if((s.application_security.missing_secure_headers||[]).includes("Content-Security-Policy"))a.push({p:2,a:"Add a Content-Security-Policy header",i:"Prevents cross-site scripting and data injection attacks.",s:"csp",key:"csp"});
if(!ae.schema_validation.has_faq_json_ld)a.push({p:3,a:"Add FAQ schema markup",i:"Makes your content eligible for rich results and AI citations.",s:"faq_schema",key:"faq_schema"});
if(se.html_structure.missing_meta_descriptions)a.push({p:4,a:"Add a meta description",i:"Controls how your site appears in search results.",s:"meta_desc",key:"meta_desc"});
if(!se.html_structure.canonical_match)a.push({p:5,a:"Fix your canonical URL",i:"Prevents duplicate content issues.",s:"canonical",key:"canonical"});
return a.slice(0,3)}

function getComplianceChecks(r){const s=r.security_roots;return[{key:"https_active",label:"HTTPS Active",pass:s.tls?.valid||false},{key:"privacy_policy",label:"Privacy Policy",pass:false},{key:"security_headers",label:"Security Headers",pass:(s.application_security.missing_secure_headers||[]).length<=2},{key:"no_exposed",label:"No Exposed Endpoints",pass:(s.application_security.exposed_endpoints||[]).length===0},{key:"structured_data",label:"Structured Data",pass:r.visibility_canopy.aeo_branch.schema_validation.has_any_json_ld},{key:"ai_crawl",label:"AI Crawl Policy",pass:s.ai_crawl_risk.robots_policy==="BALANCED"||s.ai_crawl_risk.robots_policy==="RESTRICTIVE"}]}

// ── PDF (compact) ──
// ── PDF (compact) ──
function generatePDF(r, email, t) {
  const s = r.summary_scores;
  const overall = Math.round(((s.seo_score + s.aeo_score + s.geo_score + s.security_posture_score) / 4) * 100);
  const sc = v => { const p = Math.round(v * 100); return p >= 70 ? "#43A047" : p >= 40 ? "#F9A825" : "#E53935" };
  const sec = r.security_roots;
  const aeo = r.visibility_canopy.aeo_branch;
  const geo = r.visibility_canopy.geo_branch;
  const actions = getTopActions(r);
  const compliance = getComplianceChecks(r);

  // Business risk conditions
  const isTrafficLeak = geo.llms_txt_status !== "PRESENT_ROOT" || sec.ai_crawl_risk.robots_policy === "PERMISSIVE";
  const isBlindAssistants = !aeo.schema_validation.has_any_json_ld || !aeo.schema_validation.has_faq_json_ld;
  const isOpenDoor = (sec.application_security.exposed_endpoints || []).length > 0 || !sec.ai_crawl_risk.rate_limiting_active;
  const isFoundationCrack = !sec.tls?.valid || (sec.application_security.missing_secure_headers || []).length > 2;

  // Cross-reference intelligence for page 1
  const insights = [];
  if (geo.llms_txt_status === "MISSING" && sec.ai_crawl_risk.robots_policy === "PERMISSIVE")
    insights.push({ l: "CRITICAL", t: t("risks.traffic_leak_title"), b: t("risks.traffic_leak_desc") });
  if (geo.llms_txt_status === "MISSING" && sec.ai_crawl_risk.robots_policy !== "RESTRICTIVE")
    insights.push({ l: "WARNING", t: t("risks.blind_assistants_title"), b: t("risks.blind_assistants_desc") });
  if ((sec.application_security.exposed_endpoints || []).length > 0)
    insights.push({ l: "CRITICAL", t: t("risks.exposed_endpoints_title"), b: `${sec.application_security.exposed_endpoints.length} ${t("risks.exposed_endpoints_desc_suffix", "path(s) accessible:")} ${sec.application_security.exposed_endpoints.slice(0, 4).join(", ")}` });
  if (sec.business_logic_gaps?.data_provenance_leak)
    insights.push({ l: "WARNING", t: t("risks.provenance_risk_title"), b: t("risks.provenance_risk_desc") });

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
.pass { color: #43A047; font-weight: 700 }
.fail { color: #E53935; font-weight: 700 }
.warn { color: #F9A825; font-weight: 700 }

/* Executive Risk boxes */
.risk-box { border: 1px solid #ddd; border-radius: 6px; padding: 16px; margin-bottom: 14px; background: #fdfdfd }
.risk-box.active-critical { border-left: 5px solid #E53935; background: #fef2f2 }
.risk-box.active-warning { border-left: 5px solid #F9A825; background: #fff8e1 }
.risk-box.secured { border-left: 5px solid #43A047; background: #f0faf0 }
.risk-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px }
.risk-title { font-size: 13px; font-weight: 800; color: #111; letter-spacing: 0.5px }
.risk-badge { font-size: 9px; font-weight: 800; font-family: 'Courier New', monospace; padding: 3px 8px; border-radius: 3px; text-transform: uppercase }
.risk-badge.critical { background: #E53935; color: #fff }
.risk-badge.warning { background: #F9A825; color: #fff }
.risk-badge.passed { background: #43A047; color: #fff }
.risk-desc { font-size: 10.5px; color: #444; line-height: 1.6 }

.cta { text-align: center; margin: 28px 0 14px; padding: 22px; border: 2px solid #E53935 }
.cta h3 { font-size: 15px; font-weight: 900; margin-bottom: 5px; text-transform: none; color: #111; letter-spacing: 0 }
.cta p { color: #888; font-size: 11px; margin-bottom: 10px }
.cta a { display: inline-block; background: #E53935; color: #fff; font-weight: 900; font-size: 11px; padding: 10px 28px; text-decoration: none; letter-spacing: 2px }
.footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px solid #ddd; color: #aaa; font-size: 9px }
</style></head><body>

<!-- PAGE 1: Summary -->
<div class="header">
  <div>
    <div class="logo">CANOPY<span>GUARD</span></div>
    <div class="domain">${r.target_domain}</div>
  </div>
  <div class="meta">
    Audit ID: ${r.audit_id.slice(0, 8)}<br>
    ${new Date(r.timestamp).toLocaleString()}<br>
    Scan: ${r.scan_duration_ms}ms<br>
    Report for: ${email}
  </div>
</div>

${actions.length ? `<h2>${t("pdf.top_actions")}</h2>
${actions.map((a, i) => `<div class="action-box"><span class="action-num">${i + 1}</span><strong>${t(`dashboard.actions.${a.key}_title`, a.a)}</strong><br><span style="color:#555;font-size:10px">${t(`dashboard.actions.${a.key}_desc`, a.i)}</span></div>`).join("")}` : ""}

<div class="scores">
  <div class="score-block"><div class="score-val" style="color:${sc(overall / 100)}">${overall}</div><div class="score-label">${t("pdf.overall_score")}</div></div>
  <div class="score-divider"></div>
  <div class="score-block"><div class="score-val" style="color:${sc(s.seo_score)}">${Math.round(s.seo_score * 100)}</div><div class="score-label">${t("pdf.seo_score")}</div></div>
  <div class="score-block"><div class="score-val" style="color:${sc(s.aeo_score)}">${Math.round(s.aeo_score * 100)}</div><div class="score-label">${t("pdf.aeo_score")}</div></div>
  <div class="score-block"><div class="score-val" style="color:${sc(s.geo_score)}">${Math.round(s.geo_score * 100)}</div><div class="score-label">${t("pdf.geo_score")}</div></div>
  <div class="score-block"><div class="score-val" style="color:${sc(s.security_posture_score)}">${Math.round(s.security_posture_score * 100)}</div><div class="score-label">${t("pdf.security_score")}</div></div>
</div>

${insights.length ? `<h2>${t("ui.cross_ref_intel")}</h2>
${insights.map(i => `<div class="insight ${i.l === 'WARNING' ? 'warning' : ''}"><span class="insight-level ${i.l === 'CRITICAL' ? 'fail' : 'warn'}">${i.l}</span><span class="insight-title">${i.t}</span><div class="insight-body">${i.b}</div></div>`).join("")}` : ""}

<h2>${t("dashboard.compliance_check")}</h2>
<div class="compliance-grid">
${compliance.map(c => `<div class="compliance-item ${c.pass ? 'pass-bg' : 'fail-bg'}"><span class="${c.pass ? 'pass' : 'fail'}">${c.pass ? '✓' : '✗'}</span> ${t(`dashboard.compliance.${c.key}`)}</div>`).join("")}
</div>

<!-- PAGE 2: Executive Risks Summary -->
<div class="page-break"></div>
<div class="header">
  <div><div class="logo">CANOPY<span>GUARD</span></div><div style="font-size:12px;font-weight:700;color:#555;margin-top:4px">${r.target_domain} · ${t("pdf.title")}</div></div>
  <div class="meta">Page 2 · ${r.audit_id.slice(0, 8)}</div>
</div>

<h2>${t("pdf.risks_summary_title")}</h2>

<!-- Box 1: The AI Traffic Leak -->
<div class="risk-box ${isTrafficLeak ? 'active-critical' : 'secured'}">
  <div class="risk-header">
    <span class="risk-title">${t("pdf.risks.traffic_leak_title")}</span>
    <span class="risk-badge ${isTrafficLeak ? 'critical' : 'passed'}">${isTrafficLeak ? t("pdf.status.critical") : t("pdf.status.secured")}</span>
  </div>
  <p class="risk-desc">${t("pdf.risks.traffic_leak_desc")}</p>
</div>

<!-- Box 2: Blind to AI Assistants -->
<div class="risk-box ${isBlindAssistants ? 'active-warning' : 'secured'}">
  <div class="risk-header">
    <span class="risk-title">${t("pdf.risks.blind_assistants_title")}</span>
    <span class="risk-badge ${isBlindAssistants ? 'warning' : 'passed'}">${isBlindAssistants ? t("pdf.status.warning") : t("pdf.status.secured")}</span>
  </div>
  <p class="risk-desc">${t("pdf.risks.blind_assistants_desc")}</p>
</div>

<!-- Box 3: Open Door for Scrapers & Botnets -->
<div class="risk-box ${isOpenDoor ? 'active-critical' : 'secured'}">
  <div class="risk-header">
    <span class="risk-title">${t("pdf.risks.exposed_endpoints_title")}</span>
    <span class="risk-badge ${isOpenDoor ? 'critical' : 'passed'}">${isOpenDoor ? t("pdf.status.critical") : t("pdf.status.secured")}</span>
  </div>
  <p class="risk-desc">${t("pdf.risks.exposed_endpoints_desc")}</p>
</div>

<!-- Box 4: The Foundation Crack -->
<div class="risk-box ${isFoundationCrack ? 'active-critical' : 'secured'}">
  <div class="risk-header">
    <span class="risk-title">${t("pdf.risks.foundation_crack_title")}</span>
    <span class="risk-badge ${isFoundationCrack ? 'critical' : 'passed'}">${isFoundationCrack ? t("pdf.status.critical") : t("pdf.status.secured")}</span>
  </div>
  <p class="risk-desc">${t("pdf.risks.foundation_crack_desc")}</p>
</div>

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
async function storeLead(email,r,name=""){const s=r.summary_scores;const overall=Math.round(((s.seo_score+s.aeo_score+s.geo_score+s.security_posture_score)/4)*100);try{await fetch(`${API}/api/canopyguard/leads`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,domain:r.target_domain,audit_id:r.audit_id.slice(0,8),scores:{seo:Math.round(s.seo_score*100),aeo:Math.round(s.aeo_score*100),geo:Math.round(s.geo_score*100),security:Math.round(s.security_posture_score*100)},overall,report_json:JSON.stringify(r),timestamp:r.timestamp})})}catch(e){console.error("[CG] Lead store:",e)}}
async function sendReportEmail(email,report,name=""){try{await fetch(`${API}/api/canopyguard/email-report`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,name,report})})}catch(e){console.error("[CG] Email send:",e)}}

// ── Report Components ──
function ScoreBlock({score,label,delay=0}){const[v,setV]=useState(0);useEffect(()=>{const t=setTimeout(()=>{let s=0;const step=()=>{s+=0.02;if(s>=score){setV(score);return}setV(s);requestAnimationFrame(step)};requestAnimationFrame(step)},delay);return()=>clearTimeout(t)},[score,delay]);const pct=Math.round(v*100);return<div style={{textAlign:"center",minWidth:80}}><div style={{fontSize:40,fontWeight:700,fontFamily:mono,color:scoreColor(pct),lineHeight:1}}>{pct}</div><div style={{fontSize:9,fontWeight:700,color:C.gray,textTransform:"uppercase",letterSpacing:2,marginTop:8}}>{label}</div></div>}
function Badge({good}){const { t } = useTranslation();return<span style={{fontFamily:mono,fontSize:10,fontWeight:700,letterSpacing:1,padding:"3px 8px",color:good?C.green:C.red,background:good?C.greenGlow:C.redGlow,border:`1px solid ${good?C.green:C.red}22`,borderRadius:2}}>{good?t("dashboard.pass"):t("dashboard.fail")}</span>}
function Row({label,value,good,snippet}){const { t } = useTranslation();const[show,setShow]=useState(false);const hasFix=snippet&&FIX_SNIPPETS[snippet]&&good===false;return<div><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderBottom:`1px solid ${C.blackBorder}`}}><span style={{color:C.gray,fontSize:14}}>{label}</span><div style={{display:"flex",alignItems:"center",gap:8}}>{typeof good==="boolean"?<Badge good={good}/>:<span style={{color:C.white,fontSize:13,fontFamily:mono,fontWeight:600}}>{value}</span>}{hasFix&&<button onClick={()=>setShow(!show)} style={{background:"transparent",border:`1px solid ${show?C.red:C.blackBorder}`,color:show?C.red:C.grayDark,fontSize:9,fontFamily:mono,fontWeight:700,padding:"2px 8px",cursor:"pointer",letterSpacing:1,borderRadius:2}}>{show?t("dashboard.hide"):t("dashboard.fix")}</button>}</div></div>{show&&hasFix&&<FixSnippet snippet={FIX_SNIPPETS[snippet]}/>}</div>}
function Section({title,tag,desc,children}){return<div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:24,borderRadius:6}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}><h3 style={{margin:0,fontSize:15,fontWeight:700,color:C.white,fontFamily:heading,textTransform:"uppercase",letterSpacing:0.5}}>{title}</h3><span style={{fontSize:9,fontWeight:700,fontFamily:mono,color:C.red,letterSpacing:2,padding:"2px 8px",border:`1px solid ${C.redBorder}`,borderRadius:2}}>{tag}</span></div>{desc&&<p style={{fontSize:12,color:C.grayDark,marginBottom:14,lineHeight:1.6}}>{desc}</p>}{children}</div>}
function ActionItem({action,index}){const { t } = useTranslation();const[show,setShow]=useState(false);return<div><div style={{display:"flex",gap:14,alignItems:"flex-start"}}><div style={{fontSize:20,fontWeight:700,fontFamily:mono,color:C.red,lineHeight:1,minWidth:24}}>{index+1}</div><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{fontSize:14,fontWeight:700,color:C.white}}>{t(`dashboard.actions.${action.key}_title`, action.a)}</div>{action.s&&FIX_SNIPPETS[action.s]&&<button onClick={()=>setShow(!show)} style={{background:show?C.redGlow:"transparent",border:`1px solid ${show?C.red:C.blackBorder}`,color:show?C.red:C.grayDark,fontSize:9,fontFamily:mono,fontWeight:700,padding:"2px 8px",cursor:"pointer",letterSpacing:1,borderRadius:2}}>{show?t("dashboard.hide_code"):t("dashboard.show_fix")}</button>}</div><div style={{fontSize:13,color:C.gray,lineHeight:1.5,marginTop:3}}>{t(`dashboard.actions.${action.key}_desc`, action.i)}</div>{show&&action.s&&FIX_SNIPPETS[action.s]&&<FixSnippet snippet={FIX_SNIPPETS[action.s]}/>}</div></div></div>}
function Insights({data}){
  const { t } = useTranslation();
  const sec=data.security_roots;
  const geo=data.visibility_canopy.geo_branch;
  const ins=[];
  if(geo.llms_txt_status==="MISSING"&&sec.ai_crawl_risk.robots_policy==="PERMISSIVE")
    ins.push({l:"CRITICAL",t:t("risks.traffic_leak_title"),b:t("risks.traffic_leak_desc")});
  if(geo.llms_txt_status==="MISSING"&&sec.ai_crawl_risk.robots_policy!=="RESTRICTIVE")
    ins.push({l:"WARNING",t:t("risks.blind_assistants_title"),b:t("risks.blind_assistants_desc")});
  if((sec.application_security.exposed_endpoints||[]).length>0)
    ins.push({l:"CRITICAL",t:t("risks.exposed_endpoints_title"),b:`${sec.application_security.exposed_endpoints.length} ${t("risks.exposed_endpoints_desc_suffix", "path(s) accessible:")} ${sec.application_security.exposed_endpoints.slice(0,4).join(", ")}`});
  if(sec.business_logic_gaps?.data_provenance_leak)
    ins.push({l:"WARNING",t:t("risks.provenance_risk_title"),b:t("risks.provenance_risk_desc")});
  if(!ins.length)return null;
  return<div style={{background:C.blackCard,border:`1px solid ${C.redBorder}`,padding:24,marginBottom:20,borderRadius:6}}><h3 style={{margin:"0 0 20px",fontSize:14,fontWeight:700,color:C.red,fontFamily:heading,textTransform:"uppercase",letterSpacing:1}}>{t("ui.cross_ref_intel", "Cross-Reference Intelligence")}</h3><div style={{display:"flex",flexDirection:"column",gap:16}}>{ins.map((i,x)=><div key={x} style={{borderLeft:`3px solid ${i.l==="CRITICAL"?C.red:C.amber}`,paddingLeft:16}}><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><span style={{fontSize:9,fontWeight:800,fontFamily:mono,letterSpacing:1.5,color:i.l==="CRITICAL"?C.red:C.amber}}>{i.l}</span><span style={{fontSize:14,fontWeight:700,color:C.white}}>{i.t}</span></div><p style={{margin:0,fontSize:13,color:C.gray,lineHeight:1.65}}>{i.b}</p></div>)}</div></div>;
}
function EmailGate({onSubmit,onClose}){const { t } = useTranslation();const[email,setEmail]=useState("");const[name,setName]=useState("");const[sending,setSending]=useState(false);const ref=useRef(null);useEffect(()=>{ref.current?.focus()},[]);const submit=async()=>{if(!email.includes("@"))return;setSending(true);await onSubmit(email,name);setSending(false)};return<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}><motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}} transition={{duration:0.2}} style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:40,maxWidth:420,width:"100%",borderRadius:8}} onClick={e=>e.stopPropagation()}><h2 style={{fontSize:22,fontWeight:700,color:C.white,margin:"0 0 6px",fontFamily:heading}}>{t("dashboard.email_gate.title_get")} <span style={{color:C.red}}>{t("dashboard.email_gate.title_report")}</span></h2><p style={{color:C.gray,fontSize:14,margin:"0 0 28px",lineHeight:1.7}}>{t("dashboard.email_gate.desc")}</p><div style={{display:"flex",flexDirection:"column",gap:12}}><input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder={t("dashboard.email_gate.name_placeholder")} style={{background:C.black,border:`1px solid ${C.blackBorder}`,color:C.white,padding:"14px 16px",fontSize:14,outline:"none",borderRadius:4}}/><input ref={ref} type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder={t("dashboard.email_gate.email_placeholder")} style={{background:C.black,border:`1px solid ${C.blackBorder}`,color:C.white,padding:"14px 16px",fontSize:14,fontFamily:mono,outline:"none",borderRadius:4}}/><button onClick={submit} disabled={sending||!email.includes("@")} style={{background:sending?C.grayDark:C.red,border:"none",color:C.white,fontWeight:700,fontSize:14,padding:"16px 32px",cursor:sending?"default":"pointer",letterSpacing:1,opacity:!email.includes("@")?0.5:1,borderRadius:4}}>{sending?t("dashboard.email_gate.btn_processing"):t("dashboard.email_gate.btn_download")}</button></div><p style={{color:C.grayDark,fontSize:10,marginTop:16,fontFamily:mono}}>{t("dashboard.email_gate.spam_notice")}</p></motion.div></div>}

// ═══ METHODOLOGY PAGE ═══
function MethodologyPage({onBack}){
  const S=p=><div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:28,marginBottom:16,borderRadius:6,...(p.style||{})}}>{p.children}</div>;
  const H=({children})=><h3 style={{fontSize:18,fontWeight:700,color:C.white,fontFamily:heading,margin:"0 0 14px"}}>{children}</h3>;
  const P=({children})=><p style={{fontSize:15,color:C.muted,lineHeight:1.8,margin:"0 0 10px"}}>{children}</p>;
  const W=({label,val})=><div style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.blackBorder}`}}><span style={{color:C.muted,fontSize:14}}>{label}</span><span style={{color:C.white,fontSize:14,fontFamily:mono,fontWeight:700}}>{val}</span></div>;
  return<div style={{minHeight:"100vh",background:C.black,color:C.white}}><link href={FONTS_URL} rel="stylesheet"/><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 28px",borderBottom:`1px solid ${C.blackBorder}`}}><span style={{fontSize:15,fontWeight:700,fontFamily:heading,cursor:"pointer"}} onClick={onBack}>CANOPY<span style={{color:C.red}}>GUARD</span></span><button onClick={onBack} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.gray,padding:"6px 16px",fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:4}}>Back</button></div>
  <div style={{maxWidth:760,margin:"0 auto",padding:"48px 20px"}}><p style={{color:C.grayDark,fontSize:10,fontFamily:mono,letterSpacing:2,margin:"0 0 8px"}}>DOCUMENTATION</p><h1 style={{fontSize:36,fontWeight:700,fontFamily:heading,letterSpacing:-1,margin:"0 0 8px"}}>Scoring <span style={{color:C.red}}>Methodology</span></h1><p style={{fontSize:16,color:C.muted,lineHeight:1.8,margin:"0 0 48px"}}>How every score is calculated, what the weights are, and why. Published so you can verify, challenge, and improve.</p>
  <S><H>SEO Score (0 to 100) · 14 Signals</H><P>Measures how well search engines can crawl, index, and rank your site. Scoring 100 requires fast response, 1500+ words, 20+ internal links, perfect meta tags, and a sitemap.</P><W label="Crawlable" val="0.10"/><W label="Exactly 1 H1 (multiple penalized)" val="0.10"/><W label="Meta description + ideal length (120-160)" val="0.10"/><W label="Title tag + ideal length (30-60)" val="0.10"/><W label="Canonical URL match" val="0.08"/><W label="Viewport meta tag" val="0.05"/><W label="HTML lang attribute" val="0.03"/><W label="Image alt text coverage" val="0.08"/><W label="Word count (gradient: 200/500/1500+)" val="0.10"/><W label="Internal links (gradient: 5/10/20+)" val="0.10"/><W label="Sitemap.xml exists" val="0.06"/><W label="Response time (under 1s/3s/3s+)" val="0.05"/><W label="H2 heading structure" val="0.05"/></S>
  <S><H>AEO Score (0 to 100) · 10 Signals</H><P>Measures how well AI answer engines can extract and cite your content. Requires multiple schema types, 5+ FAQ items, and strong Q&A density for full marks.</P><W label="Any JSON-LD present" val="0.10"/><W label="Organization schema" val="0.12"/><W label="FAQ schema" val="0.10"/><W label="FAQ item count (1/3/5+)" val="0.12"/><W label="LocalBusiness schema" val="0.08"/><W label="Breadcrumb schema" val="0.06"/><W label="Schema type diversity (1/2/4+)" val="0.10"/><W label="Zero validation errors" val="0.10"/><W label="Q&A density" val="0.12"/><W label="JSON-LD block count (1/2/3+)" val="0.10"/></S>
  <S><H>GEO Score (0 to 100) · 8 Signals</H><P>Measures how generative AI models chunk, retrieve, and cite your pages. Based on how RAG systems process content.</P><W label="Chunking efficiency" val="0.25"/><W label="Citation precision" val="0.20"/><W label="llms.txt present + length bonus" val="0.23"/><W label="Content depth by word count" val="0.10"/><W label="Lists present" val="0.05"/><W label="Tables present" val="0.04"/><W label="Heading-to-content ratio" val="0.08"/><W label="Baseline reachability" val="0.05"/></S>
  <S><H>Security Score (0 to 100) · 15 Signals</H><P>External security posture. Individual headers weighted by protective scope. Scoring 100 requires all headers, HSTS 1yr+, HTTPS redirect, balanced AI policy, and secure cookies.</P><W label="TLS valid" val="0.10"/><W label="HSTS + max-age bonus" val="0.08"/><W label="HTTPS redirect" val="0.08"/><W label="Content-Security-Policy" val="0.08"/><W label="Strict-Transport-Security" val="0.06"/><W label="X-Frame-Options" val="0.05"/><W label="X-Content-Type-Options" val="0.04"/><W label="Referrer-Policy" val="0.04"/><W label="Permissions-Policy" val="0.04"/><W label="Cookie security flags" val="0.06"/><W label="AI crawl policy" val="0.08"/><W label="Bot awareness" val="0.06"/><W label="Rate limiting" val="0.04"/><W label="No exposed endpoints" val="0.08"/><W label="Data provenance" val="0.04"/></S>
  <S style={{borderColor:C.redBorder}}><H>Open Methodology</H><P>This scoring system is published so anyone can verify how their score was calculated. If you believe a weight is wrong or a signal is missing, reach out. The methodology improves from real-world feedback.</P><P>Adam McClarin, CISSP · Meraki is Love Digital | Soulful Tech™</P></S>
  </div></div>}

// ═══ MAIN APP ═══
export default function CanopyGuard(){
  const { t } = useTranslation();
  const[domain,setDomain]=useState("");const[phase,setPhase]=useState("landing");const[scanIndex,setScanIndex]=useState(0);
  const[report,setReport]=useState(null);const[scanError,setScanError]=useState("");
  const[showGate,setShowGate]=useState(false);const[leadCaptured,setLeadCaptured]=useState(false);const[capturedEmail,setCapturedEmail]=useState("");
  const[showMethodology,setShowMethodology]=useState(false);const ref=useRef(null);

  const startScan=async(sd)=>{const cleaned=(sd||domain).replace(/^https?:\/\//,"").replace(/\/+$/,"").trim();if(!cleaned)return;setDomain(cleaned);setPhase("scanning");setScanIndex(0);setScanError("");let idx=0;const ticker=setInterval(()=>{if(idx<PHASES.length-1){idx++;setScanIndex(idx)}},600);try{const res=await fetch(`${API}/api/scan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({domain:cleaned})});clearInterval(ticker);if(!res.ok){const err=await res.json();throw new Error(err.error||"Scan failed")}const data=await res.json();setScanIndex(PHASES.length-1);setTimeout(()=>{setReport(data);setPhase("report")},500)}catch(err){clearInterval(ticker);setScanError(err.message||"Scan failed.");setTimeout(()=>setPhase("landing"),3000)}};
  const reset=()=>{setPhase("landing");setDomain("");setReport(null);setLeadCaptured(false);setCapturedEmail("");setShowGate(false);setScanError("")};
  const handleEmail=useCallback(async(email,name)=>{await storeLead(email,report,name);sendReportEmail(email,report,name);setCapturedEmail(email);setLeadCaptured(true);setShowGate(false);downloadPDF(report,email,t)},[report,t]);

  if(showMethodology)return<MethodologyPage onBack={()=>setShowMethodology(false)}/>;

  // ═══ LANDING — Planar-inspired redesign ═══
  if(phase==="landing"){
    const sectionStyle = { padding: "0 24px", maxWidth: 960, margin: "0 auto" };
    return<div style={{minHeight:"100vh",background:C.black,fontFamily:body,color:C.white}}>
      <link href={FONTS_URL} rel="stylesheet"/>
      {/* NAV */}
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"18px 32px",maxWidth:1200,margin:"0 auto"}}>
        <span style={{fontSize:16,fontWeight:700,fontFamily:heading,letterSpacing:-0.5}}>CANOPY<span style={{color:C.red}}>GUARD</span></span>
        <div style={{display:"flex",gap:20,alignItems:"center"}}>
          <button onClick={()=>setShowMethodology(true)} style={{background:"transparent",border:"none",color:C.grayDark,fontSize:11,fontFamily:mono,cursor:"pointer",letterSpacing:1}}>METHODOLOGY</button>
          <span style={{color:C.dim}}>|</span>
          <span style={{fontSize:11,color:C.grayDark,fontFamily:mono,letterSpacing:1}}>BY SOULFUL TECH</span>
        </div>
      </nav>

      {/* HERO */}
      <section style={{textAlign:"center",padding:"120px 24px 100px",maxWidth:800,margin:"0 auto"}}>
        <Reveal>
          <div style={{display:"inline-block",padding:"6px 18px",marginBottom:28,border:`1px solid ${C.redBorder}`,background:C.redGlow,borderRadius:20}}>
            <span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:mono,letterSpacing:1.5}}>FREE · 47 SIGNALS · 15 SECONDS</span>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <h1 style={{fontSize:"clamp(36px,6vw,60px)",fontWeight:700,fontFamily:heading,lineHeight:1.1,letterSpacing:-2,margin:"0 0 20px"}}>
            Visibility and security.<br/><span style={{color:C.red}}>One scan. One report.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.2}>
          <p style={{fontSize:17,color:C.muted,lineHeight:1.8,maxWidth:520,margin:"0 auto 44px",fontFamily:body}}>
            Most tools check SEO or security. Canopy Guard checks both, then cross-references the gaps between them.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div style={{display:"flex",maxWidth:520,margin:"0 auto",border:`1.5px solid ${C.blackBorder}`,background:C.blackLight,borderRadius:6,overflow:"hidden"}}>
            <input ref={ref} type="text" value={domain} onChange={e=>setDomain(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startScan()} placeholder="yourdomain.com" style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.white,fontSize:16,padding:"18px 22px",fontFamily:mono}}/>
            <button onClick={()=>startScan()} style={{background:C.red,border:"none",color:C.white,fontWeight:700,fontSize:14,padding:"18px 32px",cursor:"pointer",letterSpacing:1,fontFamily:heading}}>SCAN</button>
          </div>
          <p style={{color:C.grayDark,fontSize:12,marginTop:14,fontFamily:mono}}>Free. No signup. No email required.</p>
          {scanError&&<p style={{color:C.red,fontSize:13,marginTop:8,fontFamily:mono}}>{scanError}</p>}
        </Reveal>
        <Reveal delay={0.4}>
          <button onClick={()=>startScan("merakislove.com")} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.gray,fontSize:13,padding:"10px 24px",cursor:"pointer",marginTop:24,borderRadius:4,fontFamily:body}}>
            View a sample report →
          </button>
        </Reveal>
      </section>

      {/* WHY THIS EXISTS — Story Section */}
      <section style={{...sectionStyle,padding:"80px 24px"}}>
        <Reveal>
          <div style={{maxWidth:640,margin:"0 auto"}}>
            <p style={{fontSize:10,fontFamily:mono,color:C.red,letterSpacing:2,marginBottom:12}}>THE PROBLEM</p>
            <h2 style={{fontSize:28,fontWeight:700,fontFamily:heading,lineHeight:1.3,margin:"0 0 20px"}}>Every audit I ran required four different tools.</h2>
            <p style={{fontSize:16,color:C.muted,lineHeight:1.8,margin:"0 0 16px"}}>One for SEO basics. One for security headers. One for structured data. A manual check on robots.txt. None of them talked to each other, and none of them checked whether AI crawlers were scraping the site without attribution.</p>
            <p style={{fontSize:16,color:C.muted,lineHeight:1.8}}>So I built the tool I wished existed. One scan that checks visibility and security together, then maps the findings to surface gaps that only appear in the overlap.</p>
          </div>
        </Reveal>
      </section>

      {/* EDUCATION — What is AEO? What is GEO? */}
      <section style={{...sectionStyle,padding:"80px 24px"}}>
        <Reveal>
          <div style={{textAlign:"center",marginBottom:48}}>
            <p style={{fontSize:10,fontFamily:mono,color:C.red,letterSpacing:2,marginBottom:12}}>BEYOND TRADITIONAL SEO</p>
            <h2 style={{fontSize:28,fontWeight:700,fontFamily:heading,letterSpacing:-0.5}}>Three layers of discoverability</h2>
          </div>
        </Reveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20}}>
          {[
            {tag:"SEO",q:"Can Google find you?",a:"Traditional search engine optimization. Crawlability, meta tags, headings, internal links, sitemaps. The foundation everything else builds on.",n:"14 signals",color:C.white},
            {tag:"AEO",q:"Can ChatGPT cite you?",a:"Answer Engine Optimization. When someone asks an AI a question, can it pull a structured answer from your site? Schema markup, FAQ data, and Q&A content density determine this.",n:"10 signals",color:C.amber},
            {tag:"GEO",q:"Can AI reference you?",a:"Generative Engine Optimization. When AI models summarize information, do they chunk your content cleanly and cite you as a source? This depends on content structure, specificity, and your llms.txt file.",n:"8 signals",color:C.red},
          ].map((c,i)=><Reveal key={c.tag} delay={i*0.1}><div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:28,borderRadius:6,height:"100%"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <span style={{fontSize:10,fontWeight:700,fontFamily:mono,color:c.color,letterSpacing:2}}>{c.tag}</span>
              <span style={{fontSize:10,fontFamily:mono,color:C.grayDark}}>{c.n}</span>
            </div>
            <h3 style={{fontSize:18,fontWeight:700,fontFamily:heading,margin:"0 0 10px",color:C.white}}>{c.q}</h3>
            <p style={{fontSize:14,color:C.gray,lineHeight:1.7,margin:0}}>{c.a}</p>
          </div></Reveal>)}
        </div>
      </section>

      {/* CROSS-REFERENCE — The Differentiator */}
      <section style={{...sectionStyle,padding:"80px 24px"}}>
        <Reveal>
          <div style={{background:C.blackCard,border:`1px solid ${C.redBorder}`,padding:36,borderRadius:6,maxWidth:640,margin:"0 auto"}}>
            <p style={{fontSize:10,fontFamily:mono,color:C.red,letterSpacing:2,marginBottom:12}}>THE DIFFERENTIATOR</p>
            <h2 style={{fontSize:24,fontWeight:700,fontFamily:heading,margin:"0 0 16px"}}>Cross-Reference Intelligence</h2>
            <p style={{fontSize:15,color:C.muted,lineHeight:1.8,margin:"0 0 20px"}}>Some problems only appear when you check both sides at once. A permissive robots.txt is technically valid. A missing llms.txt has no CVE. But together they mean every AI model is scraping your content with zero citation guidance.</p>
            <p style={{fontSize:15,color:C.muted,lineHeight:1.8}}>Your expertise gets summarized. Your brand never gets linked. That is a finding neither an SEO tool nor a security tool catches alone.</p>
          </div>
        </Reveal>
      </section>

      {/* CASE STUDY — Before/After */}
      <section style={{...sectionStyle,padding:"80px 24px"}}>
        <Reveal>
          <div style={{textAlign:"center",marginBottom:48}}>
            <p style={{fontSize:10,fontFamily:mono,color:C.red,letterSpacing:2,marginBottom:12}}>REAL RESULTS</p>
            <h2 style={{fontSize:28,fontWeight:700,fontFamily:heading}}>From 11 to 93. Same site.</h2>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 40px 1fr",alignItems:"center",maxWidth:600,margin:"0 auto",gap:16}}>
            <div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:28,textAlign:"center",borderRadius:6}}>
              <p style={{fontSize:10,fontFamily:mono,color:C.grayDark,letterSpacing:2,marginBottom:8}}>BEFORE</p>
              <div style={{fontSize:56,fontWeight:700,fontFamily:mono,color:C.red}}>11</div>
              <p style={{fontSize:12,color:C.grayDark,marginTop:8}}>No schema. No llms.txt.<br/>Missing all 6 headers.</p>
            </div>
            <div style={{textAlign:"center",fontSize:24,color:C.dim}}>→</div>
            <div style={{background:C.blackCard,border:`1px solid ${C.green}22`,padding:28,textAlign:"center",borderRadius:6}}>
              <p style={{fontSize:10,fontFamily:mono,color:C.grayDark,letterSpacing:2,marginBottom:8}}>AFTER</p>
              <div style={{fontSize:56,fontWeight:700,fontFamily:mono,color:C.green}}>93</div>
              <p style={{fontSize:12,color:C.grayDark,marginTop:8}}>Full schema. llms.txt live.<br/>All headers. BALANCED policy.</p>
            </div>
          </div>
          <p style={{textAlign:"center",fontSize:13,color:C.grayDark,marginTop:20}}>merakislove.com · Every fix guided by the same report you get for free.</p>
        </Reveal>
      </section>

      {/* HOW IT WORKS */}
      <section style={{...sectionStyle,padding:"80px 24px"}}>
        <Reveal>
          <div style={{textAlign:"center",marginBottom:48}}>
            <h2 style={{fontSize:28,fontWeight:700,fontFamily:heading}}>How it works</h2>
          </div>
        </Reveal>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,maxWidth:700,margin:"0 auto"}}>
          {[{n:"01",t:"Enter your domain",d:"Type any URL. No signup."},{n:"02",t:"Get scored in 15 seconds",d:"47 signals across 4 layers, all in parallel."},{n:"03",t:"Fix with code",d:"Every failing check includes copy-pasteable fix snippets."}].map((s,i)=>
            <Reveal key={s.n} delay={i*0.1}><div style={{textAlign:"center",padding:24}}>
              <div style={{fontSize:32,fontWeight:700,fontFamily:mono,color:C.red,marginBottom:12}}>{s.n}</div>
              <h3 style={{fontSize:16,fontWeight:700,fontFamily:heading,marginBottom:8,color:C.white}}>{s.t}</h3>
              <p style={{fontSize:13,color:C.gray,lineHeight:1.6}}>{s.d}</p>
            </div></Reveal>)}
        </div>
      </section>

      {/* TRUST */}
      <section style={{...sectionStyle,padding:"60px 24px 80px",textAlign:"center"}}>
        <Reveal>
          <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:40,marginBottom:36}}>
            {[{n:"CISSP",d:"Certified Information Systems Security Professional"},{n:"14yr",d:"IT and information security experience"},{n:"5",d:"Production SaaS products live"}].map(b=>
              <div key={b.n}><div style={{fontSize:28,fontWeight:700,fontFamily:mono,color:C.red}}>{b.n}</div><div style={{fontSize:12,color:C.grayDark,maxWidth:180,marginTop:4}}>{b.d}</div></div>)}
          </div>
          <p style={{fontSize:15,color:C.gray,lineHeight:1.8,maxWidth:520,margin:"0 auto"}}>Built by Adam McClarin. Not a theoretical tool. A practical one, built from real audit work across real client sites.</p>
        </Reveal>
      </section>

      {/* BOTTOM CTA */}
      <section style={{textAlign:"center",padding:"80px 24px",borderTop:`1px solid ${C.blackBorder}`}}>
        <Reveal>
          <h2 style={{fontSize:28,fontWeight:700,fontFamily:heading,marginBottom:20}}>Scan your site <span style={{color:C.red}}>now</span></h2>
          <div style={{display:"flex",maxWidth:480,margin:"0 auto",border:`1.5px solid ${C.blackBorder}`,background:C.blackLight,borderRadius:6,overflow:"hidden"}}>
            <input type="text" value={domain} onChange={e=>setDomain(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startScan()} placeholder="yourdomain.com" style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.white,fontSize:16,padding:"18px 22px",fontFamily:mono}}/>
            <button onClick={()=>startScan()} style={{background:C.red,border:"none",color:C.white,fontWeight:700,fontSize:14,padding:"18px 32px",cursor:"pointer",letterSpacing:1,fontFamily:heading}}>SCAN</button>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:`1px solid ${C.blackBorder}`,padding:"24px 32px",textAlign:"center"}}>
        <p style={{fontSize:11,color:C.grayDark,margin:"0 0 6px"}}>Canopy Guard · Built by <span style={{color:C.white,fontWeight:700}}>Soulful Tech™</span> · Meraki is Love, LLC</p>
        <a href="/privacy.html" style={{fontSize:11,color:C.grayDark,textDecoration:"underline"}}>Privacy Policy</a>
      </footer>
    </div>}

  // ═══ SCANNING ═══
  if(phase==="scanning"){return<div style={{minHeight:"100vh",background:C.black,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,fontFamily:body}}><link href={FONTS_URL} rel="stylesheet"/><div style={{maxWidth:440,width:"100%"}}><h2 style={{color:C.white,fontSize:18,fontWeight:700,margin:"0 0 4px",fontFamily:heading}}>Scanning <span style={{color:C.red}}>{domain}</span></h2><p style={{color:C.gray,fontSize:13,fontFamily:mono,margin:"0 0 32px"}}>{PHASES[scanIndex]}...</p><div style={{width:"100%",height:2,background:C.blackBorder,marginBottom:32,borderRadius:1}}><motion.div animate={{width:`${((scanIndex+1)/PHASES.length)*100}%`}} transition={{duration:0.3}} style={{height:"100%",background:C.red,borderRadius:1}}/></div><div style={{display:"flex",flexDirection:"column",gap:2}}>{PHASES.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 0",opacity:i<=scanIndex?1:0.25,transition:"opacity 0.3s"}}><span style={{fontFamily:mono,fontSize:11,color:i<scanIndex?C.green:i===scanIndex?C.red:C.grayDark,width:16}}>{i<scanIndex?"✓":i===scanIndex?"▸":"·"}</span><span style={{fontSize:13,color:i<=scanIndex?C.muted:C.grayDark}}>{p}</span></div>)}</div></div></div>}

  // ═══ REPORT ═══
  const d=report;const s=d.summary_scores;const sec=d.security_roots;const overall=+((s.seo_score+s.aeo_score+s.geo_score+s.security_posture_score)/4).toFixed(2);const overallPct=Math.round(overall*100);const actions=getTopActions(d);const compliance=getComplianceChecks(d);
  return<div style={{minHeight:"100vh",background:C.black,fontFamily:body,color:C.white}}><link href={FONTS_URL} rel="stylesheet"/>{showGate&&<EmailGate onSubmit={handleEmail} onClose={()=>setShowGate(false)}/>}
  {/* Nav */}
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",borderBottom:`1px solid ${C.blackBorder}`}}><span style={{fontSize:14,fontWeight:700,fontFamily:heading,cursor:"pointer"}} onClick={reset}>CANOPY<span style={{color:C.red}}>GUARD</span></span><div style={{display:"flex",gap:8,alignItems:"center"}}>{!leadCaptured?<button onClick={()=>setShowGate(true)} style={{background:C.red,border:"none",color:C.white,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",letterSpacing:1,borderRadius:3}}>{t("dashboard.get_report")}</button>:<button onClick={()=>downloadPDF(report,capturedEmail,t)} style={{background:"transparent",border:`1px solid ${C.green}`,color:C.green,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:mono,borderRadius:3}}>↓ PDF</button>}<button onClick={()=>setShowMethodology(true)} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.grayDark,padding:"6px 14px",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:mono,letterSpacing:1,borderRadius:3}}>{t("dashboard.docs")}</button><button onClick={reset} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.gray,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",borderRadius:3}}>{t("dashboard.new_scan")}</button></div></div>
  <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px"}}>
  <div style={{marginBottom:32}}><p style={{color:C.grayDark,fontSize:10,fontFamily:mono,letterSpacing:2,margin:"0 0 8px"}}>{t("dashboard.audit_report")}</p><h1 style={{fontSize:"clamp(24px,4vw,36px)",fontWeight:700,margin:"0 0 4px",fontFamily:heading,letterSpacing:-1}}>{d.target_domain}</h1><p style={{color:C.grayDark,fontSize:11,fontFamily:mono}}>{new Date(d.timestamp).toLocaleString()} · {d.audit_id.slice(0,8)} · {d.scan_duration_ms}ms</p></div>
  {/* Top Actions */}
  {actions.length>0&&<div style={{marginBottom:24,padding:24,background:C.blackCard,border:`1px solid ${C.redBorder}`,borderRadius:6}}><h3 style={{fontSize:14,fontWeight:700,color:C.red,fontFamily:heading,textTransform:"uppercase",letterSpacing:1,margin:"0 0 16px"}}>{t("dashboard.top_actions")}</h3><div style={{display:"flex",flexDirection:"column",gap:14}}>{actions.map((a,i)=><ActionItem key={i} action={a} index={i}/>)}</div></div>}
  {/* Scores */}
  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.5}} style={{display:"flex",alignItems:"flex-end",justifyContent:"center",flexWrap:"wrap",gap:40,padding:"40px 24px",marginBottom:24,border:`1px solid ${C.blackBorder}`,background:C.blackCard,borderRadius:6}}>
    <div style={{textAlign:"center"}}><div style={{fontSize:72,fontWeight:700,fontFamily:mono,color:scoreColor(overallPct),lineHeight:1}}>{overallPct}</div><div style={{fontSize:9,fontWeight:700,color:C.gray,letterSpacing:2,marginTop:8}}>{t("dashboard.overall")}</div></div>
    <div style={{width:1,height:60,background:C.blackBorder}}/>
    <ScoreBlock score={s.seo_score} label={t("dashboard.seo")} delay={200}/><ScoreBlock score={s.aeo_score} label={t("dashboard.aeo")} delay={400}/><ScoreBlock score={s.geo_score} label={t("dashboard.geo")} delay={600}/><ScoreBlock score={s.security_posture_score} label={t("dashboard.security")} delay={800}/>
  </motion.div>

  {/* Benchmarking & Revenue Leakage */}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:24}}>
    {/* Sector Benchmark Card */}
    <div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:24,borderRadius:6,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:10,fontWeight:700,fontFamily:mono,color:C.gray,letterSpacing:1.5}}>SECTOR BENCHMARK</span>
          <span style={{fontSize:11,fontWeight:700,fontFamily:mono,color:(overallPct - 68) >= 0 ? C.green : C.red}}>
            {(overallPct - 68) >= 0 ? "+" + (overallPct - 68) + "% above average" : (68 - overallPct) + "% below average"}
          </span>
        </div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>
          Your website's overall readiness ranks <strong style={{color:C.white}}>{overallPct}%</strong> against the typical software & services industry benchmark of <strong style={{color:C.white}}>68%</strong>.
        </div>
      </div>
      
      <div style={{position:"relative",marginTop:24}}>
        {/* Industry Average Indicator */}
        <div style={{position:"absolute",left:`68%`,bottom:14,transform:"translateX(-50%)",zIndex:3,display:"flex",flexDirection:"column",alignItems:"center"}}>
          <span style={{fontSize:8,fontFamily:mono,fontWeight:700,color:C.white,background:C.blackCard,padding:"2px 6px",border:`1px solid ${C.blackBorder}`,borderRadius:3,whiteSpace:"nowrap"}}>
            AVG (68%)
          </span>
          <div style={{width:1,height:4,background:C.white}}/>
        </div>
        
        {/* Bar */}
        <div style={{width:"100%",height:8,background:C.black,border:`1px solid ${C.blackBorder}`,borderRadius:4,overflow:"hidden"}}>
          <div style={{width:`${overallPct}%`,height:"100%",background:scoreColor(overallPct),borderRadius:4}}/>
        </div>
        
        <div style={{display:"flex",justifyContent:"space-between",marginTop:4,fontSize:9,fontFamily:mono,color:C.grayDark}}>
          <span>0%</span>
          <span>100%</span>
        </div>
      </div>
    </div>

    {/* Revenue Leakage Card */}
    <div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:24,borderRadius:6,display:"flex",flexDirection:"column",justifyContent:"space-between"}}>
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <span style={{fontSize:10,fontWeight:700,fontFamily:mono,color:C.gray,letterSpacing:1.5}}>REVENUE LEAKAGE CALCULATOR</span>
          <span style={{fontSize:9,fontWeight:800,fontFamily:mono,color:(100 - overallPct) > 0 ? C.red : C.green,background:(100 - overallPct) > 0 ? C.redGlow : C.greenGlow,padding:"2px 6px",border:`1px solid ${(100 - overallPct) > 0 ? C.red : C.green}22`,borderRadius:2}}>
            {(100 - overallPct) > 0 ? "REVENUE AT RISK" : "OPTIMIZED"}
          </span>
        </div>
        <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>
          Security flaws and visibility gaps directly impact conversion. Based on industry standards, each unmet optimization signal costs an estimated $25 in lost customer acquisitions.
        </div>
      </div>
      
      <div style={{marginTop:20}}>
        <div style={{fontSize:38,fontWeight:700,fontFamily:mono,color:(100 - overallPct) > 0 ? C.red : C.green,lineHeight:1}}>
          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Math.max(0, (100 - overallPct) * 25))}
          <span style={{fontSize:14,color:C.gray,fontWeight:500}}> / mo</span>
        </div>
        <div style={{fontSize:10,fontWeight:700,color:C.gray,letterSpacing:1,marginTop:6,textTransform:"uppercase"}}>
          Monthly Revenue Leakage
        </div>
      </div>
    </div>
  </div>

  <Insights data={d}/>
  {/* Detail Grid */}
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
    <Section title={t("dashboard.sections.seo_title")} tag={t("dashboard.sections.seo_tag")} desc={t("dashboard.sections.seo_desc")}><Row label={t("dashboard.rows.crawlable")} good={d.visibility_canopy.seo_branch.crawlability}/><Row label={t("dashboard.rows.h1_tags")} value={d.visibility_canopy.seo_branch.html_structure.h1_count}/><Row label={t("dashboard.rows.meta_desc")} good={!d.visibility_canopy.seo_branch.html_structure.missing_meta_descriptions} snippet="meta_desc"/><Row label={t("dashboard.rows.canonical_match")} good={d.visibility_canopy.seo_branch.html_structure.canonical_match} snippet="canonical"/><Row label={t("dashboard.rows.link_depth")} value={`${d.visibility_canopy.seo_branch.internal_linking_depth} ${t("dashboard.clicks")}`}/>{d.visibility_canopy.seo_branch.html_structure.title&&<Row label={t("dashboard.rows.page_title")} value={d.visibility_canopy.seo_branch.html_structure.title.slice(0,40)}/>}</Section>
    <Section title={t("dashboard.sections.aeo_title")} tag={t("dashboard.sections.aeo_tag")} desc={t("dashboard.sections.aeo_desc")}><Row label={t("dashboard.rows.faq_schema")} good={d.visibility_canopy.aeo_branch.schema_validation.has_faq_json_ld} snippet="faq_schema"/><Row label={t("dashboard.rows.org_schema")} good={d.visibility_canopy.aeo_branch.schema_validation.has_organization_json_ld} snippet="org_schema"/><Row label={t("dashboard.rows.any_json_ld")} good={d.visibility_canopy.aeo_branch.schema_validation.has_any_json_ld}/><Row label={t("dashboard.rows.validation_errors")} value={d.visibility_canopy.aeo_branch.schema_validation.validation_errors.length||t("dashboard.none")}/><Row label={t("dashboard.rows.qa_density")} value={`${(d.visibility_canopy.aeo_branch.qa_density_score*100).toFixed(0)}%`}/></Section>
    <Section title={t("dashboard.sections.geo_title")} tag={t("dashboard.sections.geo_tag")} desc={t("dashboard.sections.geo_desc")}><Row label={t("dashboard.rows.chunking_eff")} value={`${(d.visibility_canopy.geo_branch.chunking_efficiency*100).toFixed(0)}%`}/><Row label={t("dashboard.rows.citation_prec")} value={`${(d.visibility_canopy.geo_branch.citation_metrics.precision_rate*100).toFixed(0)}%`}/><Row label={t("dashboard.rows.market_share")} value={`${(d.visibility_canopy.geo_branch.market_share_gap*100).toFixed(0)}%`}/><Row label={t("dashboard.rows.llms_txt")} good={d.visibility_canopy.geo_branch.llms_txt_status==="PRESENT_ROOT"} snippet="llms_txt"/></Section>
    <Section title={t("dashboard.sections.security_title")} tag={t("dashboard.sections.security_tag")} desc={t("dashboard.sections.security_desc")}><Row label={t("dashboard.rows.tls_valid")} good={sec.tls?.valid}/><Row label={t("dashboard.rows.hsts")} good={sec.tls?.hsts} snippet="hsts"/><Row label={t("dashboard.rows.https_redirect")} good={sec.tls?.redirectsToHttps}/><Row label={t("dashboard.rows.robots_policy")} value={sec.ai_crawl_risk.robots_policy}/><Row label={t("dashboard.rows.agent_spoofing")} good={!sec.ai_crawl_risk.spoofed_agent_vulnerability}/><Row label={t("dashboard.rows.rate_limiting")} good={sec.ai_crawl_risk.rate_limiting_active}/><Row label={t("dashboard.rows.exposed_endpoints")} value={(sec.application_security.exposed_endpoints||[]).length||t("dashboard.none")}/><Row label={t("dashboard.rows.missing_headers")} value={(sec.application_security.missing_secure_headers||[]).length||t("dashboard.none")}/><Row label={t("dashboard.rows.known_cves")} value={(sec.application_security.vulnerabilities||[]).length||t("dashboard.none")}/></Section>
  </div>
  {/* Compliance */}
  <div style={{padding:24,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:20,borderRadius:6}}><h4 style={{fontSize:12,fontWeight:700,color:C.white,fontFamily:heading,textTransform:"uppercase",letterSpacing:1,margin:"0 0 16px"}}>{t("dashboard.compliance_check")}</h4><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8}}>{compliance.map(c=><div key={c.label} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:c.pass?C.greenGlow:C.redGlow,border:`1px solid ${c.pass?C.green:C.red}22`,borderRadius:3}}><span style={{fontFamily:mono,fontSize:11,fontWeight:700,color:c.pass?C.green:C.red}}>{c.pass?"✓":"✗"}</span><span style={{fontSize:12,color:C.muted}}>{t(`dashboard.compliance.${c.key}`)}</span></div>)}</div></div>
  {/* Missing Headers */}
  {(sec.application_security.missing_secure_headers||[]).length>0&&<div style={{padding:20,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:20,borderRadius:6}}><h4 style={{margin:"0 0 12px",fontSize:12,fontWeight:700,color:C.red,letterSpacing:1,textTransform:"uppercase"}}>{t("dashboard.missing_headers")}</h4><div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>{sec.application_security.missing_secure_headers.map(h=><code key={h} style={{padding:"4px 10px",fontSize:11,fontFamily:mono,fontWeight:600,background:C.redGlow,color:C.red,border:`1px solid ${C.red}33`,borderRadius:2}}>{h}</code>)}</div>{sec.application_security.missing_secure_headers.map(h=>{const k=HEADER_SNIPPET_MAP[h];return k&&FIX_SNIPPETS[k]?<FixSnippet key={h} snippet={FIX_SNIPPETS[k]}/>:null})}</div>}
  {/* CTA */}
  <div style={{textAlign:"center",padding:48,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:32,borderRadius:6}}>
    {!leadCaptured?<><h2 style={{fontSize:28,fontWeight:700,margin:"0 0 8px",fontFamily:heading}}>{t("dashboard.cta.get_full_title")} <span style={{color:C.red}}>{t("dashboard.cta.get_full_report")}</span></h2><p style={{color:C.gray,fontSize:14,margin:"0 0 28px",maxWidth:440,marginLeft:"auto",marginRight:"auto",lineHeight:1.7}}>{t("dashboard.cta.download_desc")}</p><button onClick={()=>setShowGate(true)} style={{background:C.red,color:C.white,border:"none",fontWeight:700,fontSize:14,padding:"18px 44px",letterSpacing:1,cursor:"pointer",fontFamily:heading,borderRadius:4}}>{t("dashboard.cta.btn_get_report")}</button></>:<><div style={{fontSize:36,marginBottom:12,color:C.green}}>✓</div><h2 style={{fontSize:28,fontWeight:700,margin:"0 0 8px",fontFamily:heading}}>{t("dashboard.cta.delivered_to")} <span style={{color:C.red}}>{capturedEmail}</span></h2><p style={{color:C.gray,fontSize:14,margin:"0 0 28px",maxWidth:460,marginLeft:"auto",marginRight:"auto",lineHeight:1.7}}>{t("dashboard.cta.resolve_desc")}</p><a href="https://calendly.com/hello-merakislove/new-meeting" target="_blank" rel="noopener noreferrer" style={{display:"inline-block",background:C.red,color:C.white,fontWeight:700,fontSize:14,padding:"18px 44px",textDecoration:"none",letterSpacing:1,fontFamily:heading,borderRadius:4}}>{t("dashboard.cta.btn_walkthrough")}</a><div style={{marginTop:16}}><button onClick={()=>downloadPDF(report,capturedEmail,t)} style={{background:"transparent",border:"none",color:C.gray,fontSize:12,cursor:"pointer",fontFamily:mono,textDecoration:"underline"}}>{t("dashboard.cta.download_again")}</button></div></>}
    <p style={{color:C.grayDark,fontSize:11,marginTop:24,fontFamily:mono}}>{t("dashboard.cta.author")}</p>
  </div>
  <div style={{textAlign:"center",padding:"20px 0",borderTop:`1px solid ${C.blackBorder}`}}><p style={{fontSize:11,color:C.grayDark,margin:"0 0 4px"}}>{t("dashboard.footer.built_by")}</p><a href="/privacy.html" style={{fontSize:11,color:C.grayDark,textDecoration:"underline"}}>{t("dashboard.footer.privacy_policy")}</a></div>
  </div></div>}
