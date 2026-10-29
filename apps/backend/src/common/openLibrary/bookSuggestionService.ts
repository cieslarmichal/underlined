import type { BookLanguage } from '../types/language.ts';

export interface BookSuggestion {
  readonly title: string;
  readonly author: string | null;
  readonly year: number | null;
}

export interface BookSuggestionService {
  search(query: string, language?: BookLanguage): Promise<BookSuggestion[]>;
}
