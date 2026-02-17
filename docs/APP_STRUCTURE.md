# App Structure Reference

This document describes the directory patterns used by each app.

## Game App Layout (Bingo, Trivia)

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # BFF API routes (all Supabase access goes here)
│   │   ├── auth/           # Authentication endpoints (logout, token)
│   │   ├── templates/      # Template CRUD
│   │   └── sessions/       # Session management
│   ├── play/               # Presenter view (host controls)
│   ├── display/            # Audience view (projector/TV)
│   ├── auth/callback/      # OAuth callback handler
│   └── layout.tsx          # Root layout with providers
├── components/
│   ├── presenter/          # Host-facing control components
│   ├── audience/           # Display-optimized components
│   └── ui/                 # App-specific UI primitives
├── lib/
│   ├── game/               # Game engine (pure functions)
│   ├── auth/               # OAuth client (PKCE flow utilities)
│   ├── session/            # Session management
│   └── sync/               # BroadcastChannel session wrapper
├── stores/                 # Zustand stores (game, audio, theme, settings)
├── hooks/                  # Custom React hooks
├── types/                  # App-specific TypeScript types
└── middleware.ts           # OAuth JWT verification (lazy JWKS init)
```

### Trivia-Specific Additions

| Directory | Purpose |
|-----------|---------|
| `app/question-sets/` | Question set management page |
| `app/api/presets/` | Preset CRUD API |
| `app/api/question-sets/` | Question set CRUD + import API |
| `components/question-editor/` | Full question editing interface |
| `components/stats/` | Statistics display |
| `lib/questions/` | Question parser, validator, converter, exporter |
| `lib/game/buzz-in.ts` | Buzz-in game mechanic |

### Bingo-Specific Additions

| Directory | Purpose |
|-----------|---------|
| `lib/game/patterns/` | 29 bingo winning patterns across 7 categories |
| `lib/game/ball-deck.ts` | Fisher-Yates shuffle ball deck |
| `lib/game/state-machine.ts` | Game status state machine |
| `app/api/sessions/join-by-pin/` | PIN-based session joining |

## Platform Hub Layout

Platform Hub has no presenter/audience model. It serves as the auth server and central dashboard.

```
src/
├── app/
│   ├── api/
│   │   ├── auth/           # Login, logout, password reset, session sync
│   │   ├── oauth/          # OAuth 2.1 server (authorize, token, approve, deny, csrf)
│   │   ├── profile/        # User profile CRUD
│   │   ├── templates/      # Template aggregation from game APIs
│   │   └── cron/           # Scheduled cleanup tasks (Vercel Cron)
│   ├── dashboard/          # User dashboard (stats, sessions, templates)
│   ├── settings/           # Account settings
│   ├── login/              # Login page
│   ├── signup/             # Registration page
│   ├── forgot-password/    # Password reset request
│   ├── reset-password/     # New password form
│   ├── oauth/consent/      # OAuth consent page
│   └── layout.tsx          # Root layout (AuthProvider, theme, error boundary)
├── components/
│   ├── auth/               # Auth forms (Login, Signup, ForgotPassword, ResetPassword)
│   ├── dashboard/          # Dashboard components (GameCard, RecentSessions, etc.)
│   ├── oauth/              # Consent screen components
│   ├── profile/            # Avatar, profile components
│   ├── templates/          # Template card
│   └── providers/          # ErrorBoundaryProvider
├── middleware/              # CORS, rate limiting, body size, audit logging
├── lib/
│   ├── auth/               # OAuth-to-Supabase session bridge
│   ├── oauth/              # OAuth scopes, E2E authorization store
│   └── supabase/           # Client, server, middleware Supabase clients
├── stores/                 # Theme store
├── hooks/                  # Theme hook
├── types/                  # OAuth types, theme types
└── middleware.ts           # Root middleware orchestrator
```

## Key Differences

| Concern | Game Apps (Bingo, Trivia) | Platform Hub |
|---------|--------------------------|--------------|
| Views | `/play` (presenter) + `/display` (audience) | Standard pages (dashboard, settings, login) |
| Sync | BroadcastChannel via `@joolie-boolie/sync` | None |
| Auth role | OAuth client (consumes tokens) | OAuth server (issues tokens) |
| Middleware | JWT verification (single file) | Multi-layer (CORS, rate limit, body size, session) |
| API pattern | Game-specific endpoints | Auth server + template aggregation |
