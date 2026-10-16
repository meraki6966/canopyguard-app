// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "../i18n.js";
import CanopyGuard from "../App.jsx";
import measured from "../lib/__fixtures__/current-engine-measured.json";
import share from "../lib/__fixtures__/share.json";

const TOKEN = share.scan_token;
const reply = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body });

let fetchMock, writeText;
beforeEach(() => {
  window.history.replaceState(null, "", "/");
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("open", vi.fn(() => null));
  writeText = vi.fn(() => Promise.resolve());
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState(null, "", "/");
});

// The scan answers with the given share block; every other call (lead store,
// report email) gets an empty 200.
function engine(shareBlock) {
  fetchMock.mockImplementation(async (url) =>
    String(url).endsWith("/api/scan") ? reply(200, { ...measured, share: shareBlock }) : reply(200, {})
  );
}

async function scan() {
  const view = render(<MemoryRouter><CanopyGuard /></MemoryRouter>);
  fireEvent.change(screen.getByPlaceholderText("yourdomain.com"), { target: { value: "example.com" } });
  fireEvent.click(screen.getByText("Scan My Site"));
  await screen.findByTestId("score-overall", {}, { timeout: 3000 });
  return view;
}

describe("share link after a live scan", () => {
  it("moves the URL to /r/<token>, copies the full link, and returns to / on a new scan", async () => {
    engine({ token: TOKEN, expires_at: share.expires_at });
    const { container } = await scan();

    expect(window.location.pathname).toBe(`/r/${TOKEN}`);
    fireEvent.click(screen.getByText("Copy link to this report"));
    await screen.findByText("Link copied. It stays live for 90 days.");
    expect(writeText).toHaveBeenCalledWith(`https://thecanopyguard.com/r/${TOKEN}`);
    expect(container.innerHTML).not.toContain(TOKEN);

    fireEvent.click(screen.getByText("New Scan"));
    expect(window.location.pathname).toBe("/");
  });

  it("keeps the token out of the lead record", async () => {
    engine({ token: TOKEN, expires_at: share.expires_at });
    await scan();
    fireEvent.click(screen.getByText("GET REPORT"));
    fireEvent.change(screen.getByPlaceholderText("you@company.com"), { target: { value: "reader@example.com" } });
    fireEvent.click(screen.getByText("DOWNLOAD REPORT"));
    await vi.waitFor(() => expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith("/api/canopyguard/leads"))).toBe(true));

    const [, init] = fetchMock.mock.calls.find(([u]) => String(u).endsWith("/api/canopyguard/leads"));
    // Positive control: the lead body does carry the report.
    expect(init.body).toContain("example.com");
    expect(init.body).not.toContain(TOKEN);
  });

  it.each([
    ["share: null", null],
    ["a malformed token", { token: TOKEN.slice(1), expires_at: share.expires_at }],
  ])("hides the button and leaves the URL alone for %s", async (_name, shareBlock) => {
    engine(shareBlock);
    await scan();
    expect(window.location.pathname).toBe("/");
    expect(screen.queryByTestId("share-link")).toBeNull();
    expect(screen.queryByText("Copy link to this report")).toBeNull();
  });
});
