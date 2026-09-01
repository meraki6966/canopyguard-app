/**
 * SubscriptionDashboard.tsx
 * AEO Citation Layer: the $14.99/mo subscription surface. Rendered by
 * UnlockGate when plan === 'subscription'. Tabs:
 *   - Manual Scan: the existing BYOK CitationScan, untouched — subscribers
 *     keep this as a bonus, but trend data comes only from platform runs.
 *   - Automated Tracking: trend + status alerts + a manual "run now" trigger
 *     for the platform-hosted (server-side keys) check.
 *   - Competitor Comparison: its own tab, not bolted onto the single-domain
 *     trend.
 *   - Settings: typed questions + competitor domains.
 */

import { useCallback, useState } from 'react';
import CitationScan from './CitationScan';
import TrendView from './TrendView';
import StatusAlertBanner from './StatusAlertBanner';
import CompetitorComparison from './CompetitorComparison';
import SubscriberSettings from './SubscriberSettings';
import { runNow } from './subscriptionApi';

const NAVY = '#0B1426';
const AMBER = '#F59E0B';

type Tab = 'tracking' | 'scan' | 'comparison' | 'settings';

interface SubscriptionDashboardProps {
  auditedUrl: string;
  domain: string;
  token: string;
}

export default function SubscriptionDashboard({ auditedUrl, domain, token }: SubscriptionDashboardProps) {
  const [tab, setTab] = useState<Tab>('tracking');
  const [running, setRunning] = useState(false);
  const [runMsg, setRunMsg] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRunNow = useCallback(async () => {
    setRunning(true);
    setRunMsg('');
    try {
      await runNow(domain, token);
      setRunMsg('Check started — this can take a minute or two. Refresh the tracking view shortly.');
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setRunMsg(err instanceof Error ? err.message : 'Failed to start check.');
    } finally {
      setRunning(false);
    }
  }, [domain, token]);

  return (
    <section style={{ background: NAVY, color: '#E7ECF4', borderRadius: 12, padding: 24, fontFamily: 'inherit' }}>
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>
          AI Citation Tracking
          <span
            style={{
              marginLeft: 10,
              fontSize: 12,
              background: AMBER,
              color: NAVY,
              borderRadius: 6,
              padding: '2px 8px',
              verticalAlign: 'middle',
              fontWeight: 700,
            }}
          >
            SUBSCRIPTION
          </span>
        </h2>
        <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: 14 }}>
          Automated monthly checks across ChatGPT, Gemini, Perplexity, and Claude — tracked over time.
        </p>
      </header>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(
          [
            ['tracking', 'Automated Tracking'],
            ['scan', 'Manual Scan'],
            ['comparison', 'Competitor Comparison'],
            ['settings', 'Settings'],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              ...tabButton,
              background: tab === key ? AMBER : 'rgba(255,255,255,0.06)',
              color: tab === key ? NAVY : '#E7ECF4',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tracking' && (
        <div>
          <button onClick={handleRunNow} disabled={running} style={btnPrimary}>
            {running ? 'Starting...' : 'Run check now'}
          </button>
          {runMsg && <p style={{ fontSize: 13, opacity: 0.85, marginTop: 8 }}>{runMsg}</p>}
          <div style={{ marginTop: 16 }}>
            <StatusAlertBanner domain={domain} token={token} refreshKey={refreshKey} />
            <div style={panel}>
              <h3 style={h3}>Citation trend</h3>
              <TrendView domain={domain} token={token} refreshKey={refreshKey} />
            </div>
          </div>
        </div>
      )}

      {tab === 'scan' && <CitationScan auditedUrl={auditedUrl} />}

      {tab === 'comparison' && (
        <div style={panel}>
          <CompetitorComparison domain={domain} token={token} refreshKey={refreshKey} />
        </div>
      )}

      {tab === 'settings' && <SubscriberSettings domain={domain} token={token} />}
    </section>
  );
}

const tabButton: React.CSSProperties = {
  border: 'none',
  borderRadius: 8,
  padding: '8px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};

const btnPrimary: React.CSSProperties = {
  background: AMBER,
  color: NAVY,
  border: 'none',
  borderRadius: 8,
  padding: '12px 20px',
  fontWeight: 700,
  fontSize: 14,
  cursor: 'pointer',
};

const panel: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: 16,
  margin: '12px 0',
};

const h3: React.CSSProperties = { margin: '0 0 8px', fontSize: 15 };
