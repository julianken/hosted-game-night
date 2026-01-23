# Middleware

## Overview

Security middleware for the Platform Hub API, providing multiple layers of protection:

1. **Body Size Limits** - Prevents DoS attacks via large payloads
2. **Rate Limiting** - Protects OAuth endpoints from brute force attacks
3. **Session Management** - Handles Supabase authentication cookies

---

## Body Size Middleware

### Overview

Enforces maximum request body size limits to prevent Denial of Service (DoS) attacks where attackers send extremely large payloads to exhaust server resources.

### Configuration

- **Default Limit:** 1MB per request
- **Environment Variable:** `MAX_BODY_SIZE_MB`
- **Applied to:** POST, PUT, PATCH requests
- **Check Method:** Content-Length header inspection

### Usage

The body size check is automatically applied via Next.js middleware (`src/middleware.ts`) before any request processing:

```typescript
export async function middleware(request: NextRequest) {
  // Check body size for POST, PUT, PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const bodySizeCheck = checkBodySize(request);
    if (bodySizeCheck) {
      return bodySizeCheck; // Return 413 Payload Too Large
    }
  }
  // Continue with other middleware...
}
```

You can also use it directly in API route handlers:

```typescript
import { checkBodySize } from '@/middleware/body-size';

export async function POST(request: NextRequest) {
  const bodySizeCheck = checkBodySize(request);
  if (bodySizeCheck) {
    return bodySizeCheck;
  }
  // Process request...
}
```

### Configuration

Set the maximum body size in your `.env.local`:

```bash
# Maximum request body size in MB (default: 1)
MAX_BODY_SIZE_MB=1
```

### Error Response

When body size is exceeded, clients receive HTTP 413:

```json
{
  "error": "payload_too_large",
  "error_description": "Request body exceeds maximum size of 1MB",
  "max_size_bytes": 1048576,
  "max_size_mb": 1
}
```

### Security Benefits

- **DoS Prevention:** Stops attackers from exhausting server memory/disk with large payloads
- **Resource Protection:** Prevents slow request attacks that tie up server connections
- **Early Rejection:** Checks Content-Length header before reading body data
- **Configurable:** Adjust limit based on your application's needs

### Testing

Comprehensive test suite covers:

- Requests within limit (allowed)
- Requests exceeding limit (rejected with 413)
- Requests at exact limit boundary
- Missing Content-Length header
- Various HTTP methods (POST, PUT, PATCH)
- Integration scenarios (file uploads, JSON, form data)

Run tests:

```bash
pnpm test src/middleware/__tests__/body-size.test.ts
```

---

## Rate Limiting Middleware

### Overview

Rate limiting middleware to protect OAuth endpoints from brute force attacks and DDoS. Implements a token bucket algorithm with in-memory storage.

## Configuration

- **Rate Limit:** 10 requests per minute per IP address
- **Window:** 60 seconds (sliding window)
- **Protected Endpoints:**
  - `/oauth/consent`
  - `/oauth/authorize`
  - `/oauth/token`

## Usage

The rate limiting is automatically applied via Next.js middleware (`src/middleware.ts`). No additional configuration needed.

```typescript
// Middleware automatically checks rate limits for OAuth endpoints
export async function middleware(request: NextRequest) {
  if (shouldRateLimit(request.nextUrl.pathname)) {
    const rateLimitResponse = applyRateLimit(request, NextResponse.next());
    if (rateLimitResponse.status === 429) {
      return rateLimitResponse; // Return 429 Too Many Requests
    }
  }
  return updateSession(request);
}
```

## Response Headers

All responses include rate limit headers:

```
X-RateLimit-Limit: 10          # Maximum requests allowed per window
X-RateLimit-Remaining: 7       # Requests remaining in current window
X-RateLimit-Reset: 1706038260  # Unix timestamp when limit resets
```

When rate limited (HTTP 429):

```
Retry-After: 45                # Seconds until limit resets
```

## Error Response

When rate limit is exceeded, clients receive:

```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "retryAfter": 45
}
```

## Implementation Details

### In-Memory Storage

The MVP implementation uses in-memory storage (`Map`) for rate limit tracking. This is suitable for:

- Development environments
- Single-instance deployments
- Low to moderate traffic

**Limitations:**
- Resets on server restart
- Not shared across multiple instances
- Memory grows with unique IPs (mitigated by automatic cleanup)

### Production Considerations

For production deployments with multiple instances, consider:

1. **Redis-based rate limiting** using `@upstash/ratelimit`:
   ```bash
   pnpm add @upstash/ratelimit @upstash/redis
   ```

2. **Vercel Edge Config** for serverless deployments

3. **CloudFlare Rate Limiting** at the CDN level

### IP Extraction

The middleware extracts client IP from multiple sources:

1. `x-forwarded-for` (first IP in chain)
2. `x-real-ip`
3. `x-vercel-forwarded-for` (Vercel-specific)
4. Falls back to `unknown` if no headers present

This ensures compatibility with various proxy configurations (Vercel, Cloudflare, nginx, etc.).

## Testing

Comprehensive test suite covers:

- Basic rate limiting (10 requests allowed, 11th blocked)
- Time window expiration and reset
- Multiple IP tracking
- Header extraction from various proxy sources
- Concurrent request handling
- Edge cases (missing headers, etc.)

Run tests:

```bash
pnpm test src/middleware/__tests__/rate-limit.test.ts
```

## Monitoring

Rate limit violations are logged to console:

```
[Rate Limit] IP 192.168.1.100 exceeded limit on /oauth/consent (11 requests in window, limit: 10)
```

In production, these logs should be forwarded to a monitoring service (Datadog, Sentry, etc.) for:

- Detecting potential attacks
- Identifying legitimate users hitting limits
- Capacity planning

## Security Notes

1. **IP Spoofing:** Trust proxy headers only from verified sources (Vercel, Cloudflare). Configure `X-Forwarded-For` validation at the edge.

2. **Distributed Attacks:** In-memory rate limiting won't protect against distributed attacks from many IPs. Consider:
   - CDN-level rate limiting (Cloudflare, Fastly)
   - Web Application Firewall (WAF)
   - IP reputation services

3. **Resource Exhaustion:** Automatic cleanup runs every 5 minutes to prevent memory leaks.

## Configuration Options

To adjust rate limits, modify constants in `src/middleware/rate-limit.ts`:

```typescript
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;     // 10 requests per window
```

To add/remove protected endpoints, edit `src/middleware.ts`:

```typescript
const OAUTH_PATHS = [
  '/oauth/consent',
  '/oauth/authorize',
  '/oauth/token',
  '/api/auth/login',  // Add new endpoint
];
```

## References

- [IETF Rate Limiting Headers](https://datatracker.ietf.org/doc/html/draft-ietf-httpapi-ratelimit-headers)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
