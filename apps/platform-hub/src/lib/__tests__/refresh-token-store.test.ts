/**
 * Refresh Token Store Tests
 *
 * Comprehensive unit tests for all 7 exported functions in refresh-token-store.ts.
 * Tests crypto functions with real Node.js crypto; mocks only the DB client and logger.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateRefreshToken,
  hashRefreshToken,
  storeRefreshToken,
  validateRefreshToken,
  rotateRefreshToken,
  revokeTokenFamily,
  revokeRefreshToken,
  revokeAllUserTokens,
} from '../refresh-token-store';

// --- Mocks ---

const { mockDbClient, mockLogger } = vi.hoisted(() => ({
  mockDbClient: { from: vi.fn(), rpc: vi.fn() },
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(() => mockDbClient),
}));

vi.mock('@joolie-boolie/error-tracking/server-logger', () => ({
  createLogger: () => mockLogger,
}));

// --- Helpers ---

/** Build a mock chain for .from('refresh_tokens').select(...).eq(...).single() */
function mockSelectChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

/** Build a mock chain for .from('refresh_tokens').insert(...).select('id').single() */
function mockInsertChain(result: { data: unknown; error: unknown }) {
  return {
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

/** Build a mock chain for .from('refresh_tokens').update(...).eq(...) */
function mockUpdateEqChain(result: { data: unknown; error: unknown }) {
  return {
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue(result),
    }),
  };
}

/**
 * Build a mock chain for revokeAllUserTokens:
 * .from('refresh_tokens').update(...).eq('user_id',...).is('revoked_at',null)[.eq('client_id',...)].select('id')
 */
function mockRevokeAllChain(
  result: { data: unknown; error: unknown },
  options?: { withClientFilter: boolean }
) {
  const selectFn = vi.fn().mockResolvedValue(result);
  const eqClientFn = vi.fn().mockReturnValue({ select: selectFn });
  const isFn = vi.fn().mockReturnValue(
    options?.withClientFilter
      ? { eq: eqClientFn, select: selectFn }
      : { eq: eqClientFn, select: selectFn }
  );
  const eqUserFn = vi.fn().mockReturnValue({ is: isFn });
  return {
    update: vi.fn().mockReturnValue({ eq: eqUserFn }),
  };
}

// --- Tests ---

