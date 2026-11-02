import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import { UnauthorizedAccessError } from '../../../../common/errors/unathorizedAccessError.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { UserSessionRepository } from '../../domain/repositories/userSessionRepository.ts';
import type { PasswordService } from '../services/passwordService.ts';

interface ChangePasswordData {
  readonly userId: string;
  readonly currentPassword: string;
  readonly newPassword: string;
  readonly currentSessionId?: string | undefined;
}

export class ChangePasswordAction {
  private readonly userRepository: UserRepository;
  private readonly loggerService: LoggerService;
  private readonly passwordService: PasswordService;
  private readonly userSessionRepository: UserSessionRepository;

  public constructor(
    userRepository: UserRepository,
    loggerService: LoggerService,
    passwordService: PasswordService,
    userSessionRepository: UserSessionRepository,
  ) {
    this.userRepository = userRepository;
    this.loggerService = loggerService;
    this.passwordService = passwordService;
    this.userSessionRepository = userSessionRepository;
  }

  public async execute(data: ChangePasswordData, context: ExecutionContext): Promise<void> {
    const { userId, currentPassword, newPassword, currentSessionId } = data;

    this.loggerService.debug({
      message: 'Password change attempt',
      requestId: context.requestId,
      userId,
    });

    const user = await this.userRepository.findById(userId);

    if (!user || user.isDeleted) {
      throw new ResourceNotFoundError({
        resource: 'User',
        reason: 'User not found',
        userId,
      });
    }

    const isCurrentPasswordValid = await this.passwordService.comparePasswords(currentPassword, user.password);

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedAccessError({
        reason: 'Current password is incorrect',
      });
    }

    this.passwordService.validatePassword(newPassword);

    const hashedPassword = await this.passwordService.hashPassword(newPassword);

    await this.userRepository.update(userId, { password: hashedPassword });

    // Sign out every other device; the session that performed the change stays active.
    await this.userSessionRepository.revokeAllForUser(userId, currentSessionId);

    this.loggerService.info({
      message: 'Password changed successfully',
      requestId: context.requestId,
      userId,
    });
  }
}
