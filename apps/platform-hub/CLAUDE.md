# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Beak Gaming Platform Hub** - The central entry point for the Beak Gaming Platform. Provides game selection, authentication, and user dashboard.

**Current State:** OAuth 2.1 server complete (3,479 lines). Game selector UI complete. User dashboard and profile management not yet implemented.

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

## Implemented Features

### OAuth 2.1 Server (Complete)
- Token endpoint (authorization_code + refresh_token grants)
- PKCE validation (required)
- Refresh token rotation with reuse detection
- CSRF protection (cryptographically secure)
- Rate limiting (10 req/min per IP)
- Audit logging for OAuth events
- OAuth consent page with full UI

### Frontend
- Game selection home page with cards for Bingo and Trivia
- Complete auth form UI components (Login, Signup, Password Reset)
- Dashboard UI scaffolding
- Header and Footer components
- Responsive layout

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

## Current Routes

- `/` - Game selector (Bingo, Trivia)
- `/oauth/consent` - OAuth consent page
- `/api/oauth/token` - Token endpoint (OAuth 2.1)
- `/api/oauth/approve` - Consent approval
- `/api/oauth/deny` - Consent denial
- `/api/oauth/csrf` - CSRF token generation

## Planned Routes (TODO)

- `/dashboard` - User dashboard with real data (protected)
- `/dashboard/templates` - Saved game templates
- `/dashboard/settings` - User settings

## Future Work (TODO)

- [ ] User profile management (real data integration)
- [ ] Template management UI
- [ ] Facility branding/logo management
- [ ] Admin dashboard (RBAC tables exist, no UI)
- [ ] Cross-game session history
