# Linear Project Structure - OAuth Integration (Revised)

**Initiative:** Platform Hub - Core Infrastructure
**Linear ID:** c73511af8b90
**Status:** Simplified based on agent validation
**Last Updated:** 2026-01-21

---

## Overview

This document replaces the original LINEAR_PROJECTS_MANUAL_CREATION.md with a simplified project structure leveraging Supabase's native OAuth 2.1 server.

**Original Plan:** 8 projects, 154-190 issues
**Revised Plan:** 2 projects, 12-15 issues
**Reduction:** 92%

---

## Project Breakdown

### Project 1: OAuth Server Setup

**Scope:** Enable Supabase OAuth 2.1 server and build consent UI
**Dependencies:** None (blocking for all other projects)
**Issue Count:** 5 (consolidated from 7)
**Complexity:** Low-Medium

#### Issues

**BEA-260: Configure Supabase OAuth 2.1 Server and Register Clients**
- Priority: P0 (blocking)
- Complexity: Simple (configuration only, ~15 minutes)
- Type: Dashboard configuration + environment variables
- Acceptance Criteria:
  - OAuth 2.1 server enabled in Supabase Dashboard
  - Authorization path configured: `http://localhost:3002/oauth/consent`
  - Token expiration set to 1 hour (3600s)
  - PKCE requirement enabled (S256)
  - Bingo client registered:
    - Client name: "Beak Bingo"
    - Client type: Public (PKCE, no secret)
    - Redirect URIs: `http://localhost:3000/auth/callback`, `https://bingo.beakgaming.com/auth/callback`
    - Scopes: `openid email profile`
    - Client ID saved to `apps/bingo/.env.local`
  - Trivia client registered:
    - Client name: "Trivia Night"
    - Client type: Public (PKCE, no secret)
    - Redirect URIs: `http://localhost:3001/auth/callback`, `https://trivia.beakgaming.com/auth/callback`
    - Scopes: `openid email profile`
    - Client ID saved to `apps/trivia/.env.local`
  - Both `.env.example` files updated with OAuth section
  - Verification: OIDC discovery endpoint returns metadata
  - Verification: JWKS endpoint accessible
  - Verification script passes: `./scripts/verify-oauth-phase1.sh`
- Notes:
  - Previously split into BEA-300, BEA-301, BEA-302
  - Consolidated because all work happens in single Dashboard session
  - See `docs/INITIATIVE_1_REVISED_OAUTH.md` - Phase 1 for detailed checklist

**BEA-263: Create OAuth Consent Page UI**
- Priority: P0 (blocking for OAuth flow)
- Complexity: Medium
- Dependencies: BEA-260
- Files:
  - `apps/platform-hub/src/app/oauth/consent/page.tsx`
- Acceptance Criteria:
  - Displays client name and requested scopes
  - Shows logged-in user email
  - "Allow" and "Deny" buttons (44x44px minimum)
  - Senior-friendly design (18px+ fonts, high contrast)
  - Handles invalid/missing authorization_id
  - Redirects unauthenticated users to login

**BEA-264: Implement Get Authorization Details API**
- Priority: P0 (blocking for consent UI)
- Complexity: Simple
- Dependencies: BEA-260
- Files:
  - `apps/platform-hub/src/app/api/oauth/consent/route.ts`
- Acceptance Criteria:
  - `GET /api/oauth/consent?authorization_id=<id>` implemented
  - Calls `supabase.auth.oauth.getAuthorizationDetails()`
  - Returns `{ client_name, scopes, redirect_uri, user }`
  - Error handling: Invalid ID, expired authorization

**BEA-265: Implement Consent Approval Handler**
- Priority: P0 (blocking for OAuth flow)
- Complexity: Simple
- Dependencies: BEA-260
- Files:
  - `apps/platform-hub/src/app/api/oauth/approve/route.ts`
- Acceptance Criteria:
  - `POST /api/oauth/approve { authorization_id }` implemented
  - Calls `supabase.auth.oauth.approveAuthorization()`
  - Redirects to client app with authorization code
  - Error handling: Invalid ID, already used, expired

**BEA-266: Implement Consent Denial Handler**
- Priority: P1
- Complexity: Simple
- Dependencies: BEA-260
- Files:
  - `apps/platform-hub/src/app/api/oauth/deny/route.ts`
- Acceptance Criteria:
  - `POST /api/oauth/deny { authorization_id }` implemented
  - Calls `supabase.auth.oauth.denyAuthorization()`
  - Redirects to client with `error=access_denied`
  - Logs denial for audit trail

