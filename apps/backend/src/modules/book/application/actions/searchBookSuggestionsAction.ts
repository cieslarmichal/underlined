import type { BookSuggestion, BookSuggestionService } from '../../../../common/openLibrary/bookSuggestionService.ts';
import type { BookLanguage } from '../../../../common/types/language.ts';

const minQueryLength = 2;

export class SearchBookSuggestionsAction {
  private readonly bookSuggestionService: BookSuggestionService;

  public constructor(bookSuggestionService: BookSuggestionService) {
    this.bookSuggestionService = bookSuggestionService;
  }

  public async execute(query: string, language?: BookLanguage): Promise<BookSuggestion[]> {
    const trimmed = query.trim().replace(/\s+/g, ' ');

    if (trimmed.length < minQueryLength) {
      return [];
    }

    return this.bookSuggestionService.search(trimmed, language);
  }
}
