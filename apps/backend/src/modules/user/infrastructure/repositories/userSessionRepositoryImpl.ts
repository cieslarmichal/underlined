import { and, eq, sql } from 'drizzle-orm';

import { IdService } from '../../../../common/id/idService.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { userSessions } from '../../../../infrastructure/database/schema.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type {
  AcceptPreviousData,
  CreateUserSessionData,
  RotateWithGraceData,
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
    const now = new Date();

    const result = await this.databaseClient.db
      .insert(userSessions)
      .values({
        id,
        userId: data.userId,
        currentRefreshHash: data.currentRefreshHash,
        prevRefreshHash: null,
        prevUsableUntil: null,
        lastRotatedAt: now,
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

  public async findByCurrentHash(tokenHash: string, tx?: Transaction): Promise<UserSession | null> {
    const db = tx ?? this.databaseClient.db;

    const query = db.select().from(userSessions).where(eq(userSessions.currentRefreshHash, tokenHash)).limit(1);

    const [row] = tx ? await query.for('update') : await query;

    return row ? this.map(row) : null;
  }

  public async rotateWithGrace(data: RotateWithGraceData, tx?: Transaction): Promise<UserSession> {
    const now = data.now ?? new Date();
    const prevUsableUntil = new Date(now.getTime() + data.graceMs);

    const db = tx ?? this.databaseClient.db;

    await db
      .update(userSessions)
      .set({
        prevRefreshHash: sql`${userSessions.currentRefreshHash}`,
        prevUsableUntil,
        currentRefreshHash: data.newRefreshHash,
        lastRotatedAt: now,
        updatedAt: now,
      })
      .where(eq(userSessions.id, data.sessionId));

    const updated = await this.findById(data.sessionId);
    if (!updated) {
      throw new Error('Failed to rotate user session');
    }
    return updated;
  }

  public async acceptPreviousIfWithinGrace(data: AcceptPreviousData, tx?: Transaction): Promise<boolean> {
    const now = data.now ?? new Date();

    const db = tx ?? this.databaseClient.db;

    const [row] = await db
      .select({ prevRefreshHash: userSessions.prevRefreshHash, prevUsableUntil: userSessions.prevUsableUntil })
      .from(userSessions)
      .where(eq(userSessions.id, data.sessionId))
      .limit(1);

    if (!row) return false;

    const withinGrace = row.prevUsableUntil ? now.getTime() <= new Date(row.prevUsableUntil).getTime() : false;
    return withinGrace && !!row.prevRefreshHash && row.prevRefreshHash === data.presentedHash;
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
      currentRefreshHash: row.currentRefreshHash,
      prevRefreshHash: row.prevRefreshHash ?? null,
      prevUsableUntil: row.prevUsableUntil ?? null,
      lastRotatedAt: row.lastRotatedAt,
      status: row.status as UserSession['status'],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
