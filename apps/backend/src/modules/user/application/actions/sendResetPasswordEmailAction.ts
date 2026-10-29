import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
import type { EmailTemplate } from '../../../../common/emailService/emailTemplate.ts';
import { IdService } from '../../../../common/id/idService.ts';
import { type LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import { type Config } from '../../../../core/config.ts';
import type { EmailQueueService } from '../../../../core/emailQueueService.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import type { OneTimeTokenRepository } from '../../domain/repositories/oneTimeTokenRepository.ts';
import { type UserRepository } from '../../domain/repositories/userRepository.ts';

export interface ExecutePayload {
  readonly email: string;
}

export class SendResetPasswordEmailAction {
  private readonly userRepository: UserRepository;
  private readonly loggerService: LoggerService;
  private readonly config: Config;
  private readonly emailQueueService: EmailQueueService;
  private readonly oneTimeTokenRepository: OneTimeTokenRepository;
  private readonly databaseClient: DatabaseClient;

  public constructor(
    userRepository: UserRepository,
    loggerService: LoggerService,
    config: Config,
    emailQueueService: EmailQueueService,
    oneTimeTokenRepository: OneTimeTokenRepository,
    databaseClient: DatabaseClient,
  ) {
    this.userRepository = userRepository;
    this.loggerService = loggerService;
    this.config = config;
    this.emailQueueService = emailQueueService;
    this.oneTimeTokenRepository = oneTimeTokenRepository;
    this.databaseClient = databaseClient;
  }

  public async execute(payload: ExecutePayload, executionContext: ExecutionContext): Promise<void> {
    const { email: emailInput } = payload;

    const { requestId } = executionContext;

    const email = emailInput.toLowerCase().trim();

    this.loggerService.debug({
      message: 'Sending reset password email',
      email,
      requestId,
    });

    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      this.loggerService.debug({
        message: 'User not found',
        email,
        requestId,
      });

      return;
    }

    if (user.isDeleted) {
      this.loggerService.debug({
        message: 'User is blocked',
        userId: user.id,
        requestId,
      });

      return;
    }

    const resetPasswordToken = IdService.generateNanoid();
    const tokenHash = CryptoService.hashData(resetPasswordToken);
    const expiresAt = new Date(Date.now() + this.config.token.resetPassword.expiresIn * 1000);

    await this.databaseClient.transaction(async (tx) => {
      await this.oneTimeTokenRepository.create(
        {
          userId: user.id,
          tokenHash,
          purpose: 'reset-password',
          expiresAt,
        },
        tx,
      );

      const resetLink = `${this.config.frontendUrl}/new-password?token=${resetPasswordToken}`;

      const emailTemplate: EmailTemplate = {
        name: 'resetPassword',
        data: { resetLink },
      };

      await this.emailQueueService.queueEmail(user.email, emailTemplate);

      this.loggerService.info({
        message: 'Password reset email requested',
        userId: user.id,
        email: user.email,
        requestId,
      });
    });
  }
}
