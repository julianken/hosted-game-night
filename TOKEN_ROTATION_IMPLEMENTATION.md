# Token Rotation Implementation - BEA-284

## Overview

This implementation adds automatic refresh token rotation to the Platform Hub OAuth 2.1 server integration. While Supabase handles the actual token rotation on the server side, this implementation provides:

1. **Client-side token refresh logic** with proper error handling
2. **Token reuse detection** for security monitoring
3. **Automatic token revocation** when reuse is detected
4. **Comprehensive audit logging** for all token operations
5. **OAuth 2.1 compliant token endpoint** for client applications

## Files Created/Modified

### New Files

1. **`apps/platform-hub/src/lib/token-rotation.ts`** (~350 lines)
   - Core token rotation logic
   - Refresh token reuse detection
   - Automatic token revocation
   - Audit logging system
   - Utility functions for token validation

2. **`apps/platform-hub/src/app/api/oauth/token/route.ts`** (~350 lines)
   - OAuth 2.1 compliant token endpoint
   - Handles `authorization_code` grant (code exchange)
   - Handles `refresh_token` grant (token refresh)
   - Security monitoring and logging
   - Comprehensive error handling

3. **`apps/platform-hub/src/lib/__tests__/token-rotation.test.ts`** (~400 lines)
   - Unit tests for token rotation module
   - Tests for reuse detection
   - Tests for token revocation
   - Tests for utility functions

4. **`apps/platform-hub/src/app/api/oauth/token/__tests__/route.test.ts`** (~450 lines)
   - Integration tests for token endpoint
   - Tests for both grant types
   - Tests for error handling
   - Tests for form-urlencoded support

## Features Implemented

### 1. Automatic Refresh Token Rotation

When a client refreshes their access token:
- Supabase issues a **new refresh token**
- The **old refresh token is immediately invalidated**
- The client receives both new access and refresh tokens
- This follows OAuth 2.1 best practices for token rotation

### 2. Token Reuse Detection

The system detects when a client attempts to reuse an old refresh token:
- If an invalidated token is used, it's flagged as **reuse detected**
- The event is logged with full context
- The system returns an error indicating security violation
- All tokens for that user can be revoked automatically

### 3. Automatic Token Revocation

When token reuse is detected:
- The system can automatically revoke **all tokens** for the user
- This prevents compromised tokens from being exploited
- The user must re-authenticate to get new tokens
- All active sessions are terminated

### 4. Comprehensive Logging

All token operations are logged:
- Successful token refreshes
- Failed refresh attempts
- Token reuse detection
- Token revocation events
- Metadata includes: timestamp, client_id, user_id, error details

### 5. OAuth 2.1 Compliance

The token endpoint follows OAuth 2.1 specification:
- Supports `authorization_code` grant (PKCE required)
- Supports `refresh_token` grant with rotation
- Returns standard error codes
- Accepts both JSON and form-urlencoded requests
- Proper error responses with `error` and `error_description`

## API Endpoint

### POST /api/oauth/token

**Supported Grant Types:**
- `authorization_code` - Exchange authorization code for tokens
- `refresh_token` - Refresh access token (with rotation)

#### Authorization Code Grant

Exchange an authorization code for access and refresh tokens.

**Request:**
```bash
POST /api/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=<authorization_code>
&client_id=<client_id>
&redirect_uri=<redirect_uri>
&code_verifier=<pkce_verifier>
```

**Response (Success):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "v1.random_string_here"
}
```

**Response (Error):**
```json
{
  "error": "invalid_grant",
  "error_description": "Invalid authorization code"
}
```

#### Refresh Token Grant

Refresh an access token using a refresh token. The old refresh token is automatically rotated.

**Request:**
```bash
POST /api/oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "v1.old_refresh_token",
  "client_id": "client-uuid"
}
```

**Response (Success):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "v1.new_refresh_token"
}
```

**Response (Token Reuse Detected):**
```json
{
  "error": "invalid_grant",
  "error_description": "Refresh token reuse detected. All tokens have been revoked. Please re-authenticate.",
  "error_uri": "https://datatracker.ietf.org/doc/html/rfc6749#section-10.4"
}
```

## Security Features

### Token Reuse Detection Algorithm

1. Client makes refresh request with `refresh_token_A`
2. Supabase validates token and returns new tokens
3. Client receives `access_token_B` and `refresh_token_B`
4. **`refresh_token_A` is now invalidated**
5. If client (or attacker) tries to use `refresh_token_A` again:
   - Supabase returns error containing "reuse" or "already used"
   - Our system detects this pattern
   - Logs security event
   - Returns error with `shouldRevokeAll: true`
   - Can automatically revoke all user tokens

### Token Revocation

When reuse is detected, the system can revoke all tokens:

```typescript
import { revokeAllTokens } from '@/lib/token-rotation';

// Revoke all tokens for a user
const result = await revokeAllTokens(
  'user-uuid',
  'Token reuse detected'
);

if (result.success) {
  // User logged out from all sessions
  // Must re-authenticate
}
```

### Audit Logging

All token operations are logged for security monitoring:

```typescript
import { tokenRotationLogger } from '@/lib/token-rotation';

// View recent events
const events = tokenRotationLogger.getRecentEvents(10);
```

