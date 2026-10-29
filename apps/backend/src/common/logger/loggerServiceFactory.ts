import { pino, stdSerializers } from 'pino';

import { LoggerService } from './loggerService.ts';
import { type LogLevel } from './logLevel.ts';

interface LoggerServiceConfig {
  readonly logLevel: LogLevel;
}

export class LoggerServiceFactory {
  public static create(config: LoggerServiceConfig): LoggerService {
    const logger = pino({
      level: config.logLevel,
      base: null,
      serializers: {
        err: stdSerializers.err,
        error: stdSerializers.err,
      },
    });

    return new LoggerService(logger);
  }
}
