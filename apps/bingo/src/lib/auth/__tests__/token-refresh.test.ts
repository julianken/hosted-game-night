import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  shouldRefreshToken,
  isTokenExpired,
  refreshTokens,
  TokenRefreshResult,
} from '../token-refresh';

/**
 * Create a mock JWT token with the given expiry time
 */
function createMockJWT(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp, sub: 'test-user' }));
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

describe('token-refresh', () => {
  describe('shouldRefreshToken', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true when token expires within 5 minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      vi.setSystemTime(now * 1000);

      // Token expires in 4 minutes (240 seconds)
      const token = createMockJWT(now + 240);
      expect(shouldRefreshToken(token)).toBe(true);
    });

    it('returns true when token expires exactly in 5 minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      vi.setSystemTime(now * 1000);

      // Token expires in exactly 5 minutes (300 seconds)
      const token = createMockJWT(now + 300);
      expect(shouldRefreshToken(token)).toBe(true);
    });

    it('returns false when token expires in more than 5 minutes', () => {
      const now = Math.floor(Date.now() / 1000);
      vi.setSystemTime(now * 1000);

      // Token expires in 10 minutes (600 seconds)
      const token = createMockJWT(now + 600);
      expect(shouldRefreshToken(token)).toBe(false);
    });

    it('returns false when token is already expired', () => {
      const now = Math.floor(Date.now() / 1000);
      vi.setSystemTime(now * 1000);

      // Token expired 1 minute ago
      const token = createMockJWT(now - 60);
      expect(shouldRefreshToken(token)).toBe(false);
    });

    it('returns false for invalid token', () => {
      expect(shouldRefreshToken('invalid-token')).toBe(false);
      expect(shouldRefreshToken('')).toBe(false);
      expect(shouldRefreshToken('a.b.c')).toBe(false);
    });
  });

  describe('isTokenExpired', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns true when token is expired', () => {
      const now = Math.floor(Date.now() / 1000);
      vi.setSystemTime(now * 1000);

      // Token expired 1 minute ago
      const token = createMockJWT(now - 60);
      expect(isTokenExpired(token)).toBe(true);
    });

    it('returns true when token is exactly expired', () => {
      const now = Math.floor(Date.now() / 1000);
      vi.setSystemTime(now * 1000);

      // Token expires exactly now
      const token = createMockJWT(now);
      expect(isTokenExpired(token)).toBe(true);
    });

    it('returns false when token is not expired', () => {
      const now = Math.floor(Date.now() / 1000);
      vi.setSystemTime(now * 1000);

      // Token expires in 1 hour
      const token = createMockJWT(now + 3600);
      expect(isTokenExpired(token)).toBe(false);
    });

    it('returns true for invalid token', () => {
      expect(isTokenExpired('invalid-token')).toBe(true);
      expect(isTokenExpired('')).toBe(true);
      expect(isTokenExpired('a.b.c')).toBe(true);
    });
  });

  describe('refreshTokens', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
      vi.stubGlobal('fetch', mockFetch);
      mockFetch.mockReset();
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('returns success with new tokens on successful refresh', async () => {
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await refreshTokens('old-refresh-token', 'http://platform-hub.test');

      expect(result).toEqual<TokenRefreshResult>({
        success: true,
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      expect(mockFetch).toHaveBeenCalledWith('http://platform-hub.test/api/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'refresh_token',
          refresh_token: 'old-refresh-token',
        }),
      });
    });

    it('returns error on failed refresh (non-ok response)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'invalid_grant' }),
      });

      const result = await refreshTokens('invalid-refresh-token', 'http://platform-hub.test');

      expect(result).toEqual<TokenRefreshResult>({
        success: false,
        error: 'invalid_grant',
      });
    });

    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await refreshTokens('refresh-token', 'http://platform-hub.test');

      expect(result).toEqual<TokenRefreshResult>({
        success: false,
        error: 'Network error',
      });
    });

    it('returns error on non-Error failure', async () => {
      mockFetch.mockRejectedValueOnce('string error');

      const result = await refreshTokens('refresh-token', 'http://platform-hub.test');

      expect(result).toEqual<TokenRefreshResult>({
        success: false,
        error: 'Network error during refresh',
      });
    });

    it('handles json parse error on failed response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.reject(new Error('JSON parse error')),
      });

      const result = await refreshTokens('refresh-token', 'http://platform-hub.test');

      expect(result).toEqual<TokenRefreshResult>({
        success: false,
        error: 'Unknown error',
      });
    });
  });
});
