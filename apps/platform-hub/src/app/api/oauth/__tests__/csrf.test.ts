/**
 * CSRF Token Generation API Route Tests
 *
 * Tests for CSRF token generation endpoint.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../csrf/route';

// Mock CSRF functions
vi.mock('@/lib/csrf', () => ({
  generateCsrfToken: vi.fn(),
  setCsrfToken: vi.fn(),
}));

import { generateCsrfToken, setCsrfToken } from '@/lib/csrf';

describe('GET /api/oauth/csrf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate and return CSRF token', async () => {
    const mockToken = 'mock-csrf-token-base64';
    vi.mocked(generateCsrfToken).mockReturnValue(mockToken);
    vi.mocked(setCsrfToken).mockResolvedValue();

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.token).toBe(mockToken);
    expect(generateCsrfToken).toHaveBeenCalled();
    expect(setCsrfToken).toHaveBeenCalledWith(mockToken);
  });

  it('should store token in cookie', async () => {
    const mockToken = 'mock-csrf-token-base64';
    vi.mocked(generateCsrfToken).mockReturnValue(mockToken);
    vi.mocked(setCsrfToken).mockResolvedValue();

    await GET();

    expect(setCsrfToken).toHaveBeenCalledWith(mockToken);
  });

  it('should return 500 on error', async () => {
    vi.mocked(generateCsrfToken).mockImplementation(() => {
      throw new Error('Token generation failed');
    });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate CSRF token');
  });

  it('should return 500 if setCsrfToken fails', async () => {
    const mockToken = 'mock-csrf-token-base64';
    vi.mocked(generateCsrfToken).mockReturnValue(mockToken);
    vi.mocked(setCsrfToken).mockRejectedValue(new Error('Cookie setting failed'));

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to generate CSRF token');
  });
});
