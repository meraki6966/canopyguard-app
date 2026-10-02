import { describe, it, expect } from "vitest";
import { getTopActions, rankActions, ACTION_TITLES, ACTION_DESCS } from "../topActions.js";
import en from "../../locales/en.json";
import measured from "../__fixtures__/current-engine-measured.json";
import tlsMismatch from "../__fixtures__/tls-mismatch-no-dmarc.json";
import exposedBackups from "../__fixtures__/exposed-backups-no-h1.json";
import legacyUnmeasured from "../__fixtures__/current-engine-unmeasured.json";
import newUnmeasured from "../__fixtures__/new-engine-unmeasured.json";

const ALL = { measured, tlsMismatch, exposedBackups, legacyUnmeasured, newUnmeasured };
const keys = (report) => getTopActions(report).map((a) => a.key);

// Every candidate firing at once, so the category cap has something to cap.
function everythingBroken() {
  const r = structuredClone(measured);
  r.security_roots.tls = { valid: false, hsts: false, hstsMaxAge: 0, redirectsToHttps: true, status: "EXPIRED" };
  r.security_enhanced.reputation.blacklists.listed_on = ["bl.example.net"];
  r.security_enhanced.sensitive_files = { ...r.security_enhanced.sensitive_files, accessible_count: 1, findings: [{ path: "/.env" }] };
  r.security_enhanced.supabase_exposure = { ...r.security_enhanced.supabase_exposure, accessible_count: 2, accessible_tables: ["profiles", "orders"] };
  r.security_enhanced.dns.subdomain_takeover_risk = ["shop.example.com"];
  r.visibility_canopy.seo_branch.html_structure.h1_count = 0;
  r.visibility_canopy.seo_branch.html_structure.title = null;
  r.visibility_canopy.seo_branch.html_structure.missing_meta_descriptions = true;
  r.visibility_canopy.seo_branch.html_structure.canonical_match = false;
  return r;
}

describe("getTopActions", () => {
  it("gives fixtures 1, 2 and 3 three different first actions", () => {
    const firsts = [measured, tlsMismatch, exposedBackups].map((f) => keys(f)[0]);
    expect(firsts).toEqual(["llms_txt", "tls_problem", "exposed_files"]);
    expect(new Set(firsts).size).toBe(3);
  });

  it("leads fixture 2 with the certificate, described as a hostname mismatch", () => {
    const [first] = getTopActions(tlsMismatch);
    expect(first.key).toBe("tls_problem");
    expect(first.tier).toBe(1);
    expect(first.descKey).toBe("dashboard.actions.tls_problem_mismatch_desc");
    expect(first.params.domain).toBe("example.com");
  });

  it("ranks fixture 2 as certificate, then DMARC, then the first non-security action", () => {
    expect(keys(tlsMismatch)).toEqual(["tls_problem", "dmarc", "llms_txt"]);
  });

  it("describes what was found on the site, not a generic benefit", () => {
    const [first] = getTopActions(exposedBackups);
    expect(first.params).toMatchObject({ domain: "example.com", n: 2, example: "/backup.zip" });
  });

  it("never returns more than 2 actions from one category", () => {
    const broken = everythingBroken();
    // Positive control: the cap only means something if more than two
    // security candidates actually fired.
    expect(rankActions(broken).filter((a) => a.category === "security").length).toBeGreaterThan(2);
    for (const [name, fx] of Object.entries({ ...ALL, broken })) {
      const counts = {};
      for (const a of getTopActions(fx)) counts[a.category] = (counts[a.category] || 0) + 1;
      for (const [cat, n] of Object.entries(counts)) expect(n, `${name} ${cat}`).toBeLessThanOrEqual(2);
      expect(getTopActions(fx).length, name).toBeLessThanOrEqual(3);
    }
    expect(keys(broken)).toEqual(["tls_problem", "blocklisted", "h1"]);
  });

  it("produces no SEO, AEO or GEO actions for fixture 5, and still reports what was measured", () => {
    const actions = getTopActions(newUnmeasured);
    expect(actions.filter((a) => a.category !== "security")).toEqual([]);
    // Positive control: DNS and email were measured without the page, so an
    // empty list here would mean the filter dropped everything, not that it worked.
    expect(actions.map((a) => a.key)).toEqual(["dmarc", "caa"]);
  });

  it("produces no SEO, AEO or GEO actions for the current engine's unreadable-page shape", () => {
    // Fixture 4 carries h1_count 0, missing meta, no FAQ and no llms.txt, all
    // artefacts of an empty page. None may become an action.
    const ranked = rankActions(legacyUnmeasured);
    expect(ranked.filter((a) => a.category !== "security")).toEqual([]);
    expect(ranked.length).toBeGreaterThan(0);
  });

  it("uses tls.valid === false on the current engine shape", () => {
    const r = structuredClone(measured);
    r.security_roots.tls = { ...r.security_roots.tls, valid: false, status: "INVALID" };
    const [first] = getTopActions(r);
    expect(first.key).toBe("tls_problem");
    expect(first.descKey).toBe("dashboard.actions.tls_problem_invalid_desc");
  });

  it("treats an incomplete chain as tier 2, not as a broken certificate", () => {
    const r = structuredClone(tlsMismatch);
    r.security_roots.tls.status = "INCOMPLETE_CHAIN";
    const ranked = rankActions(r).map((a) => a.key);
    expect(ranked).not.toContain("tls_problem");
    expect(ranked).toContain("incomplete_chain");
  });

  it("does not fire on an unmeasured TLS status", () => {
    const r = structuredClone(tlsMismatch);
    r.security_roots.tls = { ...r.security_roots.tls, valid: null, status: "NOT_MEASURED" };
    expect(rankActions(r).map((a) => a.key)).not.toContain("tls_problem");
  });

  it("does not treat an UNKNOWN reputation verdict as a blocklisting", () => {
    const r = structuredClone(measured);
    r.security_enhanced.reputation.status = "UNKNOWN";
    expect(rankActions(r).map((a) => a.key)).not.toContain("blocklisted");
    r.security_enhanced.reputation.status = "BLACKLISTED";
    expect(rankActions(r).map((a) => a.key)).toContain("blocklisted");
  });

  it("flags a server version only when the header carries one", () => {
    // Fixture 1 sends "Server: cloudflare", which names no version.
    expect(rankActions(measured).map((a) => a.key)).not.toContain("version_disclosed");
    const r = structuredClone(measured);
    r.security_enhanced.http.server_header_value = "nginx/1.18.0";
    const hit = rankActions(r).find((a) => a.key === "version_disclosed");
    expect(hit.params.version).toBe("nginx/1.18.0");
  });

  it("skips a candidate whose field is missing", () => {
    const r = structuredClone(measured);
    delete r.security_enhanced;
    delete r.security_roots.application_security;
    expect(() => getTopActions(r)).not.toThrow();
    expect(rankActions(r).map((a) => a.key)).not.toContain("csp");
  });
});

