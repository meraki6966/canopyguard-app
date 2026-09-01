/**
 * CompetitorComparison.tsx
 * AEO Citation Layer: side-by-side citation comparison against up to 2
 * competitor domains (configured in SubscriberSettings). Its own view,
 * not bolted onto the single-domain trend. Subscription-only.
 */

import { useEffect, useState } from 'react';
import { PROVIDER_LABELS } from './providers';
import type { ProviderId } from './types';
import { getCompetitorComparison, type ComparisonRow } from './subscriptionApi';

interface CompetitorComparisonProps {
  domain: string;
  token: string;
  refreshKey?: number;
}

export default function CompetitorComparison({ domain, token, refreshKey }: CompetitorComparisonProps) {
  const [rows, setRows] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getCompetitorComparison(domain, token);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setErrorMsg(err instanceof Error ? err.message : 'Failed to load comparison.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [domain, token, refreshKey]);

  if (loading) return <p style={{ fontSize: 13, opacity: 0.7 }}>Loading comparison...</p>;
  if (errorMsg) return <p style={{ color: '#F87171', fontSize: 13 }}>{errorMsg}</p>;
  if (!rows.length) {
    return (
      <p style={{ fontSize: 13, opacity: 0.7 }}>
        No competitor data yet — add competitor domains in Settings, then run a check.
      </p>
    );
  }

  const latestDate = rows.reduce((max, r) => (r.check_date > max ? r.check_date : max), rows[0].check_date);
  const latestRows = rows.filter((r) => r.check_date === latestDate);
  const competitorDomains = Array.from(new Set(latestRows.map((r) => r.target_domain)));
  const providers = Array.from(new Set(latestRows.map((r) => r.provider))) as ProviderId[];
  const cellFor = (competitorDomain: string, provider: string) =>
    latestRows.find((r) => r.target_domain === competitorDomain && r.provider === provider);

  return (
    <div>
      <p style={{ fontSize: 12, opacity: 0.6, marginTop: 0 }}>Latest check: {latestDate}</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', opacity: 0.7 }}>
              <th style={td}>Competitor</th>
              {providers.map((p) => (
                <th key={p} style={td}>
                  {PROVIDER_LABELS[p] ?? p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {competitorDomains.map((cd) => (
              <tr key={cd} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <td style={td}>{cd}</td>
                {providers.map((p) => {
                  const cell = cellFor(cd, p);
                  return (
                    <td key={p} style={td}>
                      {cell ? `${cell.cited_count}/${cell.total_count}` : '—'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const td: React.CSSProperties = { padding: '6px 8px', verticalAlign: 'top' };
