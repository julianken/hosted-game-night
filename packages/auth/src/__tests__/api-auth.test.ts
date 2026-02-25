/**
 * Tests for API route authentication utilities
 *
 * Tests the JWT verification chain and authenticated Supabase client creation.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SignJWT } from 'jose';
import { getApiUser, createAuthenticatedClient } from '../api-auth';

// Test secrets
const E2E_SECRET_STRING = 'e2e-test-secret-key-that-is-at-least-32-characters-long';
const E2E_SECRET = new TextEncoder().encode(E2E_SECRET_STRING);
const SUPABASE_JWT_SECRET = 'test-supabase-jwt-secret-at-least-32-chars';
const SESSION_TOKEN_SECRET = 'test-session-token-secret-at-least-32-chars';
const SUPABASE_URL = 'https://test-project.supabase.co';

/**
 * Helper to create a signed JWT for testing
 */
async function createTestToken(options: {
  sub: string;
  email: string;
  iss: string;
  aud: string;
  secret: Uint8Array;
  expiresInSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresInSeconds ?? 3600;

  return new SignJWT({
    sub: options.sub,
    email: options.email,
    role: 'authenticated',
    aud: options.aud,
    iss: options.iss,
    app_metadata: { provider: 'email', providers: ['email'] },
    user_metadata: { email: options.email },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(options.secret);
}

/**
 * Helper to create a mock request with cookies
 */
function createMockRequest(accessToken?: string) {
  return {
    cookies: {
      get: (name: string) => {
        if (name === 'jb_access_token' && accessToken) {
          return { value: accessToken };
        }
        return undefined;
      },
    },
  };
}

describe('getApiUser', () => {
  beforeEach(() => {
    // Clear all env vars
    delete process.env.E2E_TESTING;
    delete process.env.E2E_JWT_SECRET;
    delete process.env.SUPABASE_JWT_SECRET;
    delete process.env.SESSION_TOKEN_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  afterEach(() => {
    delete process.env.E2E_TESTING;
    delete process.env.E2E_JWT_SECRET;
    delete process.env.SUPABASE_JWT_SECRET;
    delete process.env.SESSION_TOKEN_SECRET;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  });

  it('returns null when no access token cookie is present', async () => {
    const request = createMockRequest();
    const user = await getApiUser(request);
    expect(user).toBeNull();
  });

  it('returns null when token is an empty string', async () => {
    const request = {
      cookies: {
        get: (name: string) => {
          if (name === 'jb_access_token') return { value: '' };
          return undefined;
        },
      },
    };
    // '' is falsy, so getApiUser returns null
    const user = await getApiUser(request);
    expect(user).toBeNull();
  });

  it('returns null when token is invalid and no secrets are configured', async () => {
    const request = createMockRequest('invalid-token');
    const user = await getApiUser(request);
    expect(user).toBeNull();
  });

  describe('E2E mode verification', () => {
    beforeEach(() => {
      process.env.E2E_TESTING = 'true';
      process.env.E2E_JWT_SECRET = E2E_SECRET_STRING;
    });

    it('accepts E2E token when E2E_TESTING is enabled', async () => {
      const token = await createTestToken({
        sub: 'e2e-user-123',
        email: 'e2e@test.com',
        iss: 'e2e-test',
        aud: 'authenticated',
        secret: E2E_SECRET,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);

      expect(user).not.toBeNull();
      expect(user!.id).toBe('e2e-user-123');
      expect(user!.email).toBe('e2e@test.com');
    });

    it('returns cookieless bypass user when no token and E2E mode is active', async () => {
      // When E2E_TESTING=true and no cookie is present, getApiUser returns
      // a hardcoded test user to support browser-based local dev without OAuth
      const request = createMockRequest(); // no token
      const user = await getApiUser(request);

      expect(user).not.toBeNull();
      expect(user!.id).toBe('00000000-0000-4000-a000-000000000e2e');
      expect(user!.email).toBe('e2e-test@joolie-boolie.test');
    });

    it('rejects E2E token when E2E_TESTING is disabled', async () => {
      process.env.E2E_TESTING = 'false';

      const token = await createTestToken({
        sub: 'e2e-user-123',
        email: 'e2e@test.com',
        iss: 'e2e-test',
        aud: 'authenticated',
        secret: E2E_SECRET,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);
      expect(user).toBeNull();
    });

    it('rejects E2E token when E2E_TESTING env var is unset', async () => {
      delete process.env.E2E_TESTING;

      const token = await createTestToken({
        sub: 'e2e-user-123',
        email: 'e2e@test.com',
        iss: 'e2e-test',
        aud: 'authenticated',
        secret: E2E_SECRET,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);
      expect(user).toBeNull();
    });

    it('falls through to HS256 when E2E token is invalid', async () => {
      // Sign token with a DIFFERENT secret (bad signature for E2E step)
      // but configure SUPABASE_JWT_SECRET so HS256 step can succeed
      process.env.SUPABASE_JWT_SECRET = SUPABASE_JWT_SECRET;
      process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;

      const supabaseSecret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
      const token = await createTestToken({
        sub: 'fallthrough-user',
        email: 'fallthrough@example.com',
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret: supabaseSecret,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);

      // E2E verification fails (wrong secret), chain continues to HS256 which succeeds
      expect(user).not.toBeNull();
      expect(user!.id).toBe('fallthrough-user');
      expect(user!.email).toBe('fallthrough@example.com');
    });
  });

  describe('SUPABASE_JWT_SECRET verification', () => {
    beforeEach(() => {
      process.env.SUPABASE_JWT_SECRET = SUPABASE_JWT_SECRET;
      process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    });

    it('verifies tokens signed with SUPABASE_JWT_SECRET', async () => {
      const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
      const token = await createTestToken({
        sub: 'user-456',
        email: 'user@example.com',
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);

      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-456');
      expect(user!.email).toBe('user@example.com');
    });

    it('rejects tokens with wrong issuer', async () => {
      const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
      const token = await createTestToken({
        sub: 'user-456',
        email: 'user@example.com',
        iss: 'wrong-issuer',
        aud: 'authenticated',
        secret,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);
      expect(user).toBeNull();
    });

    it('rejects expired tokens', async () => {
      const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
      const token = await createTestToken({
        sub: 'user-456',
        email: 'user@example.com',
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret,
        expiresInSeconds: -60, // Already expired
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);
      expect(user).toBeNull();
    });
  });

  describe('SESSION_TOKEN_SECRET verification (backward compat)', () => {
    beforeEach(() => {
      process.env.SESSION_TOKEN_SECRET = SESSION_TOKEN_SECRET;
    });

    it('verifies tokens signed with SESSION_TOKEN_SECRET', async () => {
      const secret = new TextEncoder().encode(SESSION_TOKEN_SECRET);
      const token = await createTestToken({
        sub: 'user-789',
        email: 'legacy@example.com',
        iss: 'joolie-boolie-platform',
        aud: 'authenticated',
        secret,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);

      expect(user).not.toBeNull();
      expect(user!.id).toBe('user-789');
      expect(user!.email).toBe('legacy@example.com');
    });
  });

  describe('verification chain order (4-step: E2E -> HS256-Supabase -> HS256-Session -> JWKS)', () => {
    it('tries E2E first, then SUPABASE_JWT_SECRET, then SESSION_TOKEN_SECRET, then JWKS', async () => {
      // Set up all three secrets
      process.env.E2E_TESTING = 'true';
      process.env.E2E_JWT_SECRET = E2E_SECRET_STRING;
      process.env.SUPABASE_JWT_SECRET = SUPABASE_JWT_SECRET;
      process.env.SESSION_TOKEN_SECRET = SESSION_TOKEN_SECRET;
      process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;

      // Create a token signed with E2E secret - should be verified first
      const token = await createTestToken({
        sub: 'e2e-user',
        email: 'e2e@test.com',
        iss: 'e2e-test',
        aud: 'authenticated',
        secret: E2E_SECRET,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);

      expect(user).not.toBeNull();
      expect(user!.id).toBe('e2e-user');
    });

    it('falls through to SUPABASE_JWT_SECRET when E2E fails', async () => {
      process.env.E2E_TESTING = 'true';
      process.env.E2E_JWT_SECRET = E2E_SECRET_STRING;
      process.env.SUPABASE_JWT_SECRET = SUPABASE_JWT_SECRET;
      process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;

      // Create a token signed with SUPABASE_JWT_SECRET (not E2E)
      const secret = new TextEncoder().encode(SUPABASE_JWT_SECRET);
      const token = await createTestToken({
        sub: 'prod-user',
        email: 'prod@example.com',
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);

      expect(user).not.toBeNull();
      expect(user!.id).toBe('prod-user');
    });

    it('falls through to SESSION_TOKEN_SECRET when others fail', async () => {
      process.env.E2E_TESTING = 'true';
      process.env.E2E_JWT_SECRET = E2E_SECRET_STRING;
      process.env.SUPABASE_JWT_SECRET = SUPABASE_JWT_SECRET;
      process.env.SESSION_TOKEN_SECRET = SESSION_TOKEN_SECRET;
      process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;

      // Create a token signed with SESSION_TOKEN_SECRET (not E2E or SUPABASE)
      const secret = new TextEncoder().encode(SESSION_TOKEN_SECRET);
      const token = await createTestToken({
        sub: 'legacy-user',
        email: 'legacy@example.com',
        iss: 'joolie-boolie-platform',
        aud: 'authenticated',
        secret,
      });

      const request = createMockRequest(token);
      const user = await getApiUser(request);

      expect(user).not.toBeNull();
      expect(user!.id).toBe('legacy-user');
    });
  });

  it('returns user with empty email when email claim is missing', async () => {
    process.env.SESSION_TOKEN_SECRET = SESSION_TOKEN_SECRET;
    const secret = new TextEncoder().encode(SESSION_TOKEN_SECRET);

    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      sub: 'no-email-user',
      role: 'authenticated',
      aud: 'authenticated',
      iss: 'joolie-boolie-platform',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(secret);

    const request = createMockRequest(token);
    const user = await getApiUser(request);

    expect(user).not.toBeNull();
    expect(user!.id).toBe('no-email-user');
    expect(user!.email).toBe('');
  });

  it('returns null when token has no sub claim', async () => {
    process.env.SESSION_TOKEN_SECRET = SESSION_TOKEN_SECRET;
    const secret = new TextEncoder().encode(SESSION_TOKEN_SECRET);

    const now = Math.floor(Date.now() / 1000);
    const token = await new SignJWT({
      email: 'nosub@test.com',
      role: 'authenticated',
      aud: 'authenticated',
      iss: 'joolie-boolie-platform',
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(secret);

    const request = createMockRequest(token);
    const user = await getApiUser(request);

    // No sub claim = continue to next in chain, all fail = null
    expect(user).toBeNull();
  });
});

describe('createAuthenticatedClient', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-for-testing';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('creates a Supabase client with service role key', () => {
    const client = createAuthenticatedClient();

    expect(client).toBeDefined();
    expect(client.from).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('throws when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => createAuthenticatedClient()).toThrow(
      'Missing required environment variables'
    );
  });

  it('throws when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    expect(() => createAuthenticatedClient()).toThrow(
      'Missing required environment variables'
    );
  });
});
