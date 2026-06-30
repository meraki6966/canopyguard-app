// Vercel serverless function — transactional email via Resend.
//
// Two flows, triggered when a user submits their email to download the report:
//   1. Report delivery email — sent immediately from reports@thecanopyguard.com
//   2. Lead follow-up email  — scheduled 24h later from adam@thecanopyguard.com
//      using Resend's native `scheduled_at` (no cron / no second invocation).
//
// Emails are plain-text-style HTML (system font, left aligned, no marketing
// chrome) to match the direct practitioner tone of the site. A text/plain
// alternative is included for deliverability.

const RESEND_ENDPOINT = "https://api.resend.com/emails";

const REPORTS_FROM = process.env.RESEND_REPORTS_FROM || "Canopy Guard <reports@thecanopyguard.com>";
const FOLLOWUP_FROM = process.env.RESEND_FOLLOWUP_FROM || "Adam McClarin <adam@thecanopyguard.com>";
const REPLY_TO = process.env.RESEND_REPLY_TO || "adam@thecanopyguard.com";
const CALENDLY_URL = process.env.CALENDLY_URL || "https://calendly.com/hello-merakislove/new-meeting";
const SITE_URL = process.env.SITE_URL || "https://thecanopyguard.com";

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

// Minimal, email-safe wrapper. Left-aligned, system font, readable line length —
// deliberately not a designed template.
function plainWrap(innerHtml) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:560px;margin:0 auto;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a;">
${innerHtml}
</div></body></html>`;
}

async function sendEmail(apiKey, payload) {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function firstName(name) {
  const n = String(name || "").trim();
  if (!n) return "";
  return n.split(/\s+/)[0];
}

function buildReportEmail({ name, domain, scores, reportUrl }) {
  const greeting = firstName(name) ? `Hi ${escapeHtml(firstName(name))},` : "Hi,";
  const d = escapeHtml(domain);
  const scoreLine = (label, val) => `<tr>
    <td style="padding:4px 16px 4px 0;color:#555;">${label}</td>
    <td style="padding:4px 0;font-weight:700;font-family:'SF Mono',Menlo,Consolas,monospace;">${val}/100</td>
  </tr>`;

  const html = plainWrap(`
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">Here is your Canopy Guard audit report for <strong>${d}</strong>.</p>
<p style="margin:0 0 8px;">Your scores:</p>
<table style="margin:0 0 16px;border-collapse:collapse;">
  <tr>
    <td style="padding:4px 16px 4px 0;color:#555;">Overall</td>
    <td style="padding:4px 0;font-weight:700;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:18px;">${scores.overall}/100</td>
  </tr>
  ${scoreLine("SEO", scores.seo)}
  ${scoreLine("AEO", scores.aeo)}
  ${scoreLine("GEO", scores.geo)}
  ${scoreLine("Security", scores.security)}
</table>
<p style="margin:0 0 16px;">
  <a href="${escapeHtml(reportUrl)}" style="color:#0b66c3;">Download your full PDF report</a>
  — it lists every finding with the exact fix for each one.
</p>
<p style="margin:0 0 4px;">Adam McClarin, CISSP</p>
<p style="margin:0;color:#555;">Canopy Guard</p>
`);

  const text = `${greeting}

Here is your Canopy Guard audit report for ${domain}.

Your scores:
Overall: ${scores.overall}/100
SEO: ${scores.seo}/100
AEO: ${scores.aeo}/100
GEO: ${scores.geo}/100
Security: ${scores.security}/100

Download your full PDF report: ${reportUrl}
It lists every finding with the exact fix for each one.

Adam McClarin, CISSP
Canopy Guard`;

  return { html, text };
}

function buildFollowUpEmail({ name, domain }) {
  const greeting = firstName(name) ? `Hi ${escapeHtml(firstName(name))},` : "Hi,";
  const d = escapeHtml(domain);

  const html = plainWrap(`
