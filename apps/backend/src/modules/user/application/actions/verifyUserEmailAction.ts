import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
import { OperationNotValidError } from '../../../../common/errors/operationNotValidError.ts';
import { type LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import type { OneTimeTokenRepository } from '../../domain/repositories/oneTimeTokenRepository.ts';
import { type UserRepository } from '../../domain/repositories/userRepository.ts';

export interface ExecutePayload {
  readonly emailVerificationToken: string;
}

export class VerifyUserEmailAction {
  private readonly userRepository: UserRepository;
  private readonly loggerService: LoggerService;
  private readonly oneTimeTokenRepository: OneTimeTokenRepository;
  private readonly databaseClient: DatabaseClient;

  public constructor(
    userRepository: UserRepository,
    loggerService: LoggerService,
    oneTimeTokenRepository: OneTimeTokenRepository,
    databaseClient: DatabaseClient,
  ) {
    this.userRepository = userRepository;
    this.loggerService = loggerService;
    this.oneTimeTokenRepository = oneTimeTokenRepository;
    this.databaseClient = databaseClient;
  }

  public async execute(payload: ExecutePayload, executionContext: ExecutionContext): Promise<void> {
    const { emailVerificationToken } = payload;

    const { requestId } = executionContext;

    this.loggerService.debug({
      message: 'Verifying user email',
      requestId,
      token: emailVerificationToken,
    });

    const tokenHash = CryptoService.hashData(emailVerificationToken);

    await this.databaseClient.transaction(async (tx) => {
      const oneTimeToken = await this.oneTimeTokenRepository.findValidByHash(tokenHash, 'email-verification', tx);

      if (!oneTimeToken) {
        throw new OperationNotValidError({
          reason: 'Invalid email verification token.',
          token: emailVerificationToken,
        });
      }

      const user = await this.userRepository.findById(oneTimeToken.userId, tx);

      if (!user) {
        throw new OperationNotValidError({
          reason: 'User not found.',
          id: oneTimeToken.userId,
        });
      }

      if (user.isEmailVerified) {
        throw new OperationNotValidError({
          reason: 'User email is already verified.',
          email: user.email,
        });
      }

      await this.userRepository.update(user.id, { isEmailVerified: true }, tx);
      await this.oneTimeTokenRepository.markUsed(oneTimeToken.id, tx);

      this.loggerService.info({
        message: 'User email verified',
        userId: user.id,
        requestId,
      });
    });
  }
}
