import { describe, it, expect, vi, beforeEach } from 'vitest';
import { redirect } from 'next/navigation';
import DashboardLayout from '../layout';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

// Mock Next.js headers (cookies)
const mockCookieStore = {
  get: vi.fn(),
  getAll: vi.fn(() => []),
  set: vi.fn(),
  delete: vi.fn(),
  has: vi.fn(),
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('DashboardLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no E2E cookies (trigger normal Supabase auth flow)
    mockCookieStore.get.mockReturnValue(undefined);
  });

  it('should redirect to login when user is not authenticated', async () => {
    // Mock unauthenticated state
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    } as never);

    // Render layout
    await DashboardLayout({ children: <div>Test Content</div> });

    // Should redirect to login with redirect parameter
    expect(redirect).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
  });

  it('should redirect to login when auth error occurs', async () => {
    // Mock auth error
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({
            data: { user: null },
            error: new Error('Auth error'),
          }),
      },
    } as never);

    // Render layout
    await DashboardLayout({ children: <div>Test Content</div> });

    // Should redirect to login
    expect(redirect).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
  });

  it('should render children when user is authenticated', async () => {
    // Mock authenticated state
    const { createClient } = await import('@/lib/supabase/server');
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
            },
          },
          error: null,
        }),
      },
    } as never);

    // Render layout
    const result = await DashboardLayout({
      children: <div>Test Content</div>,
    });

    // Should NOT redirect
    expect(redirect).not.toHaveBeenCalled();

    // Should render children (result should contain the children)
    expect(result).toBeDefined();
  });

  it('should render children when E2E auth cookies are present', async () => {
    // Mock E2E cookies present
    mockCookieStore.get.mockImplementation((name: string) => {
      if (name === 'beak_access_token') {
        return { name: 'beak_access_token', value: 'e2e-test-token' };
      }
      if (name === 'beak_user_id') {
        return { name: 'beak_user_id', value: 'e2e-test-user-id' };
      }
      return undefined;
    });

    // Render layout (should NOT call Supabase)
    const result = await DashboardLayout({
      children: <div>Test Content</div>,
    });

    // Should NOT redirect
    expect(redirect).not.toHaveBeenCalled();

    // Should render children
    expect(result).toBeDefined();

    // Should NOT call Supabase auth (E2E bypass)
    const { createClient } = await import('@/lib/supabase/server');
    expect(createClient).not.toHaveBeenCalled();
  });
});
