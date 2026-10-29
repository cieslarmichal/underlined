export interface WordOccurrence {
  readonly id: string;
  readonly bookId: string;
  readonly bookTitle: string;
  readonly surfaceForm: string;
  readonly sentence: string;
  readonly translation: string;
  readonly createdAt: string;
}

export interface Word {
  readonly id: string;
  readonly lemma: string;
  readonly sourceLanguage: string;
  readonly targetLanguage: string;
  readonly known: boolean;
  readonly occurrences: WordOccurrence[];
  readonly createdAt: string;
}

export type WordSort = 'newest' | 'frequent';

export type WordStatus = 'active' | 'known' | 'all';

export type RememberOutcome = 'recalled' | 'not_yet' | 'known';

// A word shown as a gentle reminder, with up to two of its sentences from the book.
export interface RememberCard {
  readonly wordId: string;
  readonly lemma: string;
  readonly sentences: { readonly sentence: string; readonly surfaceForm: string }[];
  readonly translations: string[];
}

export interface WordsSummary {
  readonly newWords: number;
  readonly totalWords: number;
  readonly knownWords: number;
}
