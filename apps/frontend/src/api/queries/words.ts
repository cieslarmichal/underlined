import { apiRequest } from '../apiRequest';
import type { Word, WordSort } from '../types/word';

export interface GetWordsInput {
  bookId?: string;
  q?: string;
  sort?: WordSort;
}

export const getWords = async (input: GetWordsInput = {}): Promise<Word[]> => {
  const params = new URLSearchParams();

  if (input.bookId) params.set('bookId', input.bookId);
  if (input.q) params.set('q', input.q);
  if (input.sort) params.set('sort', input.sort);

  const response = await apiRequest<{ data: Word[] }>('/words', { method: 'GET', params });
  return response.data;
};

export const updateOccurrence = (id: string, translation: string): Promise<void> =>
  apiRequest<void>(`/occurrences/${id}`, { method: 'PATCH', body: { translation } });

export const deleteWord = (id: string): Promise<void> => apiRequest<void>(`/words/${id}`, { method: 'DELETE' });

export const deleteWordFromBook = (bookId: string, wordId: string): Promise<void> =>
  apiRequest<void>(`/books/${bookId}/words/${wordId}`, { method: 'DELETE' });
