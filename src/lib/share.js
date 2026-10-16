// Shareable report links. POST /api/scan returns share: { token, expires_at }
// or share: null, and GET /api/report/:token returns that scan back for 90 days.
// The token is a bearer credential for one report, so it is validated before it
// touches the URL or the network, and it is never rendered on the page.

export const SITE_ORIGIN = "https://thecanopyguard.com";

// 43 characters of base64url: 32 random bytes, unpadded.
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const isShareToken = (token) => typeof token === "string" && TOKEN_RE.test(token);

export const sharePath = (token) => `/r/${token}`;
export const shareUrl = (token) => `${SITE_ORIGIN}${sharePath(token)}`;

// A share block the engine could not have meant (wrong shape, malformed token)
// is treated exactly like share: null, so the link UI stays hidden.
export function readShare(data) {
  const share = data && data.share;
  if (!share || typeof share !== "object" || !isShareToken(share.token)) return null;
  return { token: share.token, expires_at: typeof share.expires_at === "string" ? share.expires_at : null };
}

// The report without its share block, so the token does not travel on to the
// lead record as part of report_json.
export function withoutShare(data) {
  if (!data || typeof data !== "object" || !("share" in data)) return data;
  const copy = { ...data };
  delete copy.share;
  return copy;
}

// Analytics records page paths. A /r/ path carries the token, so it is reduced
// to the route before the event leaves the browser.
export function redactShareUrl(event) {
  if (!event || typeof event.url !== "string") return event;
  return { ...event, url: event.url.replace(/\/r\/[^/?#]+/, "/r/[token]") };
}

// Resolves to one of:
//   { status: "ok", report, expiresAt }
//   { status: "not_found" }    unknown, malformed or expired (the engine
//                              answers all three with the same 404)
//   { status: "rate_limited" } 429
//   { status: "unavailable" }  503, any other failure, or a body without a report
// The response body is read only on 200. Nothing from an error body reaches the page.
export async function fetchSharedReport(api, token, { signal } = {}) {
  if (!isShareToken(token)) return { status: "not_found" };
  let res;
  try {
    res = await fetch(`${api}/api/report/${token}`, { signal, headers: { Accept: "application/json" } });
  } catch (e) {
    if (e && e.name === "AbortError") throw e;
    return { status: "unavailable" };
  }
  if (res.status === 404) return { status: "not_found" };
  if (res.status === 429) return { status: "rate_limited" };
  if (res.status !== 200) return { status: "unavailable" };
  const body = await res.json().catch(() => null);
  const report = body && body.report;
  if (!report || typeof report !== "object" || Array.isArray(report)) return { status: "unavailable" };
  return { status: "ok", report: withoutShare(report), expiresAt: typeof body.expires_at === "string" ? body.expires_at : null };
}
