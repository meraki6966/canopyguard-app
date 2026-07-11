/**
 * providers.ts
 * AEO Citation Layer: BYOK client-side model callers
 *
 * Security posture:
 *   - Keys live in React state only. Never localStorage, never sessionStorage,
 *     never sent to canopyguard-engine, never logged.
 *   - Every fetch below targets the provider's official API endpoint directly.
 *     Users can verify this themselves in the browser Network tab, and the UI
 *     tells them to.
 */

import type { ProviderId } from './types';

const ANSWER_MAX_TOKENS = 600;

export interface ProviderCallResult {
  text: string;
  error?: string;
}

/**
 * The prompt intentionally mirrors how a real user asks a discovery question.
 * No brand priming: the model must surface the brand on its own for the
 * result to count.
 */
function buildUserPrompt(question: string): string {
  return `${question}\n\nPlease name specific companies, tools, or websites in your answer when relevant.`;
}

async function safeJson(res: Response): Promise<Record<string, any>> {
  try {
    return (await res.json()) as Record<string, any>;
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------

export async function callOpenAI(
  key: string,
  question: string
): Promise<ProviderCallResult> {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: ANSWER_MAX_TOKENS,
        messages: [{ role: 'user', content: buildUserPrompt(question) }],
      }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return { text: '', error: data?.error?.message || `OpenAI ${res.status}` };
    }
    return { text: data?.choices?.[0]?.message?.content ?? '' };
  } catch (err) {
    return { text: '', error: err instanceof Error ? err.message : 'OpenAI request failed' };
  }
}

// ---------------------------------------------------------------------------
// Anthropic
// ---------------------------------------------------------------------------

export async function callAnthropic(
  key: string,
  question: string
): Promise<ProviderCallResult> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        // Required for direct browser calls. This is the documented header
        // for client-side use; the user is knowingly using their own key.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-fable-5',
        max_tokens: ANSWER_MAX_TOKENS,
        messages: [{ role: 'user', content: buildUserPrompt(question) }],
      }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return { text: '', error: data?.error?.message || `Anthropic ${res.status}` };
    }
    const text = Array.isArray(data?.content)
      ? data.content
          .filter((b: any) => b?.type === 'text')
          .map((b: any) => b.text)
          .join('\n')
      : '';
    return { text };
  } catch (err) {
    return { text: '', error: err instanceof Error ? err.message : 'Anthropic request failed' };
  }
}

// ---------------------------------------------------------------------------
// Google Gemini
// ---------------------------------------------------------------------------

export async function callGemini(
  key: string,
  question: string
): Promise<ProviderCallResult> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildUserPrompt(question) }] }],
          generationConfig: { maxOutputTokens: ANSWER_MAX_TOKENS },
        }),
      }
    );
    const data = await safeJson(res);
    if (!res.ok) {
      return { text: '', error: data?.error?.message || `Gemini ${res.status}` };
    }
    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((p: any) => p?.text ?? '')
        .join('\n') ?? '';
    return { text };
  } catch (err) {
    return { text: '', error: err instanceof Error ? err.message : 'Gemini request failed' };
  }
}

// ---------------------------------------------------------------------------
// Perplexity
// ---------------------------------------------------------------------------

export async function callPerplexity(
  key: string,
  question: string
): Promise<ProviderCallResult> {
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'sonar',
        max_tokens: ANSWER_MAX_TOKENS,
        messages: [{ role: 'user', content: buildUserPrompt(question) }],
      }),
    });
    const data = await safeJson(res);
    if (!res.ok) {
      return { text: '', error: data?.error?.message || `Perplexity ${res.status}` };
    }
    return { text: data?.choices?.[0]?.message?.content ?? '' };
  } catch (err) {
    return { text: '', error: err instanceof Error ? err.message : 'Perplexity request failed' };
  }
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------

export const PROVIDER_CALLERS: Record<
  ProviderId,
  (key: string, question: string) => Promise<ProviderCallResult>
> = {
  openai: callOpenAI,
  anthropic: callAnthropic,
  gemini: callGemini,
  perplexity: callPerplexity,
};

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  openai: 'ChatGPT (OpenAI)',
  anthropic: 'Claude (Anthropic)',
  gemini: 'Gemini (Google)',
  perplexity: 'Perplexity',
};
