import type { UserRole } from '../types/userRole.ts';

export interface TokenPayload {
  readonly userId: string;
  readonly email: string;
  readonly role: UserRole;
  readonly iat?: number; // issued at
  readonly exp?: number; // expiration time
}

export interface RefreshTokenPayload extends TokenPayload {
  readonly sessionId: string;
}
