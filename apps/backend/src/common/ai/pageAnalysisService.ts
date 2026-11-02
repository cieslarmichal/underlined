import type { BookLanguage, NativeLanguage } from '../types/language.ts';

export interface AnalyzePagePayload {
  readonly image: Buffer;
  readonly imageMimeType: string;
  readonly bookTitle: string;
  readonly bookAuthor: string | null;
  readonly bookLanguage: BookLanguage;
  readonly nativeLanguage: NativeLanguage;
}

export interface UnderlinedWord {
  readonly surfaceForm: string;
  readonly lemma: string;
  readonly sentence: string;
  readonly translation: string;
}

export interface AnalysisUsage {
  readonly model: string;
  readonly promptTokens: number;
  readonly completionTokens: number;
  // Cost in USD as reported by the provider; null when it did not report one.
  readonly costUsd: number | null;
  readonly durationMs: number;
}

export interface PageAnalysis {
  readonly words: UnderlinedWord[];
  readonly usage: AnalysisUsage;
}

export interface PageAnalysisService {
  analyzePage(payload: AnalyzePagePayload): Promise<PageAnalysis>;
}
