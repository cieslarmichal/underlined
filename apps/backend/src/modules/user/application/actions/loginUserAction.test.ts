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

      const decodedRefresh = tokenService.verifyRefreshToken(result.refreshToken);
      expect(decodedRefresh.userId).toBe(user.id);
      expect(decodedRefresh.generation).toBe(0);

      const session = await userSessionRepository.findById(decodedRefresh.sessionId);
      expect(session?.status).toBe('active');
      expect(session?.generation).toBe(0);
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

    it('returns the same error for unknown, deleted and wrong-password accounts', async () => {
      const context = Generator.executionContext();
      const rawPassword = Generator.password();
      const hashed = await passwordService.hashPassword(rawPassword);

      const deletedUser = await userRepository.create(Generator.userData({ password: hashed, isEmailVerified: true }));
      const deleted = await userRepository.update(deletedUser.id, { isDeleted: true });
      const active = await userRepository.create(Generator.userData({ password: hashed, isEmailVerified: true }));

      const reasons: unknown[] = [];

      for (const attempt of [
        { email: 'nobody@example.com', password: rawPassword },
        { email: deleted.email, password: rawPassword },
        { email: active.email, password: 'WrongPassword1!' },
      ]) {
        try {
          await loginUserAction.execute(attempt, context);
        } catch (error) {
          reasons.push(error instanceof UnauthorizedAccessError ? error.toJSON() : error);
        }
      }

      expect(reasons).toHaveLength(3);
      expect(new Set(reasons.map((reason) => JSON.stringify(reason))).size).toBe(1);
    });

    it('reveals that the email is unverified only after a correct password', async () => {
      const context = Generator.executionContext();
      const rawPassword = Generator.password();
      const user = await userRepository.create(
        Generator.userData({ password: await passwordService.hashPassword(rawPassword), isEmailVerified: false }),
      );

      const wrongPassword = await loginUserAction
        .execute({ email: user.email, password: 'WrongPassword1!' }, context)
        .catch((error: unknown) => error);
      const rightPassword = await loginUserAction
        .execute({ email: user.email, password: rawPassword }, context)
        .catch((error: unknown) => error);

      expect(wrongPassword).toBeInstanceOf(UnauthorizedAccessError);
      expect((wrongPassword as UnauthorizedAccessError).toJSON()).toMatchObject({ context: { reason: 'Invalid credentials' } });
      expect((rightPassword as UnauthorizedAccessError).toJSON()).toMatchObject({
        context: { reason: 'User email is not verified.' },
      });
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
