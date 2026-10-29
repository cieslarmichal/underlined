import { eq } from 'drizzle-orm';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { TokenService } from '../../../../common/auth/tokenService.ts';
import { UnauthorizedAccessError } from '../../../../common/errors/unathorizedAccessError.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import { LoggerServiceFactory } from '../../../../common/logger/loggerServiceFactory.ts';
import { createConfig, type Config } from '../../../../core/config.ts';
import { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { userSessions, users } from '../../../../infrastructure/database/schema.ts';
import { UserRepositoryImpl } from '../../infrastructure/repositories/userRepositoryImpl.ts';
import { UserSessionRepositoryImpl } from '../../infrastructure/repositories/userSessionRepositoryImpl.ts';
import { PasswordService } from '../services/passwordService.ts';

import { LoginUserAction } from './loginUserAction.ts';
import { RefreshTokenAction } from './refreshTokenAction.ts';

describe('RefreshTokenAction', () => {
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let userSessionRepository: UserSessionRepositoryImpl;
  let loginUserAction: LoginUserAction;
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let loggerService: LoggerService;
  let config: Config;

  const createRefreshTokenAction = (rotationIntervalMs: number): RefreshTokenAction => {
    const actionConfig: Config = {
      ...config,
      token: { ...config.token, refresh: { ...config.token.refresh, rotationIntervalMs } },
    };

    return new RefreshTokenAction(
      userRepository,
      userSessionRepository,
      loggerService,
      tokenService,
      actionConfig,
      databaseClient,
    );
  };

  const login = async (): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> => {
    const password = Generator.password();

    const userData = Generator.userData({
      password: await passwordService.hashPassword(password),
      isEmailVerified: true,
    });

    await userRepository.create(userData);

    const loginResult = await loginUserAction.execute(
      { email: userData.email, password },
      Generator.executionContext(),
    );

    const { sessionId } = tokenService.verifyRefreshToken(loginResult.refreshToken);

    return { ...loginResult, sessionId };
  };

  beforeEach(async () => {
    config = createConfig();
    loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
    databaseClient = new DatabaseClient(config.database, loggerService);
    userRepository = new UserRepositoryImpl(databaseClient);
    userSessionRepository = new UserSessionRepositoryImpl(databaseClient);
    tokenService = new TokenService(config);
    passwordService = new PasswordService(config);

    loginUserAction = new LoginUserAction(
      userRepository,
      loggerService,
      tokenService,
      passwordService,
      userSessionRepository,
    );

    await databaseClient.db.delete(userSessions);
    await databaseClient.db.delete(users);
  });

  afterEach(async () => {
    await databaseClient.db.delete(userSessions);
    await databaseClient.db.delete(users);
    await databaseClient.close();
  });

  describe('execute', () => {
    it('rotates refresh token when rotation is due', async () => {
      const refreshTokenAction = createRefreshTokenAction(0);
      const { refreshToken, sessionId } = await login();

      const result = await refreshTokenAction.execute({ refreshToken }, Generator.executionContext());

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).not.toBe(refreshToken);
      expect(tokenService.verifyRefreshToken(result.refreshToken).generation).toBe(1);

      const session = await userSessionRepository.findById(sessionId);
      expect(session?.generation).toBe(1);
      expect(session?.prevUsableUntil).not.toBeNull();
    });

    it('returns the same refresh token without rotation when rotation is not due', async () => {
      const refreshTokenAction = createRefreshTokenAction(60 * 60 * 1000);
      const { refreshToken, sessionId } = await login();

      const result = await refreshTokenAction.execute({ refreshToken }, Generator.executionContext());

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBe(refreshToken);

      const session = await userSessionRepository.findById(sessionId);
      expect(session?.generation).toBe(0);
    });

    it('returns the current refresh token when previous token is presented within grace period', async () => {
      const refreshTokenAction = createRefreshTokenAction(0);
      const { refreshToken } = await login();

      const first = await refreshTokenAction.execute({ refreshToken }, Generator.executionContext());
      const duplicate = await refreshTokenAction.execute({ refreshToken }, Generator.executionContext());

      expect(duplicate.refreshToken).toBe(first.refreshToken);
    });

    it('handles concurrent refreshes with the same token and returns identical refresh tokens', async () => {
      const refreshTokenAction = createRefreshTokenAction(0);
      const { refreshToken, sessionId } = await login();

      const results = await Promise.all(
        Array.from({ length: 3 }, () => refreshTokenAction.execute({ refreshToken }, Generator.executionContext())),
      );

      const refreshTokens = new Set(results.map((result) => result.refreshToken));
      expect(refreshTokens.size).toBe(1);

      const session = await userSessionRepository.findById(sessionId);
      expect(session?.generation).toBe(1);
      expect(session?.status).toBe('active');
    });

    it('revokes session when previous token is presented after grace period', async () => {
      const refreshTokenAction = createRefreshTokenAction(0);
      const { refreshToken, sessionId } = await login();

      await refreshTokenAction.execute({ refreshToken }, Generator.executionContext());

      await databaseClient.db
        .update(userSessions)
        .set({ prevUsableUntil: new Date(Date.now() - 1000) })
        .where(eq(userSessions.id, sessionId));

      await expect(refreshTokenAction.execute({ refreshToken }, Generator.executionContext())).rejects.toThrow(
        UnauthorizedAccessError,
      );

      const session = await userSessionRepository.findById(sessionId);
      expect(session?.status).toBe('revoked');
    });

    it('revokes session when an older generation token is presented', async () => {
      const refreshTokenAction = createRefreshTokenAction(0);
      const { refreshToken, sessionId } = await login();

      const first = await refreshTokenAction.execute({ refreshToken }, Generator.executionContext());
      await refreshTokenAction.execute({ refreshToken: first.refreshToken }, Generator.executionContext());

      await expect(refreshTokenAction.execute({ refreshToken }, Generator.executionContext())).rejects.toThrow(
        UnauthorizedAccessError,
      );

      const session = await userSessionRepository.findById(sessionId);
      expect(session?.status).toBe('revoked');
    });

    it('throws UnauthorizedAccessError when session is revoked', async () => {
      const refreshTokenAction = createRefreshTokenAction(0);
      const { refreshToken, sessionId } = await login();

      await userSessionRepository.revoke(sessionId);

      await expect(refreshTokenAction.execute({ refreshToken }, Generator.executionContext())).rejects.toThrow(
        UnauthorizedAccessError,
      );
    });

    it('throws UnauthorizedAccessError when refresh token is invalid', async () => {
      const refreshTokenAction = createRefreshTokenAction(0);

      await expect(
        refreshTokenAction.execute({ refreshToken: 'invalid-token' }, Generator.executionContext()),
      ).rejects.toThrow(UnauthorizedAccessError);
    });
  });
});
