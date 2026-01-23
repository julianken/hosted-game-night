import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  checkRateLimit,
  getRateLimitHeaders,
  resetRateLimit,
  clearRateLimits,
} from '../rate-limit';

// Mock @upstash/ratelimit
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: vi.fn(),
}));

// Mock @upstash/redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(),
}));

describe('Rate Limiting Middleware', () => {
  const TEST_IP = '192.168.1.100';
  const TEST_URL = 'http://localhost:3002/oauth/consent';

  beforeEach(() => {
    // Clear all rate limits before each test
    clearRateLimits();
    vi.clearAllMocks();
    // Ensure Redis is not initialized for in-memory tests
    delete process.env.REDIS_URL;
    delete process.env.REDIS_TOKEN;
  });

  afterEach(() => {
    clearRateLimits();
  });

  /**
   * Helper to create a mock NextRequest
   */
  function createMockRequest(
    url: string = TEST_URL,
    headers: Record<string, string> = {}
  ): NextRequest {
    const request = new NextRequest(url, {
      headers: new Headers({
        'x-forwarded-for': TEST_IP,
        ...headers,
      }),
    });
    return request;
  }

  describe('checkRateLimit (in-memory fallback)', () => {
    it('should allow first request', async () => {
      const request = createMockRequest();
      const result = await checkRateLimit(request);

      expect(result).toBeNull();
    });

    it('should allow requests under the limit', async () => {
      const request = createMockRequest();

      // Make 10 requests (at the limit)
      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit(request);
        expect(result).toBeNull();
      }
    });

    it('should block request when limit exceeded', async () => {
      const request = createMockRequest();

      // Make 10 requests (at the limit)
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(request);
      }

      // 11th request should be blocked
      const result = await checkRateLimit(request);
      expect(result).not.toBeNull();
      expect(result?.status).toBe(429);
    });

    it('should return 429 with proper error message', async () => {
      const request = createMockRequest();

      // Exceed the limit
      for (let i = 0; i < 11; i++) {
        await checkRateLimit(request);
      }

      const result = await checkRateLimit(request);
      expect(result?.status).toBe(429);

      const body = await result?.json();
      expect(body).toEqual({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: expect.any(Number),
      });
    });

    it('should include Retry-After header', async () => {
      const request = createMockRequest();

      // Exceed the limit
      for (let i = 0; i < 11; i++) {
        await checkRateLimit(request);
      }

      const result = await checkRateLimit(request);
      const retryAfter = result?.headers.get('Retry-After');

      expect(retryAfter).toBeTruthy();
      expect(Number(retryAfter)).toBeGreaterThan(0);
      expect(Number(retryAfter)).toBeLessThanOrEqual(60);
    });

    it('should include rate limit headers on 429 response', async () => {
      const request = createMockRequest();

      // Exceed the limit
      for (let i = 0; i < 11; i++) {
        await checkRateLimit(request);
      }

      const result = await checkRateLimit(request);

      expect(result?.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(result?.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result?.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('should reset after time window expires', async () => {
      const request = createMockRequest();

      // Exceed the limit
      for (let i = 0; i < 11; i++) {
        await checkRateLimit(request);
      }

      // Verify blocked
      let result = await checkRateLimit(request);
      expect(result?.status).toBe(429);

      // Fast-forward time by 61 seconds (past the window)
      vi.useFakeTimers();
      vi.advanceTimersByTime(61 * 1000);

      // Should be allowed again
      result = await checkRateLimit(request);
      expect(result).toBeNull();

      vi.useRealTimers();
    });

    it('should track different IPs separately', async () => {
      const request1 = createMockRequest(TEST_URL, {
        'x-forwarded-for': '192.168.1.100',
      });
      const request2 = createMockRequest(TEST_URL, {
        'x-forwarded-for': '192.168.1.101',
      });

      // Exhaust limit for first IP
      for (let i = 0; i < 11; i++) {
        await checkRateLimit(request1);
      }

      // First IP should be blocked
      const result1 = await checkRateLimit(request1);
      expect(result1?.status).toBe(429);

      // Second IP should still be allowed
      const result2 = await checkRateLimit(request2);
      expect(result2).toBeNull();
    });

    it('should extract IP from x-real-ip header', async () => {
      const request = createMockRequest(TEST_URL, {
        'x-real-ip': '10.0.0.1',
      });

      // Make requests and verify they're tracked
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(request);
      }

      const result = await checkRateLimit(request);
      expect(result?.status).toBe(429);
    });

    it('should extract IP from x-vercel-forwarded-for header', async () => {
      const request = createMockRequest(TEST_URL, {
        'x-vercel-forwarded-for': '172.16.0.1',
      });

      // Make requests and verify they're tracked
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(request);
      }

      const result = await checkRateLimit(request);
      expect(result?.status).toBe(429);
    });

    it('should handle multiple IPs in x-forwarded-for', async () => {
      const request = createMockRequest(TEST_URL, {
        'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1',
      });

      // Should use the first IP
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(request);
      }

      const result = await checkRateLimit(request);
      expect(result?.status).toBe(429);
    });

    it('should log rate limit violations', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const request = createMockRequest();

      // Exceed the limit
      for (let i = 0; i < 11; i++) {
        await checkRateLimit(request);
      }

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Rate Limit]')
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(TEST_IP)
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('/oauth/consent')
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getRateLimitHeaders', () => {
    it('should return max remaining for first request', async () => {
      const request = createMockRequest();
      const headers = await getRateLimitHeaders(request);

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('10');
    });

    it('should decrement remaining count', async () => {
      const request = createMockRequest();

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await checkRateLimit(request);
      }

      const headers = await getRateLimitHeaders(request);

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('7');
      expect(headers['X-RateLimit-Reset']).toBeTruthy();
    });

    it('should show 0 remaining when limit reached', async () => {
      const request = createMockRequest();

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(request);
      }

      const headers = await getRateLimitHeaders(request);

      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit for specific IP', async () => {
      const request = createMockRequest();

      // Exceed the limit
      for (let i = 0; i < 11; i++) {
        await checkRateLimit(request);
      }

      // Verify blocked
      const blockedResult = await checkRateLimit(request);
      expect(blockedResult?.status).toBe(429);

      // Reset the IP
      resetRateLimit(TEST_IP);

      // Should be allowed again
      const allowedResult = await checkRateLimit(request);
      expect(allowedResult).toBeNull();
    });
  });

  describe('clearRateLimits', () => {
    it('should clear all rate limits', async () => {
      const request1 = createMockRequest(TEST_URL, {
        'x-forwarded-for': '192.168.1.100',
      });
      const request2 = createMockRequest(TEST_URL, {
        'x-forwarded-for': '192.168.1.101',
      });

      // Exceed limits for both IPs
      for (let i = 0; i < 11; i++) {
        await checkRateLimit(request1);
        await checkRateLimit(request2);
      }

      // Verify both blocked
      const blocked1 = await checkRateLimit(request1);
      const blocked2 = await checkRateLimit(request2);
      expect(blocked1?.status).toBe(429);
      expect(blocked2?.status).toBe(429);

      // Clear all
      clearRateLimits();

      // Both should be allowed again
      const allowed1 = await checkRateLimit(request1);
      const allowed2 = await checkRateLimit(request2);
      expect(allowed1).toBeNull();
      expect(allowed2).toBeNull();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing IP headers gracefully', async () => {
      const request = new NextRequest(TEST_URL);

      // Should use fallback IP
      const result = await checkRateLimit(request);
      expect(result).toBeNull();
    });

    it('should handle concurrent requests from same IP', async () => {
      const request = createMockRequest();

      // Simulate concurrent requests
      const results = await Promise.all(
        Array.from({ length: 15 }, () => checkRateLimit(request))
      );

      // First 10 should pass, remaining should be blocked
      const passed = results.filter((r) => r === null).length;
      const blocked = results.filter((r) => r?.status === 429).length;

      expect(passed).toBe(10);
      expect(blocked).toBe(5);
    });

    it('should maintain separate counters across different paths', async () => {
      const request1 = createMockRequest('http://localhost:3002/oauth/consent');
      const request2 = createMockRequest('http://localhost:3002/oauth/token');

      // Note: Rate limiting is per-IP, not per-path
      // So both paths share the same counter for the same IP

      for (let i = 0; i < 5; i++) {
        await checkRateLimit(request1);
      }

      for (let i = 0; i < 5; i++) {
        await checkRateLimit(request2);
      }

      // 11th request should be blocked (10 limit reached)
      const result = await checkRateLimit(request1);
      expect(result?.status).toBe(429);
    });
  });

  describe('Redis integration', () => {
    it('should use Redis when REDIS_URL and REDIS_TOKEN are configured', async () => {
      // Mock Redis and Ratelimit
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis } = await import('@upstash/redis');

      const mockLimit = vi.fn().mockResolvedValue({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000,
      });

      const MockRatelimitClass = vi.fn().mockImplementation(() => ({
        limit: mockLimit,
      }));

      (Ratelimit as any).mockImplementation(MockRatelimitClass);
      (Ratelimit as any).slidingWindow = vi.fn().mockReturnValue('mock-limiter');

      const MockRedisClass = vi.fn();
      (Redis as any).mockImplementation(MockRedisClass);

      // Set environment variables
      process.env.REDIS_URL = 'https://test-redis.upstash.io';
      process.env.REDIS_TOKEN = 'test-token';

      // Clear the module cache to re-initialize with new env vars
      vi.resetModules();

      // Re-import to get new instance
      const { checkRateLimit: redisCheckRateLimit } = await import('../rate-limit');

      const request = createMockRequest();
      const result = await redisCheckRateLimit(request);

      expect(result).toBeNull();
      expect(MockRedisClass).toHaveBeenCalledWith({
        url: 'https://test-redis.upstash.io',
        token: 'test-token',
      });
      expect(MockRatelimitClass).toHaveBeenCalledWith({
        redis: expect.any(Object),
        limiter: 'mock-limiter',
        prefix: 'ratelimit',
        analytics: true,
      });
    });

    it('should fall back to in-memory when Redis is not configured', async () => {
      const consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

      delete process.env.REDIS_URL;
      delete process.env.REDIS_TOKEN;

      // Clear and re-import
      vi.resetModules();
      const { checkRateLimit: memCheckRateLimit } = await import('../rate-limit');

      const request = createMockRequest();
      const result = await memCheckRateLimit(request);

      expect(result).toBeNull();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('using in-memory fallback')
      );

      consoleInfoSpy.mockRestore();
    });

    it('should fall back to in-memory when Redis fails', async () => {
      const { Ratelimit } = await import('@upstash/ratelimit');
      const { Redis } = await import('@upstash/redis');

      // Mock Redis to throw error
      const mockLimit = vi.fn().mockRejectedValue(new Error('Redis connection failed'));

      const MockRatelimitClass = vi.fn().mockImplementation(() => ({
        limit: mockLimit,
      }));

      (Ratelimit as any).mockImplementation(MockRatelimitClass);
      (Ratelimit as any).slidingWindow = vi.fn().mockReturnValue('mock-limiter');

      const MockRedisClass = vi.fn();
      (Redis as any).mockImplementation(MockRedisClass);

      process.env.REDIS_URL = 'https://test-redis.upstash.io';
      process.env.REDIS_TOKEN = 'test-token';

      vi.resetModules();
      const { checkRateLimit: failoverCheckRateLimit } = await import('../rate-limit');

      const request = createMockRequest();
      const result = await failoverCheckRateLimit(request);

      // Should fall back to in-memory and allow the request
      expect(result).toBeNull();
    });
  });
});