describe("action strings", () => {
  it("match en.json word for word, so the i18n default and the locale cannot drift", () => {
    const actions = en.dashboard.actions;
    for (const [key, text] of Object.entries(ACTION_TITLES)) expect(actions[`${key}_title`], key).toBe(text);
    for (const [key, text] of Object.entries(ACTION_DESCS)) expect(actions[`${key}_desc`], key).toBe(text);
  });

  it("contain no em dashes", () => {
    for (const text of [...Object.values(ACTION_TITLES), ...Object.values(ACTION_DESCS)]) expect(text).not.toContain("—");
  });
});

// A scan of a page path (example.com/services): domain findings name the
// host, page findings name the page. Found 10/1/2026 when a scan of
// merakislove.com/demos/keelhouse said "merakislove.com/demos/keelhouse has
// no CAA record".
describe("host and page in action text", () => {
  const render = (a) => (a.desc || "").replace(/\{\{(\w+)\}\}/g, (_, k) => a.params[k]);
  const pathScan = () => {
    const r = everythingBroken();
    r.target_domain = "example.com/services";
    r.security_enhanced.dns.caa_present = false;
    return r;
  };

  it("names the host on a domain finding", () => {
    const caa = rankActions(pathScan()).find((a) => a.key === "caa");
    expect(caa).toBeTruthy();
    expect(render(caa)).toBe("example.com has no CAA record, so any certificate authority can issue a certificate for it.");
  });

  it("names the page on a page finding", () => {
    const h1 = rankActions(pathScan()).find((a) => a.key === "h1");
    expect(h1).toBeTruthy();
    expect(render(h1)).toContain("example.com/services has no H1 heading");
  });

  it("reads the same as before for a bare domain", () => {
    const r = everythingBroken();
    r.target_domain = "example.com";
    const h1 = rankActions(r).find((a) => a.key === "h1");
    expect([h1.params.domain, h1.params.page]).toEqual(["example.com", "example.com"]);
  });

  it("uses the same placeholders in the English locale as in the defaults", () => {
    for (const [k, v] of Object.entries(ACTION_DESCS)) {
      const loc = en.dashboard.actions[`${k}_desc`];
      if (loc === undefined) continue;
      const ph = (s) => [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
      expect([k, ph(loc)]).toEqual([k, ph(v)]);
    }
  });
});

describe("the noindex action", () => {
  const noindex = (source, directive = "noindex") => {
    const r = structuredClone(measured);
    r.target_domain = "example.com/demos/pikewell";
    Object.assign(r.visibility_canopy.seo_branch.html_structure, { indexable: false, noindex_source: source, robots_directive: directive });
    return r;
  };
  const action = (report) => rankActions(report).find((a) => a.key === "noindex");

  it("does not fire on a report with no indexable field, or on an indexable page", () => {
    expect(action(measured)).toBeUndefined();
    const r = structuredClone(measured);
    r.visibility_canopy.seo_branch.html_structure.indexable = true;
    expect(action(r)).toBeUndefined();
  });

  it("names the meta tag, the page and the directive it found", () => {
    const a = action(noindex("meta", "noindex, nofollow"));
    expect(a.descKey).toBe("dashboard.actions.noindex_meta_desc");
    expect(a.params).toMatchObject({ page: "example.com/demos/pikewell", directive: "noindex, nofollow" });
  });

  it("names the response header when that is where it came from", () => {
    expect(action(noindex("header")).descKey).toBe("dashboard.actions.noindex_header_desc");
  });

  it("does not fire when the page was not read", () => {
    const r = structuredClone(newUnmeasured);
    r.visibility_canopy.seo_branch.html_structure = { ...(r.visibility_canopy.seo_branch.html_structure || {}), indexable: false };
    expect(action(r)).toBeUndefined();
  });
});
