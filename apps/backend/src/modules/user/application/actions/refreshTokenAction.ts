import type { TokenService } from '../../../../common/auth/tokenService.ts';
import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
import { AccountDisabledError } from '../../../../common/errors/accountDisabledError.ts';
import { UnauthorizedAccessError } from '../../../../common/errors/unathorizedAccessError.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { Config } from '../../../../core/config.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { UserSessionRepository } from '../../domain/repositories/userSessionRepository.ts';

interface RefreshTokenData {
  readonly refreshToken: string;
}

interface RefreshTokenResult {
  readonly accessToken: string;
  readonly refreshToken: string;
}

export class RefreshTokenAction {
  private readonly userRepository: UserRepository;
  private readonly userSessionRepository: UserSessionRepository;
  private readonly loggerService: LoggerService;
  private readonly tokenService: TokenService;
  private readonly config: Config;
  private readonly databaseClient: DatabaseClient;

  public constructor(
    userRepository: UserRepository,
    userSessionRepository: UserSessionRepository,
    loggerService: LoggerService,
    tokenService: TokenService,
    config: Config,
    databaseClient: DatabaseClient,
  ) {
    this.userRepository = userRepository;
    this.userSessionRepository = userSessionRepository;
    this.loggerService = loggerService;
    this.tokenService = tokenService;
    this.config = config;
    this.databaseClient = databaseClient;
  }

  public async execute(data: RefreshTokenData, context: ExecutionContext): Promise<RefreshTokenResult> {
    const { refreshToken } = data;

    const tokenPayload = this.tokenService.verifyRefreshToken(refreshToken);

    const tokenHash = CryptoService.hashData(refreshToken);

    const user = await this.userRepository.findById(tokenPayload.userId);

    if (!user) {
      throw new UnauthorizedAccessError({
        reason: 'User not found',
        userId: tokenPayload.userId,
      });
    }

    if (user.isDeleted) {
      throw new AccountDisabledError({
        reason: 'User has been deleted',
        userId: user.id,
      });
    }

    const { sessionId } = tokenPayload;

    // Try rotate if presented hash equals current
    const newPayload = { userId: user.id, email: user.email, role: user.role };
    const newAccessToken = this.tokenService.generateAccessToken(newPayload);

    const newRefreshPayload = { ...newPayload, sessionId };
    const newRefreshToken = this.tokenService.generateRefreshToken(newRefreshPayload);
    const newHash = CryptoService.hashData(newRefreshToken);

    const startTime = Date.now();

    try {
      await this.databaseClient.db.transaction(
        async (tx) => {
          // Attempt atomic rotate; if it fails, try accept previous within grace
          const existingSession = await this.userSessionRepository.findById(sessionId, tx);

          if (!existingSession || existingSession.status !== 'active') {
            throw new UnauthorizedAccessError({ reason: 'Session not active', silent: true });
          }

          if (existingSession.currentRefreshHash === tokenHash) {
            await this.userSessionRepository.rotateWithGrace(
              {
                sessionId,
                newRefreshHash: newHash,
                graceMs: this.config.token.refresh.graceMs,
              },
              tx,
            );
          } else {
            const accepted = await this.userSessionRepository.acceptPreviousIfWithinGrace(
              {
                sessionId,
                presentedHash: tokenHash,
              },
              tx,
            );

            if (!accepted) {
              await this.userSessionRepository.revoke(sessionId, tx);

              // This IS a security issue, so keep it logged (not silent)
              throw new UnauthorizedAccessError({ reason: 'Refresh token reuse detected' });
            }
          }
        },
        {
          isolationLevel: 'serializable',
        },
      );

      const duration = Date.now() - startTime;

      this.loggerService.info({
        message: 'Tokens refreshed successfully',
        requestId: context.requestId,
        userId: user.id,
        email: user.email,
        transactionDuration: duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      this.loggerService.error({
        message: 'Token refresh transaction failed',
        requestId: context.requestId,
        userId: user.id,
        email: user.email,
        transactionDuration: duration,
        err: error,
      });

      throw error;
    }

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }
}
