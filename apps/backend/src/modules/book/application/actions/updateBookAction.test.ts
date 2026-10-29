import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createActionTestContext, type ActionTestContext } from '../../../../../tests/helpers/actionTestContext.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { FindBookAction } from './findBookAction.ts';
import { UpdateBookAction } from './updateBookAction.ts';

describe('UpdateBookAction', () => {
  let context: ActionTestContext;
  let updateBookAction: UpdateBookAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    updateBookAction = new UpdateBookAction(context.bookRepository, new FindBookAction(context.bookRepository));
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('updates the title and author and clears a blank author', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);

    const updated = await updateBookAction.execute({
      id: book.id,
      userId: user.id,
      title: ' Hobbit ',
      author: 'Tolkien',
    });
    expect(updated).toMatchObject({ title: 'Hobbit', author: 'Tolkien' });

    const cleared = await updateBookAction.execute({ id: book.id, userId: user.id, author: ' ' });
    expect(cleared).toMatchObject({ title: 'Hobbit', author: null });
  });

  it('throws ResourceNotFoundError for a book of another user', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(owner.id);

    await expect(updateBookAction.execute({ id: book.id, userId: other.id, title: 'x' })).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
