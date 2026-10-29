import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createActionTestContext,
  fled,
  type ActionTestContext,
} from '../../../../../tests/helpers/actionTestContext.ts';
import { wordOccurrences, words } from '../../../../infrastructure/database/schema.ts';
import type { Word } from '../../domain/types/word.ts';

import { GetWordsSummaryAction } from './getWordsSummaryAction.ts';

describe('GetWordsSummaryAction', () => {
  let context: ActionTestContext;
  let getWordsSummaryAction: GetWordsSummaryAction;
  const daysAgo = (days: number): Date => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  beforeEach(async () => {
    context = await createActionTestContext();
    getWordsSummaryAction = new GetWordsSummaryAction(context.wordRepository);
  });
  afterEach(async () => {
    await context.cleanup();
  });

  it('returns zeros for a reader without words', async () => {
    const user = await context.createUser();

    expect(await getWordsSummaryAction.execute(user.id)).toEqual({
      newWords: 0,
      metAgain: 0,
      totalWords: 0,
      knownWords: 0,
    });
  });

  it('counts new words, words met again and known words of the last week', async () => {
    const user = await context.createUser();
    const other = await context.createUser();
    const book = await context.createBook(user.id);

    // Two words from this week, one of them already known.
    await context.saveWord(book, user.id, {
      ...fled,
      lemma: 'ingenuity',
      surfaceForm: 'ingenuity',
      sentence: 'Such ingenuity.',
    });
    await context.saveWord(book, user.id, {
      ...fled,
      lemma: 'staunch',
      surfaceForm: 'staunch',
      sentence: 'A staunch ally.',
    });
    // A word from a month ago that was underlined again today, and an old one that was not.
    await context.saveWord(book, user.id, fled);
    await context.saveWord(book, user.id, {
      ...fled,
      lemma: 'renowned',
      surfaceForm: 'renowned',
      sentence: 'A renowned wizard.',
    });
    await context.saveWord(await context.createBook(other.id), other.id, fled);

    const all = await context.wordRepository.findMany({ userId: user.id, sort: 'newest' });
    const byLemma = (lemma: string): Word | undefined => all.find((word) => word.lemma === lemma);
    await context.wordRepository.setKnown(byLemma('staunch')?.id ?? '', user.id, true);
    for (const lemma of ['flee', 'renowned']) {
      await context.databaseClient.db
        .update(words)
        .set({ createdAt: daysAgo(30) })
        .where(eq(words.id, byLemma(lemma)?.id ?? ''));
    }
    await context.databaseClient.db
      .update(wordOccurrences)
      .set({ createdAt: daysAgo(30) })
      .where(eq(wordOccurrences.wordId, byLemma('renowned')?.id ?? ''));
    await context.saveWord(book, user.id, { ...fled, sentence: 'He fled again today.' });

    expect(await getWordsSummaryAction.execute(user.id)).toEqual({
      newWords: 2,
      metAgain: 1,
      totalWords: 4,
      knownWords: 1,
    });
  });
});
