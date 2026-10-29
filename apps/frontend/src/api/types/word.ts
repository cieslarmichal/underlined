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
  readonly encounters: number;
  readonly occurrences: WordOccurrence[];
  readonly createdAt: string;
}

export type WordSort = 'newest' | 'frequent';
