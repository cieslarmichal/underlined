import type { BookLanguage } from '../../../../common/types/language.ts';
import type { Book, BookWithWordCount } from '../types/book.ts';

export interface CreateBookData {
  readonly userId: string;
  readonly title: string;
  readonly author: string | null;
  readonly language: BookLanguage;
}

export interface UpdateBookData {
  readonly title?: string;
  readonly author?: string | null;
}

export interface BookRepository {
  create(data: CreateBookData): Promise<Book>;
  update(id: string, data: UpdateBookData): Promise<Book>;
  findById(id: string, userId: string): Promise<Book | null>;
  findByUserId(userId: string): Promise<BookWithWordCount[]>;
  hasWordOccurrences(id: string): Promise<boolean>;
  // Deletes the book with its captures and returns the S3 keys of the captures' images.
  delete(id: string): Promise<string[]>;
}
