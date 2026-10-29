import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { BookRepository } from '../../domain/repositories/bookRepository.ts';
import type { Book } from '../../domain/types/book.ts';

export class FindBookAction {
  private readonly bookRepository: BookRepository;

  public constructor(bookRepository: BookRepository) {
    this.bookRepository = bookRepository;
  }

  public async execute(id: string, userId: string): Promise<Book> {
    const book = await this.bookRepository.findById(id, userId);

    if (!book) {
      throw new ResourceNotFoundError({ resource: 'Book', bookId: id });
    }

    return book;
  }
}
