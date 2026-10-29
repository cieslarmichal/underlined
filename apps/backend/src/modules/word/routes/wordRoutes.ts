import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import { createAuthenticationMiddleware } from '../../../common/auth/authMiddleware.ts';
import type { TokenService } from '../../../common/auth/tokenService.ts';
import { UnauthorizedAccessError } from '../../../common/errors/unathorizedAccessError.ts';
import type { Config } from '../../../core/config.ts';
import type { DatabaseClient } from '../../../infrastructure/database/databaseClient.ts';
import { UserRepositoryImpl } from '../../user/infrastructure/repositories/userRepositoryImpl.ts';
import { DeleteWordAction } from '../application/actions/deleteWordAction.ts';
import { DeleteWordFromBookAction } from '../application/actions/deleteWordFromBookAction.ts';
import { FindWordsAction } from '../application/actions/findWordsAction.ts';
import { UpdateOccurrenceAction } from '../application/actions/updateOccurrenceAction.ts';
import type { Word } from '../domain/types/word.ts';
import { WordRepositoryImpl } from '../infrastructure/repositories/wordRepositoryImpl.ts';

import {
  bookWordParamsSchema,
  occurrenceIdParamsSchema,
  updateOccurrenceRequestSchema,
  wordIdParamsSchema,
  wordsQuerySchema,
  wordsResponseSchema,
  type WordDto,
} from './wordSchemas.ts';

export const wordRoutes: FastifyPluginAsyncTypebox<{
  databaseClient: DatabaseClient;
  config: Config;
  tokenService: TokenService;
}> = async function (fastify, opts) {
  const { databaseClient, config, tokenService } = opts;

  const userRepository = new UserRepositoryImpl(databaseClient);
  const wordRepository = new WordRepositoryImpl(databaseClient);

  const findWordsAction = new FindWordsAction(wordRepository);
  const updateOccurrenceAction = new UpdateOccurrenceAction(wordRepository);
  const deleteWordAction = new DeleteWordAction(wordRepository);
  const deleteWordFromBookAction = new DeleteWordFromBookAction(wordRepository);

  const authenticationMiddleware = createAuthenticationMiddleware(tokenService, userRepository);

  const getUserId = (request: { user?: { userId: string } | undefined }): string => {
    if (!request.user) {
      throw new UnauthorizedAccessError({ reason: 'User not authenticated' });
    }

    return request.user.userId;
  };

  const mapWordToResponse = (word: Word): WordDto => ({
    id: word.id,
    lemma: word.lemma,
    sourceLanguage: word.sourceLanguage,
    targetLanguage: word.targetLanguage,
    encounters: word.encounters,
    occurrences: word.occurrences.map((occurrence) => ({
      ...occurrence,
      createdAt: occurrence.createdAt.toISOString(),
    })),
    createdAt: word.createdAt.toISOString(),
  });

  fastify.get('/words', {
    schema: { querystring: wordsQuerySchema, response: { 200: wordsResponseSchema } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      const { bookId, q, sort } = request.query;

      const words = await findWordsAction.execute({
        userId: getUserId(request),
        bookId,
        q: q?.trim() || undefined,
        sort: sort ?? 'newest',
      });

      return reply.send({ data: words.map(mapWordToResponse) });
    },
  });

  fastify.patch('/occurrences/:id', {
    schema: {
      params: occurrenceIdParamsSchema,
      body: updateOccurrenceRequestSchema,
      response: { 204: Type.Null() },
    },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      await updateOccurrenceAction.execute(request.params.id, getUserId(request), request.body.translation);

      return reply.status(204).send(null);
    },
  });

  fastify.delete('/words/:id', {
    schema: { params: wordIdParamsSchema, response: { 204: Type.Null() } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      await deleteWordAction.execute(request.params.id, getUserId(request));

      return reply.status(204).send(null);
    },
  });

  fastify.delete('/books/:bookId/words/:wordId', {
    schema: { params: bookWordParamsSchema, response: { 204: Type.Null() } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      await deleteWordFromBookAction.execute(request.params.wordId, request.params.bookId, getUserId(request));

      return reply.status(204).send(null);
    },
  });
};