---

### Project 2: App OAuth Integration

**Scope:** Integrate Bingo and Trivia with OAuth flow
**Dependencies:** Project 1 (BEA-260)
**Issue Count:** 6
**Complexity:** Medium

#### Bingo Issues

**BEA-307: Add OAuth Login to Bingo**
- Priority: P0
- Complexity: Medium
- Dependencies: BEA-260 (Bingo client registered)
- Files:
  - `apps/bingo/src/lib/oauth.ts` (new)
  - `apps/bingo/src/components/LoginButton.tsx` (new or update)
- Acceptance Criteria:
  - PKCE code_verifier and code_challenge generation
  - code_verifier stored in sessionStorage
  - Redirects to Supabase authorization endpoint with PKCE
  - All query params correctly formatted
  - Error handling: PKCE generation failure

**BEA-308: Handle OAuth Callback in Bingo**
- Priority: P0
- Complexity: Medium
- Dependencies: BEA-307
- Files:
  - `apps/bingo/src/app/auth/callback/page.tsx` (new)
  - `apps/bingo/src/app/api/auth/store-tokens/route.ts` (new)
- Acceptance Criteria:
  - Extracts `code` from URL query params
  - Retrieves code_verifier from sessionStorage
  - Exchanges code for tokens via Supabase token endpoint
  - Stores tokens in httpOnly cookies
  - Cleans up sessionStorage
  - Redirects to `/play` on success
  - Error handling: Missing code, invalid code, token exchange failure

**BEA-309: Protect Bingo /play Route**
- Priority: P0
- Complexity: Medium
- Dependencies: BEA-308
- Files:
  - `apps/bingo/src/middleware.ts` (update)
- Acceptance Criteria:
  - Checks for valid access_token in cookies
  - Verifies token signature using JWKS endpoint
  - Extracts user info from JWT claims
  - Redirects unauthenticated users to Platform Hub login
  - Adds user headers to request (x-user-id, x-user-email)
  - Handles expired tokens gracefully

#### Trivia Issues

**BEA-310: Add OAuth Login to Trivia**
- Priority: P0
- Complexity: Medium (same as BEA-307 for Trivia)
- Dependencies: BEA-260 (Trivia client registered)
- Files:
  - `apps/trivia/src/lib/oauth.ts` (new)
  - `apps/trivia/src/components/LoginButton.tsx` (new or update)
- Acceptance Criteria: Same as BEA-307 but for Trivia app

**BEA-311: Handle OAuth Callback in Trivia**
- Priority: P0
- Complexity: Medium (same as BEA-308 for Trivia)
- Dependencies: BEA-310
- Files:
  - `apps/trivia/src/app/auth/callback/page.tsx` (new)
  - `apps/trivia/src/app/api/auth/store-tokens/route.ts` (new)
- Acceptance Criteria: Same as BEA-308 but for Trivia app

**BEA-312: Protect Trivia /play Route**
- Priority: P0
- Complexity: Medium (same as BEA-309 for Trivia)
- Dependencies: BEA-311
- Files:
  - `apps/trivia/src/middleware.ts` (update)
- Acceptance Criteria: Same as BEA-309 but for Trivia app

---

## Phase Dependencies

### Phase 1: Foundation (Blocking)

**Issues:** BEA-260
**Blocks:** All other phases
**Work Type:** Configuration only (no coding)

Must complete before starting any other work.

### Phase 2: Consent UI (Blocked by Phase 1)

**Issues:** BEA-263, BEA-264, BEA-265, BEA-266
**Depends on:** BEA-260 (OAuth server enabled)
**Work Type:** Coding (React + API routes)

Can start once Phase 1 is complete.

### Phase 3: App Integration (Blocked by Phase 1)

**Issues:** BEA-307, BEA-308, BEA-309 (Bingo), BEA-310, BEA-311, BEA-312 (Trivia)
**Depends on:** BEA-260 (clients registered)
**Work Type:** Coding (PKCE, middleware)

Can start in parallel with Phase 2 once Phase 1 is complete.

---

## Complexity Breakdown

| Issue | Priority | Complexity | Type | Dependencies |
|-------|----------|-----------|------|--------------|
| BEA-260 | P0 | Simple | Config | None |
| BEA-263 | P0 | Medium | Code | BEA-260 |
| BEA-264 | P0 | Simple | Code | BEA-260 |
| BEA-265 | P0 | Simple | Code | BEA-260 |
| BEA-266 | P1 | Simple | Code | BEA-260 |
| BEA-307 | P0 | Medium | Code | BEA-260 |
| BEA-308 | P0 | Medium | Code | BEA-307 |
| BEA-309 | P0 | Medium | Code | BEA-308 |
| BEA-310 | P0 | Medium | Code | BEA-260 |
| BEA-311 | P0 | Medium | Code | BEA-310 |
| BEA-312 | P0 | Medium | Code | BEA-311 |

