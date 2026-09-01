/**
 * scoring.ts
 * AEO Citation Layer: mention detection and scoring
 *
 * Scoring model per answer:
 *   cited-with-link  -> domain appears in the answer (strongest signal)
 *   named            -> brand name appears, no domain
 *   absent           -> neither appears
 *
 * Per-provider score (0 to 100):
 *   cited-with-link = 100 points, named = 60 points, absent = 0
 *   Prominence bonus: first-third mentions add up to 10 points (capped at 100)
 *
 * Overall score: mean of provider scores that returned at least one answer.
 *
 * detectMention below is duplicated (with a structured-source-first
 * detection path added) in canopyguard-engine/modules/citationMatching.ts
 * for the server-side platform-hosted check path — there is no shared
 * package between the two repos, so tuning this heuristic here does not
 * automatically propagate there.
 */

import type {
  MentionLevel,
  ProviderId,
  ProviderSummary,
  QuestionResult,
} from './types';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectMention(
  answer: string,
  brandName: string,
  domain: string
): { mention: MentionLevel; prominence: number | null } {
  if (!answer) return { mention: 'absent', prominence: null };

  const lower = answer.toLowerCase();
  const bareDomain = domain.replace(/^www\./, '').toLowerCase();
  const brand = brandName.toLowerCase();

  const domainIdx = lower.indexOf(bareDomain);
  // Word-boundary brand match so "Canopy" doesn't fire on "canopies"
  const brandRegex = new RegExp(`\\b${escapeRegex(brand)}\\b`, 'i');
  const brandMatch = brandRegex.exec(answer);
  const brandIdx = brandMatch ? brandMatch.index : -1;

  if (domainIdx >= 0) {
    return {
      mention: 'cited-with-link',
      prominence: domainIdx / Math.max(answer.length, 1),
    };
  }
  if (brandIdx >= 0) {
    return {
      mention: 'named',
      prominence: brandIdx / Math.max(answer.length, 1),
    };
  }
  return { mention: 'absent', prominence: null };
}

const MENTION_POINTS: Record<MentionLevel, number> = {
  'cited-with-link': 100,
  named: 60,
  absent: 0,
};

export function summarizeProvider(
  provider: ProviderId,
  results: QuestionResult[]
): ProviderSummary {
  const mine = results.filter((r) => r.provider === provider);
  const answered = mine.filter((r) => !r.error);

  let points = 0;
  for (const r of answered) {
    let p = MENTION_POINTS[r.mention];
    if (r.prominence !== null && r.prominence <= 0.33 && p > 0) {
      p = Math.min(100, p + 10);
    }
    points += p;
  }

  return {
    provider,
    asked: mine.length,
    citedWithLink: mine.filter((r) => r.mention === 'cited-with-link').length,
    named: mine.filter((r) => r.mention === 'named').length,
    absent: answered.filter((r) => r.mention === 'absent').length,
    errored: mine.filter((r) => Boolean(r.error)).length,
    score: answered.length ? Math.round(points / answered.length) : 0,
  };
}

export function computeOverallScore(summaries: ProviderSummary[]): number {
  const active = summaries.filter((s) => s.asked - s.errored > 0);
  if (!active.length) return 0;
  return Math.round(
    active.reduce((acc, s) => acc + s.score, 0) / active.length
  );
}
