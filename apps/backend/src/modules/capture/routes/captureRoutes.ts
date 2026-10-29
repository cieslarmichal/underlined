import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import type { PageAnalysisService } from '../../../common/ai/pageAnalysisService.ts';
import { createAuthenticationMiddleware } from '../../../common/auth/authMiddleware.ts';
import type { TokenService } from '../../../common/auth/tokenService.ts';
import { OperationNotValidError } from '../../../common/errors/operationNotValidError.ts';
import { UnauthorizedAccessError } from '../../../common/errors/unathorizedAccessError.ts';
import type { ImageOptimizationService } from '../../../common/imageOptimization/imageOptimizationService.ts';
import type { LoggerService } from '../../../common/logger/loggerService.ts';
import type { S3Service } from '../../../common/s3/s3Service.ts';
import type { Config } from '../../../core/config.ts';
import type { DatabaseClient } from '../../../infrastructure/database/databaseClient.ts';
import { BookRepositoryImpl } from '../../book/infrastructure/repositories/bookRepositoryImpl.ts';
import { UserRepositoryImpl } from '../../user/infrastructure/repositories/userRepositoryImpl.ts';
import { WordRepositoryImpl } from '../../word/infrastructure/repositories/wordRepositoryImpl.ts';
import { AcceptCaptureAction } from '../application/actions/acceptCaptureAction.ts';
import { AnalyzeCaptureAction } from '../application/actions/analyzeCaptureAction.ts';
import { CreateCaptureAction } from '../application/actions/createCaptureAction.ts';
import { FindCapturesAction } from '../application/actions/findCapturesAction.ts';
import { RejectCaptureAction } from '../application/actions/rejectCaptureAction.ts';
import { RetryCaptureAction } from '../application/actions/retryCaptureAction.ts';
import type { Capture } from '../domain/types/capture.ts';
import { CaptureRepositoryImpl } from '../infrastructure/repositories/captureRepositoryImpl.ts';

import {
  bookIdParamsSchema,
  captureIdParamsSchema,
  captureSchema,
  capturesQuerySchema,
  capturesResponseSchema,
  type CaptureDto,
} from './captureSchemas.ts';

export const captureRoutes: FastifyPluginAsyncTypebox<{
  databaseClient: DatabaseClient;
  s3Service: S3Service;
  loggerService: LoggerService;
  config: Config;
  tokenService: TokenService;
  imageOptimizationService: ImageOptimizationService;
  pageAnalysisService: PageAnalysisService;
}> = async function (fastify, opts) {
  const {
    databaseClient,
    s3Service,
    loggerService,
    config,
    tokenService,
    imageOptimizationService,
    pageAnalysisService,
  } = opts;

  const userRepository = new UserRepositoryImpl(databaseClient);
  const bookRepository = new BookRepositoryImpl(databaseClient);
  const wordRepository = new WordRepositoryImpl(databaseClient);
  const captureRepository = new CaptureRepositoryImpl(databaseClient);

  const analyzeCaptureAction = new AnalyzeCaptureAction(captureRepository, pageAnalysisService, loggerService);
  const createCaptureAction = new CreateCaptureAction(
    captureRepository,
    bookRepository,
    userRepository,
    analyzeCaptureAction,
    imageOptimizationService,
    s3Service,
    config,
  );
  const retryCaptureAction = new RetryCaptureAction(
    captureRepository,
    bookRepository,
    userRepository,
    analyzeCaptureAction,
    s3Service,
    config,
  );
  const acceptCaptureAction = new AcceptCaptureAction(
    captureRepository,
    bookRepository,
    wordRepository,
    databaseClient,
  );
  const rejectCaptureAction = new RejectCaptureAction(captureRepository);
  const findCapturesAction = new FindCapturesAction(captureRepository, bookRepository);

  const authenticationMiddleware = createAuthenticationMiddleware(tokenService, userRepository);

  const getUserId = (request: { user?: { userId: string } | undefined }): string => {
    if (!request.user) {
      throw new UnauthorizedAccessError({ reason: 'User not authenticated' });
    }

    return request.user.userId;
  };

  const mapCaptureToResponse = (capture: Capture): CaptureDto => ({
    id: capture.id,
    bookId: capture.bookId,
    status: capture.status,
    items: capture.items.map(({ lemma, surfaceForm, translation }) => ({ lemma, surfaceForm, translation })),
    createdAt: capture.createdAt.toISOString(),
  });

  fastify.post('/books/:id/captures', {
    schema: { params: bookIdParamsSchema, response: { 201: captureSchema } },
    config: { rateLimit: config.rateLimit.capture },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      const userId = getUserId(request);

      if (!request.isMultipart()) {
        throw new OperationNotValidError({ reason: 'Request must be multipart/form-data' });
      }

      const file = await request.file();

      if (!file) {
        throw new OperationNotValidError({ reason: 'You must attach exactly one photo' });
      }

      const data = await file.toBuffer();

      const capture = await createCaptureAction.execute(
        { userId, bookId: request.params.id, data, contentType: file.mimetype },
        { requestId: request.id, userId },
      );

      return reply.status(201).send(mapCaptureToResponse(capture));
    },
  });

  fastify.get('/books/:id/captures', {
    schema: {
      params: bookIdParamsSchema,
      querystring: capturesQuerySchema,
      response: { 200: capturesResponseSchema },
    },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      const captures = await findCapturesAction.execute(
        request.params.id,
        getUserId(request),
        request.query.status ?? 'pending_review',
      );

      return reply.send({ data: captures.map(mapCaptureToResponse) });
    },
  });

  fastify.post('/captures/:id/accept', {
    schema: { params: captureIdParamsSchema, response: { 204: Type.Null() } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      await acceptCaptureAction.execute(request.params.id, getUserId(request));

      return reply.status(204).send(null);
    },
  });

  fastify.post('/captures/:id/reject', {
    schema: { params: captureIdParamsSchema, response: { 204: Type.Null() } },
    config: { rateLimit: config.rateLimit.profile },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      await rejectCaptureAction.execute(request.params.id, getUserId(request));

      return reply.status(204).send(null);
    },
  });

  fastify.post('/captures/:id/retry', {
    schema: { params: captureIdParamsSchema, response: { 200: captureSchema } },
    config: { rateLimit: config.rateLimit.capture },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      const userId = getUserId(request);

      const capture = await retryCaptureAction.execute(request.params.id, userId, { requestId: request.id, userId });

      return reply.send(mapCaptureToResponse(capture));
    },
  });
};
