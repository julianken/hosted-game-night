# Platform Hub

**Status:** 🚧 Scaffolded (10% Complete)

The central entry point for the Joolie Boolie. Provides game selection, authentication flows, and user dashboard. Currently features a complete UI layer with game selector, auth forms, and dashboard components, but lacks backend API routes and authentication integration.

## Features

- ✅ **Game Selector UI** - Landing page with cards for Bingo and Trivia games
- ✅ **Auth Form Components** - Login, signup, and password reset forms (UI only)
- ✅ **Dashboard UI** - User dashboard with welcome header, quick play, recent sessions, and preferences (placeholder data)
- ✅ **Responsive Layout** - Header, Footer, and mobile-friendly components
- ✅ **Design System Integration** - Uses @joolie-boolie/ui and @joolie-boolie/theme packages
- ✅ **Error Boundaries** - Global and page-level error handling
- ✅ **Testing Infrastructure** - Vitest + Testing Library setup with component tests
- ❌ **API Routes** - No backend endpoints implemented (authentication, sessions, profiles)
- ❌ **Supabase Auth Integration** - @joolie-boolie/auth package not yet wired up
- ❌ **Real User Data** - Dashboard shows placeholder data, no database queries
- ❌ **Protected Routes** - No route protection or session management
- ❌ **Template Management** - No backend for saving game templates across apps
- ❌ **Facility Branding** - No logo/branding management system
- ❌ **Admin Dashboard** - No admin controls implemented
- ❌ **Session History** - No cross-game session tracking

## Quick Start

### Prerequisites

- Node.js 18+ and pnpm 9.15+
- Supabase project (for future backend integration)

### Installation

From monorepo root:

```bash
# Install dependencies
pnpm install

# Run platform-hub on port 3002
pnpm dev:hub
```

From `apps/platform-hub`:

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:coverage     # With coverage report
```

### Key Routes

- **`/`** - Home page with game selector cards (Bingo, Trivia)
- **`/login`** - Login form (UI only, no backend)
- **`/signup`** - Registration form (UI only, no backend)
- **`/forgot-password`** - Password reset form (UI only, no backend)
- **`/dashboard`** - User dashboard (placeholder data, no auth)

### First-Time Setup

1. Create `.env.local` in `apps/platform-hub` (see Environment Variables below)
2. Run `pnpm dev:hub` from root or `pnpm dev` from `apps/platform-hub`
3. Open [http://localhost:3002](http://localhost:3002)
4. Click on a game card to navigate to that game (external links to localhost:3000 or localhost:3001)

**Note:** The app currently has UI scaffolding only. Auth forms and dashboard are visual mockups without backend functionality.

## Architecture

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19 + Tailwind CSS 4 |
| Backend (BFF) | None (planned: Next.js API Routes) |
| Database | None (planned: Supabase PostgreSQL) |
| Auth | None (planned: Supabase Auth via @joolie-boolie/auth) |
| State Management | None (future: may need Zustand for user state) |
| Testing | Vitest 4 + Testing Library |

### Project Structure

```
src/
├── app/
│   ├── api/              # ❌ NO API ROUTES (planned)
│   ├── dashboard/        # Dashboard page (placeholder data)
│   ├── login/            # Login page (UI only)
│   ├── signup/           # Signup page (UI only)
│   ├── forgot-password/  # Password reset page (UI only)
│   ├── layout.tsx        # Root layout with ErrorBoundary
│   ├── page.tsx          # Game selector home page
│   ├── loading.tsx       # Loading state component
│   ├── error.tsx         # Error page component
│   ├── not-found.tsx     # 404 page
│   └── global-error.tsx  # Global error handler
├── components/
│   ├── auth/             # LoginForm, SignupForm, ForgotPasswordForm (UI only)
│   ├── dashboard/        # WelcomeHeader, GameCard, RecentSessions, UserPreferences
│   ├── providers/        # ErrorBoundaryProvider
│   ├── Header.tsx        # Site header
│   ├── Footer.tsx        # Site footer
│   ├── GameCard.tsx      # Game selection cards
│   └── index.ts          # Component exports
├── lib/
│   └── supabase/         # ❌ Client, server, and middleware stubs (not functional)
├── test/
│   └── setup.ts          # Vitest setup
└── types/                # TypeScript types (minimal)
```

### Current State: UI Scaffolding Only

The app has a complete visual layer but lacks backend functionality:

- **Pages exist** for all planned routes (home, login, signup, forgot-password, dashboard)
- **Components exist** for auth forms and dashboard sections
- **No API routes** implemented (`app/api/` directory does not exist)
- **No authentication** wired up (Supabase client stubs exist but unused)
- **No database queries** (dashboard shows hardcoded placeholder data)
- **No state management** (no Zustand stores, just static UI)

## Environment Variables

Create `.env.local` in `apps/platform-hub`:

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SESSION_TOKEN_SECRET` | Secret key for HMAC-signing session tokens | Generate with `openssl rand -hex 32` |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | For admin operations (optional) |

