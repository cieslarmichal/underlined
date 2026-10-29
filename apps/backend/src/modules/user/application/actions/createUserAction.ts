import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
import type { EmailTemplate } from '../../../../common/emailService/emailTemplate.ts';
import { ResourceAlreadyExistsError } from '../../../../common/errors/resourceAlreadyExistsError.ts';
import { IdService } from '../../../../common/id/idService.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { NativeLanguage } from '../../../../common/types/language.ts';
import type { Config } from '../../../../core/config.ts';
import type { EmailQueueService } from '../../../../core/emailQueueService.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import type { OneTimeTokenRepository } from '../../domain/repositories/oneTimeTokenRepository.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { User } from '../../domain/types/user.ts';
import type { PasswordService } from '../services/passwordService.ts';

export interface CreateUserActionPayload {
  readonly email: string;
  readonly password: string;
  readonly nativeLanguage: NativeLanguage;
}

export class CreateUserAction {
  private readonly userRepository: UserRepository;
  private readonly oneTimeTokenRepository: OneTimeTokenRepository;
  private readonly loggerService: LoggerService;
  private readonly passwordService: PasswordService;
  private readonly emailQueueService: EmailQueueService;
  private readonly config: Config;
  private readonly databaseClient: DatabaseClient;

  public constructor(
    userRepository: UserRepository,
    oneTimeTokenRepository: OneTimeTokenRepository,
    loggerService: LoggerService,
    passwordService: PasswordService,
    emailQueueService: EmailQueueService,
    config: Config,
    databaseClient: DatabaseClient,
  ) {
    this.userRepository = userRepository;
    this.oneTimeTokenRepository = oneTimeTokenRepository;
    this.loggerService = loggerService;
    this.passwordService = passwordService;
    this.emailQueueService = emailQueueService;
    this.config = config;
    this.databaseClient = databaseClient;
  }

  public async execute(payload: CreateUserActionPayload, context: ExecutionContext): Promise<User> {
    const { email: emailInput, password, nativeLanguage } = payload;

    const email = emailInput.toLowerCase().trim();

    this.loggerService.debug({
      message: 'Creating user',
      requestId: context.requestId,
      email,
    });

    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ResourceAlreadyExistsError({
        resource: 'User',
        reason: 'User with this email already exists',
        email,
      });
    }

    this.passwordService.validatePassword(password);

    const hashedPassword = await this.passwordService.hashPassword(password);

    const user = await this.databaseClient.transaction<User>(async (tx) => {
      const createdUser = await this.userRepository.create(
        {
          email,
          password: hashedPassword,
          isEmailVerified: false,
          nativeLanguage,
        },
        tx,
      );

      const verificationToken = IdService.generateNanoid();
      const tokenHash = CryptoService.hashData(verificationToken);
      const expiresAt = new Date(Date.now() + this.config.token.accountVerification.expiresIn * 1000);

      await this.oneTimeTokenRepository.create(
        {
          userId: createdUser.id,
          tokenHash,
          purpose: 'email-verification',
          expiresAt,
        },
        tx,
      );

      const verificationLink = `${this.config.frontendUrl}/verify-email?token=${verificationToken}`;

      const emailTemplate: EmailTemplate = {
        name: 'verifyAccount',
        data: { verificationLink },
      };

      await this.emailQueueService.queueEmail(createdUser.email, emailTemplate);

      return createdUser;
    });

    this.loggerService.info({
      message: 'User created successfully',
      requestId: context.requestId,
      userId: user.id,
      email: user.email,
    });

    return user;
  }
}
