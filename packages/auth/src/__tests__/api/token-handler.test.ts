/**
 * Token Handler Factory Tests
 *
 * Tests for createTokenHandler()
 * Covers: parameter validation, upstream error forwarding, malformed response
 * detection (bug fix), JWT cookie setting, E2E token handling, error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createTokenHandler, type TokenHandlerConfig } from '../../api/token-handler';

// --- Helpers ---

const DEFAULT_CONFIG: TokenHandlerConfig = {
  platformHubUrl: 'http://localhost:3002',
  clientId: 'test-client',
  redirectUri: 'http://localhost:3000/callback',
};

function createMockFetchResponse(body: unknown, status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function createMockRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * Build a fake JWT with the given payload.
 * Format: header.base64url(payload).signature
 */
function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

function buildTokenResponse(overrides: Record<string, unknown> = {}) {
  return {
    access_token: buildFakeJwt({ sub: 'user-123', email: 'test@example.com' }),
    token_type: 'Bearer',
    expires_in: 3600,
    refresh_token: 'refresh-token-abc',
    ...overrides,
  };
}

// --- Test Suite ---

describe('createTokenHandler', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // --- Parameter Validation ---

  describe('parameter validation', () => {
    it('should return 400 when code is missing', async () => {
      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ codeVerifier: 'verifier-123' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters');
    });

    it('should return 400 when codeVerifier is missing', async () => {
      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'auth-code-123' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters');
    });

    it('should return 400 when both code and codeVerifier are missing', async () => {
      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({});

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing required parameters');
    });

  });

  // --- Upstream Token Exchange - Error Responses ---

  describe('upstream token exchange - error responses', () => {
    it('should forward upstream error status and error_description', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse(
          { error: 'invalid_grant', error_description: 'Authorization code expired' },
          400
        )
      );

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'expired-code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Authorization code expired');
    });

    it('should use fallback message when error_description is absent', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse({ error: 'server_error' }, 500)
      );

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Token exchange failed');
    });

    it('should forward the exact upstream HTTP status code', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse(
          { error: 'unauthorized_client', error_description: 'Client not authorized' },
          403
        )
      );

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);

      expect(response.status).toBe(403);
    });
  });

  // --- Upstream Token Exchange - Malformed Response (BUG FIX) ---

  describe('upstream token exchange - malformed response (BUG FIX)', () => {
    it('should return 502 when upstream 200 response is missing access_token', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse(
          { token_type: 'Bearer', expires_in: 3600, refresh_token: 'rt' },
          200
        )
      );

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toBe('Malformed token response from authorization server');
    });

    it('should return 502 when upstream 200 response has non-numeric expires_in', async () => {
      mockFetch.mockResolvedValue(
        createMockFetchResponse(
          { access_token: 'some-token', token_type: 'Bearer', expires_in: 'not-a-number', refresh_token: 'rt' },
          200
        )
      );

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toBe('Malformed token response from authorization server');
    });

    it('should return 502 when upstream 200 response is empty object', async () => {
      mockFetch.mockResolvedValue(createMockFetchResponse({}, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error).toBe('Malformed token response from authorization server');
    });
  });

  // --- Successful Token Exchange - JWT Access Token ---

  describe('successful token exchange - JWT access token', () => {
    it('should set jb_access_token cookie with token value and correct maxAge', async () => {
      const tokens = buildTokenResponse({ expires_in: 7200 });
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const accessCookie = response.cookies.get('jb_access_token');

      expect(accessCookie).toBeDefined();
      expect(accessCookie!.value).toBe(tokens.access_token);
      // Verify maxAge via Set-Cookie header (cookies.get() doesn't expose options)
      const setCookieHeaders = response.headers.getSetCookie();
      const accessHeader = setCookieHeaders.find((h: string) => h.startsWith('jb_access_token='));
      expect(accessHeader).toContain('Max-Age=7200');
    });

    it('should set jb_refresh_token cookie with 30-day maxAge', async () => {
      const tokens = buildTokenResponse();
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const refreshCookie = response.cookies.get('jb_refresh_token');

      expect(refreshCookie).toBeDefined();
      expect(refreshCookie!.value).toBe('refresh-token-abc');

      const setCookieHeaders = response.headers.getSetCookie();
      const refreshHeader = setCookieHeaders.find((h: string) => h.startsWith('jb_refresh_token='));
      const thirtyDays = 30 * 24 * 60 * 60;
      expect(refreshHeader).toContain(`Max-Age=${thirtyDays}`);
    });

    it('should set jb_user_id cookie as non-httpOnly with user sub from JWT', async () => {
      const tokens = buildTokenResponse();
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const userIdCookie = response.cookies.get('jb_user_id');

      expect(userIdCookie).toBeDefined();
      expect(userIdCookie!.value).toBe('user-123');

      // Verify non-httpOnly: the Set-Cookie header should NOT contain HttpOnly
      const setCookieHeaders = response.headers.getSetCookie();
      const userIdHeader = setCookieHeaders.find((h: string) => h.startsWith('jb_user_id='));
      expect(userIdHeader).toBeDefined();
      expect(userIdHeader).not.toContain('HttpOnly');
    });

    it('should return success response with userId and email from JWT payload', async () => {
      const tokens = buildTokenResponse();
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      });
    });

    it('should handle JWT without email claim', async () => {
      const tokens = buildTokenResponse({
        access_token: buildFakeJwt({ sub: 'user-456' }),
      });
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(data.user.id).toBe('user-456');
      expect(data.user.email).toBeUndefined();
    });

    it('should handle JWT without sub claim', async () => {
      const tokens = buildTokenResponse({
        access_token: buildFakeJwt({ email: 'no-sub@example.com' }),
      });
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(data.user.id).toBe('unknown');
      expect(data.user.email).toBe('no-sub@example.com');
    });

    it('should return 200 and userId "unknown" when access token is not a valid JWT', async () => {
      // Use a token with no dots — this triggers the catch block in JWT decode
      // because split('.')[1] is undefined, causing Buffer.from() to throw
      const tokens = buildTokenResponse({
        access_token: 'not-a-valid-jwt-no-dots',
      });
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.id).toBe('unknown');
    });

    it('should set cookieDomain on all cookies when config.cookieDomain is provided', async () => {
      const tokens = buildTokenResponse();
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const config: TokenHandlerConfig = {
        ...DEFAULT_CONFIG,
        cookieDomain: '.joolie-boolie.com',
      };
      const handler = createTokenHandler(config);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const setCookieHeaders = response.headers.getSetCookie();

      for (const header of setCookieHeaders) {
        expect(header).toContain('Domain=.joolie-boolie.com');
      }
    });

    it('should NOT set cookieDomain when config.cookieDomain is undefined', async () => {
      const tokens = buildTokenResponse();
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const setCookieHeaders = response.headers.getSetCookie();

      for (const header of setCookieHeaders) {
        expect(header).not.toContain('Domain=');
      }
    });
  });

  // --- Successful Token Exchange - E2E Access Token ---

  describe('successful token exchange - E2E access token', () => {
    it('should set userId to "e2e-user" for tokens starting with "e2e-"', async () => {
      const tokens = buildTokenResponse({
        access_token: 'e2e-test-token-abc',
      });
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(data.user.id).toBe('e2e-user');

      const userIdCookie = response.cookies.get('jb_user_id');
      expect(userIdCookie!.value).toBe('e2e-user');
    });

    it('should omit jb_refresh_token cookie when refresh_token is absent/empty', async () => {
      const tokens = buildTokenResponse({
        access_token: 'e2e-token-no-refresh',
        refresh_token: '',
      });
      mockFetch.mockResolvedValue(createMockFetchResponse(tokens, 200));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const refreshCookie = response.cookies.get('jb_refresh_token');

      expect(refreshCookie).toBeUndefined();

      // Should still have access_token and user_id cookies
      expect(response.cookies.get('jb_access_token')).toBeDefined();
      expect(response.cookies.get('jb_user_id')).toBeDefined();
    });
  });

  // --- Error Handling ---

  describe('error handling', () => {
    it('should return 500 when request.json() throws', async () => {
      const handler = createTokenHandler(DEFAULT_CONFIG);
      // Create a request with invalid JSON body
      const request = new NextRequest('http://localhost:3000/api/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json',
      });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return 500 when fetch() throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network unreachable'));

      const handler = createTokenHandler(DEFAULT_CONFIG);
      const request = createMockRequest({ code: 'code', codeVerifier: 'verifier' });

      const response = await handler(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
