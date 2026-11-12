import type { FastifyInstance } from 'fastify';

import type { PageAnalysisService } from '../../src/common/ai/pageAnalysisService.ts';
import type { EmailService } from '../../src/common/emailService/emailService.ts';
import { LoggerServiceFactory } from '../../src/common/logger/loggerServiceFactory.ts';
import type { BookSuggestionService } from '../../src/common/openLibrary/bookSuggestionService.ts';
import { createConfig } from '../../src/core/config.ts';
import { HttpServer } from '../../src/core/httpServer.ts';
import { DatabaseClient } from '../../src/infrastructure/database/databaseClient.ts';

let testServer: HttpServer | undefined;
let testDatabase: DatabaseClient | undefined;

export async function createTestContext(
  pageAnalysisService?: PageAnalysisService,
  bookSuggestionService?: BookSuggestionService,
): Promise<{ server: FastifyInstance; databaseClient: DatabaseClient }> {
  const config = createConfig();
  const loggerService = LoggerServiceFactory.create({ logLevel: 'silent' });

  testDatabase = new DatabaseClient(config.database, loggerService);
  await testDatabase.testConnection();

  const mockEmailService: EmailService = {
    sendEmail: async (): Promise<void> => {},
  };

  testServer = new HttpServer(
    config,
    loggerService,
    testDatabase,
    mockEmailService,
    pageAnalysisService,
    bookSuggestionService,
  );
  await testServer.start();

  return {
    server: testServer.fastifyServer,
    databaseClient: testDatabase,
  };
}

export async function closeTestServer(): Promise<void> {
  if (testServer) {
    await testServer.stop();
    testServer = undefined;
  }

  if (testDatabase) {
    await testDatabase.close();
    testDatabase = undefined;
  }
}
