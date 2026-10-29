import type { BookLanguage, NativeLanguage } from '../../../../common/types/language.ts';

export interface WordOccurrence {
  readonly id: string;
  readonly bookId: string;
  readonly bookTitle: string;
  readonly surfaceForm: string;
  readonly sentence: string;
  readonly translation: string;
  readonly createdAt: Date;
}

export interface Word {
  readonly id: string;
  readonly lemma: string;
  readonly sourceLanguage: BookLanguage;
  readonly targetLanguage: NativeLanguage;
  readonly createdAt: Date;
  // Number of occurrences across all books.
  readonly encounters: number;
  // Occurrences matching the book filter (all of them when no book filter is set).
  readonly occurrences: WordOccurrence[];
}
