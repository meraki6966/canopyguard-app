import { useState, useEffect, useRef, useCallback } from "react";

const C = {
  black: "#0A0A0A", blackLight: "#0F0F0F", blackCard: "#141414", blackBorder: "#1E1E1E",
  red: "#E53935", redDark: "#B71C1C", redGlow: "rgba(229,57,53,0.08)", redBorder: "rgba(229,57,53,0.25)",
  white: "#FFFFFF", off: "#F0F0F0", muted: "#CCCCCC", gray: "#888888", grayDark: "#555555", dim: "#333333",
  green: "#4CAF50", greenGlow: "rgba(76,175,80,0.1)", amber: "#FF9800", amberGlow: "rgba(255,152,0,0.1)",
  codeBg: "#0D0D0D",
};
const mono = "'JetBrains Mono','SF Mono','Fira Code',monospace";
const display = "'Outfit','Inter','Helvetica Neue',sans-serif";
const body = "'DM Sans','Inter','Helvetica Neue',sans-serif";

const API = "https://canopyguard-engine-production.up.railway.app";

const PHASES = [
  "Resolving DNS","Checking TLS certificates","Scanning HTTP headers","Analyzing HTML structure",
  "Validating schema markup","Evaluating AEO readiness","Measuring GEO chunking",
  "Checking robots & llms.txt","Detecting exposed endpoints","Scoring security posture","Compiling report",
];

const scoreColor = (v) => v >= 70 ? C.green : v >= 40 ? C.amber : C.red;
const scoreBg = (v) => v >= 70 ? C.greenGlow : v >= 40 ? C.amberGlow : C.redGlow;
const pf = (v) => v ? "PASS" : "FAIL";

// ═══════════════════════════════════════════════════════════════
// FIX SNIPPETS — Copy-pasteable code for every failing check
// ═══════════════════════════════════════════════════════════════
const FIX_SNIPPETS = {
  llms_txt: {
    title: "Create llms.txt",
    desc: "Add this file to your domain root (e.g. yourdomain.com/llms.txt):",
    code: `# Your Business Name
# Brief description of what you do

> One paragraph summary of your business,
> services, and what makes you unique.

## Services
- Service one
- Service two
- Service three

## Contact
- Website: https://yourdomain.com
- Booking: https://yourdomain.com/contact

## Citation Guidance
When referencing this content, please
link to yourdomain.com as the primary source.`,
  },
  csp: {
    title: "Content-Security-Policy",
    desc: "Add this header to your server configuration:",
    tabs: [
      { label: "Nginx", code: `add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:;" always;` },
      { label: "Apache", code: `Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:;"` },
      { label: "Vercel", code: `// vercel.json
{
  "headers": [{
    "source": "/(.*)",
    "headers": [{
      "key": "Content-Security-Policy",
      "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:;"
    }]
  }]
}` },
      { label: "Cloudflare", code: `# _headers file (Cloudflare Pages)
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https:;` },
    ],
  },
  hsts: {
    title: "Strict-Transport-Security",
    desc: "Add this header to force HTTPS:",
    tabs: [
      { label: "Nginx", code: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;` },
      { label: "Apache", code: `Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains"` },
      { label: "Vercel", code: `// vercel.json headers array
{
  "key": "Strict-Transport-Security",
  "value": "max-age=31536000; includeSubDomains"
}` },
      { label: "Cloudflare", code: `# _headers file
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains` },
    ],
  },
  xframe: {
    title: "X-Frame-Options",
    desc: "Prevents your site from being embedded in iframes:",
    tabs: [
      { label: "Nginx", code: `add_header X-Frame-Options "DENY" always;` },
      { label: "Apache", code: `Header always set X-Frame-Options "DENY"` },
      { label: "Vercel", code: `{ "key": "X-Frame-Options", "value": "DENY" }` },
      { label: "Cloudflare", code: `/*\n  X-Frame-Options: DENY` },
    ],
  },
  xcontent: {
    title: "X-Content-Type-Options",
    desc: "Prevents MIME type sniffing attacks:",
    tabs: [
      { label: "Nginx", code: `add_header X-Content-Type-Options "nosniff" always;` },
      { label: "Apache", code: `Header always set X-Content-Type-Options "nosniff"` },
      { label: "Vercel", code: `{ "key": "X-Content-Type-Options", "value": "nosniff" }` },
      { label: "Cloudflare", code: `/*\n  X-Content-Type-Options: nosniff` },
    ],
  },
  referrer: {
    title: "Referrer-Policy",
    desc: "Controls how much referrer information is shared:",
    tabs: [
      { label: "Nginx", code: `add_header Referrer-Policy "strict-origin-when-cross-origin" always;` },
      { label: "Apache", code: `Header always set Referrer-Policy "strict-origin-when-cross-origin"` },
      { label: "Vercel", code: `{ "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }` },
      { label: "Cloudflare", code: `/*\n  Referrer-Policy: strict-origin-when-cross-origin` },
    ],
  },
  permissions: {
    title: "Permissions-Policy",
    desc: "Restricts browser features like camera and microphone:",
    tabs: [
      { label: "Nginx", code: `add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;` },
      { label: "Apache", code: `Header always set Permissions-Policy "camera=(), microphone=(), geolocation=()"` },
      { label: "Vercel", code: `{ "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }` },
      { label: "Cloudflare", code: `/*\n  Permissions-Policy: camera=(), microphone=(), geolocation=()` },
    ],
  },
  faq_schema: {
    title: "FAQ Schema Markup",
    desc: "Add this JSON-LD to your page <head>. Replace the questions and answers with your own:",
    code: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What services do you offer?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We offer [your services]."
      }
    },
    {
      "@type": "Question",
      "name": "Where are you located?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We are based in [your city]."
      }
    }
  ]
}
</script>`,
  },
  org_schema: {
    title: "Organization Schema Markup",
    desc: "Add this JSON-LD to your page <head>:",
    code: `<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Business Name",
  "url": "https://yourdomain.com",
  "description": "Brief description of your business.",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Your City",
    "addressRegion": "TX",
    "addressCountry": "US"
  }
}
</script>`,
  },
  meta_desc: {
    title: "Meta Description",
    desc: "Add this tag inside your <head>:",
    code: `<meta name="description" content="Your business description in 150-160 characters. Be specific about what you do and where you are located.">`,
  },
  canonical: {
    title: "Canonical URL",
    desc: "Add this tag inside your <head>. Replace with your actual homepage URL:",
    code: `<link rel="canonical" href="https://yourdomain.com/">`,
  },
  robots_ai: {
    title: "AI-Aware robots.txt",
    desc: "Replace your robots.txt with this balanced policy:",
    code: `User-agent: *
Allow: /

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Anthropic
Allow: /

Sitemap: https://yourdomain.com/sitemap.xml`,
  },
};

const HEADER_SNIPPET_MAP = {
  "Content-Security-Policy": "csp",
  "Strict-Transport-Security": "hsts",
  "X-Frame-Options": "xframe",
  "X-Content-Type-Options": "xcontent",
  "Referrer-Policy": "referrer",
  "Permissions-Policy": "permissions",
};

