import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { DeleteWordAction } from './deleteWordAction.ts';

describe('DeleteWordAction', () => {
  let context: ActionTestContext;
  let deleteWordAction: DeleteWordAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    deleteWordAction = new DeleteWordAction(context.wordRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('deletes the word with all its occurrences from all books', async () => {
    const user = await context.createUser();
    const first = await context.createBook(user.id);
    const second = await context.createBook(user.id);
    await context.saveWord(first, user.id, fled);
    await context.saveWord(second, user.id, { ...fled, sentence: 'Bilbo fled.' });
    const [word] = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });

    await deleteWordAction.execute(word?.id ?? '', user.id);

    expect(await context.wordRepository.findMany({ userId: user.id, sort: 'newest' })).toHaveLength(0);
    expect(await context.bookRepository.hasWordOccurrences(first.id)).toBe(false);
    expect(await context.bookRepository.hasWordOccurrences(second.id)).toBe(false);
  });

  it('throws ResourceNotFoundError for a word of another user or a missing one', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    await context.saveWord(await context.createBook(owner.id), owner.id, fled);
    const [word] = await context.wordRepository.findMany({ userId: owner.id, sort: 'newest' });

    await expect(deleteWordAction.execute(word?.id ?? '', other.id)).rejects.toThrow(ResourceNotFoundError);
    await expect(deleteWordAction.execute(Generator.uuid(), owner.id)).rejects.toThrow(ResourceNotFoundError);
  });
});
