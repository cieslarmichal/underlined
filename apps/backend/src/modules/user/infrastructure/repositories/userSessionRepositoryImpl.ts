import { and, eq } from 'drizzle-orm';

import { IdService } from '../../../../common/id/idService.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { userSessions } from '../../../../infrastructure/database/schema.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type {
  CreateUserSessionData,
  RotateUserSessionData,
  UserSessionRepository,
} from '../../domain/repositories/userSessionRepository.ts';
import type { UserSession } from '../../domain/types/userSession.ts';

export class UserSessionRepositoryImpl implements UserSessionRepository {
  private readonly databaseClient: DatabaseClient;

  public constructor(databaseClient: DatabaseClient) {
    this.databaseClient = databaseClient;
  }

  public async create(data: CreateUserSessionData): Promise<UserSession> {
    const id = data.id ?? IdService.generateUuid();

    const result = await this.databaseClient.db
      .insert(userSessions)
      .values({
        id,
        userId: data.userId,
        generation: 0,
        prevUsableUntil: null,
        lastRotatedAt: data.issuedAt,
        status: 'active',
      })
      .returning();

    const [row] = result;

    if (!row) {
      throw new Error('Failed to create user session');
    }

    return this.map(row);
  }

  public async findById(sessionId: string, tx?: Transaction): Promise<UserSession | null> {
    const db = tx ?? this.databaseClient.db;

    const query = db.select().from(userSessions).where(eq(userSessions.id, sessionId)).limit(1);

    const [row] = tx ? await query.for('update') : await query;

    return row ? this.map(row) : null;
  }

  public async rotate(data: RotateUserSessionData, tx?: Transaction): Promise<UserSession> {
    const db = tx ?? this.databaseClient.db;

    const [row] = await db
      .update(userSessions)
      .set({
        generation: data.generation,
        prevUsableUntil: data.prevUsableUntil,
        lastRotatedAt: data.rotatedAt,
        updatedAt: data.rotatedAt,
      })
      .where(eq(userSessions.id, data.sessionId))
      .returning();

    if (!row) {
      throw new Error('Failed to rotate user session');
    }

    return this.map(row);
  }

  public async revoke(sessionId: string, tx?: Transaction): Promise<void> {
    const now = new Date();

    const db = tx ?? this.databaseClient.db;

    await db
      .update(userSessions)
      .set({ status: 'revoked', updatedAt: now })
      .where(and(eq(userSessions.id, sessionId), eq(userSessions.status, 'active')));
  }

  private map(row: typeof userSessions.$inferSelect): UserSession {
    return {
      id: row.id,
      userId: row.userId,
      generation: row.generation,
      prevUsableUntil: row.prevUsableUntil ?? null,
      lastRotatedAt: row.lastRotatedAt,
      status: row.status as UserSession['status'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
