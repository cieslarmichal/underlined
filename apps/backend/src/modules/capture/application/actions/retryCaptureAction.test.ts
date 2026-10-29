import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import type { PageAnalysisService, UnderlinedWord } from '../../../../common/ai/pageAnalysisService.ts';
import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { S3Service } from '../../../../common/s3/s3Service.ts';
import { users } from '../../../../infrastructure/database/schema.ts';
import { CaptureViewService } from '../services/captureViewService.ts';

import { AnalyzeCaptureAction } from './analyzeCaptureAction.ts';
import { RetryCaptureAction } from './retryCaptureAction.ts';

describe('RetryCaptureAction', () => {
  let context: ActionTestContext;
  let retryCaptureAction: RetryCaptureAction;
  let downloaded: string[];
  let modelResult: UnderlinedWord[] | Error;

  beforeEach(async () => {
    context = await createActionTestContext();
    downloaded = [];
    modelResult = [fled];

    const s3Service = {
      getBlob: async (_bucket: string, key: string): Promise<Buffer> => {
        downloaded.push(key);
        return Buffer.from('img');
      },
    } as unknown as S3Service;
    const pageAnalysisService: PageAnalysisService = {
      analyzePage: async () => {
        if (modelResult instanceof Error) throw modelResult;
        return modelResult;
      },
    };

    retryCaptureAction = new RetryCaptureAction(
      context.captureRepository,
      context.bookRepository,
      context.userRepository,
      new AnalyzeCaptureAction(context.captureRepository, pageAnalysisService, context.loggerService),
      new CaptureViewService(context.bookRepository, context.wordRepository),
      s3Service,
      context.config,
    );
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('re-analyzes the stored image of a failed capture without a new upload', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const capture = await context.createCapture(user.id, book.id, [], 'failed');

    const view = await retryCaptureAction.execute(capture.id, user.id, Generator.executionContext());

    expect(view.capture.status).toBe('pending_review');
    expect(view.items).toHaveLength(1);
    expect(downloaded).toEqual([capture.imageKey]);
  });

  it('leaves the capture failed when the model fails again', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const capture = await context.createCapture(user.id, book.id, [], 'failed');
    modelResult = new Error('still down');

    const view = await retryCaptureAction.execute(capture.id, user.id, Generator.executionContext());

    expect(view.capture.status).toBe('failed');
  });

  it('throws OperationNotValidError for a capture that did not fail', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const capture = await context.createCapture(user.id, book.id, [fled]);

    await expect(retryCaptureAction.execute(capture.id, user.id, Generator.executionContext())).rejects.toThrow(
      OperationNotValidError,
    );
  });

  it('throws OperationNotValidError when the daily limit is already used up', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.databaseClient.db.update(users).set({ dailyCaptureLimit: 1 });
    await context.createCapture(user.id, book.id, [], 'accepted');
    const failed = await context.createCapture(user.id, book.id, [], 'failed');

    await expect(retryCaptureAction.execute(failed.id, user.id, Generator.executionContext())).rejects.toThrow(
      OperationNotValidError,
    );
    expect(downloaded).toHaveLength(0);
  });

  it('throws ResourceNotFoundError for a capture of another user', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(owner.id);
    const capture = await context.createCapture(owner.id, book.id, [], 'failed');

    await expect(retryCaptureAction.execute(capture.id, other.id, Generator.executionContext())).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
