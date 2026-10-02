// Top actions, ranked by impact over everything the scan returned.
//
// Tier 1 is broken or exposed right now, tier 2 is costing visibility or trust
// today, tier 3 is standard hardening and AI readiness. Candidates are listed
// in rank order within each tier. A candidate whose signal was not measured,
// or whose field is missing, is skipped: it never fires on a guess.
//
// Each candidate's fire() returns null, or the i18n key and parameters for
// one sentence saying what was found on this site. The view and the PDF both
// render those through t(), so the page and the PDF list the same actions.

import { computeScores } from "./scores.js";

const MAX_ACTIONS = 3;
const MAX_PER_CATEGORY = 2;
const VERSION_RE = /\d+\.\d+/;

const arr = (v) => (Array.isArray(v) ? v : []);
const isNum = (v) => typeof v === "number" && Number.isFinite(v);

// English defaults, passed to t() alongside the keys in src/locales/en.json.
const TITLES = {
  tls_problem: "Fix your TLS certificate",
  cert_expiring: "Renew your TLS certificate",
  homepage_error: "Get your homepage loading again",
  blocklisted: "Clear the blocklist or malware flag on your domain",
  exposed_files: "Remove exposed files from your web server",
  database_readable: "Lock down your database tables",
  subdomain_takeover: "Remove dangling subdomain records",
  vulnerable_library: "Update a vulnerable JavaScript library",
  dmarc: "Publish a DMARC record",
  spf: "Fix your SPF record",
  noindex: "Remove the noindex directive, unless it is on purpose",
  h1: "Add an H1 heading",
  title: "Add a page title",
  meta_desc: "Add a meta description",
  canonical: "Fix your canonical URL",
  admin_panel: "Restrict your admin login page",
  incomplete_chain: "Serve the full certificate chain",
  llms_txt: "Add an llms.txt file to your domain root",
  csp: "Add a Content-Security-Policy header",
  faq_schema: "Add FAQ schema markup",
  hsts: "Add a Strict-Transport-Security header",
  org_schema: "Add Organization schema markup",
  caa: "Add a CAA record",
  image_alt: "Add alt text to your images",
  version_disclosed: "Hide your software version",
};

