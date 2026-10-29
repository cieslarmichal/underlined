import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';

import { AcceptCaptureAction } from './acceptCaptureAction.ts';

describe('AcceptCaptureAction', () => {
  let context: ActionTestContext;
  let acceptCaptureAction: AcceptCaptureAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    acceptCaptureAction = new AcceptCaptureAction(
      context.captureRepository,
      context.bookRepository,
      context.wordRepository,
      context.databaseClient,
    );
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('saves the words and marks the capture accepted', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const capture = await context.createCapture(user.id, book.id, [fled]);

    await acceptCaptureAction.execute(capture.id, user.id);

    const words = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });
    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({ lemma: 'flee', sourceLanguage: 'en', targetLanguage: 'pl', encounters: 1 });
    expect(words[0]?.occurrences[0]).toMatchObject({ surfaceForm: 'fled', translation: 'uciekać', bookId: book.id });
    expect((await context.captureRepository.findById(capture.id, user.id))?.status).toBe('accepted');
  });

  it('merges duplicate lemmas from one photo into one occurrence', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    const capture = await context.createCapture(user.id, book.id, [
      fled,
      { ...fled, lemma: 'Flee', surfaceForm: 'flees', sentence: 'He flees.' },
    ]);

    await acceptCaptureAction.execute(capture.id, user.id);

    const words = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });
    expect(words[0]?.encounters).toBe(1);
  });

  it('adds a new occurrence to an existing word regardless of letter case', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, { ...fled, lemma: 'Squib', surfaceForm: 'Squib', sentence: 'A Squib came.' });
    const capture = await context.createCapture(user.id, book.id, [
      { ...fled, lemma: 'squib', surfaceForm: 'squib', sentence: 'Not a squib at all.', translation: 'charłak' },
    ]);

    await acceptCaptureAction.execute(capture.id, user.id);

    const words = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });
    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({ lemma: 'Squib', encounters: 2 });
  });

  it('skips a sentence that is already saved, even when punctuation differs', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, {
      ...fled,
      sentence: "Harry fled the room — before anyone couldn't stop him.",
    });
    const capture = await context.createCapture(user.id, book.id, [
      { ...fled, sentence: 'Harry fled the room, before anyone couldn’t stop him.' },
    ]);

    await acceptCaptureAction.execute(capture.id, user.id);

    const words = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });
    expect(words[0]?.encounters).toBe(1);
  });

  it.each(['accepted', 'rejected', 'failed'] as const)(
    'throws OperationNotValidError for a %s capture',
    async (status) => {
      const user = await context.createUser();
      const book = await context.createBook(user.id);
      const capture = await context.createCapture(user.id, book.id, [fled], status);

      await expect(acceptCaptureAction.execute(capture.id, user.id)).rejects.toThrow(OperationNotValidError);
    },
  );

  it('throws ResourceNotFoundError for a capture of another user', async () => {
    const owner = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(owner.id);
    const capture = await context.createCapture(owner.id, book.id, [fled]);

    await expect(acceptCaptureAction.execute(capture.id, other.id)).rejects.toThrow(ResourceNotFoundError);
    await expect(acceptCaptureAction.execute(Generator.uuid(), owner.id)).rejects.toThrow(ResourceNotFoundError);
  });
});
