import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { Readable } from 'node:stream';

import { createAuthenticationMiddleware } from '../../common/auth/authMiddleware.ts';
import type { TokenService } from '../../common/auth/tokenService.ts';
import { OperationNotValidError } from '../../common/errors/operationNotValidError.ts';
import { UnauthorizedAccessError } from '../../common/errors/unathorizedAccessError.ts';
import type { ImageOptimizationService } from '../../common/imageOptimization/imageOptimizationService.ts';
import type { LoggerService } from '../../common/logger/loggerService.ts';
import type { S3Service } from '../../common/s3/s3Service.ts';
import type { Config } from '../../core/config.ts';
import type { DatabaseClient } from '../../infrastructure/database/databaseClient.ts';
import { UserRepositoryImpl } from '../user/infrastructure/repositories/userRepositoryImpl.ts';

import { UploadImageAction } from './application/actions/uploadImageAction.ts';

export const imageRoutes: FastifyPluginAsyncTypebox<{
  databaseClient: DatabaseClient;
  s3Service: S3Service;
  loggerService: LoggerService;
  config: Config;
  tokenService: TokenService;
  imageOptimizationService: ImageOptimizationService;
}> = async function (fastify, opts) {
  const { s3Service, loggerService, config, tokenService, databaseClient, imageOptimizationService } = opts;
  const uploadImageAction = new UploadImageAction(s3Service, loggerService, config, imageOptimizationService);

  const userRepository = new UserRepositoryImpl(databaseClient);

  const authenticationMiddleware = createAuthenticationMiddleware(tokenService, userRepository);

  fastify.post('/images', {
    schema: {
      response: {
        201: Type.Object({
          imageId: Type.String(),
        }),
      },
    },
    config: {
      rateLimit: config.rateLimit.uploadImage,
    },
    preHandler: [authenticationMiddleware],
    handler: async (request, reply) => {
      if (!request.user) {
        throw new UnauthorizedAccessError({
          reason: 'User not authenticated',
        });
      }

      const { userId } = request.user;

      if (!request.isMultipart()) {
        throw new OperationNotValidError({
          reason: 'Request must be multipart/form-data',
          message: 'You must upload a file using multipart form data',
        });
      }

      const files = request.files();
      let fileCount = 0;
      let uploadedImageId: string | undefined;

      for await (const file of files) {
        fileCount++;

        if (fileCount > 1) {
          throw new OperationNotValidError({
            reason: 'Too many files attached',
            message: 'You must attach exactly one file to upload an image',
          });
        }

        const { file: data, mimetype } = file;

        const chunks: Uint8Array[] = [];
        for await (const chunk of data) {
          chunks.push(chunk as Uint8Array);
        }
        const buffer = Buffer.concat(chunks);
        const fileSize = buffer.length;

        const { imageId } = await uploadImageAction.execute(
          {
            data: Readable.from(buffer),
            contentType: mimetype,
            fileSize,
          },
          { requestId: request.id, userId },
        );

        uploadedImageId = imageId;
      }

      if (!uploadedImageId) {
        throw new OperationNotValidError({
          reason: 'No file attached',
          message: 'You must attach exactly one file to upload an image',
        });
      }

      return reply.status(201).send({ imageId: uploadedImageId });
    },
  });
};
