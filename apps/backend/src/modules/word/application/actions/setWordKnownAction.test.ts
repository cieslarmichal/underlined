import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { SetWordKnownAction } from './setWordKnownAction.ts';

describe('SetWordKnownAction', () => {
  let context: ActionTestContext;
  let setWordKnownAction: SetWordKnownAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    setWordKnownAction = new SetWordKnownAction(context.wordRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('moves a word to known and back to active', async () => {
    const user = await context.createUser();
    await context.saveWord(await context.createBook(user.id), user.id, fled);
    const id = (await context.wordRepository.findMany({ userId: user.id, sort: 'newest' }))[0]?.id ?? '';

    await setWordKnownAction.execute(id, user.id, true);
    expect(await context.wordRepository.findMany({ userId: user.id, sort: 'newest' })).toHaveLength(0);
    expect(await context.wordRepository.findMany({ userId: user.id, sort: 'newest', status: 'known' })).toHaveLength(1);

    await setWordKnownAction.execute(id, user.id, false);
    expect(await context.wordRepository.findMany({ userId: user.id, sort: 'newest' })).toHaveLength(1);
    expect(await context.wordRepository.findMany({ userId: user.id, sort: 'newest', status: 'known' })).toHaveLength(0);
  });

  it('throws ResourceNotFoundError for a word of another user or a missing one', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    await context.saveWord(await context.createBook(owner.id), owner.id, fled);
    const id = (await context.wordRepository.findMany({ userId: owner.id, sort: 'newest' }))[0]?.id ?? '';

    await expect(setWordKnownAction.execute(id, other.id, true)).rejects.toThrow(ResourceNotFoundError);
    await expect(setWordKnownAction.execute(Generator.uuid(), owner.id, true)).rejects.toThrow(ResourceNotFoundError);
  });
});
