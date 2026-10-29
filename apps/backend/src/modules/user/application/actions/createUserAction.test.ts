import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { ResourceAlreadyExistsError } from '../../../../common/errors/resourceAlreadyExistsError.ts';
import { LoggerServiceFactory } from '../../../../common/logger/loggerServiceFactory.ts';
import { createConfig } from '../../../../core/config.ts';
import type { EmailQueueService } from '../../../../core/emailQueueService.ts';
import { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { oneTimeTokens, users } from '../../../../infrastructure/database/schema.ts';
import { OneTimeTokenRepositoryImpl } from '../../infrastructure/repositories/oneTimeTokenRepositoryImpl.ts';
import { UserRepositoryImpl } from '../../infrastructure/repositories/userRepositoryImpl.ts';
import { PasswordService } from '../services/passwordService.ts';

import { CreateUserAction } from './createUserAction.ts';

describe('CreateUserAction', () => {
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let oneTimeTokenRepository: OneTimeTokenRepositoryImpl;
  let createUserAction: CreateUserAction;
  let passwordService: PasswordService;
  let queuedEmails: { recipient: string; templateName: string }[];

  beforeEach(async () => {
    const config = createConfig();
    const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
    databaseClient = new DatabaseClient(config.database, loggerService);
    userRepository = new UserRepositoryImpl(databaseClient);
    oneTimeTokenRepository = new OneTimeTokenRepositoryImpl(databaseClient);
    passwordService = new PasswordService(config);

    queuedEmails = [];
    const emailQueueService = {
      queueEmail: async (recipient: string, template: { name: string }): Promise<void> => {
        queuedEmails.push({ recipient, templateName: template.name });
      },
      start: async (): Promise<void> => {},
      stop: async (): Promise<void> => {},
    } as unknown as EmailQueueService;

    createUserAction = new CreateUserAction(
      userRepository,
      oneTimeTokenRepository,
      loggerService,
      passwordService,
      emailQueueService,
      config,
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
    it('creates a new user successfully and queues a verification email', async () => {
      const userData = Generator.userData();
      const context = Generator.executionContext();

      const result = await createUserAction.execute(userData, context);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.role).toBe('user');
      expect(result.isEmailVerified).toBe(false);
      expect(result.isDeleted).toBe(false);
      expect(result.createdAt).toBeDefined();

      expect(result.password).not.toBe(userData.password);
      const isPasswordValid = await passwordService.comparePasswords(userData.password, result.password);
      expect(isPasswordValid).toBe(true);

      const storedUser = await userRepository.findById(result.id);
      expect(storedUser).toBeDefined();
      expect(storedUser?.email).toBe(userData.email);

      expect(queuedEmails).toHaveLength(1);
      expect(queuedEmails[0]?.recipient).toBe(userData.email);
      expect(queuedEmails[0]?.templateName).toBe('verifyAccount');
    });

    it('throws ResourceAlreadyExistsError when user with email already exists', async () => {
      const userData = Generator.userData();
      const newUserData = Generator.userData({ email: userData.email });
      const context = Generator.executionContext();

      await createUserAction.execute(userData, context);

      await expect(createUserAction.execute(newUserData, context)).rejects.toThrow(ResourceAlreadyExistsError);
    });
  });
});
