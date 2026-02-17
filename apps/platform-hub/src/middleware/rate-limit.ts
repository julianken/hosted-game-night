import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

/**
 * Rate Limiting Middleware for OAuth Endpoints
 *
 * Protects OAuth endpoints from brute force and DDoS attacks.
 * Implements sliding window algorithm with Redis backing for production.
 *
 * Limits:
 * - 10 requests per minute per IP address
 * - Returns HTTP 429 (Too Many Requests) when exceeded
 * - Includes Retry-After header with seconds until reset
 *
 * Storage Strategy:
 * - Production (REDIS_URL set): Uses Redis for multi-instance consistency
 * - Development (no REDIS_URL): Falls back to in-memory store
 * - Edge Runtime compatible via @upstash/redis
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// Redis-based rate limiter (lazy initialization)
let redisRatelimit: Ratelimit | null = null;
let ratelimitInitialized = false;

/**
 * Initialize Redis-based rate limiter if REDIS_URL and REDIS_TOKEN are available
 * Compatible with Edge Runtime
 */
function getRedisRatelimit(): Ratelimit | null {
  if (ratelimitInitialized) {
    return redisRatelimit;
  }

  ratelimitInitialized = true;

  const redisUrl = process.env.REDIS_URL;
  const redisToken = process.env.REDIS_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn(
      '[Rate Limit] REDIS_URL or REDIS_TOKEN not configured — using in-memory fallback. ' +
        'Rate limiting is active but will reset on cold starts and is not shared across instances. ' +
        'Configure Upstash Redis for production-grade rate limiting.'
    );
    return null;
  }

  try {
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    redisRatelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, '60s'),
      prefix: 'ratelimit',
      analytics: true,
    });

    console.info('[Rate Limit] Redis rate limiter initialized');
    return redisRatelimit;
  } catch (error) {
    console.error('[Rate Limit] Failed to initialize Redis rate limiter:', error);
    return null;
  }
}

// In-memory store for rate limit tracking (fallback)
// Key: IP address, Value: { count, resetAt }
const rateLimitStore = new Map<string, RateLimitEntry>();

// Rate limit configuration (for in-memory fallback)
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per window

/**
 * Clean up expired rate limit entries every 5 minutes
 * Prevents memory leaks in long-running processes
 * Only used for in-memory fallback
 */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const entriesToDelete: string[] = [];

    rateLimitStore.forEach((entry, ip) => {
      if (entry.resetAt < now) {
        entriesToDelete.push(ip);
      }
    });

    entriesToDelete.forEach((ip) => rateLimitStore.delete(ip));
  }, CLEANUP_INTERVAL_MS);

  // Allow process to exit naturally even with the timer running
  if (cleanupTimer && typeof cleanupTimer.unref === 'function') {
    cleanupTimer.unref();
  }
}

// Start cleanup timer for in-memory fallback
if (typeof window === 'undefined') {
  startCleanup();
}

/**
 * Extract client IP address from request
 * Handles common proxy headers (Vercel, Cloudflare, etc.)
 */
function getClientIp(request: NextRequest): string {
  // Check common proxy headers
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Vercel-specific header
  const vercelForwardedFor = request.headers.get('x-vercel-forwarded-for');
  if (vercelForwardedFor) {
    return vercelForwardedFor.split(',')[0].trim();
  }

  // Fallback to a default (should not happen in production)
  return 'unknown';
}

/**
 * Check rate limit using Redis (async)
 * Returns rate limit result using @upstash/ratelimit
 */
async function checkRateLimitRedis(
  ip: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: number } | null> {
  const ratelimit = getRedisRatelimit();
  if (!ratelimit) {
    return null;
  }

  try {
    const result = await ratelimit.limit(ip);

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('[Rate Limit] Redis operation failed:', error);
    return null;
  }
}

/**
 * Check rate limit using in-memory store (fallback)
 * Synchronous operation for when Redis is unavailable
 */
