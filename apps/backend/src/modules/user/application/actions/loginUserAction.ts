import type { TokenService } from '../../../../common/auth/tokenService.ts';
import { UnauthorizedAccessError } from '../../../../common/errors/unathorizedAccessError.ts';
import { IdService } from '../../../../common/id/idService.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { UserSessionRepository } from '../../domain/repositories/userSessionRepository.ts';
import type { PasswordService } from '../services/passwordService.ts';

interface LoginData {
  readonly email: string;
  readonly password: string;
}

interface LoginResult {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export class LoginUserAction {
  private readonly userRepository: UserRepository;
  private readonly loggerService: LoggerService;
  private readonly tokenService: TokenService;
  private readonly passwordService: PasswordService;
  private readonly userSessionRepository: UserSessionRepository;

  public constructor(
    userRepository: UserRepository,
    loggerService: LoggerService,
    tokenService: TokenService,
    passwordService: PasswordService,
    userSessionRepository: UserSessionRepository,
  ) {
    this.userRepository = userRepository;
    this.loggerService = loggerService;
    this.tokenService = tokenService;
    this.passwordService = passwordService;
    this.userSessionRepository = userSessionRepository;
  }

  public async execute(loginData: LoginData, context: ExecutionContext): Promise<LoginResult> {
    const normalizedEmail = loginData.email.toLowerCase().trim();

    this.loggerService.debug({
      message: 'User login attempt',
      requestId: context.requestId,
    });

    const user = await this.userRepository.findByEmail(normalizedEmail);

    // Every credential failure returns the same error, and unknown accounts still pay for a bcrypt comparison,
    // so neither the response body nor the response time reveals whether the account exists.
    if (!user || user.isDeleted) {
      await this.passwordService.compareWithDummyHash(loginData.password);

      throw new UnauthorizedAccessError({ reason: 'Invalid credentials' });
    }

    const isPasswordValid = await this.passwordService.comparePasswords(loginData.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedAccessError({ reason: 'Invalid credentials' });
    }

    // Only someone who knows the password learns that the email still needs verifying.
    if (!user.isEmailVerified) {
      throw new UnauthorizedAccessError({ reason: 'User email is not verified.', userId: user.id });
    }

    const sessionId = IdService.generateUuid();
    const issuedAt = new Date();

    await this.userSessionRepository.create({ id: sessionId, userId: user.id, issuedAt });

    const accessToken = this.tokenService.generateAccessToken({ userId: user.id, email: user.email });
    const refreshToken = this.tokenService.generateRefreshToken(
      { userId: user.id, sessionId, generation: 0 },
      issuedAt,
    );

    this.loggerService.info({
      message: 'User logged in successfully',
      requestId: context.requestId,
      userId: user.id,
    });

    return { accessToken, refreshToken };
  }
}
