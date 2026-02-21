/**
 * OAuth Deny API Route Tests
 *
 * Tests for POST /api/oauth/deny
 * Covers: validation, E2E mode, auth check, denial flow, audit logging, error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(() => []),
  set: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock Supabase clients
const mockGetSession = vi.fn();
const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
  },
};

const mockDbFrom = vi.fn();
const mockDbClient = {
  from: mockDbFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
  createServiceRoleClient: vi.fn(() => mockDbClient),
}));

// Mock audit middleware
const mockAuditDenial = vi.fn();
const mockAuditError = vi.fn();
vi.mock('@/middleware/audit-middleware', () => ({
  auditAuthorizationDenial: (...args: unknown[]) => mockAuditDenial(...args),
  auditAuthorizationError: (...args: unknown[]) => mockAuditError(...args),
}));

// Mock e2e-store
const mockGetE2EAuthorization = vi.fn();
const mockUpdateE2EAuthorization = vi.fn();
const mockGetE2EClient = vi.fn();
vi.mock('@/lib/oauth/e2e-store', () => ({
  E2E_TEST_USER_ID: '00000000-0000-4000-a000-000000000e2e',
  getE2EAuthorization: (...args: unknown[]) => mockGetE2EAuthorization(...args),
  updateE2EAuthorization: (...args: unknown[]) => mockUpdateE2EAuthorization(...args),
  getE2EClient: (...args: unknown[]) => mockGetE2EClient(...args),
}));

// Import after mocks
import { POST } from '../route';

// Helper to create a deny request
function createDenyRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3002/api/oauth/deny', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/oauth/deny', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.E2E_TESTING = '';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    // Default: no E2E cookies
    mockCookieStore.get.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Input validation ---

  describe('input validation', () => {
    it('should return 400 when authorization_id is missing', async () => {
      const request = createDenyRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('authorization_id');
    });

    it('should return 400 when authorization_id is not a string', async () => {
      const request = createDenyRequest({ authorization_id: 123 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('authorization_id');
    });

    it('should return 400 when authorization_id is empty string', async () => {
      const request = createDenyRequest({ authorization_id: '' });
      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(400);
    });
  });

  // --- Authentication ---

  describe('authentication', () => {
    it('should return 401 when user is not authenticated (no E2E, no session)', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createDenyRequest({ authorization_id: 'auth-123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Unauthorized');
    });

    it('should return 401 when session has error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session expired' },
      });

      const request = createDenyRequest({ authorization_id: 'auth-123' });
      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(401);
    });
  });

  // --- E2E mode ---

  describe('E2E testing mode', () => {
    beforeEach(() => {
      process.env.E2E_TESTING = 'true';
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'jb_access_token') return { value: 'e2e-token' };
        if (name === 'jb_user_id') return { value: 'e2e-test-user-00000000-0000-0000-0000-000000000000' };
        return undefined;
      });
    });

    it('should deny E2E authorization and return redirect_url', async () => {
      mockGetE2EAuthorization.mockReturnValue({
        id: 'auth-123',
        client_id: 'client-456',
        user_id: 'e2e-test-user-00000000-0000-0000-0000-000000000000',
        redirect_uri: 'http://localhost:3000/callback',
        state: 'csrf-state',
        status: 'pending',
      });
      mockGetE2EClient.mockReturnValue({
        id: 'client-456',
        name: 'Test App',
      });
      mockUpdateE2EAuthorization.mockReturnValue(true);

      const request = createDenyRequest({
        authorization_id: 'auth-123',
        reason: 'user_clicked_deny',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redirect_url).toBeDefined();
      expect(data.redirect_url).toContain('error=access_denied');
      expect(data.redirect_url).toContain('state=csrf-state');

      expect(mockUpdateE2EAuthorization).toHaveBeenCalledWith('auth-123', {
        status: 'denied',
      });
    });

    it('should return 400 when E2E authorization update fails', async () => {
      mockGetE2EAuthorization.mockReturnValue({
        id: 'auth-123',
        client_id: 'client-456',
        user_id: 'e2e-test-user-00000000-0000-0000-0000-000000000000',
        redirect_uri: 'http://localhost:3000/callback',
        state: 'csrf-state',
        status: 'pending',
      });
      mockGetE2EClient.mockReturnValue({
        id: 'client-456',
        name: 'Test App',
      });
      mockUpdateE2EAuthorization.mockReturnValue(false);

      const request = createDenyRequest({ authorization_id: 'auth-123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Failed to deny');
    });

    it('should fall through to Supabase when E2E authorization not found', async () => {
      mockGetE2EAuthorization.mockReturnValue(undefined);

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createDenyRequest({ authorization_id: 'auth-not-in-e2e' });
      const response = await POST(request);
      await response.json();

      // Falls through to Supabase auth check, which returns 401
      expect(response.status).toBe(401);
    });
  });

  // --- Normal Supabase flow ---

  describe('normal denial flow', () => {
    const mockSession = {
      user: { id: 'user-123' },
    };

    beforeEach(() => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
    });

    it('should deny authorization and return redirect_url', async () => {
      // Mock authorization lookup
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'auth-abc',
          client_id: 'client-xyz',
          user_id: 'user-123',
          redirect_uri: 'http://localhost:3000/callback',
          state: 'my-state',
          oauth_clients: { id: 'client-xyz', name: 'My App' },
        },
        error: null,
      });

      // Mock the update call
      const mockUpdateEq = vi.fn().mockReturnThis();
      const mockUpdate = vi.fn().mockReturnValue({
        eq: mockUpdateEq,
      });
      mockUpdateEq.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      // First from() call: select authorization details
      // Second from() call: update authorization status
      let fromCallCount = 0;
      mockDbFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return {
            select: mockSelect,
            eq: mockEq,
            single: mockSingle,
          };
        }
        return {
          update: mockUpdate,
        };
      });

      // Chain the select for the first call
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }));

      mockAuditDenial.mockResolvedValue(undefined);

      const request = createDenyRequest({
        authorization_id: 'auth-abc',
        reason: 'user_denied',
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redirect_url).toBeDefined();
      expect(data.redirect_url).toContain('error=access_denied');
      expect(data.redirect_url).toContain('state=my-state');
    });

    it('should return 400 when authorization details not found in DB', async () => {
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      mockDbFrom.mockReturnValue({
        select: mockSelect,
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }));

      mockAuditError.mockResolvedValue(undefined);

      const request = createDenyRequest({ authorization_id: 'nonexistent-auth' });
      const response = await POST(request);
      await response.json();

      expect(response.status).toBe(400);
    });

    it('should use default reason "user_denied" when no reason provided', async () => {
      // Mock authorization lookup and update
      const mockSelect = vi.fn().mockReturnThis();
      const mockEq = vi.fn().mockReturnThis();
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: 'auth-abc',
          client_id: 'client-xyz',
          user_id: 'user-123',
          redirect_uri: 'http://localhost:3000/callback',
          state: 'state-123',
          oauth_clients: { id: 'client-xyz', name: 'My App' },
        },
        error: null,
      });

      let fromCallCount = 0;
      mockDbFrom.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          return { select: mockSelect };
        }
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockImplementation(() => ({
        eq: vi.fn().mockReturnValue({
          single: mockSingle,
        }),
      }));

      mockAuditDenial.mockResolvedValue(undefined);

      const request = createDenyRequest({ authorization_id: 'auth-abc' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.redirect_url).toContain('User+denied+authorization');
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('should return 500 on unexpected error', async () => {
      // Force an error by making JSON parsing fail
      const request = new NextRequest('http://localhost:3002/api/oauth/deny', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: 'invalid-json',
      });

      mockAuditError.mockResolvedValue(undefined);

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