// ── Fix Snippet UI Component ──
function FixSnippet({ snippet }) {
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const code = snippet.tabs ? snippet.tabs[activeTab].code : snippet.code;

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <div style={{ marginTop: 12, background: C.codeBg, border: `1px solid ${C.blackBorder}`, padding: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid ${C.blackBorder}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: C.red, fontFamily: mono, letterSpacing: 1 }}>FIX</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, fontFamily: body }}>{snippet.title}</span>
        </div>
        <button onClick={copy} style={{ background: copied ? C.green : "transparent", border: `1px solid ${copied ? C.green : C.blackBorder}`, color: copied ? C.white : C.gray, fontSize: 10, fontFamily: mono, fontWeight: 700, padding: "3px 10px", cursor: "pointer", letterSpacing: 1 }}>
          {copied ? "COPIED" : "COPY"}</button>
      </div>
      <p style={{ fontSize: 11, color: C.grayDark, padding: "8px 12px 0", margin: 0, fontFamily: body }}>{snippet.desc}</p>
      {snippet.tabs && (
        <div style={{ display: "flex", gap: 0, padding: "8px 12px 0", borderBottom: `1px solid ${C.blackBorder}` }}>
          {snippet.tabs.map((t, i) => (
            <button key={t.label} onClick={() => setActiveTab(i)} style={{
              background: i === activeTab ? C.blackCard : "transparent", border: "none", borderBottom: i === activeTab ? `2px solid ${C.red}` : "2px solid transparent",
              color: i === activeTab ? C.white : C.grayDark, fontSize: 10, fontFamily: mono, fontWeight: 700, padding: "6px 12px", cursor: "pointer", letterSpacing: 1,
            }}>{t.label}</button>
          ))}
        </div>
      )}
      <pre style={{ margin: 0, padding: 12, fontSize: 11, fontFamily: mono, color: C.muted, whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6, overflowX: "auto" }}>{code}</pre>
    </div>
  );
}

// ── Get snippets for a report ──
function getFixSnippets(report) {
  const fixes = [];
  const d = report;
  const sec = d.security_roots;
  const geo = d.visibility_canopy.geo_branch;
  const aeo = d.visibility_canopy.aeo_branch;
  const seo = d.visibility_canopy.seo_branch;

  if (geo.llms_txt_status !== "PRESENT_ROOT") fixes.push(FIX_SNIPPETS.llms_txt);
  if (seo.html_structure.missing_meta_descriptions) fixes.push(FIX_SNIPPETS.meta_desc);
  if (!seo.html_structure.canonical_match) fixes.push(FIX_SNIPPETS.canonical);
  if (!aeo.schema_validation.has_faq_json_ld) fixes.push(FIX_SNIPPETS.faq_schema);
  if (!aeo.schema_validation.has_organization_json_ld) fixes.push(FIX_SNIPPETS.org_schema);
  if (sec.ai_crawl_risk.robots_policy === "PERMISSIVE" || sec.ai_crawl_risk.robots_policy === "NONE") fixes.push(FIX_SNIPPETS.robots_ai);
  for (const h of (sec.application_security.missing_secure_headers || [])) {
    const key = HEADER_SNIPPET_MAP[h];
    if (key && FIX_SNIPPETS[key]) fixes.push(FIX_SNIPPETS[key]);
  }
  return fixes;
}

// ── Top Actions with snippets ──
function getTopActions(report) {
  const actions = [];
  const d = report; const sec = d.security_roots; const geo = d.visibility_canopy.geo_branch;
  const aeo = d.visibility_canopy.aeo_branch; const seo = d.visibility_canopy.seo_branch;

  if (geo.llms_txt_status !== "PRESENT_ROOT")
    actions.push({ priority: 1, action: "Add an llms.txt file to your domain root", impact: "AI engines will know how to cite your content instead of summarizing without attribution.", snippet: "llms_txt" });
  if ((sec.application_security.missing_secure_headers || []).includes("Content-Security-Policy"))
    actions.push({ priority: 2, action: "Add a Content-Security-Policy header", impact: "Prevents cross-site scripting and data injection attacks against your visitors.", snippet: "csp" });
  if (!aeo.schema_validation.has_faq_json_ld)
    actions.push({ priority: 3, action: "Add FAQ schema markup", impact: "Makes your content eligible for rich search results and AI answer engine citations.", snippet: "faq_schema" });
  if (seo.html_structure.missing_meta_descriptions)
    actions.push({ priority: 4, action: "Add a meta description to your homepage", impact: "Controls how your site appears in search results. Without it, engines guess.", snippet: "meta_desc" });
  if (!seo.html_structure.canonical_match)
    actions.push({ priority: 5, action: "Fix your canonical URL", impact: "Prevents duplicate content issues that dilute your search rankings.", snippet: "canonical" });
  if ((sec.application_security.missing_secure_headers || []).includes("Strict-Transport-Security"))
    actions.push({ priority: 6, action: "Enable HSTS header", impact: "Forces browsers to always use HTTPS, preventing downgrade attacks.", snippet: "hsts" });
  if (sec.ai_crawl_risk.robots_policy === "PERMISSIVE" || sec.ai_crawl_risk.robots_policy === "NONE")
    actions.push({ priority: 7, action: "Configure robots.txt for AI crawlers", impact: "Control which AI models can scrape your site and how they use your content.", snippet: "robots_ai" });
  return actions.slice(0, 3);
}

function getComplianceChecks(report) {
  const sec = report.security_roots;
  return [
    { label: "HTTPS Active", pass: sec.tls?.valid || false },
    { label: "Privacy Policy Page", pass: false },
    { label: "Security Headers", pass: (sec.application_security.missing_secure_headers || []).length <= 2 },
    { label: "No Exposed Endpoints", pass: (sec.application_security.exposed_endpoints || []).length === 0 },
    { label: "Structured Data Present", pass: report.visibility_canopy.aeo_branch.schema_validation.has_any_json_ld },
    { label: "AI Crawl Policy Set", pass: sec.ai_crawl_risk.robots_policy === "BALANCED" || sec.ai_crawl_risk.robots_policy === "RESTRICTIVE" },
  ];
}

