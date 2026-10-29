import { and, asc, count, eq, gte, ne } from 'drizzle-orm';

import type { UnderlinedWord } from '../../../../common/ai/pageAnalysisService.ts';
import { IdService } from '../../../../common/id/idService.ts';
import type { NativeLanguage } from '../../../../common/types/language.ts';
import type { DatabaseClient } from '../../../../infrastructure/database/databaseClient.ts';
import { captures } from '../../../../infrastructure/database/schema.ts';
import type { Transaction } from '../../../../infrastructure/database/transaction.ts';
import type {
  CaptureRepository,
  CreateCaptureData,
  UpdateCaptureData,
} from '../../domain/repositories/captureRepository.ts';
import type { Capture, CaptureStatus } from '../../domain/types/capture.ts';

export class CaptureRepositoryImpl implements CaptureRepository {
  private readonly databaseClient: DatabaseClient;

  public constructor(databaseClient: DatabaseClient) {
    this.databaseClient = databaseClient;
  }

  public async create(data: CreateCaptureData): Promise<Capture> {
    const [capture] = await this.databaseClient.db
      .insert(captures)
      .values({ id: IdService.generateUuid(), status: 'failed', ...data })
      .returning();

    if (!capture) {
      throw new Error('Failed to create capture');
    }

    return this.mapToCapture(capture);
  }

  public async update(id: string, data: UpdateCaptureData, tx?: Transaction): Promise<Capture> {
    const db = tx ?? this.databaseClient.db;

    const [capture] = await db
      .update(captures)
      .set({
        status: data.status,
        ...(data.items !== undefined && { aiResult: { items: data.items } }),
      })
      .where(eq(captures.id, id))
      .returning();

    if (!capture) {
      throw new Error('Failed to update capture');
    }

    return this.mapToCapture(capture);
  }

  public async findById(id: string, userId: string): Promise<Capture | null> {
    const [capture] = await this.databaseClient.db
      .select()
      .from(captures)
      .where(and(eq(captures.id, id), eq(captures.userId, userId)))
      .limit(1);

    return capture ? this.mapToCapture(capture) : null;
  }

  public async findByBookId(bookId: string, userId: string, status: CaptureStatus): Promise<Capture[]> {
    const rows = await this.databaseClient.db
      .select()
      .from(captures)
      .where(and(eq(captures.bookId, bookId), eq(captures.userId, userId), eq(captures.status, status)))
      .orderBy(asc(captures.createdAt));

    return rows.map((row) => this.mapToCapture(row));
  }

  public async countSince(userId: string, since: Date): Promise<number> {
    const [result] = await this.databaseClient.db
      .select({ count: count() })
      .from(captures)
      .where(and(eq(captures.userId, userId), ne(captures.status, 'failed'), gte(captures.createdAt, since)));

    return result?.count ?? 0;
  }

  private mapToCapture(dbCapture: typeof captures.$inferSelect): Capture {
    const aiResult = dbCapture.aiResult as { items?: UnderlinedWord[] } | null;

    return {
      id: dbCapture.id,
      userId: dbCapture.userId,
      bookId: dbCapture.bookId,
      imageKey: dbCapture.imageKey,
      targetLanguage: dbCapture.targetLanguage as NativeLanguage,
      status: dbCapture.status as CaptureStatus,
      items: aiResult?.items ?? [],
      createdAt: dbCapture.createdAt,
    };
  }
}
