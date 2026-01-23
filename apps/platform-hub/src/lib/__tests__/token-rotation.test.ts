/**
 * Token Rotation Module Tests
 *
 * Tests for refresh token rotation, reuse detection, and security logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  refreshAccessToken,
  revokeAllTokens,
  shouldRefreshToken,
  getTokenExpiration,
  TokenRefreshError,
  tokenRotationLogger,
} from '../token-rotation';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

describe('Token Rotation Module', () => {
  const mockSupabaseUrl = 'https://test.supabase.co';
  const mockAnonKey = 'test-anon-key';
  const mockServiceRoleKey = 'test-service-role-key';

  beforeEach(() => {
    // Set environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = mockSupabaseUrl;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = mockAnonKey;
    process.env.SUPABASE_SERVICE_ROLE_KEY = mockServiceRoleKey;
    vi.stubEnv('NODE_ENV', 'development');

    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('refreshAccessToken', () => {
    it('should successfully refresh token and return new tokens', async () => {
      const mockRefreshToken = 'old-refresh-token';
      const mockNewTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };

      const mockRefreshSession = vi.fn().mockResolvedValue({
        data: {
          session: {
            access_token: mockNewTokens.access_token,
            refresh_token: mockNewTokens.refresh_token,
            expires_in: mockNewTokens.expires_in,
            user: { id: 'test-user-id' },
          },
        },
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({
        auth: {
          refreshSession: mockRefreshSession,
        },
      });

      const result = await refreshAccessToken(mockRefreshToken, 'test-client-id');

      expect(result.success).toBe(true);
      expect(result.tokens).toEqual({
        access_token: mockNewTokens.access_token,
        refresh_token: mockNewTokens.refresh_token,
        expires_in: mockNewTokens.expires_in,
        token_type: 'Bearer',
      });
      expect(mockRefreshSession).toHaveBeenCalledWith({
        refresh_token: mockRefreshToken,
      });
    });

    it('should detect token reuse and flag for revocation', async () => {
      const mockRefreshToken = 'reused-refresh-token';

      const mockRefreshSession = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'Token has already been used. Token reuse detected.',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({
        auth: {
          refreshSession: mockRefreshSession,
        },
      });

      const result = await refreshAccessToken(mockRefreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(TokenRefreshError.TOKEN_REUSE_DETECTED);
      expect(result.shouldRevokeAll).toBe(true);
      expect(result.message).toContain('reuse detected');
    });

    it('should handle expired refresh token', async () => {
      const mockRefreshToken = 'expired-refresh-token';

      const mockRefreshSession = vi.fn().mockResolvedValue({
        data: null,
        error: {
          message: 'Refresh token has expired',
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({
        auth: {
          refreshSession: mockRefreshSession,
        },
      });

      const result = await refreshAccessToken(mockRefreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(TokenRefreshError.EXPIRED_TOKEN);
    });

    it('should handle missing refresh token', async () => {
      const result = await refreshAccessToken('');

      expect(result.success).toBe(false);
      expect(result.error).toBe(TokenRefreshError.INVALID_GRANT);
      expect(result.message).toContain('required');
    });

    it('should handle network errors', async () => {
      const mockRefreshToken = 'valid-refresh-token';

      const mockRefreshSession = vi.fn().mockRejectedValue(new Error('Network error'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({
        auth: {
          refreshSession: mockRefreshSession,
        },
      });

      const result = await refreshAccessToken(mockRefreshToken);

      expect(result.success).toBe(false);
      expect(result.error).toBe(TokenRefreshError.NETWORK_ERROR);
    });

    it('should handle missing Supabase configuration', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;

      const result = await refreshAccessToken('test-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe(TokenRefreshError.NETWORK_ERROR);
    });
  });

  describe('revokeAllTokens', () => {
    it('should successfully revoke all tokens for a user', async () => {
      const mockUserId = 'test-user-id';

      const mockSignOut = vi.fn().mockResolvedValue({
        error: null,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({
        auth: {
          admin: {
            signOut: mockSignOut,
          },
        },
      });

      const result = await revokeAllTokens(mockUserId, 'Test revocation');

      expect(result.success).toBe(true);
      expect(mockSignOut).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle revocation errors', async () => {
      const mockUserId = 'test-user-id';

      const mockSignOut = vi.fn().mockResolvedValue({
        error: { message: 'User not found' },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (createClient as any).mockReturnValue({
        auth: {
          admin: {
            signOut: mockSignOut,
          },
        },
      });

      const result = await revokeAllTokens(mockUserId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should handle missing service role key', async () => {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const result = await revokeAllTokens('test-user-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('configuration');
    });
  });

  describe('shouldRefreshToken', () => {
    it('should return true if token expires within buffer period', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + 200; // 200 seconds from now

      const result = shouldRefreshToken(expiresAt, 300);

      expect(result).toBe(true);
    });

    it('should return false if token is not expiring soon', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + 600; // 600 seconds from now

      const result = shouldRefreshToken(expiresAt, 300);

      expect(result).toBe(false);
    });

    it('should return true if token is already expired', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now - 100; // Already expired

      const result = shouldRefreshToken(expiresAt);

      expect(result).toBe(true);
    });

    it('should use default buffer of 300 seconds', () => {
      const now = Math.floor(Date.now() / 1000);
      const expiresAt = now + 250; // 250 seconds from now

      const result = shouldRefreshToken(expiresAt);

      expect(result).toBe(true);
    });
  });

  describe('getTokenExpiration', () => {
    it('should extract expiration from valid JWT', () => {
      const exp = Math.floor(Date.now() / 1000) + 3600;
      const payload = { sub: 'user-id', exp };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const mockJWT = `header.${encodedPayload}.signature`;

      const result = getTokenExpiration(mockJWT);

      expect(result).toBe(exp);
    });

    it('should return null for invalid JWT format', () => {
      const invalidJWT = 'not.a.valid.jwt.token';

      const result = getTokenExpiration(invalidJWT);

      expect(result).toBe(null);
    });

    it('should return null for JWT without exp claim', () => {
      const payload = { sub: 'user-id' };
      const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
      const mockJWT = `header.${encodedPayload}.signature`;

      const result = getTokenExpiration(mockJWT);

      expect(result).toBe(null);
    });

    it('should return null for malformed JWT', () => {
      const malformedJWT = 'header.invalidbase64.signature';

      const result = getTokenExpiration(malformedJWT);

      expect(result).toBe(null);
    });
  });

  describe('TokenRotationLogger', () => {
    it('should log events with timestamps', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      tokenRotationLogger.log({
        event_type: 'refresh_success',
        client_id: 'test-client',
        user_id: 'test-user',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Token Rotation]',
        expect.objectContaining({
          event_type: 'refresh_success',
          client_id: 'test-client',
          user_id: 'test-user',
          timestamp: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });

    it('should retrieve recent events', () => {
      // Clear any previous events
      tokenRotationLogger['events'] = [];

      // Log multiple events
      for (let i = 0; i < 5; i++) {
        tokenRotationLogger.log({
          event_type: 'refresh_success',
          client_id: `client-${i}`,
        });
      }

      const recentEvents = tokenRotationLogger.getRecentEvents(3);

      expect(recentEvents).toHaveLength(3);
      expect(recentEvents[2].client_id).toBe('client-4');
    });
  });
});
