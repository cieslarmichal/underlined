import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { createActionTestContext, type ActionTestContext } from '../../../../../tests/helpers/actionTestContext.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { FindBookAction } from './findBookAction.ts';

describe('FindBookAction', () => {
  let context: ActionTestContext;
  let findBookAction: FindBookAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    findBookAction = new FindBookAction(context.bookRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('returns the book of its owner', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);

    const result = await findBookAction.execute(book.id, user.id);

    expect(result.id).toBe(book.id);
  });

  it('throws ResourceNotFoundError for a book of another user', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(owner.id);

    await expect(findBookAction.execute(book.id, other.id)).rejects.toThrow(ResourceNotFoundError);
  });

  it('throws ResourceNotFoundError when the book does not exist', async () => {
    const user = await context.createUser();

    await expect(findBookAction.execute(Generator.uuid(), user.id)).rejects.toThrow(ResourceNotFoundError);
  });
});
