import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type { UserSession } from '../types/userSession.ts';

export interface CreateUserSessionData {
  readonly id?: string;
  readonly userId: string;
  readonly issuedAt: Date;
}

export interface RotateUserSessionData {
  readonly sessionId: string;
  readonly generation: number;
  readonly rotatedAt: Date;
  readonly prevUsableUntil: Date;
}

export interface UserSessionRepository {
  create(data: CreateUserSessionData): Promise<UserSession>;
  findById(sessionId: string, tx?: Transaction): Promise<UserSession | null>;
  rotate(data: RotateUserSessionData, tx?: Transaction): Promise<UserSession>;
  revoke(sessionId: string, tx?: Transaction): Promise<void>;
}
