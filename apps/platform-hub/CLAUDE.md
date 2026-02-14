# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beak Gaming Platform Hub** - The central entry point for the Beak Gaming Platform. Provides game selection, authentication, and user dashboard.

**Current State:** OAuth 2.1 server complete (3,479 lines). Game selector UI complete. User dashboard and settings pages implemented.

## Purpose

- **Game Selector:** Links to Bingo and Trivia apps (implemented)
- **Authentication:** Shared login/register for all games (planned)
- **Dashboard:** User profile, saved templates across games (planned)
- **Branding:** Facility logo management (planned)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js (App Router) |
| Frontend | React + Tailwind CSS |
| Auth | Supabase Auth via @beak-gaming/auth (planned) |
| Email | Resend SMTP (bypasses Supabase 2 emails/hour limit) |

## Implemented Features

### OAuth 2.1 Server (Complete)
- Token endpoint (authorization_code + refresh_token grants)
- PKCE validation (required)
- Refresh token rotation with reuse detection
- CSRF protection (cryptographically secure)
- Rate limiting (10 req/min per IP)
- Audit logging for OAuth events
- OAuth consent page with full UI
- Scheduled cleanup of expired authorizations (Vercel Cron, every 6 hours)

### Frontend
- Game selection home page with cards for Bingo and Trivia
- Complete auth form UI components (Login, Signup, Password Reset)
- Password reset flow (ForgotPasswordForm → email → ResetPasswordForm)
- Dashboard UI scaffolding
- Header and Footer components
- Responsive layout

### Email Configuration
- **Provider**: Resend SMTP (https://resend.com)
- **Purpose**: Bypass Supabase's built-in rate limit (2 emails/hour)
- **Free Tier**: 3,000 emails/month, 100 emails/day
- **Configuration**: Stored in Supabase dashboard (not .env files)
- **Sender**: onboarding@resend.dev (testing) or custom verified domain (production)
- **Dashboard**: https://resend.com/emails

## Shared Packages

- `@beak-gaming/ui` - Shared UI components (planned usage)
- `@beak-gaming/theme` - Senior-friendly design tokens (planned usage)
- `@beak-gaming/auth` - Supabase authentication (planned usage)

## Key Commands

```bash
# From monorepo root
pnpm dev:hub           # Start dev server on port 3002

# From apps/platform-hub
pnpm dev               # Start dev server
pnpm build             # Build app
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx     # Root layout
│   └── page.tsx       # Game selector home page
└── components/
    ├── Header.tsx     # Site header
    ├── Footer.tsx     # Site footer
    ├── GameCard.tsx   # Game selection cards
    └── index.ts       # Component exports
```

## Current Routes

- `/` - Game selector (Bingo, Trivia)
- `/login` - User login page
- `/signup` - User registration page
- `/forgot-password` - Password reset request (sends email)
- `/reset-password` - Password reset form (from email link)
- `/dashboard` - User dashboard (protected)
- `/dashboard/templates` - Template management (protected)
- `/dashboard/templates/[id]` - Template editor (protected)
- `/settings` - User settings (protected)
- `/oauth/consent` - OAuth consent page
- `/api/auth/login` - Login endpoint
- `/api/auth/logout` - Logout endpoint
- `/api/auth/reset-password` - Password reset endpoint
- `/api/auth/sync-session` - Session sync endpoint
- `/api/oauth/authorize` - Authorization endpoint
- `/api/oauth/token` - Token endpoint (OAuth 2.1)
- `/api/oauth/approve` - Consent approval
- `/api/oauth/deny` - Consent denial
- `/api/oauth/csrf` - CSRF token generation
- `/api/oauth/authorization-details` - Get authorization details
- `/api/profile` - Get user profile
- `/api/profile/update` - Update user profile
- `/api/profile/reset-e2e` - Reset E2E test data
- `/api/templates` - Template CRUD operations
- `/api/templates/[id]` - Template by ID
- `/api/cron/cleanup-authorizations` - Scheduled cleanup of expired OAuth authorizations (Vercel Cron)

## Planned Routes (TODO)

None - all core routes implemented.


## Future Work (TODO)

- [x] Password reset flow (BEA-319) - COMPLETE
- [ ] User profile management (real data integration)
- [ ] Template management UI
- [ ] Facility branding/logo management
- [ ] Admin dashboard (RBAC tables exist, no UI)
- [ ] Cross-game session history

## Email Troubleshooting

If password reset emails are not being delivered:

1. Check Supabase SMTP status: https://supabase.com/dashboard/project/iivxpjhmnalsuvpdzgza/auth/smtp
2. Verify Resend API key is active: https://resend.com/api-keys
3. Check Resend delivery logs: https://resend.com/emails
4. View Supabase auth logs: https://supabase.com/dashboard/project/iivxpjhmnalsuvpdzgza/logs/auth-logs
5. Test SMTP connection in Supabase dashboard (auto-validates on save)
