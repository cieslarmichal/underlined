import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';

import { GetRememberCardAction } from './getRememberCardAction.ts';

describe('GetRememberCardAction', () => {
  let context: ActionTestContext;
  let getRememberCardAction: GetRememberCardAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    getRememberCardAction = new GetRememberCardAction(context.wordRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('returns null when the reader has no words', async () => {
    const user = await context.createUser();

    expect(await getRememberCardAction.execute(user.id)).toBeNull();
  });

  it('returns a word with one of its sentences and the book title', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);

    const card = await getRememberCardAction.execute(user.id);

    expect(card).toMatchObject({
      lemma: 'flee',
      encounters: 1,
      sentence: fled.sentence,
      surfaceForm: 'fled',
      translation: 'uciekać',
      bookTitle: book.title,
    });
  });

  it('only uses words and sentences from the given book', async () => {
    const user = await context.createUser();
    const harry = await context.createBook(user.id);
    const hobbit = await context.createBook(user.id);
    await context.saveWord(harry, user.id, fled);
    await context.saveWord(hobbit, user.id, { ...fled, sentence: 'Bilbo fled.' });
    await context.saveWord(hobbit, user.id, {
      ...fled,
      lemma: 'ingenuity',
      surfaceForm: 'ingenuity',
      sentence: 'Such ingenuity.',
    });

    for (let i = 0; i < 10; i++) {
      const card = await getRememberCardAction.execute(user.id, harry.id);
      expect(card).toMatchObject({ lemma: 'flee', sentence: fled.sentence, bookTitle: harry.title });
    }
  });

  it('never shows words marked as known or words of other users', async () => {
    const user = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);
    await context.saveWord(await context.createBook(other.id), other.id, {
      ...fled,
      lemma: 'staunch',
      surfaceForm: 'staunch',
      sentence: 'A staunch ally.',
    });
    const [word] = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });
    await context.wordRepository.setKnown(word?.id ?? '', user.id, true);

    expect(await getRememberCardAction.execute(user.id)).toBeNull();
  });

  it('prefers a word that was never shown over one shown a moment ago', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);
    await context.saveWord(book, user.id, {
      ...fled,
      lemma: 'staunch',
      surfaceForm: 'staunch',
      sentence: 'A staunch ally.',
    });
    const words = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });
    const flee = words.find((word) => word.lemma === 'flee');
    const now = new Date();
    await context.wordRepository.recordShown(flee?.id ?? '', user.id, 'not_yet', now);

    let staunchCount = 0;
    for (let i = 0; i < 100; i++) {
      const card = await getRememberCardAction.execute(user.id, undefined, { now });
      if (card?.lemma === 'staunch') staunchCount++;
    }

    // The word shown a moment ago is not excluded, just far less likely (about 2% per draw).
    expect(staunchCount).toBeGreaterThan(85);
  });
});
