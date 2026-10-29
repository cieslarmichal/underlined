import { CryptoService } from '../../../../common/crypto/cryptoService.ts';
import type { LoggerService } from '../../../../common/logger/loggerService.ts';
import type { OneTimeTokenRepository } from '../../domain/repositories/oneTimeTokenRepository.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { OneTimeTokenPurpose } from '../../domain/types/oneTimeToken.ts';

interface ValidateOneTimeTokenData {
  readonly token: string;
  readonly purpose: OneTimeTokenPurpose;
}

export class ValidateOneTimeTokenAction {
  private readonly userRepository: UserRepository;
  private readonly loggerService: LoggerService;
  private readonly oneTimeTokenRepository: OneTimeTokenRepository;

  public constructor(
    userRepository: UserRepository,
    loggerService: LoggerService,
    oneTimeTokenRepository: OneTimeTokenRepository,
  ) {
    this.userRepository = userRepository;
    this.loggerService = loggerService;
    this.oneTimeTokenRepository = oneTimeTokenRepository;
  }

  public async execute(data: ValidateOneTimeTokenData): Promise<boolean> {
    const { token, purpose } = data;

    const tokenHash = CryptoService.hashData(token);

    try {
      const oneTimeToken = await this.oneTimeTokenRepository.findValidByHash(tokenHash, purpose);

      if (!oneTimeToken) {
        return false;
      }

      const user = await this.userRepository.findById(oneTimeToken.userId);
      if (!user || user.isDeleted) {
        return false;
      }

      this.loggerService.debug({
        message: 'Validated one-time token successfully',
        userId: user.id,
        tokenHash,
        purpose,
      });

      return true;
    } catch (err) {
      this.loggerService.warn({
        message: 'Failed to validate one-time token',
        err,
        tokenHash,
        purpose,
      });
      return false;
    }
  }
}
