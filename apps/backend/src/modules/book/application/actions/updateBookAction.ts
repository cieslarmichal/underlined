import type { BookRepository } from '../../domain/repositories/bookRepository.ts';
import type { Book } from '../../domain/types/book.ts';

import type { FindBookAction } from './findBookAction.ts';

export interface UpdateBookActionPayload {
  readonly id: string;
  readonly userId: string;
  readonly title?: string | undefined;
  readonly author?: string | null | undefined;
}

export class UpdateBookAction {
  private readonly bookRepository: BookRepository;
  private readonly findBookAction: FindBookAction;

  public constructor(bookRepository: BookRepository, findBookAction: FindBookAction) {
    this.bookRepository = bookRepository;
    this.findBookAction = findBookAction;
  }

  public async execute(payload: UpdateBookActionPayload): Promise<Book> {
    const { id, userId, title, author } = payload;

    await this.findBookAction.execute(id, userId);

    const trimmedAuthor = author?.trim();

    return this.bookRepository.update(id, {
      ...(title !== undefined && { title: title.trim() }),
      ...(author !== undefined && { author: trimmedAuthor ? trimmedAuthor : null }),
    });
  }
}