<p style="margin:0 0 16px;">${greeting}</p>
<p style="margin:0 0 16px;">I sent over your Canopy Guard report for ${d} yesterday. I wanted to check in.</p>
<p style="margin:0 0 16px;">If any of the findings were unclear, or you want a hand figuring out what to fix first, I am happy to walk through it with you. No pitch — just answers.</p>
<p style="margin:0 0 16px;">You can grab a time here: <a href="${escapeHtml(CALENDLY_URL)}" style="color:#0b66c3;">${escapeHtml(CALENDLY_URL)}</a></p>
<p style="margin:0 0 16px;">Or just reply to this email.</p>
<p style="margin:0 0 4px;">Adam McClarin, CISSP</p>
<p style="margin:0;color:#555;">Canopy Guard</p>
`);

  const text = `${greeting}

I sent over your Canopy Guard report for ${domain} yesterday. I wanted to check in.

If any of the findings were unclear, or you want a hand figuring out what to fix first, I am happy to walk through it with you. No pitch — just answers.

You can grab a time here: ${CALENDLY_URL}

Or just reply to this email.

Adam McClarin, CISSP
Canopy Guard`;

  return { html, text };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("[send-report] RESEND_API_KEY not set");
    return res.status(500).json({ error: "Email not configured" });
  }

  // Vercel parses JSON bodies automatically; guard against string bodies too.
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const { email, name = "", domain, scores } = body || {};

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "valid email is required" });
  }
  if (!domain || typeof domain !== "string") {
    return res.status(400).json({ error: "domain is required" });
  }
  const s = scores || {};
  const safeScores = {
    overall: Number.isFinite(+s.overall) ? Math.round(+s.overall) : 0,
    seo: Number.isFinite(+s.seo) ? Math.round(+s.seo) : 0,
    aeo: Number.isFinite(+s.aeo) ? Math.round(+s.aeo) : 0,
    geo: Number.isFinite(+s.geo) ? Math.round(+s.geo) : 0,
    security: Number.isFinite(+s.security) ? Math.round(+s.security) : 0,
  };

  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "").trim().toLowerCase();
  const reportUrl = `${SITE_URL}/?domain=${encodeURIComponent(cleanDomain)}`;

  // ── 1. Report delivery email (immediate) ──
  const report = buildReportEmail({ name, domain: cleanDomain, scores: safeScores, reportUrl });
  const reportSend = await sendEmail(apiKey, {
    from: REPORTS_FROM,
    to: [email],
    reply_to: REPLY_TO,
    subject: `Your Canopy Guard Audit Report for ${cleanDomain}`,
    html: report.html,
    text: report.text,
  });

  if (!reportSend.ok) {
    console.error("[send-report] report email failed:", reportSend.status, reportSend.data);
    return res.status(502).json({ error: "Report email failed", details: reportSend.data });
  }

  // ── 2. Lead follow-up email (scheduled +24h) ──
  // Scheduled natively by Resend; a failure here must not fail report delivery.
  let followUpId = null;
  let followUpScheduled = false;
  try {
    const scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const followUp = buildFollowUpEmail({ name, domain: cleanDomain });
    const followSend = await sendEmail(apiKey, {
      from: FOLLOWUP_FROM,
      to: [email],
      reply_to: REPLY_TO,
      subject: "Any questions about your audit?",
      html: followUp.html,
      text: followUp.text,
      scheduled_at: scheduledAt,
    });
    if (followSend.ok) {
      followUpScheduled = true;
      followUpId = followSend.data?.id || null;
    } else {
      console.error("[send-report] follow-up schedule failed:", followSend.status, followSend.data);
    }
  } catch (err) {
    console.error("[send-report] follow-up schedule error:", err);
  }

  return res.status(200).json({
    ok: true,
    report_id: reportSend.data?.id || null,
    follow_up_scheduled: followUpScheduled,
    follow_up_id: followUpId,
  });
}