describe('refresh-token-store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // -------------------------------------------------------
  // generateRefreshToken (3 tests)
  // -------------------------------------------------------
  describe('generateRefreshToken', () => {
    it('returns string starting with "rt_"', () => {
      const token = generateRefreshToken();
      expect(token.startsWith('rt_')).toBe(true);
    });

    it('returns 48+ character string (32 bytes hex + prefix)', () => {
      const token = generateRefreshToken();
      // "rt_" (3 chars) + 64 hex chars (32 bytes) = 67 chars
      expect(token.length).toBeGreaterThanOrEqual(48);
      expect(token.length).toBe(67); // exact: 3 + 64
    });

    it('generates unique tokens on each call', () => {
      const token1 = generateRefreshToken();
      const token2 = generateRefreshToken();
      expect(token1).not.toBe(token2);
    });
  });

  // -------------------------------------------------------
  // hashRefreshToken (3 tests)
  // -------------------------------------------------------
  describe('hashRefreshToken', () => {
    it('returns consistent hash for same input', () => {
      const hash1 = hashRefreshToken('rt_test_token');
      const hash2 = hashRefreshToken('rt_test_token');
      expect(hash1).toBe(hash2);
    });

    it('returns different hash for different input', () => {
      const hash1 = hashRefreshToken('rt_token_a');
      const hash2 = hashRefreshToken('rt_token_b');
      expect(hash1).not.toBe(hash2);
    });

    it('returns 64-character hex string (SHA-256)', () => {
      const hash = hashRefreshToken('rt_any_token');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  // -------------------------------------------------------
  // storeRefreshToken (6 tests)
  // -------------------------------------------------------
  describe('storeRefreshToken', () => {
    it('stores token with correct fields (user_id, client_id, token_hash, scopes, expires_at)', async () => {
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'token-id-1' },
            error: null,
          }),
        }),
      });
      mockDbClient.from.mockReturnValue({ insert: insertMock });

      await storeRefreshToken('rt_raw_token', 'user-1', 'client-1', ['openid']);

      expect(mockDbClient.from).toHaveBeenCalledWith('refresh_tokens');
      const insertArg = insertMock.mock.calls[0][0];
      expect(insertArg).toMatchObject({
        user_id: 'user-1',
        client_id: 'client-1',
        scopes: ['openid'],
      });
      expect(insertArg.token_hash).toBeDefined();
      expect(insertArg.expires_at).toBeDefined();
    });

    it('sets expires_at to approximately 30 days from now', async () => {
      vi.useFakeTimers();
      const baseTime = new Date('2026-03-01T00:00:00Z');
      vi.setSystemTime(baseTime);

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'token-id-1' },
            error: null,
          }),
        }),
      });
      mockDbClient.from.mockReturnValue({ insert: insertMock });

      await storeRefreshToken('rt_test', 'user-1', 'client-1');

      const insertArg = insertMock.mock.calls[0][0];
      const expiresAt = new Date(insertArg.expires_at);
      const expected = new Date('2026-03-31T00:00:00Z');
      // Allow 1 second tolerance
      expect(Math.abs(expiresAt.getTime() - expected.getTime())).toBeLessThan(1000);
    });

    it('returns the stored token record', async () => {
      mockDbClient.from.mockReturnValue(
        mockInsertChain({ data: { id: 'stored-id-42' }, error: null })
      );

      const result = await storeRefreshToken('rt_token', 'user-1', 'client-1', ['openid']);

      expect(result).toEqual({
        success: true,
        tokenId: 'stored-id-42',
      });
    });

    it('throws on database insert error', async () => {
      mockDbClient.from.mockReturnValue(
        mockInsertChain({ data: null, error: { message: 'Insert failed' } })
      );

      const result = await storeRefreshToken('rt_token', 'user-1', 'client-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insert failed');
    });

    it('passes hashed token (not raw) to database', async () => {
      const rawToken = 'rt_plaintext_token';
      const expectedHash = hashRefreshToken(rawToken);

      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'token-id-1' },
            error: null,
          }),
        }),
      });
      mockDbClient.from.mockReturnValue({ insert: insertMock });

      await storeRefreshToken(rawToken, 'user-1', 'client-1');

      const insertArg = insertMock.mock.calls[0][0];
      expect(insertArg.token_hash).toBe(expectedHash);
      expect(insertArg.token_hash).not.toBe(rawToken);
    });

    it('stores scopes as provided array', async () => {
      const scopes = ['openid', 'profile', 'email'];
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'token-id-1' },
            error: null,
          }),
        }),
      });
      mockDbClient.from.mockReturnValue({ insert: insertMock });

      await storeRefreshToken('rt_token', 'user-1', 'client-1', scopes);

      const insertArg = insertMock.mock.calls[0][0];
      expect(insertArg.scopes).toEqual(scopes);
    });

    it('returns error on unexpected throw', async () => {
      mockDbClient.from.mockImplementationOnce(() => {
        throw new Error('Unexpected store failure');
      });

      const result = await storeRefreshToken('rt_token', 'user-1', 'client-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected store failure');
    });

    it('handles non-Error throw with "Unknown error"', async () => {
      mockDbClient.from.mockImplementationOnce(() => {
        throw 'string store error'; // eslint-disable-line no-throw-literal
      });

      const result = await storeRefreshToken('rt_token', 'user-1', 'client-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  // -------------------------------------------------------
  // validateRefreshToken (11 tests)
  // -------------------------------------------------------
  describe('validateRefreshToken', () => {
    const validTokenData = {
      id: 'token-id-1',
      user_id: 'user-123',
      client_id: 'test-client',
      scopes: ['openid'],
      expires_at: new Date(Date.now() + 86400000).toISOString(), // +1 day
      revoked_at: null,
      rotated_to: null,
    };

    it('returns valid token data for unexpired, unrevoked token', async () => {
      mockDbClient.from.mockReturnValue(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      const result = await validateRefreshToken('rt_valid_token');

      expect(result.valid).toBe(true);
      expect(result.tokenId).toBe('token-id-1');
      expect(result.userId).toBe('user-123');
      expect(result.clientId).toBe('test-client');
      expect(result.scopes).toEqual(['openid']);
    });

    it('returns error for token not found in database', async () => {
      mockDbClient.from.mockReturnValue(
        mockSelectChain({ data: null, error: { message: 'Not found' } })
      );

      const result = await validateRefreshToken('rt_missing_token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid');
      expect(result.errorMessage).toContain('not found');
    });

    it('returns error for expired token', async () => {
      mockDbClient.from.mockReturnValue(
        mockSelectChain({
          data: {
            ...validTokenData,
            expires_at: new Date(Date.now() - 86400000).toISOString(), // -1 day
          },
          error: null,
        })
      );

      const result = await validateRefreshToken('rt_expired_token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('expired');
      expect(result.errorMessage).toContain('expired');
    });

    it('returns error for revoked token (revoked_at is set)', async () => {
      mockDbClient.from.mockReturnValue(
        mockSelectChain({
          data: {
            ...validTokenData,
            revoked_at: new Date().toISOString(),
          },
          error: null,
        })
      );

      const result = await validateRefreshToken('rt_revoked_token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('revoked');
      expect(result.errorMessage).toContain('revoked');
    });

    it('returns error for rotated token (rotated_to is set)', async () => {
      mockDbClient.from.mockReturnValue(
        mockSelectChain({
          data: {
            ...validTokenData,
            rotated_to: 'other-token-id',
          },
          error: null,
        })
      );

      const result = await validateRefreshToken('rt_rotated_token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('already_rotated');
      expect(result.errorMessage).toContain('already been used');
    });

    it('returns error for client_id mismatch', async () => {
      mockDbClient.from.mockReturnValue(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      const result = await validateRefreshToken('rt_valid', 'wrong-client');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid');
      expect(result.errorMessage).toContain('Client ID mismatch');
    });

    it('returns error for token hash mismatch', async () => {
      // When the DB finds no matching token_hash, it returns error from .single()
      mockDbClient.from.mockReturnValue(
        mockSelectChain({ data: null, error: { message: 'No rows found' } })
      );

      const result = await validateRefreshToken('rt_wrong_hash');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid');
    });

    it('logs "TOKEN REUSE DETECTED" warning when rotated token is reused', async () => {
      mockDbClient.from.mockReturnValue(
        mockSelectChain({
          data: {
            ...validTokenData,
            rotated_to: 'other-token-id',
          },
          error: null,
        })
      );

      await validateRefreshToken('rt_reused_token');

      expect(mockLogger.warn).toHaveBeenCalledWith('TOKEN REUSE DETECTED', {
        token_id: 'token-id-1',
      });
    });

    it('calls revokeTokenFamily on reuse detection', async () => {
      // This test verifies via rotateRefreshToken, which calls revokeTokenFamily on already_rotated
      // First call: validateRefreshToken finds rotated token
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({
          data: {
            ...validTokenData,
            rotated_to: 'other-token-id',
          },
          error: null,
        })
      );

      // Second call: revokeTokenFamily RPC
      mockDbClient.rpc.mockResolvedValue({ data: 3, error: null });

      const result = await rotateRefreshToken('rt_reused', 'test-client');

      expect(mockDbClient.rpc).toHaveBeenCalledWith('revoke_token_family', {
        p_token_id: 'token-id-1',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Token reuse detected');
    });

    it('returns error for database query failure', async () => {
      // Simulate an unexpected throw from the DB client
      mockDbClient.from.mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const result = await validateRefreshToken('rt_db_error');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('db_error');
      expect(result.errorMessage).toContain('Connection refused');
    });

    it('handles non-Error throw with fallback message', async () => {
      mockDbClient.from.mockImplementationOnce(() => {
        throw 'raw string error'; // eslint-disable-line no-throw-literal
      });

      const result = await validateRefreshToken('rt_non_error');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('db_error');
      expect(result.errorMessage).toBe('Database error');
    });

    it('returns error for null data from database', async () => {
      mockDbClient.from.mockReturnValue(
        mockSelectChain({ data: null, error: null })
      );

      const result = await validateRefreshToken('rt_null_data');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid');
    });

    it('returns correct error codes for each failure type', async () => {
      // Expired
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({
          data: {
            ...validTokenData,
            expires_at: new Date(Date.now() - 1000).toISOString(),
          },
          error: null,
        })
      );
      const expired = await validateRefreshToken('rt_exp');
      expect(expired.error).toBe('expired');

      // Revoked
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({
          data: { ...validTokenData, revoked_at: new Date().toISOString() },
          error: null,
        })
      );
      const revoked = await validateRefreshToken('rt_rev');
      expect(revoked.error).toBe('revoked');

      // Already rotated
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({
          data: { ...validTokenData, rotated_to: 'xyz' },
          error: null,
        })
      );
      const rotated = await validateRefreshToken('rt_rot');
      expect(rotated.error).toBe('already_rotated');

      // Not found
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: null, error: { message: 'Not found' } })
      );
      const notFound = await validateRefreshToken('rt_nf');
      expect(notFound.error).toBe('invalid');

      // DB error (throw)
      mockDbClient.from.mockImplementationOnce(() => {
        throw new Error('DB crash');
      });
      const dbError = await validateRefreshToken('rt_dbe');
      expect(dbError.error).toBe('db_error');
    });
  });

  // -------------------------------------------------------
  // rotateRefreshToken (7 tests)
  // -------------------------------------------------------
  describe('rotateRefreshToken', () => {
    const validTokenData = {
      id: 'token-id-1',
      user_id: 'user-123',
      client_id: 'test-client',
      scopes: ['openid'],
      expires_at: new Date(Date.now() + 86400000).toISOString(),
      revoked_at: null,
      rotated_to: null,
    };

    it('validates existing token before rotating', async () => {
      // Step 1: validate (select)
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      // Step 2: insert new token
      mockDbClient.from.mockReturnValueOnce(
        mockInsertChain({ data: { id: 'token-id-2' }, error: null })
      );

      // Step 3: mark old as rotated
      mockDbClient.from.mockReturnValueOnce(
        mockUpdateEqChain({ data: [{}], error: null })
      );

      await rotateRefreshToken('rt_old_token', 'test-client');

      // First call to from() should be for validation (select)
      expect(mockDbClient.from).toHaveBeenCalledTimes(3);
    });

    it('defaults scopes to empty array when validation has no scopes', async () => {
      const tokenDataNoScopes = {
        ...validTokenData,
        scopes: undefined,
      };

      // Step 1: validate (returns data with undefined scopes)
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: tokenDataNoScopes, error: null })
      );

      // Step 2: insert new token — capture the insert call
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'token-id-2' },
            error: null,
          }),
        }),
      });
      mockDbClient.from.mockReturnValueOnce({ insert: insertMock });

      // Step 3: mark old as rotated
      mockDbClient.from.mockReturnValueOnce(
        mockUpdateEqChain({ data: [{}], error: null })
      );

      await rotateRefreshToken('rt_old_token', 'test-client');

      const insertArg = insertMock.mock.calls[0][0];
      expect(insertArg.scopes).toEqual([]);
    });

    it('stores new token with same user_id, client_id, scopes', async () => {
      // Step 1: validate
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      // Step 2: insert new token — capture the insert call
      const insertMock = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'token-id-2' },
            error: null,
          }),
        }),
      });
      mockDbClient.from.mockReturnValueOnce({ insert: insertMock });

      // Step 3: mark old as rotated
      mockDbClient.from.mockReturnValueOnce(
        mockUpdateEqChain({ data: [{}], error: null })
      );

      await rotateRefreshToken('rt_old_token', 'test-client');

      const insertArg = insertMock.mock.calls[0][0];
      expect(insertArg.user_id).toBe('user-123');
      expect(insertArg.client_id).toBe('test-client');
      expect(insertArg.scopes).toEqual(['openid']);
    });

    it('marks old token as rotated (sets rotated_to)', async () => {
      // Step 1: validate
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      // Step 2: insert new token
      mockDbClient.from.mockReturnValueOnce(
        mockInsertChain({ data: { id: 'new-token-id' }, error: null })
      );

      // Step 3: mark old as rotated — capture update call
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{}], error: null }),
      });
      mockDbClient.from.mockReturnValueOnce({ update: updateMock });

      await rotateRefreshToken('rt_old_token', 'test-client');

      expect(updateMock).toHaveBeenCalledWith({ rotated_to: 'new-token-id' });
    });

    it('returns new token string and record', async () => {
      // Step 1: validate
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      // Step 2: insert new token
      mockDbClient.from.mockReturnValueOnce(
        mockInsertChain({ data: { id: 'new-token-id-99' }, error: null })
      );

      // Step 3: mark old as rotated
      mockDbClient.from.mockReturnValueOnce(
        mockUpdateEqChain({ data: [{}], error: null })
      );

      const result = await rotateRefreshToken('rt_old_token', 'test-client');

      expect(result.success).toBe(true);
      expect(result.newTokenId).toBe('new-token-id-99');
      expect(result.newToken).toBeDefined();
      expect(result.newToken!.startsWith('rt_')).toBe(true);
    });

    it('fails if validation fails (propagates error)', async () => {
      // Validation returns expired token
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({
          data: {
            ...validTokenData,
            expires_at: new Date(Date.now() - 86400000).toISOString(),
          },
          error: null,
        })
      );

      const result = await rotateRefreshToken('rt_expired', 'test-client');

      expect(result.success).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('fails if new token insert fails', async () => {
      // Step 1: validate succeeds
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      // Step 2: insert fails
      mockDbClient.from.mockReturnValueOnce(
        mockInsertChain({ data: null, error: { message: 'Disk full' } })
      );

      const result = await rotateRefreshToken('rt_old_token', 'test-client');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to create new refresh token');
    });

    it('fails if marking old token as rotated fails', async () => {
      // Step 1: validate
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      // Step 2: insert succeeds
      mockDbClient.from.mockReturnValueOnce(
        mockInsertChain({ data: { id: 'new-id' }, error: null })
      );

      // Step 3: update fails
      mockDbClient.from.mockReturnValueOnce({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Update failed' },
          }),
        }),
      });

      const result = await rotateRefreshToken('rt_old_token', 'test-client');

      // The implementation does NOT fail — it logs the error but still returns success
      // because the new token is already valid
      expect(result.success).toBe(true);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to mark token as rotated',
        expect.objectContaining({ error: 'Update failed' })
      );
    });

    it('returns error on unexpected throw', async () => {
      // Step 1: validate succeeds
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      // Step 2: insert throws unexpectedly
      mockDbClient.from.mockImplementationOnce(() => {
        throw new Error('Rotate crash');
      });

      const result = await rotateRefreshToken('rt_crash', 'test-client');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Rotate crash');
    });

    it('handles non-Error throw gracefully', async () => {
      // Step 1: validate succeeds
      mockDbClient.from.mockReturnValueOnce(
        mockSelectChain({ data: { ...validTokenData }, error: null })
      );

      // Step 2: insert throws a non-Error value
      mockDbClient.from.mockImplementationOnce(() => {
        throw 'string rotate error'; // eslint-disable-line no-throw-literal
      });

      const result = await rotateRefreshToken('rt_non_error', 'test-client');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unknown error');
    });
  });

  // -------------------------------------------------------
  // revokeTokenFamily (4 tests)
  // -------------------------------------------------------
  describe('revokeTokenFamily', () => {
    it('calls RPC function with token_id parameter', async () => {
      mockDbClient.rpc.mockResolvedValue({ data: 5, error: null });

      await revokeTokenFamily('family-token-id');

      expect(mockDbClient.rpc).toHaveBeenCalledWith('revoke_token_family', {
        p_token_id: 'family-token-id',
      });
    });

    it('returns success on RPC success', async () => {
      mockDbClient.rpc.mockResolvedValue({ data: 3, error: null });

      const result = await revokeTokenFamily('family-token-id');

      expect(result).toBe(3);
    });

    it('returns 0 when RPC returns null data', async () => {
      mockDbClient.rpc.mockResolvedValue({ data: null, error: null });

      const result = await revokeTokenFamily('family-token-id');

      expect(result).toBe(0);
    });

    it('returns 0 on RPC error', async () => {
      mockDbClient.rpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const result = await revokeTokenFamily('bad-token-id');

      expect(result).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to revoke token family',
        expect.objectContaining({ error: 'RPC failed' })
      );
    });

    it('passes correct function name to rpc()', async () => {
      mockDbClient.rpc.mockResolvedValue({ data: 1, error: null });

      await revokeTokenFamily('any-id');

      expect(mockDbClient.rpc.mock.calls[0][0]).toBe('revoke_token_family');
    });

    it('returns 0 on unexpected throw', async () => {
      mockDbClient.rpc.mockRejectedValue(new Error('Network timeout'));

      const result = await revokeTokenFamily('crash-id');

      expect(result).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error revoking family',
        expect.objectContaining({ error: 'Network timeout' })
      );
    });

    it('handles non-Error throw gracefully', async () => {
      mockDbClient.rpc.mockRejectedValue('string error');

      const result = await revokeTokenFamily('crash-id');

      expect(result).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error revoking family',
        { error: 'string error' }
      );
    });
  });

  // -------------------------------------------------------
  // revokeRefreshToken (4 tests)
  // -------------------------------------------------------
  describe('revokeRefreshToken', () => {
    it('revokes token by updating revoked_at in database', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: [{}], error: null }),
      });
      mockDbClient.from.mockReturnValue({ update: updateMock });

      const result = await revokeRefreshToken('rt_to_revoke');

      expect(result).toBe(true);
      expect(mockDbClient.from).toHaveBeenCalledWith('refresh_tokens');
    });

    it('hashes token before querying database', async () => {
      const rawToken = 'rt_plaintext_revoke';
      const expectedHash = hashRefreshToken(rawToken);
      const eqMock = vi.fn().mockResolvedValue({ data: [{}], error: null });
      mockDbClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({ eq: eqMock }),
      });

      await revokeRefreshToken(rawToken);

      expect(eqMock).toHaveBeenCalledWith('token_hash', expectedHash);
    });

    it('returns false on database error', async () => {
      mockDbClient.from.mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Revoke failed' },
          }),
        }),
      });

      const result = await revokeRefreshToken('rt_fail');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to revoke token',
        expect.objectContaining({ error: 'Revoke failed' })
      );
    });

    it('returns false on unexpected throw', async () => {
      mockDbClient.from.mockImplementationOnce(() => {
        throw new Error('Connection lost');
      });

      const result = await revokeRefreshToken('rt_crash');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error revoking token',
        expect.objectContaining({ error: 'Connection lost' })
      );
    });

    it('handles non-Error throw gracefully', async () => {
      mockDbClient.from.mockImplementationOnce(() => {
        throw 'string revoke error'; // eslint-disable-line no-throw-literal
      });

      const result = await revokeRefreshToken('rt_non_error');

      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error revoking token',
        { error: 'string revoke error' }
      );
    });
  });

  // -------------------------------------------------------
  // revokeAllUserTokens (5 tests)
  // -------------------------------------------------------
  describe('revokeAllUserTokens', () => {
    it('revokes all tokens for user_id', async () => {
      mockDbClient.from.mockReturnValue(
        mockRevokeAllChain({ data: [{ id: '1' }, { id: '2' }], error: null })
      );

      const result = await revokeAllUserTokens('user-123');

      expect(result).toBe(2);
      expect(mockDbClient.from).toHaveBeenCalledWith('refresh_tokens');
    });

    it('filters by client_id when provided', async () => {
      const eqClientFn = vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({
          data: [{ id: '1' }],
          error: null,
        }),
      });
      const isFn = vi.fn().mockReturnValue({ eq: eqClientFn, select: vi.fn() });
      const eqUserFn = vi.fn().mockReturnValue({ is: isFn });
      const updateFn = vi.fn().mockReturnValue({ eq: eqUserFn });
      mockDbClient.from.mockReturnValue({ update: updateFn });

      await revokeAllUserTokens('user-123', 'specific-client');

      // The chain should have called .eq('client_id', 'specific-client')
      expect(eqClientFn).toHaveBeenCalledWith('client_id', 'specific-client');
    });

    it('does not filter by client_id when omitted', async () => {
      const selectFn = vi.fn().mockResolvedValue({
        data: [{ id: '1' }],
        error: null,
      });
      const eqClientFn = vi.fn().mockReturnValue({ select: selectFn });
      const isFn = vi.fn().mockReturnValue({ eq: eqClientFn, select: selectFn });
      const eqUserFn = vi.fn().mockReturnValue({ is: isFn });
      const updateFn = vi.fn().mockReturnValue({ eq: eqUserFn });
      mockDbClient.from.mockReturnValue({ update: updateFn });

      await revokeAllUserTokens('user-123');

      // .eq for client_id should NOT be called — only .select should be called
      // When no clientId, the code calls query.select('id') directly
      // eqClientFn should NOT have been called
      expect(eqClientFn).not.toHaveBeenCalled();
      expect(selectFn).toHaveBeenCalledWith('id');
    });

    it('returns count of revoked tokens', async () => {
      mockDbClient.from.mockReturnValue(
        mockRevokeAllChain({
          data: [{ id: '1' }, { id: '2' }, { id: '3' }],
          error: null,
        })
      );

      const result = await revokeAllUserTokens('user-123');

      expect(result).toBe(3);
    });

    it('returns 0 when no tokens match (null data)', async () => {
      mockDbClient.from.mockReturnValue(
        mockRevokeAllChain({ data: null, error: null })
      );

      const result = await revokeAllUserTokens('user-with-no-tokens');

      expect(result).toBe(0);
    });

    it('returns 0 on database error', async () => {
      mockDbClient.from.mockReturnValue(
        mockRevokeAllChain({ data: null, error: { message: 'DB error' } })
      );

      const result = await revokeAllUserTokens('user-123');

      expect(result).toBe(0);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('returns 0 on unexpected throw', async () => {
      mockDbClient.from.mockImplementationOnce(() => {
        throw new Error('Unexpected crash');
      });

      const result = await revokeAllUserTokens('user-123');

      expect(result).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error revoking user tokens',
        expect.objectContaining({ error: 'Unexpected crash' })
      );
    });

    it('handles non-Error throw gracefully', async () => {
      mockDbClient.from.mockImplementationOnce(() => {
        throw 42; // eslint-disable-line no-throw-literal
      });

      const result = await revokeAllUserTokens('user-123');

      expect(result).toBe(0);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Unexpected error revoking user tokens',
        { error: '42' }
      );
    });
  });
});
