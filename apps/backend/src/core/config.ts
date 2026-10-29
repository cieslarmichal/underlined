import config from 'config';
import { type Static, type TLiteral, Type } from 'typebox';
import { DecodeError, Value } from 'typebox/value';

import { ConfigurationError } from '../common/errors/configurationError.ts';
import { type LogLevel, logLevels } from '../common/logger/logLevel.ts';
import { awsRegions, type AwsRegion } from '../common/s3/awsRegion.ts';

const emailTemplateSchema = Type.Object({
  templateFile: Type.String({ minLength: 1 }),
  subject: Type.String({ minLength: 1 }),
});

const configSchema = Type.Object({
  aws: Type.Object({
    accessKeyId: Type.String({ minLength: 1 }),
    secretAccessKey: Type.String({ minLength: 1 }),
    region: Type.Union(
      Object.values(awsRegions).map((value) => Type.Literal(value)) as [TLiteral<AwsRegion>, ...TLiteral<AwsRegion>[]],
    ),
    endpoint: Type.Optional(Type.String({ minLength: 1 })),
    bucketName: Type.String({ minLength: 1 }),
  }),
  database: Type.Object({
    url: Type.String({ minLength: 1 }),
    ssl: Type.Boolean(),
    pool: Type.Object({
      min: Type.Number({ minimum: 0, maximum: 10 }),
      max: Type.Number({ minimum: 1, maximum: 20 }),
      idleTimeoutMillis: Type.Number({ minimum: 1000, maximum: 120000 }),
      connectionTimeoutMillis: Type.Number({ minimum: 1000, maximum: 30000 }),
      maxLifetimeSeconds: Type.Number({ minimum: 60, maximum: 7200 }),
      keepAlive: Type.Boolean(),
      keepAliveInitialDelayMillis: Type.Number({ minimum: 0, maximum: 30000 }),
    }),
  }),
  cookie: Type.Object({
    secret: Type.String({ minLength: 1 }),
    refreshToken: Type.Object({
      name: Type.String({ minLength: 1 }),
      sameSite: Type.Union([Type.Literal('lax'), Type.Literal('none'), Type.Literal('strict')]),
      domain: Type.Optional(Type.String({ minLength: 1 })),
    }),
  }),
  frontendUrl: Type.String({ minLength: 1 }),
  hashSaltRounds: Type.Number({ minimum: 10, maximum: 15 }),
  logLevel: Type.Union(
    Object.values(logLevels).map((value) => Type.Literal(value)) as [TLiteral<LogLevel>, ...TLiteral<LogLevel>[]],
  ),
  resend: Type.Object({
    apiKey: Type.String({ minLength: 1 }),
    fromEmail: Type.String({ minLength: 1 }),
    emails: Type.Object({
      verifyAccount: emailTemplateSchema,
      resetPassword: emailTemplateSchema,
    }),
  }),
  token: Type.Object({
    access: Type.Object({
      secret: Type.String({ minLength: 1 }),
      expiresIn: Type.Number({ minimum: 1 }),
    }),
    refresh: Type.Object({
      secret: Type.String({ minLength: 1 }),
      expiresIn: Type.Number({ minimum: 86400 }),
      graceMs: Type.Number({ minimum: 1000, maximum: 10000 }),
      idempotencyMs: Type.Number({ minimum: 100, maximum: 5000 }),
    }),
    accountVerification: Type.Object({
      expiresIn: Type.Number({ minimum: 3600 }),
    }),
    resetPassword: Type.Object({
      expiresIn: Type.Number({ minimum: 1800 }),
    }),
  }),
  server: Type.Object({
    host: Type.String({ minLength: 1 }),
    port: Type.Number({ minimum: 1, maximum: 65535 }),
  }),
  rateLimit: Type.Object({
    global: Type.Object({
      max: Type.Number({ minimum: 1 }),
      timeWindow: Type.Number({ minimum: 1000 }),
    }),
    register: Type.Object({
      max: Type.Number({ minimum: 1 }),
      timeWindow: Type.Number({ minimum: 1000 }),
    }),
    login: Type.Object({
      max: Type.Number({ minimum: 1 }),
      timeWindow: Type.Number({ minimum: 1000 }),
    }),
    logout: Type.Object({
      max: Type.Number({ minimum: 1 }),
      timeWindow: Type.Number({ minimum: 1000 }),
    }),
    refreshToken: Type.Object({
      max: Type.Number({ minimum: 1 }),
      timeWindow: Type.Number({ minimum: 1000 }),
    }),
    profile: Type.Object({
      max: Type.Number({ minimum: 1 }),
      timeWindow: Type.Number({ minimum: 1000 }),
    }),
    accountDeletion: Type.Object({
      max: Type.Number({ minimum: 1 }),
      timeWindow: Type.Number({ minimum: 1000 }),
    }),
    passwordReset: Type.Object({
      max: Type.Number({ minimum: 1 }),
      timeWindow: Type.Number({ minimum: 1000 }),
    }),
    uploadImage: Type.Object({
      max: Type.Number({ minimum: 1 }),
      timeWindow: Type.Number({ minimum: 1000 }),
    }),
  }),
  image: Type.Object({
    maxFileSizeBytes: Type.Number({ minimum: 1024 * 1024, maximum: 5 * 1024 * 1024 }),
    allowedContentTypes: Type.Array(Type.String({ minLength: 1 })),
  }),
  emailQueueName: Type.String({ minLength: 1 }),
});

export type Config = Static<typeof configSchema>;

export function createConfig(): Config {
  try {
    return Value.Decode(configSchema, config);
  } catch (error) {
    if (error instanceof DecodeError) {
      throw new ConfigurationError({
        reason: error.cause.errors.map((e) => `${e.instancePath} ${e.message}`).join(', '),
      });
    }

    throw error;
  }
}
