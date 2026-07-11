/**
 * CitationScan.tsx
 * AEO Citation Layer: main scan UI
 *
 * Flow:
 *   1. Component receives the audited site URL (from the completed core audit)
 *   2. Fetches the extracted question set from canopyguard-engine
 *   3. User enters their own API keys (any subset of the four providers)
 *   4. Scan runs client side, sequentially per provider with a small delay
 *   5. Results render as a per-provider scorecard plus a per-question table
 *
 * Keys are held in React state only. Not persisted anywhere. The UI says so
 * and invites the user to verify in the Network tab.
 */

import { useCallback, useMemo, useState } from 'react';
import type {
  CitationQuestionSet,
  CitationReport,
  ProviderId,
  ProviderKeySet,
  QuestionResult,
} from './types';
import { PROVIDER_CALLERS, PROVIDER_LABELS } from './providers';
import {
  computeOverallScore,
  detectMention,
  summarizeProvider,
} from './scoring';
import { getStoredUnlock } from './unlockStorage';

const NAVY = '#0B1426';
const AMBER = '#F59E0B';

const PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'gemini', 'perplexity'];
const CALL_DELAY_MS = 400;

/** Engine base URL: same env var + production fallback the rest of canopyguard-app uses. */
const API =
  (import.meta as any).env?.VITE_API_URL ??
  'https://canopyguard-engine-production.up.railway.app';

interface CitationScanProps {
  /** URL of the site that just completed the free core audit */
  auditedUrl: string;
}

