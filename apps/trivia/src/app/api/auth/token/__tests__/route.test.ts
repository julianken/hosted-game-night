import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

/**
 * Helper to create a mock JWT with the given payload.
 * Produces a valid three-part token (header.payload.signature)
 * that the route handler can decode.
 */
function createMockJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
}

/**
 * Helper to create a NextRequest with JSON body for POST /api/auth/token
 */
function createTokenRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3001/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Dynamically import the route module after env vars are set.
 * This is necessary because the module reads env vars at load time
 * (CLIENT_ID, REDIRECT_URI, COOKIE_DOMAIN).
 */
async function importRoute() {
  const mod = await import('../route');
  return mod.POST;
}

describe('POST /api/auth/token', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_PLATFORM_HUB_URL', 'http://localhost:3002');
    vi.stubEnv('NEXT_PUBLIC_OAUTH_CLIENT_ID', 'test-client-id');
    vi.stubEnv('NEXT_PUBLIC_OAUTH_REDIRECT_URI', 'http://localhost:3001/auth/callback');
    vi.stubEnv('NODE_ENV', 'test');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('returns 400 when code is missing', async () => {
    const POST = await importRoute();
    const request = createTokenRequest({ codeVerifier: 'some-verifier' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required parameters');
  });

  it('returns 400 when codeVerifier is missing', async () => {
    const POST = await importRoute();
    const request = createTokenRequest({ code: 'some-code' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Missing required parameters');
  });

  it('returns error when Platform Hub token exchange fails', async () => {
    const POST = await importRoute();
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Authorization code expired',
      }),
    });

    const request = createTokenRequest({
      code: 'expired-code',
      codeVerifier: 'some-verifier',
    });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Authorization code expired');
  });

  it('sets auth cookies on the response after successful token exchange', async () => {
    const POST = await importRoute();
    const mockAccessToken = createMockJwt({
      sub: 'user-123',
      email: 'test@example.com',
      aud: 'authenticated',
      iss: 'http://localhost:3002',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: mockAccessToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
      }),
    });

    const request = createTokenRequest({
      code: 'valid-code',
      codeVerifier: 'valid-verifier',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);

    // Verify response body
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.id).toBe('user-123');
    expect(data.user.email).toBe('test@example.com');

    // CRITICAL: Verify Set-Cookie headers are present on the response.
    // This is the core bug fix -- cookies must be set on the NextResponse
    // object, not via cookies() from next/headers.
    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders.length).toBeGreaterThanOrEqual(3);

    // Verify access token cookie
    const accessTokenCookie = setCookieHeaders.find((c: string) => c.startsWith('jb_access_token='));
    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie).toContain('HttpOnly');
    expect(accessTokenCookie).toContain('Path=/');
    // Next.js may serialize SameSite with varying case
    expect(accessTokenCookie!.toLowerCase()).toContain('samesite=lax');

    // Verify refresh token cookie
    const refreshTokenCookie = setCookieHeaders.find((c: string) => c.startsWith('jb_refresh_token='));
    expect(refreshTokenCookie).toBeDefined();
    expect(refreshTokenCookie).toContain('mock-refresh-token');
    expect(refreshTokenCookie).toContain('HttpOnly');

    // Verify user ID cookie (not httpOnly - client needs to read it)
    const userIdCookie = setCookieHeaders.find((c: string) => c.startsWith('jb_user_id='));
    expect(userIdCookie).toBeDefined();
    expect(userIdCookie).toContain('user-123');
    expect(userIdCookie).not.toContain('HttpOnly');
  });

  it('sets secure flag on cookies in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const POST = await importRoute();

    const mockAccessToken = createMockJwt({
      sub: 'user-456',
      aud: 'authenticated',
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: mockAccessToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh-token',
      }),
    });

    const request = createTokenRequest({
      code: 'valid-code',
      codeVerifier: 'valid-verifier',
    });

    const response = await POST(request);
    const setCookieHeaders = response.headers.getSetCookie();

    const accessTokenCookie = setCookieHeaders.find((c: string) => c.startsWith('jb_access_token='));
    expect(accessTokenCookie).toContain('Secure');
  });

  it('handles E2E tokens (prefixed with "e2e-")', async () => {
    const POST = await importRoute();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'e2e-test-token-abc',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'e2e-refresh-token',
      }),
    });

    const request = createTokenRequest({
      code: 'e2e-code',
      codeVerifier: 'e2e-verifier',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.id).toBe('e2e-user');

    // Verify cookies still set for E2E tokens
    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders.find((c: string) => c.startsWith('jb_access_token='))).toBeDefined();
    expect(setCookieHeaders.find((c: string) => c.startsWith('jb_user_id='))).toContain('e2e-user');
  });

  it('skips refresh token cookie when refresh_token is absent', async () => {
    const POST = await importRoute();
    const mockAccessToken = createMockJwt({ sub: 'user-789' });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: mockAccessToken,
        token_type: 'bearer',
        expires_in: 3600,
        // No refresh_token
      }),
    });

    const request = createTokenRequest({
      code: 'valid-code',
      codeVerifier: 'valid-verifier',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const setCookieHeaders = response.headers.getSetCookie();

    // Should have access_token and user_id but NOT refresh_token
    expect(setCookieHeaders.find((c: string) => c.startsWith('jb_access_token='))).toBeDefined();
    expect(setCookieHeaders.find((c: string) => c.startsWith('jb_user_id='))).toBeDefined();
    expect(setCookieHeaders.find((c: string) => c.startsWith('jb_refresh_token='))).toBeUndefined();
  });

  it('sends correct parameters to Platform Hub token endpoint', async () => {
    const POST = await importRoute();
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: createMockJwt({ sub: 'user' }),
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh',
      }),
    });
    global.fetch = mockFetch;

    const request = createTokenRequest({
      code: 'auth-code-xyz',
      codeVerifier: 'verifier-abc',
    });
    await POST(request);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3002/api/oauth/token');
    expect(options.method).toBe('POST');

    const sentBody = JSON.parse(options.body);
    expect(sentBody.grant_type).toBe('authorization_code');
    expect(sentBody.code).toBe('auth-code-xyz');
    expect(sentBody.code_verifier).toBe('verifier-abc');
    expect(sentBody.client_id).toBe('test-client-id');
    expect(sentBody.redirect_uri).toBe('http://localhost:3001/auth/callback');
  });

  it('returns 500 on unexpected errors', async () => {
    const POST = await importRoute();
    global.fetch = vi.fn().mockRejectedValue(new Error('Network failure'));

    const request = createTokenRequest({
      code: 'code',
      codeVerifier: 'verifier',
    });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });

  it('handles malformed JWT gracefully (falls back to unknown user)', async () => {
    const POST = await importRoute();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'not.a-valid.jwt',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh',
      }),
    });

    const request = createTokenRequest({
      code: 'code',
      codeVerifier: 'verifier',
    });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user.id).toBe('unknown');

    // Cookies should still be set even with unknown user
    const setCookieHeaders = response.headers.getSetCookie();
    expect(setCookieHeaders.find((c: string) => c.startsWith('jb_access_token='))).toBeDefined();
  });

  it('includes COOKIE_DOMAIN in cookies when env var is set', async () => {
    vi.stubEnv('COOKIE_DOMAIN', '.joolie-boolie.com');
    const POST = await importRoute();

    const mockAccessToken = createMockJwt({ sub: 'user-domain' });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: mockAccessToken,
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'refresh',
      }),
    });

    const request = createTokenRequest({
      code: 'code',
      codeVerifier: 'verifier',
    });
    const response = await POST(request);
    const setCookieHeaders = response.headers.getSetCookie();

    const accessTokenCookie = setCookieHeaders.find((c: string) => c.startsWith('jb_access_token='));
    expect(accessTokenCookie).toContain('Domain=.joolie-boolie.com');
  });
});
