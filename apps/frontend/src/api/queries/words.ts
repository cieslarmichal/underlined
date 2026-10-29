import { apiRequest } from '../apiRequest';
import type { RememberCard, RememberOutcome, Word, WordSort, WordStatus, WordsSummary } from '../types/word';

export interface GetWordsInput {
  bookId?: string;
  q?: string;
  sort?: WordSort;
  status?: WordStatus;
  minEncounters?: number;
}

export const getWords = async (input: GetWordsInput = {}): Promise<Word[]> => {
  const params = new URLSearchParams();

  if (input.bookId) params.set('bookId', input.bookId);
  if (input.q) params.set('q', input.q);
  if (input.sort) params.set('sort', input.sort);
  if (input.status) params.set('status', input.status);
  if (input.minEncounters) params.set('minEncounters', String(input.minEncounters));

  const response = await apiRequest<{ data: Word[] }>('/words', { method: 'GET', params });
  return response.data;
};

export const getRememberCard = async (bookId?: string): Promise<RememberCard | null> => {
  const response = await apiRequest<{ data: RememberCard | null }>('/words/remember', {
    method: 'GET',
    params: new URLSearchParams(bookId ? { bookId } : {}),
  });
  return response.data;
};

export const recordRemember = (id: string, outcome: RememberOutcome): Promise<void> =>
  apiRequest<void>(`/words/${id}/remember`, { method: 'POST', body: { outcome } });

export const setWordKnown = (id: string, known: boolean): Promise<void> =>
  apiRequest<void>(`/words/${id}/known`, { method: 'PATCH', body: { known } });

export const getWordsSummary = (): Promise<WordsSummary> =>
  apiRequest<WordsSummary>('/words/summary', { method: 'GET' });

export const updateOccurrence = (id: string, translation: string): Promise<void> =>
  apiRequest<void>(`/occurrences/${id}`, { method: 'PATCH', body: { translation } });

export const deleteWord = (id: string): Promise<void> => apiRequest<void>(`/words/${id}`, { method: 'DELETE' });

export const deleteWordFromBook = (bookId: string, wordId: string): Promise<void> =>
  apiRequest<void>(`/books/${bookId}/words/${wordId}`, { method: 'DELETE' });