const DESCS = {
  tls_problem_mismatch: "The TLS certificate served for {{domain}} does not match that name, so browsers show a security warning instead of your site.",
  tls_problem_expired: "The TLS certificate for {{domain}} has expired, so browsers block the site behind a security warning.",
  tls_problem_self_signed: "The TLS certificate for {{domain}} is self-signed, so browsers and crawlers do not trust it.",
  tls_problem_invalid: "The TLS certificate for {{domain}} failed validation, so browsers may warn visitors away from your site.",
  cert_expiring: "The TLS certificate for {{domain}} expires in {{days}} days, and browsers will block the site once it lapses.",
  cert_expiring_one: "The TLS certificate for {{domain}} expires in 1 day, and browsers will block the site once it lapses.",
  cert_expiring_today: "The TLS certificate for {{domain}} expires today, and browsers will block the site once it lapses.",
  cert_expired: "The TLS certificate for {{domain}} has expired, so browsers block the site behind a security warning.",
  homepage_error_http: "Your homepage at {{page}} returned HTTP {{status}} to our scanner, so visitors and search engines may see an error instead of your site.",
  homepage_error_http_nostatus: "Your homepage at {{page}} returned an HTTP error to our scanner, so visitors and search engines may see an error instead of your site.",
  homepage_error_hosting: "Your homepage at {{page}} shows a hosting provider's placeholder or error page instead of your site.",
  blocklisted_lists: "{{domain}} is listed on {{lists}}, so mail servers and browsers may treat it as unsafe.",
  blocklisted_flagged: "A malware or reputation check flagged {{domain}}, so browsers and mail servers may treat it as unsafe.",
  exposed_files: "{{n}} sensitive files on {{domain}} can be downloaded by anyone, including {{example}}.",
  exposed_files_one: "A sensitive file on {{domain}} can be downloaded by anyone: {{example}}.",
  exposed_files_noexample: "{{n}} sensitive files on {{domain}} can be downloaded by anyone.",
  database_readable: "{{n}} database tables behind {{domain}} return live rows to anyone without logging in.",
  database_readable_one: "1 database table behind {{domain}} returns live rows to anyone without logging in.",
  subdomain_takeover: "{{n}} subdomains of {{domain}} point at services that no longer exist, so someone else could claim them, starting with {{example}}.",
  subdomain_takeover_one: "The subdomain {{example}} points at a service that no longer exists, so someone else could claim it.",
  vulnerable_library: "{{page}} loads {{lib}} {{version}}, which has a known vulnerability ({{cve}}).",
  vulnerable_library_nocve: "{{page}} loads {{lib}} {{version}}, which has a known vulnerability.",
  dmarc: "No DMARC record for {{domain}}, so anyone can send email that looks like it came from you.",
  spf_missing: "No SPF record for {{domain}}, so mail servers cannot tell your real email from forgeries.",
  spf_pass_all: "The SPF record for {{domain}} ends in +all, which lets any server on the internet send email as you.",
  noindex_meta: "A robots meta tag on {{page}} says \"{{directive}}\", so search engines will leave the page out of their results. The SEO score is capped at 50 while it is in place. On a staging or demo page that is the right setting. On a page you want found, remove the tag.",
  noindex_header: "The X-Robots-Tag response header on {{page}} says \"{{directive}}\", so search engines will leave the page out of their results. The SEO score is capped at 50 while it is in place. On a staging or demo page that is the right setting. On a page you want found, remove the header.",
  h1: "The homepage of {{page}} has no H1 heading, so search engines have to guess what the page is about.",
  title: "The homepage of {{page}} has no title tag, so search results show whatever text the search engine picks.",
  meta_desc: "The homepage of {{page}} has no usable meta description, so search results show a snippet you did not choose.",
  canonical: "The canonical tag on {{page}} is missing or points to another address, so search engines may index the wrong URL.",
  admin_panel: "An admin login page on {{domain}} is open to the internet at {{example}}, so anyone can try passwords against it.",
  incomplete_chain: "The server for {{domain}} does not send its full certificate chain, so some phones, crawlers, and API clients refuse to connect.",
  llms_txt_missing: "{{domain}} has no llms.txt file, so AI engines get no guidance on how to cite your content.",
  llms_txt_malformed: "The llms.txt file on {{domain}} is too short to tell AI engines how to cite your content.",
  csp: "{{page}} sends no Content-Security-Policy header, so an injected script would run with nothing to stop it.",
  faq_schema: "The homepage of {{page}} has no FAQ schema, so answer engines have no marked-up questions to quote.",
  hsts: "{{page}} sends no Strict-Transport-Security header, so a browser can still be steered onto an insecure connection.",
  org_schema: "The homepage of {{page}} has no Organization schema, so AI engines cannot confirm who runs the site.",
  caa: "{{domain}} has no CAA record, so any certificate authority can issue a certificate for it.",
  image_alt: "{{missing}} of {{total}} images on the homepage have no alt text, so search engines and screen readers cannot describe them.",
  image_alt_one: "1 of {{total}} images on the homepage has no alt text, so search engines and screen readers cannot describe it.",
  version_disclosed: "{{page}} announces its software version ({{version}}), which tells attackers which known exploits to try.",
};

const say = (desc, params = {}) => ({ desc, params });

// Returns "mismatch" | "expired" | "self_signed" | "invalid" | null.
function tlsProblem(tls) {
  const status = tls?.status;
  if (status === "HOSTNAME_MISMATCH") return "mismatch";
  if (status === "EXPIRED") return "expired";
  if (status === "SELF_SIGNED") return "self_signed";
  // Engines before 3.4 report only valid, with status "INVALID" or absent.
  // INCOMPLETE_CHAIN is tier 2 and NOT_MEASURED is not a finding.
  if ((status === undefined || status === null || status === "INVALID") && tls?.valid === false) return "invalid";
  return null;
}

