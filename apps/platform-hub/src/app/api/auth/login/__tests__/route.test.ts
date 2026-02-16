/**
 * Login API Route Tests
 *
 * Tests for POST /api/auth/login
 * Covers: validation, E2E bypass, Supabase auth, cookie setting, error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(() => []),
  set: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock @supabase/ssr createServerClient
const mockSignInWithPassword = vi.fn();
const mockSupabaseClient = {
  auth: {
    signInWithPassword: mockSignInWithPassword,
  },
};
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

// Mock jose for JWT signing
vi.mock('jose', () => {
  class MockSignJWT {
    setProtectedHeader() {
      return this;
    }
    setIssuedAt() {
      return this;
    }
    setExpirationTime() {
      return this;
    }
    async sign() {
      return 'mock-e2e-access-token-jwt';
    }
  }
  return { SignJWT: MockSignJWT };
});

// Import after mocks
import { POST } from '../route';

// Helper to create a POST request with JSON body
function createLoginRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3002/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default env: not E2E, no production
    process.env.E2E_TESTING = '';
    vi.stubEnv('NODE_ENV', 'test');
    process.env.COOKIE_DOMAIN = '';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Input validation ---

  describe('input validation', () => {
    it('should return 400 when email is missing', async () => {
      const request = createLoginRequest({ password: 'secret123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Email and password are required');
    });

    it('should return 400 when password is missing', async () => {
      const request = createLoginRequest({ email: 'user@example.com' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Email and password are required');
    });

    it('should return 400 when both email and password are missing', async () => {
      const request = createLoginRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 400 when email is empty string', async () => {
      const request = createLoginRequest({ email: '', password: 'secret123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 500 when body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3002/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });

  // --- E2E testing mode ---

  describe('E2E testing mode', () => {
    beforeEach(() => {
      process.env.E2E_TESTING = 'true';
    });

    it('should bypass Supabase auth for E2E test email', async () => {
      const request = createLoginRequest({
        email: 'e2e-test@beak-gaming.test',
        password: 'any-password',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual({
        id: 'e2e-test-user-00000000-0000-0000-0000-000000000000',
        email: 'e2e-test@beak-gaming.test',
      });

      // Should NOT call Supabase auth
      expect(mockSignInWithPassword).not.toHaveBeenCalled();
    });

    it('should set SSO cookies in E2E mode', async () => {
      const request = createLoginRequest({
        email: 'e2e-test@beak-gaming.test',
        password: 'any-password',
      });

      await POST(request);

      // Should set beak_access_token, beak_refresh_token, beak_user_id
      expect(mockCookieStore.set).toHaveBeenCalledTimes(3);

      const cookieCalls = mockCookieStore.set.mock.calls;

      // beak_access_token
      expect(cookieCalls[0][0]).toBe('beak_access_token');
      expect(cookieCalls[0][1]).toBe('mock-e2e-access-token-jwt');
      expect(cookieCalls[0][2]).toMatchObject({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });

      // beak_refresh_token
      expect(cookieCalls[1][0]).toBe('beak_refresh_token');
      expect(cookieCalls[1][1]).toBe('e2e-test-refresh-token');

      // beak_user_id
      expect(cookieCalls[2][0]).toBe('beak_user_id');
      expect(cookieCalls[2][1]).toBe('e2e-test-user-00000000-0000-0000-0000-000000000000');
      expect(cookieCalls[2][2]).toMatchObject({
        httpOnly: false, // client-side accessible
      });
    });

    it('should NOT bypass Supabase auth for non-E2E email even in E2E mode', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'real-token',
            refresh_token: 'real-refresh',
            expires_in: 3600,
          },
          user: { id: 'user-123', email: 'regular@example.com' },
        },
        error: null,
      });

      const request = createLoginRequest({
        email: 'regular@example.com',
        password: 'secret123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSignInWithPassword).toHaveBeenCalled();
    });

    it('should NOT bypass auth when E2E_TESTING is not "true"', async () => {
      process.env.E2E_TESTING = 'false';

      mockSignInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'real-token',
            refresh_token: 'real-refresh',
            expires_in: 3600,
          },
          user: { id: 'user-123', email: 'e2e-test@beak-gaming.test' },
        },
        error: null,
      });

      const request = createLoginRequest({
        email: 'e2e-test@beak-gaming.test',
        password: 'password',
      });

      await POST(request);
      expect(mockSignInWithPassword).toHaveBeenCalled();
    });
  });

  // --- Normal Supabase auth flow ---

  describe('normal auth flow', () => {
    it('should return success with user data on valid login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'supabase-access-token',
            refresh_token: 'supabase-refresh-token',
            expires_in: 3600,
          },
          user: { id: 'user-abc-123', email: 'user@example.com' },
        },
        error: null,
      });

      const request = createLoginRequest({
        email: 'user@example.com',
        password: 'correct-password',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user).toEqual({
        id: 'user-abc-123',
        email: 'user@example.com',
      });
    });

    it('should set cross-app SSO cookies on successful login', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'supabase-access-token',
            refresh_token: 'supabase-refresh-token',
            expires_in: 7200,
          },
          user: { id: 'user-abc-123', email: 'user@example.com' },
        },
        error: null,
      });

      const request = createLoginRequest({
        email: 'user@example.com',
        password: 'correct-password',
      });

      await POST(request);

      // beak_access_token, beak_refresh_token, beak_user_id
      // Plus any cookies that createServerClient's setAll callback sets
      const setCalls = mockCookieStore.set.mock.calls;
      const cookieNames = setCalls.map((call: unknown[]) => call[0]);
      expect(cookieNames).toContain('beak_access_token');
      expect(cookieNames).toContain('beak_refresh_token');
      expect(cookieNames).toContain('beak_user_id');
    });

    it('should return 401 when Supabase auth fails', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null },
        error: { message: 'Invalid login credentials', code: 'invalid_credentials', status: 400 },
      });

      const request = createLoginRequest({
        email: 'user@example.com',
        password: 'wrong-password',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid login credentials');
    });

    it('should return 401 when session is null (no error object)', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createLoginRequest({
        email: 'user@example.com',
        password: 'password',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Authentication failed');
    });

    it('should use email from request body if user.email is undefined', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'token',
            refresh_token: 'refresh',
            expires_in: 3600,
          },
          user: { id: 'user-123', email: undefined },
        },
        error: null,
      });

      const request = createLoginRequest({
        email: 'fallback@example.com',
        password: 'password',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.email).toBe('fallback@example.com');
    });

    it('should not set refresh_token cookie if refresh_token is absent', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: {
          session: {
            access_token: 'token',
            refresh_token: undefined,
            expires_in: 3600,
          },
          user: { id: 'user-123', email: 'user@example.com' },
        },
        error: null,
      });

      const request = createLoginRequest({
        email: 'user@example.com',
        password: 'password',
      });

      await POST(request);

      const setCalls = mockCookieStore.set.mock.calls;
      const refreshCookieCall = setCalls.find(
        (call: unknown[]) => call[0] === 'beak_refresh_token'
      );
      expect(refreshCookieCall).toBeUndefined();
    });
  });

  // --- Environment configuration ---

  describe('environment configuration', () => {
    it('should return 500 when Supabase URL is not configured', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const request = createLoginRequest({
        email: 'user@example.com',
        password: 'password',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Server configuration error');
    });

    it('should return 500 when Supabase anon key is not configured', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const request = createLoginRequest({
        email: 'user@example.com',
        password: 'password',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Server configuration error');
    });

    it('should set secure cookies in production mode', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      process.env.E2E_TESTING = 'true';

      const request = createLoginRequest({
        email: 'e2e-test@beak-gaming.test',
        password: 'any',
      });

      await POST(request);

      const accessTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_access_token'
      );
      expect(accessTokenCall![2]).toMatchObject({ secure: true });
    });

    it('should set cookie domain when COOKIE_DOMAIN is configured', async () => {
      process.env.COOKIE_DOMAIN = '.beak-gaming.com';
      process.env.E2E_TESTING = 'true';

      const request = createLoginRequest({
        email: 'e2e-test@beak-gaming.test',
        password: 'any',
      });

      await POST(request);

      const accessTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_access_token'
      );
      expect(accessTokenCall![2]).toMatchObject({ domain: '.beak-gaming.com' });
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('should return 500 on unexpected error', async () => {
      mockSignInWithPassword.mockRejectedValue(new Error('Network failure'));

      const request = createLoginRequest({
        email: 'user@example.com',
        password: 'password',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});
