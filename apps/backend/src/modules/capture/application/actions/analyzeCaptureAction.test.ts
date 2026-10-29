import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import type {
  AnalyzePagePayload,
  PageAnalysisService,
  UnderlinedWord,
} from '../../../../common/ai/pageAnalysisService.ts';
import type { Book } from '../../../book/domain/types/book.ts';
import type { Capture } from '../../domain/types/capture.ts';

import { AnalyzeCaptureAction } from './analyzeCaptureAction.ts';

describe('AnalyzeCaptureAction', () => {
  let context: ActionTestContext;
  let analyzeCaptureAction: AnalyzeCaptureAction;
  let result: UnderlinedWord[] | Error;
  let received: AnalyzePagePayload | undefined;

  beforeEach(async () => {
    context = await createActionTestContext();
    received = undefined;
    result = [fled];

    const pageAnalysisService: PageAnalysisService = {
      analyzePage: async (payload) => {
        received = payload;
        if (result instanceof Error) throw result;
        return result;
      },
    };

    analyzeCaptureAction = new AnalyzeCaptureAction(
      context.captureRepository,
      pageAnalysisService,
      context.loggerService,
    );
  });
  afterEach(async () => {
    await context.cleanup();
  });

  async function setup(): Promise<{ book: Book; capture: Capture }> {
    const user = await context.createUser();
    const book = await context.createBook(user.id, 'es');
    const capture = await context.createCapture(user.id, book.id, [], 'failed');
    return { book, capture };
  }

  it('stores the words and moves the capture to review, passing the book as context', async () => {
    const { book, capture } = await setup();

    const analyzed = await analyzeCaptureAction.execute(
      { capture, book, image: Buffer.from('img'), imageMimeType: 'image/jpeg' },
      Generator.executionContext(),
    );

    expect(analyzed).toMatchObject({ status: 'pending_review', items: [fled] });
    expect(received).toMatchObject({ bookTitle: book.title, bookLanguage: 'es', nativeLanguage: 'pl' });
  });

  it('rejects the capture when nothing is underlined', async () => {
    const { book, capture } = await setup();
    result = [];

    const analyzed = await analyzeCaptureAction.execute(
      { capture, book, image: Buffer.from('img'), imageMimeType: 'image/jpeg' },
      Generator.executionContext(),
    );

    expect(analyzed).toMatchObject({ status: 'rejected', items: [] });
  });

  it('keeps the capture failed instead of throwing when the model fails', async () => {
    const { book, capture } = await setup();
    result = new Error('model down');

    const analyzed = await analyzeCaptureAction.execute(
      { capture, book, image: Buffer.from('img'), imageMimeType: 'image/jpeg' },
      Generator.executionContext(),
    );

    expect(analyzed.status).toBe('failed');
  });
});
