// src/pages/Compare.jsx

const COLORS = {
  purple:     '#2D005E',
  purpleMid:  '#3D007A',
  gold:       '#C8A96E',
  goldDim:    '#8A6E3A',
  white:      '#F8F8F8',
  gray:       '#888',
  grayDim:    '#444',
  grayBg:     '#1A1A2E',
  green:      '#4CAF82',
  red:        '#CC5555',
  amber:      '#E0A030',
};

const TOOLS = [
  { id: 'canopy',   label: 'Canopy Guard',         sub: 'Free',          highlight: true  },
  { id: 'seo',      label: 'Ahrefs / SEMrush',     sub: '$99–$499/mo',   highlight: false },
  { id: 'gsc',      label: 'Google Search Console', sub: 'Free',         highlight: false },
  { id: 'mozilla',  label: 'Mozilla Observatory',   sub: 'Free',         highlight: false },
  { id: 'ssllabs',  label: 'SSL Labs',              sub: 'Free',         highlight: false },
  { id: 'hubspot',  label: 'HubSpot Grader',        sub: 'Free',         highlight: false },
];

const FEATURE_GROUPS = [
  {
    label: 'Visibility',
    features: [
      { name: 'SEO Analysis',                    values: { canopy:'y', seo:'y', gsc:'p', mozilla:'n', ssllabs:'n', hubspot:'p' } },
      { name: 'AEO — Answer Engine Optimization', values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true, desc: 'How AI tools like ChatGPT cite your content' },
      { name: 'GEO — Generative Engine Optimization', values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true, desc: 'How AI models chunk and retrieve your pages' },
      { name: 'llms.txt Detection',              values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true },
    ],
  },
  {
    label: 'Security — Headers',
    features: [
      { name: 'Security Header Presence',        values: { canopy:'y', seo:'n', gsc:'n', mozilla:'y', ssllabs:'p', hubspot:'p' } },
      { name: 'CSP Directive Quality Scoring',   values: { canopy:'y', seo:'n', gsc:'n', mozilla:'p', ssllabs:'n', hubspot:'n' }, desc: 'Scores what the directives actually say, not just presence' },
      { name: 'CORS Misconfiguration Detection', values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true },
      { name: 'Dangerous HTTP Methods',          values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true },
    ],
  },
  {
    label: 'Security — TLS',
    features: [
      { name: 'Certificate Expiry Countdown',    values: { canopy:'y', seo:'n', gsc:'n', mozilla:'y', ssllabs:'y', hubspot:'n' }, desc: 'Days remaining, not just valid/invalid' },
      { name: 'Cipher Suite Quality',            values: { canopy:'y', seo:'n', gsc:'n', mozilla:'p', ssllabs:'y', hubspot:'n' }, desc: 'Detects RC4, 3DES, EXPORT, NULL ciphers' },
      { name: 'TLS Version Enforcement',         values: { canopy:'y', seo:'n', gsc:'n', mozilla:'y', ssllabs:'y', hubspot:'n' }, desc: 'Flags TLS 1.0 / 1.1 acceptance' },
      { name: 'Self-Signed Certificate Check',   values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'y', hubspot:'n' } },
    ],
  },
  {
    label: 'Security — DNS',
    features: [
      { name: 'SPF Policy Quality Scoring',      values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true, desc: '-all vs ~all vs +all — not just presence' },
      { name: 'DMARC Policy Level',              values: { canopy:'y', seo:'n', gsc:'n', mozilla:'y', ssllabs:'n', hubspot:'n' }, desc: 'reject vs quarantine vs none' },
      { name: 'CAA Record Detection',            values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'y', hubspot:'n' } },
      { name: 'Subdomain Takeover Detection',    values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true },
    ],
  },
  {
    label: 'Security — HTML & Paths',
    features: [
      { name: 'HTML Source Security Parsing',    values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true, desc: 'CSRF tokens, mixed content, inline scripts, comment disclosures' },
      { name: 'Vulnerable Library Detection',    values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true, desc: 'Fingerprints CDN URLs against known CVE versions' },
      { name: 'Sensitive File Exposure',         values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true, desc: '.env, .git/config, backups, source maps' },
      { name: 'Error Page Stack Trace Check',    values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true },
    ],
  },
  {
    label: 'Intelligence & Platform',
    features: [
      { name: 'Cross-Reference Intelligence',    values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true, desc: 'Findings that only exist in the overlap of multiple layers' },
      { name: 'Free, No Account Required',       values: { canopy:'y', seo:'n', gsc:'p', mozilla:'y', ssllabs:'y', hubspot:'p' } },
      { name: 'CISSP-Reviewed Methodology',      values: { canopy:'y', seo:'n', gsc:'n', mozilla:'n', ssllabs:'n', hubspot:'n' }, exclusive: true },
    ],
  },
];

