import { LoggerServiceFactory } from './common/logger/loggerServiceFactory.ts';
import { Application } from './core/application.ts';

let isShuttingDown = false;

const fatalLogger = LoggerServiceFactory.create({ logLevel: 'error' });

export const finalErrorHandler = async (error: unknown, signal?: string): Promise<void> => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  if (signal === 'SIGINT' || signal === 'SIGTERM') {
    await Application.stop();
    process.exit(0);
  }

  fatalLogger.error({
    message: 'Application fatal error',
    err: error,
    signal,
  });

  await Application.stop();

  process.exit(1);
};

process.on('unhandledRejection', (error) => finalErrorHandler(error, 'unhandledRejection'));
process.on('uncaughtException', (error) => finalErrorHandler(error, 'uncaughtException'));
process.on('SIGINT', () => finalErrorHandler(new Error('SIGINT received'), 'SIGINT'));
process.on('SIGTERM', () => finalErrorHandler(new Error('SIGTERM received'), 'SIGTERM'));

try {
  await Application.start();
} catch (error) {
  await finalErrorHandler(error, 'startup');
}
