/**
 * Cron Cleanup Sessions Route Tests — GET /api/cron/cleanup-sessions
 *
 * Tests for the cron job that marks expired game sessions.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock cron auth
vi.mock('@/lib/cron-auth', () => ({
  verifyCronAuth: vi.fn(),
}));

// Mock Supabase service role client
const mockRpc = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}));

// Mock logger
vi.mock('@joolie-boolie/error-tracking/server-logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { GET } from '../route';
import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';

const mockVerifyCronAuth = verifyCronAuth as ReturnType<typeof vi.fn>;

function createCronRequest() {
  return new NextRequest('http://localhost:3002/api/cron/cleanup-sessions', {
    headers: { authorization: 'Bearer test-cron-secret' },
  });
}

describe('GET /api/cron/cleanup-sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 when verifyCronAuth returns an error response', async () => {
      const authErrorResponse = NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
      mockVerifyCronAuth.mockReturnValue(authErrorResponse);

      const request = createCronRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('proceeds when verifyCronAuth returns null (authorized)', async () => {
      mockVerifyCronAuth.mockReturnValue(null);
      mockRpc.mockResolvedValue({ data: 3, error: null });

      const request = createCronRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('passes the request to verifyCronAuth', async () => {
      mockVerifyCronAuth.mockReturnValue(null);
      mockRpc.mockResolvedValue({ data: 0, error: null });

      const request = createCronRequest();
      await GET(request);

      expect(mockVerifyCronAuth).toHaveBeenCalledWith(request);
    });
  });

  describe('Successful Cleanup', () => {
    it('returns success with updatedCount when RPC returns a number', async () => {
      mockVerifyCronAuth.mockReturnValue(null);
      mockRpc.mockResolvedValue({ data: 7, error: null });

      const request = createCronRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(7);
      expect(mockRpc).toHaveBeenCalledWith('cleanup_expired_sessions');
    });

    it('includes timestamp in response', async () => {
      mockVerifyCronAuth.mockReturnValue(null);
      mockRpc.mockResolvedValue({ data: 0, error: null });

      const request = createCronRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(data.timestamp).toBeDefined();
      // Verify it's a valid ISO timestamp
      expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
    });
  });

  describe('Bug Reproduction', () => {
    it('returns updatedCount as 0 when RPC returns null (FIXED: unvalidated data cast)', async () => {
      // FIXED: Previously, `data as number` would alias `null` as `number`,
      // resulting in `updatedCount: null` in the response.
      // Now `typeof data === 'number' ? data : 0` ensures a proper number.
      mockVerifyCronAuth.mockReturnValue(null);
      mockRpc.mockResolvedValue({ data: null, error: null });

      const request = createCronRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // FIXED: updatedCount should be 0, not null
      expect(data.updatedCount).toBe(0);
    });

    it('returns updatedCount as 0 when no sessions were expired', async () => {
      mockVerifyCronAuth.mockReturnValue(null);
      mockRpc.mockResolvedValue({ data: 0, error: null });

      const request = createCronRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.updatedCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('returns 500 with database error message when RPC fails', async () => {
      mockVerifyCronAuth.mockReturnValue(null);
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'function not found' },
      });

      const request = createCronRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('function not found');
    });

    it('returns 500 on unexpected thrown error', async () => {
      mockVerifyCronAuth.mockReturnValue(null);
      mockRpc.mockRejectedValue(new Error('Network timeout'));

      const request = createCronRequest();
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Network timeout');
    });
  });
});
