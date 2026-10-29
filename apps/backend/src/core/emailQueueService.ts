import { PgBoss } from 'pg-boss';

import type { EmailService } from '../common/emailService/emailService.ts';
import type { EmailTemplate, EmailTemplateDataMap, EmailTemplateName } from '../common/emailService/emailTemplate.ts';
import type { LoggerService } from '../common/logger/loggerService.ts';
import type { Config } from './config.ts';

export interface QueueEmailPayload {
  readonly recipient: string;
  readonly templateName: EmailTemplateName;
  readonly payload: EmailTemplateDataMap[EmailTemplateName];
}

export class EmailQueueService {
  private boss: PgBoss;
  private readonly emailService: EmailService;
  private readonly loggerService: LoggerService;
  private readonly emailQueueName: string;
  private readonly config: Config;
  private isRestarting = false;

  public constructor(emailService: EmailService, loggerService: LoggerService, config: Config) {
    this.emailService = emailService;
    this.loggerService = loggerService;
    this.emailQueueName = config.emailQueueName;
    this.config = config;
    this.boss = this.createBoss();
  }

  private createBoss(): PgBoss {
    return new PgBoss({
      connectionString: this.config.database.url,
      ssl: this.config.database.ssl
        ? {
            rejectUnauthorized: false,
          }
        : false,
      // keepAlive is passed to pg-pool at runtime but not typed in pg-boss types
      ...{ keepAlive: true },
    });
  }

  public async queueEmail(recipient: string, template: EmailTemplate): Promise<void> {
    const jobId = await this.boss.send(
      this.emailQueueName,
      {
        recipient,
        templateName: template.name,
        payload: template.data,
      },
      {
        retryLimit: 5,
        retryDelay: 2,
        retryBackoff: true,
      },
    );

    this.loggerService.debug({
      message: 'Email queued',
      jobId,
      recipient,
      templateName: template.name,
    });
  }

  public async start(): Promise<void> {
    await this.boss.start();

    this.boss.on('error', (error) => {
      this.loggerService.error({
        message: 'Email queue encountered an error',
        err: error,
      });

      void this.restart();
    });

    this.loggerService.debug({ message: 'Creating email queue' });

    await this.boss.createQueue(this.emailQueueName, {
      retryLimit: 5,
      retryDelay: 2,
      retryBackoff: true,
    });

    this.loggerService.debug({ message: 'Registering email worker' });

    await this.boss.work(this.emailQueueName, { batchSize: 2 }, async (jobs) => {
      const startTime = Date.now();

      for (const job of jobs) {
        const { recipient, templateName, payload } = job.data as QueueEmailPayload;
        const attemptNumber = (job as { retrycount?: number }).retrycount ?? 0;

        this.loggerService.debug({
          message: 'Processing email job',
          jobId: job.id,
          recipient,
          templateName,
          attempt: attemptNumber + 1,
        });

        try {
          await this.emailService.sendEmail({
            toEmail: recipient,
            template: {
              name: templateName,
              data: payload,
            } as never,
          });

          const duration = Date.now() - startTime;

          this.loggerService.info({
            message: 'Email sent successfully',
            jobId: job.id,
            recipient,
            templateName,
            attempt: attemptNumber + 1,
            durationMs: duration,
          });
        } catch (error: unknown) {
          const duration = Date.now() - startTime;

          this.loggerService.error({
            message: 'Failed to send email',
            jobId: job.id,
            recipient,
            templateName,
            attempt: attemptNumber + 1,
            durationMs: duration,
            willRetry: attemptNumber < 4,
            err: error,
          });

          throw error;
        }
      }
    });

    this.loggerService.debug({ message: 'Email queue service started' });
  }

  public async stop(): Promise<void> {
    this.loggerService.debug({ message: 'Stopping email queue service' });

    await this.boss.stop({ graceful: true, timeout: 30000 });

    this.loggerService.debug({ message: 'Email queue service stopped' });
  }

  public async clearAllJobs(): Promise<void> {
    await this.boss.getDb().executeSql(`TRUNCATE TABLE pgboss.job CASCADE;`);
  }

  private async restart(): Promise<void> {
    if (this.isRestarting) {
      return;
    }

    this.isRestarting = true;

    this.loggerService.warn({ message: 'Email queue restarting after connection error' });

    try {
      await this.boss.stop({ graceful: false, timeout: 5000 });
    } catch {
      // ignore stop errors during restart
    }

    this.boss = this.createBoss();

    this.isRestarting = false;

    await this.start();

    this.loggerService.info({ message: 'Email queue restarted successfully' });
  }
}
