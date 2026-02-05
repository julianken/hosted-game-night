import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../route';
import { NextRequest } from 'next/server';

// Mock the Supabase server client
vi.mock('@beak-gaming/database/server', () => ({
  createClient: vi.fn(),
}));

// Mock the database functions
vi.mock('@beak-gaming/database/tables', () => ({
  getBingoTemplate: vi.fn(),
  updateBingoTemplate: vi.fn(),
  deleteBingoTemplate: vi.fn(),
  AUTO_CALL_INTERVAL_MIN: 1000,
  AUTO_CALL_INTERVAL_MAX: 30000,
}));

vi.mock('@beak-gaming/database/errors', () => ({
  isDatabaseError: vi.fn(),
}));

import { createClient } from '@beak-gaming/database/server';
import {
  getBingoTemplate,
  updateBingoTemplate,
  deleteBingoTemplate,
} from '@beak-gaming/database/tables';
import { isDatabaseError } from '@beak-gaming/database/errors';
import type { BingoTemplate } from '@beak-gaming/database/types';

describe('GET /api/templates/[id]', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockGet = getBingoTemplate as ReturnType<typeof vi.fn>;

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

    const request = new NextRequest('http://localhost/api/templates/template-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when template not found', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const notFoundError = { message: 'bingo_templates with id \'template-1\' not found', statusCode: 404 };
    mockGet.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = new NextRequest('http://localhost/api/templates/template-1');
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

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockGet.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates/template-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.template).toEqual(mockTemplate);
    expect(mockGet).toHaveBeenCalledWith(expect.anything(), 'template-1');
  });

  it('handles non-database errors with 500', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const genericError = new Error('Unexpected runtime error');
    mockGet.mockRejectedValue(genericError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const request = new NextRequest('http://localhost/api/templates/template-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('PATCH /api/templates/[id]', () => {
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockUpdate = updateBingoTemplate as ReturnType<typeof vi.fn>;

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

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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

  it('returns 404 when template not found or access denied', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const notFoundError = { message: 'bingo_templates with id \'template-1\' not found', statusCode: 404 };
    mockUpdate.mockRejectedValue(notFoundError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
    const mockTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'Updated Template',
      pattern_id: 'vertical',
      voice_pack: 'british',
      auto_call_enabled: true,
      auto_call_interval: 15000,
      is_default: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockUpdate.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
    expect(data.template).toEqual(mockTemplate);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
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
    const mockTemplate: BingoTemplate = {
      id: 'template-1',
      user_id: 'user-123',
      name: 'Partial Update',
      pattern_id: 'horizontal',
      voice_pack: 'classic',
      auto_call_enabled: false,
      auto_call_interval: 5000,
      is_default: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    };

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockUpdate.mockResolvedValue(mockTemplate);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Partial Update' }),
    });

    const response = await PATCH(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.anything(),
      'template-1',
      { name: 'Partial Update' }
    );
  });

  it('handles non-database errors with 500', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    const genericError = new Error('Unexpected runtime error');
    mockUpdate.mockRejectedValue(genericError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(false);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
  const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
  const mockDelete = deleteBingoTemplate as ReturnType<typeof vi.fn>;

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

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    });

    mockDelete.mockResolvedValue(undefined);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
      method: 'DELETE',
    });

    const response = await DELETE(request, {
      params: Promise.resolve({ id: 'template-1' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledWith(expect.anything(), 'template-1');
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

    const dbError = { message: 'Cannot delete default template', statusCode: 400 };
    mockDelete.mockRejectedValue(dbError);
    (isDatabaseError as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

    const request = new NextRequest('http://localhost/api/templates/template-1', {
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
