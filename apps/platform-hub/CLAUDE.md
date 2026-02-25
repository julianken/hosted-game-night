# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Joolie Boolie Hub** - The central entry point for Joolie Boolie. Provides game selection, authentication, user dashboard, settings, template management, and OAuth 2.1 authorization server.

**Current State:** OAuth 2.1 server complete. Authentication (login, signup, password reset) fully functional. Dashboard with real data, settings page, template management, and multi-layer middleware stack all implemented.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Frontend | React + Tailwind CSS |
| Auth | Supabase Auth via @joolie-boolie/auth |
| Email | Resend SMTP (bypasses Supabase 2 emails/hour limit) |
| State Management | Zustand |
| PWA | Serwist (Service Worker) |

## Features

### OAuth 2.1 Server
- Token endpoint (authorization_code + refresh_token grants)
- PKCE validation (required)
- Refresh token rotation with reuse detection and family revocation
- CSRF protection (cryptographically secure, single-use tokens)
- Audit logging for OAuth events (authorize, token exchange, refresh, revoke)
- OAuth consent page with full UI
- Scheduled cleanup of expired authorizations (Vercel Cron, every 6 hours)

### Authentication
- Login/signup forms with Supabase authentication
- Password reset flow (ForgotPasswordForm → email → ResetPasswordForm)
- Session management with SSO cookies (`jb_*` prefix)
- Session timeout detection and redirect
- Cross-app authentication via OAuth

### Dashboard
- Game selection home page with cards for Bingo and Trivia
- User dashboard with real data (game stats, recent sessions, recent templates)
- Welcome header with resolved user display name
- User preferences section

### Settings
- Account settings (facility name, email, theme, password change)
- Theme selection (light/dark/system) with persistence

### Template Management
- Template listing with game type filters (all/bingo/trivia)
- Template deletion
- Aggregation API: fetches templates from both Bingo and Trivia APIs

### Middleware Stack
- **CORS:** Origin validation for OAuth API paths
- **Rate Limiting:** 10 req/min per IP, sliding window (Redis-backed in production, in-memory fallback)
- **Body Size:** 1MB limit on POST/PUT/PATCH requests
- **Session Management:** Supabase cookie refresh
- **Audit Logging:** OAuth event tracking to `oauth_audit_log` table (imported by route handlers, not in middleware chain)

### PWA Support
- Service worker with Serwist
- Offline-capable

