import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import {
  validateOrigin,
  addCorsHeaders,
  handlePreflight,
  applyCors,
  getConfiguredOrigins,
} from '../cors';

describe('CORS Middleware', () => {
  const TEST_URL = 'http://localhost:3002/api/oauth/token';
  const VALID_ORIGIN = 'http://localhost:3000';
  const INVALID_ORIGIN = 'http://malicious-site.com';

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default allowed origins for tests
    process.env.CORS_ALLOWED_ORIGINS =
      'http://localhost:3000,http://localhost:3001,http://localhost:3002';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to create a mock NextRequest
   */
  function createMockRequest(
    url: string = TEST_URL,
    headers: Record<string, string> = {},
    method: string = 'POST'
  ): NextRequest {
    return new NextRequest(url, {
      method,
      headers: new Headers(headers),
    });
  }

  describe('validateOrigin', () => {
    it('should return null for same-origin requests (no Origin header)', () => {
      const request = createMockRequest();
      const result = validateOrigin(request);

      expect(result).toBeNull();
    });

    it('should return origin for requests from allowed origins', () => {
      const request = createMockRequest(TEST_URL, {
        origin: VALID_ORIGIN,
      });
      const result = validateOrigin(request);

      expect(result).toBe(VALID_ORIGIN);
    });

    it('should return null for requests from disallowed origins', () => {
      const request = createMockRequest(TEST_URL, {
        origin: INVALID_ORIGIN,
      });
      const result = validateOrigin(request);

      expect(result).toBeNull();
    });

    it('should validate all configured allowed origins', () => {
      const origins = [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
      ];

      origins.forEach((origin) => {
        const request = createMockRequest(TEST_URL, { origin });
        expect(validateOrigin(request)).toBe(origin);
      });
    });

    it('should log warning for unauthorized origins', () => {
      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});
      const request = createMockRequest(TEST_URL, {
        origin: INVALID_ORIGIN,
      });

      validateOrigin(request);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CORS]')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(INVALID_ORIGIN)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('addCorsHeaders', () => {
    it('should add CORS headers for cross-origin requests', () => {
      const response = NextResponse.json({ success: true });
      const result = addCorsHeaders(response, VALID_ORIGIN);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBe(
        VALID_ORIGIN
      );
      expect(result.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, OPTIONS'
      );
      expect(result.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type, Authorization'
      );
      expect(result.headers.get('Access-Control-Allow-Credentials')).toBe(
        'false'
      );
      expect(result.headers.get('Access-Control-Max-Age')).toBe('3600');
    });

    it('should not add CORS headers for same-origin requests', () => {
      const response = NextResponse.json({ success: true });
      const result = addCorsHeaders(response, null);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(result.headers.get('Access-Control-Allow-Methods')).toBeNull();
      expect(result.headers.get('Access-Control-Allow-Headers')).toBeNull();
    });

    it('should never allow credentials', () => {
      const response = NextResponse.json({ success: true });
      const result = addCorsHeaders(response, VALID_ORIGIN);

      expect(result.headers.get('Access-Control-Allow-Credentials')).toBe(
        'false'
      );
    });

    it('should cache preflight for 1 hour', () => {
      const response = NextResponse.json({ success: true });
      const result = addCorsHeaders(response, VALID_ORIGIN);

      expect(result.headers.get('Access-Control-Max-Age')).toBe('3600');
    });
  });

  describe('handlePreflight', () => {
    it('should return 204 No Content for OPTIONS requests', () => {
      const request = createMockRequest(TEST_URL, { origin: VALID_ORIGIN }, 'OPTIONS');
      const response = handlePreflight(request, VALID_ORIGIN);

      expect(response.status).toBe(204);
    });

    it('should include CORS headers in preflight response', () => {
      const request = createMockRequest(TEST_URL, { origin: VALID_ORIGIN }, 'OPTIONS');
      const response = handlePreflight(request, VALID_ORIGIN);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        VALID_ORIGIN
      );
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, OPTIONS'
      );
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type, Authorization'
      );
    });

    it('should handle same-origin preflight requests', () => {
      const request = createMockRequest(TEST_URL, {}, 'OPTIONS');
      const response = handlePreflight(request, null);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('applyCors', () => {
    it('should allow requests from valid origins', async () => {
      const request = createMockRequest(TEST_URL, {
        origin: VALID_ORIGIN,
      });

      const handler = vi.fn(() =>
        Promise.resolve(NextResponse.json({ success: true }))
      );

      const response = await applyCors(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        VALID_ORIGIN
      );
    });

    it('should block requests from invalid origins', async () => {
      const request = createMockRequest(TEST_URL, {
        origin: INVALID_ORIGIN,
      });

      const handler = vi.fn(() =>
        Promise.resolve(NextResponse.json({ success: true }))
      );

      const response = await applyCors(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);

      const body = await response.json();
      expect(body).toEqual({
        error: 'forbidden',
        error_description: 'Origin not allowed',
      });
    });

    it('should not add CORS headers to blocked responses', async () => {
      const request = createMockRequest(TEST_URL, {
        origin: INVALID_ORIGIN,
      });

      const handler = vi.fn(() =>
        Promise.resolve(NextResponse.json({ success: true }))
      );

      const response = await applyCors(request, handler);

      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('should handle preflight requests without calling handler', async () => {
      const request = createMockRequest(TEST_URL, {
        origin: VALID_ORIGIN,
      }, 'OPTIONS');

      const handler = vi.fn(() =>
        Promise.resolve(NextResponse.json({ success: true }))
      );

      const response = await applyCors(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        VALID_ORIGIN
      );
    });

    it('should allow same-origin requests', async () => {
      const request = createMockRequest(TEST_URL);

      const handler = vi.fn(() =>
        Promise.resolve(NextResponse.json({ success: true }))
      );

      const response = await applyCors(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('getConfiguredOrigins', () => {
    it('should return configured origins from environment variable', () => {
      process.env.CORS_ALLOWED_ORIGINS =
        'http://localhost:3000,http://localhost:3001';

      const origins = getConfiguredOrigins();

      expect(origins).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
      ]);
    });

    it('should fallback to localhost defaults when not configured', () => {
      delete process.env.CORS_ALLOWED_ORIGINS;

      const consoleWarnSpy = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => {});

      const origins = getConfiguredOrigins();

      expect(origins).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
      ]);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CORS]')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should trim whitespace from origins', () => {
      process.env.CORS_ALLOWED_ORIGINS =
        '  http://localhost:3000  ,  http://localhost:3001  ';

      const origins = getConfiguredOrigins();

      expect(origins).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
      ]);
    });

    it('should filter empty origins', () => {
      process.env.CORS_ALLOWED_ORIGINS =
        'http://localhost:3000,,http://localhost:3001,';

      const origins = getConfiguredOrigins();

      expect(origins).toEqual([
        'http://localhost:3000',
        'http://localhost:3001',
      ]);
    });
  });

  describe('Environment Configuration', () => {
    it('should reject wildcard origins in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = '*';

      // Wildcard "*" is not a valid URL, so it throws during URL parsing
      expect(() => getConfiguredOrigins()).toThrow(
        'Invalid origin in CORS_ALLOWED_ORIGINS'
      );

      process.env.NODE_ENV = 'test';
    });

    it('should reject origins with wildcard in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.CORS_ALLOWED_ORIGINS = 'http://*.example.com';

      expect(() => getConfiguredOrigins()).toThrow(
        'Wildcard origins not allowed in production'
      );

      process.env.NODE_ENV = 'test';
    });

    it('should reject origins with invalid protocols', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'ftp://localhost:3000';

      expect(() => getConfiguredOrigins()).toThrow('Invalid protocol: ftp:');
    });

    it('should reject malformed origins', () => {
      process.env.CORS_ALLOWED_ORIGINS = 'not-a-valid-url';

      expect(() => getConfiguredOrigins()).toThrow(
        'Invalid origin in CORS_ALLOWED_ORIGINS'
      );
    });

    it('should accept https origins', () => {
      process.env.CORS_ALLOWED_ORIGINS =
        'https://bingo.example.com,https://trivia.example.com';

      const origins = getConfiguredOrigins();

      expect(origins).toEqual([
        'https://bingo.example.com',
        'https://trivia.example.com',
      ]);
    });

    it('should accept http origins in development', () => {
      process.env.NODE_ENV = 'development';
      process.env.CORS_ALLOWED_ORIGINS =
        'http://localhost:3000,http://192.168.1.100:3000';

      const origins = getConfiguredOrigins();

      expect(origins).toEqual([
        'http://localhost:3000',
        'http://192.168.1.100:3000',
      ]);

      process.env.NODE_ENV = 'test';
    });
  });

  describe('Security Features', () => {
    it('should never allow credentials to prevent CSRF', () => {
      const response = NextResponse.json({ success: true });
      const result = addCorsHeaders(response, VALID_ORIGIN);

      expect(result.headers.get('Access-Control-Allow-Credentials')).toBe(
        'false'
      );
    });

    it('should only allow specific methods', () => {
      const response = NextResponse.json({ success: true });
      const result = addCorsHeaders(response, VALID_ORIGIN);

      const allowedMethods = result.headers.get('Access-Control-Allow-Methods');
      expect(allowedMethods).toBe('GET, POST, OPTIONS');
      expect(allowedMethods).not.toContain('PUT');
      expect(allowedMethods).not.toContain('DELETE');
      expect(allowedMethods).not.toContain('PATCH');
    });

    it('should only allow specific headers', () => {
      const response = NextResponse.json({ success: true });
      const result = addCorsHeaders(response, VALID_ORIGIN);

      const allowedHeaders = result.headers.get('Access-Control-Allow-Headers');
      expect(allowedHeaders).toBe('Content-Type, Authorization');
    });

    it('should set specific origin, not wildcard', () => {
      const response = NextResponse.json({ success: true });
      const result = addCorsHeaders(response, VALID_ORIGIN);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBe(
        VALID_ORIGIN
      );
      expect(result.headers.get('Access-Control-Allow-Origin')).not.toBe('*');
    });
  });

  describe('Edge Cases', () => {
    it('should handle POST requests with valid origin', async () => {
      const request = createMockRequest(
        TEST_URL,
        {
          origin: VALID_ORIGIN,
          'content-type': 'application/json',
        },
        'POST'
      );

      const handler = vi.fn(() =>
        Promise.resolve(NextResponse.json({ success: true }))
      );

      const response = await applyCors(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should handle GET requests with valid origin', async () => {
      const request = createMockRequest(
        TEST_URL,
        {
          origin: VALID_ORIGIN,
        },
        'GET'
      );

      const handler = vi.fn(() =>
        Promise.resolve(NextResponse.json({ data: [] }))
      );

      const response = await applyCors(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should preserve handler response status and body', async () => {
      const request = createMockRequest(TEST_URL, {
        origin: VALID_ORIGIN,
      });

      const handler = vi.fn(() =>
        Promise.resolve(
          NextResponse.json({ custom: 'data' }, { status: 201 })
        )
      );

      const response = await applyCors(request, handler);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body).toEqual({ custom: 'data' });
    });

    it('should handle errors from handler gracefully', async () => {
      const request = createMockRequest(TEST_URL, {
        origin: VALID_ORIGIN,
      });

      const handler = vi.fn(() =>
        Promise.resolve(
          NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
        )
      );

      const response = await applyCors(request, handler);

      expect(response.status).toBe(500);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        VALID_ORIGIN
      );
    });

    it('should handle synchronous handler functions', async () => {
      const request = createMockRequest(TEST_URL, {
        origin: VALID_ORIGIN,
      });

      const handler = vi.fn(() => NextResponse.json({ success: true }));

      const response = await applyCors(request, handler);

      expect(handler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle cross-app OAuth flow (Bingo -> Hub)', async () => {
      const bingoOrigin = 'http://localhost:3000';
      const request = createMockRequest(
        'http://localhost:3002/api/oauth/token',
        {
          origin: bingoOrigin,
          'content-type': 'application/x-www-form-urlencoded',
        },
        'POST'
      );

      const handler = vi.fn(() =>
        Promise.resolve(
          NextResponse.json({
            access_token: 'token123',
            token_type: 'Bearer',
          })
        )
      );

      const response = await applyCors(request, handler);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        bingoOrigin
      );
    });

    it('should handle cross-app OAuth flow (Trivia -> Hub)', async () => {
      const triviaOrigin = 'http://localhost:3001';
      const request = createMockRequest(
        'http://localhost:3002/api/oauth/token',
        {
          origin: triviaOrigin,
          'content-type': 'application/x-www-form-urlencoded',
        },
        'POST'
      );

      const handler = vi.fn(() =>
        Promise.resolve(
          NextResponse.json({
            access_token: 'token456',
            token_type: 'Bearer',
          })
        )
      );

      const response = await applyCors(request, handler);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
        triviaOrigin
      );
    });

    it('should block unauthorized app from accessing OAuth endpoints', async () => {
      const maliciousOrigin = 'http://evil.com';
      const request = createMockRequest(
        'http://localhost:3002/api/oauth/token',
        {
          origin: maliciousOrigin,
        },
        'POST'
      );

      const handler = vi.fn();

      const response = await applyCors(request, handler);

      expect(handler).not.toHaveBeenCalled();
      expect(response.status).toBe(403);
    });
  });
});
