import { describe, it, expect } from "vitest";
import { computeScores } from "../scores.js";
import measured from "../__fixtures__/current-engine-measured.json";
import tlsMismatch from "../__fixtures__/tls-mismatch-no-dmarc.json";
import exposedBackups from "../__fixtures__/exposed-backups-no-h1.json";
import legacyUnmeasured from "../__fixtures__/current-engine-unmeasured.json";
import newUnmeasured from "../__fixtures__/new-engine-unmeasured.json";

const ALL = { measured, tlsMismatch, exposedBackups, legacyUnmeasured, newUnmeasured };

describe("computeScores", () => {
  it("converts a fully measured report to integers and averages all four", () => {
    const s = computeScores(measured);
    expect(s).toMatchObject({ seo: 81, aeo: 51, geo: 58, security: 71, overall: 65 });
    expect(s.measured).toEqual(["seo", "aeo", "geo", "security"]);
    expect(s.unmeasured).toEqual([]);
  });

  it("averages only the measured categories, with the matching divisor", () => {
    const r = structuredClone(measured);
    r.summary_scores.seo_score = null;
    r.summary_scores.geo_score = null;
    const s = computeScores(r);
    expect(s.seo).toBeNull();
    expect(s.geo).toBeNull();
    expect(s.unmeasured).toEqual(["seo", "geo"]);
    // (51 + 71) / 2 = 61. Treating the nulls as 0 would give 31.
    expect(s.overall).toBe(61);
  });

  it("treats a missing score field as unmeasured, not as 0", () => {
    const r = structuredClone(measured);
    delete r.summary_scores.aeo_score;
    const s = computeScores(r);
    expect(s.aeo).toBeNull();
    expect(s.overall).toBe(Math.round((81 + 58 + 71) / 3));
  });

  it("honours summary_scores.unmeasured_categories even when a number is present", () => {
    const r = structuredClone(measured);
    r.summary_scores.unmeasured_categories = ["geo"];
    expect(computeScores(r).geo).toBeNull();
  });

  it("rounds categories to integers before averaging, so the shown formula checks out by hand", () => {
    // Raw mean 0.00525 would round to 1; the integers 0 + 0 + 0 + 1 average to 0.25, which rounds to 0.
    const r = structuredClone(measured);
    r.summary_scores = { seo_score: 0.004, aeo_score: 0.004, geo_score: 0.004, security_posture_score: 0.009 };
    const s = computeScores(r);
    expect([s.seo, s.aeo, s.geo, s.security]).toEqual([0, 0, 0, 1]);
    expect(s.overall).toBe(0);
  });

  it("returns an overall that equals the rounded mean of the category integers it reports, for every fixture", () => {
    for (const [name, fx] of Object.entries(ALL)) {
      const s = computeScores(fx);
      if (!s.measured.length) { expect(s.overall, name).toBeNull(); continue; }
      const sum = s.measured.reduce((a, c) => a + s[c], 0);
      expect(s.overall, name).toBe(Math.round(sum / s.measured.length));
    }
  });

  it("returns null for SEO, AEO and GEO on the current engine's unreadable-page shape (fixture 4)", () => {
    const s = computeScores(legacyUnmeasured);
    expect([s.seo, s.aeo, s.geo]).toEqual([null, null, null]);
    // Security does not need the page and stays measured.
    expect(s.security).toBe(48);
    expect(s.overall).toBe(48);
  });

  it("returns null for SEO, AEO and GEO on the new engine's unreadable-page shape (fixture 5)", () => {
    const s = computeScores(newUnmeasured);
    expect([s.seo, s.aeo, s.geo]).toEqual([null, null, null]);
    expect(s.security).toBeNull();
    expect(s.overall).toBeNull();
  });

  it("does not apply the legacy heuristic when fetch_status is present", () => {
    // A new-engine report that read the page and genuinely found no words is
    // a measurement, not an unread page.
    const r = structuredClone(tlsMismatch);
    r.visibility_canopy.seo_branch.crawlability = false;
    r.visibility_canopy.seo_branch.html_structure.word_count = 0;
    expect(computeScores(r).seo).toBe(78);
  });
});
