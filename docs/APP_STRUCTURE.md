# App Structure Reference

This document describes the canonical directory layout used by each game app (`apps/bingo`, `apps/trivia`, `apps/platform-hub`).

## Canonical Layout

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # BFF API routes (all Supabase access goes here)
│   │   ├── auth/           # Authentication endpoints
│   │   ├── templates/      # Template CRUD (bingo/trivia)
│   │   └── games/          # Game-specific endpoints
│   ├── play/               # Presenter view (host controls)
│   ├── display/            # Audience view (projector/TV)
│   ├── layout.tsx          # Root layout with providers
│   └── page.tsx            # Landing/home page
├── components/
│   ├── presenter/          # Host-facing control components
│   ├── audience/           # Display-optimized components
│   ├── shared/             # Components used in both views
│   └── ui/                 # App-specific UI primitives
├── lib/
│   ├── game/               # Game engine (pure functions)
│   │   ├── engine.ts       # State transition functions
│   │   ├── patterns/     # Game patterns (bingo-specific)
│   │   └── __tests__/      # Engine unit tests
│   ├── sync/               # BroadcastChannel wrapper
│   │   └── broadcast.ts    # Dual-screen sync
├── stores/                 # Zustand stores
│   └── gameStore.ts        # Main game state store
├── hooks/                  # Custom React hooks
├── types/                  # App-specific TypeScript types
└── middleware.ts            # OAuth token verification
```

## Common vs App-Specific Directories

### Common to All Apps

| Directory | Purpose |
|-----------|---------|
| `src/app/api/` | BFF API routes |
| `src/app/play/` | Presenter view |
| `src/app/display/` | Audience view |
| `src/components/presenter/` | Host control components |
| `src/components/audience/` | Display components |
| `src/lib/sync/` | BroadcastChannel sync |
| `src/stores/` | Zustand state management |
| `src/hooks/` | Custom React hooks |
| `src/types/` | TypeScript types |
| `src/middleware.ts` | OAuth verification |

### App-Specific

| Directory | App | Purpose |
|-----------|-----|---------|
| `src/lib/game/patterns/` | bingo | 29 bingo winning patterns |
| `src/lib/game/rounds.ts` | trivia | Round/question management |
| `src/lib/game/scoring.ts` | trivia | Team scoring logic |
| `src/app/api/templates/` | bingo, trivia | Template CRUD |
| `src/app/api/oauth/` | platform-hub | OAuth 2.1 server endpoints |

### Platform-Hub Differences

Platform-hub does not have presenter/audience views. Instead it has:
- `src/app/dashboard/` - Main dashboard
- `src/app/games/` - Game selector
- `src/app/api/oauth/` - OAuth 2.1 authorization server
