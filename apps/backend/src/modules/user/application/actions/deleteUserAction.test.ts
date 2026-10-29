import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import { LoggerServiceFactory } from '../../../../common/logger/loggerServiceFactory.ts';
import { createConfig } from '../../../../core/config.ts';
import { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { users } from '../../../../infrastructure/database/schema.ts';
import { UserRepositoryImpl } from '../../infrastructure/repositories/userRepositoryImpl.ts';

import { DeleteUserAction } from './deleteUserAction.ts';

describe('DeleteUserAction', () => {
  const config = createConfig();

  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let deleteUserAction: DeleteUserAction;

  beforeEach(async () => {
    const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
    databaseClient = new DatabaseClient(config.database, loggerService);
    userRepository = new UserRepositoryImpl(databaseClient);

    deleteUserAction = new DeleteUserAction(userRepository, loggerService, databaseClient);

    await databaseClient.db.delete(users);
  });
  afterEach(async () => {
    await databaseClient.db.delete(users);
    await databaseClient.close();
  });

  describe('execute', () => {
    it('marks user as deleted successfully', async () => {
      const userData = Generator.userData();
      const context = Generator.executionContext();

      const user = await userRepository.create(userData);

      await deleteUserAction.execute(user.id, context);

      const deletedUser = await userRepository.findById(user.id);
      expect(deletedUser).not.toBeNull();
      expect(deletedUser?.isDeleted).toBe(true);
      expect(deletedUser?.email).toBe(`deleted-${user.id}@anonymous.local`);
    });

    it('throws ResourceNotFoundError when user does not exist', async () => {
      const nonExistentId = Generator.uuid();
      const context = Generator.executionContext();

      await expect(deleteUserAction.execute(nonExistentId, context)).rejects.toThrow(ResourceNotFoundError);
    });
  });
});
