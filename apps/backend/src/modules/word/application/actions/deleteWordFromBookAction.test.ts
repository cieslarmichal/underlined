import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { DeleteWordFromBookAction } from './deleteWordFromBookAction.ts';

describe('DeleteWordFromBookAction', () => {
  let context: ActionTestContext;
  let deleteWordFromBookAction: DeleteWordFromBookAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    deleteWordFromBookAction = new DeleteWordFromBookAction(context.wordRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('keeps the word when it still has occurrences in another book', async () => {
    const user = await context.createUser();
    const first = await context.createBook(user.id);
    const second = await context.createBook(user.id);
    await context.saveWord(first, user.id, fled);
    await context.saveWord(second, user.id, { ...fled, sentence: 'Bilbo fled.' });
    const [word] = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });

    await deleteWordFromBookAction.execute(word?.id ?? '', first.id, user.id);

    const [remaining] = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });
    expect(remaining).toMatchObject({ lemma: 'flee', encounters: 1 });
    expect(remaining?.occurrences[0]?.bookId).toBe(second.id);
  });

  it('deletes the whole word when its last occurrence is removed', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);
    const [word] = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });

    await deleteWordFromBookAction.execute(word?.id ?? '', book.id, user.id);

    expect(await context.wordRepository.findMany({ userId: user.id, sort: 'newest' })).toHaveLength(0);
  });

  it('throws ResourceNotFoundError when the word has no occurrences in that book or belongs to another user', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(owner.id);
    const emptyBook = await context.createBook(owner.id);
    await context.saveWord(book, owner.id, fled);
    const [word] = await context.wordRepository.findMany({ userId: owner.id, sort: 'newest' });

    await expect(deleteWordFromBookAction.execute(word?.id ?? '', emptyBook.id, owner.id)).rejects.toThrow(
      ResourceNotFoundError,
    );
    await expect(deleteWordFromBookAction.execute(word?.id ?? '', book.id, other.id)).rejects.toThrow(
      ResourceNotFoundError,
    );
    await expect(deleteWordFromBookAction.execute(Generator.uuid(), book.id, owner.id)).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
