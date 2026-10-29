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
  // Set when the reader marked the word as known.
  readonly knownAt: Date | null;
  // Number of occurrences across all books.
  readonly encounters: number;
  // Occurrences matching the book filter (all of them when no book filter is set).
  readonly occurrences: WordOccurrence[];
}

export type RememberOutcome = 'recalled' | 'not_yet' | 'known';

export interface RememberCandidate {
  readonly id: string;
  readonly lemma: string;
  readonly encounters: number;
  readonly lastShownAt: Date | null;
  readonly lastOutcome: RememberOutcome | null;
}

// A single word with one of its sentences, shown to the reader as a gentle reminder.
export interface RememberCard {
  readonly wordId: string;
  readonly lemma: string;
  readonly encounters: number;
  readonly sentence: string;
  readonly surfaceForm: string;
  readonly translation: string;
  readonly bookTitle: string;
}

export interface WordsSummary {
  readonly newWords: number;
  readonly metAgain: number;
  readonly totalWords: number;
  readonly knownWords: number;
}
