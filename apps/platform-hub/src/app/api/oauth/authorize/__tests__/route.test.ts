/**
 * OAuth Authorize API Route Tests
 *
 * Tests for GET /api/oauth/authorize
 * Covers: parameter validation, E2E bypass, auth check, client validation,
 *         redirect_uri validation, authorization creation, first-party auto-approve
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

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-auth-id-1234'),
}));

// Mock crypto.randomBytes
vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    default: {
      ...actual,
      randomBytes: vi.fn(() => Buffer.from('a'.repeat(32))),
    },
    randomBytes: vi.fn(() => Buffer.from('a'.repeat(32))),
  };
});

// Mock Supabase clients
const mockGetSession = vi.fn();
const mockSupabaseClient = {
  auth: {
    getSession: mockGetSession,
  },
};

const mockDbInsert = vi.fn();
const mockDbUpdate = vi.fn();
const mockDbSelect = vi.fn();
const mockDbEq = vi.fn();
const mockDbSingle = vi.fn();
const mockDbClient = {
  from: vi.fn((): Record<string, unknown> => ({
    select: mockDbSelect,
    insert: mockDbInsert,
    update: mockDbUpdate,
    eq: mockDbEq,
    single: mockDbSingle,
  })),
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
  createServiceRoleClient: vi.fn(() => mockDbClient),
}));

// Mock e2e-store
vi.mock('@/lib/oauth/e2e-store', () => ({
  E2E_TEST_USER_ID: '00000000-0000-4000-a000-000000000e2e',
  E2E_MOCK_CLIENTS: {
    'mock-client-id': {
      id: 'mock-client-id',
      name: 'Test App',
      redirect_uris: ['http://localhost:3000/callback'],
      is_first_party: false,
    },
    'first-party-client': {
      id: 'first-party-client',
      name: 'First Party App',
      redirect_uris: ['http://localhost:3000/callback'],
      is_first_party: true,
    },
  },
  createE2EAuthorization: vi.fn(),
  cleanupE2EAuthorizations: vi.fn(),
  updateE2EAuthorization: vi.fn(),
}));

// Mock audit middleware
vi.mock('@/middleware/audit-middleware', () => ({
  auditAuthorizationSuccess: vi.fn(),
}));

// Import after mocks
import { GET } from '../route';

// Helper to create authorize request with query params
function createAuthorizeRequest(params: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:3002/api/oauth/authorize');
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
}

// Valid parameters for a standard authorize request
const VALID_PARAMS = {
  client_id: 'mock-client-id',
  redirect_uri: 'http://localhost:3000/callback',
  scope: 'openid',
  state: 'random-csrf-state',
  code_challenge: 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
  code_challenge_method: 'S256',
  response_type: 'code',
};

describe('GET /api/oauth/authorize', () => {
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

  // --- Pre-validation parameter checks ---

  describe('parameter validation (pre-redirect)', () => {
    it('should return 400 JSON error when client_id is missing', async () => {
      const params = { ...VALID_PARAMS };
      delete (params as Record<string, string | undefined>).client_id;

      const request = createAuthorizeRequest(params as Record<string, string>);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('client_id');
    });

    it('should return 400 JSON error when redirect_uri is missing', async () => {
      const params = { ...VALID_PARAMS };
      delete (params as Record<string, string | undefined>).redirect_uri;

      const request = createAuthorizeRequest(params as Record<string, string>);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('redirect_uri');
    });

    it('should return 400 when scope is missing', async () => {
      const params = { ...VALID_PARAMS };
      delete (params as Record<string, string | undefined>).scope;

      const request = createAuthorizeRequest(params as Record<string, string>);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('required parameters');
    });

    it('should return 400 when state is missing', async () => {
      const params = { ...VALID_PARAMS };
      delete (params as Record<string, string | undefined>).state;

      const request = createAuthorizeRequest(params as Record<string, string>);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
    });

    it('should return 400 when code_challenge is missing', async () => {
      const params = { ...VALID_PARAMS };
      delete (params as Record<string, string | undefined>).code_challenge;

      const request = createAuthorizeRequest(params as Record<string, string>);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
    });

    it('should return 400 when code_challenge_method is not S256', async () => {
      const request = createAuthorizeRequest({
        ...VALID_PARAMS,
        code_challenge_method: 'plain',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('S256');
    });

    it('should return 400 when response_type is not "code"', async () => {
      const request = createAuthorizeRequest({
        ...VALID_PARAMS,
        response_type: 'token',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('unsupported_response_type');
    });
  });

  // --- Authentication check ---

  describe('authentication check', () => {
    it('should redirect to /login when user is not authenticated', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // Mock DB client lookup for the client_id
      mockDbClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'mock-client-id',
                name: 'Test App',
                redirect_uris: ['http://localhost:3000/callback'],
                is_first_party: false,
              },
              error: null,
            }),
          }),
        }),
        insert: mockDbInsert,
      });

      const request = createAuthorizeRequest(VALID_PARAMS);
      const response = await GET(request);

      expect(response.status).toBe(307); // redirect
      const location = response.headers.get('location');
      expect(location).toContain('/login');
      expect(location).toContain('redirect=');
    });
  });

  // --- E2E testing mode ---

  describe('E2E testing mode', () => {
    beforeEach(() => {
      process.env.E2E_TESTING = 'true';
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'jb_access_token') return { value: 'e2e-access-token' };
        if (name === 'jb_user_id') return { value: 'e2e-test-user-00000000-0000-0000-0000-000000000000' };
        return undefined;
      });
    });

    it('should use E2E mock client when in E2E mode', async () => {
      const request = createAuthorizeRequest(VALID_PARAMS);
      const response = await GET(request);

      // Should redirect to consent page (third-party client)
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/oauth/consent');
    });

    it('should auto-approve first-party client in E2E mode', async () => {
      const request = createAuthorizeRequest({
        ...VALID_PARAMS,
        client_id: 'first-party-client',
      });

      const response = await GET(request);

      // Should redirect back to callback with code
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('http://localhost:3000/callback');
      expect(location).toContain('code=');
      expect(location).toContain('state=random-csrf-state');
    });

    it('should NOT enter E2E mode when E2E_TESTING is not "true"', async () => {
      process.env.E2E_TESTING = 'false';

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      // DB lookup returns a valid client
      mockDbClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'mock-client-id',
                name: 'Test App',
                redirect_uris: ['http://localhost:3000/callback'],
                is_first_party: false,
              },
              error: null,
            }),
          }),
        }),
        insert: mockDbInsert,
      });

      const request = createAuthorizeRequest(VALID_PARAMS);
      const response = await GET(request);

      // Should redirect to login (not E2E mode)
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/login');
    });

    it('should NOT enter E2E mode when user ID does not match E2E test user', async () => {
      process.env.E2E_TESTING = 'true';
      mockCookieStore.get.mockImplementation((name: string) => {
        if (name === 'jb_access_token') return { value: 'some-token' };
        if (name === 'jb_user_id') return { value: 'regular-user-id' };
        return undefined;
      });

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: null,
      });

      mockDbClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'mock-client-id',
                name: 'Test App',
                redirect_uris: ['http://localhost:3000/callback'],
                is_first_party: false,
              },
              error: null,
            }),
          }),
        }),
        insert: mockDbInsert,
      });

      const request = createAuthorizeRequest(VALID_PARAMS);
      const response = await GET(request);

      // Should redirect to login (not E2E user)
      expect(response.status).toBe(307);
      const location = response.headers.get('location');
      expect(location).toContain('/login');
    });
  });

  // --- Client validation ---

  describe('client validation', () => {
    it('should return 400 when client is not found in DB', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: { user: { id: 'user-123' } },
        },
        error: null,
      });

      mockDbClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found', code: 'PGRST116' },
            }),
          }),
        }),
        insert: mockDbInsert,
      });

      const request = createAuthorizeRequest({
        ...VALID_PARAMS,
        client_id: 'unknown-client-id',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_client');
    });

    it('should return 400 when redirect_uri is not registered for client', async () => {
      mockGetSession.mockResolvedValue({
        data: {
          session: { user: { id: 'user-123' } },
        },
        error: null,
      });

      mockDbClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'mock-client-id',
                name: 'Test App',
                redirect_uris: ['http://localhost:3000/other-callback'],
                is_first_party: false,
              },
              error: null,
            }),
          }),
        }),
        insert: mockDbInsert,
      });

      const request = createAuthorizeRequest({
        ...VALID_PARAMS,
        redirect_uri: 'http://evil.com/callback',
      });

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('invalid_request');
      expect(data.error_description).toContain('redirect_uri');
    });
  });

  // --- Error handling ---

  describe('error handling', () => {
    it('should return 500 JSON error on unexpected exception', async () => {
      // Force an error by making cookies() throw
      const { cookies } = await import('next/headers');
      vi.mocked(cookies).mockRejectedValueOnce(new Error('Unexpected error'));

      const request = createAuthorizeRequest(VALID_PARAMS);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('server_error');
    });
  });
});
