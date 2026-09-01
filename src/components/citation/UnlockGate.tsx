/**
 * UnlockGate.tsx
 * AEO Citation Layer: paid gate wrapper
 *
 * Checks entitlement against the engine, and if the user has not purchased,
 * shows the two purchase paths:
 *   - One-time unlock ($99) — BYOK CitationScan, unchanged
 *   - Monthly subscription ($14.99/mo) — platform-hosted automated tracking
 *     (SubscriptionDashboard), with the BYOK scan still available as a bonus
 *
 * Entitlement check: the engine has no session/cookie auth, so this reads a
 * signed unlock token from localStorage (see unlockStorage.ts) and sends it
 * as a Bearer token instead of relying on cookies. The token itself is
 * obtained once, at the App shell level, when the buyer returns from the
 * Stripe redirect with a session_id — see the top-level session_id handling
 * in App.jsx, which exchanges it for a token via GET /api/citation/entitlement
 * and stores it before this component ever mounts.
 */

import { useEffect, useMemo, useState } from 'react';
import CitationScan from './CitationScan';
import SubscriptionDashboard from './SubscriptionDashboard';
import { getStoredUnlock } from './unlockStorage';

const NAVY = '#0B1426';
const AMBER = '#F59E0B';

const API =
  (import.meta as any).env?.VITE_API_URL ??
  'https://canopyguard-engine-production.up.railway.app';

// Payment Link URLs — overridable via env vars; see .env.example.
// NOTHING IS SET UP IN STRIPE YET: no product, no price, no payment link.
// The fallbacks are deliberately not URLs, so a missing env var fails
// visibly rather than rendering a link that looks real and goes nowhere.
// Real values get set in Vercel when the citation layer is revisited.
const PAYMENT_LINK_ONETIME =
  (import.meta as any).env?.VITE_CITATION_LINK_ONETIME ??
  'PLACEHOLDER_SET_IN_VERCEL_WHEN_LIVE';
const PAYMENT_LINK_SUBSCRIPTION =
  (import.meta as any).env?.VITE_CITATION_LINK_SUBSCRIPTION ??
  'PLACEHOLDER_SET_IN_VERCEL_WHEN_LIVE';

const PRICE_ONETIME = 99;
const PRICE_SUBSCRIPTION = 14.99;

// Flip to true only for local development before Stripe env vars are set
const DEV_BYPASS = false;

interface UnlockGateProps {
  auditedUrl: string;
  /** Optional: current AEO score from the free audit, shown as the hook */
  aeoScore?: number;
}

type Entitlement = 'loading' | 'locked' | 'unlocked';

export default function UnlockGate({ auditedUrl, aeoScore }: UnlockGateProps) {
  const [state, setState] = useState<Entitlement>('loading');
  const [plan, setPlan] = useState<'one-time' | 'subscription' | null>(null);

  const domain = useMemo(() => {
    try {
      return new URL(auditedUrl).hostname;
    } catch {
      return '';
    }
  }, [auditedUrl]);

  const storedToken = domain ? getStoredUnlock(domain)?.token ?? null : null;

  useEffect(() => {
    if (DEV_BYPASS) {
      setState('unlocked');
      return;
    }
    if (!domain) {
      setState('locked');
      return;
    }
    const stored = getStoredUnlock(domain);
    if (!stored) {
      setState('locked');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API}/api/citation/entitlement?domain=${encodeURIComponent(domain)}`,
          { headers: { Authorization: `Bearer ${stored.token}` } }
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled) {
          if (res.ok && data?.unlocked) {
            setPlan(data.plan ?? stored.plan);
            setState('unlocked');
          } else {
            setState('locked');
          }
        }
      } catch {
        if (!cancelled) setState('locked');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [domain]);

  if (state === 'unlocked') {
    if (plan === 'subscription' && domain && storedToken) {
      return <SubscriptionDashboard auditedUrl={auditedUrl} domain={domain} token={storedToken} />;
    }
    return <CitationScan auditedUrl={auditedUrl} />;
  }

  const onetimeHref = domain
    ? `${PAYMENT_LINK_ONETIME}?client_reference_id=${encodeURIComponent(domain)}`
    : PAYMENT_LINK_ONETIME;
  const subscriptionHref = domain
    ? `${PAYMENT_LINK_SUBSCRIPTION}?client_reference_id=${encodeURIComponent(domain)}`
    : PAYMENT_LINK_SUBSCRIPTION;

  return (
    <section
      style={{
        background: NAVY,
        color: '#E7ECF4',
        borderRadius: 12,
        padding: 24,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 22 }}>
        Your free audit found the gap. This shows you exactly where it is.
      </h2>

      <p style={{ fontSize: 14, opacity: 0.85, lineHeight: 1.6 }}>
        {typeof aeoScore === 'number' ? (
          <>
            Your AEO score came back at <strong style={{ color: AMBER }}>{aeoScore}</strong>.
            That number says AI engines are probably not citing you.{' '}
          </>
        ) : null}
        The Citation Scan pulls the real questions off your own site, asks
        ChatGPT, Claude, Gemini, and Perplexity each one, and shows you
        question by question where your brand shows up and where it goes
        silent.
      </p>

      <ul style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.8 }}>
        <li>Questions come from your actual FAQ schema and headers, not a generic list</li>
        <li>Bring your own API keys: your data never routes through our servers</li>
        <li>Results land inside the same report as your 51 security signals</li>
      </ul>

      <div
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          marginTop: 16,
        }}
      >
        <a href={onetimeHref} style={card}>
          <div style={{ fontSize: 13, opacity: 0.7 }}>One-time unlock</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: AMBER }}>
            ${PRICE_ONETIME}
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Full citation scan for this site, yours to run
          </div>
        </a>

        <a href={subscriptionHref} style={card}>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Ongoing tracking</div>
          <div style={{ fontSize: 34, fontWeight: 800, color: AMBER }}>
            ${PRICE_SUBSCRIPTION}
            <span style={{ fontSize: 14, fontWeight: 500 }}>/mo</span>
          </div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Re-scan as AI models retrain and your citation rate drifts
          </div>
        </a>
      </div>

      <p style={{ fontSize: 12, opacity: 0.55, marginTop: 16 }}>
        The core Canopy Guard audit stays free. This add-on is the only paid
        layer, and it exists because it answers a question the free signals
        cannot.
      </p>
    </section>
  );
}

const card: React.CSSProperties = {
  display: 'block',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(245,158,11,0.4)',
  borderRadius: 10,
  padding: 18,
  textDecoration: 'none',
  color: '#E7ECF4',
};
