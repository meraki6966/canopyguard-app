/**
 * TrendView.tsx
 * AEO Citation Layer: subscription trend view — cited/total questions per
 * provider, per check, over time. Plain table — no charting library exists
 * in this project and the data is simple enough not to need one.
 */

import { useEffect, useState } from 'react';
import { PROVIDER_LABELS } from './providers';
import type { ProviderId } from './types';
import { getTrend, type TrendRow } from './subscriptionApi';

interface TrendViewProps {
  domain: string;
  token: string;
  /** Bumped by the parent after a manual run completes, to trigger a refetch. */
  refreshKey?: number;
}

export default function TrendView({ domain, token, refreshKey }: TrendViewProps) {
  const [rows, setRows] = useState<TrendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getTrend(domain, token);
        if (!cancelled) setRows(data);
      } catch (err) {
        if (!cancelled) setErrorMsg(err instanceof Error ? err.message : 'Failed to load trend.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [domain, token, refreshKey]);

  if (loading) return <p style={{ fontSize: 13, opacity: 0.7 }}>Loading trend...</p>;
  if (errorMsg) return <p style={{ color: '#F87171', fontSize: 13 }}>{errorMsg}</p>;
  if (!rows.length) {
    return <p style={{ fontSize: 13, opacity: 0.7 }}>No checks yet — run one to start tracking.</p>;
  }

  const checkDates = Array.from(new Set(rows.map((r) => r.check_date))).sort();
  const providers = Array.from(new Set(rows.map((r) => r.provider))) as ProviderId[];
  const cellFor = (date: string, provider: string) => rows.find((r) => r.check_date === date && r.provider === provider);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', opacity: 0.7 }}>
            <th style={td}>Check date</th>
            {providers.map((p) => (
              <th key={p} style={td}>
                {PROVIDER_LABELS[p] ?? p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {checkDates.map((date) => (
            <tr key={date} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <td style={td}>{date}</td>
              {providers.map((p) => {
                const cell = cellFor(date, p);
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
  );
}

const td: React.CSSProperties = { padding: '6px 8px', verticalAlign: 'top' };
