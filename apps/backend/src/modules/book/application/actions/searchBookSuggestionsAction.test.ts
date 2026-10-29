import { describe, expect, it } from 'vitest';

import type { BookSuggestion, BookSuggestionService } from '../../../../common/openLibrary/bookSuggestionService.ts';

import { SearchBookSuggestionsAction } from './searchBookSuggestionsAction.ts';

describe('SearchBookSuggestionsAction', () => {
  const calls: { query: string; language?: string | undefined }[] = [];
  const action = new SearchBookSuggestionsAction({
    search: async (query, language): Promise<BookSuggestion[]> => {
      calls.push({ query, language });
      return [{ title: 'Dune', author: 'Frank Herbert', year: 1965 }];
    },
  } satisfies BookSuggestionService);

  it('does not call the service for queries shorter than two characters', async () => {
    calls.length = 0;

    expect(await action.execute('  d ')).toEqual([]);
    expect(await action.execute('')).toEqual([]);
    expect(calls).toHaveLength(0);
  });

  it('trims and collapses whitespace before searching', async () => {
    calls.length = 0;

    const result = await action.execute('  the   hobbit ', 'en');

    expect(result).toHaveLength(1);
    expect(calls).toEqual([{ query: 'the hobbit', language: 'en' }]);
  });
});
