import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { RejectCaptureAction } from './rejectCaptureAction.ts';

describe('RejectCaptureAction', () => {
  let context: ActionTestContext;
  let rejectCaptureAction: RejectCaptureAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    rejectCaptureAction = new RejectCaptureAction(context.captureRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('marks the capture rejected and saves no words', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const capture = await context.createCapture(user.id, book.id, [fled]);

    await rejectCaptureAction.execute(capture.id, user.id);

    expect((await context.captureRepository.findById(capture.id, user.id))?.status).toBe('rejected');
    expect(await context.wordRepository.findMany({ userId: user.id, sort: 'newest' })).toHaveLength(0);
  });

  it('throws OperationNotValidError when the capture is not waiting for review', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const capture = await context.createCapture(user.id, book.id, [fled], 'accepted');

    await expect(rejectCaptureAction.execute(capture.id, user.id)).rejects.toThrow(OperationNotValidError);
  });

  it('throws ResourceNotFoundError for a capture of another user', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(owner.id);
    const capture = await context.createCapture(owner.id, book.id, [fled]);

    await expect(rejectCaptureAction.execute(capture.id, other.id)).rejects.toThrow(ResourceNotFoundError);
  });
});
