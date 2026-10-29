import type { RefreshTokenPayload } from '../../../../common/auth/token.ts';
import type { TokenService } from '../../../../common/auth/tokenService.ts';
import type { UserSessionRepository } from '../../domain/repositories/userSessionRepository.ts';

interface LogoutData {
  readonly refreshToken: string | undefined;
}

export class LogoutUserAction {
  private readonly userSessionRepository: UserSessionRepository;
  private readonly tokenService: TokenService;

  public constructor(userSessionRepository: UserSessionRepository, tokenService: TokenService) {
    this.userSessionRepository = userSessionRepository;
    this.tokenService = tokenService;
  }

  public async execute(data: LogoutData): Promise<void> {
    if (!data.refreshToken) {
      return;
    }

    let tokenPayload: RefreshTokenPayload;

    try {
      tokenPayload = this.tokenService.verifyRefreshToken(data.refreshToken);
    } catch (error) {
      return;
    }

    await this.userSessionRepository.revoke(tokenPayload.sessionId);
  }
}