const CANDIDATES = [
  // ── Tier 1: broken or exposed right now ──
  { key: "tls_problem", tier: 1, category: "security", fix: null,
    fire: ({ r }) => { const p = tlsProblem(r?.security_roots?.tls); return p ? say(`tls_problem_${p}`) : null; } },
  { key: "cert_expiring", tier: 1, category: "security", fix: null,
    fire: ({ se, fired }) => {
      const days = se?.tls?.cert_expiry_days;
      if (!isNum(days) || days >= 14) return null;
      if (days < 0) return fired.has("tls_problem") ? null : say("cert_expired");
      if (days === 0) return say("cert_expiring_today");
      return days === 1 ? say("cert_expiring_one") : say("cert_expiring", { days });
    } },
  // Security rather than SEO: whenever this fires SEO, AEO and GEO are not
  // measured, and a site that does not serve is an availability failure.
  { key: "homepage_error", tier: 1, category: "security", fix: null,
    fire: ({ r }) => {
      const fs = r?.fetch_status;
      if (fs?.error_class === "hosting_error_page") return say("homepage_error_hosting");
      if (fs?.error_class !== "http_error") return null;
      return isNum(fs.http_status) ? say("homepage_error_http", { status: fs.http_status }) : say("homepage_error_http_nostatus");
    } },
  // UNKNOWN is a reputation check that could not decide, not a finding.
  { key: "blocklisted", tier: 1, category: "security", fix: null,
    fire: ({ se }) => {
      const rep = se?.reputation;
      const lists = arr(rep?.blacklists?.listed_on);
      if (lists.length) return say("blocklisted_lists", { lists: lists.join(", ") });
      return rep?.status === "FLAGGED" || rep?.status === "BLACKLISTED" ? say("blocklisted_flagged") : null;
    } },
  { key: "exposed_files", tier: 1, category: "security", fix: null,
    fire: ({ se }) => {
      const sf = se?.sensitive_files;
      const sfCount = isNum(sf?.accessible_count) && sf.accessible_count > 0 ? sf.accessible_count : 0;
      const paths = se?.paths;
      const probed = [...arr(paths?.developer_files_exposed), ...arr(paths?.backup_files_exposed), ...arr(paths?.source_maps_exposed)];
      const listed = sfCount ? arr(sf.findings).map((f) => f?.path).filter(Boolean) : [];
      const found = [...new Set([...listed, ...probed])];
      // A count the engine reported without listing every path still counts.
      const total = found.length + Math.max(0, sfCount - listed.length);
      if (total === 0) return null;
      if (!found.length) return say("exposed_files_noexample", { n: total });
      return total === 1 ? say("exposed_files_one", { example: found[0] }) : say("exposed_files", { n: total, example: found[0] });
    } },
  { key: "database_readable", tier: 1, category: "security", fix: null,
    fire: ({ se }) => {
      const n = se?.supabase_exposure?.accessible_count;
      if (!isNum(n) || n <= 0) return null;
      return n === 1 ? say("database_readable_one") : say("database_readable", { n });
    } },
  { key: "subdomain_takeover", tier: 1, category: "security", fix: null,
    fire: ({ se }) => {
      const subs = arr(se?.dns?.subdomain_takeover_risk);
      if (!subs.length) return null;
      return subs.length === 1 ? say("subdomain_takeover_one", { example: subs[0] }) : say("subdomain_takeover", { n: subs.length, example: subs[0] });
    } },
  { key: "vulnerable_library", tier: 1, category: "security", fix: null,
    fire: ({ se }) => {
      const lib = arr(se?.html?.vulnerable_libraries).find((l) => l?.lib);
      if (!lib) return null;
      const params = { lib: lib.lib, version: lib.version || "" };
      return lib.cve ? say("vulnerable_library", { ...params, cve: lib.cve }) : say("vulnerable_library_nocve", params);
    } },

  // ── Tier 2: costing visibility or trust today ──
  // DNS and email are measured without the homepage, so they stand even when
  // the page could not be read. domain_email is the deeper check; dns is the
  // fallback for reports that lack it.
  { key: "dmarc", tier: 2, category: "security", fix: "dmarc",
    fire: ({ se }) => {
      const d = se?.domain_email?.dmarc;
      if (d && (typeof d.present === "boolean" || typeof d.policy === "string")) return d.present === false || d.policy === "absent" ? say("dmarc") : null;
      return se?.dns?.dmarc_policy === "absent" ? say("dmarc") : null;
    } },
  { key: "spf", tier: 2, category: "security", fix: "spf",
    fire: ({ se }) => {
      const s = se?.domain_email?.spf;
      if (s && typeof s.present === "boolean") {
        if (!s.present) return say("spf_missing");
        return s.all_qualifier === "pass" ? say("spf_pass_all") : null;
      }
      const policy = se?.dns?.spf_policy;
      if (policy === "absent") return say("spf_missing");
      return policy === "pass_all" ? say("spf_pass_all") : null;
    } },
  { key: "noindex", tier: 2, category: "seo", fix: null,
    fire: ({ hs }) => (hs?.indexable === false
      ? say(hs.noindex_source === "header" ? "noindex_header" : "noindex_meta", { directive: typeof hs.robots_directive === "string" ? hs.robots_directive : "noindex" })
      : null) },
  { key: "h1", tier: 2, category: "seo", fix: "h1",
    fire: ({ hs }) => (hs?.h1_count === 0 ? say("h1") : null) },
  { key: "title", tier: 2, category: "seo", fix: null,
    fire: ({ hs }) => (hs && (hs.title === null || (typeof hs.title === "string" && !hs.title.trim())) ? say("title") : null) },
  { key: "meta_desc", tier: 2, category: "seo", fix: "meta_desc",
    fire: ({ hs }) => (hs?.missing_meta_descriptions === true ? say("meta_desc") : null) },
  { key: "canonical", tier: 2, category: "seo", fix: "canonical",
    fire: ({ hs }) => (hs?.canonical_match === false ? say("canonical") : null) },
  { key: "admin_panel", tier: 2, category: "security", fix: null,
    fire: ({ se }) => { const p = arr(se?.paths?.cms_panels_exposed); return p.length ? say("admin_panel", { example: p[0] }) : null; } },
  { key: "incomplete_chain", tier: 2, category: "security", fix: null,
    fire: ({ r }) => (r?.security_roots?.tls?.status === "INCOMPLETE_CHAIN" ? say("incomplete_chain") : null) },

  // ── Tier 3: standard hardening and AI readiness ──
  { key: "llms_txt", tier: 3, category: "geo", fix: "llms_txt",
    fire: ({ r }) => {
      const st = r?.visibility_canopy?.geo_branch?.llms_txt_status;
      if (st === "MISSING") return say("llms_txt_missing");
      return st === "MALFORMED" ? say("llms_txt_malformed") : null;
    } },
  { key: "csp", tier: 3, category: "security", fix: "csp",
    fire: ({ r }) => (arr(r?.security_roots?.application_security?.missing_secure_headers).includes("Content-Security-Policy") ? say("csp") : null) },
  { key: "faq_schema", tier: 3, category: "aeo", fix: "faq_schema",
    fire: ({ sv }) => (sv?.has_faq_json_ld === false ? say("faq_schema") : null) },
  { key: "hsts", tier: 3, category: "security", fix: "hsts",
    fire: ({ r }) => {
      const hsts = r?.security_roots?.tls?.hsts;
      if (typeof hsts === "boolean") return hsts ? null : say("hsts");
      return arr(r?.security_roots?.application_security?.missing_secure_headers).includes("Strict-Transport-Security") ? say("hsts") : null;
    } },
  { key: "org_schema", tier: 3, category: "aeo", fix: "org_schema",
    fire: ({ sv }) => (sv?.has_organization_json_ld === false ? say("org_schema") : null) },
  { key: "caa", tier: 3, category: "security", fix: "caa",
    fire: ({ se }) => (se?.dns?.caa_present === false ? say("caa") : null) },
  { key: "image_alt", tier: 3, category: "seo", fix: null,
    fire: ({ hs }) => {
      const missing = hs?.images_missing_alt, total = hs?.image_count;
      if (!isNum(missing) || !isNum(total) || missing <= 0 || total <= 0) return null;
      return missing === 1 ? say("image_alt_one", { total }) : say("image_alt", { missing, total });
    } },
  // Only a header or generator that carries a version number counts. A bare
  // "cloudflare" or "nginx" tells an attacker nothing they can look up.
  { key: "version_disclosed", tier: 3, category: "security", fix: null,
    fire: ({ se }) => {
      const server = se?.http?.server_header_value;
      if (typeof server === "string" && VERSION_RE.test(server)) return say("version_disclosed", { version: server });
      const gen = se?.html?.generator_disclosure;
      return typeof gen === "string" && VERSION_RE.test(gen) ? say("version_disclosed", { version: gen }) : null;
    } },
];

