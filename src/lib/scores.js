// The one place category and overall scores are computed. The report view,
// generatePDF, storeLead and sendReportEmail all read from here, so the number
// on the page, in the PDF, in the lead record and in the email cannot drift.
// A source-scan test fails if another file starts averaging scores itself.

export const CATEGORIES = ["seo", "aeo", "geo", "security"];

export const CATEGORY_LABELS = { seo: "SEO", aeo: "AEO", geo: "GEO", security: "Security" };

const SCORE_FIELDS = {
  seo: "seo_score",
  aeo: "aeo_score",
  geo: "geo_score",
  security: "security_posture_score",
};

// The engine reports 0-1 floats. Anything that is not a finite number is
// unmeasured; it is never coerced to 0.
function toInt(v) {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  return Math.min(100, Math.max(0, Math.round(v * 100)));
}

// Engines before 3.4 have no fetch_status and score an unreadable homepage as
// an empty page: not crawlable, zero words, every content signal failed. That
// combination is the only trace such a report leaves, so it is read as "the
// page was not loaded" rather than as a page that genuinely has no content.
function legacyPageUnread(report) {
  if (report?.fetch_status) return false;
  const seo = report?.visibility_canopy?.seo_branch;
  return seo?.crawlability === false && seo?.html_structure?.word_count === 0;
}

export function computeScores(report) {
  const s = report?.summary_scores;
  const flagged = Array.isArray(s?.unmeasured_categories) ? s.unmeasured_categories : [];
  const pageUnread = legacyPageUnread(report);

  const out = {};
  for (const c of CATEGORIES) {
    const unmeasured = flagged.includes(c) || (pageUnread && c !== "security");
    out[c] = unmeasured ? null : toInt(s?.[SCORE_FIELDS[c]]);
  }

  const measured = CATEGORIES.filter((c) => out[c] !== null);
  const unmeasured = CATEGORIES.filter((c) => out[c] === null);
  // Rounded integers are averaged, so the formula shown on the page can be
  // checked by hand against the overall it prints.
  const overall = measured.length
    ? Math.round(measured.reduce((sum, c) => sum + out[c], 0) / measured.length)
    : null;

  return { ...out, overall, measured, unmeasured };
}
