import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

// src/lib/scores.js is the only place allowed to average the four category
// scores. This fails if any other source file sums them and divides by 4,
// which is how the report view, the PDF, the lead record and the email each
// ended up with their own copy of the formula.

const ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const ALLOWED = join("src", "lib", "scores.js");

const TERM = String.raw`[\w$.?\[\]"']*(?:seo|aeo|geo|security)[\w$.?\[\]"']*`;
// Matched against source with all whitespace removed.
const AVERAGE_OF_FOUR = new RegExp(String.raw`\((?:${TERM}\+){3}${TERM}\)/4`, "i");

function sourceFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "__tests__" || name === "__fixtures__") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...sourceFiles(p));
    else if (/\.(jsx?|tsx?|mjs|cjs)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

describe("score averaging chokepoint", () => {
  it("recognises the inline averages this app used to carry", () => {
    // If the pattern stops matching the old code, the scan below proves nothing.
    const old = [
      "const overall=Math.round(((s.seo_score+s.aeo_score+s.geo_score+s.security_posture_score)/4)*100);",
      "const overall = +((s.seo_score + s.aeo_score + s.geo_score + s.security_posture_score) / 4).toFixed(2);",
      "(scores.seo + scores.aeo + scores.geo + scores.security) / 4",
    ];
    for (const line of old) expect(line.replace(/\s+/g, "")).toMatch(AVERAGE_OF_FOUR);
    expect("(a + b + c + d) / 4".replace(/\s+/g, "")).not.toMatch(AVERAGE_OF_FOUR);
  });

  it("finds no category average outside src/lib/scores.js", () => {
    const files = [...sourceFiles(join(ROOT, "src")), ...sourceFiles(join(ROOT, "api"))];
    const rel = files.map((f) => relative(ROOT, f).split(sep).join("/"));
    // The scan must actually cover the files that used to average.
    expect(rel).toEqual(expect.arrayContaining(["src/App.jsx", "api/send-report.js", "src/lib/scores.js"]));
    const offenders = files
      .filter((f) => relative(ROOT, f) !== ALLOWED)
      .filter((f) => AVERAGE_OF_FOUR.test(readFileSync(f, "utf8").replace(/\s+/g, "")))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });
});
