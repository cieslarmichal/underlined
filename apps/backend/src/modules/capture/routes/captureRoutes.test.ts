import { CreateBucketCommand } from '@aws-sdk/client-s3';
import type { FastifyInstance } from 'fastify';
import sharp from 'sharp';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../tests/generator.ts';
import { truncateTables } from '../../../../tests/helpers/dbCleanup.ts';
import { closeTestServer, createTestContext } from '../../../../tests/helpers/testServer.ts';
import type { PageAnalysisService, UnderlinedWord } from '../../../common/ai/pageAnalysisService.ts';
import { S3ClientFactory } from '../../../common/s3/s3ClientFactory.ts';
import { createConfig } from '../../../core/config.ts';
import type { DatabaseClient } from '../../../infrastructure/database/databaseClient.ts';
import { users } from '../../../infrastructure/database/schema.ts';
import type { BookDto } from '../../book/routes/bookSchemas.ts';
import { UserRepositoryImpl } from '../../user/infrastructure/repositories/userRepositoryImpl.ts';
import type { WordDto } from '../../word/routes/wordSchemas.ts';

import type { CaptureDto } from './captureSchemas.ts';

const fled: UnderlinedWord = {
  surfaceForm: 'fled',
  lemma: 'flee',
  sentence: 'Harry fled the room before anyone could stop him.',
  translation: 'uciekać',
};

