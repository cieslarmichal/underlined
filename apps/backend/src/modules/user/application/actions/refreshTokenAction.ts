import type { TokenService } from '../../../../common/auth/tokenService.ts';
import { AccountDisabledError } from '../../../../common/errors/accountDisabledError.ts';
import { UnauthorizedAccessError } from '../../../../common/errors/unathorizedAccessError.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { ExecutionContext } from '../../../../common/types/executionContext.ts';
import type { Config } from '../../../../core/config.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { withSerializationRetry } from '../../../../infrastructure/database/serializationRetry.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { UserSessionRepository } from '../../domain/repositories/userSessionRepository.ts';
import type { UserSession } from '../../domain/types/userSession.ts';

interface RefreshTokenData {
  readonly refreshToken: string;
}

interface RefreshTokenResult {
  readonly accessToken: string;
  readonly refreshToken: string;
}

type SessionResolution =
  | { readonly outcome: 'current'; readonly session: UserSession }
  | { readonly outcome: 'rotated'; readonly session: UserSession }
  | { readonly outcome: 'reuseDetected' };

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
    const tokenPayload = this.tokenService.verifyRefreshToken(data.refreshToken);

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

    const startTime = Date.now();

    let resolution: SessionResolution;

    try {
      resolution = await withSerializationRetry(() =>
        this.databaseClient.db.transaction(
          async (tx): Promise<SessionResolution> => {
            const session = await this.userSessionRepository.findById(tokenPayload.sessionId, tx);

            if (!session || session.status !== 'active' || session.userId !== user.id) {
              throw new UnauthorizedAccessError({ reason: 'Session not active', silent: true });
            }

            const now = new Date();

            if (tokenPayload.generation === session.generation) {
              const isRotationDue =
                now.getTime() - session.lastRotatedAt.getTime() >= this.config.token.refresh.rotationIntervalMs;

              if (!isRotationDue) {
                return { outcome: 'current', session };
              }

              const rotatedSession = await this.userSessionRepository.rotate(
                {
                  sessionId: session.id,
                  generation: session.generation + 1,
                  rotatedAt: now,
                  prevUsableUntil: new Date(now.getTime() + this.config.token.refresh.graceMs),
                },
                tx,
              );

              return { outcome: 'rotated', session: rotatedSession };
            }

            // A concurrent request (e.g. page reload) has just rotated the session.
            // Answer with the current token, it is identical to the one the other request received.
            const isPreviousWithinGrace =
              tokenPayload.generation === session.generation - 1 &&
              session.prevUsableUntil !== null &&
              now.getTime() <= session.prevUsableUntil.getTime();

            if (isPreviousWithinGrace) {
              return { outcome: 'current', session };
            }

            await this.userSessionRepository.revoke(session.id, tx);

            return { outcome: 'reuseDetected' };
          },
          {
            isolationLevel: 'serializable',
          },
        ),
      );
    } catch (error) {
      this.loggerService.error({
        message: 'Token refresh transaction failed',
        requestId: context.requestId,
        userId: user.id,
        transactionDuration: Date.now() - startTime,
        err: error,
      });

      throw error;
    }

    if (resolution.outcome === 'reuseDetected') {
      // Thrown after commit so that the revocation is persisted. This IS a security issue, so keep it logged.
      throw new UnauthorizedAccessError({ reason: 'Refresh token reuse detected', userId: user.id });
    }

    const { session } = resolution;

    this.loggerService.info({
      message: 'Tokens refreshed successfully',
      requestId: context.requestId,
      userId: user.id,
      rotated: resolution.outcome === 'rotated',
      transactionDuration: Date.now() - startTime,
    });

    return {
      accessToken: this.tokenService.generateAccessToken({ userId: user.id, email: user.email, role: user.role }),
      refreshToken: this.tokenService.generateRefreshToken(
        { userId: user.id, sessionId: session.id, generation: session.generation },
        session.lastRotatedAt,
      ),
    };
  }
}
