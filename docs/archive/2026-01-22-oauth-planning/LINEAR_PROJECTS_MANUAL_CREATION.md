# Linear Projects - Manual Creation Guide

## Summary

Complete specifications for all 15 projects across 3 initiatives, organized by **execution order**. All projects have been successfully created in Linear.

---

## Team Information

- **Team Name:** Beak-gaming
- **Team ID:** `4deac7af-714d-4231-8910-e97c8cb1cd34`

---

## EXECUTION ORDER ⚡

**CRITICAL:** These initiatives are numbered by execution order. Complete them in this sequence:

### 1. Initiative 1: Platform Hub - OAuth Authorization Server
**Purpose:** Build the OAuth server, authentication UI, and Hub APIs
**Why First:** Everything else depends on this infrastructure

### 2. Initiative 2: Infrastructure & Shared Packages
**Purpose:** Build the @beak-gaming/oauth-client package and complete shared infrastructure
**Why Second:** Apps need this package to integrate with the OAuth server

### 3. Initiative 3: Core Apps as OAuth Clients
**Purpose:** Transform Bingo and Trivia into OAuth clients
**Why Last:** Depends on both Initiative 1 (OAuth server) and Initiative 2 (oauth-client package)

---

## Initiative 1: Platform Hub - OAuth Authorization Server

Build Platform Hub as the central OAuth 2.1 Authorization Server. **START HERE.**

**Total Estimated Issues:** 73-87

### Project 1.1: OAuth Server Setup & Configuration ⚡ FOUNDATION

**Priority:** Urgent/Critical (1)
**Status:** Planned
**Estimated Issues:** 10-12

**Summary:**
Enable and configure Supabase OAuth 2.1 server as the authorization server. **ALL OTHER WORK DEPENDS ON THIS.**

**Key Deliverables:**
- Enable Supabase OAuth 2.1 server feature
- Register OAuth clients (Bingo, Trivia)
- Define OAuth scopes: `read:profile`, `write:profile`, `read:bingo`, `write:bingo`, `read:trivia`, `write:trivia`, `read:templates`, `write:templates`, `admin`
- Configure client credentials and redirect URIs
- Set up PKCE validation
- Configure token expiration policies
- Security configuration (rate limiting, token policies)
- Documentation (OAuth flow diagrams, client integration guide)

**Dependencies:** None - START HERE

---

### Project 1.2: Authentication UI & User Flows

**Priority:** High (2)
**Status:** Planned
**Estimated Issues:** 12-15

**Summary:**
Build all authentication and authorization UI for the Hub

**Key Deliverables:**
- **Login & Registration:** Login page, registration, password reset, email verification, form validation
- **OAuth Authorization Flow UI:** Consent screen, scope display, client app info, error handling
- **Profile Management:** View/edit profile, change password, delete account
- **Connected Apps Management:** View connected apps, revoke access, view permissions
- **Error & Edge Cases:** Already logged in handling, redirects, session timeout, invalid requests

**Dependencies:** Project 1.1 (OAuth Server Setup)

---

### Project 1.3: Hub API Layer - User & Profile APIs

**Priority:** High (2)
**Status:** Planned
**Estimated Issues:** 8-10

**Summary:**
Build Next.js API routes for user profile and preferences

**Key Deliverables:**
- **User Profile Endpoints:** `GET /api/users/me`, `PATCH /api/users/me`, `GET /api/users/[userId]` (admin)
- **User Preferences Endpoints:** `GET/PATCH /api/users/me/preferences`, default preferences
- **Authentication & Authorization:** OAuth token validation, scope-based auth, user ID extraction
- **Data Validation:** Zod schemas, email validation, password strength
- **Error Handling:** Standard responses, HTTP status codes

**Dependencies:** Project 1.1 (OAuth Server Setup)

---

### Project 1.4: Hub API Layer - Template APIs

**Priority:** High (2)
**Status:** Planned
**Estimated Issues:** 10-12

**Summary:**
Build APIs for Bingo and Trivia template management

**Key Deliverables:**
- **Bingo Template Endpoints:** List, create, get, update, delete Bingo templates
- **Trivia Template Endpoints:** List, create, get, update, delete question sets
- **Database Schema:** `bingo_templates` and `trivia_templates` tables with indexes
- **Authorization:** Users can only access their own templates, scope validation
- **Validation:** Template name, pattern/question validation, JSON schema

**Dependencies:** Project 1.1 (OAuth Server Setup)

---

### Project 1.5: Hub API Layer - Game Session APIs

**Priority:** High (2)
**Status:** Planned
**Estimated Issues:** 8-10

**Summary:**
Build APIs for game session CRUD operations

