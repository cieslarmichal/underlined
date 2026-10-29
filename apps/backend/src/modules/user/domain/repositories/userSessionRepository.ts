import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type { UserSession } from '../types/userSession.ts';

export interface CreateUserSessionData {
  readonly id?: string;
  readonly userId: string;
  readonly currentRefreshHash: string;
}

export interface RotateWithGraceData {
  readonly sessionId: string;
  readonly newRefreshHash: string;
  readonly graceMs: number;
  readonly now?: Date;
}

export interface AcceptPreviousData {
  readonly sessionId: string;
  readonly presentedHash: string;
  readonly now?: Date;
}

export interface UserSessionRepository {
  create(data: CreateUserSessionData): Promise<UserSession>;
  findById(sessionId: string, tx?: Transaction): Promise<UserSession | null>;
  findByCurrentHash(tokenHash: string, tx?: Transaction): Promise<UserSession | null>;
  rotateWithGrace(data: RotateWithGraceData, tx?: Transaction): Promise<UserSession>;
  acceptPreviousIfWithinGrace(data: AcceptPreviousData, tx?: Transaction): Promise<boolean>;
  revoke(sessionId: string, tx?: Transaction): Promise<void>;
}
