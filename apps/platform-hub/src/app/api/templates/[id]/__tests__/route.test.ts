/**
 * Tests for template DELETE endpoint (direct DB queries)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '../route';

// Mock getApiUser
vi.mock('@joolie-boolie/auth', () => ({
  getApiUser: vi.fn().mockResolvedValue({ id: 'user-1', email: 'test@example.com' }),
}));

// Mock Supabase server client (fallback auth)
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
    })
  ),
  createServiceRoleClient: vi.fn(() => 'mock-service-client'),
}));

// Mock database functions
const mockDeleteBingoTemplate = vi.fn();
const mockDeleteTriviaTemplate = vi.fn();
const mockUserOwnsBingoTemplate = vi.fn();
const mockUserOwnsTriviaTemplate = vi.fn();
vi.mock('@joolie-boolie/database', () => ({
  deleteBingoTemplate: (...args: unknown[]) => mockDeleteBingoTemplate(...args),
  deleteTriviaTemplate: (...args: unknown[]) => mockDeleteTriviaTemplate(...args),
  userOwnsBingoTemplate: (...args: unknown[]) => mockUserOwnsBingoTemplate(...args),
  userOwnsTriviaTemplate: (...args: unknown[]) => mockUserOwnsTriviaTemplate(...args),
}));

describe('DELETE /api/templates/[id]', () => {
  beforeEach(() => {
    mockDeleteBingoTemplate.mockReset();
    mockDeleteTriviaTemplate.mockReset();
    mockUserOwnsBingoTemplate.mockReset();
    mockUserOwnsTriviaTemplate.mockReset();
    mockGetUser.mockReset();
    // Default: Supabase session auth also fails
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    });
  });

  it('should return 401 when not authenticated via any method', async () => {
    const { getApiUser } = await import('@joolie-boolie/auth');
    vi.mocked(getApiUser).mockResolvedValueOnce(null);
    // Supabase fallback also fails (default mock above)

    const request = new NextRequest(
      'http://localhost:3002/api/templates/bingo-1?game=bingo'
    );
    const params = Promise.resolve({ id: 'bingo-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(mockDeleteBingoTemplate).not.toHaveBeenCalled();
  });

  it('should authenticate via Supabase session when OAuth token is absent', async () => {
    const { getApiUser } = await import('@joolie-boolie/auth');
    // OAuth SSO auth fails
    vi.mocked(getApiUser).mockResolvedValueOnce(null);
    // Supabase session auth succeeds
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: 'supabase-user-1', email: 'supabase@example.com' } },
      error: null,
    });

    mockUserOwnsBingoTemplate.mockResolvedValueOnce(true);
    mockDeleteBingoTemplate.mockResolvedValueOnce(undefined);

    const request = new NextRequest(
      'http://localhost:3002/api/templates/bingo-1?game=bingo'
    );
    const params = Promise.resolve({ id: 'bingo-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(mockUserOwnsBingoTemplate).toHaveBeenCalledWith('mock-service-client', 'supabase-user-1', 'bingo-1');
  });

  it('should delete a bingo template', async () => {
    mockUserOwnsBingoTemplate.mockResolvedValueOnce(true);
    mockDeleteBingoTemplate.mockResolvedValueOnce(undefined);

    const request = new NextRequest(
      'http://localhost:3002/api/templates/bingo-1?game=bingo'
    );
    const params = Promise.resolve({ id: 'bingo-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(mockUserOwnsBingoTemplate).toHaveBeenCalledWith('mock-service-client', 'user-1', 'bingo-1');
    expect(mockDeleteBingoTemplate).toHaveBeenCalledWith('mock-service-client', 'bingo-1');
    expect(data.success).toBe(true);
  });

  it('should delete a trivia template', async () => {
    mockUserOwnsTriviaTemplate.mockResolvedValueOnce(true);
    mockDeleteTriviaTemplate.mockResolvedValueOnce(undefined);

    const request = new NextRequest(
      'http://localhost:3002/api/templates/trivia-1?game=trivia'
    );
    const params = Promise.resolve({ id: 'trivia-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(mockUserOwnsTriviaTemplate).toHaveBeenCalledWith('mock-service-client', 'user-1', 'trivia-1');
    expect(mockDeleteTriviaTemplate).toHaveBeenCalledWith('mock-service-client', 'trivia-1');
    expect(data.success).toBe(true);
  });

  it('should return 400 if game parameter is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3002/api/templates/template-1'
    );
    const params = Promise.resolve({ id: 'template-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Game parameter required (bingo or trivia)');
    expect(mockDeleteBingoTemplate).not.toHaveBeenCalled();
    expect(mockDeleteTriviaTemplate).not.toHaveBeenCalled();
  });

  it('should return 400 if game parameter is invalid', async () => {
    const request = new NextRequest(
      'http://localhost:3002/api/templates/template-1?game=invalid'
    );
    const params = Promise.resolve({ id: 'template-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Game parameter required (bingo or trivia)');
    expect(mockDeleteBingoTemplate).not.toHaveBeenCalled();
    expect(mockDeleteTriviaTemplate).not.toHaveBeenCalled();
  });

  it('should return 404 if user does not own the bingo template', async () => {
    mockUserOwnsBingoTemplate.mockResolvedValueOnce(false);

    const request = new NextRequest(
      'http://localhost:3002/api/templates/nonexistent?game=bingo'
    );
    const params = Promise.resolve({ id: 'nonexistent' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
    expect(mockDeleteBingoTemplate).not.toHaveBeenCalled();
  });

  it('should return 404 if user does not own the trivia template', async () => {
    mockUserOwnsTriviaTemplate.mockResolvedValueOnce(false);

    const request = new NextRequest(
      'http://localhost:3002/api/templates/nonexistent?game=trivia'
    );
    const params = Promise.resolve({ id: 'nonexistent' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
    expect(mockDeleteTriviaTemplate).not.toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    mockUserOwnsBingoTemplate.mockResolvedValueOnce(true);
    mockDeleteBingoTemplate.mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(
      'http://localhost:3002/api/templates/template-1?game=bingo'
    );
    const params = Promise.resolve({ id: 'template-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete template');
  });
});