**Total:** 11 issues (9 P0, 1 P1)

---

## Deferred Features (Not in MVP)

These features from the original plan are intentionally deferred to Phase 2+:

### Phase 2 (Priority 2)
- RBAC (Role-Based Access Control)
- Facility scoping (multi-tenancy)
- Session management UI for users (`/dashboard/sessions`)
- Admin UI for client management
- User grant revocation page (`/dashboard/connected-apps`)

### Phase 3 (Priority 3)
- OAuth scope customization beyond standard scopes
- Rate limiting per OAuth client
- Analytics and usage tracking dashboards
- Audit logs and compliance reporting
- MFA (Multi-Factor Authentication) integration
- Staff scheduling system (out of scope entirely)

---

## Testing Strategy

### Unit Tests
- PKCE generation functions
- Token validation middleware
- Consent UI component rendering
- API route error handling

### Integration Tests
- Full OAuth flow (login → consent → callback → protected route)
- Token refresh before expiration
- Cross-app session sharing (Bingo → Trivia)
- Logout invalidates all sessions

### E2E Tests (Playwright)
1. User registers → Platform Hub
2. User clicks "Play Bingo" → OAuth flow
3. User approves consent → Redirects to Bingo
4. User accesses /play → Authenticated
5. User clicks "Play Trivia" → No re-auth (same session)
6. User logs out → All sessions invalidated

---

## Definition of Done (MVP)

### Project 1 Complete When:
- [ ] OAuth 2.1 server enabled in Supabase
- [ ] Both apps registered as OAuth clients
- [ ] Consent UI fully functional
- [ ] All API routes tested and working
- [ ] Unit tests passing

### Project 2 Complete When:
- [ ] Bingo OAuth flow functional (login → consent → callback → /play)
- [ ] Trivia OAuth flow functional (login → consent → callback → /play)
- [ ] Protected routes working (redirect unauthenticated users)
- [ ] Token refresh implemented
- [ ] E2E tests passing

### MVP Complete When:
- [ ] User can register/login via Platform Hub
- [ ] User can access Bingo via OAuth
- [ ] User can access Trivia via OAuth
- [ ] Cross-app session sharing works
- [ ] Security audit passed
- [ ] Documentation complete

---

## Archived Projects (From Original Plan)

The following projects are **eliminated** in the revised plan:

- ❌ **Project 1.1-1.4:** OAuth Server Implementation (29 issues)
  - Reason: Supabase provides OAuth server natively

- ❌ **Project 2.1:** @beak-gaming/oauth-client Package (12-15 issues)
  - Reason: Use `@supabase/supabase-js` directly

- ❌ **Project 1.5:** Redis Session Storage (4 issues)
  - Reason: Supabase manages sessions

- ❌ **Project 1.8:** Developer Portal (5 issues)
  - Reason: Overkill for internal apps, deferred to Phase 3

---

## Migration Notes

### From Direct Supabase Auth to OAuth

**Current State:**
- Apps use Supabase Auth directly (email/password)
- No centralized auth UI
- Each app manages its own auth

**Target State:**
- Platform Hub provides centralized auth UI
- Apps use OAuth flow to authenticate
- Supabase manages sessions centrally

**Migration Strategy:**
1. Implement OAuth alongside existing auth (dual support)
2. Add feature flag to enable OAuth
3. Test OAuth flow in production
4. Gradually migrate users to OAuth
5. Deprecate direct auth once stable

---

## Reference Documents

- [INITIATIVE_1_REVISED_OAUTH.md](./INITIATIVE_1_REVISED_OAUTH.md) - Full implementation spec
- [AGENT_VALIDATION_SUMMARY.md](./AGENT_VALIDATION_SUMMARY.md) - Agent findings
- [Supabase OAuth 2.1 Docs](https://supabase.com/docs/guides/auth/oauth-server)

---

## Change Log

**2026-01-21 - Revised Plan Created**
- Reduced from 154-190 issues to 12-15 issues
- Eliminated custom OAuth server (29 issues)
- Eliminated oauth-client package (12-15 issues)
- Leveraged Supabase native OAuth 2.1 server
- Based on validation by 4 specialized agents
