import { useState } from "react";
import { API } from "../lib/api";

// Canopy Guard Watch signup, shown under a report. Billing is by invoice: the
// engine stores the signup as pending and emails Adam, who invoices and turns
// it on. Nothing here takes payment, and the free scan is unchanged.

const C = {
  card: "#163824", border: "rgba(237,244,239,0.12)", field: "#0C2117",
  white: "#F8FAF9", gray: "rgba(237,244,239,0.70)", grayDark: "rgba(237,244,239,0.50)",
  gold: "#C8A96E", goldBorder: "rgba(200,169,110,0.40)", red: "#E8826F", green: "#7BC8A4",
};
const heading = "'DM Serif Display',Georgia,serif";
const mono = "'Space Mono','SF Mono',monospace";
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const WATCH_PRICE = "$29 a month";

const input = {
  background: C.field, border: `1px solid ${C.border}`, color: C.white, padding: "13px 14px",
  fontSize: 14, borderRadius: 4, width: "100%", boxSizing: "border-box",
};

export function WatchSignup({ domain = "", email: initialEmail = "" }) {
  const [name, setName] = useState("");
  // null until the visitor types, so the report's email can arrive after this
  // mounts (from the download form) and still fill the field.
  const [typedEmail, setEmail] = useState(null);
  const email = typedEmail ?? initialEmail;
  const [site, setSite] = useState(domain);
  const [state, setState] = useState("idle"); // idle | sending | done | error
  const [error, setError] = useState("");
  const ready = EMAIL.test(email.trim()) && site.trim().length > 2;

  async function submit(e) {
    e.preventDefault();
    if (!ready || state === "sending") return;
    setState("sending");
    setError("");
    try {
      const res = await fetch(`${API}/api/watch/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), domain: site.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { setState("done"); return; }
      setError(typeof data.error === "string" ? data.error : "");
      setState("error");
    } catch {
      setError("");
      setState("error");
    }
  }

  return (
    <section
      id="watch"
      data-testid="watch-signup"
      style={{ background: C.card, border: `1px solid ${C.goldBorder}`, borderRadius: 6, padding: 32, marginBottom: 32 }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <h2 style={{ margin: 0, fontFamily: heading, fontSize: 26, fontWeight: 400, color: C.white }}>
          Watch this site every week
        </h2>
        <span style={{ fontFamily: heading, fontSize: 22, color: C.gold }}>{WATCH_PRICE}</span>
      </div>
      <p style={{ color: C.gray, fontSize: 14, lineHeight: 1.7, margin: "12px 0 0", maxWidth: 620 }}>
        Canopy Guard reruns this same outside-in scan every week and emails you what changed: a score that dropped,
        a check that broke, or a new serious finding. It never logs in to your site. The free scan stays free.
      </p>

      {state === "done" ? (
        <p role="status" style={{ color: C.green, fontSize: 15, lineHeight: 1.7, margin: "22px 0 0" }}>
          Thanks. Check your inbox for a confirmation. Adam will send the invoice, and your first weekly email
          follows once it is paid.
        </p>
      ) : (
        <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 22, maxWidth: 620 }}>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))" }}>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: C.grayDark }}>
              Your name (optional)
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} autoComplete="name" style={input} />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 12, color: C.grayDark }}>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" required style={{ ...input, fontFamily: mono }} />
            </label>
          </div>
          <label style={{ display: "grid", gap: 6, fontSize: 12, color: C.grayDark }}>
            Site to watch
            <input value={site} onChange={(e) => setSite(e.target.value)} maxLength={300} required style={{ ...input, fontFamily: mono }} />
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginTop: 4 }}>
            <button
              type="submit"
              disabled={!ready || state === "sending"}
              style={{
                background: C.gold, color: "#0C2117", border: "none", fontWeight: 700, fontSize: 14,
                padding: "15px 32px", borderRadius: 4, cursor: ready ? "pointer" : "default",
                opacity: ready && state !== "sending" ? 1 : 0.55,
              }}
            >
              {state === "sending" ? "Sending" : "Ask for Watch"}
            </button>
            <span style={{ fontSize: 12, color: C.grayDark }}>Adam sends an invoice. Watch starts once it is paid.</span>
          </div>
          {state === "error" && (
            <p role="alert" style={{ color: C.red, fontSize: 13, margin: 0 }}>
              {error || "That did not go through. Please try again, or email hello@merakislove.com."}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
