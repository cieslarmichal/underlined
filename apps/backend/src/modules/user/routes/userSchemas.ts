import { Type, type Static } from '@fastify/type-provider-typebox';

export const nativeLanguageSchema = Type.Union([Type.Literal('pl'), Type.Literal('en')]);

export const roleSchema = Type.Union([Type.Literal('admin'), Type.Literal('user')]);

export const userSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ minLength: 1, maxLength: 255, format: 'email' }),
  role: roleSchema,
  isEmailVerified: Type.Boolean(),
  isDeleted: Type.Boolean(),
  nativeLanguage: nativeLanguageSchema,
  dailyCaptureLimit: Type.Number(),
  createdAt: Type.String({ format: 'date-time' }),
});

export const profileSchema = Type.Object({
  ...userSchema.properties,
  capturesToday: Type.Number(),
});

export const adminUserSchema = Type.Object({
  id: Type.String({ format: 'uuid' }),
  email: Type.String({ minLength: 1, maxLength: 255, format: 'email' }),
  role: roleSchema,
  isEmailVerified: Type.Boolean(),
  isDeleted: Type.Boolean(),
  createdAt: Type.String({ format: 'date-time' }),
});

export const adminUsersQuerySchema = Type.Object({
  email: Type.Optional(Type.String({ minLength: 1, maxLength: 255 })),
  page: Type.Optional(Type.Number({ minimum: 1 })),
  pageSize: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
});

export const adminUsersResponseSchema = Type.Object({
  data: Type.Array(adminUserSchema),
  metadata: Type.Object({
    total: Type.Number(),
  }),
});

export const registerRequestSchema = Type.Object({
  email: Type.String({ minLength: 1, maxLength: 255, format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 64 }),
  nativeLanguage: nativeLanguageSchema,
});

export const updateProfileRequestSchema = Type.Object({
  nativeLanguage: nativeLanguageSchema,
});

export const loginRequestSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 64 }),
});

export const loginResponseSchema = Type.Object({
  accessToken: Type.String(),
});

export const refreshTokenResponseSchema = Type.Object({
  accessToken: Type.String(),
});

export const verifyEmailRequestSchema = Type.Object({
  token: Type.String({ minLength: 1 }),
});

export const resendVerificationRequestSchema = Type.Object({
  email: Type.String({ format: 'email' }),
});

export const sendResetPasswordEmailRequestSchema = Type.Object({
  email: Type.String({ format: 'email' }),
});

export const changePasswordByTokenRequestSchema = Type.Object({
  token: Type.String({ minLength: 1 }),
  newPassword: Type.String({ minLength: 8, maxLength: 64 }),
});

export const validateOneTimeTokenRequestSchema = Type.Object({
  token: Type.String({ minLength: 1 }),
  purpose: Type.Union([Type.Literal('email-verification'), Type.Literal('reset-password')]),
});

export const validateOneTimeTokenResponseSchema = Type.Object({
  valid: Type.Boolean(),
});

export type UserDto = Static<typeof userSchema>;
export type AdminUserDto = Static<typeof adminUserSchema>;
export type RegisterRequest = Static<typeof registerRequestSchema>;
export type LoginRequest = Static<typeof loginRequestSchema>;
export type LoginResponse = Static<typeof loginResponseSchema>;
export type RefreshTokenResponse = Static<typeof refreshTokenResponseSchema>;
