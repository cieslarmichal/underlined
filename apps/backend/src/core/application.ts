import { EmailServiceImpl } from '../common/emailService/emailServiceImpl.ts';
import { LoggerServiceFactory } from '../common/logger/loggerServiceFactory.ts';
import { DatabaseClient } from '../infrastructure/database/databaseClient.ts';

import { createConfig } from './config.ts';
import { EmailQueueService } from './emailQueueService.ts';
import { HttpServer } from './httpServer.ts';

export class Application {
  private static databaseClient: DatabaseClient | undefined;
  private static server: HttpServer | undefined;
  private static emailQueueService: EmailQueueService | undefined;

  public static async start(): Promise<void> {
    const config = createConfig();
    const loggerService = LoggerServiceFactory.create({ logLevel: config.logLevel });

    this.databaseClient = new DatabaseClient(config.database, loggerService);
    const emailService = new EmailServiceImpl(config);
    this.emailQueueService = new EmailQueueService(emailService, loggerService, config);
    this.server = new HttpServer(config, loggerService, this.databaseClient, this.emailQueueService);

    await this.databaseClient.testConnection();

    await this.emailQueueService.start();

    await this.server.start();
  }

  public static async stop(): Promise<void> {
    await this.server?.stop();
    await this.emailQueueService?.stop();
    await this.databaseClient?.close();
  }
}
