import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import { type TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import { fastify, type FastifyInstance, type FastifyRequest } from 'fastify';
import type { FastifySchemaValidationError } from 'fastify/types/schema.js';

import { TokenService } from '../common/auth/tokenService.ts';
import { AccountDisabledError } from '../common/errors/accountDisabledError.ts';
import { ExternalServiceError } from '../common/errors/externalServiceError.ts';
import { ForbiddenAccessError } from '../common/errors/forbiddenAccessError.ts';
import { InputNotValidError } from '../common/errors/inputNotValidError.ts';
import { OperationNotValidError } from '../common/errors/operationNotValidError.ts';
import { ResourceAlreadyExistsError } from '../common/errors/resourceAlreadyExistsError.ts';
import { ResourceNotFoundError } from '../common/errors/resourceNotFoundError.ts';
import { UnauthorizedAccessError } from '../common/errors/unathorizedAccessError.ts';
import { IdService } from '../common/id/idService.ts';
import { ImageOptimizationService } from '../common/imageOptimization/imageOptimizationService.ts';
import { type LoggerService } from '../common/logger/loggerService.ts';
import { S3ClientFactory, type S3Config } from '../common/s3/s3ClientFactory.ts';
import { S3Service } from '../common/s3/s3Service.ts';
import type { DatabaseClient } from '../infrastructure/database/databaseClient.ts';
import { imageRoutes } from '../modules/image/imageRoutes.ts';
import { userRoutes } from '../modules/user/routes/userRoutes.ts';

import { type Config } from './config.ts';
import type { EmailQueueService } from './emailQueueService.ts';

const maxBodySize = 10 * 1024 * 1024; // 10MB

export class HttpServer {
  public readonly fastifyServer: FastifyInstance;
  private readonly loggerService: LoggerService;
  private readonly config: Config;
  private readonly databaseClient: DatabaseClient;
  private readonly emailQueueService: EmailQueueService;

  public constructor(
    config: Config,
    loggerService: LoggerService,
    databaseClient: DatabaseClient,
    emailQueueService: EmailQueueService,
  ) {
    this.config = config;
    this.loggerService = loggerService;
    this.databaseClient = databaseClient;
    this.emailQueueService = emailQueueService;

    this.fastifyServer = fastify({
      bodyLimit: maxBodySize,
      logger: false,
      connectionTimeout: 30000,
      keepAliveTimeout: 5000,
      requestTimeout: 30000,
      trustProxy: true,
    }).withTypeProvider<TypeBoxTypeProvider>();
  }

  public async start(): Promise<void> {
    const { host, port } = this.config.server;

    this.setupErrorHandler();

    await this.fastifyServer.register(fastifyCookie, { secret: this.config.cookie.secret });
    await this.fastifyServer.register(fastifyCors, {
      origin: this.config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['X-Request-ID'],
    });
    await this.fastifyServer.register(fastifyMultipart, { limits: { fileSize: 1024 * 1024 * 1024 * 4 } });
    await this.fastifyServer.register(fastifyRateLimit, {
      global: true,
      max: this.config.rateLimit.global.max,
      timeWindow: this.config.rateLimit.global.timeWindow,
      keyGenerator: (request) => request.ip,
    });

    const noiseUrlPatterns = [
      /^\/robots\.txt(\?|$)/,
      /^\/favicon\.ico(\?|$)/,
      /^\/apple-touch-icon[\w-]*\.png(\?|$)/,
      /^\/\.well-known\//,
      /^\/wp-(admin|login|content|includes)/,
    ];

    const skipRequestLog = (request: FastifyRequest): boolean => {
      const isOptions = request.method === 'OPTIONS';
      const isHealth = request.url.includes('/health');
      const isNoise = noiseUrlPatterns.some((pattern) => pattern.test(request.url));
      return isOptions || isHealth || isNoise;
    };

    this.fastifyServer.addHook('onRequest', (request, reply, done) => {
      if (skipRequestLog(request)) {
        done();
        return;
      }

      request.startTime = Date.now();

      const requestId = IdService.generateUuid();
      request.id = requestId;
      reply.header('X-Request-ID', requestId);

      this.loggerService.info({
        message: 'Incoming HTTP request',
        requestId: request.id,
        method: request.method,
        url: request.url,
      });

      done();
    });

    this.fastifyServer.addHook('onSend', (request, reply, _payload, done) => {
      if (skipRequestLog(request)) {
        done();
        return;
      }

      const durationMs = request.startTime ? Date.now() - request.startTime : undefined;

      this.loggerService.info({
        message: 'Request completed',
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        userId: request.user?.userId,
        durationMs,
      });

      done();
    });

    await this.registerRoutes();

    await this.fastifyServer.listen({ port, host });

    this.loggerService.info({ message: 'HTTP Server started', port, host });
  }

  public async stop(): Promise<void> {
    this.loggerService.info({ message: 'Stopping HTTP server' });

    await this.fastifyServer.close();

    this.loggerService.info({ message: 'HTTP server stopped' });
  }

  private setupErrorHandler(): void {
    this.fastifyServer.setSchemaErrorFormatter((errors, dataVar) => {
      const { instancePath, message } = errors[0] as FastifySchemaValidationError;

      return new InputNotValidError({
        reason: `${dataVar}${instancePath} ${message || 'error'}`,
      });
    });

    this.fastifyServer.setErrorHandler((error, request, reply) => {
      const requestId = request.id;
      const baseContext = {
        requestId,
        method: request.method,
        url: request.url,
        userId: request.user?.userId,
        ip: request.ip,
      };

      if (error instanceof TypeError) {
        this.loggerService.error({
          message: 'HTTP request type error',
          ...baseContext,
          err: error,
        });

        return reply.status(500).send({
          name: 'InternalServerError',
          message: 'Internal server error',
        });
      }

      if (error instanceof Error && 'statusCode' in error && error.statusCode === 429) {
        this.loggerService.warn({
          message: 'Rate limit exceeded',
          ...baseContext,
        });

        return reply.status(429).send({
          name: 'TooManyRequestsError',
          message: error.message || 'Rate limit exceeded',
        });
      }

      if (error instanceof UnauthorizedAccessError) {
        if (!error.isSilent) {
          this.loggerService.warn({
            message: 'Unauthorized access attempt',
            ...baseContext,
            errorContext: error.context,
          });
        }

        return reply.status(401).send(error.toJSON());
      }

      if (error instanceof AccountDisabledError) {
        this.loggerService.warn({
          message: 'Account disabled access attempt',
          ...baseContext,
          errorContext: error.context,
        });

        reply.clearCookie('refresh-token', { path: '/' });

        return reply.status(403).send(error.toJSON());
      }

      if (error instanceof ForbiddenAccessError) {
        this.loggerService.warn({
          message: 'Forbidden access attempt',
          ...baseContext,
          errorContext: error.context,
        });

        return reply.status(403).send(error.toJSON());
      }

      if (error instanceof InputNotValidError) {
        this.loggerService.info({
          message: 'Invalid input',
          ...baseContext,
          errorContext: error.context,
        });

        return reply.status(400).send(error.toJSON());
      }

      if (error instanceof OperationNotValidError) {
        this.loggerService.info({
          message: 'Invalid operation',
          ...baseContext,
          errorContext: error.context,
        });

        return reply.status(400).send(error.toJSON());
      }

      if (error instanceof ResourceNotFoundError) {
        this.loggerService.info({
          message: 'Resource not found',
          ...baseContext,
          errorContext: error.context,
        });

        return reply.status(404).send(error.toJSON());
      }

      if (error instanceof ResourceAlreadyExistsError) {
        this.loggerService.warn({
          message: 'Resource conflict',
          ...baseContext,
          errorContext: error.context,
        });

        return reply.status(409).send(error.toJSON());
      }

      if (error instanceof ExternalServiceError) {
        this.loggerService.error({
          message: 'External service error',
          ...baseContext,
          err: error,
        });

        return reply.status(502).send(error.toJSON());
      }

      this.loggerService.error({
        message: 'Unexpected error',
        ...baseContext,
        err: error,
      });

      return reply.status(500).send({
        name: 'InternalServerError',
        message: 'Internal server error',
      });
    });
  }

  private async registerRoutes(): Promise<void> {
    const tokenService = new TokenService(this.config);

    const s3Config: S3Config = {
      accessKeyId: this.config.aws.accessKeyId,
      secretAccessKey: this.config.aws.secretAccessKey,
      region: this.config.aws.region,
      endpoint: this.config.aws.endpoint ?? undefined,
    };
    const s3Client = S3ClientFactory.create(s3Config);
    const s3Service = new S3Service(s3Client);
    const imageOptimizationService = new ImageOptimizationService();

    await this.fastifyServer.register(imageRoutes, {
      databaseClient: this.databaseClient,
      s3Service,
      loggerService: this.loggerService,
      config: this.config,
      tokenService,
      imageOptimizationService,
    });

    await this.fastifyServer.register(userRoutes, {
      databaseClient: this.databaseClient,
      config: this.config,
      loggerService: this.loggerService,
      tokenService,
      emailQueueService: this.emailQueueService,
    });

    this.fastifyServer.get('/health', async (_request, reply) => {
      try {
        await this.databaseClient.testConnection();
        return await reply.status(200).send({ status: 'healthy' });
      } catch (error) {
        this.loggerService.warn({
          message: 'Health check failed',
          err: error,
        });
        return await reply.status(500).send({ status: 'unhealthy' });
      }
    });
  }
}
