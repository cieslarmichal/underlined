import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import type { LoggerService } from '../../common/logger/loggerService.ts';
import type { Config } from '../../core/config.ts';

import * as schema from './schema.ts';

export class DatabaseClient {
  private pool: Pool;
  public readonly db: ReturnType<typeof drizzle>;
  private readonly loggerService: LoggerService;

  public constructor(config: Config['database'], loggerService: LoggerService) {
    this.loggerService = loggerService;

    this.pool = new Pool({
      connectionString: config.url,
      ssl: config.ssl
        ? {
            rejectUnauthorized: false,
          }
        : false,
      ...config.pool,
    });

    this.pool.on('error', (error) => {
      this.loggerService.error({
        message: 'Unexpected database pool error',
        poolSize: this.pool.totalCount,
        idleConnections: this.pool.idleCount,
        waitingClients: this.pool.waitingCount,
        err: error,
      });

      if (this.pool.totalCount === 0) {
        this.loggerService.error({ message: 'Database pool is empty after error, restarting process' });
        process.exit(1);
      }
    });

    this.db = drizzle(this.pool, { schema });
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }

  public async testConnection(): Promise<void> {
    await this.db.execute('SELECT 1');
  }

  public async transaction<T>(
    callback: Parameters<typeof this.db.transaction<T>>[0],
    options?: Parameters<typeof this.db.transaction<T>>[1],
  ): Promise<T> {
    return this.db.transaction<T>(callback, options);
  }
}
