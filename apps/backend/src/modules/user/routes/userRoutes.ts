import { Type, type FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';

import { adminAuthorizationMiddleware, createAuthenticationMiddleware } from '../../../common/auth/authMiddleware.ts';
import type { TokenService } from '../../../common/auth/tokenService.ts';
import { UnauthorizedAccessError } from '../../../common/errors/unathorizedAccessError.ts';
import type { LoggerService } from '../../../common/logger/loggerService.ts';
import type { Config } from '../../../core/config.ts';
import type { EmailQueueService } from '../../../core/emailQueueService.ts';
import type { DatabaseClient } from '../../../infrastructure/database/databaseClient.ts';
import { startOfUtcDay } from '../../capture/application/actions/checkCaptureLimit.ts';
import { CaptureRepositoryImpl } from '../../capture/infrastructure/repositories/captureRepositoryImpl.ts';
import { ChangePasswordAction } from '../application/actions/changePasswordAction.ts';
import { ChangePasswordByTokenAction } from '../application/actions/changePasswordByTokenAction.ts';
import { CreateUserAction } from '../application/actions/createUserAction.ts';
import { DeleteUserAction } from '../application/actions/deleteUserAction.ts';
import { FindUserAction } from '../application/actions/findUserAction.ts';
import { FindUsersAction } from '../application/actions/findUsersAction.ts';
import { LoginUserAction } from '../application/actions/loginUserAction.ts';
import { LogoutUserAction } from '../application/actions/logoutUserAction.ts';
import { RefreshTokenAction } from '../application/actions/refreshTokenAction.ts';
import { ResendVerificationEmailAction } from '../application/actions/resendVerificationEmailAction.ts';
import { SendResetPasswordEmailAction } from '../application/actions/sendResetPasswordEmailAction.ts';
import { UpdateNativeLanguageAction } from '../application/actions/updateNativeLanguageAction.ts';
import { ValidateOneTimeTokenAction } from '../application/actions/validateOneTimeTokenAction.ts';
import { VerifyUserEmailAction } from '../application/actions/verifyUserEmailAction.ts';
import { PasswordService } from '../application/services/passwordService.ts';
import type { User } from '../domain/types/user.ts';
import { OneTimeTokenRepositoryImpl } from '../infrastructure/repositories/oneTimeTokenRepositoryImpl.ts';
import { UserRepositoryImpl } from '../infrastructure/repositories/userRepositoryImpl.ts';
import { UserSessionRepositoryImpl } from '../infrastructure/repositories/userSessionRepositoryImpl.ts';

import {
  adminUsersQuerySchema,
  adminUsersResponseSchema,
  changePasswordByTokenRequestSchema,
  loginRequestSchema,
  loginResponseSchema,
  refreshTokenResponseSchema,
  profileSchema,
  registerRequestSchema,
  updateProfileRequestSchema,
  resendVerificationRequestSchema,
  sendResetPasswordEmailRequestSchema,
  userSchema,
  validateOneTimeTokenRequestSchema,
  validateOneTimeTokenResponseSchema,
  verifyEmailRequestSchema,
  type AdminUserDto,
  type UserDto,
} from './userSchemas.ts';

export const userRoutes: FastifyPluginAsyncTypebox<{
  databaseClient: DatabaseClient;
  config: Config;
  loggerService: LoggerService;
  tokenService: TokenService;
  emailQueueService: EmailQueueService;
}> = async function (fastify, opts) {
  const { config, databaseClient, loggerService, tokenService, emailQueueService } = opts;

  const mapUserToResponse = (user: User): UserDto => {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isDeleted: user.isDeleted,
      nativeLanguage: user.nativeLanguage,
      dailyCaptureLimit: user.dailyCaptureLimit,
      createdAt: user.createdAt.toISOString(),
    };
  };

  const mapUserToAdminDto = (user: User): AdminUserDto => {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isDeleted: user.isDeleted,
      createdAt: user.createdAt.toISOString(),
    };
  };

  const refreshTokenCookie = {
    name: config.cookie.refreshToken.name,
    config: {
      httpOnly: true,
      secure: true,
      sameSite: config.cookie.refreshToken.sameSite,
      path: '/',
      maxAge: config.token.refresh.expiresIn,
      ...(config.cookie.refreshToken.domain ? { domain: config.cookie.refreshToken.domain } : {}),
    },
  };

  const userRepository = new UserRepositoryImpl(databaseClient);
  const userSessionRepository = new UserSessionRepositoryImpl(databaseClient);
  const oneTimeTokenRepository = new OneTimeTokenRepositoryImpl(databaseClient);
  const passwordService = new PasswordService(config);

  const createUserAction = new CreateUserAction(
    userRepository,
    oneTimeTokenRepository,
    loggerService,
    passwordService,
    emailQueueService,
    config,
    databaseClient,
  );
  const findUserAction = new FindUserAction(userRepository);
  const findUsersAction = new FindUsersAction(userRepository);
  const deleteUserAction = new DeleteUserAction(userRepository, loggerService, databaseClient);
  const loginUserAction = new LoginUserAction(
    userRepository,
    loggerService,
    tokenService,
    passwordService,
    userSessionRepository,
  );
  const refreshTokenAction = new RefreshTokenAction(
    userRepository,
    userSessionRepository,
    loggerService,
    tokenService,
    config,
    databaseClient,
  );
  const logoutUserAction = new LogoutUserAction(userSessionRepository, tokenService);
  const verifyUserEmailAction = new VerifyUserEmailAction(
    userRepository,
    loggerService,
    oneTimeTokenRepository,
    databaseClient,
  );
  const resendVerificationEmailAction = new ResendVerificationEmailAction(
    userRepository,
    loggerService,
    config,
    emailQueueService,
    oneTimeTokenRepository,
    databaseClient,
  );
  const sendResetPasswordEmailAction = new SendResetPasswordEmailAction(
    userRepository,
    loggerService,
    config,
    emailQueueService,
    oneTimeTokenRepository,
    databaseClient,
  );
  const changePasswordAction = new ChangePasswordAction(userRepository, loggerService, passwordService);
  const changePasswordByTokenAction = new ChangePasswordByTokenAction(
    userRepository,
    loggerService,
    passwordService,
    oneTimeTokenRepository,
    databaseClient,
  );
  const validateOneTimeTokenAction = new ValidateOneTimeTokenAction(
    userRepository,
    loggerService,
    oneTimeTokenRepository,
  );

  const captureRepository = new CaptureRepositoryImpl(databaseClient);
  const updateNativeLanguageAction = new UpdateNativeLanguageAction(userRepository);

  const authenticationMiddleware = createAuthenticationMiddleware(tokenService, userRepository);

  fastify.post('/users/register', {
    schema: {
      body: registerRequestSchema,
      response: {
        201: userSchema,
      },
    },
    config: {
      rateLimit: config.rateLimit.register,
    },
    handler: async (request, reply) => {
      const user = await createUserAction.execute(
        {
          email: request.body.email,
          password: request.body.password,
          nativeLanguage: request.body.nativeLanguage,
        },
        {
          requestId: request.id,
        },
      );

      return reply.status(201).send(mapUserToResponse(user));
    },
  });

  fastify.get('/users/me', {
    schema: {
      response: {
        200: profileSchema,
      },
    },
    config: {
      rateLimit: config.rateLimit.profile,
    },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      if (!request.user) {
        throw new UnauthorizedAccessError({
          reason: 'User not authenticated',
        });
      }

      const { userId } = request.user;

      const user = await findUserAction.execute(userId);
      const capturesToday = await captureRepository.countSince(userId, startOfUtcDay());

      return reply.send({ ...mapUserToResponse(user), capturesToday });
    },
  });

  fastify.patch('/users/me', {
    schema: {
      body: updateProfileRequestSchema,
      response: {
        200: userSchema,
      },
    },
    config: {
      rateLimit: config.rateLimit.profile,
    },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      if (!request.user) {
        throw new UnauthorizedAccessError({
          reason: 'User not authenticated',
        });
      }

      const { userId } = request.user;

      const user = await updateNativeLanguageAction.execute(userId, request.body.nativeLanguage);

      return reply.send(mapUserToResponse(user));
    },
  });

  fastify.post('/users/login', {
    schema: {
      body: loginRequestSchema,
      response: {
        200: loginResponseSchema,
      },
    },
    config: {
      rateLimit: config.rateLimit.login,
    },
    handler: async (request, reply) => {
      const { email, password } = request.body;

      const result = await loginUserAction.execute(
        { email, password },
        {
          requestId: request.id,
        },
      );

      reply.setCookie(refreshTokenCookie.name, result.refreshToken, refreshTokenCookie.config);

      return reply.send({ accessToken: result.accessToken });
    },
  });

  fastify.post('/users/logout', {
    schema: {
      response: {
        204: Type.Null(),
      },
    },
    config: {
      rateLimit: config.rateLimit.logout,
    },
    handler: async (request, reply) => {
      const refreshToken = request.cookies[refreshTokenCookie.name];

      await logoutUserAction.execute({ refreshToken });

      reply.clearCookie(refreshTokenCookie.name, {
        path: refreshTokenCookie.config.path,
        ...('domain' in refreshTokenCookie.config ? { domain: refreshTokenCookie.config.domain } : {}),
      });

      return reply.status(204).send(null);
    },
  });

  fastify.post('/users/refresh-token', {
    schema: {
      response: {
        200: refreshTokenResponseSchema,
        401: Type.Object({
          name: Type.String(),
          message: Type.String(),
        }),
      },
    },
    config: {
      rateLimit: config.rateLimit.refreshToken,
    },
    handler: async (request, reply) => {
      const refreshToken = request.cookies[refreshTokenCookie.name];

      if (!refreshToken) {
        // Expected for unauthenticated users — return 401 silently.
        return reply.status(401).send({
          name: 'UnauthorizedAccessError',
          message: 'Refresh token not found',
        });
      }

      // Stateless and idempotent: duplicate concurrent requests receive the same refresh token.
      const result = await refreshTokenAction.execute(
        { refreshToken },
        {
          requestId: request.id,
        },
      );

      reply.setCookie(refreshTokenCookie.name, result.refreshToken, refreshTokenCookie.config);
      return reply.send({ accessToken: result.accessToken });
    },
  });

  fastify.delete('/users/me', {
    schema: {
      response: {
        204: Type.Null(),
      },
    },
    config: {
      rateLimit: config.rateLimit.accountDeletion,
    },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      if (!request.user) {
        throw new UnauthorizedAccessError({
          reason: 'User not authenticated',
        });
      }

      const { userId } = request.user;

      await deleteUserAction.execute(userId, {
        requestId: request.id,
        userId,
      });

      reply.clearCookie(refreshTokenCookie.name, { path: refreshTokenCookie.config.path });

      return reply.status(204).send(null);
    },
  });

  fastify.post('/users/me/change-password', {
    schema: {
      body: Type.Object({
        currentPassword: Type.String({ minLength: 8, maxLength: 64 }),
        newPassword: Type.String({ minLength: 8, maxLength: 64 }),
      }),
      response: {
        204: Type.Null(),
      },
    },
    preValidation: [authenticationMiddleware],
    handler: async (request, reply) => {
      if (!request.user) {
        throw new UnauthorizedAccessError({
          reason: 'User not authenticated',
        });
      }

      const { userId } = request.user;

      await changePasswordAction.execute(
        {
          userId,
          currentPassword: request.body.currentPassword,
          newPassword: request.body.newPassword,
        },
        { requestId: request.id, userId },
      );

      return reply.status(204).send(null);
    },
  });

  fastify.post('/users/verify-email', {
    schema: {
      body: verifyEmailRequestSchema,
      response: {
        204: Type.Null(),
      },
    },
    handler: async (request, reply) => {
      await verifyUserEmailAction.execute({ emailVerificationToken: request.body.token }, { requestId: request.id });

      return reply.status(204).send(null);
    },
  });

  fastify.post('/users/resend-verification', {
    schema: {
      body: resendVerificationRequestSchema,
      response: {
        204: Type.Null(),
      },
    },
    config: {
      rateLimit: config.rateLimit.passwordReset,
    },
    handler: async (request, reply) => {
      await resendVerificationEmailAction.execute({ email: request.body.email }, { requestId: request.id });

      return reply.status(204).send(null);
    },
  });

  fastify.post('/users/send-reset-password-email', {
    schema: {
      body: sendResetPasswordEmailRequestSchema,
      response: {
        204: Type.Null(),
      },
    },
    config: {
      rateLimit: config.rateLimit.passwordReset,
    },
    handler: async (request, reply) => {
      await sendResetPasswordEmailAction.execute({ email: request.body.email }, { requestId: request.id });

      return reply.status(204).send(null);
    },
  });

  fastify.post('/users/change-password-by-token', {
    schema: {
      body: changePasswordByTokenRequestSchema,
      response: {
        204: Type.Null(),
      },
    },
    config: {
      rateLimit: config.rateLimit.passwordReset,
    },
    handler: async (request, reply) => {
      await changePasswordByTokenAction.execute(
        { token: request.body.token, newPassword: request.body.newPassword },
        { requestId: request.id },
      );

      return reply.status(204).send(null);
    },
  });

  fastify.post('/users/validate-one-time-token', {
    schema: {
      body: validateOneTimeTokenRequestSchema,
      response: {
        200: validateOneTimeTokenResponseSchema,
      },
    },
    handler: async (request, reply) => {
      const valid = await validateOneTimeTokenAction.execute({
        token: request.body.token,
        purpose: request.body.purpose,
      });

      return reply.send({ valid });
    },
  });

  fastify.get('/admin/users', {
    schema: {
      querystring: adminUsersQuerySchema,
      response: {
        200: adminUsersResponseSchema,
      },
    },
    preValidation: [authenticationMiddleware, adminAuthorizationMiddleware],
    handler: async (request, reply) => {
      const { email, page = 1, pageSize = 20 } = request.query;

      const { users: foundUsers, total } = await findUsersAction.execute({ email, page, pageSize });

      return reply.send({
        data: foundUsers.map(mapUserToAdminDto),
        metadata: { total },
      });
    },
  });
};
