# Platform Hub Libraries

## CSRF Protection

The CSRF (Cross-Site Request Forgery) protection library provides cryptographically secure token generation and validation for OAuth authorization flows.

### Overview

CSRF attacks occur when a malicious website tricks a user's browser into making unauthorized requests to another site where the user is authenticated. Our implementation prevents this by:

1. Generating a unique, cryptographically random token for each authorization request
2. Storing the token in an httpOnly cookie (prevents XSS attacks)
3. Requiring the client to send the token with approval requests
4. Validating the token server-side before processing
5. Rotating tokens after each use (one-time use)

### Security Features

- **Cryptographically Random Tokens**: 32 bytes (256 bits) of random data from Node.js `crypto.randomBytes()`
- **HttpOnly Cookies**: Prevents JavaScript access to tokens (XSS protection)
- **SameSite=Lax**: Prevents cross-site cookie transmission (CSRF protection)
- **Short Expiration**: 15-minute token lifetime
- **Timing-Safe Comparison**: Uses `crypto.timingSafeEqual()` to prevent timing attacks
- **Token Rotation**: Tokens are cleared after successful validation (single-use)
- **Secure Flag**: Enabled in production to require HTTPS

### Usage

#### 1. Generate CSRF Token (API Route)

```typescript
// GET /api/oauth/csrf
import { generateCsrfToken, setCsrfToken } from '@/lib/csrf';

const token = generateCsrfToken();
await setCsrfToken(token); // Stores in httpOnly cookie
return { token }; // Returns to client for form submission
```

#### 2. Send Token with Request (Client)

```typescript
// Client-side consent page
const response = await fetch('/api/oauth/csrf');
const { token } = await response.json();

// Later, when user approves...
await fetch('/api/oauth/approve', {
  method: 'POST',
  body: JSON.stringify({
    authorization_id: 'auth-123',
    csrf_token: token,
  }),
});
```

#### 3. Validate Token (API Route)

```typescript
// POST /api/oauth/approve
import { validateCsrfToken, clearCsrfToken } from '@/lib/csrf';

const { csrf_token } = await request.json();

const isValid = await validateCsrfToken(csrf_token);
if (!isValid) {
  return new Response('Invalid CSRF token', { status: 403 });
}

// Token is valid, clear it (rotation)
await clearCsrfToken();

// Process authorization approval...
```

### API Reference

#### `generateCsrfToken(): string`

Generates a cryptographically secure CSRF token.

**Returns**: Base64-encoded random token (44 characters)

**Example**:
```typescript
const token = generateCsrfToken();
// => "8k7jH3nP9mL2qW5vX1bN6cM4zR0tY3aF8k7jH3nP9mL2qW5vX1b="
```

#### `setCsrfToken(token: string): Promise<void>`

Stores CSRF token in secure httpOnly cookie.

**Parameters**:
- `token`: CSRF token to store

**Cookie Options**:
- Name: `oauth_csrf_token`
- HttpOnly: `true`
- SameSite: `lax`
- Secure: `true` (production only)
- Max Age: `900` seconds (15 minutes)
- Path: `/`

**Example**:
```typescript
const token = generateCsrfToken();
await setCsrfToken(token);
```

#### `getCsrfToken(): Promise<string | null>`

Retrieves CSRF token from cookie.

**Returns**: Token string or `null` if not found

**Example**:
```typescript
const token = await getCsrfToken();
if (!token) {
  // Token not found or expired
}
```

#### `validateCsrfToken(token: string | null | undefined): Promise<boolean>`

Validates CSRF token against stored cookie using timing-safe comparison.

**Parameters**:
- `token`: Token from client request

**Returns**: `true` if valid, `false` otherwise

**Example**:
```typescript
const isValid = await validateCsrfToken(submittedToken);
if (!isValid) {
  return new Response('Forbidden', { status: 403 });
}
```

#### `clearCsrfToken(): Promise<void>`

Clears CSRF token cookie (token rotation after use).

**Example**:
```typescript
// After successful validation
await clearCsrfToken();
```

### Implementation Details

#### Why Two Tokens? (Cookie + Response)

