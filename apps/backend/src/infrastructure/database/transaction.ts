import type { PgTransaction } from 'drizzle-orm/pg-core';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Transaction = PgTransaction<any, any, any>;
