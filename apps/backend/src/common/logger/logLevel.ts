export const logLevels = {
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
  fatal: 'fatal',
  silent: 'silent',
} as const;

export type LogLevel = (typeof logLevels)[keyof typeof logLevels];