**Log Entry Format:**
```json
{
  "timestamp": "2026-01-21T12:34:56.789Z",
  "event_type": "refresh_success",
  "client_id": "client-uuid",
  "user_id": "user-uuid",
  "metadata": {
    "expires_in": 3600
  }
}
```

**Event Types:**
- `refresh_success` - Token refreshed successfully
- `refresh_failure` - Token refresh failed
- `reuse_detected` - Token reuse detected (security violation)
- `revoke_all` - All tokens revoked for user

## Integration with Client Apps

### Bingo/Trivia Apps

Client apps should use this endpoint for token refresh:

```typescript
// lib/oauth.ts
export async function refreshTokens(refreshToken: string) {
  const response = await fetch('http://localhost:3002/api/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: process.env.NEXT_PUBLIC_OAUTH_CLIENT_ID,
    }),
  });

  if (!response.ok) {
    const error = await response.json();

    // Handle token reuse
    if (error.error_description?.includes('reuse')) {
      // Clear all tokens and redirect to login
      clearTokens();
      window.location.href = '/login?error=security_violation';
      return null;
    }

    throw new Error(error.error_description || 'Token refresh failed');
  }

  return await response.json();
}
```

### Middleware Integration

Update middleware to automatically refresh expired tokens:

```typescript
// middleware.ts
import { shouldRefreshToken, getTokenExpiration } from '@/lib/token-rotation';

export async function middleware(request: NextRequest) {
  const accessToken = request.cookies.get('access_token')?.value;
  const refreshToken = request.cookies.get('refresh_token')?.value;

  if (!accessToken && !refreshToken) {
    return redirectToLogin(request);
  }

  // Check if token needs refresh
  const exp = getTokenExpiration(accessToken);
  if (exp && shouldRefreshToken(exp)) {
    // Refresh token before it expires
    const newTokens = await refreshTokens(refreshToken);

    if (!newTokens) {
      return redirectToLogin(request);
    }

    // Update cookies with new tokens
    const response = NextResponse.next();
    response.cookies.set('access_token', newTokens.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: newTokens.expires_in,
    });
    response.cookies.set('refresh_token', newTokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return response;
  }

  return NextResponse.next();
}
```

## Testing

### Run Tests

```bash
# From platform-hub directory
cd apps/platform-hub

# Install dependencies first
pnpm install

# Run all tests
pnpm test

# Run specific test file
pnpm vitest src/lib/__tests__/token-rotation.test.ts

# Run with coverage
pnpm test:coverage
```

### Test Coverage

The implementation includes comprehensive tests:
- ✅ Token refresh success cases
- ✅ Token reuse detection
- ✅ Token revocation
- ✅ Expired token handling
- ✅ Network error handling
- ✅ Missing parameter validation
- ✅ Both grant types (authorization_code, refresh_token)
- ✅ Form-urlencoded support
- ✅ Utility functions (shouldRefreshToken, getTokenExpiration)

## Security Considerations

### Best Practices Implemented

1. **Token Rotation**: New refresh token on every refresh
2. **Reuse Detection**: Automatic detection of token reuse
3. **Token Revocation**: All tokens revoked on security violation
4. **Audit Logging**: All operations logged for monitoring
5. **PKCE Required**: Authorization code grant requires PKCE
6. **httpOnly Cookies**: Tokens stored in httpOnly cookies (client implementation)
7. **Secure Transport**: HTTPS required in production

### Security Recommendations

1. **Store tokens in httpOnly cookies** - Prevents XSS attacks
2. **Use short-lived access tokens** - 1 hour or less
3. **Monitor audit logs** - Watch for unusual patterns
4. **Implement rate limiting** - Prevent brute force attacks
5. **Use HTTPS everywhere** - No HTTP in production
6. **Rotate refresh tokens** - Already implemented
7. **Revoke on logout** - Clear all tokens when user logs out

## Supabase Configuration

This implementation relies on Supabase's built-in OAuth 2.1 server:

```
✅ OAuth 2.1 Server enabled
✅ Refresh token rotation enabled (automatic)
✅ PKCE required (S256 method)
✅ Token expiration: 3600 seconds (1 hour)
```

No additional Supabase configuration needed. Token rotation is handled automatically by Supabase when using the `refreshSession()` method.

## Future Enhancements

### Phase 2 (Optional)

1. **Token family tracking** - Track token lineage for better security
2. **Redis integration** - Store invalidated tokens for faster reuse detection
3. **Suspicious activity detection** - ML-based anomaly detection
4. **Admin dashboard** - View token operations and security events
5. **Webhook notifications** - Alert on security violations
6. **Token usage analytics** - Track refresh patterns per client

### Phase 3 (Optional)

1. **Multi-factor authentication** - Require MFA for token refresh
2. **Device fingerprinting** - Detect token theft across devices
3. **Geolocation tracking** - Flag suspicious locations
4. **Compliance reporting** - GDPR/HIPAA audit logs

## References

- [OAuth 2.1 RFC](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-11)
- [OAuth 2.0 Security BCP](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Supabase OAuth Documentation](https://supabase.com/docs/guides/auth/oauth-server)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)

## Support

For questions or issues:
1. Review this documentation
2. Check test files for usage examples
3. Review inline code comments
4. Consult OAuth 2.1 specification
