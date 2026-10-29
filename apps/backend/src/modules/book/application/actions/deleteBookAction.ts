import { ResourceConflictError } from '../../../../common/errors/resourceConflictError.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { S3Service } from '../../../../common/s3/s3Service.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { Config } from '../../../../core/config.ts';
import type { BookRepository } from '../../domain/repositories/bookRepository.ts';

import type { FindBookAction } from './findBookAction.ts';

export class DeleteBookAction {
  private readonly bookRepository: BookRepository;
  private readonly findBookAction: FindBookAction;
  private readonly s3Service: S3Service;
  private readonly loggerService: LoggerService;
  private readonly config: Config;

  public constructor(
    bookRepository: BookRepository,
    findBookAction: FindBookAction,
    s3Service: S3Service,
    loggerService: LoggerService,
    config: Config,
  ) {
    this.bookRepository = bookRepository;
    this.findBookAction = findBookAction;
    this.s3Service = s3Service;
    this.loggerService = loggerService;
    this.config = config;
  }

  public async execute(id: string, userId: string, context: ExecutionContext): Promise<void> {
    await this.findBookAction.execute(id, userId);

    if (await this.bookRepository.hasWordOccurrences(id)) {
      throw new ResourceConflictError({
        resource: 'Book',
        reason: 'Book still has saved words. Delete the words first.',
      });
    }

    const imageKeys = await this.bookRepository.delete(id);

    try {
      await this.s3Service.deleteBlobs(this.config.aws.bucketName, imageKeys);
    } catch (error) {
      this.loggerService.warn({
        message: 'Failed to delete capture images of a deleted book',
        requestId: context.requestId,
        bookId: id,
        err: error,
      });
    }
  }
}