type Phase = 'idle' | 'extracting' | 'ready' | 'scanning' | 'done' | 'error';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function CitationScan({ auditedUrl }: CitationScanProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [questionSet, setQuestionSet] = useState<CitationQuestionSet | null>(null);
  const [keys, setKeys] = useState<ProviderKeySet>({
    openai: '',
    anthropic: '',
    gemini: '',
    perplexity: '',
  });
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [report, setReport] = useState<CitationReport | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const domain = useMemo(() => {
    try {
      return new URL(auditedUrl).hostname;
    } catch {
      return '';
    }
  }, [auditedUrl]);

  const activeProviders = useMemo(
    () => PROVIDERS.filter((p) => keys[p].trim().length > 0),
    [keys]
  );

  const extractQuestions = useCallback(async () => {
    setPhase('extracting');
    setErrorMsg('');
    try {
      const stored = domain ? getStoredUnlock(domain) : null;
      const res = await fetch(`${API}/api/citation/extract-questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(stored ? { Authorization: `Bearer ${stored.token}` } : {}),
        },
        body: JSON.stringify({ url: auditedUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Extraction failed.');
      setQuestionSet(data as CitationQuestionSet);
      setPhase('ready');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Extraction failed.');
      setPhase('error');
    }
  }, [auditedUrl, domain]);

  const runScan = useCallback(async () => {
    if (!questionSet || activeProviders.length === 0) return;
    setPhase('scanning');

    const total = activeProviders.length * questionSet.questions.length;
    setProgress({ done: 0, total });

    const results: QuestionResult[] = [];
    let done = 0;

    for (const provider of activeProviders) {
      const call = PROVIDER_CALLERS[provider];
      const key = keys[provider].trim();

      for (const q of questionSet.questions) {
        const { text, error } = await call(key, q.question);
        const { mention, prominence } = detectMention(
          text,
          questionSet.brandName,
          questionSet.domain
        );
        results.push({
          provider,
          question: q.question,
          mention: error ? 'absent' : mention,
          prominence: error ? null : prominence,
          answerExcerpt: text.slice(0, 400),
          ...(error ? { error } : {}),
        });
        done += 1;
        setProgress({ done, total });
        await sleep(CALL_DELAY_MS);
      }
    }

    const providerSummaries = activeProviders.map((p) =>
      summarizeProvider(p, results)
    );

    setReport({
      brandName: questionSet.brandName,
      domain: questionSet.domain,
      ranAt: new Date().toISOString(),
      results,
      providerSummaries,
      overallScore: computeOverallScore(providerSummaries),
    });
    setPhase('done');
  }, [questionSet, activeProviders, keys]);

  return (
    <section
      style={{
        background: NAVY,
        color: '#E7ECF4',
        borderRadius: 12,
        padding: 24,
        fontFamily: 'inherit',
      }}
    >
      <header style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>
          AI Citation Scan
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
            ADD-ON
          </span>
        </h2>
        <p style={{ margin: '8px 0 0', opacity: 0.85, fontSize: 14 }}>
          Tests whether ChatGPT, Claude, Gemini, and Perplexity actually mention{' '}
          <strong>{questionSet?.brandName ?? 'your brand'}</strong> when asked
          the questions your site already claims to answer.
        </p>
      </header>

      {/* Step 1: extract */}
      {(phase === 'idle' || phase === 'extracting' || phase === 'error') && (
        <div>
          <button
            onClick={extractQuestions}
            disabled={phase === 'extracting'}
            style={btnPrimary}
          >
            {phase === 'extracting'
              ? 'Reading your site...'
              : 'Step 1: Pull questions from your site'}
          </button>
          {errorMsg && (
            <p style={{ color: '#F87171', fontSize: 13 }}>{errorMsg}</p>
          )}
        </div>
      )}

      {/* Step 2: keys + run */}
      {questionSet && (phase === 'ready' || phase === 'scanning') && (
        <div>
          <div style={panel}>
            <h3 style={h3}>Questions pulled from {questionSet.domain}</h3>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {questionSet.questions.map((q) => (
                <li key={q.question} style={{ marginBottom: 4 }}>
                  {q.question}{' '}
                  <em style={{ opacity: 0.5, fontStyle: 'normal', fontSize: 11 }}>
                    ({q.source})
                  </em>
                </li>
              ))}
            </ul>
          </div>

          <div style={panel}>
            <h3 style={h3}>Step 2: Your API keys</h3>
            <p style={{ fontSize: 13, opacity: 0.85, marginTop: 0 }}>
              Bring your own keys. They stay in this page's memory only. Nothing
              is saved, nothing is sent to Canopy Guard's servers, and every
              request goes straight from your browser to the provider. Open your
              browser's dev tools, watch the Network tab while the scan runs,
              and verify it yourself. We built it that way on purpose.
            </p>
            {PROVIDERS.map((p) => (
              <div key={p} style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, display: 'block', marginBottom: 2 }}>
                  {PROVIDER_LABELS[p]}
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={keys[p]}
                  onChange={(e) =>
                    setKeys((prev) => ({ ...prev, [p]: e.target.value }))
                  }
                  placeholder="Paste key (optional)"
                  style={inputStyle}
                />
              </div>
            ))}
            <p style={{ fontSize: 12, opacity: 0.6 }}>
              Run with one provider or all four. Each provider bills its own
              account directly. A scan of {questionSet.questions.length} questions
              costs pennies per provider at current rates.
            </p>
          </div>

          <button
            onClick={runScan}
            disabled={phase === 'scanning' || activeProviders.length === 0}
            style={btnPrimary}
          >
            {phase === 'scanning'
              ? `Scanning... ${progress.done}/${progress.total}`
              : `Run scan across ${activeProviders.length} provider${activeProviders.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {/* Step 3: report */}
      {report && phase === 'done' && (
        <div>
          <div style={{ ...panel, textAlign: 'center' }}>
            <div style={{ fontSize: 13, opacity: 0.8 }}>AI Citation Score</div>
            <div
              style={{
                fontSize: 56,
                fontWeight: 800,
                color: report.overallScore >= 60 ? '#34D399' : AMBER,
              }}
            >
              {report.overallScore}
            </div>
            <div style={{ fontSize: 12, opacity: 0.6 }}>
              {report.brandName} across {report.providerSummaries.length} AI
              engines
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))' }}>
            {report.providerSummaries.map((s) => (
              <div key={s.provider} style={panel}>
                <strong style={{ fontSize: 13 }}>{PROVIDER_LABELS[s.provider]}</strong>
                <div style={{ fontSize: 28, fontWeight: 700, color: AMBER }}>
                  {s.score}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>
                  {s.citedWithLink} cited with link, {s.named} named,{' '}
                  {s.absent} absent
                  {s.errored > 0 ? `, ${s.errored} errored` : ''}
                </div>
              </div>
            ))}
          </div>

          <div style={panel}>
            <h3 style={h3}>Question detail</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', opacity: 0.7 }}>
                    <th style={td}>Provider</th>
                    <th style={td}>Question</th>
                    <th style={td}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((r, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                      <td style={td}>{PROVIDER_LABELS[r.provider]}</td>
                      <td style={td}>{r.question}</td>
                      <td style={{ ...td, whiteSpace: 'nowrap' }}>
                        {r.error
                          ? `Error: ${r.error}`
                          : r.mention === 'cited-with-link'
                            ? 'Cited with link'
                            : r.mention === 'named'
                              ? 'Named, no link'
                              : 'Not mentioned'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

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

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 6,
  color: '#E7ECF4',
  padding: '8px 10px',
  fontSize: 13,
  boxSizing: 'border-box',
};

const td: React.CSSProperties = { padding: '6px 8px', verticalAlign: 'top' };
