import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import { CaptureViewService } from '../services/captureViewService.ts';

import { FindCapturesAction } from './findCapturesAction.ts';

describe('FindCapturesAction', () => {
  let context: ActionTestContext;
  let findCapturesAction: FindCapturesAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    findCapturesAction = new FindCapturesAction(
      context.captureRepository,
      context.bookRepository,
      new CaptureViewService(context.bookRepository, context.wordRepository),
    );
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('returns pending captures of the book with counters for words the user already has', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);
    const pending = await context.createCapture(user.id, book.id, [
      { ...fled, lemma: 'FLEE', sentence: 'He flees.' },
      { ...fled, lemma: 'ingenuity', surfaceForm: 'ingenuity', translation: 'pomysłowość' },
    ]);
    await context.createCapture(user.id, book.id, [fled], 'accepted');

    const views = await findCapturesAction.execute(book.id, user.id, 'pending_review');

    expect(views).toHaveLength(1);
    expect(views[0]?.capture.id).toBe(pending.id);
    expect(views[0]?.items.map((item) => item.timesSeen)).toEqual([1, 0]);
  });

  it('throws ResourceNotFoundError for a book of another user', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(owner.id);

    await expect(findCapturesAction.execute(book.id, other.id, 'pending_review')).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
