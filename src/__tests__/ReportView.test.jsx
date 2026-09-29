// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import "../i18n.js";
import CanopyGuard from "../App.jsx";
import measured from "../lib/__fixtures__/current-engine-measured.json";
import exposedBackups from "../lib/__fixtures__/exposed-backups-no-h1.json";
import legacyUnmeasured from "../lib/__fixtures__/current-engine-unmeasured.json";
import newUnmeasured from "../lib/__fixtures__/new-engine-unmeasured.json";

afterEach(cleanup);

const mount = (report) => render(<CanopyGuard initialReport={report} />);
const FORBIDDEN = ["NaN", "undefined", "null"];

// Fixture 5 nulls whole containers, as Fix 3 lists them. The 3.4 engine
// actually emits the containers with every field inside null, so render that
// shape too.
function withNullFields(fx) {
  const r = structuredClone(fx);
  const nulls = (obj) => Object.fromEntries(Object.keys(obj).map((k) => [k, null]));
  const vc = measured.visibility_canopy;
  r.visibility_canopy.seo_branch.html_structure = nulls(vc.seo_branch.html_structure);
  r.visibility_canopy.aeo_branch.schema_validation = nulls(vc.aeo_branch.schema_validation);
  r.visibility_canopy.geo_branch.citation_metrics = nulls(vc.geo_branch.citation_metrics);
  r.visibility_canopy.geo_branch.content_stats = nulls(vc.geo_branch.content_stats);
  r.security_enhanced.html = nulls(measured.security_enhanced.html);
  r.security_enhanced.tls = nulls(measured.security_enhanced.tls);
  return r;
}

describe.each([
  ["new-engine-unmeasured (fixture 5)", newUnmeasured],
  ["new-engine-unmeasured, fields null inside their containers", withNullFields(newUnmeasured)],
  ["current-engine-unmeasured (fixture 4)", legacyUnmeasured],
])("report view with %s", (_name, fx) => {
  it("renders without throwing", () => {
    expect(() => mount(fx)).not.toThrow();
  });

  it("shows no NaN, undefined or null anywhere in the rendered text", () => {
    const { container } = mount(fx);
    const text = container.textContent;
    expect(text.length).toBeGreaterThan(500);
    for (const word of FORBIDDEN) expect(text).not.toContain(word);
  });

  it("shows SEO, AEO and GEO as Not measured, with no number", () => {
    mount(fx);
    for (const c of ["seo", "aeo", "geo"]) {
      const block = screen.getByTestId(`score-${c}`).textContent;
      expect(block).toContain("N/A");
      expect(block).toContain("Not measured");
      expect(block).not.toMatch(/\d/);
    }
  });

  it("explains what was not measured, directly under the domain", () => {
    mount(fx);
    const banner = screen.getByTestId("unmeasured-banner").textContent;
    expect(banner).toMatch(/We could not load this page from our scanner, so SEO, AEO, (and GEO|GEO, and Security) were not measured\./);
  });

  it("hides the AEO generation panel", () => {
    const { container } = mount(fx);
    expect(container.textContent).not.toContain("GENERATE FAQ SCHEMA");
  });

  it("renders no fix snippet in the unmeasured sections", () => {
    const { container } = mount(fx);
    // Fixture 4 carries generated h1 and llms.txt fixes from its empty page.
    expect(container.textContent).not.toContain("Suggested H1:");
    expect(container.textContent).not.toContain("Create llms.txt");
    expect(container.querySelectorAll('[data-row="h1_tags"], [data-row="llms_txt"]').length).toBe(2);
    for (const row of container.querySelectorAll('[data-row="h1_tags"], [data-row="llms_txt"]')) {
      expect(row.textContent).toContain("NOT MEASURED");
      expect(row.textContent).not.toContain("FAIL");
    }
  });
});

