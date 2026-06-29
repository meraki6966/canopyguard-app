import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { POSTS } from "../blog/posts";
import "../home.css";

const DM_FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Mono:wght@400;700&display=swap";
const CALENDLY = "https://calendly.com/hello-merakislove/new-meeting";
const SITE = "https://thecanopyguard.com";

// Primary topic keywords per article (used in BlogPosting schema).
const KEYWORDS = {
  "ai-citations-not-from-page-one": "AI citations, Google AI Overviews, AEO, GEO, domain authority, small business SEO",
  "javascript-kills-ai-visibility": "JavaScript SEO, AI crawlers, server-side rendering, prerendering, GEO, page speed",
  "query-fan-out-zero-search-volume": "query fan-out, AI search, entity hub, GEO citation precision, keyword research",
  "security-headers-hurt-your-seo": "security headers, HSTS, CSP, X-Frame-Options, MITRE ATT&CK, SEO trust signals",
  "chatgpt-trust-cliff": "ChatGPT citations, referring domains, AEO, content structure, direct answer blocks",
  "local-business-chatgpt-1-percent": "local SEO, ChatGPT, Gemini, Perplexity, LocalBusiness schema, AEO",
  "share-of-model-new-metric": "Share of Model, zero-click search, GEO, AI citation metric, generative engine optimization",
  "ghost-citations-ai-uses-your-content": "ghost citations, AI attribution, citation precision, GEO, Bing Copilot",
  "dmarc-spf-dkim-explained": "DMARC, SPF, DKIM, email authentication, DNS security, MITRE ATT&CK",
  "website-as-api-2027": "agentic web, AI agents, machine-readable web, schema markup, structured data",
  "what-is-geo-optimization": "GEO, generative engine optimization, AI search, ChatGPT citations, llms.txt",
  "what-is-aeo": "AEO, answer engine optimization, featured snippets, voice search, FAQ schema",
  "mitre-attack-for-websites": "MITRE ATT&CK, website security, security headers, attacker techniques",
  "invisible-to-chatgpt": "ChatGPT visibility, AI crawlers, robots.txt, llms.txt, GEO, structured data",
  "how-to-check-ai-can-find-your-business": "AI visibility check, ChatGPT, Gemini, Perplexity, local business",
  "seo-vs-aeo-vs-geo": "SEO vs AEO vs GEO, search optimization, answer engines, generative engines",
  "security-headers-your-website-needs": "security headers, CSP, HSTS, X-Frame-Options, website security",
  "electrician-case-study": "local SEO case study, AEO, electrician, schema markup, Houston Texas",
};

