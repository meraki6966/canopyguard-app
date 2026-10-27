// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import "../i18n.js";
import { WatchSignup } from "../components/WatchSignup.jsx";
import CanopyGuard from "../App.jsx";
import measured from "../lib/__fixtures__/current-engine-measured.json";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const button = () => screen.getByRole("button", { name: /ask for watch/i });
function mockFetch(status, body) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body });
}

describe("WatchSignup", () => {
  it("shows the price and starts with the report's site filled in", () => {
    render(<WatchSignup domain="example.com" />);
    expect(screen.getByText("$29 a month")).toBeTruthy();
    expect(screen.getByLabelText(/site to watch/i).value).toBe("example.com");
  });

  it("will not send without a valid email", () => {
    const f = mockFetch(200, { ok: true });
    render(<WatchSignup domain="example.com" />);
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "not-an-email" } });
    expect(button().disabled).toBe(true);
    fireEvent.submit(button().closest("form"));
    expect(f).not.toHaveBeenCalled();
  });

  it("posts name, email and site to the engine's signup route and confirms", async () => {
    const f = mockFetch(200, { ok: true });
    render(<WatchSignup domain="example.com" />);
    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: " Pat " } });
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: " pat@example.com " } });
    fireEvent.click(button());
    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/Adam will send the invoice/));
    const [url, init] = f.mock.calls[0];
    expect(url).toMatch(/\/api\/watch\/signup$/);
    expect(JSON.parse(init.body)).toEqual({ name: "Pat", email: "pat@example.com", domain: "example.com" });
  });

  it("shows the engine's error message when a signup is refused", async () => {
    mockFetch(400, { error: "Enter a site like example.com" });
    render(<WatchSignup domain="nope" email="pat@example.com" />);
    fireEvent.click(button());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Enter a site like example.com"));
  });

  it("falls back to a plain message when the engine cannot be reached", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("offline"));
    render(<WatchSignup domain="example.com" email="pat@example.com" />);
    fireEvent.click(button());
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/hello@merakislove\.com/));
  });

  it("appears under a full report", () => {
    render(<CanopyGuard initialReport={measured} />);
    expect(screen.getByTestId("watch-signup")).toBeTruthy();
    expect(screen.getByLabelText(/site to watch/i).value).toBe(measured.target_domain);
  });

  it("fills in the email when the report's email arrives later, but never over typing", () => {
    const { rerender } = render(<WatchSignup domain="example.com" />);
    rerender(<WatchSignup domain="example.com" email="late@example.com" />);
    expect(screen.getByLabelText(/^email/i).value).toBe("late@example.com");
    fireEvent.change(screen.getByLabelText(/^email/i), { target: { value: "mine@example.com" } });
    rerender(<WatchSignup domain="example.com" email="other@example.com" />);
    expect(screen.getByLabelText(/^email/i).value).toBe("mine@example.com");
  });

  it("uses no em or en dashes", () => {
    const { container } = render(<WatchSignup domain="example.com" />);
    expect(/[–—]/.test(container.textContent)).toBe(false);
  });
});
