/**
 * Tests for the unified JWT verification chain (verify-token.ts)
 *
 * Uses real jose JWT signing (NOT mocked) to test the 4-step chain:
 * 1. E2E secret       (HS256, only when E2E_TESTING=true)
 * 2. SUPABASE_JWT_SECRET  (HS256)
 * 3. SESSION_TOKEN_SECRET (HS256)
 * 4. Supabase JWKS        (ES256)
 *
 * Also includes a regression test for the API routes 401 bug: an ES256 token
 * (from Supabase SSO) that fails the 3-step HS256-only chain but succeeds
 * when the JWKS step is present.
 *
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SignJWT, generateKeyPair, createRemoteJWKSet } from 'jose';
import { verifyToken, createJwksGetter } from '../verify-token';

// ────────────────────────────────────────────────────────────────────────────
// Test constants
// ────────────────────────────────────────────────────────────────────────────

const E2E_SECRET = 'e2e-test-secret-key-that-is-at-least-32-characters-long';
const SUPABASE_JWT_SECRET = 'test-supabase-jwt-secret-at-least-32-chars';
const SESSION_TOKEN_SECRET = 'test-session-token-secret-at-least-32-chars';
const WRONG_SECRET = 'wrong-secret-that-is-totally-different-32-chars';
const SUPABASE_URL = 'https://test-project.supabase.co';

// ────────────────────────────────────────────────────────────────────────────
// Token helpers
// ────────────────────────────────────────────────────────────────────────────

async function createHS256Token(options: {
  sub?: string;
  email?: string;
  iss: string;
  aud: string;
  secret: string;
  expiresInSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresInSeconds ?? 3600;
  const secretBytes = new TextEncoder().encode(options.secret);

  return new SignJWT({
    sub: options.sub ?? 'test-user-id',
    email: options.email ?? 'test@example.com',
    role: 'authenticated',
    aud: options.aud,
    iss: options.iss,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(secretBytes);
}

async function createES256Token(options: {
  sub?: string;
  email?: string;
  iss: string;
  aud: string;
  privateKey: CryptoKey;
  expiresInSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options.expiresInSeconds ?? 3600;

  return new SignJWT({
    sub: options.sub ?? 'test-user-id',
    email: options.email ?? 'test@example.com',
    role: 'authenticated',
    aud: options.aud,
    iss: options.iss,
  })
    .setProtectedHeader({ alg: 'ES256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + expiresIn)
    .sign(options.privateKey);
}

/**
 * Create a mock JWKS getter that resolves to a local public key.
 * Matches the return type of `createRemoteJWKSet`.
 */
function createMockJWKS(publicKey: CryptoKey) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (async () => publicKey) as any as ReturnType<typeof createRemoteJWKSet>;
}

