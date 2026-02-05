import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';

// Mock the Supabase server client
vi.mock('@beak-gaming/database/server', () => ({
  createClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@beak-gaming/database/tables', () => ({
  listAllBingoTemplates: vi.fn(),
  createBingoTemplate: vi.fn(),
  AUTO_CALL_INTERVAL_MIN: 1000,
  AUTO_CALL_INTERVAL_MAX: 30000,
}));

vi.mock('@beak-gaming/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

import { createClient } from '@beak-gaming/database/server';
import {
  listAllBingoTemplates,
  createBingoTemplate,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { BingoTemplate } from '@beak-gaming/database/types';

describe('GET /api/templates', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockListAll = listAllBingoTemplates as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns templates for authenticated user', async () => {
    const mockTemplates: BingoTemplate[] = [
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
    ];

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockListAll.mockResolvedValue(mockTemplates);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.templates).toEqual(mockTemplates);
    expect(mockListAll).toHaveBeenCalledWith(expect.anything(), 'user-123');
  });

  it('handles database errors', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const dbError = { message: 'Database error', statusCode: 503 };
    mockListAll.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe('Database error');
  });
});

describe('POST /api/templates', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockCreate = createBingoTemplate as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test', pattern_id: 'horizontal' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when name is missing', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ pattern_id: 'horizontal' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('name');
  });

  it('returns 400 when pattern_id is missing', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Template' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('pattern_id');
  });

  it('returns 400 when auto_call_interval is out of range', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates', {
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

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockCreate.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates', {
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
      expect.anything(),
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

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockCreate.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates', {
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
      expect.anything(),
      expect.objectContaining({
        voice_pack: 'classic',
        auto_call_enabled: false,
        auto_call_interval: 5000,
        is_default: false,
      })
    );
  });

  it('handles database errors', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const dbError = { message: 'Duplicate template name', statusCode: 409 };
    mockCreate.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = new NextRequest('http://localhost/api/templates', {
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
