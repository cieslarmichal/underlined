import type { UserRole } from '../common/types/userRole.ts';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      userId: string;
      email: string;
      role: UserRole;
    };
    startTime?: number;
  }
}

export {};
