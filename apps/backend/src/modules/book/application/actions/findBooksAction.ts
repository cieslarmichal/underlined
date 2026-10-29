import type { BookRepository } from '../../domain/repositories/bookRepository.ts';
import type { BookWithWordCount } from '../../domain/types/book.ts';

export class FindBooksAction {
  private readonly bookRepository: BookRepository;

  public constructor(bookRepository: BookRepository) {
    this.bookRepository = bookRepository;
  }

  public async execute(userId: string): Promise<BookWithWordCount[]> {
    return this.bookRepository.findByUserId(userId);
  }
}