**Key Deliverables:**
- **Session Management Endpoints:** Create, get, update state, verify PIN, delete sessions
- **Multi-Game Support:** Game type parameter, game-specific serialization/validation
- **Session Token Generation:** HMAC-signed tokens, validation, refresh
- **Authorization:** Scope validation, PIN validation, ownership verification
- **Error Handling:** Session not found, invalid PIN, invalid state, expired sessions

**Dependencies:** Project 1.1 (OAuth Server Setup)

---

### Project 1.6: User Dashboard

**Priority:** Medium (3)
**Status:** Planned
**Estimated Issues:** 10-12

**Summary:**
Build the main user dashboard UI

**Key Deliverables:**
- **Dashboard Layout:** Header, navigation sidebar, main content, responsive design
- **Dashboard Widgets:** Profile summary, recent games, saved templates, connected apps
- **Navigation Links:** Game selector, template management, profile settings
- **Loading & Error States:** Spinners, empty states, errors, retry buttons
- **Accessibility:** Semantic HTML, ARIA labels, keyboard navigation, screen readers

**Dependencies:** Project 1.3 (User & Profile APIs)

---

### Project 1.7: Template Management UI

**Priority:** Medium (3)
**Status:** Planned
**Estimated Issues:** 12-15

**Summary:**
Build UI for creating, editing, and deleting templates

**Key Deliverables:**
- **Template List Views:** Bingo/Trivia lists, search/filter, sorting
- **Bingo Template Editor:** Pattern selector, custom designer, audio settings, theme selector
- **Trivia Template Editor:** Question list editor, add/remove/reorder, category/difficulty tags, import CSV/JSON
- **Template Actions:** Create, edit, duplicate, delete (with confirmation), export JSON
- **Validation:** Name required, minimum questions, valid pattern, duplicate warnings

**Dependencies:** Project 1.4 (Template APIs)

---

### Project 1.8: Facility & Admin Features

**Priority:** Medium (3)
**Status:** Planned
**Estimated Issues:** 15-18

**Summary:**
Build facility-level features for retirement community staff

**Key Deliverables:**
- **Facility Management:** Profile, add/remove staff, role assignment
- **User Management (Admin Only):** View residents, create accounts, reset passwords, view activity
- **Scheduled Game Sessions:** Schedule games, recurring schedules, email reminders, calendar view
- **Activity Reports:** Popular games, active users, template usage, average duration, export CSV/PDF
- **Admin UI:** Admin dashboard, role-based access control, audit logs

**Dependencies:** Project 1.3 (User & Profile APIs)

---

## Initiative 2: Infrastructure & Shared Packages

Complete shared packages and infrastructure. **DO THIS SECOND.**

**Total Estimated Issues:** 57-73

### Project 2.1: @beak-gaming/oauth-client Package ⚡ CRITICAL

**Priority:** High (2)
**Status:** Planned
**Estimated Issues:** 12-15

**Summary:**
Centralized OAuth 2.1 client package with flows, hooks, middleware, and token management

**Key Deliverables:**
- Package scaffolding (TypeScript, build config)
- OAuth flow utilities (authorization, PKCE, token exchange, refresh)
- Secure token storage abstraction
- Next.js middleware factory
- React hooks (useAuth, useAccessToken, useUser)
- API client factory (auto-adds Bearer token)
- TypeScript types (tokens, user, OAuth config)
- Error handling utilities
- Test utilities for OAuth flows
- Documentation (usage guide, examples)

**Dependencies:** Project 1.1 (OAuth Server Setup) for testing

---

### Project 2.2: @beak-gaming/game-engine Completion

**Priority:** Medium (3)
**Status:** Planned
**Estimated Issues:** 8-10

**Summary:**
Complete game-engine package with state machine, round management, timers, and testing

**Key Deliverables:**
- Complete state machine implementation
- Round management utilities
- Score calculation abstractions
- Timer/countdown utilities
- Game lifecycle event system
- Validation utilities
- Test coverage (unit tests)
- Documentation and examples

**Dependencies:** None

---

### Project 2.3: Minor Package Updates

**Priority:** Low (4)
**Status:** Planned
**Estimated Issues:** 4-6

**Summary:**
Bug fixes and optimizations for auth and database packages

**Key Deliverables:**
- @beak-gaming/auth: Bug fixes, additional helper utilities
- @beak-gaming/database: Performance optimizations, edge case handling

**Dependencies:** OAuth integration in apps for testing

---

### Project 2.4: Testing & Quality Assurance

**Priority:** High (2)
**Status:** Planned
**Estimated Issues:** 15-20

**Summary:**
Comprehensive OAuth, E2E, API, security, and accessibility testing

**Key Deliverables:**
- OAuth flow integration tests (full flows, token refresh, scope validation)
- E2E tests (Playwright) - user journeys, dual-screen scenarios, revoke access
- API testing (all Hub endpoints, rate limiting, invalid tokens)
- Security testing (token leakage, PKCE, CSRF, XSS/SQL injection)
- Accessibility audit (WCAG compliance, keyboard navigation, screen readers)

