import { InputNotValidError } from '../../../../common/errors/inputNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { BookLanguage } from '../../../../common/types/language.ts';
import type { UserRepository } from '../../../user/domain/repositories/userRepository.ts';
import type { BookRepository } from '../../domain/repositories/bookRepository.ts';
import type { Book } from '../../domain/types/book.ts';

export interface CreateBookActionPayload {
  readonly userId: string;
  readonly title: string;
  readonly author?: string | undefined;
  readonly language: BookLanguage;
}

export class CreateBookAction {
  private readonly bookRepository: BookRepository;
  private readonly userRepository: UserRepository;

  public constructor(bookRepository: BookRepository, userRepository: UserRepository) {
    this.bookRepository = bookRepository;
    this.userRepository = userRepository;
  }

  public async execute(payload: CreateBookActionPayload): Promise<Book> {
    const { userId, title, author, language } = payload;

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundError({ resource: 'User', userId });
    }

    if (language === user.nativeLanguage) {
      throw new InputNotValidError({ reason: 'Book language must be different from your native language' });
    }

    const trimmedAuthor = author?.trim();

    return this.bookRepository.create({
      userId,
      title: title.trim(),
      author: trimmedAuthor ? trimmedAuthor : null,
      language,
    });
  }
}
