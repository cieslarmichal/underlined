import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type { OneTimeToken, OneTimeTokenPurpose } from '../types/oneTimeToken.ts';

export interface CreateOneTimeTokenData {
  readonly userId: string;
  readonly tokenHash: string;
  readonly purpose: OneTimeTokenPurpose;
  readonly expiresAt: Date;
}

export interface OneTimeTokenRepository {
  create(data: CreateOneTimeTokenData, tx?: Transaction): Promise<OneTimeToken>;
  findValidByHash(tokenHash: string, purpose: string, tx?: Transaction): Promise<OneTimeToken | null>;
  markUsed(id: string, tx?: Transaction): Promise<void>;
  deleteExpired(): Promise<void>;
}