**Dependencies:** All apps integrated with OAuth

---

### Project 2.5: Production Readiness

**Priority:** High (2)
**Status:** Planned
**Estimated Issues:** 18-22

**Summary:**
Security audit, performance optimization, monitoring, CI/CD, and production documentation

**Key Deliverables:**
- Security audit (OAuth-specific, token security, client secrets, redirect URIs)
- Rate limiting (per OAuth client, per user, per API endpoint)
- Monitoring & Observability (failed OAuth attempts, token refresh failures, API errors, metrics)
- Performance optimization (API caching, database queries, bundle size, Lighthouse audits)
- CI/CD (automated testing, staging, preview deployments, production pipeline, rollback)
- Documentation (OAuth integration guide, API docs, deployment runbook, troubleshooting, security best practices)

**Dependencies:** All apps complete, testing done

---

## Initiative 3: Core Apps as OAuth Clients

Transform Bingo and Trivia into OAuth clients. **DO THIS LAST.**

**Total Estimated Issues:** 24-30

### Project 3.1: Bingo App - OAuth Client Integration

**Priority:** High (2)
**Status:** Planned
**Estimated Issues:** 12-15

**Summary:**
Transform Bingo into an OAuth client that authenticates through Platform Hub

**Key Deliverables:**
- **OAuth Flow Implementation:** Authorization code flow with PKCE, callback handler, state validation
- **Token Management:** Secure storage (HttpOnly cookies), automatic refresh, validation middleware
- **API Integration:** Replace direct Supabase calls with Hub API calls, template system, profile data
- **Route Protection:** Protected route middleware, redirect to Hub, token verification
- **Error Handling:** Token expiration, OAuth errors, network recovery, user-friendly messages
- **Testing:** OAuth flow tests, token refresh tests, protected route tests, error scenarios

**Dependencies:**
- Project 1.1 (OAuth Server Setup) - MUST BE COMPLETE
- Project 2.1 (@beak-gaming/oauth-client package) - MUST BE COMPLETE
- Projects 1.3-1.5 (Hub API endpoints)

---

### Project 3.2: Trivia App - OAuth Client Integration

**Priority:** High (2)
**Status:** Planned
**Estimated Issues:** 12-15

**Summary:**
Transform Trivia into an OAuth client that authenticates through Platform Hub

**Key Deliverables:**
- **OAuth Flow Implementation:** Authorization code flow with PKCE, callback handler, state validation
- **Token Management:** Secure storage (HttpOnly cookies), automatic refresh, validation middleware
- **API Integration:** Replace direct Supabase calls with Hub API calls, question import, profile data
- **Route Protection:** Protected route middleware, redirect to Hub, token verification
- **Error Handling:** Token expiration, OAuth errors, network recovery, user-friendly messages
- **Testing:** OAuth flow tests, token refresh tests, protected route tests, error scenarios

**Dependencies:**
- Project 1.1 (OAuth Server Setup) - MUST BE COMPLETE
- Project 2.1 (@beak-gaming/oauth-client package) - MUST BE COMPLETE
- Projects 1.3-1.5 (Hub API endpoints)

---

## Priority Legend

- **1 (Urgent/Critical):** Must be done first, blocks everything else
- **2 (High):** Critical path items, should be done early
- **3 (Medium):** Important but not blocking
- **4 (Low):** Nice to have, can be deferred

---

## Estimated Total Issues

- **Initiative 1 (Platform Hub):** 73-87 issues (8 projects)
- **Initiative 2 (Infrastructure):** 57-73 issues (5 projects)
- **Initiative 3 (Core Apps):** 24-30 issues (2 projects)

**Grand Total:** ~154-190 issues across 15 projects

---

## Critical Path

The fastest path to getting apps working with OAuth:

1. **Project 1.1** (OAuth Server Setup) ← Start here
2. **Project 2.1** (@beak-gaming/oauth-client Package) ← Build in parallel with 1.2-1.5
3. **Projects 1.2-1.5** (Hub APIs) ← Can work on these while Project 2.1 is in progress
4. **Project 3.1 & 3.2** (Bingo & Trivia OAuth integration) ← Only after 1.1, 2.1, and 1.3-1.5 are done
5. **Projects 1.6-1.8** (Dashboard, Templates, Admin) ← Can be done in parallel with or after apps
6. **Project 2.4** (Testing) ← After all integration complete
7. **Project 2.5** (Production Readiness) ← Final step

---

## Next Steps

1. ✅ **All 15 projects created in Linear** with initiative tags
2. **Start work on Project 1.1** (OAuth Server Setup & Configuration)
3. **Create issues** for each project (use estimated counts as guidance)
4. **Set up project dependencies** in Linear
5. **Follow the execution order** strictly to avoid blockers
