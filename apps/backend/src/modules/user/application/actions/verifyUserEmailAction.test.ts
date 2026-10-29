import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { IdService } from '../../../../common/id/idService.ts';
import { LoggerServiceFactory } from '../../../../common/logger/loggerServiceFactory.ts';
import { createConfig } from '../../../../core/config.ts';
import { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { oneTimeTokens, users } from '../../../../infrastructure/database/schema.ts';
import { OneTimeTokenRepositoryImpl } from '../../infrastructure/repositories/oneTimeTokenRepositoryImpl.ts';
import { UserRepositoryImpl } from '../../infrastructure/repositories/userRepositoryImpl.ts';

import { VerifyUserEmailAction } from './verifyUserEmailAction.ts';

describe('VerifyUserEmailAction', () => {
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let oneTimeTokenRepository: OneTimeTokenRepositoryImpl;
  let verifyUserEmailAction: VerifyUserEmailAction;

  beforeEach(async () => {
    const config = createConfig();
    const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
    databaseClient = new DatabaseClient(config.database, loggerService);
    userRepository = new UserRepositoryImpl(databaseClient);
    oneTimeTokenRepository = new OneTimeTokenRepositoryImpl(databaseClient);

    verifyUserEmailAction = new VerifyUserEmailAction(
      userRepository,
      loggerService,
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
    it('verifies user email successfully with valid token', async () => {
      const user = await userRepository.create(Generator.userData({ isEmailVerified: false }));
      const context = Generator.executionContext();

      const rawToken = IdService.generateNanoid();
      const tokenHash = CryptoService.hashData(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await oneTimeTokenRepository.create({ userId: user.id, tokenHash, purpose: 'email-verification', expiresAt });

      await verifyUserEmailAction.execute({ emailVerificationToken: rawToken }, context);

      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser?.isEmailVerified).toBe(true);
    });

    it('throws OperationNotValidError for invalid token', async () => {
      const context = Generator.executionContext();

      await expect(
        verifyUserEmailAction.execute({ emailVerificationToken: 'invalid-token' }, context),
      ).rejects.toThrow(OperationNotValidError);
    });

    it('throws OperationNotValidError when email is already verified', async () => {
      const user = await userRepository.create(Generator.userData({ isEmailVerified: true }));
      const context = Generator.executionContext();

      const rawToken = IdService.generateNanoid();
      const tokenHash = CryptoService.hashData(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await oneTimeTokenRepository.create({ userId: user.id, tokenHash, purpose: 'email-verification', expiresAt });

      await expect(
        verifyUserEmailAction.execute({ emailVerificationToken: rawToken }, context),
      ).rejects.toThrow(OperationNotValidError);
    });
  });
});
