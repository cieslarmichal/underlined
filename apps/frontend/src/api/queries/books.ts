import { apiRequest } from '../apiRequest';
import type { Book } from '../types/book';
import type { BookLanguage } from '../types/language';

export interface CreateBookInput {
  title: string;
  author?: string;
  language: BookLanguage;
}

export interface UpdateBookInput {
  title?: string;
  author?: string | null;
}

export interface BookSuggestion {
  readonly title: string;
  readonly author: string | null;
  readonly year: number | null;
}

export const searchBookSuggestions = async (query: string, language: BookLanguage): Promise<BookSuggestion[]> => {
  const response = await apiRequest<{ data: BookSuggestion[] }>('/books/search', {
    method: 'GET',
    params: new URLSearchParams({ q: query, language }),
  });
  return response.data;
};

export const getBooks = async (): Promise<Book[]> => {
  const response = await apiRequest<{ data: Book[] }>('/books', { method: 'GET' });
  return response.data;
};

export const getBook = (id: string): Promise<Book> => apiRequest<Book>(`/books/${id}`, { method: 'GET' });

export const createBook = (input: CreateBookInput): Promise<Book> =>
  apiRequest<Book>('/books', { method: 'POST', body: input });

export const updateBook = (id: string, input: UpdateBookInput): Promise<Book> =>
  apiRequest<Book>(`/books/${id}`, { method: 'PATCH', body: input });

export const deleteBook = (id: string): Promise<void> => apiRequest<void>(`/books/${id}`, { method: 'DELETE' });
