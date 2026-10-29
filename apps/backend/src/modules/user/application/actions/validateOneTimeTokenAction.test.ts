import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
import { IdService } from '../../../../common/id/idService.ts';
import { LoggerServiceFactory } from '../../../../common/logger/loggerServiceFactory.ts';
import { createConfig } from '../../../../core/config.ts';
import { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { oneTimeTokens, users } from '../../../../infrastructure/database/schema.ts';
import { OneTimeTokenRepositoryImpl } from '../../infrastructure/repositories/oneTimeTokenRepositoryImpl.ts';
import { UserRepositoryImpl } from '../../infrastructure/repositories/userRepositoryImpl.ts';

import { ValidateOneTimeTokenAction } from './validateOneTimeTokenAction.ts';

describe('ValidateOneTimeTokenAction', () => {
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let oneTimeTokenRepository: OneTimeTokenRepositoryImpl;
  let validateOneTimeTokenAction: ValidateOneTimeTokenAction;

  beforeEach(async () => {
    const config = createConfig();
    const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
    databaseClient = new DatabaseClient(config.database, loggerService);
    userRepository = new UserRepositoryImpl(databaseClient);
    oneTimeTokenRepository = new OneTimeTokenRepositoryImpl(databaseClient);

    validateOneTimeTokenAction = new ValidateOneTimeTokenAction(
      userRepository,
      loggerService,
      oneTimeTokenRepository,
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
    it('returns true for valid token and existing user', async () => {
      const user = await userRepository.create(Generator.userData());

      const rawToken = IdService.generateNanoid();
      const tokenHash = CryptoService.hashData(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await oneTimeTokenRepository.create({ userId: user.id, tokenHash, purpose: 'email-verification', expiresAt });

      const result = await validateOneTimeTokenAction.execute({ token: rawToken, purpose: 'email-verification' });

      expect(result).toBe(true);
    });

    it('returns false for invalid token', async () => {
      const result = await validateOneTimeTokenAction.execute({
        token: 'invalid-token',
        purpose: 'email-verification',
      });

      expect(result).toBe(false);
    });

    it('returns false for used token', async () => {
      const user = await userRepository.create(Generator.userData());

      const rawToken = IdService.generateNanoid();
      const tokenHash = CryptoService.hashData(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const token = await oneTimeTokenRepository.create({
        userId: user.id,
        tokenHash,
        purpose: 'email-verification',
        expiresAt,
      });

      await oneTimeTokenRepository.markUsed(token.id);

      const result = await validateOneTimeTokenAction.execute({ token: rawToken, purpose: 'email-verification' });

      expect(result).toBe(false);
    });

    it('returns false for deleted user', async () => {
      const user = await userRepository.create(Generator.userData());
      await userRepository.update(user.id, { isDeleted: true });

      const rawToken = IdService.generateNanoid();
      const tokenHash = CryptoService.hashData(rawToken);
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await oneTimeTokenRepository.create({ userId: user.id, tokenHash, purpose: 'email-verification', expiresAt });

      const result = await validateOneTimeTokenAction.execute({ token: rawToken, purpose: 'email-verification' });

      expect(result).toBe(false);
    });
  });
});
