import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import { createAuthenticationMiddleware } from '../../../common/auth/authMiddleware.ts';
import type { TokenService } from '../../../common/auth/tokenService.ts';
import { UnauthorizedAccessError } from '../../../common/errors/unathorizedAccessError.ts';
import type { LoggerService } from '../../../common/logger/loggerService.ts';
import type { S3Service } from '../../../common/s3/s3Service.ts';
import type { Config } from '../../../core/config.ts';
import type { DatabaseClient } from '../../../infrastructure/database/databaseClient.ts';
import { UserRepositoryImpl } from '../../user/infrastructure/repositories/userRepositoryImpl.ts';
import { CreateBookAction } from '../application/actions/createBookAction.ts';
import { DeleteBookAction } from '../application/actions/deleteBookAction.ts';
import { FindBookAction } from '../application/actions/findBookAction.ts';
import { FindBooksAction } from '../application/actions/findBooksAction.ts';
import { UpdateBookAction } from '../application/actions/updateBookAction.ts';
import type { Book, BookWithWordCount } from '../domain/types/book.ts';
import { BookRepositoryImpl } from '../infrastructure/repositories/bookRepositoryImpl.ts';

import {
  bookIdParamsSchema,
  bookSchema,
  booksResponseSchema,
  createBookRequestSchema,
  updateBookRequestSchema,
  type BookDto,
} from './bookSchemas.ts';

export const bookRoutes: FastifyPluginAsyncTypebox<{
  databaseClient: DatabaseClient;
  s3Service: S3Service;
  loggerService: LoggerService;
  config: Config;
  tokenService: TokenService;
}> = async function (fastify, opts) {
  const { databaseClient, s3Service, loggerService, config, tokenService } = opts;

  const userRepository = new UserRepositoryImpl(databaseClient);
  const bookRepository = new BookRepositoryImpl(databaseClient);

  const findBookAction = new FindBookAction(bookRepository);
  const findBooksAction = new FindBooksAction(bookRepository);
  const createBookAction = new CreateBookAction(bookRepository, userRepository);
  const updateBookAction = new UpdateBookAction(bookRepository, findBookAction);
  const deleteBookAction = new DeleteBookAction(bookRepository, findBookAction, s3Service, loggerService, config);

  const authenticationMiddleware = createAuthenticationMiddleware(tokenService, userRepository);

  const getUserId = (request: { user?: { userId: string } | undefined }): string => {
    if (!request.user) {
      throw new UnauthorizedAccessError({ reason: 'User not authenticated' });
    }

    return request.user.userId;
  };

  const mapBookToResponse = (book: Book | BookWithWordCount): BookDto => ({
    id: book.id,
    title: book.title,
    author: book.author,
    language: book.language,
    wordCount: 'wordCount' in book ? book.wordCount : 0,
    createdAt: book.createdAt.toISOString(),
  });

  fastify.get('/books', {
    schema: { response: { 200: booksResponseSchema } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      const books = await findBooksAction.execute(getUserId(request));

      return reply.send({ data: books.map(mapBookToResponse) });
    },
  });

  fastify.post('/books', {
    schema: { body: createBookRequestSchema, response: { 201: bookSchema } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      const book = await createBookAction.execute({ userId: getUserId(request), ...request.body });

      return reply.status(201).send(mapBookToResponse(book));
    },
  });

  fastify.get('/books/:id', {
    schema: { params: bookIdParamsSchema, response: { 200: bookSchema } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      const book = await findBookAction.execute(request.params.id, getUserId(request));

      return reply.send(mapBookToResponse(book));
    },
  });

  fastify.patch('/books/:id', {
    schema: { params: bookIdParamsSchema, body: updateBookRequestSchema, response: { 200: bookSchema } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      const book = await updateBookAction.execute({
        id: request.params.id,
        userId: getUserId(request),
        ...request.body,
      });

      return reply.send(mapBookToResponse(book));
    },
  });

  fastify.delete('/books/:id', {
    schema: { params: bookIdParamsSchema, response: { 204: Type.Null() } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      await deleteBookAction.execute(request.params.id, getUserId(request), { requestId: request.id });

      return reply.status(204).send(null);
    },
  });
};
