import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

// Mock the Supabase server client
vi.mock('@beak-gaming/database/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@beak-gaming/database/server';

describe('health endpoint', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 200 when auth and database are healthy', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: 'test-user' } } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.auth).toBe('connected');
    expect(data.session).toBe('active');
    expect(data.database).toBe('profiles table accessible');
  });

  it('returns 200 with no session when user not logged in', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.session).toBe('none');
  });

  it('returns 500 when auth connection fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Auth service unavailable' },
        }),
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.status).toBe('error');
    expect(data.message).toBe('Auth connection failed');
    expect(data.error).toBe('Auth service unavailable');
  });

  it('returns 200 with table issue when profiles table is not accessible', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            error: { message: 'relation "profiles" does not exist' },
          }),
        }),
      }),
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.database).toBe('table issue: relation "profiles" does not exist');
  });

  it('returns 500 when unexpected error occurs', async () => {
    mockCreateClient.mockRejectedValue(new Error('Connection timeout'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.status).toBe('error');
    expect(data.message).toBe('Connection failed');
    expect(data.error).toBe('Connection timeout');
  });

  it('handles non-Error exceptions gracefully', async () => {
    mockCreateClient.mockRejectedValue('Unknown error string');

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.status).toBe('error');
    expect(data.error).toBe('Unknown error');
  });
});
