import type { BookLanguage } from '../../../../common/types/language.ts';

export interface Book {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly author: string | null;
  readonly language: BookLanguage;
  readonly createdAt: Date;
}

export interface BookWithWordCount extends Book {
  readonly wordCount: number;
}
