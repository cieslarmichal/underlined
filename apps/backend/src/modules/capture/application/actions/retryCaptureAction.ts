import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { S3Service } from '../../../../common/s3/s3Service.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { Config } from '../../../../core/config.ts';
import type { BookRepository } from '../../../book/domain/repositories/bookRepository.ts';
import type { UserRepository } from '../../../user/domain/repositories/userRepository.ts';
import type { CaptureRepository } from '../../domain/repositories/captureRepository.ts';
import type { Capture } from '../../domain/types/capture.ts';

import type { AnalyzeCaptureAction } from './analyzeCaptureAction.ts';
import { assertWithinDailyLimit } from './checkCaptureLimit.ts';

export class RetryCaptureAction {
  private readonly captureRepository: CaptureRepository;
  private readonly bookRepository: BookRepository;
  private readonly userRepository: UserRepository;
  private readonly analyzeCaptureAction: AnalyzeCaptureAction;
  private readonly s3Service: S3Service;
  private readonly config: Config;

  public constructor(
    captureRepository: CaptureRepository,
    bookRepository: BookRepository,
    userRepository: UserRepository,
    analyzeCaptureAction: AnalyzeCaptureAction,
    s3Service: S3Service,
    config: Config,
  ) {
    this.captureRepository = captureRepository;
    this.bookRepository = bookRepository;
    this.userRepository = userRepository;
    this.analyzeCaptureAction = analyzeCaptureAction;
    this.s3Service = s3Service;
    this.config = config;
  }

  public async execute(id: string, userId: string, context: ExecutionContext): Promise<Capture> {
    const capture = await this.captureRepository.findById(id, userId);

    if (!capture) {
      throw new ResourceNotFoundError({ resource: 'Capture', captureId: id });
    }

    if (capture.status !== 'failed') {
      throw new OperationNotValidError({ reason: 'Only failed photos can be retried' });
    }

    const [book, user] = await Promise.all([
      this.bookRepository.findById(capture.bookId, userId),
      this.userRepository.findById(userId),
    ]);

    if (!book || !user) {
      throw new ResourceNotFoundError({ resource: 'Book', bookId: capture.bookId });
    }

    await assertWithinDailyLimit(this.captureRepository, user);

    const image = await this.s3Service.getFile(this.config.aws.bucketName, capture.imageKey);

    const analyzed = await this.analyzeCaptureAction.execute(
      { capture, book, image, imageMimeType: 'image/jpeg' },
      context,
    );

    return analyzed;
  }
}
