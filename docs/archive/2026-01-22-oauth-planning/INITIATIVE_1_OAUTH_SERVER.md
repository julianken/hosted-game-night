# Initiative 1: Platform Hub - OAuth Authorization Server

## Purpose

Transform Platform Hub into a centralized OAuth 2.1 authorization server that provides secure authentication and authorization for all Beak Gaming Platform applications. This initiative establishes the foundation for a production-ready multi-tenant gaming platform with proper session management, security controls, and developer-friendly integration patterns.

## Current Status

- **Overall Progress:** 0% (0/5 projects complete)
- **Total Issues:** 50 (BEA-210 to BEA-259)
- **Priority:** P0 (Blocking all other initiatives)
- **Last Updated:** 2026-01-21

### Quick Links
- [All Initiative 1 Issues](https://linear.app/beak-gaming/initiative/initiative-1)
- [Project 1.1-1.4: OAuth Server Setup](https://linear.app/beak-gaming/project/oauth-server-setup-configuration)
- [Project 1.5: Bingo OAuth Integration](https://linear.app/beak-gaming/project/bingo-oauth-client-integration)
- [Project 1.6: Trivia OAuth Integration](https://linear.app/beak-gaming/project/trivia-oauth-client-integration)

### Blockers
- None (this is the foundational initiative)

### Up Next
- Project 1.1-1.4: OAuth Server Setup & Configuration

---

## Projects Overview

### Project 1.1-1.4: OAuth Server Setup & Configuration

**Priority:** P0
**Status:** Backlog
**Issues:** 29 (BEA-210 to BEA-238)

This consolidated project covers the complete OAuth 2.1 authorization server implementation, including:
- Core OAuth endpoints (authorize, token, introspect)
- Supabase auth integration
- Client registration and management
- Session management and security

#### Phase 1: Core OAuth Server (BEA-210 to BEA-217)

**Issues:**
- **BEA-210:** Implement `/api/oauth/authorize` endpoint with PKCE support
- **BEA-211:** Implement `/api/oauth/token` endpoint with code exchange
- **BEA-212:** Implement `/api/oauth/introspect` for token validation
- **BEA-213:** Create OAuth consent screen UI component
- **BEA-214:** Implement authorization code storage
- **BEA-215:** Implement PKCE code challenge/verifier validation
- **BEA-216:** Add OAuth metadata discovery endpoint
- **BEA-217:** Create OAuth server configuration module

**Deliverables:**
- Authorization endpoint with PKCE validation
- Token endpoint with code exchange
- Token introspection for validation
- OAuth metadata discovery (`.well-known/oauth-authorization-server`)
- Consent screen UI

#### Phase 2: Supabase Auth Integration (BEA-218 to BEA-223)

**Issues:**
- **BEA-218:** Bridge OAuth tokens to Supabase auth sessions
- **BEA-219:** Implement API route authentication middleware
- **BEA-220:** Add role-based access control (RBAC) checks
- **BEA-221:** Create user registration flow with Supabase
- **BEA-222:** Implement session revocation mechanism
- **BEA-223:** Add facility/organization scoping to auth context

**Deliverables:**
- OAuth-to-Supabase session bridge
- Auth middleware for API routes
- User registration flow
- Session management APIs
- Multi-tenant facility scoping

#### Phase 3: Client Registration (BEA-224 to BEA-230)

**Issues:**
- **BEA-224:** Create `oauth_clients` database table with migrations
- **BEA-225:** Implement client registration API endpoints
- **BEA-226:** Build client management UI (list/create/edit/delete)
- **BEA-227:** Add client secret generation and secure storage
- **BEA-228:** Implement redirect URI validation logic
- **BEA-229:** Create developer portal page with API docs
- **BEA-230:** Add client usage statistics dashboard

**Deliverables:**
- Client registration database schema
- Client CRUD APIs
- Admin UI for client management
- Developer portal with documentation
- Usage analytics dashboard

#### Phase 4: Security & Session Management (BEA-231 to BEA-238)

**Issues:**
- **BEA-231:** Implement Redis-based session storage
- **BEA-232:** Add rate limiting to auth endpoints (10 req/min per IP)
- **BEA-233:** Configure secure cookies (httpOnly, secure, sameSite)
- **BEA-234:** Implement CSRF token generation and validation
- **BEA-235:** Add session refresh token rotation
- **BEA-236:** Create audit log table and logging middleware
- **BEA-237:** Implement session revocation API
- **BEA-238:** Add suspicious activity detection (geo-fencing, device fingerprinting)

**Deliverables:**
- Redis session storage with TTL
- Rate limiting on all auth endpoints
- Secure cookie configuration
- CSRF protection
- Refresh token rotation
- Comprehensive audit logging
- Anomaly detection system

#### Definition of Done (Project 1.1-1.4)

- [ ] All 29 issues completed and merged
- [ ] OAuth 2.1 spec compliance verified
- [ ] PKCE enforcement on all flows (S256 only)
- [ ] Access tokens: JWT, 1-hour expiration
- [ ] Refresh tokens: opaque UUIDs, 30-day expiration with rotation
- [ ] Rate limiting: 10 req/min on auth endpoints
- [ ] Session storage: Redis with 1-hour TTL
- [ ] Audit logs capture 100% of auth events
- [ ] Security audit passed (OWASP OAuth checklist)
- [ ] Unit tests: 90%+ coverage
- [ ] Integration tests: Full OAuth flow verified
- [ ] Developer portal deployed with interactive docs

---

### Project 1.5: Bingo OAuth Client Integration

**Priority:** P1
**Status:** Backlog
**Issues:** 5 (BEA-239 to BEA-243)

**Dependencies:** Project 1.1-1.4 (OAuth server must be functional)

**Issues:**
- **BEA-239:** Register Bingo app as OAuth client in Platform Hub
- **BEA-240:** Implement OAuth login redirect in Bingo
- **BEA-241:** Handle OAuth callback and token storage
- **BEA-242:** Protect `/play` route with authentication check
- **BEA-243:** Add access token to API request headers

**Deliverables:**
- Bingo registered as OAuth client
- Login flow redirects to Platform Hub
- OAuth callback handler with PKCE verification
- Protected routes with auth middleware
- API client with automatic token refresh

**Definition of Done:**
- [ ] Bingo client registered with correct redirect URIs
- [ ] Login button initiates OAuth flow
- [ ] Tokens stored in secure httpOnly cookies
- [ ] `/play` route requires authentication
- [ ] API requests include Bearer token
- [ ] Token refresh on 401 responses
- [ ] Logout clears tokens and revokes session
- [ ] E2E tests verify complete flow

---

### Project 1.6: Trivia OAuth Client Integration

**Priority:** P1
**Status:** Backlog
**Issues:** 5 (BEA-244 to BEA-248)

**Dependencies:** Project 1.1-1.4 (OAuth server must be functional)

**Issues:**
- **BEA-244:** Register Trivia app as OAuth client in Platform Hub
- **BEA-245:** Implement OAuth login redirect in Trivia
- **BEA-246:** Handle OAuth callback and token storage
- **BEA-247:** Protect `/play` route with authentication check in Trivia
- **BEA-248:** Add access token to API request headers in Trivia

**Deliverables:**
- Trivia registered as OAuth client
- Login flow redirects to Platform Hub
- OAuth callback handler with PKCE verification
- Protected routes with auth middleware
- API client with automatic token refresh

**Definition of Done:**
- [ ] Trivia client registered with correct redirect URIs
- [ ] Login button initiates OAuth flow
- [ ] Tokens stored in secure httpOnly cookies
- [ ] `/play` route requires authentication
- [ ] API requests include Bearer token
- [ ] Token refresh on 401 responses
- [ ] Logout clears tokens and revokes session
- [ ] E2E tests verify complete flow

---

### Project 1.7: Role-Based Access Control (RBAC)

**Priority:** P1
**Status:** Backlog
**Issues:** 6 (BEA-249 to BEA-254)

**Dependencies:** Project 1.1-1.4 (Auth system must exist)

**Issues:**
- **BEA-249:** Create user_roles and permissions database tables
- **BEA-250:** Implement role assignment API endpoints
- **BEA-251:** Build requireRole() and requirePermission() middleware
- **BEA-252:** Add facility-scoped authorization checks
- **BEA-253:** Create role management UI for admins
- **BEA-254:** Implement permission inheritance logic

**Role Hierarchy:**
1. **super_admin** - Full platform access, all facilities
2. **facility_admin** - Manage users/settings within facility
3. **host** - Create and run game sessions
4. **player** - Participate in games
5. **viewer** - Read-only access

**Deliverables:**
- `user_roles` database table with facility scoping
- Role assignment/revocation APIs
- Authorization middleware (`requireRole`, `requirePermission`)
- Admin UI for role management
- Permission inheritance system

**Definition of Done:**
- [ ] 5 roles implemented with clear boundaries
- [ ] `user_roles` table supports multi-role users
- [ ] Permission inheritance (higher roles inherit lower permissions)
- [ ] Facility scoping prevents cross-org access
- [ ] Admin UI allows role assignment
- [ ] Middleware blocks unauthorized access
- [ ] Default `player` role on registration
- [ ] RBAC matrix documented
- [ ] Unit tests cover all permission checks

---

### Project 1.8: Facility & Admin Features

**Priority:** P2
**Status:** Backlog
**Issues:** 5 (BEA-255 to BEA-259)

**Dependencies:** Project 1.7 (RBAC for admin access control)

**Issues:**
- **BEA-255:** Build facility user management interface
- **BEA-256:** Implement staff scheduling and shift management
- **BEA-257:** Create activity logs and audit trail system
- **BEA-258:** Build facility settings and configuration page
- **BEA-259:** Create analytics dashboard with usage reports

**Deliverables:**
- User management UI (invite, suspend, search)
- Staff scheduling system with calendar view
- Activity logs with 90-day retention
- Facility settings page (branding, defaults, features)
- Analytics dashboard (sessions, engagement, peak hours)

**Definition of Done:**
- [ ] Admins can invite/manage users
- [ ] Staff scheduling with conflict detection
- [ ] All user actions logged to audit trail
- [ ] Facility settings customizable per org
- [ ] Analytics show usage trends and metrics
- [ ] Export reports to CSV/PDF
- [ ] Real-time dashboard updates
- [ ] Facility data isolation verified

---

## Architecture Overview

### OAuth 2.1 Authorization Code Flow with PKCE

```
┌─────────────┐              ┌──────────────┐              ┌──────────┐
│ Client App  │              │ Platform Hub │              │ Supabase │
│ (Bingo/     │              │ (OAuth       │              │          │
│  Trivia)    │              │  Server)     │              │          │
└─────────────┘              └──────────────┘              └──────────┘
      │                              │                            │
      │ 1. Generate PKCE             │                            │
      │    code_verifier (random)    │                            │
      │    code_challenge (SHA256)   │                            │
      │                              │                            │
      │ 2. Redirect to /authorize    │                            │
      │    with code_challenge       │                            │
      ├─────────────────────────────>│                            │
      │                              │ 3. Validate client_id      │
      │                              │    redirect_uri            │
      │                              │    code_challenge          │
      │                              │                            │
      │                              │ 4. Show consent screen     │
      │                              │                            │
      │                              │ 5. User approves           │
      │                              │                            │
      │                              │ 6. Generate auth code      │
      │                              │                            │
      │ 7. Redirect with code        │                            │
      │<─────────────────────────────│                            │
      │                              │                            │
      │ 8. POST /token               │                            │
      │    code + code_verifier      │                            │
      ├─────────────────────────────>│                            │
      │                              │ 9. Validate verifier       │
      │                              │                            │
      │                              │ 10. Generate tokens        │
      │                              │     (JWT access token)     │
      │                              │                            │
      │                              │ 11. Create session         │
      │                              ├───────────────────────────>│
      │                              │                            │
      │                              │<───────────────────────────│
      │                              │                            │
      │ 12. Return tokens            │                            │
      │<─────────────────────────────│                            │
      │                              │                            │
      │ 13. Store in cookies         │                            │
      │     (httpOnly, secure)       │                            │
      │                              │                            │
      │ 14. API calls with Bearer    │                            │
      │     Authorization header     │                            │
      │                              │                            │
```

### Code Locations

**Platform Hub (Authorization Server):**
```
apps/platform-hub/src/
├── app/api/oauth/
│   ├── authorize/route.ts       # Authorization endpoint
│   ├── token/route.ts           # Token exchange endpoint
│   └── introspect/route.ts      # Token validation endpoint
├── app/api/auth/
│   ├── register/route.ts        # User registration
│   └── sessions/route.ts        # Session management
├── lib/
│   ├── auth/
│   │   ├── oauth.ts             # OAuth utilities
│   │   ├── pkce.ts              # PKCE generation/validation
│   │   └── tokens.ts            # JWT signing/verification
│   └── middleware/
│       ├── auth.ts              # Token validation middleware
│       └── rbac.ts              # Role-based access control
└── components/
    └── oauth/
        └── consent-screen.tsx   # OAuth consent UI
```

**Client Apps (Bingo/Trivia):**
```
apps/{bingo,trivia}/src/
├── lib/auth/
│   ├── oauth-client.ts          # OAuth flow implementation
│   ├── pkce.ts                  # PKCE code generation
│   └── token-storage.ts         # Secure cookie handling
├── components/
│   └── auth/
│       └── login-button.tsx     # OAuth login trigger
└── middleware.ts                # Route protection
```

**Database:**
```
supabase/migrations/
├── YYYYMMDDHHMMSS_create_oauth_clients.sql
├── YYYYMMDDHHMMSS_create_oauth_codes.sql
├── YYYYMMDDHHMMSS_create_user_roles.sql
├── YYYYMMDDHHMMSS_create_facilities.sql
└── YYYYMMDDHHMMSS_create_audit_logs.sql
```

### Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| **PKCE Required** | Even confidential clients must use PKCE (S256 only) for maximum security |
| **JWT Access Tokens** | Self-contained tokens reduce database lookups; HS256 signing with SESSION_TOKEN_SECRET |
| **Opaque Refresh Tokens** | UUIDs stored in database, enabling instant revocation |
| **httpOnly Cookies** | Prevents XSS attacks; tokens never accessible to JavaScript |
| **Redis Sessions** | Fast session lookups (<10ms); automatic expiration via TTL |
| **Token Rotation** | Refresh tokens rotate on use; old token invalidated |
| **Rate Limiting** | 10 req/min on auth endpoints; 100 req/min on API routes |
| **Facility Scoping** | All resources scoped to `facility_id`; enforced at middleware level |
| **Audit Everything** | All auth events logged with user, IP, timestamp, action |

### Security Architecture

**Token Expiration:**
- Authorization codes: 10 minutes
- Access tokens: 1 hour (short-lived)
- Refresh tokens: 30 days (sliding window with rotation)

**Attack Prevention:**
- **CSRF:** State parameter + CSRF token in cookies
- **XSS:** httpOnly cookies, Content-Security-Policy headers
- **Open Redirect:** Whitelist redirect URIs, exact string matching
- **Code Interception:** PKCE prevents authorization code replay
- **Brute Force:** Rate limiting + account lockout after 5 failed attempts
- **Token Theft:** Refresh token rotation detects reuse

**Monitoring & Alerts:**
- Failed login attempts (>3 in 5 minutes)
- Geo-anomaly detection (login from new country)
- New device login (device fingerprinting)
- Token replay attempts (refresh token reuse)
- Unusual API patterns (rate spike, off-hours access)

---

## Testing Strategy

### Unit Tests (90%+ coverage required)

**OAuth Server:**
- Authorization endpoint: PKCE validation, redirect URI validation, state parameter
- Token endpoint: Code exchange, code_verifier validation, token generation
- Introspection: Token validation, expiration checks, signature verification

**Auth Middleware:**
- Token validation (valid, expired, invalid signature, revoked)
- RBAC checks (role inheritance, permission enforcement)
- Facility scoping (cross-org access blocked)

**Client Integration:**
- PKCE generation (code_verifier length, code_challenge SHA256)
- Token storage (secure cookies, httpOnly flag)
- Token refresh (automatic retry on 401, exponential backoff)

### Integration Tests

**Full OAuth Flows:**
1. Authorization code flow (start → redirect → approve → callback → tokens)
2. Token refresh flow (401 → refresh → new tokens → retry)
3. Session revocation (logout → tokens invalid → redirect to login)

**Protected Route Access:**
1. Unauthenticated user → 401 → redirect to login
2. Authenticated user, correct role → 200 OK
3. Authenticated user, wrong role → 403 Forbidden

**Error Scenarios:**
- Invalid client_id → 401 Unauthorized
- Invalid redirect_uri → Error page (no redirect for security)
- Expired authorization code → 400 Bad Request
- Invalid code_verifier → 400 Bad Request
- Revoked token → 401 Unauthorized

### E2E Tests (Playwright)

**Bingo Login Flow:**
1. Navigate to Bingo homepage
2. Click "Login" → redirects to Platform Hub
3. Enter credentials → click "Sign In"
4. Approve consent screen → redirects back to Bingo
5. Verify user name in header
6. Start game → verify API calls include Bearer token
7. Logout → verify redirect to login

**Trivia Login Flow:**
1. Navigate to Trivia homepage
2. Click "Login" → redirects to Platform Hub
3. Enter credentials → click "Sign In"
4. Approve consent screen → redirects back to Trivia
5. Verify user name in header
6. Start session → verify API calls include Bearer token
7. Logout → verify redirect to login

**Admin UI:**
1. Login as facility_admin
2. Navigate to `/admin/oauth-clients`
3. Create new OAuth client → verify client_secret displayed once
4. Navigate to `/admin/roles`
5. Assign `host` role to user → verify in database
6. Navigate to `/admin/analytics`
7. Verify usage metrics displayed

### Security Testing

**OWASP OAuth 2.0 Security Checklist:**
- [ ] Authorization code single-use enforced
- [ ] PKCE required for all clients
- [ ] Redirect URI exact matching (no wildcards)
- [ ] State parameter validated (CSRF protection)
- [ ] Client authentication on token endpoint
- [ ] Token expiration enforced
- [ ] Refresh token rotation implemented
- [ ] Rate limiting on all endpoints
- [ ] Audit logging complete

**Penetration Testing Scenarios:**
- Authorization code interception attack (PKCE prevents)
- CSRF attack on authorization endpoint (state parameter prevents)
- Token replay attack (short expiration + rotation prevents)
- Open redirect vulnerability (whitelist prevents)
- XSS token theft (httpOnly cookies prevent)

---

## Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Authorization flow (end-to-end) | <500ms p95 | From redirect to token receipt |
| Token validation | <50ms p95 | Introspection endpoint |
| API request overhead (with auth) | <200ms p95 | Middleware execution time |
| Session lookup (Redis) | <10ms p95 | Cache hit latency |
| Database query (auth) | <100ms p95 | User/role queries |

**Load Testing:**
- 1,000 concurrent users
- 10,000 authorization requests/hour
- 100,000 API requests/hour with token validation

---

## Rollout Plan

### Phase 1: Development (Weeks 1-6)
- Complete Projects 1.1-1.4 (OAuth server + security)
- Deploy to staging environment
- Internal testing with dev accounts

### Phase 2: Integration (Weeks 7-8)
- Complete Projects 1.5-1.6 (Bingo/Trivia integration)
- E2E testing with real user flows
- Performance benchmarking

### Phase 3: RBAC & Admin (Weeks 9-10)
- Complete Projects 1.7-1.8 (RBAC + admin features)
- Admin UI testing
- Documentation finalization

### Phase 4: Beta (Week 11)
- Deploy to production
- Invite 10 beta facilities
- Monitor auth metrics, error rates
- Gather feedback

### Phase 5: General Availability (Week 12+)
- Roll out to all facilities
- Monitor performance and security
- Incident response readiness

---

## Definition of Done (Initiative 1)

This initiative is complete when:

### Functional Requirements
- [ ] All 50 issues (BEA-210 to BEA-259) closed
- [ ] Platform Hub OAuth server operational
- [ ] Bingo and Trivia authenticate via Platform Hub
- [ ] All 5 RBAC roles enforced across apps
- [ ] Facility data isolation verified
- [ ] Admin UI functional for all management tasks

### Quality Requirements
- [ ] Unit test coverage ≥90% for auth code
- [ ] All integration tests passing
- [ ] All E2E tests passing (Bingo, Trivia, Admin)
- [ ] Security audit passed (OWASP OAuth checklist)
- [ ] Zero critical or high-severity vulnerabilities
- [ ] Performance benchmarks met (see table above)

### Documentation Requirements
- [ ] API documentation published (OpenAPI spec)
- [ ] Developer integration guide complete
- [ ] RBAC matrix documented
- [ ] Incident runbook created
- [ ] Architecture diagrams finalized

### Operational Requirements
- [ ] Production deployment complete
- [ ] Monitoring dashboards configured
- [ ] Alerting rules established
- [ ] Audit logs capturing 100% of events
- [ ] Backup and disaster recovery tested
- [ ] Graceful degradation plan for Redis/Supabase outages

### Success Metrics (30 days post-launch)
- [ ] 100% of users authenticate via Platform Hub OAuth
- [ ] Zero unauthorized access incidents
- [ ] Authentication error rate <1%
- [ ] Average authorization flow time <300ms
- [ ] Developer integration time <4 hours (from zero to working app)
- [ ] User satisfaction score ≥4.5/5

---

## Related Documents

- [Master Plan: Beak Gaming Platform](link-to-master-plan)
- [AI Agent Guide: OAuth Development](link-to-agent-guide)
- [LINEAR_PROJECTS_MANUAL_CREATION.md](../docs/LINEAR_PROJECTS_MANUAL_CREATION.md)
- [Pull Request Template](../.github/PULL_REQUEST_TEMPLATE.md)

---

**Document Version:** 1.0
**Last Updated:** 2026-01-21
**Owner:** Platform Team
**Reviewers:** Security Team, Infrastructure Team
