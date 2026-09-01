/**
 * SubscriberSettings.tsx
 * AEO Citation Layer: subscription settings — typed questions (up to 3,
 * carried over month to month unless edited) and competitor domains (up to
 * 2, for the Competitor Comparison view). Subscription-only.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  getCompetitors,
  getQuestions,
  putCompetitors,
  putQuestions,
} from './subscriptionApi';

const NAVY = '#0B1426';
const AMBER = '#F59E0B';

const MAX_TYPED_QUESTIONS = 3;
const MAX_COMPETITOR_DOMAINS = 2;

interface SubscriberSettingsProps {
  domain: string;
  token: string;
}

export default function SubscriberSettings({ domain, token }: SubscriberSettingsProps) {
  const [inferred, setInferred] = useState<string[]>([]);
  const [typedQuestions, setTypedQuestions] = useState<string[]>(['', '', '']);
  const [competitors, setCompetitors] = useState<string[]>(['', '']);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<'questions' | 'competitors' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [questionSet, competitorList] = await Promise.all([
          getQuestions(domain, token),
          getCompetitors(domain, token),
        ]);
        if (cancelled) return;
        setInferred(questionSet.inferred);
        const padded = [...questionSet.typed, '', '', ''].slice(0, MAX_TYPED_QUESTIONS);
        setTypedQuestions(padded);
        const paddedCompetitors = [...competitorList.map((c) => c.domain), '', ''].slice(0, MAX_COMPETITOR_DOMAINS);
        setCompetitors(paddedCompetitors);
      } catch (err) {
        if (!cancelled) setErrorMsg(err instanceof Error ? err.message : 'Failed to load settings.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [domain, token]);

  const saveQuestions = useCallback(async () => {
    setSaving('questions');
    setErrorMsg('');
    setSavedMsg('');
    try {
      const cleaned = typedQuestions.map((q) => q.trim()).filter(Boolean);
      const saved = await putQuestions(domain, token, cleaned);
      const padded = [...saved, '', '', ''].slice(0, MAX_TYPED_QUESTIONS);
      setTypedQuestions(padded);
      setSavedMsg('Questions saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save questions.');
    } finally {
      setSaving(null);
    }
  }, [domain, token, typedQuestions]);

  const saveCompetitors = useCallback(async () => {
    setSaving('competitors');
    setErrorMsg('');
    setSavedMsg('');
    try {
      const cleaned = competitors.map((d) => d.trim()).filter(Boolean);
      const saved = await putCompetitors(domain, token, cleaned);
      const padded = [...saved.map((c) => c.domain), '', ''].slice(0, MAX_COMPETITOR_DOMAINS);
      setCompetitors(padded);
      setSavedMsg('Competitors saved.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save competitors.');
    } finally {
      setSaving(null);
    }
  }, [domain, token, competitors]);

  if (loading) {
    return <p style={{ fontSize: 13, opacity: 0.7 }}>Loading settings...</p>;
  }

  return (
    <div>
      <div style={panel}>
        <h3 style={h3}>Questions we ask automatically</h3>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, opacity: 0.85 }}>
          {inferred.length ? (
            inferred.map((q) => <li key={q}>{q}</li>)
          ) : (
            <li style={{ opacity: 0.6 }}>None extracted yet — re-run a check to refresh these.</li>
          )}
        </ul>
      </div>

      <div style={panel}>
        <h3 style={h3}>Your own questions (up to {MAX_TYPED_QUESTIONS})</h3>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 0 }}>
          These carry over month to month so the trend view compares the same questions over time,
          unless you edit them here.
        </p>
        {typedQuestions.map((q, i) => (
          <input
            key={i}
            type="text"
            value={q}
            placeholder={`Question ${i + 1} (optional)`}
            onChange={(e) => {
              const next = [...typedQuestions];
              next[i] = e.target.value;
              setTypedQuestions(next);
            }}
            style={inputStyle}
          />
        ))}
        <button onClick={saveQuestions} disabled={saving === 'questions'} style={btnPrimary}>
          {saving === 'questions' ? 'Saving...' : 'Save questions'}
        </button>
      </div>

      <div style={panel}>
        <h3 style={h3}>Competitor domains (up to {MAX_COMPETITOR_DOMAINS})</h3>
        <p style={{ fontSize: 12, opacity: 0.7, marginTop: 0 }}>
          Feeds the Competitor Comparison tab — checked against the same questions on your next run.
        </p>
        {competitors.map((d, i) => (
          <input
            key={i}
            type="text"
            value={d}
            placeholder={`competitor${i + 1}.com (optional)`}
            onChange={(e) => {
              const next = [...competitors];
              next[i] = e.target.value;
              setCompetitors(next);
            }}
            style={inputStyle}
          />
        ))}
        <button onClick={saveCompetitors} disabled={saving === 'competitors'} style={btnPrimary}>
          {saving === 'competitors' ? 'Saving...' : 'Save competitors'}
        </button>
      </div>

      {errorMsg && <p style={{ color: '#F87171', fontSize: 13 }}>{errorMsg}</p>}
      {savedMsg && <p style={{ color: '#34D399', fontSize: 13 }}>{savedMsg}</p>}
    </div>
  );
}

const panel: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 10,
  padding: 16,
  margin: '12px 0',
};

const h3: React.CSSProperties = { margin: '0 0 8px', fontSize: 15, color: '#E7ECF4' };

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#E7ECF4',
  padding: '8px 10px',
  fontSize: 13,
  boxSizing: 'border-box',
  marginBottom: 8,
};

const btnPrimary: React.CSSProperties = {
  background: AMBER,
  color: NAVY,
  border: 'none',
  borderRadius: 8,
  padding: '10px 18px',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
};
