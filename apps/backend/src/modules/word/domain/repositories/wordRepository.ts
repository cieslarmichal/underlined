import type { BookLanguage, NativeLanguage } from '../../../../common/types/language.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type { RememberCandidate, RememberOutcome, Word, WordOccurrence, WordsSummary } from '../types/word.ts';

export type WordSort = 'newest' | 'frequent';
export type WordStatus = 'active' | 'known' | 'all';

export interface FindWordsParams {
  readonly userId: string;
  readonly bookId?: string | undefined;
  readonly q?: string | undefined;
  readonly sort: WordSort;
  // Defaults to active words (not marked as known).
  readonly status?: WordStatus;
  readonly minEncounters?: number | undefined;
}

export interface SaveOccurrenceData {
  readonly userId: string;
  readonly bookId: string;
  readonly captureId: string;
  readonly sourceLanguage: BookLanguage;
  readonly targetLanguage: NativeLanguage;
  readonly lemma: string;
  readonly surfaceForm: string;
  readonly sentence: string;
  readonly translation: string;
}

export interface WordRepository {
  findMany(params: FindWordsParams): Promise<Word[]>;
  // Returns the number of saved occurrences per lowercased lemma.
  countOccurrencesByLemma(
    userId: string,
    sourceLanguage: BookLanguage,
    targetLanguage: NativeLanguage,
    lemmaKeys: string[],
  ): Promise<Map<string, number>>;
  // Adds the occurrence to the word (created when missing). Returns false when the same sentence is already saved.
  saveOccurrence(data: SaveOccurrenceData, tx: Transaction): Promise<boolean>;
  // Active words with at least one occurrence (in the given book, when set).
  findRememberCandidates(userId: string, bookId?: string): Promise<RememberCandidate[]>;
  findOccurrences(wordId: string, bookId?: string): Promise<WordOccurrence[]>;
  recordShown(id: string, userId: string, outcome: RememberOutcome, now: Date): Promise<boolean>;
  setKnown(id: string, userId: string, known: boolean): Promise<boolean>;
  getSummary(userId: string, since: Date): Promise<WordsSummary>;
  updateOccurrenceTranslation(id: string, userId: string, translation: string): Promise<boolean>;
  deleteWord(id: string, userId: string): Promise<boolean>;
  deleteWordFromBook(wordId: string, bookId: string, userId: string): Promise<boolean>;
}
