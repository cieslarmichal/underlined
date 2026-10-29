import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import { LoggerServiceFactory } from '../../../../common/logger/loggerServiceFactory.ts';
import { createConfig } from '../../../../core/config.ts';
import { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { users } from '../../../../infrastructure/database/schema.ts';
import { UserRepositoryImpl } from '../../infrastructure/repositories/userRepositoryImpl.ts';

import { FindUserAction } from './findUserAction.ts';

describe('FindUserAction', () => {
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let findUserAction: FindUserAction;

  beforeEach(async () => {
    const config = createConfig();
    const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
    databaseClient = new DatabaseClient(config.database, loggerService);
    userRepository = new UserRepositoryImpl(databaseClient);
    findUserAction = new FindUserAction(userRepository);

    await databaseClient.db.delete(users);
  });
  afterEach(async () => {
    await databaseClient.db.delete(users);
    await databaseClient.close();
  });

  describe('execute', () => {
    it('returns user when found', async () => {
      const userData = Generator.userData();

      const createdUser = await userRepository.create(userData);
      const result = await findUserAction.execute(createdUser.id);

      expect(result.id).toBe(createdUser.id);
      expect(result.email).toBe(userData.email);
    });

    it('throws ResourceNotFoundError when user does not exist', async () => {
      const nonExistentId = Generator.uuid();

      await expect(findUserAction.execute(nonExistentId)).rejects.toThrow(ResourceNotFoundError);
    });
  });
});
