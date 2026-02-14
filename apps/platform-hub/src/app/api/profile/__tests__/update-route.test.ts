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
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockFrom = vi.fn(() => ({
  update: mockUpdate,
}));
const mockGetUser = vi.fn();
const mockUpdateUser = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSupabaseClient = {
  from: mockFrom,
  auth: {
    getUser: mockGetUser,
    updateUser: mockUpdateUser,
    signInWithPassword: mockSignInWithPassword,
  },
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

vi.mock('@/lib/e2e-profile-store', () => ({
  updateE2EProfile: vi.fn(),
}));

// Import after mocks
import { POST } from '../update/route';

function makeRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3002/api/profile/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/profile/update', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: not in E2E mode
    mockCookieStore.get.mockReturnValue(undefined);
    process.env.E2E_TESTING = '';

    // Default chain: .update().eq()
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockResolvedValue({ error: null });
  });

  it('should return 401 when user is not authenticated', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });

    const response = await POST(makeRequest({ facilityName: 'Test' }));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should update only facility_name in profiles table (no notification columns)', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    await POST(makeRequest({ facilityName: 'New Facility' }));

    // Verify only facility_name is sent to profiles table update
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockUpdate).toHaveBeenCalledWith({
      facility_name: 'New Facility',
    });

    // Verify no notification preference columns are in the update
    const updateArg = mockUpdate.mock.calls[0][0];
    expect(updateArg).not.toHaveProperty('email_notifications_enabled');
    expect(updateArg).not.toHaveProperty('game_reminders_enabled');
    expect(updateArg).not.toHaveProperty('weekly_summary_enabled');
    expect(updateArg).not.toHaveProperty('marketing_emails_enabled');
  });

  it('should not attempt to update notification preference columns even if sent in request body', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Send notification preferences in request body - they should be ignored
    await POST(
      makeRequest({
        facilityName: 'New Facility',
        emailNotificationsEnabled: true,
        gameRemindersEnabled: false,
        weeklySummaryEnabled: true,
        marketingEmailsEnabled: false,
      })
    );

    // Only facility_name should be in the update
    expect(mockUpdate).toHaveBeenCalledWith({
      facility_name: 'New Facility',
    });
  });

  it('should still support email updates via auth.updateUser', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'old@example.com',
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockUpdateUser.mockResolvedValue({ error: null });

    const response = await POST(
      makeRequest({ email: 'new@example.com' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    // Email update should go through auth.updateUser, NOT profiles table
    expect(mockUpdateUser).toHaveBeenCalledWith({ email: 'new@example.com' });
  });

  it('should not call profiles update when only email is changed', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'old@example.com',
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    mockUpdateUser.mockResolvedValue({ error: null });

    await POST(makeRequest({ email: 'new@example.com' }));

    // profiles table should NOT be updated (no profileUpdates)
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('should validate email format', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'user@example.com',
      user_metadata: {},
    };

    mockGetUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    const response = await POST(makeRequest({ email: 'invalid-email' }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBe('Invalid email address');
  });
});
