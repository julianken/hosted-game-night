/**
 * Tests for Audit Middleware Utilities
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi } from 'vitest';
import {
  extractIpAddress,
  extractUserAgent,
  extractRequestMetadata,
  auditAuthorizationSuccess,
  auditAuthorizationDenial,
  auditAuthorizationError,
} from '../audit-middleware';

// Mock the audit log functions
vi.mock('@/lib/audit-log', () => ({
  logAuthorizationSuccess: vi.fn(() => Promise.resolve({ id: 'mock-log-id' })),
  logAuthorizationDenial: vi.fn(() => Promise.resolve({ id: 'mock-log-id' })),
  logAuthorizationError: vi.fn(() => Promise.resolve({ id: 'mock-log-id' })),
}));

// Helper to create mock Request objects
function createMockRequest(headers: Record<string, string>): Request {
  return {
    headers: new Headers(headers),
  } as Request;
}

describe('Audit Middleware Utilities', () => {
  describe('extractIpAddress', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      });

      const ip = extractIpAddress(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract single IP from x-forwarded-for', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      });

      const ip = extractIpAddress(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.100',
      });

      const ip = extractIpAddress(request);
      expect(ip).toBe('192.168.1.100');
    });

    it('should extract IP from x-vercel-forwarded-for header', () => {
      const request = createMockRequest({
        'x-vercel-forwarded-for': '192.168.1.200',
      });

      const ip = extractIpAddress(request);
      expect(ip).toBe('192.168.1.200');
    });

    it('should prioritize x-forwarded-for over x-real-ip', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.100',
      });

      const ip = extractIpAddress(request);
      expect(ip).toBe('192.168.1.1');
    });

    it('should prioritize x-real-ip over x-vercel-forwarded-for', () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.100',
        'x-vercel-forwarded-for': '192.168.1.200',
      });

      const ip = extractIpAddress(request);
      expect(ip).toBe('192.168.1.100');
    });

    it('should return undefined when no IP headers present', () => {
      const request = createMockRequest({});

      const ip = extractIpAddress(request);
      expect(ip).toBeUndefined();
    });

    it('should handle IPv6 addresses', () => {
      const request = createMockRequest({
        'x-forwarded-for': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      });

      const ip = extractIpAddress(request);
      expect(ip).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });
  });

  describe('extractUserAgent', () => {
    it('should extract user agent from header', () => {
      const request = createMockRequest({
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      });

      const userAgent = extractUserAgent(request);
      expect(userAgent).toBe('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)');
    });

    it('should return undefined when user-agent header is missing', () => {
      const request = createMockRequest({});

      const userAgent = extractUserAgent(request);
      expect(userAgent).toBeUndefined();
    });
  });

  describe('extractRequestMetadata', () => {
    it('should extract both IP and user agent', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      });

      const metadata = extractRequestMetadata(request);
      expect(metadata).toEqual({
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });
    });

    it('should handle missing headers gracefully', () => {
      const request = createMockRequest({});

      const metadata = extractRequestMetadata(request);
      expect(metadata).toEqual({
        ipAddress: undefined,
        userAgent: undefined,
      });
    });

    it('should handle partial headers', () => {
      const request = createMockRequest({
        'user-agent': 'Mozilla/5.0',
      });

      const metadata = extractRequestMetadata(request);
      expect(metadata).toEqual({
        ipAddress: undefined,
        userAgent: 'Mozilla/5.0',
      });
    });
  });

  describe('auditAuthorizationSuccess', () => {
    it('should call logAuthorizationSuccess with extracted metadata', async () => {
      const { logAuthorizationSuccess } = await import('@/lib/audit-log');

      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0',
      });

      await auditAuthorizationSuccess(
        request,
        'user-123',
        'client-456',
        'auth-789',
        ['openid', 'email']
      );

      expect(logAuthorizationSuccess).toHaveBeenCalledWith(
        'user-123',
        'client-456',
        'auth-789',
        ['openid', 'email'],
        '192.168.1.1',
        'Mozilla/5.0'
      );
    });
  });

  describe('auditAuthorizationDenial', () => {
    it('should call logAuthorizationDenial with extracted metadata', async () => {
      const { logAuthorizationDenial } = await import('@/lib/audit-log');

      const request = createMockRequest({
        'x-real-ip': '192.168.1.100',
        'user-agent': 'Chrome/120.0',
      });

      await auditAuthorizationDenial(
        request,
        'user-123',
        'client-456',
        'auth-789',
        'user_cancelled'
      );

      expect(logAuthorizationDenial).toHaveBeenCalledWith(
        'user-123',
        'client-456',
        'auth-789',
        'user_cancelled',
        '192.168.1.100',
        'Chrome/120.0'
      );
    });
  });

  describe('auditAuthorizationError', () => {
    it('should call logAuthorizationError with extracted metadata', async () => {
      const { logAuthorizationError } = await import('@/lib/audit-log');

      const request = createMockRequest({
        'x-vercel-forwarded-for': '192.168.1.200',
        'user-agent': 'Safari/17.0',
      });

      await auditAuthorizationError(
        request,
        'client-456',
        'auth-789',
        'invalid_request',
        'Missing parameter',
        'user-123'
      );

      expect(logAuthorizationError).toHaveBeenCalledWith(
        'client-456',
        'auth-789',
        'invalid_request',
        'Missing parameter',
        'user-123',
        '192.168.1.200',
        'Safari/17.0'
      );
    });

    it('should work without user_id', async () => {
      const { logAuthorizationError } = await import('@/lib/audit-log');

      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
      });

      await auditAuthorizationError(
        request,
        'client-456',
        undefined,
        'invalid_client',
        'Client not found'
      );

      expect(logAuthorizationError).toHaveBeenCalledWith(
        'client-456',
        undefined,
        'invalid_client',
        'Client not found',
        undefined,
        '192.168.1.1',
        undefined
      );
    });
  });
});
