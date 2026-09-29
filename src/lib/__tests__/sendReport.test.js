import { describe, it, expect } from "vitest";
import { buildReportEmail, cleanScore } from "../../../api/send-report.js";

describe("api/send-report scores", () => {
  it("keeps null as null instead of coercing it to 0", () => {
    // Number.isFinite(+null) is true, which is how the old code turned null into 0.
    expect(cleanScore(null)).toBeNull();
    expect(cleanScore(undefined)).toBeNull();
    expect(cleanScore("")).toBeNull();
    expect(cleanScore("abc")).toBeNull();
    expect(cleanScore(0)).toBe(0);
    expect(cleanScore(71.4)).toBe(71);
  });

  it("prints Not measured for a null score and never 0/100", () => {
    const scores = { overall: 48, seo: null, aeo: null, geo: null, security: 48 };
    const { html, text } = buildReportEmail({ name: "", domain: "example.com", scores, reportUrl: "https://example.com/" });
    for (const body of [html, text]) {
      expect(body).toContain("Not measured");
      expect(body).toContain("48/100");
      expect(body).not.toContain("0/100");
      expect(body).not.toContain("null");
    }
    expect(text).toContain("SEO: Not measured");
  });
});
