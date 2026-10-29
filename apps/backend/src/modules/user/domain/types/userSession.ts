export type SessionStatus = 'active' | 'revoked';

export interface UserSession {
  readonly id: string;
  readonly userId: string;
  readonly currentRefreshHash: string;
  readonly prevRefreshHash: string | null;
  readonly prevUsableUntil: Date | null;
  readonly lastRotatedAt: Date;
  readonly status: SessionStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}
