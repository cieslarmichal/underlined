import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { TokenService } from '../../../../common/auth/tokenService.ts';
import { UnauthorizedAccessError } from '../../../../common/errors/unathorizedAccessError.ts';
import { LoggerServiceFactory } from '../../../../common/logger/loggerServiceFactory.ts';
import { createConfig, type Config } from '../../../../core/config.ts';
import { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { userSessions, users } from '../../../../infrastructure/database/schema.ts';
import { UserRepositoryImpl } from '../../infrastructure/repositories/userRepositoryImpl.ts';
import { UserSessionRepositoryImpl } from '../../infrastructure/repositories/userSessionRepositoryImpl.ts';
import { PasswordService } from '../services/passwordService.ts';

import { LoginUserAction } from './loginUserAction.ts';

describe('LoginUserAction', () => {
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let loginUserAction: LoginUserAction;
  let tokenService: TokenService;
  let passwordService: PasswordService;
  let config: Config;
  let userSessionRepository: UserSessionRepositoryImpl;

  beforeEach(async () => {
    config = createConfig();
    const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
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
    it('logs in user successfully with valid credentials', async () => {
      const password = Generator.password();
      const context = Generator.executionContext();

      const userData = Generator.userData({
        password: await passwordService.hashPassword(password),
        isEmailVerified: true,
      });

      const user = await userRepository.create(userData);

      const result = await loginUserAction.execute(
        {
          email: userData.email,
          password,
        },
        context,
      );

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      const decodedAccess = tokenService.verifyAccessToken(result.accessToken);
      expect(decodedAccess.userId).toBe(user.id);
      expect(decodedAccess.email).toBe(user.email);
      expect(decodedAccess.role).toBe('user');

      const decodedRefresh = tokenService.verifyRefreshToken(result.refreshToken);
      expect(decodedRefresh.userId).toBe(user.id);
      expect(decodedRefresh.email).toBe(user.email);
    });

    it('throws UnauthorizedAccessError when user does not exist', async () => {
      const context = Generator.executionContext();

      await expect(
        loginUserAction.execute(
          {
            email: 'nonexistent@example.com',
            password: 'anypassword',
          },
          context,
        ),
      ).rejects.toThrow(UnauthorizedAccessError);
    });

    it('throws UnauthorizedAccessError when password is incorrect', async () => {
      const userData = Generator.userData({
        password: await passwordService.hashPassword(Generator.password()),
        isEmailVerified: true,
      });
      const context = Generator.executionContext();

      await userRepository.create(userData);

      await expect(
        loginUserAction.execute(
          {
            email: userData.email,
            password: 'wrongpassword',
          },
          context,
        ),
      ).rejects.toThrow(UnauthorizedAccessError);
    });
  });
});
