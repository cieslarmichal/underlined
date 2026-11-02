import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
import { InputNotValidError } from '../../../../common/errors/inputNotValidError.ts';
import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import type { OneTimeTokenRepository } from '../../domain/repositories/oneTimeTokenRepository.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { UserSessionRepository } from '../../domain/repositories/userSessionRepository.ts';
import type { PasswordService } from '../services/passwordService.ts';

interface ChangePasswordByTokenData {
  readonly token: string;
  readonly newPassword: string;
}

export class ChangePasswordByTokenAction {
  private readonly userRepository: UserRepository;
  private readonly loggerService: LoggerService;
  private readonly passwordService: PasswordService;
  private readonly oneTimeTokenRepository: OneTimeTokenRepository;
  private readonly databaseClient: DatabaseClient;
  private readonly userSessionRepository: UserSessionRepository;

  public constructor(
    userRepository: UserRepository,
    loggerService: LoggerService,
    passwordService: PasswordService,
    oneTimeTokenRepository: OneTimeTokenRepository,
    databaseClient: DatabaseClient,
    userSessionRepository: UserSessionRepository,
  ) {
    this.userRepository = userRepository;
    this.loggerService = loggerService;
    this.passwordService = passwordService;
    this.oneTimeTokenRepository = oneTimeTokenRepository;
    this.databaseClient = databaseClient;
    this.userSessionRepository = userSessionRepository;
  }

  public async execute(
    changePasswordData: ChangePasswordByTokenData,
    executionContext: ExecutionContext,
  ): Promise<void> {
    const { token, newPassword } = changePasswordData;
    const { requestId } = executionContext;

    this.loggerService.debug({
      message: 'Starting password change with token',
      requestId,
    });

    const tokenHash = CryptoService.hashData(token);

    await this.databaseClient.transaction(async (tx) => {
      const oneTimeToken = await this.oneTimeTokenRepository.findValidByHash(tokenHash, 'reset-password', tx);

      if (!oneTimeToken) {
        throw new InputNotValidError({
          reason: 'Reset password token is invalid or has been used',
        });
      }

      this.loggerService.debug({
        message: 'Starting password change with token',
        userId: oneTimeToken.userId,
      });

      const user = await this.userRepository.findById(oneTimeToken.userId, tx);

      if (!user) {
        throw new OperationNotValidError({
          reason: 'User not found',
          userId: oneTimeToken.userId,
        });
      }

      if (user.isDeleted) {
        throw new OperationNotValidError({
          reason: 'User has been deleted',
          userId: user.id,
        });
      }

      this.passwordService.validatePassword(newPassword);

      const hashedPassword = await this.passwordService.hashPassword(newPassword);

      await this.userRepository.update(user.id, { password: hashedPassword }, tx);

      await this.oneTimeTokenRepository.markUsed(oneTimeToken.id, tx);

      // A reset implies the old credentials may be compromised, so end every session.
      await this.userSessionRepository.revokeAllForUser(user.id, undefined, tx);

      this.loggerService.info({
        message: 'Password changed successfully',
        userId: user.id,
        requestId,
      });
    });
  }
}
