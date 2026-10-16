import { describe, it, expect } from "vitest";
import { isShareToken, readShare, withoutShare, redactShareUrl, shareUrl } from "../share.js";
import share from "../__fixtures__/share.json";

const TOKEN = share.report_token;

describe("share helpers", () => {
  it("accepts exactly 43 base64url characters", () => {
    expect(isShareToken(TOKEN)).toBe(true);
    expect(isShareToken(TOKEN.slice(1))).toBe(false);
    expect(isShareToken(`${TOKEN}A`)).toBe(false);
    expect(isShareToken(`${TOKEN.slice(1)}+`)).toBe(false);
    expect(isShareToken(`${TOKEN.slice(1)}/`)).toBe(false);
    expect(isShareToken(null)).toBe(false);
  });

  it("reads a valid share block and drops anything else", () => {
    expect(readShare({ share: { token: TOKEN, expires_at: share.expires_at } })).toEqual({ token: TOKEN, expires_at: share.expires_at });
    expect(readShare({ share: null })).toBeNull();
    expect(readShare({})).toBeNull();
    expect(readShare({ share: { token: "short" } })).toBeNull();
  });

  it("strips the share block without touching the rest", () => {
    const r = { target_domain: "example.com", share: { token: TOKEN } };
    expect(withoutShare(r)).toEqual({ target_domain: "example.com" });
    expect(r.share.token).toBe(TOKEN);
  });

  it("builds the public link on the production origin", () => {
    expect(shareUrl(TOKEN)).toBe(`https://thecanopyguard.com/r/${TOKEN}`);
  });

  it("redacts the token from analytics URLs and leaves other paths alone", () => {
    expect(redactShareUrl({ type: "pageview", url: `https://thecanopyguard.com/r/${TOKEN}` }).url).toBe("https://thecanopyguard.com/r/[token]");
    expect(redactShareUrl({ type: "pageview", url: `https://thecanopyguard.com/r/${TOKEN}?x=1` }).url).toBe("https://thecanopyguard.com/r/[token]?x=1");
    expect(redactShareUrl({ type: "pageview", url: "https://thecanopyguard.com/blog/some-post" }).url).toBe("https://thecanopyguard.com/blog/some-post");
  });
});
