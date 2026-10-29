import sharp from 'sharp';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import type { PageAnalysisService, UnderlinedWord } from '../../../../common/ai/pageAnalysisService.ts';
import { InputNotValidError } from '../../../../common/errors/inputNotValidError.ts';
import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import { ImageOptimizationService } from '../../../../common/imageOptimization/imageOptimizationService.ts';
import type { S3Service, UploadFilePayload } from '../../../../common/s3/s3Service.ts';
import { users } from '../../../../infrastructure/database/schema.ts';

import { AnalyzeCaptureAction } from './analyzeCaptureAction.ts';
import { CreateCaptureAction } from './createCaptureAction.ts';

describe('CreateCaptureAction', () => {
  let context: ActionTestContext;
  let createCaptureAction: CreateCaptureAction;
  let uploads: UploadFilePayload[];
  let modelResult: UnderlinedWord[] | Error;
  let image: Buffer;

  beforeEach(async () => {
    context = await createActionTestContext();
    uploads = [];
    modelResult = [fled];
    image = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();

    const s3Service = {
      uploadFile: async (payload: UploadFilePayload): Promise<{ location: string }> => {
        uploads.push(payload);
        return { location: payload.fileName };
      },
    } as unknown as S3Service;
    const pageAnalysisService: PageAnalysisService = {
      analyzePage: async () => {
        if (modelResult instanceof Error) throw modelResult;
        return modelResult;
      },
    };

    createCaptureAction = new CreateCaptureAction(
      context.captureRepository,
      context.bookRepository,
      context.userRepository,
      new AnalyzeCaptureAction(context.captureRepository, pageAnalysisService, context.loggerService),
      new ImageOptimizationService(),
      s3Service,
      context.config,
    );
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('uploads the photo privately, analyzes it and returns the words in the user native language', async () => {
    const user = await context.createUser('pl');
    const book = await context.createBook(user.id);

    const capture = await createCaptureAction.execute(
      { userId: user.id, bookId: book.id, data: image, contentType: 'image/png' },
      Generator.executionContext(),
    );

    expect(capture).toMatchObject({ status: 'pending_review', targetLanguage: 'pl', bookId: book.id });
    expect(capture.items).toEqual([fled]);
    expect(uploads).toHaveLength(1);
    expect(uploads[0]).toMatchObject({ fileName: capture.imageKey, isPrivate: true, contentType: 'image/jpeg' });
  });

  it('keeps a failed capture with its image when the model fails', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    modelResult = new Error('model down');

    const capture = await createCaptureAction.execute(
      { userId: user.id, bookId: book.id, data: image, contentType: 'image/png' },
      Generator.executionContext(),
    );

    expect(capture.status).toBe('failed');
    expect(uploads).toHaveLength(1);
  });

  it('throws InputNotValidError for an unsupported content type or an oversized file', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const base = { userId: user.id, bookId: book.id };

    await expect(
      createCaptureAction.execute(
        { ...base, data: image, contentType: 'application/pdf' },
        Generator.executionContext(),
      ),
    ).rejects.toThrow(InputNotValidError);
    await expect(
      createCaptureAction.execute(
        { ...base, data: Buffer.alloc(context.config.image.maxFileSizeBytes + 1), contentType: 'image/png' },
        Generator.executionContext(),
      ),
    ).rejects.toThrow(InputNotValidError);
    expect(uploads).toHaveLength(0);
  });

  it('throws ResourceNotFoundError for a book of another user', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(owner.id);

    await expect(
      createCaptureAction.execute(
        { userId: other.id, bookId: book.id, data: image, contentType: 'image/png' },
        Generator.executionContext(),
      ),
    ).rejects.toThrow(ResourceNotFoundError);
  });

  it('throws OperationNotValidError once the daily limit is used up, before uploading anything', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.databaseClient.db.update(users).set({ dailyCaptureLimit: 1 });
    await context.createCapture(user.id, book.id, [], 'rejected');

    await expect(
      createCaptureAction.execute(
        { userId: user.id, bookId: book.id, data: image, contentType: 'image/png' },
        Generator.executionContext(),
      ),
    ).rejects.toThrow(OperationNotValidError);
    expect(uploads).toHaveLength(0);
  });
});
