import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';

export class DeleteUserAction {
  private readonly userRepository: UserRepository;
  private readonly loggerService: LoggerService;
  private readonly databaseClient: DatabaseClient;

  public constructor(userRepository: UserRepository, loggerService: LoggerService, databaseClient: DatabaseClient) {
    this.userRepository = userRepository;
    this.loggerService = loggerService;
    this.databaseClient = databaseClient;
  }

  public async execute(id: string, context: ExecutionContext): Promise<void> {
    this.loggerService.debug({
      message: 'Deleting user',
      requestId: context.requestId,
      userId: id,
    });

    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundError({
        resource: 'User',
        reason: 'User not found',
        userId: id,
      });
    }

    if (user.isDeleted) {
      throw new OperationNotValidError({
        reason: 'User account is already deleted.',
        id,
      });
    }

    await this.databaseClient.transaction(async (tx) => {
      await this.userRepository.update(
        id,
        {
          isDeleted: true,
          email: `deleted-${id}@anonymous.local`,
        },
        tx,
      );
    });

    this.loggerService.info({
      message: 'User deleted successfully',
      requestId: context.requestId,
      userId: id,
      email: user.email,
    });
  }
}