function Cell({ val, highlight }) {
  const icon = val === 'y' ? '✓' : val === 'p' ? '◐' : '✕';
  const color = val === 'y' ? (highlight ? COLORS.gold : COLORS.green) : val === 'p' ? COLORS.amber : COLORS.grayDim;
  return (
    <td style={{ textAlign:'center', padding:'10px 6px', fontSize:'16px', fontWeight:'700', color, borderBottom:`1px solid #1E1E30`, background: highlight ? 'rgba(200,169,110,0.04)' : 'transparent' }}>
      {icon}
    </td>
  );
}

function ExclusiveBadge() {
  return (
    <span style={{ display:'inline-block', marginLeft:'7px', padding:'1px 6px', background:COLORS.gold, color:COLORS.purple, borderRadius:'3px', fontSize:'9px', fontWeight:'800', letterSpacing:'0.08em', textTransform:'uppercase', verticalAlign:'middle' }}>
      Only us
    </span>
  );
}

export default function Compare() {
  const exclusiveCount = FEATURE_GROUPS.flatMap(g => g.features).filter(f => f.exclusive).length;

  return (
    <div style={{ background: COLORS.purple, minHeight: '100vh', fontFamily: "'Inter', 'Helvetica Neue', sans-serif", color: COLORS.white }}>

      {/* Hero */}
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '72px 24px 48px', textAlign: 'center' }}>
        <div style={{ display:'inline-block', padding:'3px 12px', background:'rgba(200,169,110,0.12)', border:`1px solid ${COLORS.goldDim}`, borderRadius:'4px', fontSize:'11px', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', color:COLORS.gold, marginBottom:'20px' }}>
          v3.0.1 — 83 Signals
        </div>
        <h1 style={{ fontSize:'clamp(28px, 5vw, 50px)', fontWeight:'800', lineHeight:'1.1', margin:'0 0 18px', color:COLORS.white }}>
          One scan.<br /><span style={{ color: COLORS.gold }}>Nothing else comes close.</span>
        </h1>
        <p style={{ fontSize:'17px', lineHeight:'1.65', color:'rgba(248,248,248,0.65)', maxWidth:'580px', margin:'0 auto 40px' }}>
          Most tools do one thing. Ahrefs does SEO. SSL Labs does TLS. Mozilla Observatory does headers.
          Canopy Guard does all of it in 15 seconds, then cross-references the results to surface gaps no other tool catches.
        </p>
        <div style={{ display:'flex', justifyContent:'center', gap:'36px', flexWrap:'wrap', marginBottom:'48px' }}>
          {[['83','Total signals'],['51','Security signals'],[exclusiveCount,'Features no other free tool has'],['15s','Scan time']].map(([val, label]) => (
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:'34px', fontWeight:'800', color:COLORS.gold, lineHeight:1 }}>{val}</div>
              <div style={{ fontSize:'12px', color:'rgba(248,248,248,0.5)', marginTop:'5px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ maxWidth:'1060px', margin:'0 auto', padding:'0 16px 72px', overflowX:'auto' }}>
        <div style={{ display:'flex', gap:'20px', justifyContent:'flex-end', marginBottom:'12px', fontSize:'12px', color:'rgba(248,248,248,0.4)' }}>
          <span><span style={{ color:COLORS.gold, fontWeight:'700' }}>✓</span> Full (us)</span>
          <span><span style={{ color:COLORS.green, fontWeight:'700' }}>✓</span> Full (competitor)</span>
          <span><span style={{ color:COLORS.amber }}>◐</span> Partial</span>
          <span><span style={{ color:COLORS.grayDim }}>✕</span> Not available</span>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px', minWidth:'680px' }}>
          <thead>
            <tr style={{ background: COLORS.purpleMid }}>
              <th style={{ textAlign:'left', padding:'12px 14px', fontWeight:'600', color:'rgba(248,248,248,0.5)', fontSize:'11px', width:'38%', borderBottom:`2px solid ${COLORS.goldDim}` }}>Feature</th>
              {TOOLS.map(t => (
                <th key={t.id} style={{ textAlign:'center', padding:'12px 6px', fontWeight: t.highlight ? '800' : '600', fontSize:'11px', color: t.highlight ? COLORS.gold : 'rgba(248,248,248,0.45)', borderBottom:`2px solid ${t.highlight ? COLORS.gold : COLORS.grayDim}`, background: t.highlight ? 'rgba(200,169,110,0.06)' : 'transparent', minWidth:'80px' }}>
                  <div>{t.label}</div>
                  <div style={{ fontWeight:'400', fontSize:'10px', opacity:0.65, marginTop:'2px' }}>{t.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FEATURE_GROUPS.map(group => (
              <>
                <tr key={`g-${group.label}`}>
                  <td colSpan={TOOLS.length + 1} style={{ padding:'14px 14px 6px', fontSize:'10px', fontWeight:'800', letterSpacing:'0.12em', textTransform:'uppercase', color:COLORS.gold, background:'rgba(45,0,94,0.9)', borderTop:`1px solid rgba(200,169,110,0.15)` }}>
                    {group.label}
                  </td>
                </tr>
                {group.features.map(f => (
                  <tr key={f.name} style={{ background: f.exclusive ? 'rgba(200,169,110,0.03)' : 'transparent' }}>
                    <td style={{ padding:'10px 14px', borderBottom:`1px solid #1E1E30`, verticalAlign:'top' }}>
                      <div style={{ fontWeight:'600', color:COLORS.white, fontSize:'12px' }}>
                        {f.name}{f.exclusive && <ExclusiveBadge />}
                      </div>
                      {f.desc && <div style={{ fontSize:'11px', color:'rgba(248,248,248,0.4)', marginTop:'3px' }}>{f.desc}</div>}
                    </td>
                    {TOOLS.map(t => <Cell key={t.id} val={f.values[t.id]} highlight={t.highlight} />)}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize:'11px', color:'rgba(248,248,248,0.3)', marginTop:'12px', textAlign:'right' }}>
          Competitor data based on publicly documented feature sets, June 2026.
        </p>
      </div>

      {/* CTA */}
      <div style={{ textAlign:'center', padding:'64px 24px', background: COLORS.grayBg }}>
        <h2 style={{ fontSize:'clamp(22px, 4vw, 36px)', fontWeight:'800', marginBottom:'14px' }}>See it for yourself.</h2>
        <p style={{ fontSize:'16px', color:'rgba(248,248,248,0.55)', marginBottom:'32px' }}>One URL. 83 signals. 15 seconds. No account required.</p>
        <a href="/" style={{ display:'inline-block', padding:'14px 36px', background:COLORS.gold, color:COLORS.purple, fontWeight:'800', fontSize:'15px', borderRadius:'6px', textDecoration:'none' }}>
          Run Your Free Audit
        </a>
        <div style={{ marginTop:'14px', fontSize:'11px', color:'rgba(248,248,248,0.3)' }}>
          Built by Adam McClarin, CISSP — Meraki is Love / Soulful Tech
        </div>
      </div>

    </div>
  );
}
