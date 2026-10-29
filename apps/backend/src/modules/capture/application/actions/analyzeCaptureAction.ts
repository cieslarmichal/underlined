import type { PageAnalysisService } from '../../../../common/ai/pageAnalysisService.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { Book } from '../../../book/domain/types/book.ts';
import type { CaptureRepository } from '../../domain/repositories/captureRepository.ts';
import type { Capture } from '../../domain/types/capture.ts';

export interface AnalyzeCaptureActionPayload {
  readonly capture: Capture;
  readonly book: Book;
  readonly image: Buffer;
  readonly imageMimeType: string;
}

// Runs the model on a stored photo. A model failure does not throw: the capture stays failed so it can be retried.
export class AnalyzeCaptureAction {
  private readonly captureRepository: CaptureRepository;
  private readonly pageAnalysisService: PageAnalysisService;
  private readonly loggerService: LoggerService;

  public constructor(
    captureRepository: CaptureRepository,
    pageAnalysisService: PageAnalysisService,
    loggerService: LoggerService,
  ) {
    this.captureRepository = captureRepository;
    this.pageAnalysisService = pageAnalysisService;
    this.loggerService = loggerService;
  }

  public async execute(payload: AnalyzeCaptureActionPayload, context: ExecutionContext): Promise<Capture> {
    const { capture, book, image, imageMimeType } = payload;

    try {
      const items = await this.pageAnalysisService.analyzePage({
        image,
        imageMimeType,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookLanguage: book.language,
        nativeLanguage: capture.targetLanguage,
      });

      // Nothing underlined means there is nothing to review.
      const status = items.length > 0 ? 'pending_review' : 'rejected';

      return await this.captureRepository.update(capture.id, { status, items });
    } catch (error) {
      this.loggerService.error({
        message: 'Page analysis failed',
        requestId: context.requestId,
        captureId: capture.id,
        err: error,
      });

      return await this.captureRepository.update(capture.id, { status: 'failed' });
    }
  }
}
