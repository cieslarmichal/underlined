import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { Generator } from '../../../../tests/generator.ts';
import { truncateTables } from '../../../../tests/helpers/dbCleanup.ts';
import { closeTestServer, createTestContext } from '../../../../tests/helpers/testServer.ts';
import { CryptoService } from '../../../common/crypto/cryptoService.ts';
import { IdService } from '../../../common/id/idService.ts';
import type { DatabaseClient } from '../../../infrastructure/database/databaseClient.ts';
import { OneTimeTokenRepositoryImpl } from '../infrastructure/repositories/oneTimeTokenRepositoryImpl.ts';
import { UserRepositoryImpl } from '../infrastructure/repositories/userRepositoryImpl.ts';

import type { LoginResponse, UserDto } from './userSchemas.ts';

describe('User Routes Integration Tests', () => {
  let server: FastifyInstance;
  let databaseClient: DatabaseClient;
  let userRepository: UserRepositoryImpl;
  let oneTimeTokenRepository: OneTimeTokenRepositoryImpl;

  beforeAll(async () => {
    const testContext = await createTestContext();
    server = testContext.server;
    databaseClient = testContext.databaseClient;
    userRepository = new UserRepositoryImpl(databaseClient);
    oneTimeTokenRepository = new OneTimeTokenRepositoryImpl(databaseClient);
  });

  afterAll(async () => {
    await closeTestServer();
  });

  beforeEach(async () => {
    await truncateTables(databaseClient);
  });

  async function registerVerifiedUser(userData: { email: string; password: string }): Promise<void> {
    await server.inject({
      method: 'POST',
      url: '/users/register',
      payload: userData,
    });
    const user = await userRepository.findByEmail(userData.email);
    if (!user) throw new Error('User not found');
    await userRepository.update(user.id, { isEmailVerified: true });
  }

  async function createOtt(userId: string, purpose: 'email-verification' | 'reset-password'): Promise<string> {
    const rawToken = IdService.generateNanoid();
    const tokenHash = CryptoService.hashData(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await oneTimeTokenRepository.create({ userId, tokenHash, purpose, expiresAt });
    return rawToken;
  }

  describe('POST /users/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/users/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(201);

      const body = response.json<UserDto>();

      expect(body).toMatchObject({
        email: userData.email,
      });
      expect(body.id).toBeTypeOf('string');
      expect(body.createdAt).toBeTypeOf('string');

      // Verify user was created in database
      const user = await userRepository.findByEmail(userData.email);
      expect(user).toBeDefined();
      expect(user?.email).toBe(userData.email);
    });

    it('should return 400 for invalid email format', async () => {
      const userData = {
        email: 'invalid-email',
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      const response = await server.inject({
        method: 'POST',
        url: '/users/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 409 when email already exists', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      // First registration
      await server.inject({
        method: 'POST',
        url: '/users/register',
        payload: userData,
      });

      // Second registration with same email
      const response = await server.inject({
        method: 'POST',
        url: '/users/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe('POST /users/login', () => {
    it('should login user and return access token', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await registerVerifiedUser(userData);

      const response = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: {
          email: userData.email,
          password: userData.password,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<LoginResponse>();
      expect(body.accessToken).toBeTypeOf('string');
      expect(body.accessToken.length).toBeGreaterThan(0);

      // Verify refresh token cookie is set
      const cookies = response.cookies;
      const refreshTokenCookie = cookies.find((c) => c.name === 'refresh-token');
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie?.value).toBeTypeOf('string');
      expect(refreshTokenCookie?.value.length).toBeGreaterThan(0);
    });

    it('should return 401 for invalid credentials', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await registerVerifiedUser(userData);

      // Login with wrong password
      const response = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: {
          email: userData.email,
          password: 'wrong-password',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for non-existent user', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: {
          email: Generator.email(),
          password: Generator.password(),
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /users/logout', () => {
    it('should logout user and clear refresh token cookie', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await registerVerifiedUser(userData);

      // Login
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: {
          email: userData.email,
          password: userData.password,
        },
      });

      const cookies = loginResponse.cookies;
      const refreshTokenCookie = cookies.find((c) => c.name === 'refresh-token');

      // Logout
      const response = await server.inject({
        method: 'POST',
        url: '/users/logout',
        cookies: {
          'refresh-token': refreshTokenCookie?.value ?? '',
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify cookie is cleared
      const logoutCookies = response.cookies;
      const clearedCookie = logoutCookies.find((c) => c.name === 'refresh-token');
      expect(clearedCookie?.value).toBe('');
    });
  });

  describe('POST /users/refresh-token', () => {
    it('should refresh access token with valid refresh token', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await registerVerifiedUser(userData);

      // Login
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: {
          email: userData.email,
          password: userData.password,
        },
      });

      const cookies = loginResponse.cookies;
      const refreshTokenCookie = cookies.find((c) => c.name === 'refresh-token');

      // Refresh token
      const response = await server.inject({
        method: 'POST',
        url: '/users/refresh-token',
        cookies: {
          'refresh-token': refreshTokenCookie?.value ?? '',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<LoginResponse>();
      expect(body.accessToken).toBeTypeOf('string');
      expect(body.accessToken.length).toBeGreaterThan(0);

      // Verify new refresh token cookie is set
      const refreshCookies = response.cookies;
      const newRefreshTokenCookie = refreshCookies.find((c) => c.name === 'refresh-token');
      expect(newRefreshTokenCookie).toBeDefined();
      expect(newRefreshTokenCookie?.value).toBeTypeOf('string');
    });

    it('should return 401 when refresh token is missing', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/refresh-token',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /users/me', () => {
    it('should return authenticated user profile', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await registerVerifiedUser(userData);

      // Login
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: {
          email: userData.email,
          password: userData.password,
        },
      });

      const loginBody = loginResponse.json<LoginResponse>();

      // Get profile
      const response = await server.inject({
        method: 'GET',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${loginBody.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = response.json<UserDto>();

      expect(body).toMatchObject({
        email: userData.email,
      });
      expect(body.id).toBeTypeOf('string');
      expect(body.createdAt).toBeTypeOf('string');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 with invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /users/me', () => {
    it('should delete authenticated user account', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await registerVerifiedUser(userData);

      // Login
      const loginResponse = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: {
          email: userData.email,
          password: userData.password,
        },
      });

      const loginBody = loginResponse.json<LoginResponse>();

      // Delete account
      const response = await server.inject({
        method: 'DELETE',
        url: '/users/me',
        headers: {
          authorization: `Bearer ${loginBody.accessToken}`,
        },
      });

      expect(response.statusCode).toBe(204);

      // Verify user was deleted from database
      const user = await userRepository.findByEmail(userData.email);
      expect(user).toBeNull();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/users/me',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('POST /users/verify-email', () => {
    it('should verify email with valid token', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      // Register without verifying so isEmailVerified remains false
      await server.inject({ method: 'POST', url: '/users/register', payload: userData });

      const user = await userRepository.findByEmail(userData.email);
      if (!user) throw new Error('User not found');
      const rawToken = await createOtt(user.id, 'email-verification');

      const response = await server.inject({
        method: 'POST',
        url: '/users/verify-email',
        payload: { token: rawToken },
      });

      expect(response.statusCode).toBe(204);

      const updatedUser = await userRepository.findById(user.id);
      expect(updatedUser?.isEmailVerified).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/verify-email',
        payload: { token: 'invalid-token' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /users/validate-one-time-token', () => {
    it('should return valid: true for a valid token', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await server.inject({ method: 'POST', url: '/users/register', payload: userData });

      const user = await userRepository.findByEmail(userData.email);
      if (!user) throw new Error('User not found');
      const rawToken = await createOtt(user.id, 'email-verification');

      const response = await server.inject({
        method: 'POST',
        url: '/users/validate-one-time-token',
        payload: { token: rawToken, purpose: 'email-verification' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json<{ valid: boolean }>().valid).toBe(true);
    });

    it('should return valid: false for an invalid token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/validate-one-time-token',
        payload: { token: 'invalid-token', purpose: 'email-verification' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json<{ valid: boolean }>().valid).toBe(false);
    });
  });

  describe('POST /users/change-password-by-token', () => {
    it('should change password with valid reset token', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await server.inject({ method: 'POST', url: '/users/register', payload: userData });

      const user = await userRepository.findByEmail(userData.email);
      if (!user) throw new Error('User not found');
      const rawToken = await createOtt(user.id, 'reset-password');

      const newPassword = Generator.password();

      const response = await server.inject({
        method: 'POST',
        url: '/users/change-password-by-token',
        payload: { token: rawToken, newPassword },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 400 for invalid token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/change-password-by-token',
        payload: { token: 'invalid-token', newPassword: Generator.password() },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /users/send-reset-password-email', () => {
    it('should return 204 for existing user', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await server.inject({ method: 'POST', url: '/users/register', payload: userData });

      const response = await server.inject({
        method: 'POST',
        url: '/users/send-reset-password-email',
        payload: { email: userData.email },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 204 for non-existent user', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/send-reset-password-email',
        payload: { email: Generator.email() },
      });

      expect(response.statusCode).toBe(204);
    });
  });

  describe('POST /users/resend-verification', () => {
    it('should return 204 for existing unverified user', async () => {
      const userData = {
        email: Generator.email(),
        password: Generator.password(),
        nativeLanguage: 'pl',
      };

      await server.inject({ method: 'POST', url: '/users/register', payload: userData });

      const response = await server.inject({
        method: 'POST',
        url: '/users/resend-verification',
        payload: { email: userData.email },
      });

      expect(response.statusCode).toBe(204);
    });

    it('should return 204 for non-existent user', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/resend-verification',
        payload: { email: Generator.email() },
      });

      expect(response.statusCode).toBe(204);
    });
  });

  describe('POST /users/me/change-password', () => {
    it('should change password and allow login with new password', async () => {
      const userData = { email: Generator.email(), password: Generator.password(), nativeLanguage: 'pl' };
      await registerVerifiedUser(userData);

      const loginResponse = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: { email: userData.email, password: userData.password },
      });
      const { accessToken } = loginResponse.json<LoginResponse>();

      const newPassword = Generator.password();
      const response = await server.inject({
        method: 'POST',
        url: '/users/me/change-password',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { currentPassword: userData.password, newPassword },
      });

      expect(response.statusCode).toBe(204);

      const loginWithNew = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: { email: userData.email, password: newPassword },
      });
      expect(loginWithNew.statusCode).toBe(200);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/users/me/change-password',
        payload: { currentPassword: Generator.password(), newPassword: Generator.password() },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 with wrong current password', async () => {
      const userData = { email: Generator.email(), password: Generator.password(), nativeLanguage: 'pl' };
      await registerVerifiedUser(userData);

      const loginResponse = await server.inject({
        method: 'POST',
        url: '/users/login',
        payload: { email: userData.email, password: userData.password },
      });
      const { accessToken } = loginResponse.json<LoginResponse>();

      const response = await server.inject({
        method: 'POST',
        url: '/users/me/change-password',
        headers: { authorization: `Bearer ${accessToken}` },
        payload: { currentPassword: Generator.password(), newPassword: Generator.password() },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
