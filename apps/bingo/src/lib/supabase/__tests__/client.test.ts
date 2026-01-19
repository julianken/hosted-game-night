import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to set env vars BEFORE module imports are evaluated
// This runs before any imports, unlike regular vi.stubEnv
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

// Mock @supabase/ssr
vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn(() => ({ auth: {}, from: vi.fn() })),
}));

import { createClient } from '../client';
import { createBrowserClient } from '@supabase/ssr';

describe('supabase client', () => {
  const mockCreateBrowserClient = createBrowserClient as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a browser client with correct environment variables', () => {
    const mockClient = { auth: {}, from: vi.fn() };
    mockCreateBrowserClient.mockReturnValue(mockClient);

    const client = createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    );
    expect(client).toBe(mockClient);
  });

  it('returns a client instance', () => {
    const mockClient = { auth: { getUser: vi.fn() }, from: vi.fn() };
    mockCreateBrowserClient.mockReturnValue(mockClient);

    const client = createClient();

    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
    expect(client.from).toBeDefined();
  });
});
