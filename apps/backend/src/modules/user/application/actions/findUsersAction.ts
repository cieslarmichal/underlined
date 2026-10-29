import type { UserRepository } from '../../domain/repositories/userRepository.ts';
import type { User } from '../../domain/types/user.ts';

export interface FindUsersActionPayload {
  readonly page: number;
  readonly pageSize: number;
  readonly email?: string | undefined;
}

export interface FindUsersActionResult {
  readonly users: User[];
  readonly total: number;
}

export class FindUsersAction {
  private readonly userRepository: UserRepository;

  public constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  public async execute(payload: FindUsersActionPayload): Promise<FindUsersActionResult> {
    const { page, pageSize, email } = payload;

    const [foundUsers, total] = await Promise.all([
      this.userRepository.findMany({ page, pageSize, email }),
      this.userRepository.count(email),
    ]);

    return { users: foundUsers, total };
  }
}
