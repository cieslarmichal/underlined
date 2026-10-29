import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../tests/generator.ts';
import { truncateTables } from '../../../../tests/helpers/dbCleanup.ts';
import { closeTestServer, createTestContext } from '../../../../tests/helpers/testServer.ts';
import { ExternalServiceError } from '../../../common/errors/externalServiceError.ts';
import type { BookSuggestion, BookSuggestionService } from '../../../common/openLibrary/bookSuggestionService.ts';
import type { DatabaseClient } from '../../../infrastructure/database/databaseClient.ts';
import { UserRepositoryImpl } from '../../user/infrastructure/repositories/userRepositoryImpl.ts';

describe('GET /books/search', () => {
  let server: FastifyInstance;
  let databaseClient: DatabaseClient;
  let accessToken: string;
  let calls: { query: string; language?: string | undefined }[];
  let result: BookSuggestion[] | Error;

  const bookSuggestionService: BookSuggestionService = {
    search: async (query, language) => {
      calls.push({ query, language });
      if (result instanceof Error) throw result;
      return result;
    },
  };

  beforeAll(async () => {
    const context = await createTestContext(undefined, bookSuggestionService);
    server = context.server;
    databaseClient = context.databaseClient;
  });

  afterAll(async () => {
    await truncateTables(databaseClient);
    await closeTestServer();
  });

  beforeEach(async () => {
    await truncateTables(databaseClient);
    calls = [];
    result = [{ title: 'Dune', author: 'Frank Herbert', year: 1965 }];

    const email = Generator.email();
    const password = Generator.password();
    await server.inject({ method: 'POST', url: '/users/register', payload: { email, password, nativeLanguage: 'pl' } });
    const user = await new UserRepositoryImpl(databaseClient).findByEmail(email);
    await new UserRepositoryImpl(databaseClient).update(user?.id ?? '', { isEmailVerified: true });
    const login = await server.inject({ method: 'POST', url: '/users/login', payload: { email, password } });
    accessToken = login.json<{ accessToken: string }>().accessToken;
  });

  const search = (query: string): Promise<LightMyRequestResponse> =>
    server.inject({
      method: 'GET',
      url: `/books/search?${query}`,
      headers: { authorization: `Bearer ${accessToken}` },
    });

  it('returns suggestions and passes the query and language on', async () => {
    const response = await search('q=dune&language=en');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ data: [{ title: 'Dune', author: 'Frank Herbert', year: 1965 }] });
    expect(calls).toEqual([{ query: 'dune', language: 'en' }]);
  });

  it('is not shadowed by the book id route and requires authentication', async () => {
    const unauthenticated = await server.inject({ method: 'GET', url: '/books/search?q=dune' });

    expect(unauthenticated.statusCode).toBe(401);
  });

  it('returns an empty list for a too short query without calling the service', async () => {
    const response = await search('q=d');

    expect(response.json()).toEqual({ data: [] });
    expect(calls).toHaveLength(0);
  });

  it('rejects an unsupported language and an oversized query', async () => {
    expect((await search('q=dune&language=de')).statusCode).toBe(400);
    expect((await search(`q=${'x'.repeat(101)}`)).statusCode).toBe(400);
  });

  it('responds with 502 when Open Library fails', async () => {
    result = new ExternalServiceError({ service: 'Open Library', reason: 'down' });

    expect((await search('q=dune')).statusCode).toBe(502);
  });
});
