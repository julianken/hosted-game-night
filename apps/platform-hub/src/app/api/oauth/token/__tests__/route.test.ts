/**
 * OAuth Token Endpoint Tests
 *
 * Tests for token exchange and refresh endpoints
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from '../route';
import { NextRequest } from 'next/server';
import * as tokenRotation from '@/lib/token-rotation';

// Mock token-rotation module
vi.mock('@/lib/token-rotation', () => ({
  refreshAccessToken: vi.fn(),
  revokeAllTokens: vi.fn(),
  tokenRotationLogger: {
    log: vi.fn(),
  },
  TokenRefreshError: {
    INVALID_GRANT: 'invalid_grant',
    TOKEN_REUSE_DETECTED: 'token_reuse_detected',
    EXPIRED_TOKEN: 'expired_token',
    NETWORK_ERROR: 'network_error',
    UNKNOWN_ERROR: 'unknown_error',
  },
}));

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      exchangeCodeForSession: vi.fn(),
      refreshSession: vi.fn(),
    },
  })),
}));

describe('OAuth Token Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/oauth/token', () => {
    it('should return 405 Method Not Allowed', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(405);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('POST');
    });
  });

  describe('POST /api/oauth/token - authorization_code grant', () => {
    it('should successfully exchange authorization code for tokens', async () => {
      const mockTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
      };

      const requestBody = {
        grant_type: 'authorization_code',
        code: 'auth-code-123',
        client_id: 'test-client-id',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: 'test-verifier',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      // Mock Supabase response
      const { createClient } = await import('@supabase/supabase-js');
      (createClient as any).mockReturnValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                access_token: mockTokens.access_token,
                refresh_token: mockTokens.refresh_token,
                expires_in: mockTokens.expires_in,
                user: { id: 'test-user-id' },
              },
            },
            error: null,
          }),
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        access_token: mockTokens.access_token,
        token_type: 'Bearer',
        expires_in: mockTokens.expires_in,
        refresh_token: mockTokens.refresh_token,
      });
    });

    it('should return error for missing code parameter', async () => {
      const requestBody = {
        grant_type: 'authorization_code',
        client_id: 'test-client-id',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: 'test-verifier',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('code');
    });

    it('should return error for missing code_verifier (PKCE required)', async () => {
      const requestBody = {
        grant_type: 'authorization_code',
        code: 'auth-code-123',
        client_id: 'test-client-id',
        redirect_uri: 'http://localhost:3000/callback',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('PKCE');
    });

    it('should handle invalid authorization code', async () => {
      const requestBody = {
        grant_type: 'authorization_code',
        code: 'invalid-code',
        client_id: 'test-client-id',
        redirect_uri: 'http://localhost:3000/callback',
        code_verifier: 'test-verifier',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const { createClient } = await import('@supabase/supabase-js');
      (createClient as any).mockReturnValue({
        auth: {
          exchangeCodeForSession: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Invalid authorization code' },
          }),
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_grant');
    });
  });

  describe('POST /api/oauth/token - refresh_token grant', () => {
    it('should successfully refresh tokens', async () => {
      const mockNewTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      (tokenRotation.refreshAccessToken as any).mockResolvedValue({
        success: true,
        tokens: mockNewTokens,
      });

      const requestBody = {
        grant_type: 'refresh_token',
        refresh_token: 'old-refresh-token',
        client_id: 'test-client-id',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockNewTokens);
      expect(tokenRotation.refreshAccessToken).toHaveBeenCalledWith(
        'old-refresh-token',
        'test-client-id'
      );
    });

    it('should detect token reuse and return error', async () => {
      (tokenRotation.refreshAccessToken as any).mockResolvedValue({
        success: false,
        error: tokenRotation.TokenRefreshError.TOKEN_REUSE_DETECTED,
        shouldRevokeAll: true,
        message: 'Token reuse detected',
      });

      const requestBody = {
        grant_type: 'refresh_token',
        refresh_token: 'reused-token',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_grant');
      expect(data.error_description).toContain('reuse detected');
      expect(data.error_uri).toBeDefined();
    });

    it('should return error for missing refresh_token', async () => {
      const requestBody = {
        grant_type: 'refresh_token',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('refresh_token');
    });

    it('should handle expired refresh token', async () => {
      (tokenRotation.refreshAccessToken as any).mockResolvedValue({
        success: false,
        error: tokenRotation.TokenRefreshError.EXPIRED_TOKEN,
        message: 'Refresh token expired',
      });

      const requestBody = {
        grant_type: 'refresh_token',
        refresh_token: 'expired-token',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_grant');
    });

    it('should handle network errors', async () => {
      (tokenRotation.refreshAccessToken as any).mockResolvedValue({
        success: false,
        error: tokenRotation.TokenRefreshError.NETWORK_ERROR,
        message: 'Network error',
      });

      const requestBody = {
        grant_type: 'refresh_token',
        refresh_token: 'valid-token',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('server_error');
    });
  });

  describe('POST /api/oauth/token - form-urlencoded support', () => {
    it('should parse application/x-www-form-urlencoded body', async () => {
      const mockNewTokens = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      (tokenRotation.refreshAccessToken as any).mockResolvedValue({
        success: true,
        tokens: mockNewTokens,
      });

      const formData = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: 'old-refresh-token',
        client_id: 'test-client-id',
      });

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockNewTokens);
    });
  });

  describe('POST /api/oauth/token - error handling', () => {
    it('should return error for missing grant_type', async () => {
      const requestBody = {
        refresh_token: 'test-token',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('grant_type');
    });

    it('should return error for unsupported grant_type', async () => {
      const requestBody = {
        grant_type: 'password',
        username: 'test',
        password: 'test',
      };

      const request = new NextRequest('http://localhost:3002/api/oauth/token', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('unsupported_grant_type');
    });
  });
});
