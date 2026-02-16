/**
 * Sync Session API Route Tests
 *
 * Tests for POST /api/auth/sync-session
 * Covers: JWT decoding, cookie setting, expiration calculation, error handling
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

// Mock jwt-decode
const mockJwtDecode = vi.fn();
vi.mock('jwt-decode', () => ({
  jwtDecode: (...args: unknown[]) => mockJwtDecode(...args),
}));

// Import after mocks
import { POST } from '../route';

// Helper to create a sync-session request
function createSyncRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3002/api/auth/sync-session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/sync-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'test');
    process.env.COOKIE_DOMAIN = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Input validation ---

  describe('input validation', () => {
    it('should return 400 when accessToken is missing', async () => {
      const request = createSyncRequest({ refreshToken: 'refresh-123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Access token is required');
    });

    it('should return 400 when accessToken is empty string', async () => {
      const request = createSyncRequest({ accessToken: '', refreshToken: 'refresh-123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it('should return 500 when body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3002/api/auth/sync-session', {
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

  // --- JWT decoding and cookie setting ---

  describe('successful session sync', () => {
    it('should decode JWT and set cookies with user info', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 3600;
      mockJwtDecode.mockReturnValue({
        sub: 'user-abc-123',
        email: 'user@example.com',
        exp: futureExp,
      });

      const request = createSyncRequest({
        accessToken: 'valid-jwt-token',
        refreshToken: 'refresh-token-456',
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

    it('should set beak_access_token cookie with httpOnly', async () => {
      const futureExp = Math.floor(Date.now() / 1000) + 1800;
      mockJwtDecode.mockReturnValue({
        sub: 'user-123',
        exp: futureExp,
      });

      const request = createSyncRequest({
        accessToken: 'jwt-token',
        refreshToken: 'refresh-token',
      });

      await POST(request);

      const accessTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_access_token'
      );
      expect(accessTokenCall).toBeDefined();
      expect(accessTokenCall![1]).toBe('jwt-token');
      expect(accessTokenCall![2]).toMatchObject({
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
    });

    it('should set beak_refresh_token cookie when refreshToken is provided', async () => {
      mockJwtDecode.mockReturnValue({ sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 });

      const request = createSyncRequest({
        accessToken: 'jwt-token',
        refreshToken: 'my-refresh-token',
      });

      await POST(request);

      const refreshTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_refresh_token'
      );
      expect(refreshTokenCall).toBeDefined();
      expect(refreshTokenCall![1]).toBe('my-refresh-token');
      expect(refreshTokenCall![2]).toMatchObject({
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    });

    it('should NOT set beak_refresh_token cookie when refreshToken is absent', async () => {
      mockJwtDecode.mockReturnValue({ sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 });

      const request = createSyncRequest({
        accessToken: 'jwt-token',
      });

      await POST(request);

      const refreshTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_refresh_token'
      );
      expect(refreshTokenCall).toBeUndefined();
    });

    it('should set beak_user_id cookie as non-httpOnly', async () => {
      mockJwtDecode.mockReturnValue({ sub: 'user-xyz', exp: Math.floor(Date.now() / 1000) + 3600 });

      const request = createSyncRequest({
        accessToken: 'jwt-token',
        refreshToken: 'refresh',
      });

      await POST(request);

      const userIdCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_user_id'
      );
      expect(userIdCall).toBeDefined();
      expect(userIdCall![1]).toBe('user-xyz');
      expect(userIdCall![2]).toMatchObject({
        httpOnly: false,
      });
    });

    it('should calculate expiresIn from JWT exp claim', async () => {
      // Token that expires in ~2 hours
      const futureExp = Math.floor(Date.now() / 1000) + 7200;
      mockJwtDecode.mockReturnValue({ sub: 'user-123', exp: futureExp });

      const request = createSyncRequest({
        accessToken: 'jwt-token',
        refreshToken: 'refresh',
      });

      await POST(request);

      const accessTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_access_token'
      );
      // maxAge should be close to 7200
      const maxAge = (accessTokenCall![2] as Record<string, number>).maxAge;
      expect(maxAge).toBeGreaterThan(7100);
      expect(maxAge).toBeLessThanOrEqual(7200);
    });

    it('should use 0 for expiresIn when token is already expired', async () => {
      const pastExp = Math.floor(Date.now() / 1000) - 100;
      mockJwtDecode.mockReturnValue({ sub: 'user-123', exp: pastExp });

      const request = createSyncRequest({
        accessToken: 'expired-jwt',
        refreshToken: 'refresh',
      });

      await POST(request);

      const accessTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_access_token'
      );
      expect((accessTokenCall![2] as Record<string, number>).maxAge).toBe(0);
    });
  });

  // --- JWT decode failure handling ---

  describe('JWT decode failure', () => {
    it('should continue with defaults when JWT decode fails', async () => {
      mockJwtDecode.mockImplementation(() => {
        throw new Error('Invalid JWT');
      });

      const request = createSyncRequest({
        accessToken: 'invalid-jwt-token',
        refreshToken: 'refresh',
      });

      const response = await POST(request);
      const data = await response.json();

      // Should succeed despite decode failure
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.user.id).toBe('unknown');
      expect(data.user.email).toBeUndefined();
    });

    it('should use default expiresIn (3600) when exp claim is missing', async () => {
      mockJwtDecode.mockReturnValue({ sub: 'user-123' });

      const request = createSyncRequest({
        accessToken: 'jwt-without-exp',
        refreshToken: 'refresh',
      });

      await POST(request);

      const accessTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_access_token'
      );
      expect((accessTokenCall![2] as Record<string, number>).maxAge).toBe(3600);
    });

    it('should use "unknown" for userId when sub claim is missing', async () => {
      mockJwtDecode.mockReturnValue({ email: 'user@example.com', exp: Math.floor(Date.now() / 1000) + 3600 });

      const request = createSyncRequest({
        accessToken: 'jwt-without-sub',
        refreshToken: 'refresh',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.user.id).toBe('unknown');
    });
  });

  // --- Environment configuration ---

  describe('environment configuration', () => {
    it('should set secure cookies in production mode', async () => {
      vi.stubEnv('NODE_ENV', 'production');
      mockJwtDecode.mockReturnValue({ sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 });

      const request = createSyncRequest({
        accessToken: 'jwt-token',
        refreshToken: 'refresh',
      });

      await POST(request);

      const accessTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_access_token'
      );
      expect(accessTokenCall![2]).toMatchObject({ secure: true });
    });

    it('should set cookie domain when COOKIE_DOMAIN is configured', async () => {
      process.env.COOKIE_DOMAIN = '.beak-gaming.com';
      mockJwtDecode.mockReturnValue({ sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 });

      const request = createSyncRequest({
        accessToken: 'jwt-token',
        refreshToken: 'refresh',
      });

      await POST(request);

      const accessTokenCall = mockCookieStore.set.mock.calls.find(
        (call: unknown[]) => call[0] === 'beak_access_token'
      );
      expect(accessTokenCall![2]).toMatchObject({ domain: '.beak-gaming.com' });
    });

    it('should trim COOKIE_DOMAIN whitespace', async () => {
      process.env.COOKIE_DOMAIN = '  .beak-gaming.com  ';
      mockJwtDecode.mockReturnValue({ sub: 'user-123', exp: Math.floor(Date.now() / 1000) + 3600 });

      const request = createSyncRequest({
        accessToken: 'jwt-token',
        refreshToken: 'refresh',
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
      // Force an error by making cookies() reject
      const { cookies } = await import('next/headers');
      // Use mockImplementationOnce to avoid breaking the mock for subsequent tests
      vi.mocked(cookies).mockRejectedValueOnce(new Error('Fatal'));

      const request = createSyncRequest({
        accessToken: 'jwt-token',
        refreshToken: 'refresh',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Internal server error');
    });
  });
});