The CSRF token is stored in BOTH a cookie AND returned in the API response. This is intentional:

1. **Cookie (httpOnly)**: The "expected" token that the server validates against
   - HttpOnly prevents JavaScript access (XSR protection)
   - Automatically sent with requests
   - Acts as the "answer key"

2. **Response Body**: The token the client must send with the approval request
   - Client stores this and sends it with POST request
   - Acts as the "proof of origin"

An attacker on a different domain cannot read the token from the response (Same-Origin Policy), so they cannot send it with a forged request.

#### Double Submit Cookie Pattern

This implementation uses the "Double Submit Cookie" pattern:

1. Server generates token
2. Server stores token in httpOnly cookie
3. Server returns token to client
4. Client stores token in memory/state
5. Client sends token in request body
6. Server compares request token with cookie token
7. Match = legitimate request from same origin
8. No match = CSRF attack

### Testing

Comprehensive test coverage includes:

- Token generation (randomness, uniqueness, format)
- Token storage (cookie options, security flags)
- Token validation (valid/invalid tokens, timing-safe comparison)
- Token rotation (clearing after use)
- API routes (success/error cases, HTTP status codes)

**Run tests**:
```bash
pnpm test src/lib/__tests__/csrf.test.ts
pnpm test src/app/api/oauth/__tests__/
```

### Security Considerations

#### Protection Against

- **CSRF Attacks**: Tokens prevent forged cross-origin requests
- **XSS Attacks**: HttpOnly cookies prevent token theft via JavaScript
- **Timing Attacks**: Constant-time comparison prevents timing side-channels
- **Replay Attacks**: Single-use tokens prevent reuse
- **Token Guessing**: 256-bit cryptographic randomness makes guessing infeasible

#### Does NOT Protect Against

- **Clickjacking**: Use `X-Frame-Options` or `Content-Security-Policy` headers
- **Phishing**: User education and email verification required
- **Man-in-the-Middle**: HTTPS required (enforced by secure cookie flag in production)

### OAuth 2.1 Integration

CSRF protection is integrated into the OAuth 2.1 authorization flow:

```
1. User initiates OAuth flow → /oauth/authorize
2. Platform Hub redirects to → /oauth/consent?authorization_id=...
3. Consent page fetches → GET /api/oauth/csrf (generates token)
4. User approves → POST /api/oauth/approve (validates token)
5. Server processes → Approves authorization with Supabase
6. User redirected → Back to client app with authorization code
```

The CSRF token is generated at step 3 and validated at step 4, ensuring the approval request originates from the legitimate consent page.

### OAuth `state` Parameter

The OAuth 2.1 `state` parameter provides additional CSRF protection at the protocol level:

- **OAuth `state`**: Protects the entire authorization flow (authorize → callback)
- **CSRF token**: Protects the consent submission (consent page → approve API)

Both are used together for defense-in-depth:

1. **OAuth `state`**: Client generates random state, passes to authorize endpoint, validates on callback
2. **CSRF token**: Platform Hub generates token for consent form, validates on approval

This prevents attacks at two different points in the flow.

### Migration from Direct Supabase Calls

Previously, the consent page called `supabase.auth.oauth.approveAuthorization()` directly from the client. This had no CSRF protection.

The new implementation routes approval through an API endpoint:

**Before (Vulnerable)**:
```typescript
// Client-side - No CSRF protection
const { data } = await supabase.auth.oauth.approveAuthorization(authorizationId);
```

**After (Protected)**:
```typescript
// Client-side - Sends CSRF token
const response = await fetch('/api/oauth/approve', {
  method: 'POST',
  body: JSON.stringify({ authorization_id, csrf_token }),
});

// Server-side - Validates CSRF token
const isValid = await validateCsrfToken(csrf_token);
if (!isValid) return 403;
```

This follows the BFF (Backend for Frontend) pattern recommended in the project CLAUDE.md.

### Further Reading

- [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetsecurity.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OAuth 2.1 Security Best Current Practice](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)
- [Double Submit Cookie Pattern](https://cheatsheetsecurity.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#double-submit-cookie)
