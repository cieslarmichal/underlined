import type { TokenService } from '../../../../common/auth/tokenService.ts';
import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
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
      email: normalizedEmail,
    });

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedAccessError({
        reason: 'Invalid credentials',
        email: normalizedEmail,
      });
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedAccessError({
        reason: 'User email is not verified.',
        email: normalizedEmail,
      });
    }

    if (user.isDeleted) {
      throw new UnauthorizedAccessError({
        reason: 'User account is deleted.',
        email: normalizedEmail,
      });
    }

    const isPasswordValid = await this.passwordService.comparePasswords(loginData.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedAccessError({
        reason: 'Invalid credentials',
        email: normalizedEmail,
      });
    }

    const sessionId = IdService.generateUuid();
    const accessPayload = { userId: user.id, email: user.email, role: user.role };
    const refreshPayload = { userId: user.id, email: user.email, role: user.role, sessionId };

    const accessToken = this.tokenService.generateAccessToken(accessPayload);
    const refreshToken = this.tokenService.generateRefreshToken(refreshPayload);

    const tokenHash = CryptoService.hashData(refreshToken);
    await this.userSessionRepository.create({ id: sessionId, userId: user.id, currentRefreshHash: tokenHash });

    this.loggerService.info({
      message: 'User logged in successfully',
      requestId: context.requestId,
      userId: user.id,
      email: user.email,
    });

    return { accessToken, refreshToken };
  }
}
