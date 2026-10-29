import { sql } from 'drizzle-orm';

import type { DatabaseClient } from '../../src/infrastructure/database/databaseClient.ts';

export async function truncateTables(databaseClient: DatabaseClient): Promise<void> {
  const tables = ['word_occurrences', 'words', 'captures', 'books', 'one_time_tokens', 'user_sessions', 'users'];

  for (const table of tables) {
    await databaseClient.db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
  }
}

export async function cleanupTables(databaseClient: DatabaseClient, tableNames: string[]): Promise<void> {
  for (const table of tableNames) {
    await databaseClient.db.execute(sql.raw(`TRUNCATE TABLE "${table}" CASCADE`));
  }
}
