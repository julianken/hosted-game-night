import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockVerifyAccessToken = vi.fn<(...args: unknown[]) => Promise<boolean>>();
const mockShouldRefreshToken = vi.fn<(...args: unknown[]) => boolean>();
const mockRefreshTokens = vi.fn<(...args: unknown[]) => unknown>();

vi.mock('../game-middleware', () => ({
  createJwksGetter: vi.fn(() => vi.fn()),
  verifyAccessToken: (...args: unknown[]) => mockVerifyAccessToken(...args),
  getCookieOptions: (maxAge: number, domain?: string) => ({
    path: '/',
    domain,
    httpOnly: true,
    secure: false,
    sameSite: 'lax' as const,
    maxAge,
  }),
  clearAuthCookies: vi.fn((response: { cookies: { set: (name: string, value: string, opts: Record<string, unknown>) => void } }) => {
    response.cookies.set('jb_access_token', '', { path: '/', maxAge: 0 });
    response.cookies.set('jb_refresh_token', '', { path: '/', maxAge: 0 });
    response.cookies.set('jb_user_id', '', { path: '/', maxAge: 0 });
  }),
  isProtectedRoute: vi.fn(
    (pathname: string, routes: string[]) =>
      routes.some((r: string) => pathname.startsWith(r))
  ),
}));