describe('Book, capture and word flow', () => {
  let server: FastifyInstance;
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let analysis: { items: UnderlinedWord[]; fail: boolean; calls: number };
  let accessToken: string;
  let image: Buffer;

  const pageAnalysisService: PageAnalysisService = {
    analyzePage: async () => {
      analysis.calls++;
      if (analysis.fail) throw new Error('model down');
      return analysis.items;
    },
  };

  beforeAll(async () => {
    const config = createConfig();
    const s3Client = S3ClientFactory.create({
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
      region: config.aws.region,
      endpoint: config.aws.endpoint,
    });
    await s3Client.send(new CreateBucketCommand({ Bucket: config.aws.bucketName })).catch(() => undefined);

    const context = await createTestContext(pageAnalysisService);
    server = context.server;
    databaseClient = context.databaseClient;
    userRepository = new UserRepositoryImpl(databaseClient);
    image = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#fff' } })
      .png()
      .toBuffer();
  });

  afterAll(async () => {
    await truncateTables(databaseClient);
    await closeTestServer();
  });

  beforeEach(async () => {
    await truncateTables(databaseClient);
    analysis = { items: [fled], fail: false, calls: 0 };

    const email = Generator.email();
    const password = Generator.password();
    await server.inject({ method: 'POST', url: '/users/register', payload: { email, password, nativeLanguage: 'pl' } });
    const user = await userRepository.findByEmail(email);
    if (!user) throw new Error('User not found');
    await userRepository.update(user.id, { isEmailVerified: true });
    const login = await server.inject({ method: 'POST', url: '/users/login', payload: { email, password } });
    accessToken = login.json<{ accessToken: string }>().accessToken;
  });

  const auth = (): Record<string, string> => ({ authorization: `Bearer ${accessToken}` });

  async function createBook(language = 'en', title = 'Harry Potter'): Promise<BookDto> {
    const response = await server.inject({
      method: 'POST',
      url: '/books',
      headers: auth(),
      payload: { title, language },
    });
    expect(response.statusCode).toBe(201);
    return response.json<BookDto>();
  }

  async function uploadCapture(bookId: string): Promise<{ statusCode: number; body: CaptureDto }> {
    const boundary = '----underlined';
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="page.png"\r\nContent-Type: image/png\r\n\r\n`,
      ),
      image,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const response = await server.inject({
      method: 'POST',
      url: `/books/${bookId}/captures`,
      headers: { ...auth(), 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    return { statusCode: response.statusCode, body: response.json<CaptureDto>() };
  }

  async function listWords(query = ''): Promise<WordDto[]> {
    const response = await server.inject({ method: 'GET', url: `/words${query}`, headers: auth() });
    return response.json<{ data: WordDto[] }>().data;
  }

  describe('books', () => {
    it('rejects a book in the native language', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/books',
        headers: auth(),
        payload: { title: 'Pan Tadeusz', language: 'en' },
      });
      expect(response.statusCode).toBe(201);

      await server.inject({ method: 'PATCH', url: '/users/me', headers: auth(), payload: { nativeLanguage: 'en' } });
      const sameLanguage = await server.inject({
        method: 'POST',
        url: '/books',
        headers: auth(),
        payload: { title: 'Dune', language: 'en' },
      });
      expect(sameLanguage.statusCode).toBe(400);
    });

    it('does not expose books of other users', async () => {
      const book = await createBook();
      const other = Generator.email();
      const password = Generator.password();
      await server.inject({
        method: 'POST',
        url: '/users/register',
        payload: { email: other, password, nativeLanguage: 'pl' },
      });
      const otherUser = await userRepository.findByEmail(other);
      await userRepository.update(otherUser?.id ?? '', { isEmailVerified: true });
      const login = await server.inject({ method: 'POST', url: '/users/login', payload: { email: other, password } });

      const response = await server.inject({
        method: 'GET',
        url: `/books/${book.id}`,
        headers: { authorization: `Bearer ${login.json<{ accessToken: string }>().accessToken}` },
      });
      expect(response.statusCode).toBe(404);
    });

    it('updates and deletes a book without words', async () => {
      const book = await createBook();

      const patched = await server.inject({
        method: 'PATCH',
        url: `/books/${book.id}`,
        headers: auth(),
        payload: { title: 'Hobbit', author: 'Tolkien' },
      });
      expect(patched.json<BookDto>()).toMatchObject({ title: 'Hobbit', author: 'Tolkien' });

      const deleted = await server.inject({ method: 'DELETE', url: `/books/${book.id}`, headers: auth() });
      expect(deleted.statusCode).toBe(204);
    });
  });

  describe('captures', () => {
    it('analyzes a photo, accepts it and lists the word', async () => {
      const book = await createBook();

      const { statusCode, body } = await uploadCapture(book.id);

      expect(statusCode).toBe(201);
      expect(body.status).toBe('pending_review');
      expect(body.items).toEqual([{ lemma: 'flee', surfaceForm: 'fled', translation: 'uciekać' }]);

      const pending = await server.inject({ method: 'GET', url: `/books/${book.id}/captures`, headers: auth() });
      expect(pending.json<{ data: CaptureDto[] }>().data).toHaveLength(1);

      const accepted = await server.inject({ method: 'POST', url: `/captures/${body.id}/accept`, headers: auth() });
      expect(accepted.statusCode).toBe(204);

      const words = await listWords(`?bookId=${book.id}`);
      expect(words).toHaveLength(1);
      expect(words[0]).toMatchObject({ lemma: 'flee', encounters: 1 });
      expect(words[0]?.occurrences[0]).toMatchObject({ sentence: fled.sentence, translation: 'uciekać' });

      const again = await server.inject({ method: 'POST', url: `/captures/${body.id}/accept`, headers: auth() });
      expect(again.statusCode).toBe(400);
    });

    it('counts a repeated word once per new sentence and ignores the same sentence', async () => {
      const book = await createBook();

      const first = await uploadCapture(book.id);
      await server.inject({ method: 'POST', url: `/captures/${first.body.id}/accept`, headers: auth() });

      analysis.items = [
        { surfaceForm: 'Flees', lemma: 'Flee', sentence: 'He flees from the house.', translation: 'uciekać' },
        {
          surfaceForm: 'fled',
          lemma: 'flee',
          sentence: 'Harry fled the room before anyone could stop him.',
          translation: 'uciekać',
        },
      ];
      const second = await uploadCapture(book.id);
      expect(second.body.items).toHaveLength(2);
      await server.inject({ method: 'POST', url: `/captures/${second.body.id}/accept`, headers: auth() });

      const words = await listWords();
      expect(words).toHaveLength(1);
      expect(words[0]?.encounters).toBe(2);
    });

    it('treats an empty result as nothing to review', async () => {
      const book = await createBook();
      analysis.items = [];

      const { body } = await uploadCapture(book.id);

      expect(body).toMatchObject({ status: 'rejected', items: [] });
    });

    it('keeps a failed capture and retries it without a new upload', async () => {
      const book = await createBook();
      analysis.fail = true;

      const failed = await uploadCapture(book.id);
      expect(failed.body.status).toBe('failed');

      analysis.fail = false;
      const retry = await server.inject({ method: 'POST', url: `/captures/${failed.body.id}/retry`, headers: auth() });

      expect(retry.statusCode).toBe(200);
      expect(retry.json<CaptureDto>().status).toBe('pending_review');
    });

    it('rejects a capture and saves nothing', async () => {
      const book = await createBook();
      const { body } = await uploadCapture(book.id);

      const rejected = await server.inject({ method: 'POST', url: `/captures/${body.id}/reject`, headers: auth() });

      expect(rejected.statusCode).toBe(204);
      expect(await listWords()).toHaveLength(0);
    });

    it('enforces the daily limit but does not count failed photos', async () => {
      const book = await createBook();
      await databaseClient.db.update(users).set({ dailyCaptureLimit: 1 });

      analysis.fail = true;
      await uploadCapture(book.id);
      analysis.fail = false;

      expect((await uploadCapture(book.id)).statusCode).toBe(201);
      expect((await uploadCapture(book.id)).statusCode).toBe(400);

      const me = await server.inject({ method: 'GET', url: '/users/me', headers: auth() });
      expect(me.json<{ capturesToday: number; dailyCaptureLimit: number }>()).toMatchObject({
        capturesToday: 1,
        dailyCaptureLimit: 1,
      });
    });
  });

  describe('words', () => {
    async function saveFled(bookId: string): Promise<WordDto> {
      const { body } = await uploadCapture(bookId);
      await server.inject({ method: 'POST', url: `/captures/${body.id}/accept`, headers: auth() });
      const word = (await listWords())[0];
      if (!word) throw new Error('Word not saved');
      return word;
    }

    it('blocks deleting a book that has words (409)', async () => {
      const book = await createBook();
      await saveFled(book.id);

      const response = await server.inject({ method: 'DELETE', url: `/books/${book.id}`, headers: auth() });

      expect(response.statusCode).toBe(409);
    });

    it('edits the translation of an occurrence and searches by it', async () => {
      const book = await createBook();
      const word = await saveFled(book.id);

      const patched = await server.inject({
        method: 'PATCH',
        url: `/occurrences/${word.occurrences[0]?.id ?? ''}`,
        headers: auth(),
        payload: { translation: 'zbiec' },
      });

      expect(patched.statusCode).toBe(204);
      expect(await listWords('?q=zbiec')).toHaveLength(1);
      expect(await listWords('?q=nope')).toHaveLength(0);
    });

    it('deletes the word from a book, then allows deleting the book', async () => {
      const book = await createBook();
      const word = await saveFled(book.id);

      const deleted = await server.inject({
        method: 'DELETE',
        url: `/books/${book.id}/words/${word.id}`,
        headers: auth(),
      });

      expect(deleted.statusCode).toBe(204);
      expect(await listWords()).toHaveLength(0);
      expect((await server.inject({ method: 'DELETE', url: `/books/${book.id}`, headers: auth() })).statusCode).toBe(
        204,
      );
    });

    it('deletes the whole word from the board', async () => {
      const book = await createBook();
      const word = await saveFled(book.id);

      const deleted = await server.inject({ method: 'DELETE', url: `/words/${word.id}`, headers: auth() });

      expect(deleted.statusCode).toBe(204);
      expect(await listWords()).toHaveLength(0);
    });

    it('sorts by most encountered', async () => {
      const book = await createBook();
      analysis.items = [
        fled,
        {
          surfaceForm: 'staunchest',
          lemma: 'staunch',
          sentence: 'He was the staunchest friend.',
          translation: 'oddany',
        },
      ];
      const first = await uploadCapture(book.id);
      await server.inject({ method: 'POST', url: `/captures/${first.body.id}/accept`, headers: auth() });
      analysis.items = [
        { surfaceForm: 'staunch', lemma: 'staunch', sentence: 'A staunch supporter.', translation: 'oddany' },
      ];
      const second = await uploadCapture(book.id);
      await server.inject({ method: 'POST', url: `/captures/${second.body.id}/accept`, headers: auth() });

      const words = await listWords('?sort=frequent');

      expect(words.map((word) => word.lemma)).toEqual(['staunch', 'flee']);
    });
  });
});
