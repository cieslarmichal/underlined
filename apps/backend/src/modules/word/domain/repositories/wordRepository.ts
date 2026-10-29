import type { BookLanguage, NativeLanguage } from '../../../../common/types/language.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type { Word } from '../types/word.ts';

export type WordSort = 'newest' | 'frequent';

export interface FindWordsParams {
  readonly userId: string;
  readonly bookId?: string | undefined;
  readonly q?: string | undefined;
  readonly sort: WordSort;
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
  updateOccurrenceTranslation(id: string, userId: string, translation: string): Promise<boolean>;
  deleteWord(id: string, userId: string): Promise<boolean>;
  deleteWordFromBook(wordId: string, bookId: string, userId: string): Promise<boolean>;
}
