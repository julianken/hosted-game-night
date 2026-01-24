/**
 * Tests for template DELETE endpoint
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../route';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('DELETE /api/templates/[id]', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should delete a bingo template', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const request = new Request(
      'http://localhost:3002/api/templates/bingo-1?game=bingo'
    );
    const params = Promise.resolve({ id: 'bingo-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/templates/bingo-1',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(data.success).toBe(true);
  });

  it('should delete a trivia template', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const request = new Request(
      'http://localhost:3002/api/templates/trivia-1?game=trivia'
    );
    const params = Promise.resolve({ id: 'trivia-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/templates/trivia-1',
      expect.objectContaining({
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      })
    );
    expect(data.success).toBe(true);
  });

  it('should return 400 if game parameter is missing', async () => {
    const request = new Request(
      'http://localhost:3002/api/templates/template-1'
    );
    const params = Promise.resolve({ id: 'template-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Game parameter required (bingo or trivia)');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return 400 if game parameter is invalid', async () => {
    const request = new Request(
      'http://localhost:3002/api/templates/template-1?game=invalid'
    );
    const params = Promise.resolve({ id: 'template-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Game parameter required (bingo or trivia)');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should return error if game API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Template not found' }),
    });

    const request = new Request(
      'http://localhost:3002/api/templates/nonexistent?game=bingo'
    );
    const params = Promise.resolve({ id: 'nonexistent' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Template not found');
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const request = new Request(
      'http://localhost:3002/api/templates/template-1?game=bingo'
    );
    const params = Promise.resolve({ id: 'template-1' });

    const response = await DELETE(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to delete template');
  });

  it('should use correct port for bingo API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const request = new Request(
      'http://localhost:3002/api/templates/bingo-1?game=bingo'
    );
    const params = Promise.resolve({ id: 'bingo-1' });

    await DELETE(request, { params });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/templates/bingo-1',
      expect.any(Object)
    );
  });

  it('should use correct port for trivia API', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const request = new Request(
      'http://localhost:3002/api/templates/trivia-1?game=trivia'
    );
    const params = Promise.resolve({ id: 'trivia-1' });

    await DELETE(request, { params });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/templates/trivia-1',
      expect.any(Object)
    );
  });
});
