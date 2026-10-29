import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { BookRepository } from '../../../book/domain/repositories/bookRepository.ts';
import type { CaptureRepository } from '../../domain/repositories/captureRepository.ts';
import type { CaptureStatus, CaptureView } from '../../domain/types/capture.ts';
import type { CaptureViewService } from '../services/captureViewService.ts';

export class FindCapturesAction {
  private readonly captureRepository: CaptureRepository;
  private readonly bookRepository: BookRepository;
  private readonly captureViewService: CaptureViewService;

  public constructor(
    captureRepository: CaptureRepository,
    bookRepository: BookRepository,
    captureViewService: CaptureViewService,
  ) {
    this.captureRepository = captureRepository;
    this.bookRepository = bookRepository;
    this.captureViewService = captureViewService;
  }

  public async execute(bookId: string, userId: string, status: CaptureStatus): Promise<CaptureView[]> {
    const book = await this.bookRepository.findById(bookId, userId);

    if (!book) {
      throw new ResourceNotFoundError({ resource: 'Book', bookId });
    }

    const captures = await this.captureRepository.findByBookId(bookId, userId, status);

    return Promise.all(captures.map((capture) => this.captureViewService.toView(capture)));
  }
}
