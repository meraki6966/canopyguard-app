// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import i18n from "../i18n.js";
import { generatePDF } from "../App.jsx";
import measured from "../lib/__fixtures__/current-engine-measured.json";
import tlsMismatch from "../lib/__fixtures__/tls-mismatch-no-dmarc.json";
import exposedBackups from "../lib/__fixtures__/exposed-backups-no-h1.json";
import legacyUnmeasured from "../lib/__fixtures__/current-engine-unmeasured.json";
import newUnmeasured from "../lib/__fixtures__/new-engine-unmeasured.json";

const t = i18n.t.bind(i18n);
const pdf = (report) => new DOMParser().parseFromString(generatePDF(report, "reader@example.com", t), "text/html");
const actionTitles = (doc) => [...doc.querySelectorAll(".action-box strong")].map((s) => s.textContent);
const scoreVals = (doc) => [...doc.querySelectorAll(".score-val")].map((s) => s.textContent);

describe("generatePDF", () => {
  it("uses the ranked top actions, so fixtures 1, 2 and 3 lead differently", () => {
    const firsts = [measured, tlsMismatch, exposedBackups].map((f) => actionTitles(pdf(f))[0]);
    expect(firsts).toEqual(["Add an llms.txt file to your domain root", "Fix your TLS certificate", "Remove exposed files from your web server"]);
  });

  it("prints the same scores as computeScores, overall first", () => {
    expect(scoreVals(pdf(measured))).toEqual(["65", "81", "51", "58", "71"]);
  });

  it.each([
    ["new-engine-unmeasured (fixture 5)", newUnmeasured],
    ["current-engine-unmeasured (fixture 4)", legacyUnmeasured],
  ])("follows the not-measured rules for %s", (_name, fx) => {
    const doc = pdf(fx);
    const text = doc.body.textContent;
    for (const word of ["NaN", "undefined", "null"]) expect(text).not.toContain(word);
    expect(doc.querySelector(".unmeasured-banner").textContent).toMatch(/^We could not load this page from our scanner, so SEO, AEO, /);
    // SEO, AEO and GEO blocks: N/A, never a number.
    expect(scoreVals(doc).slice(1, 4)).toEqual(["N/A", "N/A", "N/A"]);
    expect(doc.querySelector(".measured-line").textContent).toContain("Not measured: SEO, AEO, GEO");
    // Content risk boxes cannot be claimed secured or critical without the page.
    const blind = [...doc.querySelectorAll(".risk-box")].find((b) => b.textContent.includes("Hard for AI assistants to cite"));
    expect(blind.className).toContain("unmeasured");
    expect(actionTitles(doc).every((title) => !/H1|meta description|llms\.txt|FAQ|Organization/i.test(title))).toBe(true);
  });

  it("marks a security layer the engine returned nothing for as not measured", () => {
    const text = pdf(newUnmeasured).body.textContent;
    expect(text).toContain("TLS / Certificate");
    for (const claim of ["All hashed", "No cookies", "No sensitive files exposed", "No sensitive paths exposed"]) expect(text).not.toContain(claim);
  });
});
