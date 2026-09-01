/**
 * StatusAlertBanner.tsx
 * AEO Citation Layer: recent citation status flips (gained/lost), per
 * provider and target. Subscription-only.
 */

import { useEffect, useState } from 'react';
import { PROVIDER_LABELS } from './providers';
import type { ProviderId } from './types';
import { getAlerts, type AlertRow } from './subscriptionApi';

const AMBER = '#F59E0B';

interface StatusAlertBannerProps {
  domain: string;
  token: string;
  refreshKey?: number;
}

export default function StatusAlertBanner({ domain, token, refreshKey }: StatusAlertBannerProps) {
  const [alerts, setAlerts] = useState<AlertRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getAlerts(domain, token);
        if (!cancelled) setAlerts(data);
      } catch {
        // Non-critical UI element — fail silently rather than block the dashboard.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [domain, token, refreshKey]);

  if (loading || !alerts.length) return null;

  return (
    <div style={panel}>
      <h3 style={h3}>Recent status changes</h3>
      <ul style={{ margin: 0, paddingLeft: 0, listStyle: 'none', fontSize: 13 }}>
        {alerts.map((a, i) => (
          <li key={i} style={{ marginBottom: 6 }}>
            <span style={{ color: a.direction === 'gained' ? '#34D399' : '#F87171', fontWeight: 700 }}>
              {a.direction === 'gained' ? '+ Gained' : '− Lost'}
            </span>{' '}
            citation on <strong>{PROVIDER_LABELS[a.provider as ProviderId] ?? a.provider}</strong>
            {a.target_kind === 'competitor' ? ` for ${a.target_domain}` : ''} —{' '}
            <span style={{ opacity: 0.6 }}>{new Date(a.created_at).toLocaleDateString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const panel: React.CSSProperties = {
  background: 'rgba(245,158,11,0.06)',
  border: `1px solid rgba(245,158,11,0.3)`,
  borderRadius: 10,
  padding: 16,
  margin: '12px 0',
};

const h3: React.CSSProperties = { margin: '0 0 8px', fontSize: 15, color: AMBER };
