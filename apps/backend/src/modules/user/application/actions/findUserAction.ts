import { ResourceNotFoundError } from '../../../../common/errors/resourceNotFoundError.ts';
import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { User } from '../../domain/types/user.ts';

export class FindUserAction {
  private readonly userRepository: UserRepository;

  public constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  public async execute(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new ResourceNotFoundError({
        resource: 'User',
        reason: 'User not found',
        userId: id,
      });
    }

    return user;
  }
}
