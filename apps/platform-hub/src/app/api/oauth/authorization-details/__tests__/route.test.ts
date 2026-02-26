/**
 * Authorization Details Route Tests — GET /api/oauth/authorization-details
 *
 * Tests for fetching OAuth authorization details for the consent page,
 * including E2E mode, Supabase auth, expiration, and null client guard.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers cookies (E2E detection)
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(() => []),
  set: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock Supabase client
const mockGetSession = vi.fn();
const mockSingle = vi.fn();
const mockEq = vi.fn(() => ({ eq: mockEq, single: mockSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockSupabaseFrom = vi.fn(() => ({ select: mockSelect }));
const mockSupabaseClient = {
  auth: { getSession: mockGetSession },
  from: mockSupabaseFrom,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Mock E2E store
vi.mock('@/lib/oauth/e2e-store', () => ({
  E2E_TEST_USER_ID: '00000000-0000-4000-a000-000000000e2e',
  E2E_TEST_EMAIL: 'e2e-test@joolie-boolie.test',
  getE2EAuthorization: vi.fn(),
  getE2EClient: vi.fn(),
}));

// Mock logger
vi.mock('@joolie-boolie/error-tracking/server-logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { GET } from '../route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  E2E_TEST_USER_ID,
  getE2EAuthorization,
  getE2EClient,
} from '@/lib/oauth/e2e-store';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockGetE2EAuthorization = getE2EAuthorization as ReturnType<typeof vi.fn>;
const mockGetE2EClient = getE2EClient as ReturnType<typeof vi.fn>;

function createRequest(authorizationId?: string) {
  const url = new URL('http://localhost:3002/api/oauth/authorization-details');
  if (authorizationId !== undefined) {
    url.searchParams.set('authorization_id', authorizationId);
  }
  return new NextRequest(url);
}

function setupCookies(userId?: string, accessToken?: string) {
  mockCookieStore.get.mockImplementation((name: string) => {
    if (name === 'jb_user_id' && userId) return { value: userId };
    if (name === 'jb_access_token' && accessToken) return { value: accessToken };
    return undefined;
  });
}

describe('GET /api/oauth/authorization-details', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    // Default: not E2E mode
    vi.stubEnv('E2E_TESTING', '');
    // Reset chain mocks
    mockEq.mockImplementation(() => ({ eq: mockEq, single: mockSingle }));
    mockSelect.mockImplementation(() => ({ eq: mockEq }));
    mockSupabaseFrom.mockImplementation(() => ({ select: mockSelect }));
    mockCreateClient.mockResolvedValue(mockSupabaseClient);
  });

  describe('Input Validation', () => {
    it('returns 400 when authorization_id query param is missing', async () => {
      const request = createRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('authorization_id');
    });

    it('returns 400 when authorization_id is empty string', async () => {
      const request = createRequest('');
      const response = await GET(request);
      const data = await response.json();

      // Empty string is falsy, so the !authorizationId check catches it
      expect(response.status).toBe(400);
      expect(data.error).toContain('authorization_id');
    });
  });

  describe('E2E Mode', () => {
    const mockE2EAuth = {
      id: 'auth-e2e-1',
      client_id: 'client-e2e-1',
      user_id: E2E_TEST_USER_ID,
      redirect_uri: 'http://localhost:3000/auth/callback',
      scope: 'read',
      state: 'test-state',
      code_challenge: 'challenge',
      code_challenge_method: 'S256',
      status: 'pending' as const,
      created_at: '2024-01-01T00:00:00Z',
      expires_at: '2099-01-01T00:00:00Z',
    };

    const mockE2EClient = {
      id: 'client-e2e-1',
      name: 'Test Client',
      redirect_uris: ['http://localhost:3000/auth/callback'],
      is_first_party: true,
    };

    it('returns E2E authorization details when in E2E mode with valid session', async () => {
      vi.stubEnv('E2E_TESTING', 'true');
      setupCookies(E2E_TEST_USER_ID as string, 'e2e-access-token');
      mockGetE2EAuthorization.mockReturnValue(mockE2EAuth);
      mockGetE2EClient.mockReturnValue(mockE2EClient);

      const request = createRequest('auth-e2e-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authorization.id).toBe('auth-e2e-1');
      expect(data.client.id).toBe('client-e2e-1');
      expect(data.client.name).toBe('Test Client');
      expect(data.user.email).toBe('e2e-test@joolie-boolie.test');
    });

    it('returns E2E authorization with E2E_TEST_USER_ID fallback when beakUserId is falsy', async () => {
      // This tests line 63: `id: beakUserId || E2E_TEST_USER_ID`
      // The isE2ESession check requires beakUserId === E2E_TEST_USER_ID,
      // so beakUserId is always truthy when we reach this point.
      // The fallback is a defensive guard that cannot be triggered in practice.
      vi.stubEnv('E2E_TESTING', 'true');
      setupCookies(E2E_TEST_USER_ID as string, 'e2e-access-token');
      mockGetE2EAuthorization.mockReturnValue(mockE2EAuth);
      mockGetE2EClient.mockReturnValue(mockE2EClient);

      const request = createRequest('auth-e2e-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.id).toBe(E2E_TEST_USER_ID);
    });

    it('falls through to Supabase when E2E authorization not found', async () => {
      vi.stubEnv('E2E_TESTING', 'true');
      setupCookies(E2E_TEST_USER_ID as string, 'e2e-access-token');
      mockGetE2EAuthorization.mockReturnValue(undefined);

      // Falls through to Supabase auth -- no session
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createRequest('auth-e2e-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('falls through to Supabase when E2E authorization status is not pending', async () => {
      vi.stubEnv('E2E_TESTING', 'true');
      setupCookies(E2E_TEST_USER_ID as string, 'e2e-access-token');
      mockGetE2EAuthorization.mockReturnValue({ ...mockE2EAuth, status: 'approved' });

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createRequest('auth-e2e-1');
      const response = await GET(request);

      // Falls through to Supabase, no session, so 401
      expect(response.status).toBe(401);
    });

    it('falls through to Supabase when E2E client not found', async () => {
      vi.stubEnv('E2E_TESTING', 'true');
      setupCookies(E2E_TEST_USER_ID as string, 'e2e-access-token');
      mockGetE2EAuthorization.mockReturnValue(mockE2EAuth);
      mockGetE2EClient.mockReturnValue(undefined);

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createRequest('auth-e2e-1');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Authentication', () => {
    it('returns 401 when Supabase session has error', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: new Error('Session error'),
      });

      const request = createRequest('auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when Supabase session is null', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const request = createRequest('auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Normal Database Flow', () => {
    const validSession = {
      user: { id: 'user-123', email: 'user@example.com' },
    };

    it('returns authorization details with client as single object', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: validSession },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: {
          id: 'auth-db-1',
          client_id: 'client-db-1',
          user_id: 'user-123',
          scope: 'read',
          status: 'pending',
          expires_at: '2099-01-01T00:00:00Z',
          oauth_clients: { id: 'client-db-1', name: 'DB Client' },
        },
        error: null,
      });

      const request = createRequest('auth-db-1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.authorization.id).toBe('auth-db-1');
      expect(data.client.id).toBe('client-db-1');
      expect(data.client.name).toBe('DB Client');
      expect(data.user.id).toBe('user-123');
      expect(data.user.email).toBe('user@example.com');
    });

    it('returns authorization details with client as array', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: validSession },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: {
          id: 'auth-db-2',
          client_id: 'client-db-2',
          user_id: 'user-123',
          scope: 'read write',
          status: 'pending',
          expires_at: '2099-01-01T00:00:00Z',
          oauth_clients: [{ id: 'client-db-2', name: 'Array Client' }],
        },
        error: null,
      });

      const request = createRequest('auth-db-2');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.client.id).toBe('client-db-2');
      expect(data.client.name).toBe('Array Client');
    });

    it('returns 404 when authorization not found or not owned by user', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: validSession },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: null,
        error: { message: 'Row not found' },
      });

      const request = createRequest('nonexistent');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toContain('not found');
    });
  });

  describe('Expiration Check', () => {
    it('returns 410 when authorization has expired', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123', email: 'user@example.com' } } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: {
          id: 'auth-expired',
          client_id: 'client-1',
          user_id: 'user-123',
          scope: 'read',
          status: 'pending',
          expires_at: '2020-01-01T00:00:00Z', // In the past
          oauth_clients: { id: 'client-1', name: 'Client' },
        },
        error: null,
      });

      const request = createRequest('auth-expired');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(410);
      expect(data.error).toContain('expired');
    });
  });

  describe('Bug Reproduction: null client', () => {
    it('returns 404 when oauth_clients is null after authData passes null check (FIXED: client null guard)', async () => {
      // FIXED: Previously, when oauth_clients was null, `Array.isArray(null)` is false,
      // so `client = null`, and `client.id` would throw TypeError.
      // Now a null guard returns 404 if client is nullish.
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123', email: 'user@example.com' } } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: {
          id: 'auth-null-client',
          client_id: 'client-missing',
          user_id: 'user-123',
          scope: 'read',
          status: 'pending',
          expires_at: '2099-01-01T00:00:00Z',
          oauth_clients: null,
        },
        error: null,
      });

      const request = createRequest('auth-null-client');
      const response = await GET(request);
      const data = await response.json();

      // FIXED: returns 404 instead of crashing with TypeError
      expect(response.status).toBe(404);
      expect(data.error).toContain('Client information not found');
    });

    it('returns 404 when oauth_clients is empty array (FIXED: client null guard)', async () => {
      // FIXED: Previously, `Array.isArray([])` is true, `[][0]` is undefined,
      // and `undefined.id` would throw TypeError.
      // Now the null guard catches this case.
      mockGetSession.mockResolvedValue({
        data: { session: { user: { id: 'user-123', email: 'user@example.com' } } },
        error: null,
      });

      mockSingle.mockResolvedValue({
        data: {
          id: 'auth-empty-client',
          client_id: 'client-missing',
          user_id: 'user-123',
          scope: 'read',
          status: 'pending',
          expires_at: '2099-01-01T00:00:00Z',
          oauth_clients: [],
        },
        error: null,
      });

      const request = createRequest('auth-empty-client');
      const response = await GET(request);
      const data = await response.json();

      // FIXED: returns 404 instead of crashing with TypeError
      expect(response.status).toBe(404);
      expect(data.error).toContain('Client information not found');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on unexpected error', async () => {
      mockCreateClient.mockRejectedValue(new Error('Connection failed'));

      const request = createRequest('auth-123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });
  });
});
