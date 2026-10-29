import { and, asc, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';

import { IdService } from '../../../../common/id/idService.ts';
import { normalizeLemma, normalizeSentence } from '../../../../common/text/normalize.ts';
import type { BookLanguage, NativeLanguage } from '../../../../common/types/language.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { books, wordOccurrences, words } from '../../../../infrastructure/database/schema.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type { FindWordsParams, SaveOccurrenceData, WordRepository } from '../../domain/repositories/wordRepository.ts';
import type { Word, WordOccurrence } from '../../domain/types/word.ts';

const maxWords = 1000;

export class WordRepositoryImpl implements WordRepository {
  private readonly databaseClient: DatabaseClient;

  public constructor(databaseClient: DatabaseClient) {
    this.databaseClient = databaseClient;
  }

  public async findMany(params: FindWordsParams): Promise<Word[]> {
    const { userId, bookId, q, sort } = params;
    const { db } = this.databaseClient;

    const conditions = [eq(words.userId, userId)];

    if (bookId) {
      conditions.push(eq(wordOccurrences.bookId, bookId));
    }

    if (q) {
      const pattern = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
      const match = or(ilike(words.lemma, pattern), ilike(wordOccurrences.translation, pattern));

      if (match) {
        conditions.push(match);
      }
    }

    const occurrencesCount = sql<number>`(select count(*)::int from ${wordOccurrences} wo where wo.word_id = ${words.id})`;

    const matched = await db
      .selectDistinct({
        word: words,
        encounters: occurrencesCount,
      })
      .from(words)
      .innerJoin(wordOccurrences, eq(wordOccurrences.wordId, words.id))
      .where(and(...conditions))
      .orderBy(...(sort === 'frequent' ? [desc(occurrencesCount)] : []), desc(words.createdAt), asc(words.lemma))
      .limit(maxWords);

    if (matched.length === 0) {
      return [];
    }

    const occurrenceConditions = [
      inArray(
        wordOccurrences.wordId,
        matched.map((row) => row.word.id),
      ),
    ];

    if (bookId) {
      occurrenceConditions.push(eq(wordOccurrences.bookId, bookId));
    }

    const occurrenceRows = await db
      .select({ occurrence: wordOccurrences, bookTitle: books.title })
      .from(wordOccurrences)
      .innerJoin(books, eq(books.id, wordOccurrences.bookId))
      .where(and(...occurrenceConditions))
      .orderBy(desc(wordOccurrences.createdAt));

    const occurrencesByWord = new Map<string, WordOccurrence[]>();

    for (const { occurrence, bookTitle } of occurrenceRows) {
      const list = occurrencesByWord.get(occurrence.wordId) ?? [];

      list.push({
        id: occurrence.id,
        bookId: occurrence.bookId,
        bookTitle,
        surfaceForm: occurrence.surfaceForm,
        sentence: occurrence.sentence,
        translation: occurrence.translation,
        createdAt: occurrence.createdAt,
      });

      occurrencesByWord.set(occurrence.wordId, list);
    }

    return matched.map(({ word, encounters }) => ({
      id: word.id,
      lemma: word.lemma,
      sourceLanguage: word.sourceLanguage as BookLanguage,
      targetLanguage: word.targetLanguage as NativeLanguage,
      createdAt: word.createdAt,
      encounters,
      occurrences: occurrencesByWord.get(word.id) ?? [],
    }));
  }

  public async countOccurrencesByLemma(
    userId: string,
    sourceLanguage: BookLanguage,
    targetLanguage: NativeLanguage,
    lemmaKeys: string[],
  ): Promise<Map<string, number>> {
    if (lemmaKeys.length === 0) {
      return new Map();
    }

    const rows = await this.databaseClient.db
      .select({ lemmaKey: words.lemmaKey, count: count(wordOccurrences.id) })
      .from(words)
      .innerJoin(wordOccurrences, eq(wordOccurrences.wordId, words.id))
      .where(
        and(
          eq(words.userId, userId),
          eq(words.sourceLanguage, sourceLanguage),
          eq(words.targetLanguage, targetLanguage),
          inArray(words.lemmaKey, lemmaKeys),
        ),
      )
      .groupBy(words.lemmaKey);

    return new Map(rows.map((row) => [row.lemmaKey, row.count]));
  }

  public async saveOccurrence(data: SaveOccurrenceData, tx: Transaction): Promise<boolean> {
    const lemmaKey = normalizeLemma(data.lemma);
    const sentenceKey = normalizeSentence(data.sentence);

    await tx
      .insert(words)
      .values({
        id: IdService.generateUuid(),
        userId: data.userId,
        lemma: data.lemma,
        lemmaKey,
        sourceLanguage: data.sourceLanguage,
        targetLanguage: data.targetLanguage,
      })
      .onConflictDoNothing();

    const [word] = await tx
      .select({ id: words.id })
      .from(words)
      .where(
        and(
          eq(words.userId, data.userId),
          eq(words.sourceLanguage, data.sourceLanguage),
          eq(words.targetLanguage, data.targetLanguage),
          eq(words.lemmaKey, lemmaKey),
        ),
      )
      .limit(1);

    if (!word) {
      throw new Error('Failed to save word');
    }

    const [duplicate] = await tx
      .select({ id: wordOccurrences.id })
      .from(wordOccurrences)
      .where(and(eq(wordOccurrences.wordId, word.id), eq(wordOccurrences.sentenceKey, sentenceKey)))
      .limit(1);

    if (duplicate) {
      return false;
    }

    await tx.insert(wordOccurrences).values({
      id: IdService.generateUuid(),
      wordId: word.id,
      bookId: data.bookId,
      captureId: data.captureId,
      surfaceForm: data.surfaceForm,
      sentence: data.sentence,
      sentenceKey,
      translation: data.translation,
    });

    return true;
  }

  public async updateOccurrenceTranslation(id: string, userId: string, translation: string): Promise<boolean> {
    const ownedWords = this.databaseClient.db.select({ id: words.id }).from(words).where(eq(words.userId, userId));

    const updated = await this.databaseClient.db
      .update(wordOccurrences)
      .set({ translation })
      .where(and(eq(wordOccurrences.id, id), inArray(wordOccurrences.wordId, ownedWords)))
      .returning({ id: wordOccurrences.id });

    return updated.length > 0;
  }

  public async deleteWord(id: string, userId: string): Promise<boolean> {
    const deleted = await this.databaseClient.db
      .delete(words)
      .where(and(eq(words.id, id), eq(words.userId, userId)))
      .returning({ id: words.id });

    return deleted.length > 0;
  }

  public async deleteWordFromBook(wordId: string, bookId: string, userId: string): Promise<boolean> {
    return this.databaseClient.transaction(async (tx) => {
      const [word] = await tx
        .select({ id: words.id })
        .from(words)
        .where(and(eq(words.id, wordId), eq(words.userId, userId)))
        .limit(1);

      if (!word) {
        return false;
      }

      const deleted = await tx
        .delete(wordOccurrences)
        .where(and(eq(wordOccurrences.wordId, wordId), eq(wordOccurrences.bookId, bookId)))
        .returning({ id: wordOccurrences.id });

      if (deleted.length === 0) {
        return false;
      }

      const [remaining] = await tx
        .select({ count: count() })
        .from(wordOccurrences)
        .where(eq(wordOccurrences.wordId, wordId));

      if ((remaining?.count ?? 0) === 0) {
        await tx.delete(words).where(eq(words.id, wordId));
      }

      return true;
    });
  }
}
