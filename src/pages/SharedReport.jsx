import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import CanopyGuard from "../App.jsx";
import { API } from "../lib/api";
import { fetchSharedReport } from "../lib/share";
import "../home.css";

const DM_FONTS =
  "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Space+Mono:wght@400;700&display=swap";

// Sets a <meta name> for as long as the page is mounted, then puts back what
// was there. The prerendered shell already carries the site-wide robots tag,
// so that one is overwritten in place rather than joined by a second,
// conflicting tag.
function setMeta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`);
  const created = !el;
  if (created) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  const previous = el.getAttribute("content");
  el.setAttribute("content", content);
  return () => {
    if (created) el.remove();
    else el.setAttribute("content", previous);
  };
}

function Notice({ text, homeLink = true }) {
  const { t } = useTranslation();
  return (
    <div className="cg-home">
      <link href={DM_FONTS} rel="stylesheet" />
      <nav>
        <Link to="/" className="nav-logo">Canopy <span>Guard</span></Link>
      </nav>
      <section className="privacy-section">
        <div className="section-inner">
          <div className="privacy-block">
            <p role="status" data-testid="shared-report-notice">{text}</p>
            {homeLink && <p><Link to="/" style={{ color: "var(--mid)" }}>{t("share.back_home")}</Link></p>}
          </div>
        </div>
      </section>
    </div>
  );
}

// /r/:token. Prerendered once as a shell in its loading state, which carries
// nothing token-specific, so the client hydrates it for any token and then
// fetches the stored report.
export default function SharedReport() {
  const { token } = useParams();
  const { t } = useTranslation();
  // Keyed by token, so a result for one token never renders under another.
  const [settled, setSettled] = useState({ token: null, status: "loading" });
  const result = settled.token === token ? settled : { status: "loading" };

  // Declared before the fetch so the no-referrer policy is in place first.
  useEffect(() => {
    const undo = [setMeta("robots", "noindex, nofollow"), setMeta("referrer", "no-referrer")];
    return () => undo.forEach((f) => f());
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchSharedReport(API, token, { signal: ctrl.signal })
      .then((r) => setSettled({ ...r, token }))
      .catch(() => { if (!ctrl.signal.aborted) setSettled({ token, status: "unavailable" }); });
    return () => ctrl.abort();
  }, [token]);

  if (result.status === "ok") return <CanopyGuard initialReport={result.report} />;
  if (result.status === "not_found") return <CanopyGuard initialNotice={t("share.not_found")} />;
  if (result.status === "rate_limited") return <Notice text={t("share.rate_limited")} />;
  if (result.status === "unavailable") return <Notice text={t("share.unavailable")} />;
  return <Notice text={t("share.loading")} homeLink={false} />;
}
