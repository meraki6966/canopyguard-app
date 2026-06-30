import { Link } from "react-router-dom";
import { POSTS } from "./blog/posts.js";
import "./home.css";

const DM_FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Mono:wght@400;700&display=swap";
const CALENDLY = "https://calendly.com/hello-merakislove/new-meeting";

// Landing page. The hero scanner is wired to the real startScan() in App.jsx;
// all marketing sections below are static. Styles are scoped under .cg-home.
export default function Home({ domain, setDomain, startScan, scanError, inputRef }) {
  // Secondary "Scan" buttons (pricing, CTA) live far from the hero input — if a
  // domain is already typed, scan it; otherwise jump to the hero and focus it.
  const scanOrFocus = () => {
    if ((domain || "").trim()) {
      startScan();
    } else {
      document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef?.current?.focus(), 400);
    }
  };

  return (
    <div className="cg-home" id="top">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={DM_FONTS} rel="stylesheet" />

      <nav>
        <a href="#top" className="nav-logo">Canopy<span>Guard</span></a>
        <ul className="nav-links">
          <li><a href="#how-it-works">How it works</a></li>
          <li><a href="#geo">GEO</a></li>
          <li><a href="#methodology">Methodology</a></li>
          <li><a href="#results">Results</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="#faq">FAQ</a></li>
          <li><Link to="/blog">Blog</Link></li>
        </ul>
        <div className="nav-right">
          <Link to="/privacy" className="nav-signin">Privacy</Link>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-gold">Book a Call</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero" style={{ padding: 0 }}>
        <div className="hero-left">
          <div className="eyebrow">SEO <span className="eyebrow-dot"></span> AEO <span className="eyebrow-dot"></span> GEO <span className="eyebrow-dot"></span> Security</div>
          <h1>Know exactly where your site <em>stands.</em></h1>
          <p className="hero-sub">Free site audit across SEO, AI discoverability, and security. Real findings in 30 seconds. If you need the work done, I am one call away.</p>
          <div className="scan-form">
            <div className="scan-row">
              <input
                ref={inputRef}
                className="scan-input"
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && startScan()}
                placeholder="yourdomain.com"
              />
              <button className="btn-scan" onClick={() => startScan()}>Scan My Site</button>
            </div>
            <span className="scan-note">Free scan. No account. No credit card. Download your full report instantly.</span>
            {scanError && <span className="scan-error">{scanError}</span>}
          </div>
          <div className="trust-badges">
            <div className="trust-badge"><span className="trust-dot"></span>CISSP-informed</div>
            <div className="trust-badge"><span className="trust-dot"></span>MITRE ATT&CK mapped</div>
            <div className="trust-badge"><span className="trust-dot"></span>GEO scored</div>
            <div className="trust-badge"><span className="trust-dot"></span>57 sites audited</div>
          </div>
        </div>
        <div className="hero-right">
          <div className="results-label">Example audit results</div>
          <div className="overall-card">
            <div className="ring-wrap" style={{ width: 86, height: 86 }}>
              <svg width="86" height="86" viewBox="0 0 86 86" fill="none">
                <circle cx="43" cy="43" r="35" stroke="rgba(237,244,239,0.1)" strokeWidth="7" />
                <circle cx="43" cy="43" r="35" stroke="#C8A96E" strokeWidth="7" strokeDasharray="219.9" strokeDashoffset="88" strokeLinecap="round" />
              </svg>
              <div className="ring-label"><span className="ring-num" style={{ fontSize: "1.55rem" }}>60</span><span className="ring-denom">/ 100</span></div>
            </div>
            <div className="overall-info">
              <div className="overall-title">Visibility Score</div>
              <div className="overall-sub"><strong>3 critical issues</strong> reducing your AI search presence and leaving security headers unpatched. Here is where to start.</div>
            </div>
          </div>
          <div className="score-grid">
            <div className="score-card">
              <div className="score-card-label">SEO</div>
              <div className="score-ring-row">
                <svg width="42" height="42" viewBox="0 0 42 42" fill="none" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
                  <circle cx="21" cy="21" r="16" stroke="#E5EFE8" strokeWidth="4.5" />
                  <circle cx="21" cy="21" r="16" stroke="#2A7A5E" strokeWidth="4.5" strokeDasharray="100.5" strokeDashoffset="20.1" strokeLinecap="round" />
                </svg>
                <div><div className="score-num good">80</div><div className="score-denom">/ 100</div></div>
              </div>
              <div className="score-finding"><strong>Missing:</strong> Schema markup on 4 pages</div>
            </div>
            <div className="score-card">
              <div className="score-card-label">AI Search</div>
              <div className="score-ring-row">
                <svg width="42" height="42" viewBox="0 0 42 42" fill="none" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
                  <circle cx="21" cy="21" r="16" stroke="#E5EFE8" strokeWidth="4.5" />
                  <circle cx="21" cy="21" r="16" stroke="#C8A96E" strokeWidth="4.5" strokeDasharray="100.5" strokeDashoffset="50.3" strokeLinecap="round" />
                </svg>
                <div><div className="score-num warn">50</div><div className="score-denom">/ 100</div></div>
              </div>
              <div className="score-finding"><strong>Missing:</strong> FAQ schema, AI crawlers blocked</div>
            </div>
            <div className="score-card">
              <div className="score-card-label">Security</div>
              <div className="score-ring-row">
                <svg width="42" height="42" viewBox="0 0 42 42" fill="none" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
                  <circle cx="21" cy="21" r="16" stroke="#E5EFE8" strokeWidth="4.5" />
                  <circle cx="21" cy="21" r="16" stroke="#C24B3A" strokeWidth="4.5" strokeDasharray="100.5" strokeDashoffset="70.4" strokeLinecap="round" />
                </svg>
                <div><div className="score-num crit">30</div><div className="score-denom">/ 100</div></div>
              </div>
              <div className="score-finding"><strong>Critical:</strong> CSP + HSTS missing</div>
              <div className="mitre-badge">MITRE ATT&CK</div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stat"><div className="stat-num">57</div><div className="stat-label">Sites audited</div></div>
        <div className="stat"><div className="stat-num">4</div><div className="stat-label">Sites transformed</div></div>
        <div className="stat"><div className="stat-num">4</div><div className="stat-label">Scoring categories</div></div>
        <div className="stat"><div className="stat-num">$0</div><div className="stat-label">Always free</div></div>
      </div>

      {/* GEO */}
      <section id="geo" className="geo-section">
        <div className="section-inner">
          <div className="geo-grid">
            <div className="geo-left">
              <div className="section-eyebrow" style={{ color: "var(--gold)" }}>Why GEO changes everything</div>
              <h1 className="section-headline" style={{ color: "var(--tod)" }}>Your customers are now searching with AI. Is your site showing up?</h1>
              <p className="section-sub" style={{ color: "var(--todm)" }}>Google is no longer the only search engine that matters. ChatGPT, Gemini, Claude, and Perplexity answer millions of questions every day. GEO, Generative Engine Optimization, is how you get cited in those answers.</p>
              <p style={{ fontSize: "1rem", color: "var(--todm)", lineHeight: 1.65, marginBottom: 0 }}>Most audit tools do not score for this. Canopy Guard does. It is the fastest-growing gap between sites that get found and sites that do not.</p>
              <div className="geo-highlight">
                <div className="geo-highlight-text">Canopy Guard is one of the only free tools that scores your site for <strong>GEO, AEO, SEO, and security in a single audit.</strong> You see the full picture before you spend a dollar.</div>
              </div>
            </div>
            <div className="geo-right">
              <div className="geo-card">
                <div className="geo-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(237,244,239,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M17 17l4 4" />
                    <path d="M8.5 11h5M11 8.5v5" />
                  </svg>
                </div>
                <div className="geo-card-title">Traditional SEO</div>
                <div className="geo-card-body">Google, Bing, and search engine ranking. Still essential. Canopy Guard scores this fully across technical and content signals.</div>
              </div>
              <div className="geo-card">
                <div className="geo-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(237,244,239,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <path d="M9 9h6M9 13h4" />
                  </svg>
                </div>
                <div className="geo-card-title">AEO</div>
                <div className="geo-card-body">Answer Engine Optimization. Are you structured to answer direct questions for voice search, featured snippets, and AI answer boxes?</div>
              </div>
              <div className="geo-card" style={{ borderColor: "rgba(200,169,110,0.4)", background: "rgba(200,169,110,0.06)" }}>
                <div className="geo-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(200,169,110,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="5" r="2" />
                    <circle cx="5" cy="19" r="2" />
                    <circle cx="19" cy="19" r="2" />
                    <path d="M12 7v5M12 12l-5.5 5.5M12 12l5.5 5.5" />
                  </svg>
                </div>
                <div className="geo-card-title" style={{ color: "var(--gold)" }}>GEO — The new frontier</div>
                <div className="geo-card-body" style={{ color: "var(--tod)" }}>Generative Engine Optimization. Are ChatGPT, Gemini, and Perplexity finding and citing your site? This is the newest and most overlooked visibility gap.</div>
              </div>
              <div className="geo-card">
                <div className="geo-card-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(237,244,239,0.7)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <div className="geo-card-title">Security</div>
                <div className="geo-card-body">MITRE ATT&CK-mapped security findings. Security gaps hurt your search trust signals. We score and surface them both.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="how-section">
        <div className="section-inner">
          <div className="section-eyebrow">How it works</div>
          <h2 className="section-headline">From URL to answers in four steps</h2>
          <p className="section-sub">No setup. No account. Paste your domain and see exactly what is holding your site back.</p>
          <div className="steps">
            <div className="step"><div className="step-num">01</div><div className="step-title">Enter your URL</div><div className="step-body">Paste any domain. No login, no credit card. Takes three seconds.</div></div>
            <div className="step"><div className="step-num">02</div><div className="step-title">Get your scores</div><div className="step-body">Your site is scored across SEO, AEO, GEO, and security. Results in 30 seconds.</div></div>
            <div className="step"><div className="step-num">03</div><div className="step-title">Download your report</div><div className="step-body">Get the full findings with prioritized recommendations. Know what to fix first.</div></div>
            <div className="step"><div className="step-num">04</div><div className="step-title">Need the work done?</div><div className="step-body">Book a call with Adam. Canopy Guard customers get a discount on all services.</div></div>
          </div>
        </div>
      </section>

      {/* METHODOLOGY / CATEGORIES */}
      <section id="methodology" className="categories-section">
        <div className="section-inner">
          <div className="section-eyebrow">What we measure</div>
          <h2 className="section-headline">Four categories. One complete picture.</h2>
          <p className="section-sub">Every audit scores across four dimensions. Together they show exactly where your visibility is strong and where it is costing you business.</p>
          <div className="cat-grid">
            <div className="cat-card">
              <div className="cat-label">Category 01</div>
              <div className="cat-name">SEO</div>
              <div className="cat-score warn">—</div>
              <div className="cat-desc">The foundation. Technical signals that help Google find, crawl, and rank your site. Most small business sites have fixable issues here costing them traffic every day.</div>
              <ul className="cat-checks">
                <li>Title tags and meta descriptions</li>
                <li>Heading structure and hierarchy</li>
                <li>Schema markup and structured data</li>
                <li>Canonical and robots directives</li>
                <li>Open Graph and social signals</li>
              </ul>
            </div>
            <div className="cat-card">
              <div className="cat-label">Category 02</div>
              <div className="cat-name">AEO</div>
              <div className="cat-score warn">—</div>
              <div className="cat-desc">Answer Engine Optimization. Is your content structured to answer direct questions? Voice search, AI answer boxes, and featured snippets favor sites built for this.</div>
              <ul className="cat-checks">
                <li>FAQ schema and Q&A structure</li>
                <li>Direct answer blocks</li>
                <li>Entity clarity for AI models</li>
                <li>AI crawler access and llms.txt</li>
                <li>Structured Q&A content depth</li>
              </ul>
            </div>
            <div className="cat-card" style={{ borderColor: "var(--gold)" }}>
              <div className="our-edge">OUR EDGE</div>
              <div className="cat-label">Category 03</div>
              <div className="cat-name">GEO</div>
              <div className="cat-score good">—</div>
              <div className="cat-desc">Generative Engine Optimization. The newest and most overlooked category. Are ChatGPT, Gemini, Claude, and Perplexity finding and citing your site in their answers?</div>
              <ul className="cat-checks">
                <li>AI citation readiness</li>
                <li>Buyer-intent prompt coverage</li>
                <li>Extractable tables and answer blocks</li>
                <li>Entity context and proof signals</li>
                <li>Freshness signals for AI answers</li>
              </ul>
            </div>
            <div className="cat-card">
              <div className="cat-label">Category 04</div>
              <div className="cat-name">Security</div>
              <div className="cat-score crit">—</div>
              <div className="cat-desc">MITRE ATT&CK-mapped security findings. Security gaps do not just put your site at risk. They erode trust signals that directly affect your rankings.</div>
              <ul className="cat-checks">
                <li>HTTPS and valid SSL certificate</li>
                <li>CSP and HSTS headers</li>
                <li>Mixed content detection</li>
                <li>Server header exposure</li>
                <li>MITRE ATT&CK framework mapping</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* STRUCTURED ANSWER BLOCKS — definition-style, citation-ready */}
      <section id="definitions" className="how-section">
        <div className="section-inner">
          <div className="section-eyebrow">Definitions</div>
          <h2 className="section-headline">What each score actually means</h2>
          <p className="section-sub">Direct answers to the four questions every audit raises. Built so AI assistants can quote them cleanly.</p>
          <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18, margin: 0 }}>
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 24 }}>
              <dt style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--mid)", marginBottom: 10 }}>SEO — Search Engine Optimization</dt>
              <dd style={{ margin: 0 }}>
                <p style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.98rem", marginBottom: 8 }}>SEO is how well search engines like Google can crawl, understand, and rank your website.</p>
                <p style={{ color: "#4A6B54", fontSize: "0.86rem", lineHeight: 1.6 }}>Canopy Guard scores your title tags, meta descriptions, heading structure, canonical tags, and schema markup. Strong SEO is the foundation that makes every other visibility channel work. Most small business sites quietly lose traffic to fixable technical issues here.</p>
              </dd>
            </div>
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 24 }}>
              <dt style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--mid)", marginBottom: 10 }}>AEO — Answer Engine Optimization</dt>
              <dd style={{ margin: 0 }}>
                <p style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.98rem", marginBottom: 8 }}>AEO is how well your content is structured to be selected as the direct answer to a question.</p>
                <p style={{ color: "#4A6B54", fontSize: "0.86rem", lineHeight: 1.6 }}>It powers voice search, Google AI Overviews, and featured snippets. Canopy Guard checks your FAQ schema, question-and-answer density, and entity clarity. Sites built for AEO get quoted in the answer box; sites that are not get skipped entirely.</p>
              </dd>
            </div>
            <div style={{ background: "var(--white)", border: "1px solid var(--gold)", borderRadius: "var(--r-lg)", padding: 24 }}>
              <dt style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--gold-dim)", marginBottom: 10 }}>GEO — Generative Engine Optimization</dt>
              <dd style={{ margin: 0 }}>
                <p style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.98rem", marginBottom: 8 }}>GEO is how reliably generative AI assistants like ChatGPT, Gemini, and Perplexity can find and cite your site.</p>
                <p style={{ color: "#4A6B54", fontSize: "0.86rem", lineHeight: 1.6 }}>It depends on clean content chunking, citation-ready facts, and an llms.txt file. Canopy Guard scores chunking efficiency, citation precision, and AI-crawler access. It is the newest and most overlooked visibility gap in 2026.</p>
              </dd>
            </div>
            <div style={{ background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 24 }}>
              <dt style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--mid)", marginBottom: 10 }}>Security Posture</dt>
              <dd style={{ margin: 0 }}>
                <p style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.98rem", marginBottom: 8 }}>Security posture is the set of externally visible protections that signal your site is safe and trustworthy.</p>
                <p style={{ color: "#4A6B54", fontSize: "0.86rem", lineHeight: 1.6 }}>Canopy Guard checks HTTPS, security headers, mixed content, and server exposure, then maps each gap to MITRE ATT&CK. Weak security does not just invite attackers; it erodes the trust signals that directly affect your search rankings.</p>
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* RESULTS / CASES */}
      <section id="results" className="cases-section">
        <div className="section-inner">
          <div className="section-eyebrow">Real results</div>
          <h2 className="section-headline">What happens after the audit</h2>
          <p className="section-sub">Real sites. Real numbers. Canopy Guard found the gaps. The work changed their businesses.</p>
          <div className="cases-grid">
            <div className="case-card">
              <div className="case-header">
                <div className="case-industry">Local Services · Electrical</div>
                <div className="case-client">Local Electrician</div>
                <div className="case-location">Houston, TX · Local Search</div>
              </div>
              <div className="case-body">
                <img
                  src="/electrician-success.webp"
                  alt="Local electrician checking increased booking notifications after Canopy Guard SEO and AEO improvements by Adam McClarin CISSP Friendswood Texas"
                  width="900"
                  height="600"
                  loading="lazy"
                  style={{ width: "100%", height: "auto", display: "block", borderRadius: "var(--r-sm)", marginBottom: 16 }}
                />
                <div className="case-scores">
                  <div className="case-score"><div className="case-score-label">SEO</div><div className="before-after"><span className="score-before">33</span><span className="score-arrow">→</span><span className="score-after">94</span></div></div>
                  <div className="case-score"><div className="case-score-label">AEO</div><div className="before-after"><span className="score-before">6</span><span className="score-arrow">→</span><span className="score-after">91</span></div></div>
                  <div className="case-score"><div className="case-score-label">Security</div><div className="before-after"><span className="score-before">34</span><span className="score-arrow">→</span><span className="score-after">96</span></div></div>
                </div>
                <div className="case-result">"Adam audited my landing page and rebuilt it around the findings. Every score moved into the 90s. My bookings and calls from local search have increased."</div>
                <div className="case-tag">SEO + AEO + Security overhaul</div>
              </div>
            </div>
            <div className="case-card">
              <div className="case-header">
                <div className="case-industry">Healthcare · Professional Services</div>
                <div className="case-client">Medical Credentials Platform</div>
                <div className="case-location">Online · National Reach</div>
              </div>
              <div className="case-body">
                <div className="case-scores">
                  <div className="case-score"><div className="case-score-label">SEO</div><div className="before-after"><span className="score-before">Low</span><span className="score-arrow">→</span><span className="score-after">High</span></div></div>
                  <div className="case-score"><div className="case-score-label">AEO</div><div className="before-after"><span className="score-before">Low</span><span className="score-arrow">→</span><span className="score-after">High</span></div></div>
                  <div className="case-score"><div className="case-score-label">GEO</div><div className="before-after"><span className="score-before">Low</span><span className="score-arrow">→</span><span className="score-after">High</span></div></div>
                </div>
                <div className="case-result">"The week after Adam improved our AEO, SEO, and GEO scores, we received 4 inbound calls from people who said they found us through online search."</div>
                <div className="case-tag">AEO + GEO + SEO transformation</div>
              </div>
            </div>
            <div className="case-card">
              <div className="case-header">
                <div className="case-industry">Coaching · Wix Platform</div>
                <div className="case-client">Life Coach</div>
                <div className="case-location">Online Practice</div>
              </div>
              <div className="case-body">
                <div className="case-scores">
                  <div className="case-score"><div className="case-score-label">SEO</div><div className="before-after"><span className="score-before">Poor</span><span className="score-arrow">→</span><span className="score-after">Strong</span></div></div>
                  <div className="case-score"><div className="case-score-label">AEO</div><div className="before-after"><span className="score-before">Poor</span><span className="score-arrow">→</span><span className="score-after">Strong</span></div></div>
                  <div className="case-score"><div className="case-score-label">Visibility</div><div className="before-after"><span className="score-before">Poor</span><span className="score-arrow">→</span><span className="score-after">Strong</span></div></div>
                </div>
                <div className="case-result">"Adam used Canopy Guard as the foundation for a full site rebuild. He improved search presence across every category and embedded the findings directly into the site architecture."</div>
                <div className="case-tag">Full rebuild · Wix platform</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ADAM */}
      <section className="adam-section" id="adam">
        <div className="section-inner">
          <div className="adam-grid">
            <div className="adam-left">
              <div className="section-eyebrow">Who built this</div>
              <h2 className="section-headline">Not a SaaS company.<br />A practitioner with 20 years behind him.</h2>
              <p style={{ fontSize: "1rem", color: "#4A6B54", lineHeight: 1.7, marginBottom: 28 }}>Canopy Guard was built by someone who has spent two decades in cybersecurity, AI engineering, and software development. Every scoring category reflects real experience, not templates or guesswork.</p>
              <div className="adam-cred-grid">
                <div className="cred-card"><div className="cred-title">CISSP</div><div className="cred-body">Certified Information Systems Security Professional. One of the most rigorous credentials in cybersecurity. This is where the MITRE ATT&CK security scoring comes from.</div></div>
                <div className="cred-card"><div className="cred-title">Azure AI Engineer</div><div className="cred-body">Microsoft-certified. Designing and implementing AI solutions is not an afterthought here. It is how the GEO and AEO scoring was built.</div></div>
                <div className="cred-card"><div className="cred-title">Dual MS, Cybersecurity</div><div className="cred-body">Graduate-level security training. The depth behind the security score reflects years of academic and applied security work.</div></div>
                <div className="cred-card"><div className="cred-title">20+ Years in Tech</div><div className="cred-body">Software development, security services, AI engineering, and product building. Canopy Guard is the intersection of all of it.</div></div>
              </div>
              <img
                src="/practitioner-desk.webp"
                alt="Adam McClarin CISSP Azure AI Engineer Meraki is Love Soulful Tech home office Friendswood Texas site audit and implementation services"
                width="1040"
                height="693"
                loading="lazy"
                style={{ width: "100%", maxWidth: 520, height: "auto", display: "block", borderRadius: "var(--r-md)", marginTop: 24 }}
              />
            </div>
            <div className="adam-right">
              <div className="adam-name">Adam McClarin</div>
              <div className="adam-title-text">Founder, Meraki is Love (Soulful Tech™)<br />CISSP · Azure AI Engineer · Dual MS Cybersecurity</div>
              <div className="adam-quote">"I built Canopy Guard because I kept running audits for clients manually and finding the same gaps. The tool exists so you can see what I see, for free. If you need someone to fix it, I am here."</div>
              <div className="adam-bio">Adam works with small businesses, coaches, service providers, and healthcare platforms to improve their digital visibility and security. His approach starts with Canopy Guard because honest data makes honest conversations.</div>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-green">Book a call with Adam</a>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="pricing-section">
        <div className="section-inner">
          <div className="section-eyebrow" style={{ color: "var(--gold)" }}>Pricing</div>
          <h2 className="section-headline" style={{ color: "var(--tod)" }}>The audit is free.<br />The expertise is available.</h2>
          <p className="section-sub" style={{ color: "var(--todm)", marginBottom: 40 }}>See the full picture at no cost. If you want the work done, that is what I am here for.</p>
          <div className="pricing-grid">
            <div className="pricing-card">
              <div className="pricing-badge">ALWAYS FREE</div>
              <div className="pricing-name">Site Audit</div>
              <div className="pricing-price">$0</div>
              <div className="pricing-period">No account. No limit. No catch.</div>
              <ul className="pricing-features">
                <li>Full SEO score with specific findings</li>
                <li>AEO and GEO readiness scores</li>
                <li>MITRE ATT&CK-mapped security score</li>
                <li>Prioritized recommendations</li>
                <li>Downloadable full report</li>
                <li>57 sites already audited</li>
              </ul>
              <button className="btn-scan" style={{ width: "100%", padding: 14, borderRadius: "var(--r-sm)" }} onClick={scanOrFocus}>Scan My Site Free</button>
            </div>
            <div className="pricing-card featured">
              <div className="pricing-badge">HIRE ADAM</div>
              <div className="pricing-name" style={{ color: "var(--forest)" }}>Implementation Services</div>
              <div className="pricing-price" style={{ color: "var(--forest)" }}>Custom</div>
              <div className="pricing-period">Scoped per project. Canopy Guard customers save.</div>
              <ul className="pricing-features">
                <li>Full SEO and AEO implementation</li>
                <li>GEO optimization for AI search platforms</li>
                <li>Security hardening and header setup</li>
                <li>Schema markup and structured data</li>
                <li>Content strategy from audit findings</li>
                <li>Ongoing monitoring and rescans</li>
              </ul>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-green" style={{ display: "block", textAlign: "center", padding: 14, borderRadius: "var(--r-sm)" }}>Book a call</a>
              <div className="discount-note">Canopy Guard users receive a discount on all services. Mention your audit when you book.</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="faq-section">
        <div className="section-inner">
          <div className="section-eyebrow">FAQ</div>
          <h2 className="section-headline">Questions we hear most</h2>
          <p className="section-sub" style={{ marginBottom: 36 }}>Straight answers. No filler.</p>
          <div className="faq-grid">
            <div className="faq-item">
              <div className="faq-q">What is GEO and why does it matter?</div>
              <div className="faq-a">GEO stands for Generative Engine Optimization. It is the practice of making your site visible to AI assistants like ChatGPT, Gemini, Claude, and Perplexity. These are where a growing share of people now search for services. <strong>If your site is not structured for GEO, you are invisible to that traffic.</strong> Most audit tools do not score for this. Canopy Guard does.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">What is AEO?</div>
              <div className="faq-a">Answer Engine Optimization. It is the practice of structuring your content to directly answer questions. Voice search results, Google AI Overviews, and featured snippets all favor sites built for AEO. It overlaps with GEO but focuses on traditional answer engines and search result features rather than generative AI specifically.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">Does scanning my site affect its performance or SEO?</div>
              <div className="faq-a">No. Canopy Guard reads only publicly available information, the same data any search engine crawler sees. We do not touch your server, database, or code. Running a scan has zero impact on your site performance or rankings.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">What does MITRE ATT&CK mean for my website?</div>
              <div className="faq-a">MITRE ATT&CK is a globally recognized framework for understanding how attackers operate. For each security finding, <strong>Canopy Guard identifies the exposure condition associated with the relevant MITRE ATT&CK technique</strong>, so you get context for what the gap actually exposes you to, not just a number. This comes from Adam's CISSP background and 20 years in cybersecurity.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">What does the security scan actually check?</div>
              <div className="faq-a">Across nine security layers it covers TLS, DNS, HTTP headers, HTML vulnerabilities, and exposed paths, plus four expanded checks: <strong>malware and reputation</strong> (Google Safe Browsing and common blacklists, reported as Clean, Flagged, or Blacklisted); an <strong>expanded footprint</strong> (Subresource Integrity on scripts and stylesheets, Secure and HttpOnly cookie flags, full TLS cipher-suite enumeration with weak-cipher warnings, and certificate transparency log presence); <strong>DNS and email depth</strong> (exact SPF mechanisms and qualifier strength, DMARC policy of none, quarantine, or reject, and registrar lock with days until expiration — domains expiring within 60 days are flagged as a hijacking risk); and <strong>exposed sensitive file detection</strong> for paths like /.env, /.git/config, /wp-config.php.bak, /.aws/credentials, and /admin, where any publicly accessible path is reported as Critical. Every check is passive and read-only.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">My score is low. What do I do next?</div>
              <div className="faq-a">Your full report includes prioritized findings so you know exactly what to fix first. If you want to implement the recommendations yourself, the report gives you enough to work from. If you want it done for you, <a href={CALENDLY} target="_blank" rel="noopener noreferrer">book a call with Adam</a>. Canopy Guard customers receive a discount on all implementation services.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">How is this different from other SEO tools?</div>
              <div className="faq-a">Three things. First, GEO scoring is rare at this price point, which is free. Second, the security findings are mapped to MITRE ATT&CK, not flagged generically. Third, there is a real human behind this tool who can implement everything the audit finds. <strong>Most tools give you data. This one connects you to someone who fixes it.</strong></div>
            </div>
            <div className="faq-item">
              <div className="faq-q">Is my site data private?</div>
              <div className="faq-a">Yes. Canopy Guard only scans publicly available data, the same information any search engine sees. We do not store your site's private content, login credentials, or analytics. See our <Link to="/privacy">Privacy Policy</Link> for full details.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">Do I need an account to get my full report?</div>
              <div className="faq-a">No account required to run the scan. When you download your full report, basic contact information is collected so we can follow up if you have questions. That information is handled securely and never sold or shared with third parties.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">How does Canopy Guard compare to hiring an SEO agency?</div>
              <div className="faq-a">An agency charges a monthly retainer and often reports only on traditional SEO. Canopy Guard gives you the full picture for free across SEO, AEO, GEO, and security in 30 seconds, with findings mapped to MITRE ATT&CK. When you want the work implemented, you hire Adam directly. No retainer, no account managers, just the practitioner who built the tool.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">What does a good overall score look like, and what should I do if mine is low?</div>
              <div className="faq-a">Above 80 is strong, 50 to 80 means clear fixable gaps, and below 50 signals problems costing you visibility or trust right now. A low score is not a verdict, it is a roadmap. Your report ranks findings by impact so you fix what matters first, and Canopy Guard customers get a discount if you want it done for you.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">How often should I re-scan my site?</div>
              <div className="faq-a">Re-scan after any meaningful change: a redesign, new pages, a platform migration, or after applying fixes from a previous report. For an active site, a monthly scan catches regressions before they cost you traffic. Because the scan is free and takes 30 seconds, there is no reason to wait for a problem to show up in your analytics first.</div>
            </div>
            <div className="faq-item">
              <div className="faq-q">Which search engines and AI assistants does Canopy Guard check for?</div>
              <div className="faq-a">Canopy Guard evaluates your readiness for traditional search like Google and Bing, AI answer engines like Google AI Overviews and featured snippets, and generative assistants including ChatGPT, Gemini, Claude, and Perplexity. It inspects your structured data, llms.txt, crawler access, and content structure to estimate how each of those systems can find, parse, and cite your pages.</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2 className="cta-headline">Your site has gaps you do not know about yet.</h2>
        <p className="cta-sub">Free audit. Real findings. No account required. And if you need the work done, one call away.</p>
        <div className="cta-buttons">
          <button className="btn-gold" style={{ padding: "16px 36px", fontSize: "1rem" }} onClick={scanOrFocus}>Scan My Site Free</button>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: "16px 36px", fontSize: "1rem" }}>Book a call with Adam</a>
        </div>
      </section>

      {/* BLOG PREVIEW — three most recent articles */}
      <section className="how-section" style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="section-inner">
          <div className="section-eyebrow">From the blog</div>
          <h2 className="section-headline">Latest on AI search, SEO, and security</h2>
          <p className="section-sub">Practical guides from Adam McClarin, CISSP. The three most recent articles.</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            {POSTS.slice(0, 3).map((post) => (
              <div key={post.slug} style={{ display: "flex", flexDirection: "column", background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 24 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mid)", marginBottom: 12 }}>{post.date} · {post.readingTime}</div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: "1.15rem", color: "var(--forest)", marginBottom: 10, lineHeight: 1.25 }}>{post.title}</h3>
                <p style={{ fontSize: "0.86rem", color: "#5A7A62", lineHeight: 1.6, marginBottom: 16 }}>{post.description}</p>
                <Link to={`/blog/${post.slug}`} style={{ marginTop: "auto", fontSize: "0.8rem", fontWeight: 700, color: "var(--mid)" }}>Read More →</Link>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 24 }}>
            <Link to="/blog" className="btn-green">View all articles</Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-top">
            <div>
              <div className="footer-logo">Canopy<span>Guard</span></div>
              <div className="footer-tagline">Free site audit across SEO, AEO, GEO, and security. Built by a practitioner. Powered by 20 years of real work.</div>
              <div className="footer-powered">A Meraki is Love product · Soulful Tech™</div>
            </div>
            <div>
              <div className="footer-col-title">Product</div>
              <ul className="footer-links">
                <li><a href="#top">Free Audit</a></li>
                <li><a href="#geo">What is GEO</a></li>
                <li><a href="#how-it-works">How it works</a></li>
                <li><a href="#methodology">Methodology</a></li>
                <li><a href="#results">Client Results</a></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Compare</div>
              <ul className="footer-links">
                <li><Link to="/compare">vs VisRank</Link></li>
                <li><Link to="/compare">vs SEMrush</Link></li>
                <li><Link to="/compare">vs Ahrefs</Link></li>
                <li><Link to="/compare">vs Google Search Console</Link></li>
              </ul>
            </div>
            <div>
              <div className="footer-col-title">Adam</div>
              <ul className="footer-links">
                <li><a href="#adam">About</a></li>
                <li><a href="#pricing">Services</a></li>
                <li><a href="#faq">FAQ</a></li>
                <li><a href={CALENDLY} target="_blank" rel="noopener noreferrer">Book a call</a></li>
                <li><Link to="/privacy">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <div className="footer-copy">© 2026 Meraki is Love, LLC · Friendswood, Texas · All rights reserved</div>
            <div className="footer-bottom-links">
              <Link to="/privacy">Privacy</Link>
              <a href="#methodology">Methodology</a>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
