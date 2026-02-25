import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the auth utilities
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn(),
  createAuthenticatedClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@joolie-boolie/database/tables', () => ({
  listBingoTemplates: vi.fn(),
  createBingoTemplate: vi.fn(),
  AUTO_CALL_INTERVAL_MIN: 1000,
  AUTO_CALL_INTERVAL_MAX: 30000,
}));

vi.mock('@joolie-boolie/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

vi.mock('@joolie-boolie/database/pagination', () => ({
  parsePaginationParams: vi.fn().mockReturnValue({
    page: undefined,
    pageSize: undefined,
    cursor: undefined,
  }),
}));

import { getApiUser, createAuthenticatedClient } from '@joolie-boolie/auth';
import {
  listBingoTemplates,
  createBingoTemplate,
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

describe('GET /api/templates', () => {
  const mockList = listBingoTemplates as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns paginated templates for authenticated user', async () => {
    const mockPaginatedResult = {
      data: [
        {
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
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasMore: false,
      },
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockList.mockResolvedValue(mockPaginatedResult);

    const request = createMockRequest('http://localhost/api/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockPaginatedResult.data);
    expect(data.pagination).toEqual(mockPaginatedResult.pagination);
    expect(mockList).toHaveBeenCalledWith(mockSupabaseClient, 'user-123', expect.any(Object));
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const dbError = { message: 'Database error', statusCode: 503 };
    mockList.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Database error');
  });
});

describe('POST /api/templates', () => {
  const mockCreate = createBingoTemplate as ReturnType<typeof vi.fn>;
  const mockSupabaseClient = { from: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateAuthenticatedClient.mockReturnValue(mockSupabaseClient);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockGetApiUser.mockResolvedValue(null);

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', pattern_id: 'horizontal' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when name is missing', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ pattern_id: 'horizontal' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('name');
  });

  it('returns 400 when pattern_id is missing', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Template' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('pattern_id');
  });

  it('returns 400 when auto_call_interval is out of range', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test',
        pattern_id: 'horizontal',
        auto_call_interval: 500, // Too low
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('auto_call_interval');
  });

  it('creates template successfully', async () => {
    const mockTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'My Template',
      pattern_id: 'horizontal',
      voice_pack: 'classic',
      auto_call_enabled: true,
      auto_call_interval: 10000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockCreate.mockResolvedValue(mockTemplate);

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'My Template',
        pattern_id: 'horizontal',
        voice_pack: 'british',
        auto_call_enabled: true,
        auto_call_interval: 10000,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.template).toEqual(mockTemplate);
    expect(mockCreate).toHaveBeenCalledWith(
      mockSupabaseClient,
      expect.objectContaining({
        user_id: 'user-123',
        name: 'My Template',
        pattern_id: 'horizontal',
        voice_pack: 'british',
        auto_call_enabled: true,
        auto_call_interval: 10000,
      })
    );
  });

  it('applies default values when optional fields are missing', async () => {
    const mockTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'Basic Template',
      pattern_id: 'vertical',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };

    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });
    mockCreate.mockResolvedValue(mockTemplate);

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Basic Template',
        pattern_id: 'vertical',
      }),
    });

    const response = await POST(request);
    await response.json();

    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(
      mockSupabaseClient,
      expect.objectContaining({
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
      })
    );
  });

  it('handles database errors', async () => {
    mockGetApiUser.mockResolvedValue({ id: 'user-123', email: 'test@example.com' });

    const dbError = { message: 'Duplicate template name', statusCode: 409 };
    mockCreate.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = createMockRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Duplicate',
        pattern_id: 'horizontal',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe('Duplicate template name');
  });
});
