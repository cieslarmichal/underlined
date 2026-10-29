import jwt from 'jsonwebtoken';

import type { Config } from '../../core/config.ts';
import { UnauthorizedAccessError } from '../errors/unathorizedAccessError.ts';

import type { RefreshTokenPayload, TokenPayload } from './token.ts';

type TokenType = 'access' | 'refresh';

export class TokenService {
  private readonly config: Config;

  public constructor(config: Config) {
    this.config = config;
  }

  public generateAccessToken(payload: TokenPayload): string {
    return this.generateToken(payload, 'access');
  }

  // Deterministic for a given session generation and issue time, so a duplicate refresh request
  // can be answered with exactly the same token without keeping any state in memory.
  public generateRefreshToken(payload: RefreshTokenPayload, issuedAt: Date): string {
    return this.generateToken(
      {
        userId: payload.userId,
        sessionId: payload.sessionId,
        generation: payload.generation,
        iat: Math.floor(issuedAt.getTime() / 1000),
      },
      'refresh',
    );
  }

  public verifyAccessToken(token: string): TokenPayload {
    return this.verifyToken(token, 'access');
  }

  public verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verifyToken(token, 'refresh');

    if (typeof payload.sessionId !== 'string' || typeof payload.generation !== 'number') {
      throw new UnauthorizedAccessError({ reason: 'Invalid refresh token payload' });
    }

    return payload;
  }

  private generateToken(payload: TokenPayload | RefreshTokenPayload, tokenType: TokenType): string {
    const tokenConfig = this.config.token[tokenType];
    return jwt.sign(payload, tokenConfig.secret, { expiresIn: tokenConfig.expiresIn, algorithm: 'HS512' });
  }

  private verifyToken(token: string, tokenType: 'access'): TokenPayload;
  private verifyToken(token: string, tokenType: 'refresh'): RefreshTokenPayload;
  private verifyToken(token: string, tokenType: TokenType): TokenPayload | RefreshTokenPayload {
    const tokenConfig = this.config.token[tokenType];

    try {
      return jwt.verify(token, tokenConfig.secret, { algorithms: ['HS512'] }) as TokenPayload | RefreshTokenPayload;
    } catch (error) {
      throw new UnauthorizedAccessError({
        reason: 'Invalid or expired token',
        originalError: error,
      });
    }
  }
}
