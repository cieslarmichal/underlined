import type { NativeLanguage } from '../../../../common/types/language.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type { User } from '../types/user.ts';

export interface CreateUserData {
  readonly email: string;
  readonly password: string;
  readonly isEmailVerified?: boolean;
  readonly nativeLanguage?: NativeLanguage;
}

export interface UpdateUserData {
  readonly password?: string;
  readonly email?: string;
  readonly isEmailVerified?: boolean;
  readonly isDeleted?: boolean;
  readonly nativeLanguage?: NativeLanguage;
}

export interface AccountStatus {
  readonly exists: boolean;
  readonly isDeleted: boolean;
}

export interface UserRepository {
  create(data: CreateUserData, tx?: Transaction): Promise<User>;
  update(id: string, data: UpdateUserData, tx?: Transaction): Promise<User>;
  findById(id: string, tx?: Transaction): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  delete(id: string): Promise<void>;
  getAccountStatus(userId: string): Promise<AccountStatus>;
}