function createFailingJWKS() {
  return (async () => {
    throw new Error('JWKS endpoint unreachable');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any as ReturnType<typeof createRemoteJWKSet>;
}

// ────────────────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────────────────

describe('verifyToken', () => {
  let es256PrivateKey: CryptoKey;
  let es256PublicKey: CryptoKey;
  let wrongES256PrivateKey: CryptoKey;
  let mockJWKS: ReturnType<typeof createRemoteJWKSet>;
  let failingJWKS: ReturnType<typeof createRemoteJWKSet>;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('ES256');
    es256PrivateKey = keyPair.privateKey;
    es256PublicKey = keyPair.publicKey;

    const wrongKeyPair = await generateKeyPair('ES256');
    wrongES256PrivateKey = wrongKeyPair.privateKey;
  });

  beforeEach(() => {
    delete process.env.E2E_TESTING;
    mockJWKS = createMockJWKS(es256PublicKey);
    failingJWKS = createFailingJWKS();
  });

  afterEach(() => {
    delete process.env.E2E_TESTING;
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────────────────────────────
  // Step 1: E2E
  // ──────────────────────────────────────────────────────────────────────

  describe('Step 1: E2E secret', () => {
    beforeEach(() => {
      process.env.E2E_TESTING = 'true';
    });

    it('accepts a valid E2E token', async () => {
      const token = await createHS256Token({
        iss: 'e2e-test',
        aud: 'authenticated',
        secret: E2E_SECRET,
      });

      const result = await verifyToken(token, { e2eSecret: E2E_SECRET });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.type).toBe('e2e');
        expect(result.payload.sub).toBe('test-user-id');
      }
    });

    it('skips E2E step when E2E_TESTING is not true', async () => {
      process.env.E2E_TESTING = 'false';

      const token = await createHS256Token({
        iss: 'e2e-test',
        aud: 'authenticated',
        secret: E2E_SECRET,
      });

      const result = await verifyToken(token, { e2eSecret: E2E_SECRET });
      expect(result.ok).toBe(false);
    });

    it('skips E2E step when e2eSecret is not provided', async () => {
      const token = await createHS256Token({
        iss: 'e2e-test',
        aud: 'authenticated',
        secret: E2E_SECRET,
      });

      const result = await verifyToken(token, {});
      expect(result.ok).toBe(false);
    });

    it('rejects E2E token with wrong secret', async () => {
      const token = await createHS256Token({
        iss: 'e2e-test',
        aud: 'authenticated',
        secret: WRONG_SECRET,
      });

      const result = await verifyToken(token, { e2eSecret: E2E_SECRET });
      expect(result.ok).toBe(false);
    });

    it('rejects expired E2E token', async () => {
      const token = await createHS256Token({
        iss: 'e2e-test',
        aud: 'authenticated',
        secret: E2E_SECRET,
        expiresInSeconds: -60,
      });

      const result = await verifyToken(token, { e2eSecret: E2E_SECRET });
      expect(result.ok).toBe(false);
    });

    it('falls through from E2E to HS256-Supabase on failure', async () => {
      const token = await createHS256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
      });

      const result = await verifyToken(token, {
        e2eSecret: E2E_SECRET,
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.type).toBe('hs256-supabase');
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Step 2: HS256-Supabase
  // ──────────────────────────────────────────────────────────────────────

  describe('Step 2: SUPABASE_JWT_SECRET (HS256)', () => {
    it('accepts valid token', async () => {
      const token = await createHS256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
      });

      const result = await verifyToken(token, {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.type).toBe('hs256-supabase');
        expect(result.payload.sub).toBe('test-user-id');
      }
    });

    it('rejects token with wrong issuer', async () => {
      const token = await createHS256Token({
        iss: 'wrong-issuer',
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
      });

      const result = await verifyToken(token, {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(false);
    });

    it('rejects expired token', async () => {
      const token = await createHS256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
        expiresInSeconds: -60,
      });

      const result = await verifyToken(token, {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(false);
    });

    it('skipped when supabaseJwtSecret not provided', async () => {
      const token = await createHS256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
      });

      const result = await verifyToken(token, { supabaseUrl: SUPABASE_URL });
      expect(result.ok).toBe(false);
    });

    it('skipped when supabaseUrl not provided', async () => {
      const token = await createHS256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
      });

      const result = await verifyToken(token, {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
      });

      expect(result.ok).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Step 3: HS256-Session
  // ──────────────────────────────────────────────────────────────────────

  describe('Step 3: SESSION_TOKEN_SECRET (HS256)', () => {
    it('accepts valid token', async () => {
      const token = await createHS256Token({
        iss: 'joolie-boolie-platform',
        aud: 'authenticated',
        secret: SESSION_TOKEN_SECRET,
      });

      const result = await verifyToken(token, {
        sessionTokenSecret: SESSION_TOKEN_SECRET,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.type).toBe('hs256-session');
        expect(result.payload.sub).toBe('test-user-id');
      }
    });

    it('rejects token with wrong issuer', async () => {
      const token = await createHS256Token({
        iss: 'wrong-platform',
        aud: 'authenticated',
        secret: SESSION_TOKEN_SECRET,
      });

      const result = await verifyToken(token, {
        sessionTokenSecret: SESSION_TOKEN_SECRET,
      });

      expect(result.ok).toBe(false);
    });

    it('rejects expired token', async () => {
      const token = await createHS256Token({
        iss: 'joolie-boolie-platform',
        aud: 'authenticated',
        secret: SESSION_TOKEN_SECRET,
        expiresInSeconds: -60,
      });

      const result = await verifyToken(token, {
        sessionTokenSecret: SESSION_TOKEN_SECRET,
      });

      expect(result.ok).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Step 4: JWKS (ES256)
  // ──────────────────────────────────────────────────────────────────────

  describe('Step 4: JWKS (ES256)', () => {
    it('accepts valid ES256 token via JWKS', async () => {
      const token = await createES256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        privateKey: es256PrivateKey,
      });

      const result = await verifyToken(token, {
        getJWKS: mockJWKS,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.type).toBe('jwks');
        expect(result.payload.sub).toBe('test-user-id');
      }
    });

    it('rejects ES256 token with wrong issuer', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const token = await createES256Token({
        iss: 'https://wrong.supabase.co/auth/v1',
        aud: 'authenticated',
        privateKey: es256PrivateKey,
      });

      const result = await verifyToken(token, {
        getJWKS: mockJWKS,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(false);
    });

    it('rejects ES256 token signed with wrong key', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const token = await createES256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        privateKey: wrongES256PrivateKey,
      });

      const result = await verifyToken(token, {
        getJWKS: mockJWKS,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(false);
    });

    it('returns ok: false when JWKS endpoint is unreachable', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const token = await createES256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        privateKey: es256PrivateKey,
      });

      const result = await verifyToken(token, {
        getJWKS: failingJWKS,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toBe('All verification methods exhausted');
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Full chain fallthrough
  // ──────────────────────────────────────────────────────────────────────

  describe('chain fallthrough', () => {
    it('falls through all 4 steps: E2E -> HS256-Supabase -> HS256-Session -> JWKS', async () => {
      process.env.E2E_TESTING = 'true';

      // ES256 token: fails steps 1-3, succeeds at step 4
      const token = await createES256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        privateKey: es256PrivateKey,
      });

      const result = await verifyToken(token, {
        e2eSecret: E2E_SECRET,
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        sessionTokenSecret: SESSION_TOKEN_SECRET,
        getJWKS: mockJWKS,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.type).toBe('jwks');
      }
    });

    it('stops at step 2 when HS256-Supabase matches', async () => {
      process.env.E2E_TESTING = 'true';

      const token = await createHS256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
      });

      const result = await verifyToken(token, {
        e2eSecret: E2E_SECRET,
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        sessionTokenSecret: SESSION_TOKEN_SECRET,
        getJWKS: failingJWKS,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.type).toBe('hs256-supabase');
      }
    });

    it('stops at step 3 when HS256-Session matches', async () => {
      process.env.E2E_TESTING = 'true';

      const token = await createHS256Token({
        iss: 'joolie-boolie-platform',
        aud: 'authenticated',
        secret: SESSION_TOKEN_SECRET,
      });

      const result = await verifyToken(token, {
        e2eSecret: E2E_SECRET,
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        sessionTokenSecret: SESSION_TOKEN_SECRET,
        getJWKS: failingJWKS,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.type).toBe('hs256-session');
      }
    });

    it('returns ok: false when all methods fail', async () => {
      process.env.E2E_TESTING = 'true';
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const token = await createHS256Token({
        iss: 'unknown-issuer',
        aud: 'authenticated',
        secret: WRONG_SECRET,
      });

      const result = await verifyToken(token, {
        e2eSecret: E2E_SECRET,
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        sessionTokenSecret: SESSION_TOKEN_SECRET,
        getJWKS: failingJWKS,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(false);
    });

    it('returns ok: false with empty config', async () => {
      const token = await createHS256Token({
        iss: 'any',
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
      });

      const result = await verifyToken(token, {});
      expect(result.ok).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // 401 bug regression test
  // ──────────────────────────────────────────────────────────────────────

  describe('401 bug regression: ES256 token in API routes', () => {
    it('ES256 token fails 3-step chain (no JWKS) -- the old bug', async () => {
      // Simulate the old api-auth.ts: no JWKS configured
      const token = await createES256Token({
        sub: 'real-user-uuid',
        email: 'user@example.com',
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        privateKey: es256PrivateKey,
      });

      // Old config: 3-step only (no getJWKS)
      const result = await verifyToken(token, {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        sessionTokenSecret: SESSION_TOKEN_SECRET,
        supabaseUrl: SUPABASE_URL,
        // getJWKS intentionally omitted -- this is the old bug
      });

      expect(result.ok).toBe(false);
    });

    it('ES256 token succeeds with 4-step chain (JWKS added) -- the fix', async () => {
      // Simulate the new api-auth.ts: JWKS configured
      const token = await createES256Token({
        sub: 'real-user-uuid',
        email: 'user@example.com',
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        privateKey: es256PrivateKey,
      });

      // New config: 4-step (with getJWKS)
      const result = await verifyToken(token, {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        sessionTokenSecret: SESSION_TOKEN_SECRET,
        getJWKS: mockJWKS,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.type).toBe('jwks');
        expect(result.payload.sub).toBe('real-user-uuid');
        expect(result.payload.email).toBe('user@example.com');
      }
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // Edge cases
  // ──────────────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('rejects completely invalid token string', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await verifyToken('not-a-jwt', {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        supabaseUrl: SUPABASE_URL,
        getJWKS: failingJWKS,
      });

      expect(result.ok).toBe(false);
    });

    it('rejects empty token string', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await verifyToken('', {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        supabaseUrl: SUPABASE_URL,
        getJWKS: failingJWKS,
      });

      expect(result.ok).toBe(false);
    });

    it('logs error only when JWKS step fails (the last step)', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Token that succeeds at step 2 -- should NOT trigger console.error
      const token = await createHS256Token({
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
      });

      await verifyToken(token, {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        supabaseUrl: SUPABASE_URL,
        getJWKS: failingJWKS,
      });

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('payload contains expected claims', async () => {
      const token = await createHS256Token({
        sub: 'user-abc-123',
        email: 'hello@world.com',
        iss: `${SUPABASE_URL}/auth/v1`,
        aud: 'authenticated',
        secret: SUPABASE_JWT_SECRET,
      });

      const result = await verifyToken(token, {
        supabaseJwtSecret: SUPABASE_JWT_SECRET,
        supabaseUrl: SUPABASE_URL,
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.payload.sub).toBe('user-abc-123');
        expect(result.payload.email).toBe('hello@world.com');
        expect(result.payload.role).toBe('authenticated');
      }
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// createJwksGetter tests
// ────────────────────────────────────────────────────────────────────────────

describe('createJwksGetter', () => {
  it('returns a function', () => {
    const getter = createJwksGetter(SUPABASE_URL);
    expect(typeof getter).toBe('function');
  });

  it('returns the same cached instance on repeated calls', () => {
    const getter = createJwksGetter(SUPABASE_URL);
    const jwks1 = getter();
    const jwks2 = getter();
    expect(jwks1).toBe(jwks2);
  });

  it('creates JWKS for the correct URL without throwing', () => {
    const getter = createJwksGetter(SUPABASE_URL);
    expect(() => getter()).not.toThrow();
  });
});
