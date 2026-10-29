import type { NativeLanguage } from '../../../../common/types/language.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { User } from '../../domain/types/user.ts';

export class UpdateNativeLanguageAction {
  private readonly userRepository: UserRepository;

  public constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  public async execute(userId: string, nativeLanguage: NativeLanguage): Promise<User> {
    return this.userRepository.update(userId, { nativeLanguage });
  }
}
