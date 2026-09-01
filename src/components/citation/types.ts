/**
 * types.ts
 * AEO Citation Layer: shared frontend types
 */

export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'perplexity';

export interface ProviderKeySet {
  openai: string;
  anthropic: string;
  gemini: string;
  perplexity: string;
}

export interface ExtractedQuestion {
  question: string;
  source: 'faq-schema' | 'header' | 'meta-synthesized';
}

export interface CitationQuestionSet {
  url: string;
  brandName: string;
  domain: string;
  questions: ExtractedQuestion[];
  extractedAt: string;
  signals: {
    hasFaqSchema: boolean;
    questionHeaderCount: number;
    hasMetaDescription: boolean;
  };
}

export type MentionLevel = 'cited-with-link' | 'named' | 'absent';

export interface QuestionResult {
  provider: ProviderId;
  question: string;
  mention: MentionLevel;
  /** 0 = first thing mentioned, 1 = buried at the end. Null when absent. */
  prominence: number | null;
  /** First 400 chars of the model answer, for the report view. */
  answerExcerpt: string;
  error?: string;
}

export interface ProviderSummary {
  provider: ProviderId;
  asked: number;
  citedWithLink: number;
  named: number;
  absent: number;
  errored: number;
  /** 0 to 100 */
  score: number;
}

export interface CitationReport {
  brandName: string;
  domain: string;
  ranAt: string;
  results: QuestionResult[];
  providerSummaries: ProviderSummary[];
  /** 0 to 100 aggregate across providers that returned answers */
  overallScore: number;
}
