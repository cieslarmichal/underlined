import type { FastifyReply, FastifyRequest } from 'fastify';

import { AccountDisabledError } from '../errors/accountDisabledError.ts';
import { ForbiddenAccessError } from '../errors/forbiddenAccessError.ts';
import { UnauthorizedAccessError } from '../errors/unathorizedAccessError.ts';
import type { UserRole } from '../types/userRole.ts';

import type { TokenService } from './tokenService.ts';

export type AuthMiddleware = (request: FastifyRequest, _reply: FastifyReply) => Promise<void>;

export interface UserAccountStatusReader {
  getAccountStatus(userId: string): Promise<{
    exists: boolean;
    isDeleted: boolean;
  }>;
}

export function createAuthenticationMiddleware(
  tokenService: TokenService,
  userRepository: UserAccountStatusReader,
): AuthMiddleware {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader) {
      throw new UnauthorizedAccessError({
        reason: 'Authorization header is required',
      });
    }

    const [bearer, token] = authorizationHeader.split(' ');

    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedAccessError({
        reason: 'Invalid authorization header format. Expected: Bearer <token>',
      });
    }

    const tokenPayload = tokenService.verifyAccessToken(token);

    const accountStatus = await userRepository.getAccountStatus(tokenPayload.userId);

    if (!accountStatus.exists) {
      throw new AccountDisabledError({
        reason: 'Account does not exist',
        userId: tokenPayload.userId,
      });
    }

    if (accountStatus.isDeleted) {
      throw new AccountDisabledError({
        reason: 'Account has been deleted',
        userId: tokenPayload.userId,
      });
    }

    request.user = {
      userId: tokenPayload.userId,
      email: tokenPayload.email,
      role: tokenPayload.role,
    };
  };
}

function createRoleAuthorizationMiddleware(requiredRole: UserRole): AuthMiddleware {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.user) {
      throw new UnauthorizedAccessError({
        reason: 'User not authenticated',
      });
    }

    if (request.user.role !== requiredRole && request.user.role !== 'admin') {
      throw new ForbiddenAccessError({
        reason: `Required role: ${requiredRole}`,
        userId: request.user.userId,
      });
    }
  };
}

export const adminAuthorizationMiddleware = createRoleAuthorizationMiddleware('admin');
