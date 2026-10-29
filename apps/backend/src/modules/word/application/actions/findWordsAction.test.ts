import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import type { UnderlinedWord } from '../../../../common/ai/pageAnalysisService.ts';

import { FindWordsAction } from './findWordsAction.ts';

const staunch: UnderlinedWord = {
  surfaceForm: 'staunchest',
  lemma: 'staunch',
  sentence: 'He was the staunchest friend.',
  translation: 'oddany',
};

describe('FindWordsAction', () => {
  let context: ActionTestContext;
  let findWordsAction: FindWordsAction;

  beforeEach(async () => {
    context = await createActionTestContext();
    findWordsAction = new FindWordsAction(context.wordRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('returns only own words', async () => {
    const user = await context.createUser();
    const other = await context.createUser();
    await context.saveWord(await context.createBook(user.id), user.id, fled);
    await context.saveWord(await context.createBook(other.id), other.id, staunch);

    const words = await findWordsAction.execute({ userId: user.id, sort: 'newest' });

    expect(words.map((word) => word.lemma)).toEqual(['flee']);
  });

  it('filters by book but keeps the encounters across all books', async () => {
    const user = await context.createUser();
    const harry = await context.createBook(user.id);
    const hobbit = await context.createBook(user.id);
    await context.saveWord(harry, user.id, fled);
    await context.saveWord(hobbit, user.id, { ...fled, sentence: 'Bilbo fled.' });
    await context.saveWord(hobbit, user.id, staunch);

    const words = await findWordsAction.execute({ userId: user.id, bookId: harry.id, sort: 'newest' });

    expect(words).toHaveLength(1);
    expect(words[0]).toMatchObject({ lemma: 'flee', encounters: 2 });
    expect(words[0]?.occurrences).toHaveLength(1);
  });

  it('searches the word and its translations case-insensitively and treats wildcards literally', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);
    await context.saveWord(book, user.id, staunch);

    expect((await findWordsAction.execute({ userId: user.id, q: 'FLE', sort: 'newest' })).map((w) => w.lemma)).toEqual([
      'flee',
    ]);
    expect(
      (await findWordsAction.execute({ userId: user.id, q: 'oddan', sort: 'newest' })).map((w) => w.lemma),
    ).toEqual(['staunch']);
    expect(await findWordsAction.execute({ userId: user.id, q: '%', sort: 'newest' })).toHaveLength(0);
  });

  it('sorts by newest word or by most encounters', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);
    await context.saveWord(book, user.id, staunch);
    await context.saveWord(book, user.id, { ...staunch, sentence: 'A staunch ally.' });

    const newest = await findWordsAction.execute({ userId: user.id, sort: 'newest' });
    const frequent = await findWordsAction.execute({ userId: user.id, sort: 'frequent' });

    expect(newest.map((word) => word.lemma)).toEqual(['staunch', 'flee']);
    expect(frequent.map((word) => word.lemma)).toEqual(['staunch', 'flee']);
    expect(frequent[0]?.encounters).toBe(2);
  });

  it('hides known words by default and lists them with status known or all', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);
    await context.saveWord(book, user.id, staunch);
    const flee = (await findWordsAction.execute({ userId: user.id, sort: 'newest' })).find(
      (word) => word.lemma === 'flee',
    );
    await context.wordRepository.setKnown(flee?.id ?? '', user.id, true);

    const lemmas = async (status?: 'active' | 'known' | 'all'): Promise<string[]> =>
      (await findWordsAction.execute({ userId: user.id, sort: 'newest', ...(status && { status }) })).map(
        (word) => word.lemma,
      );

    expect(await lemmas()).toEqual(['staunch']);
    expect(await lemmas('known')).toEqual(['flee']);
    expect((await lemmas('all')).sort()).toEqual(['flee', 'staunch']);
  });

  it('lists only words met at least the given number of times', async () => {
    const user = await context.createUser();
    const book = await context.createBook(user.id);
    await context.saveWord(book, user.id, fled);
    await context.saveWord(book, user.id, { ...fled, sentence: 'He flees.' });
    await context.saveWord(book, user.id, staunch);

    const metAgain = await findWordsAction.execute({ userId: user.id, sort: 'newest', minEncounters: 2 });

    expect(metAgain.map((word) => word.lemma)).toEqual(['flee']);
    expect(await findWordsAction.execute({ userId: user.id, sort: 'newest', minEncounters: 1 })).toHaveLength(2);
  });
});
