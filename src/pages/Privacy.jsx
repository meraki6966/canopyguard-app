import { Link } from "react-router-dom";
import "../home.css";

const DM_FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Mono:wght@400;700&display=swap";
const CALENDLY = "https://calendly.com/hello-merakislove/new-meeting";

// Standalone /privacy route — full privacy policy on its own page, styled with
// the shared cg-home design system.
export default function Privacy() {
  return (
    <div className="cg-home">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href={DM_FONTS} rel="stylesheet" />

      <nav>
        <Link to="/" className="nav-logo">Canopy<span>Guard</span></Link>
        <div className="nav-right">
          <Link to="/" className="nav-signin">Back to home</Link>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="btn-gold">Book a Call</a>
        </div>
      </nav>

      <section className="privacy-section">
        <div className="section-inner">
          <div className="section-eyebrow">Legal</div>
          <h1 className="section-headline" style={{ fontSize: "2.4rem", marginBottom: 28, color: "var(--forest)" }}>Privacy Policy</h1>
          <div className="privacy-block">
            <p>Canopy Guard is operated by Adam McClarin, founder of Meraki is Love, LLC (Soulful Tech™), based in Friendswood, Texas. This policy explains what data we collect, how we use it, and what we do not do with it.</p>
            <h3>What we scan</h3>
            <p>When you submit a URL, Canopy Guard reads only publicly available information, the same data any search engine crawler would see. We do not access your server files, database, analytics account, or any content behind a login.</p>
            <h3>What we collect when you download a report</h3>
            <ul>
              <li>Your name and email address</li>
              <li>The domain you submitted for audit</li>
              <li>Your audit scores and findings</li>
            </ul>
            <p>This information is stored securely in our lead management system. It is used to send your report and to follow up if you have questions about your findings.</p>
            <h3>What we do not do</h3>
            <ul>
              <li>We do not sell your data to third parties</li>
              <li>We do not share your information with advertisers</li>
              <li>We do not store passwords, private site content, or payment information</li>
              <li>We do not use cookies for advertising or cross-site tracking</li>
            </ul>
            <h3>Communication</h3>
            <p>If you download a report, you may receive a follow-up from Adam regarding your findings or available services. You can opt out at any time by replying to any email with "unsubscribe."</p>
            <h3>Security</h3>
            <p>We take reasonable precautions to protect the information we collect. Given Adam's CISSP background, this is not a checkbox. It is a standard we hold ourselves to.</p>
            <h3>Contact</h3>
            <p>Questions about this policy? Email <strong>hello@merakislove.com</strong> or <a href={CALENDLY} target="_blank" rel="noopener noreferrer" style={{ color: "var(--mid)" }}>book a call</a>.</p>
            <div className="privacy-date">Last updated: June 2026 · Meraki is Love, LLC · Friendswood, Texas</div>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-inner">
          <div className="footer-bottom" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="footer-copy">© 2026 Meraki is Love, LLC · Friendswood, Texas · All rights reserved</div>
            <div className="footer-bottom-links">
              <Link to="/">Home</Link>
              <a href={CALENDLY} target="_blank" rel="noopener noreferrer">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
