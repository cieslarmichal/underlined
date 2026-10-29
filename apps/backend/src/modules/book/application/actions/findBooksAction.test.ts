import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';

import { FindBooksAction } from './findBooksAction.ts';

describe('FindBooksAction', () => {
  let context: ActionTestContext;
  let findBooksAction: FindBooksAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    findBooksAction = new FindBooksAction(context.bookRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('returns only own books with the number of distinct words', async () => {
    const user = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(user.id);
    await context.createBook(other.id);
    await context.saveWord(book, user.id, fled);
    await context.saveWord(book, user.id, {
      ...fled,
      surfaceForm: 'flees',
      sentence: 'He flees from the house.',
    });

    const result = await findBooksAction.execute(user.id);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: book.id, wordCount: 1 });
  });
});
