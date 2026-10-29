import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../tests/generator.ts';
import { fled } from '../../../../tests/helpers/actionTestContext.ts';
import { truncateTables } from '../../../../tests/helpers/dbCleanup.ts';
import { closeTestServer, createTestContext } from '../../../../tests/helpers/testServer.ts';
import type { DatabaseClient } from '../../../infrastructure/database/databaseClient.ts';
import { BookRepositoryImpl } from '../../book/infrastructure/repositories/bookRepositoryImpl.ts';
import { CaptureRepositoryImpl } from '../../capture/infrastructure/repositories/captureRepositoryImpl.ts';
import { UserRepositoryImpl } from '../../user/infrastructure/repositories/userRepositoryImpl.ts';
import { WordRepositoryImpl } from '../infrastructure/repositories/wordRepositoryImpl.ts';

import type { WordDto } from './wordSchemas.ts';

describe('Word learning routes', () => {
  let server: FastifyInstance;
  let databaseClient: DatabaseClient;
  let accessToken: string;
  let userId: string;
  let bookId: string;

  beforeAll(async () => {
    const context = await createTestContext();
    server = context.server;
    databaseClient = context.databaseClient;
  });

  afterAll(async () => {
    await truncateTables(databaseClient);
    await closeTestServer();
  });

  beforeEach(async () => {
    await truncateTables(databaseClient);

    const users = new UserRepositoryImpl(databaseClient);
    const email = Generator.email();
    const password = Generator.password();
    await server.inject({ method: 'POST', url: '/users/register', payload: { email, password, nativeLanguage: 'pl' } });
    const user = await users.findByEmail(email);
    userId = user?.id ?? '';
    await users.update(userId, { isEmailVerified: true });
    const login = await server.inject({ method: 'POST', url: '/users/login', payload: { email, password } });
    accessToken = login.json<{ accessToken: string }>().accessToken;

    const book = await new BookRepositoryImpl(databaseClient).create({
      userId,
      title: 'Harry Potter',
      author: null,
      language: 'en',
    });
    bookId = book.id;
  });

  const call = (method: 'GET' | 'POST' | 'PATCH', url: string, payload?: object): Promise<LightMyRequestResponse> =>
    server.inject({ method, url, headers: { authorization: `Bearer ${accessToken}` }, ...(payload && { payload }) });

  async function saveWord(sentence = fled.sentence): Promise<string> {
    const capture = await new CaptureRepositoryImpl(databaseClient).create({
      userId,
      bookId,
      imageKey: Generator.uuid(),
      targetLanguage: 'pl',
    });
    await databaseClient.transaction(async (tx) => {
      await new WordRepositoryImpl(databaseClient).saveOccurrence(
        { userId, bookId, captureId: capture.id, sourceLanguage: 'en', targetLanguage: 'pl', ...fled, sentence },
        tx,
      );
    });
    const words = await call('GET', '/words?status=all');
    return words.json<{ data: WordDto[] }>().data[0]?.id ?? '';
  }

  it('requires authentication', async () => {
    for (const url of ['/words/remember', '/words/summary']) {
      expect((await server.inject({ method: 'GET', url })).statusCode).toBe(401);
    }
  });

  it('returns null when there is nothing to remember and a card once a word is saved', async () => {
    expect((await call('GET', '/words/remember')).json()).toEqual({ data: null });

    await saveWord();
    const response = await call('GET', `/words/remember?bookId=${bookId}`);

    expect(response.statusCode).toBe(200);
    expect(response.json<{ data: Record<string, unknown> }>().data).toMatchObject({
      lemma: 'flee',
      sentences: [{ sentence: fled.sentence, surfaceForm: 'fled' }],
      translations: ['uciekać'],
    });
  });

  it('records the outcome and keeps the word out of the cards once it is known', async () => {
    const id = await saveWord();

    expect((await call('POST', `/words/${id}/remember`, { outcome: 'recalled' })).statusCode).toBe(204);
    expect((await call('GET', '/words/remember')).json<{ data: unknown }>().data).not.toBeNull();

    expect((await call('POST', `/words/${id}/remember`, { outcome: 'known' })).statusCode).toBe(204);
    expect((await call('GET', '/words/remember')).json()).toEqual({ data: null });
    expect((await call('POST', `/words/${id}/remember`, { outcome: 'nope' })).statusCode).toBe(400);
  });

  it('marks words as known and filters the list by status', async () => {
    const id = await saveWord();

    expect((await call('PATCH', `/words/${id}/known`, { known: true })).statusCode).toBe(204);

    const list = async (status: string): Promise<WordDto[]> =>
      (await call('GET', `/words?status=${status}`)).json<{ data: WordDto[] }>().data;
    expect(await list('active')).toHaveLength(0);
    expect((await list('known'))[0]).toMatchObject({ id, known: true });
    expect((await call('GET', '/words')).json<{ data: unknown[] }>().data).toHaveLength(0);

    await call('PATCH', `/words/${id}/known`, { known: false });
    expect((await list('active'))[0]).toMatchObject({ id, known: false });
  });

  it('returns 404 for a missing word', async () => {
    expect((await call('PATCH', `/words/${Generator.uuid()}/known`, { known: true })).statusCode).toBe(404);
    expect((await call('POST', `/words/${Generator.uuid()}/remember`, { outcome: 'recalled' })).statusCode).toBe(404);
  });

  it('returns a summary of the last week', async () => {
    await saveWord();

    expect((await call('GET', '/words/summary')).json()).toEqual({
      newWords: 1,
      totalWords: 1,
      knownWords: 0,
    });
  });
});
