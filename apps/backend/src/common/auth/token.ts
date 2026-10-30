export interface TokenPayload {
  readonly userId: string;
  readonly email: string;
  readonly iat?: number; // issued at
  readonly exp?: number; // expiration time
}

export interface RefreshTokenPayload {
  readonly userId: string;
  readonly sessionId: string;
  readonly generation: number;
  readonly iat?: number; // issued at
  readonly exp?: number; // expiration time
}
