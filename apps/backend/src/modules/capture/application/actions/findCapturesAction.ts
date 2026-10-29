import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { BookRepository } from '../../../book/domain/repositories/bookRepository.ts';
import type { CaptureRepository } from '../../domain/repositories/captureRepository.ts';
import type { Capture, CaptureStatus } from '../../domain/types/capture.ts';

export class FindCapturesAction {
  private readonly captureRepository: CaptureRepository;
  private readonly bookRepository: BookRepository;

  public constructor(captureRepository: CaptureRepository, bookRepository: BookRepository) {
    this.captureRepository = captureRepository;
    this.bookRepository = bookRepository;
  }

  public async execute(bookId: string, userId: string, status: CaptureStatus): Promise<Capture[]> {
    const book = await this.bookRepository.findById(bookId, userId);

    if (!book) {
      throw new ResourceNotFoundError({ resource: 'Book', bookId });
    }

    return this.captureRepository.findByBookId(bookId, userId, status);
  }
}
