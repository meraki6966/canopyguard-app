/**
 * subscriptionApi.ts
 * AEO Citation Layer: fetch helpers for the platform-hosted subscription
 * routes (questions, competitors, trend, alerts, competitor-comparison,
 * run-now). All share the same Authorization: Bearer <token> + domain
 * pattern, centralized here instead of repeated per component.
 */

const API =
  (import.meta as any).env?.VITE_API_URL ??
  'https://canopyguard-engine-production.up.railway.app';

function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return (data as { error?: string })?.error || fallback;
}

export interface QuestionSet {
  inferred: string[];
  typed: string[];
}

export async function getQuestions(domain: string, token: string): Promise<QuestionSet> {
  const res = await fetch(`${API}/api/citation/questions?domain=${encodeURIComponent(domain)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to load questions'));
  return res.json();
}

export async function putQuestions(domain: string, token: string, questions: string[]): Promise<string[]> {
  const res = await fetch(`${API}/api/citation/questions`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ domain, questions }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to save questions'));
  const data = await res.json();
  return data.typed as string[];
}

export interface Competitor {
  domain: string;
  brandName: string;
}

export async function getCompetitors(domain: string, token: string): Promise<Competitor[]> {
  const res = await fetch(`${API}/api/citation/competitors?domain=${encodeURIComponent(domain)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to load competitors'));
  const data = await res.json();
  return data.competitors as Competitor[];
}

export async function putCompetitors(domain: string, token: string, domains: string[]): Promise<Competitor[]> {
  const res = await fetch(`${API}/api/citation/competitors`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify({ domain, domains }),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to save competitors'));
  const data = await res.json();
  return data.competitors as Competitor[];
}

export interface TrendRow {
  check_date: string;
  provider: string;
  cited_count: string | number;
  total_count: string | number;
}

export async function getTrend(domain: string, token: string): Promise<TrendRow[]> {
  const res = await fetch(`${API}/api/citation/trend?domain=${encodeURIComponent(domain)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to load trend'));
  const data = await res.json();
  return data.trend as TrendRow[];
}

export interface AlertRow {
  provider: string;
  target_kind: 'primary' | 'competitor';
  target_domain: string;
  direction: 'gained' | 'lost';
  created_at: string;
}

export async function getAlerts(domain: string, token: string): Promise<AlertRow[]> {
  const res = await fetch(`${API}/api/citation/alerts?domain=${encodeURIComponent(domain)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to load alerts'));
  const data = await res.json();
  return data.alerts as AlertRow[];
}

export interface ComparisonRow {
  check_date: string;
  provider: string;
  target_domain: string;
  cited_count: string | number;
  total_count: string | number;
}

export async function getCompetitorComparison(domain: string, token: string): Promise<ComparisonRow[]> {
  const res = await fetch(`${API}/api/citation/competitor-comparison?domain=${encodeURIComponent(domain)}`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(await errorMessage(res, 'Failed to load competitor comparison'));
  const data = await res.json();
  return data.comparison as ComparisonRow[];
}

export async function runNow(domain: string, token: string): Promise<void> {
  const res = await fetch(`${API}/api/citation/run-now`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ domain }),
  });
  if (!res.ok && res.status !== 202) {
    throw new Error(await errorMessage(res, 'Failed to start run'));
  }
}