function checkRateLimitMemory(ip: string, now: number): {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
} {
  // Get or create rate limit entry
  let entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt < now) {
    // Create new entry (first request or window expired)
    entry = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    rateLimitStore.set(ip, entry);

    return {
      success: true,
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: RATE_LIMIT_MAX_REQUESTS - 1,
      reset: entry.resetAt,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(ip, entry);

  const success = entry.count <= RATE_LIMIT_MAX_REQUESTS;
  const remaining = Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count);

  return {
    success,
    limit: RATE_LIMIT_MAX_REQUESTS,
    remaining,
    reset: entry.resetAt,
  };
}

/**
 * Check if request should be rate limited
 * Returns null if allowed, or response object if rate limited
 *
 * This function is now async to properly support Redis operations.
 */
export async function checkRateLimit(request: NextRequest): Promise<NextResponse | null> {
  const ip = getClientIp(request);
  const now = Date.now();

  // Try Redis first, fall back to in-memory
  let result: { success: boolean; limit: number; remaining: number; reset: number };

  const redisResult = await checkRateLimitRedis(ip);

  if (redisResult) {
    // Redis is available and working
    result = redisResult;
  } else {
    // Fall back to in-memory store
    result = checkRateLimitMemory(ip, now);
  }

  // Check if limit exceeded
  if (!result.success) {
    const retryAfterSeconds = Math.ceil((result.reset - now) / 1000);

    // Log rate limit violation
    console.warn(
      `[Rate Limit] IP ${ip} exceeded limit on ${request.nextUrl.pathname} ` +
        `(limit: ${result.limit}, remaining: ${result.remaining})`
    );

    // Return 429 Too Many Requests
    const response = NextResponse.json(
      {
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: retryAfterSeconds,
      },
      { status: 429 }
    );

    // Add standard rate limit headers
    response.headers.set('Retry-After', retryAfterSeconds.toString());
    response.headers.set('X-RateLimit-Limit', result.limit.toString());
    response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    response.headers.set('X-RateLimit-Reset', result.reset.toString());

    return response;
  }

  // Request allowed
  return null;
}

/**
 * Get rate limit headers for successful requests
 * Allows clients to track their usage
 */
export async function getRateLimitHeaders(
  request: NextRequest
): Promise<Record<string, string>> {
  const ip = getClientIp(request);

  // Try Redis first
  const redisResult = await checkRateLimitRedis(ip);

  let result: { limit: number; remaining: number; reset: number };

  if (redisResult) {
    result = redisResult;
  } else {
    // Fall back to in-memory
    const entry = rateLimitStore.get(ip);

    if (!entry) {
      return {
        'X-RateLimit-Limit': RATE_LIMIT_MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': RATE_LIMIT_MAX_REQUESTS.toString(),
      };
    }

    result = {
      limit: RATE_LIMIT_MAX_REQUESTS,
      remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - entry.count),
      reset: entry.resetAt,
    };
  }

  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.reset.toString(),
  };
}

/**
 * Apply rate limiting to a Next.js middleware response
 * Usage in middleware.ts:
 *
 * const rateLimitResponse = await checkRateLimit(request);
 * if (rateLimitResponse) return rateLimitResponse;
 */
export async function applyRateLimit(
  request: NextRequest,
  response: NextResponse
): Promise<NextResponse> {
  // Check rate limit
  const limitResponse = await checkRateLimit(request);
  if (limitResponse) {
    return limitResponse;
  }

  // Add rate limit headers to successful response
  const headers = await getRateLimitHeaders(request);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * Reset rate limits for a specific IP (for testing)
 * Should only be used in development/test environments
 */
export function resetRateLimit(ip: string): void {
  rateLimitStore.delete(ip);
}

/**
 * Clear all rate limits (for testing)
 * Should only be used in development/test environments
 */
export function clearRateLimits(): void {
  rateLimitStore.clear();
}
