import type { BookLanguage } from './language';

export interface Book {
  readonly id: string;
  readonly title: string;
  readonly author: string | null;
  readonly language: BookLanguage;
  readonly wordCount: number;
  readonly createdAt: string;
}
