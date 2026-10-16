// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import i18n from "../i18n.js";
import SharedReport from "../pages/SharedReport.jsx";
import { API } from "../lib/api";
import measured from "../lib/__fixtures__/current-engine-measured.json";
import share from "../lib/__fixtures__/share.json";

const t = i18n.t.bind(i18n);
const TOKEN = share.report_token;
const FORBIDDEN = ["undefined", "null", "NaN"];

// Error bodies shaped like what an API might send. Nothing in them may reach
// the page: not the message, and not the null.
const RAW_404 = { error: "Report token lookup failed", report: null };
const RAW_429 = { error: "Rate limit exceeded for report lookups", retry_after: null };
const RAW_503 = { error: "Database connection refused", report: null };

const reply = (status, body) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

let fetchMock;
beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  for (const el of document.head.querySelectorAll("meta")) el.remove();
});

const mountAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/r/:token" element={<SharedReport />} />
      </Routes>
    </MemoryRouter>
  );

// Every status: no placeholder words and no token, in the text or in any
// attribute.
function expectClean(container) {
  for (const word of FORBIDDEN) expect(container.textContent).not.toContain(word);
  expect(container.innerHTML).not.toContain(TOKEN);
}

describe("/r/:token", () => {
  it("200: renders the report view for the stored report, with the email gate for the PDF", async () => {
    fetchMock.mockResolvedValue(reply(200, { report: measured, expires_at: share.expires_at }));
    const { container } = mountAt(`/r/${TOKEN}`);

    await screen.findByTestId("score-overall");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(`${API}/api/report/${TOKEN}`);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("example.com");
    expect(screen.getByTestId("score-seo").textContent).toContain("81");
    // The 90-day promise only holds for a link minted just now.
    expect(screen.queryByTestId("share-link")).toBeNull();
    expectClean(container);

    fireEvent.click(screen.getByText(t("dashboard.get_report")));
    expect(screen.getByPlaceholderText(t("dashboard.email_gate.email_placeholder"))).toBeTruthy();
    expect(container.textContent).toContain(t("dashboard.email_gate.btn_download"));
    expectClean(container);
  });

  it("404: says the link expired or does not exist, and offers the scan input", async () => {
    fetchMock.mockResolvedValue(reply(404, RAW_404));
    const { container } = mountAt(`/r/${TOKEN}`);

    await screen.findByPlaceholderText("yourdomain.com");
    expect(container.textContent).toContain("This report link has expired or does not exist. Run a fresh scan below.");
    expect(container.textContent).not.toContain(RAW_404.error);
    expect(container.textContent).not.toContain("404");
    expectClean(container);
  });

  it("429: asks the reader to wait", async () => {
    fetchMock.mockResolvedValue(reply(429, RAW_429));
    const { container } = mountAt(`/r/${TOKEN}`);

    const notice = await screen.findByTestId("shared-report-notice");
    expect(notice.textContent).toBe("Too many requests. Please wait a minute and try again.");
    expect(container.textContent).not.toContain(RAW_429.error);
    expectClean(container);
  });

  it("503: says reports are temporarily unavailable", async () => {
    fetchMock.mockResolvedValue(reply(503, RAW_503));
    const { container } = mountAt(`/r/${TOKEN}`);

    const notice = await screen.findByTestId("shared-report-notice");
    expect(notice.textContent).toBe("Reports are temporarily unavailable. Please try again shortly.");
    expect(container.textContent).not.toContain(RAW_503.error);
    expectClean(container);
  });

  it("does not call the engine for a malformed token, and treats it as not found", async () => {
    const { container } = mountAt(`/r/${TOKEN.slice(0, 42)}`);
    await screen.findByPlaceholderText("yourdomain.com");
    expect(container.textContent).toContain("This report link has expired or does not exist. Run a fresh scan below.");
    expect(fetchMock).not.toHaveBeenCalled();
    expectClean(container);
  });

  it("treats a network failure and a 200 without a report as unavailable", async () => {
    for (const setup of [
      () => fetchMock.mockRejectedValue(new TypeError("Failed to fetch")),
      () => fetchMock.mockResolvedValue(reply(200, { report: null, expires_at: null })),
    ]) {
      setup();
      const { container, unmount } = mountAt(`/r/${TOKEN}`);
      const notice = await screen.findByTestId("shared-report-notice");
      expect(notice.textContent).toBe("Reports are temporarily unavailable. Please try again shortly.");
      expect(container.textContent).not.toContain("Failed to fetch");
      expectClean(container);
      unmount();
    }
  });

  it("sets noindex, nofollow and no-referrer while mounted, and restores the site tag after", async () => {
    // The prerendered shell carries the site-wide robots tag.
    const siteRobots = document.createElement("meta");
    siteRobots.setAttribute("name", "robots");
    siteRobots.setAttribute("content", "index, follow");
    document.head.appendChild(siteRobots);

    fetchMock.mockResolvedValue(reply(404, RAW_404));
    const { unmount } = mountAt(`/r/${TOKEN}`);
    await screen.findByPlaceholderText("yourdomain.com");

    expect(document.head.querySelectorAll('meta[name="robots"]').length).toBe(1);
    expect(document.head.querySelector('meta[name="robots"]').getAttribute("content")).toBe("noindex, nofollow");
    expect(document.head.querySelector('meta[name="referrer"]').getAttribute("content")).toBe("no-referrer");

    unmount();
    expect(siteRobots.getAttribute("content")).toBe("index, follow");
    expect(document.head.querySelector('meta[name="referrer"]')).toBeNull();
  });
});
