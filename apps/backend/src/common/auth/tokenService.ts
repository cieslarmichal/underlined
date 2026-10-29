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

  public generateRefreshToken(payload: RefreshTokenPayload): string {
    return this.generateToken(payload, 'refresh');
  }

  public verifyAccessToken(token: string): TokenPayload {
    return this.verifyToken(token, 'access');
  }

  public verifyRefreshToken(token: string): RefreshTokenPayload {
    return this.verifyToken(token, 'refresh');
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
