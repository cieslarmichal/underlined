export type OneTimeTokenPurpose = 'reset-password' | 'email-verification';

export interface OneTimeToken {
  readonly id: string;
  readonly userId: string;
  readonly tokenHash: string;
  readonly purpose: string;
  readonly expiresAt: Date;
  readonly usedAt: Date | null;
  readonly createdAt: Date;
}