### Email Configuration
- **Provider**: Resend SMTP (https://resend.com)
- **Purpose**: Bypass Supabase's built-in rate limit (2 emails/hour)
- **Free Tier**: 3,000 emails/month, 100 emails/day
- **Configuration**: Stored in Supabase dashboard (not .env files)

## Shared Packages

- `@joolie-boolie/ui` - Shared UI components (Button, Input, Toast used)
- `@joolie-boolie/theme` - Design tokens (consumed via CSS custom properties)
- `@joolie-boolie/auth` - AuthProvider, useAuth, useSession, getApiUser
- `@joolie-boolie/error-tracking` - Error boundary and logging
- `@joolie-boolie/database` - Database utilities

## Commands

```bash
# From monorepo root
pnpm dev:hub           # Start dev server on port 3002

# From apps/platform-hub
pnpm dev               # Start dev server
pnpm build             # Build app
pnpm test              # Run tests in watch mode
pnpm test:run          # Run tests once
```

## Routes

### Page Routes

| Route | Description | Auth Required |
|-------|-------------|---------------|
| `/` | Game selector home page | No |
| `/login` | Login page | No |
| `/signup` | Registration page | No |
| `/forgot-password` | Password reset request | No |
| `/reset-password` | New password form (from email link) | No |
| `/dashboard` | User dashboard with game stats | Yes |
| `/dashboard/templates` | Template management | Yes |
| `/dashboard/templates/[id]` | Template editor | Yes |
| `/settings` | Account settings | Yes |
| `/oauth/consent` | OAuth authorization consent | Yes |

### API Routes

| Route | Methods | Description |
|-------|---------|-------------|
| `/api/auth/login` | POST | Email/password login, sets SSO cookies |
| `/api/auth/logout` | POST | Revokes session, clears cookies |
| `/api/auth/reset-password` | POST | Password reset (recovery session only) |
| `/api/auth/sync-session` | POST | JWT verification + set SSO cookies |
| `/api/oauth/authorize` | GET | OAuth 2.1 authorization endpoint (PKCE) |
| `/api/oauth/token` | POST | Token exchange + refresh rotation |
| `/api/oauth/approve` | POST | Approve OAuth consent |
| `/api/oauth/deny` | POST | Deny OAuth consent |
| `/api/oauth/csrf` | GET | Generate CSRF token |
| `/api/oauth/authorization-details` | GET | Fetch authorization details |
| `/api/profile` | GET | Fetch user profile |
| `/api/profile/update` | POST | Update profile |
| `/api/profile/reset-e2e` | POST | Reset E2E test data (E2E only) |
| `/api/templates` | GET | Aggregate templates from game APIs |
| `/api/templates/[id]` | DELETE | Proxy delete to game API |
| `/api/cron/cleanup-authorizations` | GET | Vercel Cron: clean expired authorizations |
| `/api/cron/cleanup-sessions` | GET | Vercel Cron: mark expired sessions |

## Architecture Notes

- **No presenter/audience model:** Unlike game apps, platform-hub has no `/play` or `/display` routes
- **Middleware layers:** Root `middleware.ts` orchestrates: body-size → CORS → rate-limit → session management
- **Rate limiting:** Redis-backed (Upstash) in production, in-memory fallback for development. Skipped when `E2E_TESTING=true`
- **Audit logging:** Not in middleware chain — imported directly by OAuth route handlers
- **Display name resolution:** Supabase metadata fallback chain: display_name → full_name → name → email prefix → "Guest"
- **E2E support:** In-memory stores for profiles, templates, and OAuth authorizations when `E2E_TESTING=true`
- **Token rotation:** SHA-256 hashed refresh tokens with family tracking and reuse detection (`lib/token-rotation.ts`, `lib/refresh-token-store.ts`)

## Design Requirements

- **Accessible:** Large fonts (min 18px), high contrast, large click targets (min 44x44px)
- **Responsive:** Mobile-friendly layout
- **Security:** CSRF protection, rate limiting, body size limits, PKCE enforcement

## Testing

Tests are located alongside code in `__tests__` directories:
- `components/**/__tests__/` - Component tests
- `app/api/**/__tests__/` - API route tests
- `middleware/__tests__/` - Middleware tests
- `lib/__tests__/` - Library tests

```bash
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage
```

## Production URLs

| Service | URL |
|---------|-----|
| Platform Hub | `https://joolie-boolie.com` |
| Bingo | `https://bingo.joolie-boolie.com` |
| Trivia | `https://trivia.joolie-boolie.com` |

### `NEXT_PUBLIC_PLATFORM_HUB_URL` Environment Variable

Controls the base URL for OAuth `consent_page_url`. Used by OAuth client registration scripts.

- **Production (Vercel):** Set to `https://joolie-boolie.com`
- **Local development / E2E:** Falls back to `http://localhost:3002` if not set

## Email Troubleshooting

If password reset emails are not being delivered:

1. Check Supabase SMTP status: https://supabase.com/dashboard/project/{your-project-ref}/auth/smtp
2. Verify Resend API key is active: https://resend.com/api-keys
3. Check Resend delivery logs: https://resend.com/emails
4. View Supabase auth logs: https://supabase.com/dashboard/project/{your-project-ref}/logs/auth-logs
5. Test SMTP connection in Supabase dashboard (auto-validates on save)

## Future Work (TODO)

- [ ] Facility branding/logo management
- [ ] Admin dashboard (RBAC tables exist, no UI)
- [ ] Rich session history views
