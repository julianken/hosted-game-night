/**
 * Reset Password API Route Tests
 *
 * Tests for POST /api/auth/reset-password
 * Covers: recovery session validation, password validation, Supabase update, error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks ---

// Mock Supabase client
const mockGetSession = vi.fn();
const mockUpdateUser = vi.fn();
const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
    updateUser: mockUpdateUser,
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Import after mocks
import { POST } from '../route';

// Helper to create a POST request with JSON body
function createResetRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3002/api/auth/reset-password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Helper: valid recovery session
function mockRecoverySession() {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          app_metadata: {
            amr: [
              { method: 'recovery', timestamp: Date.now() / 1000 },
            ],
          },
        },
      },
    },
    error: null,
  });
}

// Helper: normal (non-recovery) session
function mockNormalSession() {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          app_metadata: {
            amr: [
              { method: 'password', timestamp: Date.now() / 1000 },
            ],
          },
        },
      },
    },
    error: null,
  });
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Authentication ---

  describe('authentication', () => {
    it('should return 401 when no session exists', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createResetRequest({ password: 'NewPass123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when session has error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const request = createResetRequest({ password: 'NewPass123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  // --- Recovery session check ---

  describe('recovery session validation', () => {
    it('should return 403 when session is not a recovery session', async () => {
      mockNormalSession();

      const request = createResetRequest({ password: 'NewPass123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('recovery sessions');
    });

    it('should return 403 when AMR is empty array', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              app_metadata: { amr: [] },
            },
          },
        },
        error: null,
      });

      const request = createResetRequest({ password: 'NewPass123' });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should return 403 when AMR does not exist in app_metadata', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              app_metadata: {},
            },
          },
        },
        error: null,
      });

      const request = createResetRequest({ password: 'NewPass123' });
      const response = await POST(request);

      expect(response.status).toBe(403);
    });

    it('should accept a recovery session with mixed AMR methods', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: {
            user: {
              id: 'user-123',
              app_metadata: {
                amr: [
                  { method: 'password', timestamp: 1000 },
                  { method: 'recovery', timestamp: 2000 },
                ],
              },
            },
          },
        },
        error: null,
      });
      mockUpdateUser.mockResolvedValue({ error: null });

      const request = createResetRequest({ password: 'ValidPass1' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  // --- Password validation ---

  describe('password validation', () => {
    it('should return 400 when password is missing', async () => {
      mockRecoverySession();

      const request = createResetRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Password is required');
    });

    it('should return 400 when password is shorter than 8 characters', async () => {
      mockRecoverySession();

      const request = createResetRequest({ password: 'Ab1' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('at least 8 characters');
    });

    it('should return 400 when password has no uppercase letter', async () => {
      mockRecoverySession();

      const request = createResetRequest({ password: 'lowercase1' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('uppercase letter');
    });

    it('should return 400 when password has no lowercase letter', async () => {
      mockRecoverySession();

      const request = createResetRequest({ password: 'UPPERCASE1' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('lowercase letter');
    });

    it('should return 400 when password has no number', async () => {
      mockRecoverySession();

      const request = createResetRequest({ password: 'NoNumbers!' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('number');
    });

    it('should accept a valid password meeting all criteria', async () => {
      mockRecoverySession();
      mockUpdateUser.mockResolvedValue({ error: null });

      const request = createResetRequest({ password: 'ValidPass1' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Password reset successfully');
    });
  });

  // --- Supabase password update ---

  describe('password update', () => {
    it('should call Supabase updateUser with the new password', async () => {
      mockRecoverySession();
      mockUpdateUser.mockResolvedValue({ error: null });

      const request = createResetRequest({ password: 'NewSecure1' });
      await POST(request);

      expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewSecure1' });
    });

    it('should return 500 when Supabase updateUser fails', async () => {
      mockRecoverySession();
      mockUpdateUser.mockResolvedValue({
        error: { message: 'Password too weak' },
      });

      const request = createResetRequest({ password: 'ValidPass1' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to update password');
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('should return 500 on unexpected error', async () => {
      mockGetSession.mockRejectedValue(new Error('Unexpected DB error'));

      const request = createResetRequest({ password: 'ValidPass1' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('should return 500 on invalid JSON body', async () => {
      mockRecoverySession();

      const request = new Request('http://localhost:3002/api/auth/reset-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'not-valid-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