vi.mock('../token-refresh', () => ({
  shouldRefreshToken: (...args: unknown[]) => mockShouldRefreshToken(...args),
  refreshTokens: (...args: unknown[]) => mockRefreshTokens(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function createRequest(
  pathname: string,
  cookies?: Record<string, string>
): NextRequest {
  const url = new URL(pathname, 'http://localhost:3000');
  const headers = new Headers();
  if (cookies) {
    const cookieStr = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers.set('cookie', cookieStr);
  }
  return new NextRequest(url, { headers });
}

function createMockLogger() {
  return {
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('createGameMiddleware', () => {
  let createGameMiddleware: typeof import('../middleware-factory').createGameMiddleware;

  beforeEach(async () => {
    vi.resetModules();
    mockVerifyAccessToken.mockReset();
    mockShouldRefreshToken.mockReset();
    mockRefreshTokens.mockReset();

    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_PLATFORM_HUB_URL = 'http://localhost:3002';
    delete process.env.E2E_TESTING;
    delete process.env.VERCEL;
    delete process.env.COOKIE_DOMAIN;

    ({ createGameMiddleware } = await import('../middleware-factory'));
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_PLATFORM_HUB_URL;
    delete process.env.E2E_TESTING;
    delete process.env.VERCEL;
    delete process.env.COOKIE_DOMAIN;
    vi.restoreAllMocks();
  });

  // ── Public routes ────────────────────────────────────────────────────────

  describe('public routes (non-protected)', () => {
    it('allows requests to non-protected paths', async () => {
      const { middleware } = createGameMiddleware({
        gameType: 'bingo',
        guestModeEnabled: true,
        protectedPaths: ['/play'],
      });

      const response = await middleware(createRequest('/'));
      expect(response.status).toBe(200);
    });

    it('allows /display without auth', async () => {
      const { middleware } = createGameMiddleware({
        gameType: 'trivia',
        guestModeEnabled: false,
        protectedPaths: ['/play'],
      });

      const response = await middleware(createRequest('/display'));
      expect(response.status).toBe(200);
    });
  });

  // ── Guest mode (bingo) ──────────────────────────────────────────────────

  describe('guest mode enabled (bingo behavior)', () => {
    it('allows unauthenticated access to protected route', async () => {
      const { middleware } = createGameMiddleware({
        gameType: 'bingo',
        guestModeEnabled: true,
        protectedPaths: ['/play'],
      });

      const response = await middleware(createRequest('/play'));
      expect(response.status).toBe(200);
    });

    it('validates token when present and valid', async () => {
      mockShouldRefreshToken.mockReturnValue(false);
      mockVerifyAccessToken.mockResolvedValue(true);

      const { middleware } = createGameMiddleware({
        gameType: 'bingo',
        guestModeEnabled: true,
        protectedPaths: ['/play'],
      });

      const response = await middleware(
        createRequest('/play', { jb_access_token: 'valid-token' })
      );
      expect(response.status).toBe(200);
      expect(mockVerifyAccessToken).toHaveBeenCalled();
    });

    it('clears cookies and redirects when token is invalid and no refresh token', async () => {
      mockShouldRefreshToken.mockReturnValue(false);
      mockVerifyAccessToken.mockResolvedValue(false);

      const { middleware } = createGameMiddleware({
        gameType: 'bingo',
        guestModeEnabled: true,
        protectedPaths: ['/play'],
      });

      const response = await middleware(
        createRequest('/play', { jb_access_token: 'bad-token' })
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/');
    });
  });

  // ── Auth required (trivia) ─────────────────────────────────────────────

  describe('guest mode disabled (trivia behavior)', () => {
    it('redirects unauthenticated users to home with return-to cookie', async () => {
      const { middleware } = createGameMiddleware({
        gameType: 'trivia',
        guestModeEnabled: false,
        protectedPaths: ['/play'],
      });

      const response = await middleware(createRequest('/play'));
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toBe('http://localhost:3000/');

      // Check jb_return_to cookie was set
      const setCookie = response.headers.getSetCookie();
      const returnToCookie = setCookie.find((c: string) =>
        c.startsWith('jb_return_to=')
      );
      expect(returnToCookie).toBeDefined();
      // Cookie value is URL-encoded: /play -> %2Fplay
      expect(returnToCookie).toContain('%2Fplay');
      expect(returnToCookie).toContain('Max-Age=300');
    });

    it('validates token when present and valid', async () => {
      mockShouldRefreshToken.mockReturnValue(false);
      mockVerifyAccessToken.mockResolvedValue(true);

      const { middleware } = createGameMiddleware({
        gameType: 'trivia',
        guestModeEnabled: false,
        protectedPaths: ['/play'],
      });

      const response = await middleware(
        createRequest('/play', { jb_access_token: 'valid-token' })
      );
      expect(response.status).toBe(200);
      expect(mockVerifyAccessToken).toHaveBeenCalled();
    });

    it('clears cookies and redirects when token is invalid', async () => {
      mockShouldRefreshToken.mockReturnValue(false);
      mockVerifyAccessToken.mockResolvedValue(false);

      const { middleware } = createGameMiddleware({
        gameType: 'trivia',
        guestModeEnabled: false,
        protectedPaths: ['/play'],
      });

      const response = await middleware(
        createRequest('/play', { jb_access_token: 'bad-token' })
      );
      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/');
    });
  });

  // ── E2E bypass ─────────────────────────────────────────────────────────

  describe('E2E testing bypass', () => {
    it('allows unauthenticated trivia access when E2E_TESTING=true', async () => {
      process.env.E2E_TESTING = 'true';
      vi.resetModules();
      ({ createGameMiddleware } = await import('../middleware-factory'));

      const { middleware } = createGameMiddleware({
        gameType: 'trivia',
        guestModeEnabled: false,
        protectedPaths: ['/play'],
      });

      const response = await middleware(createRequest('/play'));
      expect(response.status).toBe(200);
    });

    it('throws when E2E_TESTING=true on Vercel production', async () => {
      process.env.E2E_TESTING = 'true';
      process.env.VERCEL = '1';
      vi.resetModules();
      ({ createGameMiddleware } = await import('../middleware-factory'));

      expect(() =>
        createGameMiddleware({
          gameType: 'bingo',
          guestModeEnabled: true,
          protectedPaths: ['/play'],
        })
      ).toThrow('E2E mode cannot run in production');
    });
  });

  // ── Token refresh ──────────────────────────────────────────────────────

  describe('proactive token refresh', () => {
    it('refreshes token when within 5-min buffer and sets new cookies', async () => {
      mockShouldRefreshToken.mockReturnValue(true);
      mockRefreshTokens.mockResolvedValue({
        success: true,
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      mockVerifyAccessToken.mockResolvedValue(true);

      const { middleware } = createGameMiddleware({
        gameType: 'bingo',
        guestModeEnabled: true,
        protectedPaths: ['/play'],
      });

      const response = await middleware(
        createRequest('/play', {
          jb_access_token: 'old-token',
          jb_refresh_token: 'old-refresh',
        })
      );

      expect(response.status).toBe(200);
      const setCookies = response.headers.getSetCookie();
      const accessCookie = setCookies.find((c: string) =>
        c.startsWith('jb_access_token=')
      );
      expect(accessCookie).toContain('new-access');
    });

    it('falls through to normal verification when refresh fails', async () => {
      mockShouldRefreshToken.mockReturnValue(true);
      mockRefreshTokens.mockResolvedValue({
        success: false,
        error: 'refresh failed',
      });
      // Original token is still valid
      mockVerifyAccessToken.mockResolvedValue(true);

      const mockLogger = createMockLogger();
      const { middleware } = createGameMiddleware({
        gameType: 'trivia',
        guestModeEnabled: false,
        protectedPaths: ['/play'],
        logger: mockLogger,
      });

      const response = await middleware(
        createRequest('/play', {
          jb_access_token: 'still-valid',
          jb_refresh_token: 'bad-refresh',
        })
      );

      expect(response.status).toBe(200);
      expect(mockLogger.warn).toHaveBeenCalledWith('Token refresh failed', {
        error: 'refresh failed',
      });
    });

    it('falls through when refreshed token fails verification', async () => {
      mockShouldRefreshToken.mockReturnValue(true);
      mockRefreshTokens.mockResolvedValue({
        success: true,
        accessToken: 'bad-new-token',
        refreshToken: 'new-refresh',
      });
      // First call: new token verification fails
      // Second call: original token is still valid
      mockVerifyAccessToken
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const mockLogger = createMockLogger();
      const { middleware } = createGameMiddleware({
        gameType: 'bingo',
        guestModeEnabled: true,
        protectedPaths: ['/play'],
        logger: mockLogger,
      });

      const response = await middleware(
        createRequest('/play', {
          jb_access_token: 'valid-token',
          jb_refresh_token: 'refresh-token',
        })
      );

      expect(response.status).toBe(200);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Refreshed token failed verification'
      );
    });
  });

  // ── Invalid token with retry ───────────────────────────────────────────

  describe('invalid token with refresh retry', () => {
    it('retries refresh when initial verification fails, then succeeds', async () => {
      mockShouldRefreshToken.mockReturnValue(false);
      // First verify: original token invalid
      mockVerifyAccessToken.mockResolvedValueOnce(false);
      // Refresh succeeds
      mockRefreshTokens.mockResolvedValue({
        success: true,
        accessToken: 'recovered-access',
        refreshToken: 'recovered-refresh',
      });
      // Second verify: new token valid
      mockVerifyAccessToken.mockResolvedValueOnce(true);

      const { middleware } = createGameMiddleware({
        gameType: 'trivia',
        guestModeEnabled: false,
        protectedPaths: ['/play'],
      });

      const response = await middleware(
        createRequest('/play', {
          jb_access_token: 'expired-token',
          jb_refresh_token: 'refresh-token',
        })
      );

      expect(response.status).toBe(200);
      const setCookies = response.headers.getSetCookie();
      const accessCookie = setCookies.find((c: string) =>
        c.startsWith('jb_access_token=')
      );
      expect(accessCookie).toContain('recovered-access');
    });

    it('clears cookies and redirects when all refresh attempts fail', async () => {
      mockShouldRefreshToken.mockReturnValue(false);
      // Original token invalid
      mockVerifyAccessToken.mockResolvedValueOnce(false);
      // Refresh also fails
      mockRefreshTokens.mockResolvedValue({ success: false, error: 'expired' });

      const { middleware } = createGameMiddleware({
        gameType: 'trivia',
        guestModeEnabled: false,
        protectedPaths: ['/play'],
      });

      const response = await middleware(
        createRequest('/play', {
          jb_access_token: 'expired-token',
          jb_refresh_token: 'dead-refresh',
        })
      );

      expect(response.status).toBe(307);
      expect(response.headers.get('location')).toContain('/');
    });
  });

  // ── Config variations ──────────────────────────────────────────────────

  describe('config variations', () => {
    it('supports multiple protected paths', async () => {
      const { middleware } = createGameMiddleware({
        gameType: 'trivia',
        guestModeEnabled: false,
        protectedPaths: ['/play', '/question-sets'],
      });

      const response1 = await middleware(createRequest('/play'));
      expect(response1.status).toBe(307);

      const response2 = await middleware(createRequest('/question-sets'));
      expect(response2.status).toBe(307);

      const response3 = await middleware(createRequest('/'));
      expect(response3.status).toBe(200);
    });

    it('uses provided logger for warn and error', async () => {
      const mockLogger = createMockLogger();
      mockShouldRefreshToken.mockReturnValue(true);
      mockRefreshTokens.mockResolvedValue({
        success: false,
        error: 'test-error',
      });
      mockVerifyAccessToken.mockResolvedValue(true);

      const { middleware } = createGameMiddleware({
        gameType: 'bingo',
        guestModeEnabled: true,
        protectedPaths: ['/play'],
        logger: mockLogger,
      });

      await middleware(
        createRequest('/play', {
          jb_access_token: 'token',
          jb_refresh_token: 'refresh',
        })
      );

      expect(mockLogger.warn).toHaveBeenCalledWith('Token refresh failed', {
        error: 'test-error',
      });
    });

    it('falls back to console when no logger provided', () => {
      // Should not throw when logger is omitted
      expect(() =>
        createGameMiddleware({
          gameType: 'bingo',
          guestModeEnabled: true,
          protectedPaths: ['/play'],
        })
      ).not.toThrow();
    });
  });
});