// Renders a single blog article by slug, with Article + FAQPage JSON-LD and
// internal links to the free scan and the Calendly booking link.
export default function BlogPost() {
  const { slug } = useParams();
  const post = POSTS.find((p) => p.slug === slug);

  useEffect(() => {
    if (post) document.title = `${post.title} | Canopy Guard Blog`;
  }, [post]);

  if (!post) {
    return (
      <div className="cg-home">
        <link href={DM_FONTS} rel="stylesheet" />
        <nav>
          <Link to="/" className="nav-logo">Canopy<span>Guard</span></Link>
          <div className="nav-right"><Link to="/blog" className="nav-signin">All articles</Link></div>
        </nav>
        <section className="how-section">
          <div className="section-inner">
            <h1 className="section-headline">Article not found</h1>
            <p className="section-sub">That article does not exist. <Link to="/blog" style={{ color: "var(--mid)", textDecoration: "underline" }}>Browse all articles</Link>.</p>
          </div>
        </section>
      </div>
    );
  }

  const url = `${SITE}/blog/${post.slug}`;
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: post.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url,
    mainEntityOfPage: url,
    datePublished: post.date,
    author: {
      "@type": "Person",
      name: "Adam McClarin",
      jobTitle: "CISSP, Azure AI Engineer, Founder of Meraki is Love",
      url: "https://thecanopyguard.com",
      sameAs: [
        "https://www.linkedin.com/in/adammcclarin",
        "https://merakislove.com",
      ],
    },
    publisher: { "@type": "Organization", name: "Canopy Guard", url: "https://thecanopyguard.com" },
    locationCreated: "Friendswood, Texas",
    inLanguage: "en-US",
    keywords: KEYWORDS[post.slug] || post.title,
  };

  return (
    <div className="cg-home">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={DM_FONTS} rel="stylesheet" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />

      <nav>
        <Link to="/" className="nav-logo">Canopy<span>Guard</span></Link>
        <div className="nav-right">
          <Link to="/blog" className="nav-signin">All articles</Link>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-gold">Book a Call</a>
        </div>
      </nav>

      <article className="how-section" style={{ paddingTop: 72 }}>
        <div className="section-inner" style={{ maxWidth: 760 }}>
          <div className="section-eyebrow"><Link to="/blog" style={{ color: "var(--mid)" }}>Blog</Link> · {post.readingTime}{post.date ? ` · ${post.date}` : ""}</div>
          <h1 className="section-headline" style={{ color: "var(--forest)", marginBottom: 10 }}>{post.title}</h1>
          <p style={{ fontSize: "0.85rem", color: "var(--mid)", fontWeight: 600, marginBottom: 24 }}>By Adam McClarin, CISSP · Meraki is Love (Soulful Tech) · Friendswood, Texas</p>

          {post.sections.map((sec, i) => (
            <section key={i} style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: "1.5rem", color: "var(--forest)", marginBottom: 12 }}>{sec.h2}</h2>
              {sec.capsule && (
                <p style={{ fontSize: "1.05rem", fontWeight: 600, color: "var(--forest)", background: "var(--sage)", borderLeft: "3px solid var(--gold)", padding: "12px 16px", borderRadius: "0 var(--r-sm) var(--r-sm) 0", marginBottom: 14, lineHeight: 1.6 }}>{sec.capsule}</p>
              )}
              {sec.paragraphs.map((p, j) => (
                <p key={j} style={{ fontSize: "1.02rem", color: "#3D5A48", lineHeight: 1.8, marginBottom: 14 }}>{p}</p>
              ))}
            </section>
          ))}

          {/* Inline CTA — internal link to the free scan */}
          <div style={{ background: "var(--sage)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: "24px 26px", margin: "8px 0 36px" }}>
            <p style={{ fontSize: "1rem", color: "var(--forest)", fontWeight: 600, marginBottom: 14 }}>See where your own site stands across SEO, AEO, GEO, and security in about 30 seconds.</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link to="/" className="btn-gold">Run your free scan</Link>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-green">Book a call with Adam</a>
            </div>
          </div>

          {post.faqs.length > 0 && (
            <section style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: "1.5rem", color: "var(--forest)", marginBottom: 16 }}>Frequently asked questions</h2>
              {post.faqs.map((f, i) => (
                <div key={i} style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 700, color: "var(--forest)", fontSize: "0.98rem", marginBottom: 6 }}>{f.q}</div>
                  <div style={{ fontSize: "0.9rem", color: "#5A7A62", lineHeight: 1.7 }}>{f.a}</div>
                </div>
              ))}
            </section>
          )}

          <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <Link to="/blog" style={{ color: "var(--mid)", fontWeight: 600 }}>← All articles</Link>
            <Link to="/" style={{ color: "var(--mid)", fontWeight: 600 }}>Run a free audit →</Link>
          </div>
        </div>
      </article>

      <footer>
        <div className="footer-inner">
          <div className="footer-bottom" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="footer-copy">© 2026 Meraki is Love, LLC · Friendswood, Texas · All rights reserved</div>
            <div className="footer-bottom-links">
              <Link to="/">Home</Link>
              <Link to="/blog">Blog</Link>
              <Link to="/privacy">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