// Only the 3.4 engine says which security layers it could not measure, so
// this runs on the new-engine fixtures alone.
describe.each([
  ["new-engine-unmeasured (fixture 5)", newUnmeasured],
  ["new-engine-unmeasured, fields null inside their containers", withNullFields(newUnmeasured)],
])("security layers in %s", (_name, fx) => {
  it("make no clean claim for a layer that was not measured", () => {
    const { container } = mount(fx);
    const text = container.textContent;
    // A missing guard here fails quiet: NaN > 0 is false, so an unmeasured
    // layer used to fall through to its all-clear text.
    for (const claim of ["All hashed", "No cookies", "Secure + HttpOnly set", "No sensitive files exposed", "No sensitive paths exposed"]) expect(text).not.toContain(claim);
  });
});

describe("report view with a fully measured report", () => {
  it("shows every score at its final value on first render, with no count-up", () => {
    mount(measured);
    // Read synchronously after render: no timers, frames or effects have run.
    expect(screen.getByTestId("score-seo").textContent).toContain("81");
    expect(screen.getByTestId("score-aeo").textContent).toContain("51");
    expect(screen.getByTestId("score-geo").textContent).toContain("58");
    expect(screen.getByTestId("score-security").textContent).toContain("71");
    expect(screen.getByTestId("score-overall").textContent).toContain("65");
  });

  it("prints a formula whose numbers add up to the overall shown above it", () => {
    mount(measured);
    const formula = screen.getByTestId("formula").textContent;
    expect(formula).toBe("(SEO 81 + AEO 51 + GEO 58 + Security 71) ÷ 4 = 65");
    const m = formula.match(/^\((.+)\) ÷ (\d+) = (\d+)$/);
    const terms = m[1].split(" + ").map((s) => Number(s.split(" ").pop()));
    expect(terms).toHaveLength(Number(m[2]));
    expect(Math.round(terms.reduce((a, b) => a + b, 0) / Number(m[2]))).toBe(Number(m[3]));
    expect(screen.getByTestId("score-overall").textContent).toContain(m[3]);
  });

  it("uses only the measured categories and their count in the formula", () => {
    mount(legacyUnmeasured);
    expect(screen.getByTestId("formula").textContent).toBe("(Security 48) ÷ 1 = 48");
    expect(screen.getByTestId("measured-line").textContent).toBe("Measured: Security. Not measured: SEO, AEO, GEO.");
  });

  it("counts the same FAIL badges in the Gaps card that the rows render", () => {
    for (const fx of [measured, exposedBackups]) {
      const { container, unmount } = mount(fx);
      // Badge elements whose whole text is FAIL. Matching row text instead
      // would miss them: textContent runs "FAQ Schema" and "FAIL" together.
      const failBadges = [...container.querySelectorAll("[data-row] span")].filter((el) => el.textContent === "FAIL").length;
      const headline = screen.getByTestId("gaps-headline");
      expect(failBadges).toBeGreaterThan(0);
      expect(Number(headline.dataset.failing)).toBe(failBadges);
      expect(headline.textContent).toBe(`${failBadges} of ${headline.dataset.total} checks failing`);
      unmount();
    }
  });

  it("renders fixes and the AEO panel when those sections were measured", () => {
    // Positive control for the unmeasured assertions above.
    const { container } = mount(exposedBackups);
    expect(container.textContent).toContain("Suggested H1:");
    expect(container.textContent).toContain("Create llms.txt");
    expect(container.textContent).toContain("GENERATE FAQ SCHEMA");
    expect(screen.queryByTestId("unmeasured-banner")).toBeNull();
  });

  it("no longer shows the sector benchmark or the revenue leakage figure", () => {
    const { container } = mount(measured);
    const text = container.textContent;
    for (const gone of ["SECTOR BENCHMARK", "software & services", "68%", "REVENUE LEAKAGE", "Revenue Leakage", "REVENUE AT RISK"]) expect(text).not.toContain(gone);
    expect(text).not.toMatch(/\$\d/);
  });
});
