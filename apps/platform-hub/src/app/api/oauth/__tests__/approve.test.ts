/**
 * OAuth Approval API Route Tests
 *
 * Tests for CSRF validation and authorization approval flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../approve/route';
import { NextRequest } from 'next/server';

// Mock CSRF functions
vi.mock('@/lib/csrf', () => ({
  validateCsrfToken: vi.fn(),
  clearCsrfToken: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getSession: vi.fn(),
      oauth: {
        approveAuthorization: vi.fn(),
      },
    },
  })),
}));

import { validateCsrfToken, clearCsrfToken } from '@/lib/csrf';
import { createClient } from '@/lib/supabase/server';

describe('POST /api/oauth/approve', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createRequest = (body: unknown) => {
    return new NextRequest('http://localhost:3002/api/oauth/approve', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  describe('Request Validation', () => {
    it('should return 400 if authorization_id is missing', async () => {
      const request = createRequest({
        csrf_token: 'valid-token',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing authorization_id');
    });

    it('should return 400 if csrf_token is missing', async () => {
      const request = createRequest({
        authorization_id: 'auth-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Missing csrf_token');
    });
  });

  describe('CSRF Validation', () => {
    it('should return 403 if CSRF token is invalid', async () => {
      vi.mocked(validateCsrfToken).mockResolvedValue(false);

      const request = createRequest({
        authorization_id: 'auth-123',
        csrf_token: 'invalid-token',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Invalid or expired CSRF token');
      expect(validateCsrfToken).toHaveBeenCalledWith('invalid-token');
    });

    it('should clear CSRF token after successful validation', async () => {
      vi.mocked(validateCsrfToken).mockResolvedValue(true);
      vi.mocked(clearCsrfToken).mockResolvedValue();

      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'user-123' } } },
            error: null,
          }),
          oauth: {
            approveAuthorization: vi.fn().mockResolvedValue({
              data: { redirect_to: 'https://client.example.com/callback' },
              error: null,
            }),
          },
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as never);

      const request = createRequest({
        authorization_id: 'auth-123',
        csrf_token: 'valid-token',
      });

      await POST(request);

      expect(clearCsrfToken).toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      vi.mocked(validateCsrfToken).mockResolvedValue(true);

      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: null,
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as never);

      const request = createRequest({
        authorization_id: 'auth-123',
        csrf_token: 'valid-token',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if session error occurs', async () => {
      vi.mocked(validateCsrfToken).mockResolvedValue(true);

      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: null },
            error: new Error('Session error'),
          }),
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as never);

      const request = createRequest({
        authorization_id: 'auth-123',
        csrf_token: 'valid-token',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Authorization Approval', () => {
    it('should approve authorization and return redirect URL', async () => {
      vi.mocked(validateCsrfToken).mockResolvedValue(true);

      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'user-123' } } },
            error: null,
          }),
          oauth: {
            approveAuthorization: vi.fn().mockResolvedValue({
              data: { redirect_url: 'https://client.example.com/callback?code=abc123' },
              error: null,
            }),
          },
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as never);

      const request = createRequest({
        authorization_id: 'auth-123',
        csrf_token: 'valid-token',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redirect_to).toBe('https://client.example.com/callback?code=abc123');
      expect(mockSupabase.auth.oauth.approveAuthorization).toHaveBeenCalledWith('auth-123');
    });

    it('should return 400 if authorization approval fails', async () => {
      vi.mocked(validateCsrfToken).mockResolvedValue(true);

      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'user-123' } } },
            error: null,
          }),
          oauth: {
            approveAuthorization: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Authorization not found' },
            }),
          },
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as never);

      const request = createRequest({
        authorization_id: 'auth-123',
        csrf_token: 'valid-token',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Authorization not found');
    });

    it('should return 500 if no redirect URL provided', async () => {
      vi.mocked(validateCsrfToken).mockResolvedValue(true);

      const mockSupabase = {
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: { session: { user: { id: 'user-123' } } },
            error: null,
          }),
          oauth: {
            approveAuthorization: vi.fn().mockResolvedValue({
              data: {},
              error: null,
            }),
          },
        },
      };
      vi.mocked(createClient).mockReturnValue(mockSupabase as never);

      const request = createRequest({
        authorization_id: 'auth-123',
        csrf_token: 'valid-token',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('No redirect URL provided by authorization server');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on unexpected errors', async () => {
      vi.mocked(validateCsrfToken).mockRejectedValue(new Error('Unexpected error'));

      const request = createRequest({
        authorization_id: 'auth-123',
        csrf_token: 'valid-token',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
