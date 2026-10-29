export type UserRole = 'admin' | 'user';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly role: UserRole;
  readonly isEmailVerified: boolean;
  readonly isDeleted: boolean;
  readonly createdAt: string;
}
