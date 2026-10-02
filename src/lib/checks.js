// The detail rows under SEO, AEO, GEO and Security, defined once. The report
// sections render these rows and the Gaps card counts them, so the card can
// never disagree with the badges on the page.
//
// A check row carries pass: true, false, or null. A metric row carries a raw
// value and a unit for the view to format. null always means not measured:
// the field was missing or null, or its whole category was not measured. It is
// never turned into a FAIL or a 0.

import { computeScores, CATEGORIES } from "./scores.js";

const bool = (v) => (typeof v === "boolean" ? v : null);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const count = (v) => (Array.isArray(v) ? v.length : null);

const check = (category, key, label, pass, snippet = null) => ({ kind: "check", category, key, label, labelKey: `dashboard.rows.${key}`, pass, snippet });
const metric = (category, key, label, value, unit) => ({ kind: "metric", category, key, label, labelKey: `dashboard.rows.${key}`, value, unit });

function buildRows(r) {
  const seo = r?.visibility_canopy?.seo_branch;
  const hs = seo?.html_structure;
  const aeo = r?.visibility_canopy?.aeo_branch;
  const sv = aeo?.schema_validation;
  const geo = r?.visibility_canopy?.geo_branch;
  const sec = r?.security_roots;
  const crawl = sec?.ai_crawl_risk;
  const app = sec?.application_security;
  const h1 = num(hs?.h1_count);
  const meta = bool(hs?.missing_meta_descriptions);
  const spoof = bool(crawl?.spoofed_agent_vulnerability);
  const llms = typeof geo?.llms_txt_status === "string" ? geo.llms_txt_status : null;
  // The whole title up to 70 characters, a little past the 60 a search result
  // shows. A longer one is cut with an ellipsis so the cut is visible.
  const rawTitle = typeof hs?.title === "string" ? hs.title.trim() : "";
  const title = rawTitle ? (rawTitle.length > 70 ? `${rawTitle.slice(0, 69).trimEnd()}…` : rawTitle) : null;

  return [
    check("seo", "crawlable", "Crawlable", bool(seo?.crawlability)),
    // Engine 3.4.3 and later report whether the page carries a noindex
    // directive. A report from an older engine has no such field, and gets no
    // row, since nothing was checked.
    ...(hs && "indexable" in hs ? [check("seo", "indexable", "Indexable", bool(hs.indexable))] : []),
    check("seo", "h1_tags", "H1 Tags", h1 === null ? null : h1 === 1, "h1"),
    check("seo", "meta_desc", "Meta Descriptions", meta === null ? null : !meta, "meta_desc"),
    check("seo", "canonical_match", "Canonical Match", bool(hs?.canonical_match), "canonical"),
    metric("seo", "link_depth", "Link Depth", num(seo?.internal_linking_depth), "clicks"),
    // Shown only when the page has a title, as before; a missing title is a
    // top action, not a row.
    ...(title ? [metric("seo", "page_title", "Page Title", title, "text")] : []),

    check("aeo", "faq_schema", "FAQ Schema", bool(sv?.has_faq_json_ld), "faq_schema"),
    check("aeo", "org_schema", "Org Schema", bool(sv?.has_organization_json_ld), "org_schema"),
    check("aeo", "any_json_ld", "Any JSON-LD", bool(sv?.has_any_json_ld)),
    metric("aeo", "validation_errors", "Validation Errors", count(sv?.validation_errors), "count"),
    metric("aeo", "qa_density", "Q&A Density", num(aeo?.qa_density_score), "pct"),

    metric("geo", "chunking_eff", "Chunking Efficiency", num(geo?.chunking_efficiency), "pct"),
    metric("geo", "citation_prec", "Citation Precision", num(geo?.citation_metrics?.precision_rate), "pct"),
    metric("geo", "market_share", "Market Share Gap", num(geo?.market_share_gap), "pct"),
    check("geo", "llms_txt", "llms.txt", llms === null ? null : llms === "PRESENT_ROOT", "llms_txt"),

    check("security", "tls_valid", "TLS Valid", bool(sec?.tls?.valid)),
    check("security", "hsts", "HSTS", bool(sec?.tls?.hsts)),
    check("security", "https_redirect", "HTTPS Redirect", bool(sec?.tls?.redirectsToHttps)),
    metric("security", "robots_policy", "Robots Policy", typeof crawl?.robots_policy === "string" ? crawl.robots_policy : null, "text"),
    check("security", "agent_spoofing", "Agent Spoofing", spoof === null ? null : !spoof),
    check("security", "rate_limiting", "Rate Limiting", bool(crawl?.rate_limiting_active)),
    metric("security", "exposed_endpoints", "Exposed Endpoints", count(app?.exposed_endpoints), "count"),
    metric("security", "missing_headers", "Missing Headers", count(app?.missing_secure_headers), "count"),
    metric("security", "known_cves", "Known CVEs", count(app?.vulnerabilities), "count"),
  ];
}

// Every row, in render order. In a category that was not measured, every row
// is not measured, whatever stale value the engine left in it.
export function getRows(report, scores = computeScores(report)) {
  return buildRows(report).map((row) =>
    scores.unmeasured.includes(row.category)
      ? { ...row, ...(row.kind === "check" ? { pass: null } : { value: null }) }
      : row
  );
}

export function getChecks(report, scores) {
  return getRows(report, scores)
    .filter((row) => row.kind === "check")
    .map(({ category, key, label, labelKey, pass, snippet }) => ({ category, key, label, labelKey, pass, snippet }));
}

// Not-measured checks are left out of both numbers.
export function summarizeGaps(checks) {
  const measured = checks.filter((c) => c.pass !== null);
  const byCategory = {};
  for (const c of CATEGORIES) {
    const inCat = measured.filter((m) => m.category === c);
    if (inCat.length) byCategory[c] = inCat.filter((m) => m.pass === false).length;
  }
  return { failing: measured.filter((c) => c.pass === false).length, total: measured.length, byCategory };
}

// Compliance quick check. pass is true, false, or null (not measured).
export function getComplianceChecks(report, scores = computeScores(report)) {
  const sec = report?.security_roots;
  const app = sec?.application_security;
  const policy = sec?.ai_crawl_risk?.robots_policy;
  const pageRead = !scores.unmeasured.includes("seo");
  const aeoRead = !scores.unmeasured.includes("aeo");
  const missingHeaders = count(app?.missing_secure_headers);
  const exposed = count(app?.exposed_endpoints);
  return [
    { key: "https_active", label: "HTTPS Active", pass: bool(sec?.tls?.valid) },
    // Read from the engine's own privacy-link check. Engines before 3.4 do not
    // report it, so on those it is not measured rather than failed.
    { key: "privacy_policy", label: "Privacy Policy", pass: pageRead ? bool(report?.visibility_canopy?.seo_branch?.has_privacy_link) : null },
    { key: "security_headers", label: "Security Headers", pass: missingHeaders === null ? null : missingHeaders <= 2 },
    { key: "no_exposed", label: "No Exposed Endpoints", pass: exposed === null ? null : exposed === 0 },
    { key: "structured_data", label: "Structured Data", pass: aeoRead ? bool(report?.visibility_canopy?.aeo_branch?.schema_validation?.has_any_json_ld) : null },
    { key: "ai_crawl", label: "AI Crawl Policy", pass: typeof policy === "string" ? policy === "BALANCED" || policy === "RESTRICTIVE" : null },
  ];
}