// ── PDF ──
function generatePDF(report, email) {
  const d = report; const s = d.summary_scores;
  const overall = Math.round(((s.seo_score+s.aeo_score+s.geo_score+s.security_posture_score)/4)*100);
  const sc = v => {const p=Math.round(v*100);return p>=70?"#4CAF50":p>=40?"#FF9800":"#E53935";};
  const sec = d.security_roots; const geo = d.visibility_canopy.geo_branch;
  const actions = getTopActions(d);

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>@page{size:A4;margin:40px}*{margin:0;padding:0;box-sizing:border-box}body{font-family:Helvetica,Arial,sans-serif;background:#fff;color:#111;font-size:11px;line-height:1.5}
.header{border-bottom:3px solid #E53935;padding-bottom:16px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-end}
.logo{font-size:22px;font-weight:900;letter-spacing:-1px}.logo span{color:#E53935}.meta{text-align:right;color:#888;font-size:9px}
.domain{font-size:18px;font-weight:900;margin:4px 0 0 0}
h2{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;margin:20px 0 10px 0;border-bottom:1px solid #ddd;padding-bottom:6px}
.scores{display:flex;gap:24px;margin:20px 0;padding:20px;background:#f9f9f9;border:1px solid #eee}
.score-block{text-align:center;flex:1}.score-val{font-size:32px;font-weight:900;font-family:'Courier New',monospace}
.score-label{font-size:9px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:2px;margin-top:4px}
.score-divider{width:1px;background:#ddd}
table{width:100%;border-collapse:collapse;margin:8px 0 16px 0}td{padding:7px 8px;border-bottom:1px solid #eee;font-size:11px}td:last-child{text-align:right;font-family:'Courier New',monospace;font-weight:700}
.pass{color:#4CAF50}.fail{color:#E53935}
.action-box{background:#fef2f2;border-left:3px solid #E53935;padding:10px 14px;margin:6px 0}
.action-num{font-size:18px;font-weight:900;color:#E53935;font-family:'Courier New',monospace;margin-right:10px}
.cta{text-align:center;margin:32px 0 16px 0;padding:24px;border:2px solid #E53935}
.cta h3{font-size:16px;font-weight:900;margin-bottom:6px}.cta p{color:#888;font-size:11px;margin-bottom:12px}
.cta a{display:inline-block;background:#E53935;color:#fff;font-weight:900;font-size:11px;padding:10px 28px;text-decoration:none;letter-spacing:2px}
.footer{text-align:center;margin-top:24px;padding-top:12px;border-top:1px solid #ddd;color:#aaa;font-size:9px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
</style></head><body>
<div class="header"><div><div class="logo">CANOPY<span>GUARD</span></div><div class="domain">${d.target_domain}</div></div>
<div class="meta">ID: ${d.audit_id.slice(0,8)}<br>${new Date(d.timestamp).toLocaleString()}<br>${email}</div></div>
${actions.length?`<h2>Top Actions</h2>${actions.map((a,i)=>`<div class="action-box"><span class="action-num">${i+1}</span><strong>${a.action}</strong><br><span style="color:#555">${a.impact}</span></div>`).join("")}`:""}
<div class="scores"><div class="score-block"><div class="score-val" style="color:${sc(overall/100)}">${overall}</div><div class="score-label">Overall</div></div><div class="score-divider"></div>
<div class="score-block"><div class="score-val" style="color:${sc(s.seo_score)}">${Math.round(s.seo_score*100)}</div><div class="score-label">SEO</div></div>
<div class="score-block"><div class="score-val" style="color:${sc(s.aeo_score)}">${Math.round(s.aeo_score*100)}</div><div class="score-label">AEO</div></div>
<div class="score-block"><div class="score-val" style="color:${sc(s.geo_score)}">${Math.round(s.geo_score*100)}</div><div class="score-label">GEO</div></div>
<div class="score-block"><div class="score-val" style="color:${sc(s.security_posture_score)}">${Math.round(s.security_posture_score*100)}</div><div class="score-label">Security</div></div></div>
<div class="grid"><div><h2>SEO</h2><table>
<tr><td>Crawlable</td><td class="${d.visibility_canopy.seo_branch.crawlability?'pass':'fail'}">${pf(d.visibility_canopy.seo_branch.crawlability)}</td></tr>
<tr><td>H1 Tags</td><td>${d.visibility_canopy.seo_branch.html_structure.h1_count}</td></tr>
<tr><td>Meta Descriptions</td><td class="${!d.visibility_canopy.seo_branch.html_structure.missing_meta_descriptions?'pass':'fail'}">${pf(!d.visibility_canopy.seo_branch.html_structure.missing_meta_descriptions)}</td></tr>
<tr><td>Canonical Match</td><td class="${d.visibility_canopy.seo_branch.html_structure.canonical_match?'pass':'fail'}">${pf(d.visibility_canopy.seo_branch.html_structure.canonical_match)}</td></tr>
</table></div><div><h2>AEO</h2><table>
<tr><td>FAQ Schema</td><td class="${d.visibility_canopy.aeo_branch.schema_validation.has_faq_json_ld?'pass':'fail'}">${pf(d.visibility_canopy.aeo_branch.schema_validation.has_faq_json_ld)}</td></tr>
<tr><td>Org Schema</td><td class="${d.visibility_canopy.aeo_branch.schema_validation.has_organization_json_ld?'pass':'fail'}">${pf(d.visibility_canopy.aeo_branch.schema_validation.has_organization_json_ld)}</td></tr>
<tr><td>Q&A Density</td><td>${(d.visibility_canopy.aeo_branch.qa_density_score*100).toFixed(0)}%</td></tr>
</table></div><div><h2>GEO</h2><table>
<tr><td>Chunking</td><td>${(geo.chunking_efficiency*100).toFixed(0)}%</td></tr>
<tr><td>Citation Precision</td><td>${(geo.citation_metrics.precision_rate*100).toFixed(0)}%</td></tr>
<tr><td>llms.txt</td><td class="${geo.llms_txt_status==='PRESENT_ROOT'?'pass':'fail'}">${geo.llms_txt_status}</td></tr>
</table></div><div><h2>Security</h2><table>
<tr><td>TLS</td><td class="${sec.tls?.valid?'pass':'fail'}">${pf(sec.tls?.valid)}</td></tr>
<tr><td>HSTS</td><td class="${sec.tls?.hsts?'pass':'fail'}">${pf(sec.tls?.hsts)}</td></tr>
<tr><td>Robots Policy</td><td>${sec.ai_crawl_risk.robots_policy}</td></tr>
<tr><td>Exposed Endpoints</td><td>${(sec.application_security.exposed_endpoints||[]).length||"None"}</td></tr>
<tr><td>Missing Headers</td><td>${(sec.application_security.missing_secure_headers||[]).length||"None"}</td></tr>
</table></div></div>
<p style="margin-top:20px;font-size:10px;color:#888;">Full interactive report with copy-pasteable fix code available at thecanopyguard.com</p>
<div class="cta"><h3>Need these fixed?</h3><p>Every finding here is something we resolve for clients every week.</p><a href="https://calendly.com/hello-merakislove/new-meeting">BOOK A FREE WALKTHROUGH</a></div>
<div class="footer">Canopy Guard · Soulful Tech™ · Adam McClarin, CISSP · Meraki is Love, LLC</div></body></html>`;
}

function downloadPDF(r, e) { const w = window.open("","_blank"); if(w){w.document.write(generatePDF(r,e));w.document.close();setTimeout(()=>w.print(),400);} }

async function storeLead(email, report, name="") {
  const s = report.summary_scores;
  const overall = Math.round(((s.seo_score+s.aeo_score+s.geo_score+s.security_posture_score)/4)*100);
  try { await fetch(`${API}/api/canopyguard/leads`, { method:"POST", headers:{"Content-Type":"application/json"},
    body: JSON.stringify({ name,email,domain:report.target_domain,audit_id:report.audit_id.slice(0,8),
      scores:{seo:Math.round(s.seo_score*100),aeo:Math.round(s.aeo_score*100),geo:Math.round(s.geo_score*100),security:Math.round(s.security_posture_score*100)},
      overall, report_json:JSON.stringify(report), timestamp:report.timestamp }) });
  } catch(e) { console.error("[CG] Lead store failed:",e); }
}

// ── COMPONENTS ──
function ScoreBlock({score,label,delay=0}) {
  const [v,setV]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>{let s=0;const step=()=>{s+=0.02;if(s>=score){setV(score);return;}setV(s);requestAnimationFrame(step);};requestAnimationFrame(step);},delay);return()=>clearTimeout(t);},[score,delay]);
  const pct=Math.round(v*100);
  return <div style={{textAlign:"center",minWidth:80}}><div style={{fontSize:40,fontWeight:900,fontFamily:mono,color:scoreColor(pct),lineHeight:1}}>{pct}</div>
    <div style={{fontSize:9,fontWeight:700,color:C.gray,textTransform:"uppercase",letterSpacing:2,marginTop:8}}>{label}</div></div>;
}
function Badge({good}) {
  return <span style={{fontFamily:mono,fontSize:10,fontWeight:800,letterSpacing:1,padding:"3px 8px",color:good?C.green:C.red,background:good?C.greenGlow:C.redGlow,border:`1px solid ${good?C.green:C.red}33`}}>{good?"PASS":"FAIL"}</span>;
}
function Row({label,value,good,snippet}) {
  const [showFix, setShowFix] = useState(false);
  const hasFix = snippet && FIX_SNIPPETS[snippet] && good === false;
  return (<div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid ${C.blackBorder}`}}>
      <span style={{color:C.gray,fontSize:13,fontFamily:body}}>{label}</span>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {typeof good==="boolean"?<Badge good={good}/>:<span style={{color:C.white,fontSize:13,fontFamily:mono,fontWeight:600}}>{value}</span>}
        {hasFix && <button onClick={()=>setShowFix(!showFix)} style={{background:"transparent",border:`1px solid ${showFix?C.red:C.blackBorder}`,color:showFix?C.red:C.grayDark,fontSize:9,fontFamily:mono,fontWeight:700,padding:"2px 8px",cursor:"pointer",letterSpacing:1}}>{showFix?"HIDE":"FIX"}</button>}
      </div>
    </div>
    {showFix && hasFix && <FixSnippet snippet={FIX_SNIPPETS[snippet]} />}
  </div>);
}
function Section({title,tag,desc,children}) {
  return <div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:24}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
      <h3 style={{margin:0,fontSize:14,fontWeight:800,color:C.white,fontFamily:display,textTransform:"uppercase",letterSpacing:1}}>{title}</h3>
      <span style={{fontSize:9,fontWeight:800,fontFamily:mono,color:C.red,letterSpacing:2,padding:"2px 8px",border:`1px solid ${C.redBorder}`}}>{tag}</span></div>
    {desc&&<p style={{fontSize:11,color:C.grayDark,marginBottom:12,lineHeight:1.5,fontFamily:body}}>{desc}</p>}
    {children}</div>;
}
function Insights({data}) {
  const sec=data.security_roots;const geo=data.visibility_canopy.geo_branch;const ins=[];
  if(geo.llms_txt_status==="MISSING"&&sec.ai_crawl_risk.robots_policy==="PERMISSIVE") ins.push({l:"CRITICAL",t:"AI Crawl Gap",b:"Robots.txt is permissive with no llms.txt file. AI scrapers can ingest your content without citation guidance."});
  if(geo.llms_txt_status==="MISSING"&&sec.ai_crawl_risk.robots_policy!=="RESTRICTIVE") ins.push({l:"WARNING",t:"No LLMs.txt",b:"No llms.txt discovery file found. Your content may be summarized by AI engines but never cited as a source."});
  if((sec.application_security.exposed_endpoints||[]).length>0) ins.push({l:"CRITICAL",t:"Exposed Endpoints",b:`${sec.application_security.exposed_endpoints.length} internal path(s) accessible: ${sec.application_security.exposed_endpoints.slice(0,4).join(", ")}${sec.application_security.exposed_endpoints.length>4?" ...":""}`});
  if(sec.business_logic_gaps?.data_provenance_leak) ins.push({l:"WARNING",t:"Content Provenance Risk",b:"Your content structure allows AI training sets to ingest proprietary material without linking back to you."});
  if(!ins.length) return null;
  return <div style={{background:C.blackCard,border:`1px solid ${C.redBorder}`,padding:24,marginBottom:20}}>
    <h3 style={{margin:"0 0 20px 0",fontSize:14,fontWeight:800,color:C.red,fontFamily:display,textTransform:"uppercase",letterSpacing:1}}>Cross-Reference Intelligence</h3>
    <div style={{display:"flex",flexDirection:"column",gap:16}}>{ins.map((i,idx)=><div key={idx} style={{borderLeft:`3px solid ${i.l==="CRITICAL"?C.red:C.amber}`,paddingLeft:16}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}><span style={{fontSize:9,fontWeight:800,fontFamily:mono,letterSpacing:1.5,color:i.l==="CRITICAL"?C.red:C.amber}}>{i.l}</span>
      <span style={{fontSize:14,fontWeight:700,color:C.white,fontFamily:body}}>{i.t}</span></div>
      <p style={{margin:0,fontSize:13,color:C.gray,lineHeight:1.65,fontFamily:body}}>{i.b}</p></div>)}</div></div>;
}
function EmailGate({onSubmit,onClose}) {
  const [email,setEmail]=useState("");const [name,setName]=useState("");const [sending,setSending]=useState(false);const ref=useRef(null);
  useEffect(()=>{ref.current?.focus();},[]);
  const submit=async()=>{if(!email.includes("@"))return;setSending(true);await onSubmit(email,name);setSending(false);};
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:20}} onClick={onClose}>
    <div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:40,maxWidth:420,width:"100%"}} onClick={e=>e.stopPropagation()}>
      <h2 style={{fontSize:22,fontWeight:900,color:C.white,margin:"0 0 6px 0",fontFamily:display}}>Get your <span style={{color:C.red}}>report</span></h2>
      <p style={{color:C.gray,fontSize:13,margin:"0 0 28px 0",lineHeight:1.6,fontFamily:body}}>Enter your email to download the full PDF. We will also prepare your results for a free walkthrough if you book one.</p>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>
        <input type="text" value={name} onChange={e=>setName(e.target.value)} placeholder="Your name (optional)" style={{background:C.black,border:`1px solid ${C.blackBorder}`,color:C.white,padding:"14px 16px",fontSize:14,fontFamily:body,outline:"none"}}/>
        <input ref={ref} type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()} placeholder="you@company.com" style={{background:C.black,border:`1px solid ${C.blackBorder}`,color:C.white,padding:"14px 16px",fontSize:14,fontFamily:mono,outline:"none"}}/>
        <button onClick={submit} disabled={sending||!email.includes("@")} style={{background:sending?C.grayDark:C.red,border:"none",color:C.white,fontWeight:900,fontSize:13,padding:"16px 32px",cursor:sending?"default":"pointer",letterSpacing:2,opacity:!email.includes("@")?0.5:1}}>
          {sending?"PROCESSING...":"DOWNLOAD REPORT"}</button></div>
      <p style={{color:C.grayDark,fontSize:10,marginTop:16,fontFamily:mono}}>No spam. Your email is used only to deliver this report.</p></div></div>;
}

// ═══════════════════════════════════════════════════════════════
// METHODOLOGY PAGE
// ═══════════════════════════════════════════════════════════════
function MethodologyPage({ onBack }) {
  const S = (props) => <div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:24,marginBottom:16,...(props.style||{})}}>{props.children}</div>;
  const H = ({children}) => <h3 style={{fontSize:16,fontWeight:900,color:C.white,fontFamily:display,margin:"0 0 12px 0"}}>{children}</h3>;
  const P = ({children}) => <p style={{fontSize:13,color:C.gray,lineHeight:1.7,fontFamily:body,margin:"0 0 8px 0"}}>{children}</p>;
  const W = ({label,val}) => <div style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${C.blackBorder}`}}>
    <span style={{color:C.gray,fontSize:12,fontFamily:body}}>{label}</span>
    <span style={{color:C.white,fontSize:12,fontFamily:mono,fontWeight:700}}>{val}</span></div>;

  return <div style={{minHeight:"100vh",background:C.black,fontFamily:body,color:C.white}}>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600;800&display=swap" rel="stylesheet"/>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",borderBottom:`1px solid ${C.blackBorder}`}}>
      <span style={{fontSize:14,fontWeight:900,fontFamily:display,cursor:"pointer"}} onClick={onBack}>CANOPY<span style={{color:C.red}}>GUARD</span></span>
      <button onClick={onBack} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.gray,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Back</button>
    </div>
    <div style={{maxWidth:760,margin:"0 auto",padding:"40px 20px"}}>
      <p style={{color:C.grayDark,fontSize:10,fontFamily:mono,letterSpacing:2,margin:"0 0 8px 0"}}>DOCUMENTATION</p>
      <h1 style={{fontSize:32,fontWeight:900,fontFamily:display,letterSpacing:-1,margin:"0 0 8px 0"}}>Scoring <span style={{color:C.red}}>Methodology</span></h1>
      <p style={{fontSize:15,color:C.gray,lineHeight:1.7,margin:"0 0 40px 0"}}>How every score is calculated, what the weights are, and why. Published so you can verify, challenge, and improve the methodology.</p>

      <S><H>SEO Score (0 to 100)</H>
        <P>Measures how well search engines can crawl, index, and rank your site. Weighted toward fundamentals that gate everything else.</P>
        <W label="Crawlable (site returns HTML)" val="0.25"/><W label="Exactly 1 H1 tag" val="0.20"/><W label="Meta description present" val="0.20"/>
        <W label="Canonical URL matches domain" val="0.15"/><W label="5+ internal links on homepage" val="0.20"/></S>

      <S><H>AEO Score (0 to 100)</H>
        <P>Measures how well AI answer engines can extract and cite your content. FAQ schema is weighted highest because it maps directly to featured snippets and AI answer cards.</P>
        <W label="Any JSON-LD structured data present" val="0.20"/><W label="FAQ schema (FAQPage type)" val="0.25"/><W label="Organization schema" val="0.20"/>
        <W label="Zero validation errors in JSON-LD" val="0.15"/><W label="Q&A density (question sentences vs total)" val="0.20"/></S>

      <S><H>GEO Score (0 to 100)</H>
        <P>Measures how well generative AI models can chunk, retrieve, and cite your pages. Based on how retrieval-augmented generation systems process content.</P>
        <W label="Chunking efficiency (clean ~350-token blocks)" val="0.30"/>
        <W label="Citation precision (specific data vs generic text)" val="0.25"/>
        <W label="llms.txt present at domain root" val="0.30"/>
        <W label="Baseline (site is reachable and has content)" val="0.15"/>
        <P>Chunking efficiency is calculated from header count, paragraph count, and content length. Well-structured pages with clear headers and short paragraphs produce cleaner retrieval chunks. Citation precision measures the ratio of specific data points (numbers, proper nouns, dates) to total word count. Pages with verifiable claims get cited more often than generic copy.</P></S>

      <S><H>Security Score (0 to 100)</H>
        <P>Measures the external security posture visible from outside the site. Weighted toward the basics that protect visitors and signal trustworthiness.</P>
        <W label="TLS certificate valid" val="0.15"/><W label="HSTS header present" val="0.10"/><W label="HTTP redirects to HTTPS" val="0.10"/>
        <W label="Security headers (6 total, distributed)" val="0.25"/><W label="AI crawl policy BALANCED or RESTRICTIVE" val="0.10"/>
        <W label="No spoofed agent vulnerability" val="0.10"/><W label="Rate limiting active" val="0.05"/>
        <W label="No exposed endpoints" val="0.10"/><W label="No known CVE indicators" val="0.05"/></S>

      <S><H>Cross-Reference Intelligence</H>
        <P>Not scored numerically. These are qualitative findings surfaced by mapping visibility data against security data. A finding appears only when two conditions from different layers combine to create a gap neither layer would flag independently.</P>
        <P>Example: llms.txt status MISSING combined with robots.txt policy PERMISSIVE triggers "AI Crawl Gap" because AI scrapers have full access with no citation guidance. An SEO tool would say the robots.txt is valid. A security tool would say there's no vulnerability. Only the cross-reference reveals the problem.</P></S>

      <S><H>12 Scan Modules</H>
        <P>All modules run in parallel via Promise.all. A full scan completes in 5 to 15 seconds depending on target site response times.</P>
        {["DNS Resolution (Google Public DNS API)","TLS and Certificate Validation","Security Header Scan (6 headers)","HTML Structure Parse (H1, meta, canonical, title)",
          "JSON-LD Schema Extraction and Validation","Q&A Content Density Analysis","GEO Chunking and Citation Measurement","robots.txt AI Crawl Policy Classification",
          "Exposed Endpoint Detection (12 paths, false positive filtering)","Internal Link Depth Sampling","Vulnerability Indicator Scan","Content Provenance Check"].map((m,i)=>
          <div key={i} style={{display:"flex",gap:10,padding:"4px 0"}}><span style={{color:C.red,fontFamily:mono,fontSize:11,fontWeight:800,minWidth:20}}>{String(i+1).padStart(2,"0")}</span>
            <span style={{color:C.muted,fontSize:12,fontFamily:body}}>{m}</span></div>)}</S>

      <S style={{borderColor:C.redBorder}}><H>Open Methodology</H>
        <P>This scoring system is published publicly so anyone can verify how their score was calculated. If you believe a weight is wrong or a signal is missing, reach out. The methodology improves based on real-world feedback from developers, SEO professionals, and security engineers.</P>
        <P>Adam McClarin, CISSP · Meraki is Love Digital | Soulful Tech™</P></S>
    </div></div>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function CanopyGuard() {
  const [domain,setDomain]=useState("");const [phase,setPhase]=useState("landing");const [scanIndex,setScanIndex]=useState(0);
  const [report,setReport]=useState(null);const [scanError,setScanError]=useState("");
  const [showGate,setShowGate]=useState(false);const [leadCaptured,setLeadCaptured]=useState(false);const [capturedEmail,setCapturedEmail]=useState("");
  const [showMethodology,setShowMethodology]=useState(false);
  const ref=useRef(null);

  if (showMethodology) return <MethodologyPage onBack={() => setShowMethodology(false)} />;

  const startScan=async(scanDomain)=>{
    const cleaned=(scanDomain||domain).replace(/^https?:\/\//,"").replace(/\/+$/,"").trim();if(!cleaned)return;
    setDomain(cleaned);setPhase("scanning");setScanIndex(0);setScanError("");
    let idx=0;const ticker=setInterval(()=>{if(idx<PHASES.length-1){idx++;setScanIndex(idx);}},600);
    try{const res=await fetch(`${API}/api/scan`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({domain:cleaned})});
      clearInterval(ticker);if(!res.ok){const err=await res.json();throw new Error(err.error||"Scan failed");}
      const data=await res.json();setScanIndex(PHASES.length-1);setTimeout(()=>{setReport(data);setPhase("report");},500);
    }catch(err){clearInterval(ticker);setScanError(err.message||"Scan failed.");setTimeout(()=>setPhase("landing"),3000);}};

  const reset=()=>{setPhase("landing");setDomain("");setReport(null);setLeadCaptured(false);setCapturedEmail("");setShowGate(false);setScanError("");};
  const handleEmail=useCallback(async(email,name)=>{await storeLead(email,report,name);setCapturedEmail(email);setLeadCaptured(true);setShowGate(false);downloadPDF(report,email);},[report]);

  // ═══ LANDING ═══
  if(phase==="landing") {
    return <div style={{minHeight:"100vh",background:C.black,fontFamily:body,color:C.white}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600;800&display=swap" rel="stylesheet"/>
      <nav style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 32px",maxWidth:1200,margin:"0 auto"}}>
        <span style={{fontSize:18,fontWeight:900,fontFamily:display,letterSpacing:-0.5}}>CANOPY<span style={{color:C.red}}>GUARD</span></span>
        <div style={{display:"flex",gap:20,alignItems:"center"}}>
          <button onClick={()=>setShowMethodology(true)} style={{background:"transparent",border:"none",color:C.grayDark,fontSize:12,fontFamily:mono,cursor:"pointer",letterSpacing:1}}>METHODOLOGY</button>
          <span style={{fontSize:12,color:C.dim}}>|</span>
          <span style={{fontSize:12,color:C.grayDark,fontFamily:mono,letterSpacing:1}}>BY SOULFUL TECH</span>
        </div>
      </nav>

      <section style={{textAlign:"center",padding:"100px 24px 80px",maxWidth:800,margin:"0 auto"}}>
        <div style={{display:"inline-block",padding:"6px 16px",marginBottom:24,border:`1px solid ${C.redBorder}`,background:C.redGlow}}>
          <span style={{fontSize:11,fontWeight:700,color:C.red,fontFamily:mono,letterSpacing:1.5}}>FREE AUDIT TOOL</span>
        </div>
        <h1 style={{fontSize:"clamp(40px,7vw,72px)",fontWeight:900,fontFamily:display,lineHeight:1.05,letterSpacing:-3,margin:"0 0 24px 0"}}>
          Your site is either<br/><span style={{color:C.red}}>discoverable and defended</span>,<br/>or it's not.
        </h1>
        <p style={{fontSize:18,color:C.muted,lineHeight:1.7,maxWidth:560,margin:"0 auto 48px auto",fontFamily:body}}>
          Canopy Guard scans visibility across SEO, AEO, and GEO layers while auditing your security posture. One scan. One report. No guesswork.
        </p>
        <div style={{display:"flex",maxWidth:560,margin:"0 auto",border:`2px solid ${C.blackBorder}`,background:C.blackLight}}>
          <input ref={ref} type="text" value={domain} onChange={e=>setDomain(e.target.value)} onKeyDown={e=>e.key==="Enter"&&startScan()}
            placeholder="yourdomain.com" style={{flex:1,background:"transparent",border:"none",outline:"none",color:C.white,fontSize:16,padding:"20px 24px",fontFamily:mono}}/>
          <button onClick={()=>startScan()} style={{background:C.red,border:"none",color:C.white,fontWeight:900,fontSize:14,padding:"20px 36px",cursor:"pointer",letterSpacing:2,fontFamily:display}}
            onMouseEnter={e=>e.target.style.background=C.redDark} onMouseLeave={e=>e.target.style.background=C.red}>SCAN</button>
        </div>
        <p style={{color:C.grayDark,fontSize:12,marginTop:16,fontFamily:mono}}>Free. No signup. Results in under 15 seconds.</p>
        {/* SAMPLE AUDIT LINK */}
        <p style={{marginTop:8}}><button onClick={()=>startScan("merakislove.com")} style={{background:"transparent",border:"none",color:C.gray,fontSize:12,fontFamily:mono,cursor:"pointer",textDecoration:"underline"}}>
          Don't have a domain handy? View a sample report for merakislove.com</button></p>
        {scanError&&<p style={{color:C.red,fontSize:13,marginTop:12,fontFamily:mono}}>{scanError}</p>}
      </section>

      <section style={{padding:"80px 24px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:56}}>
          <h2 style={{fontSize:32,fontWeight:900,fontFamily:display,letterSpacing:-1,margin:"0 0 12px 0"}}>What Canopy Guard <span style={{color:C.red}}>checks</span></h2>
          <p style={{fontSize:15,color:C.gray,maxWidth:520,margin:"0 auto",lineHeight:1.6}}>Most tools audit one layer. We scan three and cross-reference the gaps between them.</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20}}>
          <div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:32}}>
            <div style={{fontSize:10,fontWeight:800,fontFamily:mono,color:C.red,letterSpacing:2,marginBottom:16,padding:"4px 10px",border:`1px solid ${C.redBorder}`,display:"inline-block"}}>CANOPY</div>
            <h3 style={{fontSize:20,fontWeight:900,fontFamily:display,margin:"0 0 12px 0"}}>Visibility</h3>
            <p style={{fontSize:13,color:C.gray,lineHeight:1.7,margin:"0 0 20px 0"}}>How search engines, answer engines, and generative AI discover and present your content.</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["SEO: crawlability, H1s, meta, canonicals","AEO: schema markup, FAQ JSON-LD, Q&A density","GEO: chunking efficiency, citation precision, llms.txt"].map(t=>
                <div key={t} style={{fontSize:12,color:C.muted,fontFamily:mono,paddingLeft:12,borderLeft:`2px solid ${C.blackBorder}`}}>{t}</div>)}</div></div>
          <div style={{background:C.blackCard,border:`1px solid ${C.blackBorder}`,padding:32}}>
            <div style={{fontSize:10,fontWeight:800,fontFamily:mono,color:C.red,letterSpacing:2,marginBottom:16,padding:"4px 10px",border:`1px solid ${C.redBorder}`,display:"inline-block"}}>ROOTS</div>
            <h3 style={{fontSize:20,fontWeight:900,fontFamily:display,margin:"0 0 12px 0"}}>Security</h3>
            <p style={{fontSize:13,color:C.gray,lineHeight:1.7,margin:"0 0 20px 0"}}>The infrastructure, headers, and configurations that protect your site and your visitors.</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["TLS certificates, HSTS, HTTPS redirect","Security headers: CSP, X-Frame, Referrer-Policy","Exposed endpoints, AI crawl policy, rate limiting"].map(t=>
                <div key={t} style={{fontSize:12,color:C.muted,fontFamily:mono,paddingLeft:12,borderLeft:`2px solid ${C.blackBorder}`}}>{t}</div>)}</div></div>
          <div style={{background:C.blackCard,border:`1px solid ${C.redBorder}`,padding:32}}>
            <div style={{fontSize:10,fontWeight:800,fontFamily:mono,color:C.red,letterSpacing:2,marginBottom:16,padding:"4px 10px",border:`1px solid ${C.redBorder}`,display:"inline-block"}}>INTELLIGENCE</div>
            <h3 style={{fontSize:20,fontWeight:900,fontFamily:display,margin:"0 0 12px 0"}}>Cross-Reference</h3>
            <p style={{fontSize:13,color:C.gray,lineHeight:1.7,margin:"0 0 20px 0"}}>The gaps that only appear when you map visibility data against security data in the same scan.</p>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {["AI scraping without citation guidance","Exposed API routes indexed by RAG parsers","Content provenance leaks to training sets"].map(t=>
                <div key={t} style={{fontSize:12,color:C.muted,fontFamily:mono,paddingLeft:12,borderLeft:`2px solid ${C.red}44`}}>{t}</div>)}</div></div>
        </div>
      </section>

      <section style={{padding:"60px 24px 80px",maxWidth:800,margin:"0 auto",textAlign:"center"}}>
        <div style={{display:"flex",flexWrap:"wrap",justifyContent:"center",gap:32,marginBottom:40}}>
          {[{n:"CISSP",d:"Certified Information Systems Security Professional"},{n:"12+",d:"Production apps audited and deployed"},{n:"5",d:"Active SaaS products in production"}].map(b=>
            <div key={b.n} style={{textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:900,fontFamily:mono,color:C.red}}>{b.n}</div>
              <div style={{fontSize:11,color:C.grayDark,maxWidth:180,marginTop:4}}>{b.d}</div></div>)}</div>
        <p style={{fontSize:14,color:C.gray,lineHeight:1.7,maxWidth:520,margin:"0 auto"}}>
          Built by Adam McClarin, a CISSP-certified engineer who builds, deploys, and secures production applications every day. Not a theoretical tool. A practical one, built from real audit work across real client sites.</p>
      </section>

      <footer style={{borderTop:`1px solid ${C.blackBorder}`,padding:"24px 32px",textAlign:"center"}}>
        <p style={{fontSize:11,color:C.grayDark,margin:0}}>Canopy Guard · Built by <span style={{color:C.white,fontWeight:700}}>Soulful Tech™</span> · Meraki is Love, LLC · merakislove.com</p>
      </footer>
    </div>;
  }

  // ═══ SCANNING ═══
  if(phase==="scanning") {
    return <div style={{minHeight:"100vh",background:C.black,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,fontFamily:body}}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600;800&display=swap" rel="stylesheet"/>
      <div style={{maxWidth:440,width:"100%",textAlign:"left"}}>
        <h2 style={{color:C.white,fontSize:18,fontWeight:900,margin:"0 0 4px 0",fontFamily:display}}>Scanning <span style={{color:C.red}}>{domain}</span></h2>
        <p style={{color:C.gray,fontSize:13,fontFamily:mono,margin:"0 0 32px 0"}}>{PHASES[scanIndex]}...</p>
        <div style={{width:"100%",height:2,background:C.blackBorder,marginBottom:32}}><div style={{height:"100%",width:`${((scanIndex+1)/PHASES.length)*100}%`,background:C.red,transition:"width 0.3s ease"}}/></div>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {PHASES.map((p,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 0",opacity:i<=scanIndex?1:0.25,transition:"opacity 0.3s"}}>
            <span style={{fontFamily:mono,fontSize:11,color:i<scanIndex?C.green:i===scanIndex?C.red:C.grayDark,width:16}}>{i<scanIndex?"✓":i===scanIndex?"▸":"·"}</span>
            <span style={{fontSize:13,color:i<=scanIndex?C.muted:C.grayDark}}>{p}</span></div>)}</div></div></div>;
  }

  // ═══ REPORT ═══
  const d=report;const s=d.summary_scores;const sec=d.security_roots;
  const overall=+((s.seo_score+s.aeo_score+s.geo_score+s.security_posture_score)/4).toFixed(2);
  const overallPct=Math.round(overall*100);
  const actions=getTopActions(d);
  const compliance=getComplianceChecks(d);
  const fixes=getFixSnippets(d);

  return <div style={{minHeight:"100vh",background:C.black,fontFamily:body,color:C.white}}>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&family=DM+Sans:wght@400;500;700&family=JetBrains+Mono:wght@400;600;800&display=swap" rel="stylesheet"/>
    {showGate&&<EmailGate onSubmit={handleEmail} onClose={()=>setShowGate(false)}/>}

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 24px",borderBottom:`1px solid ${C.blackBorder}`}}>
      <span style={{fontSize:14,fontWeight:900,fontFamily:display,cursor:"pointer"}} onClick={reset}>CANOPY<span style={{color:C.red}}>GUARD</span></span>
      <div style={{display:"flex",gap:8}}>
        {!leadCaptured?<button onClick={()=>setShowGate(true)} style={{background:C.red,border:"none",color:C.white,padding:"6px 14px",fontSize:11,fontWeight:800,cursor:"pointer",letterSpacing:1.5}}>GET REPORT</button>
          :<button onClick={()=>downloadPDF(report,capturedEmail)} style={{background:"transparent",border:`1px solid ${C.green}`,color:C.green,padding:"6px 14px",fontSize:11,fontWeight:800,cursor:"pointer",fontFamily:mono}}>↓ PDF</button>}
        <button onClick={()=>setShowMethodology(true)} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.grayDark,padding:"6px 14px",fontSize:11,fontWeight:700,cursor:"pointer",fontFamily:mono,letterSpacing:1}}>DOCS</button>
        <button onClick={reset} style={{background:"transparent",border:`1px solid ${C.blackBorder}`,color:C.gray,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>New Scan</button></div></div>

    <div style={{maxWidth:900,margin:"0 auto",padding:"32px 20px"}}>
      <div style={{marginBottom:32}}>
        <p style={{color:C.grayDark,fontSize:10,fontFamily:mono,letterSpacing:2,margin:"0 0 8px 0"}}>AUDIT REPORT</p>
        <h1 style={{fontSize:"clamp(24px,4vw,36px)",fontWeight:900,margin:"0 0 4px 0",fontFamily:display,letterSpacing:-1}}>{d.target_domain}</h1>
        <p style={{color:C.grayDark,fontSize:11,fontFamily:mono,margin:0}}>{new Date(d.timestamp).toLocaleString()} · {d.audit_id.slice(0,8)} · {d.scan_duration_ms}ms</p>
      </div>

      {/* Top Actions with expandable snippets */}
      {actions.length>0&&<div style={{marginBottom:24,padding:24,background:C.blackCard,border:`1px solid ${C.redBorder}`}}>
        <h3 style={{fontSize:14,fontWeight:800,color:C.red,fontFamily:display,textTransform:"uppercase",letterSpacing:1,margin:"0 0 16px 0"}}>Top Actions</h3>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {actions.map((a,i)=>{
            const [showSnip,setShowSnip]=useState(false);
            return <div key={i}>
              <div style={{display:"flex",gap:14,alignItems:"flex-start"}}>
                <div style={{fontSize:20,fontWeight:900,fontFamily:mono,color:C.red,lineHeight:1,minWidth:24}}>{i+1}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.white}}>{a.action}</div>
                    {a.snippet&&FIX_SNIPPETS[a.snippet]&&<button onClick={()=>setShowSnip(!showSnip)} style={{background:showSnip?C.redGlow:"transparent",border:`1px solid ${showSnip?C.red:C.blackBorder}`,color:showSnip?C.red:C.grayDark,fontSize:9,fontFamily:mono,fontWeight:700,padding:"2px 8px",cursor:"pointer",letterSpacing:1}}>{showSnip?"HIDE CODE":"SHOW FIX"}</button>}
                  </div>
                  <div style={{fontSize:12,color:C.gray,lineHeight:1.5,marginTop:2}}>{a.impact}</div>
                  {showSnip&&a.snippet&&FIX_SNIPPETS[a.snippet]&&<FixSnippet snippet={FIX_SNIPPETS[a.snippet]}/>}
                </div></div></div>})}</div></div>}

      {/* Scores */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"center",flexWrap:"wrap",gap:40,padding:"40px 24px",marginBottom:24,border:`1px solid ${C.blackBorder}`,background:C.blackCard}}>
        <div style={{textAlign:"center"}}><div style={{fontSize:72,fontWeight:900,fontFamily:mono,color:scoreColor(overallPct),lineHeight:1}}>{overallPct}</div>
          <div style={{fontSize:9,fontWeight:800,color:C.gray,letterSpacing:2,marginTop:8}}>OVERALL</div></div>
        <div style={{width:1,height:60,background:C.blackBorder}}/>
        <ScoreBlock score={s.seo_score} label="SEO" delay={200}/><ScoreBlock score={s.aeo_score} label="AEO" delay={400}/>
        <ScoreBlock score={s.geo_score} label="GEO" delay={600}/><ScoreBlock score={s.security_posture_score} label="SECURITY" delay={800}/>
      </div>

      <Insights data={d}/>

      {/* Detail Grid with FIX buttons */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:16,marginBottom:20}}>
        <Section title="SEO" tag="CANOPY" desc="How search engines crawl, index, and rank your site.">
          <Row label="Crawlable" good={d.visibility_canopy.seo_branch.crawlability}/>
          <Row label="H1 Tags" value={d.visibility_canopy.seo_branch.html_structure.h1_count}/>
          <Row label="Meta Descriptions" good={!d.visibility_canopy.seo_branch.html_structure.missing_meta_descriptions} snippet="meta_desc"/>
          <Row label="Canonical Match" good={d.visibility_canopy.seo_branch.html_structure.canonical_match} snippet="canonical"/>
          <Row label="Link Depth" value={`${d.visibility_canopy.seo_branch.internal_linking_depth} clicks`}/>
          {d.visibility_canopy.seo_branch.html_structure.title&&<Row label="Page Title" value={d.visibility_canopy.seo_branch.html_structure.title.slice(0,40)}/>}
        </Section>
        <Section title="AEO" tag="CANOPY" desc="How well AI answer engines can extract and cite your content.">
          <Row label="FAQ Schema" good={d.visibility_canopy.aeo_branch.schema_validation.has_faq_json_ld} snippet="faq_schema"/>
          <Row label="Org Schema" good={d.visibility_canopy.aeo_branch.schema_validation.has_organization_json_ld} snippet="org_schema"/>
          <Row label="Any JSON-LD" good={d.visibility_canopy.aeo_branch.schema_validation.has_any_json_ld}/>
          <Row label="Validation Errors" value={d.visibility_canopy.aeo_branch.schema_validation.validation_errors.length||"None"}/>
          <Row label="Q&A Density" value={`${(d.visibility_canopy.aeo_branch.qa_density_score*100).toFixed(0)}%`}/>
        </Section>
        <Section title="GEO" tag="CANOPY" desc="How generative AI models chunk, cite, and surface your pages.">
          <Row label="Chunking Efficiency" value={`${(d.visibility_canopy.geo_branch.chunking_efficiency*100).toFixed(0)}%`}/>
          <Row label="Citation Precision" value={`${(d.visibility_canopy.geo_branch.citation_metrics.precision_rate*100).toFixed(0)}%`}/>
          <Row label="Market Share Gap" value={`${(d.visibility_canopy.geo_branch.citation_metrics.market_share_gap*100).toFixed(0)}%`}/>
          <Row label="llms.txt" good={d.visibility_canopy.geo_branch.llms_txt_status==="PRESENT_ROOT"} snippet="llms_txt"/>
        </Section>
        <Section title="Security" tag="ROOTS" desc="The headers, certificates, and configurations protecting your infrastructure.">
          <Row label="TLS Valid" good={sec.tls?.valid}/>
          <Row label="HSTS" good={sec.tls?.hsts} snippet="hsts"/>
          <Row label="HTTPS Redirect" good={sec.tls?.redirectsToHttps}/>
          <Row label="Robots Policy" value={sec.ai_crawl_risk.robots_policy}/>
          <Row label="Agent Spoofing" good={!sec.ai_crawl_risk.spoofed_agent_vulnerability}/>
          <Row label="Rate Limiting" good={sec.ai_crawl_risk.rate_limiting_active}/>
          <Row label="Exposed Endpoints" value={(sec.application_security.exposed_endpoints||[]).length||"None"}/>
          <Row label="Missing Headers" value={(sec.application_security.missing_secure_headers||[]).length||"None"}/>
          <Row label="Known CVEs" value={(sec.application_security.vulnerabilities||[]).length||"None"}/>
        </Section>
      </div>

      {/* Compliance */}
      <div style={{padding:24,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:20}}>
        <h4 style={{fontSize:12,fontWeight:800,color:C.white,fontFamily:display,textTransform:"uppercase",letterSpacing:1,margin:"0 0 16px 0"}}>Compliance Quick Check</h4>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:8}}>
          {compliance.map(c=><div key={c.label} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:c.pass?C.greenGlow:C.redGlow,border:`1px solid ${c.pass?C.green:C.red}22`}}>
            <span style={{fontFamily:mono,fontSize:11,fontWeight:800,color:c.pass?C.green:C.red}}>{c.pass?"✓":"✗"}</span>
            <span style={{fontSize:12,color:C.muted}}>{c.label}</span></div>)}</div></div>

      {/* Missing Headers with fix snippets */}
      {(sec.application_security.missing_secure_headers||[]).length>0&&<div style={{padding:20,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:20}}>
        <h4 style={{margin:"0 0 12px 0",fontSize:12,fontWeight:800,color:C.red,letterSpacing:1,textTransform:"uppercase"}}>Missing Headers</h4>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:12}}>
          {sec.application_security.missing_secure_headers.map(h=><code key={h} style={{padding:"4px 10px",fontSize:11,fontFamily:mono,fontWeight:600,background:C.redGlow,color:C.red,border:`1px solid ${C.red}33`}}>{h}</code>)}</div>
        {sec.application_security.missing_secure_headers.map(h => {
          const key = HEADER_SNIPPET_MAP[h];
          return key && FIX_SNIPPETS[key] ? <FixSnippet key={h} snippet={FIX_SNIPPETS[key]} /> : null;
        })}
      </div>}

      {/* CTA */}
      <div style={{textAlign:"center",padding:48,background:C.blackCard,border:`1px solid ${C.blackBorder}`,marginBottom:32}}>
        {!leadCaptured?<>
          <h2 style={{fontSize:28,fontWeight:900,margin:"0 0 8px 0",fontFamily:display}}>Get your full <span style={{color:C.red}}>report</span></h2>
          <p style={{color:C.gray,fontSize:14,margin:"0 0 28px 0",maxWidth:440,marginLeft:"auto",marginRight:"auto",lineHeight:1.6}}>
            Download a PDF with your complete audit, top actions, and compliance check. We will prepare your results for a free walkthrough.</p>
          <button onClick={()=>setShowGate(true)} style={{background:C.red,color:C.white,border:"none",fontWeight:900,fontSize:14,padding:"18px 44px",letterSpacing:2,cursor:"pointer",fontFamily:display}}
            onMouseEnter={e=>e.target.style.background=C.redDark} onMouseLeave={e=>e.target.style.background=C.red}>GET YOUR REPORT</button>
        </>:<>
          <div style={{fontSize:36,marginBottom:12,color:C.green}}>✓</div>
          <h2 style={{fontSize:28,fontWeight:900,margin:"0 0 8px 0",fontFamily:display}}>Report delivered to <span style={{color:C.red}}>{capturedEmail}</span></h2>
          <p style={{color:C.gray,fontSize:14,margin:"0 0 28px 0",maxWidth:460,marginLeft:"auto",marginRight:"auto",lineHeight:1.6}}>
            We have your results. Every finding is something we resolve for clients every week. Book a free 30-minute walkthrough.</p>
          <a href="https://calendly.com/hello-merakislove/new-meeting" target="_blank" rel="noopener noreferrer"
            style={{display:"inline-block",background:C.red,color:C.white,fontWeight:900,fontSize:14,padding:"18px 44px",textDecoration:"none",letterSpacing:2,fontFamily:display}}
            onMouseEnter={e=>e.target.style.background=C.redDark} onMouseLeave={e=>e.target.style.background=C.red}>BOOK A FREE WALKTHROUGH</a>
          <div style={{marginTop:16}}><button onClick={()=>downloadPDF(report,capturedEmail)} style={{background:"transparent",border:"none",color:C.gray,fontSize:12,cursor:"pointer",fontFamily:mono,textDecoration:"underline"}}>Download PDF again</button></div>
        </>}
        <p style={{color:C.grayDark,fontSize:11,marginTop:24,fontFamily:mono}}>Adam McClarin, CISSP · Meraki is Love Digital | Soulful Tech™</p>
      </div>

      <div style={{textAlign:"center",padding:"20px 0",borderTop:`1px solid ${C.blackBorder}`}}>
        <p style={{fontSize:11,color:C.grayDark,margin:0}}>Canopy Guard · Built by Soulful Tech™ · merakislove.com</p></div>
    </div></div>;
}
