import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/headers cookies
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(() => []),
  set: vi.fn(),
};
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn(() => ({
  select: mockSelect,
}));
const mockGetUser = vi.fn();
const mockSupabaseClient = {
  from: mockFrom,
  auth: {
    getUser: mockGetUser,
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock('@/lib/e2e-profile-store', () => ({
  getE2EProfile: vi.fn(() => ({
    facility_name: 'E2E Test Facility',
    email: 'e2e-test@joolie-boolie.test',
  })),
}));

// Import after mocks
import { GET } from '../route';

describe('GET /api/profile', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: not in E2E mode
    mockCookieStore.get.mockReturnValue(undefined);
    process.env.E2E_TESTING = '';

    // Default chain: .select().eq().single()
    mockSelect.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ single: mockSingle });
  });

  it('should return 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should query only facility_name from profiles table (not email)', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: { facility_name: 'Test Facility' },
      error: null,
    });

    await GET();

    // Verify the select call only includes facility_name, NOT email
    expect(mockSelect).toHaveBeenCalledWith('facility_name');
    expect(mockSelect).not.toHaveBeenCalledWith(
      expect.stringContaining('email')
    );
  });

  it('should return email from auth user object, not from profiles query', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'auth-user@example.com',
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: { facility_name: 'Test Facility' },
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.email).toBe('auth-user@example.com');
    expect(body.facility_name).toBe('Test Facility');
  });

  it('should return empty string for email when user.email is undefined', async () => {
    const mockUser = {
      id: 'user-123',
      email: undefined,
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: { facility_name: 'Test Facility' },
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(body.email).toBe('');
  });

  it('should fall back to user_metadata.facility_name when profile is null', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: { facility_name: 'Metadata Facility' },
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: { facility_name: null },
      error: null,
    });

    const response = await GET();
    const body = await response.json();

    expect(body.facility_name).toBe('Metadata Facility');
  });

  it('should return 500 when profile fetch fails with a real database error', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST000', message: 'Database error' },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Failed to fetch profile');
  });

  it('should return success with fallback values when profile row does not exist (PGRST116)', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'new-user@example.com',
      user_metadata: { facility_name: 'From Metadata' },
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // PGRST116 = "Searched for a row but found 0 rows" (no profile row for this user)
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.email).toBe('new-user@example.com');
    // Falls back to user_metadata.facility_name when profile is null
    expect(body.facility_name).toBe('From Metadata');
  });

  it('should return empty facility_name when no profile and no metadata', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'new-user@example.com',
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // No profile row exists
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' },
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.facility_name).toBe('');
  });
});
