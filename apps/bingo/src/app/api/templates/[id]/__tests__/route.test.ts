import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import { NextRequest } from 'next/server';

// Mock the auth utilities (matches the pattern used by the route handler)
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),
  createAuthenticatedClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@joolie-boolie/database/tables', () => ({
  getBingoTemplate: vi.fn(),
  updateBingoTemplate: vi.fn(),
  deleteBingoTemplate: vi.fn(),
  AUTO_CALL_INTERVAL_MIN: 1000,
  AUTO_CALL_INTERVAL_MAX: 30000,
}));

vi.mock('@joolie-boolie/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  getBingoTemplate,
  updateBingoTemplate,
  deleteBingoTemplate,
} from '@joolie-boolie/database/tables';
import { isDatabaseError } from '@joolie-boolie/database/errors';
import type { BingoTemplate } from '@joolie-boolie/database/types';

const mockGetApiUser = getApiUser as ReturnType<typeof vi.fn>;
const mockCreateAuthenticatedClient = createAuthenticatedClient as ReturnType<typeof vi.fn>;

/**
 * Helper to create a mock request with jb_access_token cookie
 */
function createMockRequest(url: string, init?: { method?: string; body?: string }) {
  const request = new NextRequest(url, init);
  // Set the jb_access_token cookie for authenticated requests
  request.cookies.set('jb_access_token', 'test-jwt-token');
  return request;
}

describe('GET /api/templates/[id]', () => {
  const mockGet = getBingoTemplate as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates/template-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when template not found', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const notFoundError = { message: 'bingo_templates with id \'template-1\' not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates/template-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('returns template successfully', async () => {
    const mockTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Template',
      pattern_id: 'horizontal',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(mockTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.template).toEqual(mockTemplate);
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
  });

  it('returns 404 when user does not own the template', async () => {
    const otherUsersTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'other-user-id',
      name: 'Other User Template',
      pattern_id: 'horizontal',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
  });

  it('handles non-database errors with 500', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const genericError = new Error('Unexpected runtime error');
    mockGet.mockRejectedValue(genericError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const request = createMockRequest('http://localhost/api/templates/template-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('PATCH /api/templates/[id]', () => {
  const mockGet = getBingoTemplate as ReturnType<typeof vi.fn>;
  const mockUpdate = updateBingoTemplate as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when auto_call_interval is out of range', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ auto_call_interval: 40000 }), // Too high
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('auto_call_interval');
  });

  it('returns 404 when user does not own the template', async () => {
    const otherUsersTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'other-user-id',
      name: 'Other User Template',
      pattern_id: 'horizontal',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Hijacked Name' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when template not found or access denied', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const notFoundError = { message: 'bingo_templates with id \'template-1\' not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Updated' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toContain('not found');
  });

  it('updates template successfully', async () => {
    const existingTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Template',
      pattern_id: 'horizontal',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const updatedTemplate: BingoTemplate = {
      ...existingTemplate,
      name: 'Updated Template',
      pattern_id: 'vertical',
      voice_pack: 'british',
      auto_call_enabled: true,
      auto_call_interval: 15000,
      is_default: true,
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(existingTemplate);
    mockUpdate.mockResolvedValue(updatedTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({
        name: 'Updated Template',
        pattern_id: 'vertical',
        voice_pack: 'british',
        auto_call_enabled: true,
        auto_call_interval: 15000,
        is_default: true,
      }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.template).toEqual(updatedTemplate);
    expect(mockUpdate).toHaveBeenCalledWith(
      mockSupabaseClient,
      'template-1',
      expect.objectContaining({
        name: 'Updated Template',
        pattern_id: 'vertical',
        voice_pack: 'british',
        auto_call_enabled: true,
        auto_call_interval: 15000,
        is_default: true,
      })
    );
  });

  it('updates only provided fields', async () => {
    const existingTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Template',
      pattern_id: 'horizontal',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    const updatedTemplate: BingoTemplate = {
      ...existingTemplate,
      name: 'Partial Update',
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(existingTemplate);
    mockUpdate.mockResolvedValue(updatedTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Partial Update' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      mockSupabaseClient,
      'template-1',
      { name: 'Partial Update' }
    );
  });

  it('handles non-database errors with 500', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const genericError = new Error('Unexpected runtime error');
    mockGet.mockRejectedValue(genericError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Test' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('DELETE /api/templates/[id]', () => {
  const mockGet = getBingoTemplate as ReturnType<typeof vi.fn>;
  const mockDelete = deleteBingoTemplate as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('deletes template successfully', async () => {
    const existingTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Template',
      pattern_id: 'horizontal',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockGet.mockResolvedValue(existingTemplate);
    mockDelete.mockResolvedValue(undefined);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
    expect(mockDelete).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
  });

  it('returns 404 when user does not own the template', async () => {
    const otherUsersTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'other-user-id',
      name: 'Other User Template',
      pattern_id: 'horizontal',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'requesting-user-id', email: 'test@example.com' });
    mockGet.mockResolvedValue(otherUsersTemplate);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Not found');
    expect(mockGet).toHaveBeenCalledWith(mockSupabaseClient, 'template-1');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const dbError = { message: 'Cannot delete default template', statusCode: 400 };
    mockGet.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Cannot delete default template');
  });
});
