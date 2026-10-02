import { describe, it, expect } from "vitest";
import { getRows, getChecks, summarizeGaps, getComplianceChecks } from "../checks.js";
import measured from "../__fixtures__/current-engine-measured.json";
import tlsMismatch from "../__fixtures__/tls-mismatch-no-dmarc.json";
import exposedBackups from "../__fixtures__/exposed-backups-no-h1.json";
import legacyUnmeasured from "../__fixtures__/current-engine-unmeasured.json";
import newUnmeasured from "../__fixtures__/new-engine-unmeasured.json";

const ALL = { measured, tlsMismatch, exposedBackups, legacyUnmeasured, newUnmeasured };

describe("getChecks and the Gaps card", () => {
  it("counts exactly the check rows with pass === false, and only measured rows in the total", () => {
    for (const [name, fx] of Object.entries(ALL)) {
      const checkRows = getRows(fx).filter((r) => r.kind === "check");
      const gaps = summarizeGaps(getChecks(fx));
      expect(gaps.failing, name).toBe(checkRows.filter((r) => r.pass === false).length);
      expect(gaps.total, name).toBe(checkRows.filter((r) => r.pass !== null).length);
    }
  });

  it("finds the failures the fixtures were built with", () => {
    // Positive control, so the equality above cannot pass on all zeros.
    const failing = (fx) => getChecks(fx).filter((c) => c.pass === false).map((c) => c.key);
    expect(failing(measured)).toEqual(["faq_schema", "llms_txt"]);
    expect(failing(exposedBackups)).toEqual(["h1_tags", "faq_schema", "llms_txt"]);
    expect(failing(tlsMismatch)).toEqual(["faq_schema", "llms_txt", "tls_valid"]);
  });

  it("breaks the failures down by category", () => {
    expect(summarizeGaps(getChecks(exposedBackups)).byCategory).toEqual({ seo: 1, aeo: 1, geo: 1, security: 0 });
  });

  it("marks every SEO, AEO and GEO row not measured on an unread page, whatever the engine left in it", () => {
    for (const fx of [legacyUnmeasured, newUnmeasured]) {
      const content = getRows(fx).filter((r) => r.category !== "security");
      expect(content.length).toBeGreaterThan(0);
      for (const r of content) expect(r.kind === "check" ? r.pass : r.value, r.key).toBeNull();
    }
    // Fixture 4 has h1_count 0, which would have rendered as FAIL.
    expect(legacyUnmeasured.visibility_canopy.seo_branch.html_structure.h1_count).toBe(0);
  });

  it("leaves unmeasured categories out of the Gaps breakdown and the total", () => {
    const gaps = summarizeGaps(getChecks(legacyUnmeasured));
    expect(Object.keys(gaps.byCategory)).toEqual(["security"]);
    expect(summarizeGaps(getChecks(newUnmeasured))).toEqual({ failing: 0, total: 0, byCategory: {} });
  });
});

describe("getComplianceChecks privacy policy", () => {
  const privacy = (report) => getComplianceChecks(report).find((c) => c.key === "privacy_policy").pass;

  it("passes when the engine found a privacy link", () => {
    expect(privacy(tlsMismatch)).toBe(true);
  });

  it("fails when the engine read the page and found none", () => {
    const r = structuredClone(tlsMismatch);
    r.visibility_canopy.seo_branch.has_privacy_link = false;
    expect(privacy(r)).toBe(false);
  });

  it("is not measured when the engine does not report it or could not read the page", () => {
    expect(privacy(measured)).toBeNull();
    expect(privacy(newUnmeasured)).toBeNull();
    expect(privacy(legacyUnmeasured)).toBeNull();
  });
});

describe("the Indexable row", () => {
  const row = (report) => getRows(report).find((r) => r.key === "indexable");
  const withField = (value) => {
    const r = structuredClone(measured);
    r.visibility_canopy.seo_branch.html_structure.indexable = value;
    return r;
  };

  it("has no row on a report from an engine that never checked", () => {
    expect("indexable" in measured.visibility_canopy.seo_branch.html_structure).toBe(false);
    expect(row(measured)).toBeUndefined();
  });

  it("passes on an indexable page", () => {
    expect(row(withField(true)).pass).toBe(true);
  });

  it("fails on a noindex page, and the Gaps card counts it", () => {
    expect(row(withField(false)).pass).toBe(false);
    const before = summarizeGaps(getChecks(withField(true)));
    const after = summarizeGaps(getChecks(withField(false)));
    expect(after.failing).toBe(before.failing + 1);
    expect(after.byCategory.seo).toBe((before.byCategory.seo ?? 0) + 1);
    expect(after.total).toBe(before.total);
  });

  it("is not measured, never failed, when the engine could not read the page", () => {
    expect(row(withField(null)).pass).toBeNull();
  });

  it("leaves Crawlable alone: a noindex page was still read", () => {
    expect(getRows(withField(false)).find((r) => r.key === "crawlable").pass).toBe(true);
  });
});

describe("the Page Title row", () => {
  const title = (text) => {
    const r = structuredClone(measured);
    r.visibility_canopy.seo_branch.html_structure.title = text;
    return getRows(r).find((x) => x.key === "page_title")?.value;
  };

  it("shows a 53 character title whole", () => {
    const t = "Pikewell Real Estate | Denver Homes and Neighborhoods";
    expect(t.length).toBe(53);
    expect(title(t)).toBe(t);
  });

  it("cuts a title past 70 characters with a visible ellipsis", () => {
    const shown = title("a".repeat(90));
    expect(shown.length).toBe(70);
    expect(shown.endsWith("…")).toBe(true);
  });
});
