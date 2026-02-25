import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import { NextRequest } from 'next/server';

// Mock the auth utilities
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),
  createAuthenticatedClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@joolie-boolie/database/tables', () => ({
  getTriviaPreset: vi.fn(),
  updateTriviaPreset: vi.fn(),
  deleteTriviaPreset: vi.fn(),
}));

vi.mock('@joolie-boolie/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  getTriviaPreset,
  updateTriviaPreset,
  deleteTriviaPreset,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { TriviaPreset } from '@joolie-boolie/database/types';

const mockGetApiUser = getApiUser as ReturnType<typeof vi.fn>;
const mockCreateAuthenticatedClient = createAuthenticatedClient as ReturnType<typeof vi.fn>;

/**
 * Helper to create a mock request with jb_access_token cookie
 */
function createMockRequest(url: string, init?: { method?: string; body?: string }) {
  const request = new NextRequest(url, init);
  request.cookies.set('jb_access_token', 'test-jwt-token');
  return request;
}

const mockPreset: TriviaPreset = {
  id: 'preset-1',
  user_id: 'user-123',
  name: 'My Preset',
  rounds_count: 3,
  questions_per_round: 10,
  timer_duration: 30,
  is_default: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

describe('GET /api/presets/[id]', () => {
  const mockGet = getTriviaPreset as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/presets/preset-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns preset successfully', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(mockPreset);

    const request = createMockRequest('http://localhost/api/presets/preset-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.preset).toEqual(mockPreset);
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'preset-1');
  });

  it('returns 404 when user does not own the preset', async () => {
    const otherUsersPreset: TriviaPreset = {
      ...mockPreset,
      user_id: 'other-user-id',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersPreset);

    const request = createMockRequest('http://localhost/api/presets/preset-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'preset-1');
  });

  it('handles not found errors from database', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const notFoundError = { message: 'Preset not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/presets/nonexistent');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Preset not found');
  });

  it('handles non-database errors with 500', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const genericError = new Error('Unexpected runtime error');
    mockGet.mockRejectedValue(genericError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const request = createMockRequest('http://localhost/api/presets/preset-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('PATCH /api/presets/[id]', () => {
  const mockGet = getTriviaPreset as ReturnType<typeof vi.fn>;
  const mockUpdate = updateTriviaPreset as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/presets/preset-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when user does not own the preset', async () => {
    const otherUsersPreset: TriviaPreset = {
      ...mockPreset,
      user_id: 'other-user-id',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersPreset);

    const request = createMockRequest('http://localhost/api/presets/preset-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hijacked Name' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'preset-1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('updates preset successfully', async () => {
    const updatedPreset: TriviaPreset = {
      ...mockPreset,
      name: 'Updated Preset',
      rounds_count: 5,
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(mockPreset);
    mockUpdate.mockResolvedValue(updatedPreset);

    const request = createMockRequest('http://localhost/api/presets/preset-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated Preset', rounds_count: 5 }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.preset).toEqual(updatedPreset);
    expect(mockUpdate).toHaveBeenCalledWith(
      mockSupabaseClient,
      'preset-1',
      expect.objectContaining({ name: 'Updated Preset', rounds_count: 5 })
    );
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const notFoundError = { message: 'Preset not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/presets/nonexistent', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'nonexistent' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Preset not found');
  });
});

describe('DELETE /api/presets/[id]', () => {
  const mockGet = getTriviaPreset as ReturnType<typeof vi.fn>;
  const mockDelete = deleteTriviaPreset as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/presets/preset-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('deletes preset successfully', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(mockPreset);
    mockDelete.mockResolvedValue(undefined);

    const request = createMockRequest('http://localhost/api/presets/preset-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'preset-1');
    expect(mockDelete).toHaveBeenCalledWith(mockSupabaseClient, 'preset-1');
  });

  it('returns 404 when user does not own the preset', async () => {
    const otherUsersPreset: TriviaPreset = {
      ...mockPreset,
      user_id: 'other-user-id',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersPreset);

    const request = createMockRequest('http://localhost/api/presets/preset-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'preset-1');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const dbError = { message: 'Database error', statusCode: 503 };
    mockGet.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/presets/preset-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'preset-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Database error');
  });
});
