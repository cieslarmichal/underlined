import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { RecordRecallAction } from './recordRecallAction.ts';

describe('RecordRecallAction', () => {
  let context: ActionTestContext;
  let recordRecallAction: RecordRecallAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    recordRecallAction = new RecordRecallAction(context.wordRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  async function savedWordId(userId: string): Promise<string> {
    await context.saveWord(await context.createBook(userId), userId, fled);
    return (await context.wordRepository.findMany({ userId, sort: 'newest' }))[0]?.id ?? '';
  }

  it('remembers when and how the word was shown without marking it as known', async () => {
    const user = await context.createUser();
    const id = await savedWordId(user.id);
    const now = new Date('2026-03-10T12:00:00Z');

    await recordRecallAction.execute(id, user.id, 'recalled', now);

    const [candidate] = await context.wordRepository.findRememberCandidates(user.id);
    expect(candidate).toMatchObject({ id, lastShownAt: now, lastOutcome: 'recalled' });
    expect((await context.wordRepository.findMany({ userId: user.id, sort: 'newest' }))[0]?.knownAt).toBeNull();
  });

  it('marks the word as known when the reader says so on the card', async () => {
    const user = await context.createUser();
    const id = await savedWordId(user.id);

    await recordRecallAction.execute(id, user.id, 'known');

    expect(await context.wordRepository.findRememberCandidates(user.id)).toHaveLength(0);
    expect((await context.wordRepository.findMany({ userId: user.id, sort: 'newest', status: 'known' }))[0]?.id).toBe(
      id,
    );
  });

  it('throws ResourceNotFoundError for a word of another user or a missing one', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const id = await savedWordId(owner.id);

    await expect(recordRecallAction.execute(id, other.id, 'recalled')).rejects.toThrow(ResourceNotFoundError);
    await expect(recordRecallAction.execute(Generator.uuid(), owner.id, 'recalled')).rejects.toThrow(
      ResourceNotFoundError,
    );
  });
});