**Example `.env.local`:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SESSION_TOKEN_SECRET=vGOwoWTO69KP5QXIcNYjyHGonXJZh3nFH3oq3XOCSwY=
```

**Note:** These variables are not currently used by the app, but will be required once backend integration is implemented.

## Development Workflow

### Running Tests

Tests are located alongside code in `__tests__` directories:

```bash
# From apps/platform-hub
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage report

# Run specific test file
pnpm vitest src/components/__tests__/Header.test.tsx
```

**Test Locations:**
- `app/__tests__/` - Page tests (currently limited to home page)
- `components/__tests__/` - Component tests (Header, Footer, GameCard)
- `components/auth/__tests__/` - Auth form tests (planned)
- `components/dashboard/__tests__/` - Dashboard component tests (planned)

**Test Coverage:** Limited due to scaffolded state. Component tests exist for basic UI elements (Header, Footer, GameCard). Backend functionality will require API route tests once implemented.

### Bundle Analysis

```bash
# From apps/platform-hub
pnpm analyze
```

## Shared Packages

This app depends on the following shared packages:

- [`@joolie-boolie/ui`](../../packages/ui/README.md) - Button, Toggle, Card, Modal, Toast components - **🚧 Partially Integrated**
- [`@joolie-boolie/theme`](../../packages/theme/README.md) - Design tokens (10+ themes, typography, spacing) - **🚧 Partially Integrated**
- [`@joolie-boolie/auth`](../../packages/auth/README.md) - Supabase authentication wrappers (34 exports) - **❌ Not Integrated**
- [`@joolie-boolie/database`](../../packages/database/README.md) - Type-safe Supabase client wrappers (268 exports) - **❌ Not Integrated**
- [`@joolie-boolie/error-tracking`](../../packages/error-tracking/README.md) - Error logging utilities - **✅ Integrated**

## Integration Status

| Feature | Status | Notes |
|---------|--------|-------|
| **Game Selector UI** | ✅ Complete | Landing page with game cards, responsive layout |
| **Auth Forms UI** | ✅ Complete | Login, signup, forgot-password forms (no backend) |
| **Dashboard UI** | ✅ Complete | Welcome header, quick play, recent sessions, preferences (placeholder data) |
| **Authentication** | ❌ Not Integrated | @joolie-boolie/auth package installed but not wired up |
| **Database** | ❌ Not Integrated | @joolie-boolie/database package installed but not used |
| **API Routes** | ❌ Not Implemented | No BFF endpoints for auth, sessions, profiles, templates |
| **Protected Routes** | ❌ Not Implemented | No route protection or middleware |
| **User State Management** | ❌ Not Implemented | No Zustand stores for user data |
| **Session Management** | ❌ Not Implemented | No session token handling |
| **Template Storage** | ❌ Not Implemented | No backend for game templates |
| **Testing** | 🚧 Partial | Component tests for UI only, no API or integration tests |

## Known Issues & Limitations

- **No Backend:** All pages are static UI without API routes or database queries
- **No Authentication:** Auth forms exist but don't submit to any backend
- **Placeholder Data:** Dashboard shows hardcoded data (user name, game stats, recent sessions)
- **No Route Protection:** Dashboard and auth pages are accessible without login
- **No Real Navigation:** Game links are hardcoded to localhost ports (3000, 3001)
- **Incomplete Tests:** Only basic component tests exist, no API or integration tests
- **Supabase Stubs:** Client/server/middleware files exist but are non-functional placeholders

## Future Work

### Phase 1: Authentication (High Priority)
- [ ] Implement API routes for auth (login, signup, logout, password reset)
- [ ] Wire up @joolie-boolie/auth package to auth forms
- [ ] Add protected route middleware
- [ ] Implement session token management with @joolie-boolie/database
- [ ] Add user state management (Zustand store)
- [ ] Replace placeholder data with real user queries
- [ ] Add logout functionality to Header component

### Phase 2: Profile & Dashboard (High Priority)
- [ ] User profile management (name, email, preferences)
- [ ] Real session history from Bingo/Trivia apps
- [ ] User preferences storage (theme, default game settings)
- [ ] Game statistics (times played, last played, favorite patterns)
- [ ] Dashboard API routes (GET /api/user/profile, GET /api/user/sessions)

### Phase 3: Template Management (Medium Priority)
- [ ] Saved game templates across apps
- [ ] Template CRUD API routes (POST, GET, PUT, DELETE /api/templates)
- [ ] Template selector UI in dashboard
- [ ] Template sharing (facility-wide templates)
- [ ] Template categories (Bingo patterns, Trivia question sets)

### Phase 4: Facility Branding (Medium Priority)
- [ ] Facility logo upload and management
- [ ] Branding customization (colors, fonts)
- [ ] Branding API routes (POST /api/facility/branding)
- [ ] Apply branding across game apps

### Phase 5: Admin Dashboard (Low Priority)
- [ ] Admin role-based access control (RBAC)
- [ ] User management (view, edit, delete users)
- [ ] Analytics dashboard (usage stats, popular games)
- [ ] System health monitoring
- [ ] Admin API routes (GET /api/admin/users, GET /api/admin/analytics)

### Phase 6: Help & Documentation (Low Priority)
- [ ] Help pages for Bingo and Trivia (`/help/bingo`, `/help/trivia`)
- [ ] Onboarding flow for new facilities
- [ ] Video tutorials
- [ ] FAQ section

## Design Requirements

- **Accessible:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Touch targets:** Minimum 44x44px for all interactive elements (buttons, links, form inputs)
- **Color contrast:** WCAG AA compliant for text and interactive elements
- **Responsive design:** Mobile-first approach, works on tablets, laptops, and desktops
- **Error states:** Clear error messages for form validation and network errors

## Related Documentation

- **AI Context:** [`CLAUDE.md`](./CLAUDE.md) - Detailed architecture, planned features, integration status
- **Monorepo:** [`../../README.md`](../../README.md) - Root README with project overview
- **Pull Request Template:** [`../../.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)
- **Bingo App:** [`../bingo/README.md`](../bingo/README.md) - Production-ready Bingo app (reference implementation)
- **Trivia App:** [`../trivia/README.md`](../trivia/README.md) - Production-ready Trivia app (reference implementation)

## Contributing

See the [root README](../../README.md) for monorepo setup instructions and the [CLAUDE.md](./CLAUDE.md) file for AI assistant guidance.

**Important:** This app is in early scaffolding phase (10% complete). Most backend functionality is missing. Contributions should focus on:
1. Implementing API routes for authentication
2. Wiring up @joolie-boolie/auth and @joolie-boolie/database packages
3. Replacing placeholder data with real database queries
4. Adding protected route middleware
5. Implementing user state management
