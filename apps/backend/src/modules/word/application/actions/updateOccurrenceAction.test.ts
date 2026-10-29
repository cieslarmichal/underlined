import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { InputNotValidError } from '../../../../common/errors/inputNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { UpdateOccurrenceAction } from './updateOccurrenceAction.ts';

describe('UpdateOccurrenceAction', () => {
  let context: ActionTestContext;
  let updateOccurrenceAction: UpdateOccurrenceAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    updateOccurrenceAction = new UpdateOccurrenceAction(context.wordRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  async function savedOccurrenceId(userId: string): Promise<string> {
    await context.saveWord(await context.createBook(userId), userId, fled);
    const [word] = await context.wordRepository.findMany({ userId, sort: 'newest' });
    return word?.occurrences[0]?.id ?? '';
  }

  it('updates the translation with trimmed text', async () => {
    const user = await context.createUser();
    const id = await savedOccurrenceId(user.id);

    await updateOccurrenceAction.execute(id, user.id, '  zbiec ');

    const [word] = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });
    expect(word?.occurrences[0]?.translation).toBe('zbiec');
  });

  it('throws InputNotValidError for a blank translation', async () => {
    const user = await context.createUser();
    const id = await savedOccurrenceId(user.id);

    await expect(updateOccurrenceAction.execute(id, user.id, '   ')).rejects.toThrow(InputNotValidError);
  });

  it('throws ResourceNotFoundError for an occurrence of another user or a missing one', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const id = await savedOccurrenceId(owner.id);

    await expect(updateOccurrenceAction.execute(id, other.id, 'x')).rejects.toThrow(ResourceNotFoundError);
    await expect(updateOccurrenceAction.execute(Generator.uuid(), owner.id, 'x')).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
