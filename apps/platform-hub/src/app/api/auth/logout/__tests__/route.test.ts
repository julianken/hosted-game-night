/**
 * Logout API Route Tests
 *
 * Tests for POST /api/auth/logout
 * Covers: cookie clearing, Supabase sign-out, error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// Mock @supabase/supabase-js createClient
const mockSignOut = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signOut: mockSignOut,
    },
  })),
}));

// Import after mocks
import { POST } from '../route';

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.COOKIE_DOMAIN = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Happy path ---

  describe('successful logout', () => {
    it('should return success response', async () => {
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'beak_access_token') return { value: 'some-token' };
        if (name === 'beak_refresh_token') return { value: 'some-refresh' };
        return undefined;
      });
      mockSignOut.mockResolvedValue({});

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should clear all SSO cookies', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      await POST();

      // Should clear beak_access_token, beak_refresh_token, beak_user_id
      expect(mockCookieStore.set).toHaveBeenCalledTimes(3);

      const cookieCalls = mockCookieStore.set.mock.calls;

      expect(cookieCalls[0][0]).toBe('beak_access_token');
      expect(cookieCalls[0][1]).toBe('');
      expect(cookieCalls[0][2]).toMatchObject({ maxAge: 0, path: '/' });

      expect(cookieCalls[1][0]).toBe('beak_refresh_token');
      expect(cookieCalls[1][1]).toBe('');
      expect(cookieCalls[1][2]).toMatchObject({ maxAge: 0, path: '/' });

      expect(cookieCalls[2][0]).toBe('beak_user_id');
      expect(cookieCalls[2][1]).toBe('');
      expect(cookieCalls[2][2]).toMatchObject({ maxAge: 0, path: '/' });
    });

    it('should include COOKIE_DOMAIN in cleared cookies when set', async () => {
      process.env.COOKIE_DOMAIN = '.beak-gaming.com';
      mockCookieStore.get.mockReturnValue(undefined);

      await POST();

      const cookieCalls = mockCookieStore.set.mock.calls;
      cookieCalls.forEach((call: unknown[]) => {
        expect((call[2] as Record<string, unknown>).domain).toBe('.beak-gaming.com');
      });
    });
  });

  // --- Supabase sign-out ---

  describe('Supabase token revocation', () => {
    it('should call Supabase signOut when tokens exist', async () => {
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'beak_access_token') return { value: 'access-token-123' };
        if (name === 'beak_refresh_token') return { value: 'refresh-token-456' };
        return undefined;
      });
      mockSignOut.mockResolvedValue({});

      await POST();

      expect(mockSignOut).toHaveBeenCalled();
    });

    it('should NOT call Supabase signOut when no tokens exist', async () => {
      mockCookieStore.get.mockReturnValue(undefined);

      await POST();

      expect(mockSignOut).not.toHaveBeenCalled();
    });

    it('should still clear cookies even if Supabase signOut fails', async () => {
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'beak_access_token') return { value: 'token' };
        return undefined;
      });
      mockSignOut.mockRejectedValue(new Error('Supabase network error'));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockCookieStore.set).toHaveBeenCalledTimes(3);
    });

    it('should skip Supabase signOut when env vars are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'beak_access_token') return { value: 'token' };
        return undefined;
      });

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSignOut).not.toHaveBeenCalled();
      // Cookies should still be cleared
      expect(mockCookieStore.set).toHaveBeenCalledTimes(3);
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('should return 500 when cookie store throws', async () => {
      // Override the cookies mock to throw
      const { cookies } = await import('next/headers');
      vi.mocked(cookies).mockRejectedValueOnce(new Error('Cookie store unavailable'));

      const response = await POST();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
