import { and, eq, gt, isNull, lt } from 'drizzle-orm';

import { IdService } from '../../../../common/id/idService.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { oneTimeTokens } from '../../../../infrastructure/database/schema.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type {
  CreateOneTimeTokenData,
  OneTimeTokenRepository,
} from '../../domain/repositories/oneTimeTokenRepository.ts';
import type { OneTimeToken } from '../../domain/types/oneTimeToken.ts';

export class OneTimeTokenRepositoryImpl implements OneTimeTokenRepository {
  private readonly database: DatabaseClient;

  public constructor(database: DatabaseClient) {
    this.database = database;
  }

  public async create(data: CreateOneTimeTokenData, tx?: Transaction): Promise<OneTimeToken> {
    const db = tx ?? this.database.db;

    const result = await db
      .insert(oneTimeTokens)
      .values({
        id: IdService.generateUuid(),
        userId: data.userId,
        tokenHash: data.tokenHash,
        purpose: data.purpose,
        expiresAt: data.expiresAt,
      })
      .returning();

    const [row] = result;

    if (!row) {
      throw new Error('Failed to create one time token');
    }

    return this.map(row);
  }

  public async findValidByHash(tokenHash: string, purpose: string, tx?: Transaction): Promise<OneTimeToken | null> {
    const db = tx ?? this.database.db;

    const conditions = [
      eq(oneTimeTokens.tokenHash, tokenHash),
      isNull(oneTimeTokens.usedAt),
      gt(oneTimeTokens.expiresAt, new Date()),
      eq(oneTimeTokens.purpose, purpose),
    ];

    const [row] = await db
      .select()
      .from(oneTimeTokens)
      .where(and(...conditions))
      .limit(1);

    return row ? this.map(row) : null;
  }

  public async markUsed(id: string, tx?: Transaction): Promise<void> {
    const db = tx ?? this.database.db;

    const currentDate = new Date();

    await db.update(oneTimeTokens).set({ usedAt: currentDate }).where(eq(oneTimeTokens.id, id));
  }

  public async deleteExpired(): Promise<void> {
    const currentDate = new Date();

    await this.database.db.delete(oneTimeTokens).where(lt(oneTimeTokens.expiresAt, currentDate));
  }

  private map(row: typeof oneTimeTokens.$inferSelect): OneTimeToken {
    return {
      id: row.id,
      userId: row.userId,
      tokenHash: row.tokenHash,
      purpose: row.purpose,
      expiresAt: row.expiresAt,
      usedAt: row.usedAt ?? null,
      createdAt: row.createdAt,
    };
  }
}
