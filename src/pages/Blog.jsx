import { useEffect } from "react";
import { Link } from "react-router-dom";
import { POSTS } from "../blog/posts";
import "../home.css";

const DM_FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Mono:wght@400;700&display=swap";
const CALENDLY = "https://calendly.com/hello-merakislove/new-meeting";

// Blog index — lists all articles. Styled with the shared cg-home design system.
export default function Blog() {
  useEffect(() => { document.title = "Blog | Canopy Guard"; }, []);

  return (
    <div className="cg-home">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={DM_FONTS} rel="stylesheet" />

      <nav>
        <Link to="/" className="nav-logo">Canopy<span>Guard</span></Link>
        <div className="nav-right">
          <Link to="/" className="nav-signin">Free Audit</Link>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-gold">Book a Call</a>
        </div>
      </nav>

      <section className="how-section" style={{ paddingTop: 72 }}>
        <div className="section-inner">
          <div className="section-eyebrow">Blog</div>
          <h1 className="section-headline" style={{ color: "var(--forest)" }}>The Canopy Guard Blog</h1>
          <p className="section-sub">Practical, no-fluff guides on SEO, AEO, GEO, and website security from Adam McClarin, CISSP. Built for the people who actually have to ship the fixes.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {POSTS.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                style={{ display: "flex", flexDirection: "column", background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", padding: 24, transition: "border-color 0.15s" }}
              >
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.66rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--mid)", marginBottom: 12 }}>{post.readingTime}</div>
                <h2 style={{ fontSize: "1.2rem", color: "var(--forest)", marginBottom: 10, lineHeight: 1.25 }}>{post.title}</h2>
                <p style={{ fontSize: "0.86rem", color: "#5A7A62", lineHeight: 1.6, margin: 0 }}>{post.description}</p>
                <span style={{ marginTop: 16, fontSize: "0.8rem", fontWeight: 700, color: "var(--mid)" }}>Read article →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section" style={{ padding: "80px 48px" }}>
        <h2 className="cta-headline">Stop guessing. Get your scores.</h2>
        <p className="cta-sub">Free audit across SEO, AEO, GEO, and security. Real findings in 30 seconds. No account required.</p>
        <div className="cta-buttons">
          <Link to="/" className="btn-gold" style={{ padding: "16px 36px", fontSize: "1rem" }}>Run your free scan</Link>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: "16px 36px", fontSize: "1rem" }}>Book a call with Adam</a>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-bottom" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="footer-copy">© 2026 Meraki is Love, LLC · Friendswood, Texas · All rights reserved</div>
            <div className="footer-bottom-links">
              <Link to="/">Home</Link>
              <Link to="/privacy">Privacy</Link>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
