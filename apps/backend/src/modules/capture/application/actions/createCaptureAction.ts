import { Readable } from 'node:stream';

import { InputNotValidError } from '../../../../common/errors/inputNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import { IdService } from '../../../../common/id/idService.ts';
import type { ImageOptimizationService } from '../../../../common/imageOptimization/imageOptimizationService.ts';
import type { S3Service } from '../../../../common/s3/s3Service.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { Config } from '../../../../core/config.ts';
import type { BookRepository } from '../../../book/domain/repositories/bookRepository.ts';
import type { UserRepository } from '../../../user/domain/repositories/userRepository.ts';
import type { CaptureRepository } from '../../domain/repositories/captureRepository.ts';
import type { CaptureView } from '../../domain/types/capture.ts';
import type { CaptureViewService } from '../services/captureViewService.ts';

import type { AnalyzeCaptureAction } from './analyzeCaptureAction.ts';
import { assertWithinDailyLimit } from './checkCaptureLimit.ts';

export interface CreateCaptureActionPayload {
  readonly userId: string;
  readonly bookId: string;
  readonly data: Buffer;
  readonly contentType: string;
}

export class CreateCaptureAction {
  private readonly captureRepository: CaptureRepository;
  private readonly bookRepository: BookRepository;
  private readonly userRepository: UserRepository;
  private readonly analyzeCaptureAction: AnalyzeCaptureAction;
  private readonly captureViewService: CaptureViewService;
  private readonly imageOptimizationService: ImageOptimizationService;
  private readonly s3Service: S3Service;
  private readonly config: Config;

  public constructor(
    captureRepository: CaptureRepository,
    bookRepository: BookRepository,
    userRepository: UserRepository,
    analyzeCaptureAction: AnalyzeCaptureAction,
    captureViewService: CaptureViewService,
    imageOptimizationService: ImageOptimizationService,
    s3Service: S3Service,
    config: Config,
  ) {
    this.captureRepository = captureRepository;
    this.bookRepository = bookRepository;
    this.userRepository = userRepository;
    this.analyzeCaptureAction = analyzeCaptureAction;
    this.captureViewService = captureViewService;
    this.imageOptimizationService = imageOptimizationService;
    this.s3Service = s3Service;
    this.config = config;
  }

  public async execute(payload: CreateCaptureActionPayload, context: ExecutionContext): Promise<CaptureView> {
    const { userId, bookId, data, contentType } = payload;
    const { maxFileSizeBytes, allowedContentTypes } = this.config.image;

    if (!allowedContentTypes.includes(contentType.toLowerCase())) {
      throw new InputNotValidError({
        reason: `Invalid content type: ${contentType}. Allowed types: ${allowedContentTypes.join(', ')}`,
      });
    }

    if (data.length > maxFileSizeBytes) {
      throw new InputNotValidError({
        reason: `File size ${String(data.length)} bytes exceeds maximum allowed size of ${String(maxFileSizeBytes)} bytes`,
      });
    }

    const book = await this.bookRepository.findById(bookId, userId);

    if (!book) {
      throw new ResourceNotFoundError({ resource: 'Book', bookId });
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new ResourceNotFoundError({ resource: 'User', userId });
    }

    await assertWithinDailyLimit(this.captureRepository, user);

    await this.imageOptimizationService.validateImage(data, maxFileSizeBytes);

    const image = await this.imageOptimizationService.optimizeImage(data, {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 90,
      format: 'jpeg',
    });

    const imageKey = `captures/${userId}/${IdService.generateUuid()}.jpg`;

    await this.s3Service.uploadBlob({
      bucketName: this.config.aws.bucketName,
      fileName: imageKey,
      data: Readable.from(image.buffer),
      contentType: image.mimeType,
      isPrivate: true,
    });

    const capture = await this.captureRepository.create({
      userId,
      bookId,
      imageKey,
      targetLanguage: user.nativeLanguage,
    });

    const analyzed = await this.analyzeCaptureAction.execute(
      { capture, book, image: image.buffer, imageMimeType: image.mimeType },
      context,
    );

    return this.captureViewService.toView(analyzed);
  }
}
