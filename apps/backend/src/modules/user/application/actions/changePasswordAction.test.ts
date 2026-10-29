import { beforeEach, afterEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../../tests/generator.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import { UnauthorizedAccessError } from '../../../../common/errors/unathorizedAccessError.ts';
import { LoggerServiceFactory } from '../../../../common/logger/loggerServiceFactory.ts';
import { createConfig, type Config } from '../../../../core/config.ts';
import { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { users } from '../../../../infrastructure/database/schema.ts';
import { UserRepositoryImpl } from '../../infrastructure/repositories/userRepositoryImpl.ts';
import { PasswordService } from '../services/passwordService.ts';

import { ChangePasswordAction } from './changePasswordAction.ts';

describe('ChangePasswordAction', () => {
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let changePasswordAction: ChangePasswordAction;
  let passwordService: PasswordService;
  let config: Config;

  beforeEach(async () => {
    config = createConfig();
    const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });
    databaseClient = new DatabaseClient(config.database, loggerService);
    userRepository = new UserRepositoryImpl(databaseClient);
    passwordService = new PasswordService(config);

    changePasswordAction = new ChangePasswordAction(userRepository, loggerService, passwordService);

    await databaseClient.db.delete(users);
  });

  afterEach(async () => {
    await databaseClient.db.delete(users);
    await databaseClient.close();
  });

  it('changes password successfully with valid current password', async () => {
    const rawPassword = Generator.password();
    const userData = Generator.userData({
      password: await passwordService.hashPassword(rawPassword),
      isEmailVerified: true,
    });
    const user = await userRepository.create(userData);
    const context = Generator.executionContext();

    const newPassword = 'NewPassword123!';

    await changePasswordAction.execute(
      { userId: user.id, currentPassword: rawPassword, newPassword },
      context,
    );

    const updatedUser = await userRepository.findById(user.id);
    expect(updatedUser).toBeDefined();
    if (!updatedUser) return;

    const isNewPasswordValid = await passwordService.comparePasswords(newPassword, updatedUser.password);
    expect(isNewPasswordValid).toBe(true);

    const isOldPasswordValid = await passwordService.comparePasswords(rawPassword, updatedUser.password);
    expect(isOldPasswordValid).toBe(false);
  });

  it('throws UnauthorizedAccessError when current password is incorrect', async () => {
    const userData = Generator.userData({
      password: await passwordService.hashPassword(Generator.password()),
      isEmailVerified: true,
    });
    const user = await userRepository.create(userData);
    const context = Generator.executionContext();

    await expect(
      changePasswordAction.execute(
        { userId: user.id, currentPassword: 'WrongPassword123!', newPassword: 'NewPassword123!' },
        context,
      ),
    ).rejects.toThrow(UnauthorizedAccessError);
  });

  it('throws ResourceNotFoundError when user does not exist', async () => {
    const context = Generator.executionContext();

    await expect(
      changePasswordAction.execute(
        { userId: Generator.uuid(), currentPassword: 'AnyPassword123!', newPassword: 'NewPassword123!' },
        context,
      ),
    ).rejects.toThrow(ResourceNotFoundError);
  });
});
