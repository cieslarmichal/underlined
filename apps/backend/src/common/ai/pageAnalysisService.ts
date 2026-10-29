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

export interface PageAnalysisService {
  analyzePage(payload: AnalyzePagePayload): Promise<UnderlinedWord[]>;
}
