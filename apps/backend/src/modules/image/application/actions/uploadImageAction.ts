import { Readable } from 'node:stream';

import { InputNotValidError } from '../../../../common/errors/inputNotValidError.ts';
import { IdService } from '../../../../common/id/idService.ts';
import { type ImageOptimizationService } from '../../../../common/imageOptimization/imageOptimizationService.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { S3Service } from '../../../../common/s3/s3Service.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { Config } from '../../../../core/config.ts';

export interface UploadImageActionPayload {
  readonly data: Readable;
  readonly contentType: string;
  readonly fileSize: number;
}

export interface UploadImageActionResult {
  readonly imageId: string;
}

export class UploadImageAction {
  private readonly s3Service: S3Service;
  private readonly loggerService: LoggerService;
  private readonly config: Config;
  private readonly imageOptimizationService: ImageOptimizationService;

  public constructor(
    s3Service: S3Service,
    loggerService: LoggerService,
    config: Config,
    imageOptimizationService: ImageOptimizationService,
  ) {
    this.s3Service = s3Service;
    this.loggerService = loggerService;
    this.config = config;
    this.imageOptimizationService = imageOptimizationService;
  }

  public async execute(
    payload: UploadImageActionPayload,
    executionContext: ExecutionContext,
  ): Promise<UploadImageActionResult> {
    const { data, fileSize, contentType } = payload;
    const { requestId, userId } = executionContext;

    const { maxFileSizeBytes, allowedContentTypes } = this.config.image;

    if (!allowedContentTypes.includes(contentType.toLowerCase())) {
      this.loggerService.warn({
        message: 'Invalid content type for image upload',
        requestId,
        userId,
        contentType,
      });

      throw new InputNotValidError({
        reason: `Invalid content type: ${contentType}. Allowed types: ${allowedContentTypes.join(', ')}`,
      });
    }

    if (fileSize > maxFileSizeBytes) {
      this.loggerService.warn({
        message: 'Image file size exceeds maximum allowed',
        requestId,
        userId,
        fileSize,
        maxFileSize: maxFileSizeBytes,
      });

      throw new InputNotValidError({
        reason: `File size ${String(fileSize)} bytes exceeds maximum allowed size of ${String(maxFileSizeBytes)} bytes`,
      });
    }

    const { bucketName } = this.config.aws;

    this.loggerService.debug({
      message: 'Processing image upload',
      requestId,
      bucketName,
      userId,
      contentType,
      originalFileSize: fileSize,
    });

    const chunks: Buffer[] = [];
    for await (const chunk of data) {
      chunks.push(Buffer.from(chunk as Buffer));
    }
    const originalBuffer = Buffer.concat(chunks);

    await this.imageOptimizationService.validateImage(originalBuffer, maxFileSizeBytes);

    const optimizedImage = await this.imageOptimizationService.optimizeImage(originalBuffer, {
      maxWidth: 2048,
      maxHeight: 2048,
      quality: 85,
      format: 'webp',
    });

    const imageId = IdService.generateUuid();
    const optimizedStream = Readable.from(optimizedImage.buffer);

    this.loggerService.debug({
      message: 'Uploading optimized image',
      requestId,
      imageId,
      userId,
      originalFileSize: fileSize,
      optimizedFileSize: optimizedImage.size,
    });

    await this.s3Service.uploadBlob({
      bucketName,
      fileName: imageId,
      data: optimizedStream,
      contentType: optimizedImage.mimeType,
    });

    this.loggerService.info({
      message: 'Image uploaded successfully',
      requestId,
      imageId,
      userId,
    });

    return { imageId };
  }
}
