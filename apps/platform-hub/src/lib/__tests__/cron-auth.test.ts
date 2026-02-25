/**
 * Cron Auth Tests
 *
 * Tests for the shared cron authentication helper, focusing on
 * fail-closed behavior when CRON_SECRET is not configured.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyCronAuth } from '../cron-auth';

// Mock the logger so tests don't produce noise
vi.mock('@joolie-boolie/error-tracking/server-logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

function makeRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader) {
    headers.set('authorization', authHeader);
  }
  return new Request('https://example.com/api/cron/test', { headers });
}

describe('verifyCronAuth', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  describe('fail-closed behavior', () => {
    it('rejects when CRON_SECRET is not set', () => {
      vi.stubEnv('CRON_SECRET', '');
      const result = verifyCronAuth(makeRequest('Bearer some-token'));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });

    it('rejects when CRON_SECRET is undefined', () => {
      delete process.env.CRON_SECRET;
      const result = verifyCronAuth(makeRequest('Bearer some-token'));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });
  });

  describe('with CRON_SECRET configured', () => {
    const SECRET = 'test-cron-secret-value';

    beforeEach(() => {
      vi.stubEnv('CRON_SECRET', SECRET);
    });

    it('returns null (authorized) for a valid Bearer token', () => {
      const result = verifyCronAuth(makeRequest(`Bearer ${SECRET}`));
      expect(result).toBeNull();
    });

    it('rejects when no authorization header is present', () => {
      const result = verifyCronAuth(makeRequest());
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });

    it('rejects when authorization header is not Bearer', () => {
      const result = verifyCronAuth(makeRequest(`Basic ${SECRET}`));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });

    it('rejects when token does not match', () => {
      const result = verifyCronAuth(makeRequest('Bearer wrong-secret'));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });

    it('rejects when authorization header is just "Bearer "', () => {
      const result = verifyCronAuth(makeRequest('Bearer '));
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });
  });
});