// Every candidate that fires on this report, in rank order.
export function rankActions(report, scores = computeScores(report)) {
  const vc = report?.visibility_canopy;
  const ctx = {
    r: report,
    se: report?.security_enhanced,
    // A content field is only read when its category was measured, so the
    // zeroed fields an older engine leaves behind never become findings.
    hs: scores.unmeasured.includes("seo") ? null : vc?.seo_branch?.html_structure,
    sv: scores.unmeasured.includes("aeo") ? null : vc?.aeo_branch?.schema_validation,
    fired: new Set(),
  };
  // target_domain is the host plus any page path the visitor typed. Findings
  // about the domain (DNS, email, TLS, certificates, files at the root) name
  // the host; findings about the page that was read name the page. For a bare
  // domain the two are the same.
  const page = report?.target_domain || "your site";
  const domain = report?.target_domain ? report.target_domain.split("/")[0] : "your site";
  const out = [];
  for (const c of CANDIDATES) {
    if (c.category !== "security" && scores.unmeasured.includes(c.category)) continue;
    const hit = c.fire(ctx);
    if (!hit) continue;
    ctx.fired.add(c.key);
    out.push({
      key: c.key,
      tier: c.tier,
      category: c.category,
      fixKey: c.fix,
      titleKey: `dashboard.actions.${c.key}_title`,
      title: TITLES[c.key],
      descKey: `dashboard.actions.${hit.desc}_desc`,
      desc: DESCS[hit.desc],
      params: { domain, page, ...hit.params },
    });
  }
  // CANDIDATES is already in tier order; the stable sort keeps it honest if
  // someone adds a candidate out of place.
  return out.sort((a, b) => a.tier - b.tier);
}

export function getTopActions(report, scores = computeScores(report)) {
  const picked = [];
  const perCategory = {};
  for (const a of rankActions(report, scores)) {
    if ((perCategory[a.category] || 0) >= MAX_PER_CATEGORY) continue;
    perCategory[a.category] = (perCategory[a.category] || 0) + 1;
    picked.push(a);
    if (picked.length === MAX_ACTIONS) break;
  }
  return picked;
}

// The defaults are exported so a test can hold them equal to en.json.
export { TITLES as ACTION_TITLES, DESCS as ACTION_DESCS };

// Title and one-sentence description, through i18n with the English default.
export function actionText(action, t) {
  return {
    title: t(action.titleKey, { defaultValue: action.title }),
    desc: t(action.descKey, { defaultValue: action.desc, ...action.params }),
  };
}
