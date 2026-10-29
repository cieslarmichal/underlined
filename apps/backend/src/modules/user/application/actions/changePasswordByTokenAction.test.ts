import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
import { InputNotValidError } from '../../../../common/errors/inputNotValidError.ts';
import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { IdService } from '../../../../common/id/idService.ts';
import { LoggerServiceFactory } from '../../../../common/logger/loggerServiceFactory.ts';
import { createConfig } from '../../../../core/config.ts';
import { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { oneTimeTokens, users } from '../../../../infrastructure/database/schema.ts';
import { OneTimeTokenRepositoryImpl } from '../../infrastructure/repositories/oneTimeTokenRepositoryImpl.ts';
import { UserRepositoryImpl } from '../../infrastructure/repositories/userRepositoryImpl.ts';
import { PasswordService } from '../services/passwordService.ts';

import { ChangePasswordByTokenAction } from './changePasswordByTokenAction.ts';

describe('ChangePasswordByTokenAction', () => {
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let oneTimeTokenRepository: OneTimeTokenRepositoryImpl;
  let changePasswordByTokenAction: ChangePasswordByTokenAction;
  let passwordService: PasswordService;

  beforeEach(async () => {
    const config = createConfig();
    const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
    databaseClient = new DatabaseClient(config.database, loggerService);
    userRepository = new UserRepositoryImpl(databaseClient);
    oneTimeTokenRepository = new OneTimeTokenRepositoryImpl(databaseClient);
    passwordService = new PasswordService(config);

    changePasswordByTokenAction = new ChangePasswordByTokenAction(
      userRepository,
      loggerService,
      passwordService,
      oneTimeTokenRepository,
      databaseClient,
    );

    await databaseClient.db.delete(oneTimeTokens);
    await databaseClient.db.delete(users);
  });

  afterEach(async () => {
    await databaseClient.db.delete(oneTimeTokens);
    await databaseClient.db.delete(users);
    await databaseClient.close();
  });

  describe('execute', () => {
    it('changes password successfully with valid reset token', async () => {
      const user = await userRepository.create(
        Generator.userData({ password: await passwordService.hashPassword(Generator.password()) }),
      );
      const context = Generator.executionContext();

      const rawToken = IdService.generateNanoid();
      const tokenHash = CryptoService.hashData(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await oneTimeTokenRepository.create({ userId: user.id, tokenHash, purpose: 'reset-password', expiresAt });

      const newPassword = Generator.password();

      await changePasswordByTokenAction.execute({ token: rawToken, newPassword }, context);

      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser).toBeDefined();
      if (!updatedUser) return;
      const isNewPasswordValid = await passwordService.comparePasswords(newPassword, updatedUser.password);
      expect(isNewPasswordValid).toBe(true);
    });

    it('throws InputNotValidError for invalid token', async () => {
      const context = Generator.executionContext();

      await expect(
        changePasswordByTokenAction.execute({ token: 'invalid-token', newPassword: Generator.password() }, context),
      ).rejects.toThrow(InputNotValidError);
    });

    it('throws OperationNotValidError for deleted user', async () => {
      const user = await userRepository.create(
        Generator.userData({ password: await passwordService.hashPassword(Generator.password()) }),
      );
      await userRepository.update(user.id, { isDeleted: true });
      const context = Generator.executionContext();

      const rawToken = IdService.generateNanoid();
      const tokenHash = CryptoService.hashData(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await oneTimeTokenRepository.create({ userId: user.id, tokenHash, purpose: 'reset-password', expiresAt });

      await expect(
        changePasswordByTokenAction.execute({ token: rawToken, newPassword: Generator.password() }, context),
      ).rejects.toThrow(OperationNotValidError);
    });
  });
});
