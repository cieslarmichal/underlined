import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { FindCapturesAction } from './findCapturesAction.ts';

describe('FindCapturesAction', () => {
  let context: ActionTestContext;
  let findCapturesAction: FindCapturesAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    findCapturesAction = new FindCapturesAction(context.captureRepository, context.bookRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('returns only the pending captures of the book', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const pending = await context.createCapture(user.id, book.id, [fled]);
    await context.createCapture(user.id, book.id, [fled], 'accepted');
    await context.createCapture(user.id, (await context.createBook(user.id)).id, [fled]);

    const captures = await findCapturesAction.execute(book.id, user.id, 'pending_review');

    expect(captures.map((capture) => capture.id)).toEqual([pending.id]);
    expect(captures[0]?.items).toEqual([fled]);
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
