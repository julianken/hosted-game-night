# Beak Gaming Platform

A unified gaming platform for retirement communities, featuring Bingo, Trivia, and future games. Built as a Turborepo monorepo with shared packages.

## Current Status

| App/Package | Status | Completion | Description |
|-------------|--------|------------|-------------|
| **[Bingo](./apps/bingo/README.md)** | ✅ Production Ready | 85% | 75-ball bingo with audio, patterns, themes, dual-screen sync, PWA |
| **[Trivia](./apps/trivia/README.md)** | ✅ Production Ready | 95% | Team trivia with rounds, scoring, TTS, themes, dual-screen sync, PWA |
| **[Platform Hub](./apps/platform-hub/README.md)** | 🚧 Backend Complete | 55-60% | OAuth 2.1 server, game selector UI, auth forms. Dashboard/profile TODO |
| **[@beak-gaming/sync](./packages/sync/README.md)** | ✅ Complete | 100% | BroadcastChannel dual-screen synchronization |
| **[@beak-gaming/ui](./packages/ui/README.md)** | ✅ Complete | 100% | Button, Toggle, Slider, Card, Modal, Toast components |
| **[@beak-gaming/theme](./packages/theme/README.md)** | ✅ Complete | 100% | Design tokens, 10+ themes, senior-friendly typography |
| **[@beak-gaming/database](./packages/database/README.md)** | ✅ Complete | 98% | Type-safe Supabase client wrappers (150+ exports) |
| **[@beak-gaming/auth](./packages/auth/README.md)** | ✅ Complete | 95% | Supabase authentication wrappers (40+ exports) |
| **[@beak-gaming/types](./packages/types/README.md)** | ✅ Complete | 100% | Shared TypeScript type definitions (40+ exports) |
| **[@beak-gaming/game-engine](./packages/game-engine/README.md)** | ⚠️ Partial | 40% | Abstract game state machine |
| **[@beak-gaming/testing](./packages/testing/README.md)** | ✅ Complete | 100% | BroadcastChannel and Audio mocks for tests |

## Features

### Beak Bingo
- 75-ball bingo (B:1-15, I:16-30, N:31-45, G:46-60, O:61-75)
- 15+ bingo patterns (lines, corners, frames, shapes, letters, blackout)
- Voice packs with British slang variant and hall reverb options
- Configurable roll sounds (metal cage, tumbler, lottery)
- Auto-call mode with adjustable speed (5-30 seconds)
- Dual-screen presenter/audience sync
- Theme system (light/dark/system, 10+ color themes)
- Fullscreen mode for audience display
- PWA with offline support

### Trivia Night
- Multi-round team trivia (configurable rounds and questions per round)
- Team management with scoring
- Text-to-speech announcements for questions and answers
- Presenter peek answer (local only)
- Emergency pause (blanks audience display)
- Dual-screen presenter/audience sync
- Theme system (light/dark/system, 10+ color themes)
- Fullscreen mode for audience display
- PWA with offline support

### Platform Hub
- OAuth 2.1 authorization server (PKCE, token exchange, JWKS)
- Game selection interface with links to Bingo and Trivia
- Login/registration forms with Supabase authentication
- CORS configuration, rate limiting, security middleware
- (Planned: Dashboard, user profiles, template management)

## Tech Stack

- **Monorepo:** Turborepo + pnpm 9.15
- **Framework:** Next.js 16 (App Router)
- **Frontend:** React 19 + Tailwind CSS 4
- **State:** Zustand 5
- **Database:** Supabase (PostgreSQL)
- **Testing:** Vitest 4 + Testing Library + Playwright
- **PWA:** Serwist (Service Worker)
- **Hosting:** Vercel

## Project Structure

```
beak-gaming-platform/
├── apps/
│   ├── bingo/           # Beak Bingo (port 3000) - See README: apps/bingo/README.md
│   ├── trivia/          # Trivia Night (port 3001) - See README: apps/trivia/README.md
│   └── platform-hub/    # Central hub (port 3002) - See README: apps/platform-hub/README.md
├── packages/
│   ├── sync/            # Dual-screen synchronization - See README: packages/sync/README.md
│   ├── ui/              # Shared UI components - See README: packages/ui/README.md
│   ├── theme/           # Senior-friendly design tokens - See README: packages/theme/README.md
│   ├── auth/            # Supabase authentication - See README: packages/auth/README.md
│   ├── game-engine/     # Abstract game state machine - See README: packages/game-engine/README.md
│   ├── database/        # Database utilities - See README: packages/database/README.md
│   ├── types/           # Shared TypeScript types - See README: packages/types/README.md
│   └── testing/         # Shared test utilities - See README: packages/testing/README.md
└── supabase/            # Database migrations
```

**Quick Links:**
- **Apps:** [Bingo](./apps/bingo/README.md) • [Trivia](./apps/trivia/README.md) • [Platform Hub](./apps/platform-hub/README.md)
- **Packages:** [sync](./packages/sync/README.md) • [ui](./packages/ui/README.md) • [theme](./packages/theme/README.md) • [database](./packages/database/README.md) • [auth](./packages/auth/README.md) • [types](./packages/types/README.md) • [game-engine](./packages/game-engine/README.md) • [testing](./packages/testing/README.md)

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9.15+
- Supabase account (for database)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/beak-gaming-platform.git
cd beak-gaming-platform

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
cp apps/bingo/.env.example apps/bingo/.env.local
cp apps/trivia/.env.example apps/trivia/.env.local
cp apps/platform-hub/.env.example apps/platform-hub/.env.local

# Edit each .env.local with your Supabase credentials
```

### Development

```bash
pnpm dev              # Run all apps
pnpm dev:bingo        # Run bingo only (port 3000)
pnpm dev:trivia       # Run trivia only (port 3001)
pnpm dev:hub          # Run platform-hub only (port 3002)
```

### Open the Apps

| App | Presenter View | Audience View |
|-----|----------------|---------------|
| Bingo | http://localhost:3000/play | http://localhost:3000/display |
| Trivia | http://localhost:3001/play | http://localhost:3001/display |
| Hub | http://localhost:3002 | - |

### Testing

```bash
pnpm test             # Run all tests in watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage report
pnpm test:e2e         # Run E2E tests with Playwright
```

#### E2E Testing Setup

Before running E2E tests for the first time, install Playwright browsers:

```bash
# Install all browsers (Chromium, Firefox, WebKit)
pnpm exec playwright install

# Or install only WebKit for mobile viewport tests
pnpm exec playwright install webkit
```

E2E tests include mobile viewport testing on WebKit (iPhone 12 simulation). If you encounter "Executable doesn't exist" errors, run the install command above.

### Building

```bash
pnpm build            # Build all apps and packages
pnpm lint             # Lint all apps and packages
pnpm typecheck        # Type check all apps and packages
pnpm clean            # Clean all build artifacts
```

## Environment Variables

### Required for All Apps

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | The app's public URL |

### Optional (for CI/CD)

| Variable | Description |
|----------|-------------|
| `TURBO_TOKEN` | Vercel token for remote caching |
| `TURBO_TEAM` | Team name for remote caching |

---

## Deployment to Vercel

This monorepo is configured for deployment to Vercel with each app deployed as a separate project.

### Quick Start

1. **Connect Repository:** Link your GitHub repository to Vercel
2. **Create Projects:** Create a Vercel project for each app
3. **Configure:** Set root directory and environment variables
4. **Deploy:** Vercel will handle the rest

### Step-by-Step Deployment

#### 1. Prerequisites

- Vercel account (free tier works)
- GitHub repository connected to Vercel
- Supabase project with credentials

#### 2. Deploy Bingo App

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New Project"**
3. Import your repository
4. Configure the project:
   - **Project Name:** `beak-bingo` (or your choice)
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `apps/bingo`
   - **Build Command:** Leave default (uses vercel.json)
   - **Output Directory:** Leave default
5. Add Environment Variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   NEXT_PUBLIC_APP_URL=https://beak-bingo.vercel.app
   ```
6. Click **Deploy**

#### 3. Deploy Trivia App

Repeat the same steps with:
- **Root Directory:** `apps/trivia`
- **Project Name:** `beak-trivia`
- Update `NEXT_PUBLIC_APP_URL` to the trivia deployment URL

#### 4. Deploy Platform Hub

Repeat the same steps with:
- **Root Directory:** `apps/platform-hub`
- **Project Name:** `beak-platform-hub`
- Add additional environment variables:
  ```
  NEXT_PUBLIC_BINGO_URL=https://beak-bingo.vercel.app
  NEXT_PUBLIC_TRIVIA_URL=https://beak-trivia.vercel.app
  ```

### Custom Domains

After deployment, you can add custom domains:

1. Go to your project's **Settings > Domains**
2. Add your domain (e.g., `bingo.beakgaming.com`)
3. Configure DNS as instructed
4. Update `NEXT_PUBLIC_APP_URL` to match the custom domain

Recommended domain structure:
- `beakgaming.com` or `hub.beakgaming.com` - Platform Hub
- `bingo.beakgaming.com` - Bingo
- `trivia.beakgaming.com` - Trivia

### Enable Turbo Remote Caching (Optional)

Remote caching speeds up builds by sharing cache across deployments:

1. Go to [Vercel Account Tokens](https://vercel.com/account/tokens)
2. Create a new token
3. Add to each project's environment variables:
   ```
   TURBO_TOKEN=your-token
   TURBO_TEAM=your-team-name
   TURBO_REMOTE_ONLY=true
   ```

### Environment Variables Reference

#### Production Environment Variables

| App | Variable | Example Value |
|-----|----------|---------------|
| All | `NEXT_PUBLIC_SUPABASE_URL` | `https://abc123.supabase.co` |
| All | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIs...` |
| All | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIs...` |
| Bingo | `NEXT_PUBLIC_APP_URL` | `https://bingo.beakgaming.com` |
| Trivia | `NEXT_PUBLIC_APP_URL` | `https://trivia.beakgaming.com` |
| Hub | `NEXT_PUBLIC_APP_URL` | `https://beakgaming.com` |
| Hub | `NEXT_PUBLIC_BINGO_URL` | `https://bingo.beakgaming.com` |
| Hub | `NEXT_PUBLIC_TRIVIA_URL` | `https://trivia.beakgaming.com` |

### Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Vercel                                │
├─────────────────┬─────────────────┬─────────────────────────┤
│   beak-bingo    │   beak-trivia   │   beak-platform-hub     │
│   /apps/bingo   │   /apps/trivia  │   /apps/platform-hub    │
│   port: 3000    │   port: 3001    │   port: 3002            │
└────────┬────────┴────────┬────────┴────────────┬────────────┘
         │                 │                      │
         └─────────────────┼──────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │    Supabase     │
                  │   PostgreSQL    │
                  │   Auth, Storage │
                  └─────────────────┘
```

### Automatic Deployments

Once connected, Vercel automatically deploys:
- **Production:** On push to `main` branch
- **Preview:** On pull requests

Each app uses `turbo-ignore` to skip builds when its code hasn't changed.

### Troubleshooting

#### Build Fails with Missing Dependencies

Ensure `pnpm install --frozen-lockfile` runs at the monorepo root. The vercel.json files are configured for this.

#### Wrong App Builds

Check that the **Root Directory** is set correctly in Vercel project settings.

#### Environment Variables Not Working

- Ensure variables are set in Vercel (not just locally)
- Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` should NEVER be prefixed with `NEXT_PUBLIC_`

#### Cache Issues

Try redeploying with cache cleared:
1. Go to project **Deployments**
2. Click the three dots on latest deployment
3. Select **Redeploy** with **Clear Build Cache**

---

## Keyboard Shortcuts

### Bingo (Presenter View)

| Key | Action |
|-----|--------|
| Space | Roll next ball |
| P | Pause/Resume game |
| R | Reset game |
| U | Undo last call |
| M | Mute/unmute audio |

### Trivia (Presenter View)

| Key | Action |
|-----|--------|
| Arrow Up/Down | Navigate questions |
| Space | Peek answer (local only, not shown on display) |
| D | Toggle display question on audience screen |
| P | Pause/Resume game |
| E | Emergency pause (blanks audience display) |
| R | Reset game |

---

## Performance Monitoring

The platform includes comprehensive performance monitoring tools to ensure fast load times and smooth experiences, especially important for users on retirement community networks.

### Bundle Analysis

Analyze JavaScript bundle sizes to identify optimization opportunities:

```bash
# Analyze all apps
pnpm analyze

# Analyze specific app
pnpm analyze:bingo
pnpm analyze:trivia
pnpm analyze:hub
```

This runs the Next.js bundle analyzer and opens an interactive treemap visualization in your browser showing:
- Bundle composition and sizes
- Chunk splitting effectiveness
- Dependency sizes
- Opportunities for code splitting

### Lighthouse CI

Run Lighthouse audits to measure Core Web Vitals and accessibility:

```bash
# Run on all apps (builds and starts servers automatically)
pnpm lighthouse

# Run on specific app
pnpm lighthouse:bingo
pnpm lighthouse:trivia
pnpm lighthouse:hub
```

Results are saved to `.lighthouseci/` directory. The audits check:
- **Performance:** LCP, FCP, CLS, TBT, Speed Index
- **Accessibility:** Color contrast, tap targets, font sizes (critical for senior users)
- **Best Practices:** Security, modern APIs
- **SEO:** Meta tags, crawlability

### Performance Budgets

Performance budgets are defined in `performance.config.js`:

| Metric | Target | Description |
|--------|--------|-------------|
| LCP | < 2.0s | Largest Contentful Paint |
| FCP | < 1.5s | First Contentful Paint |
| CLS | < 0.05 | Cumulative Layout Shift |
| TBT | < 150ms | Total Blocking Time |
| INP | < 150ms | Interaction to Next Paint |
| First Load JS | < 200KB | Initial JavaScript bundle |
| Route Total JS | < 350KB | Total JS per route |

### Web Vitals Monitoring

The `WebVitals` component from `@beak-gaming/ui` collects Core Web Vitals in real-time:

```tsx
// In your root layout.tsx
import { WebVitals } from '@beak-gaming/ui';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <WebVitals />
        {children}
      </body>
    </html>
  );
}
```

In development mode, metrics are logged to the console. For production, configure analytics:

```tsx
<WebVitals
  onMetric={(metric) => {
    // Send to your analytics service
    sendToAnalytics(metric);
  }}
/>
```

### CI Integration

Add to your CI workflow to catch performance regressions:

```yaml
# .github/workflows/performance.yml
- name: Build apps
  run: pnpm build

- name: Run Lighthouse CI
  run: pnpm lighthouse

- name: Check bundle sizes
  run: pnpm analyze
```

---

## Design Principles

- **Senior-friendly:** Large fonts (min 18px), high contrast, large click targets (min 44x44px)
- **Dual-screen:** Presenter controls + audience display synced via BroadcastChannel
- **Offline-capable:** PWA support for spotty wifi environments
- **Accessible:** Keyboard navigation, screen reader support

## Documentation

### App Documentation

Each app has comprehensive documentation in its directory:

| App | README | AI Context (CLAUDE.md) |
|-----|--------|------------------------|
| **Bingo** | [apps/bingo/README.md](./apps/bingo/README.md) | [apps/bingo/CLAUDE.md](./apps/bingo/CLAUDE.md) |
| **Trivia** | [apps/trivia/README.md](./apps/trivia/README.md) | [apps/trivia/CLAUDE.md](./apps/trivia/CLAUDE.md) |
| **Platform Hub** | [apps/platform-hub/README.md](./apps/platform-hub/README.md) | [apps/platform-hub/CLAUDE.md](./apps/platform-hub/CLAUDE.md) |

### Package Documentation

Each shared package has API documentation:

| Package | README | Description |
|---------|--------|-------------|
| **[@beak-gaming/sync](./packages/sync/README.md)** | [README](./packages/sync/README.md) | BroadcastChannel dual-screen synchronization |
| **[@beak-gaming/ui](./packages/ui/README.md)** | [README](./packages/ui/README.md) | 6 senior-friendly UI components |
| **[@beak-gaming/theme](./packages/theme/README.md)** | [README](./packages/theme/README.md) | Design tokens and CSS variables |
| **[@beak-gaming/database](./packages/database/README.md)** | [README](./packages/database/README.md) | Type-safe Supabase utilities (150+ exports) |
| **[@beak-gaming/auth](./packages/auth/README.md)** | [README](./packages/auth/README.md) | Authentication wrappers (40+ exports) |
| **[@beak-gaming/types](./packages/types/README.md)** | [README](./packages/types/README.md) | Shared TypeScript types (40+ exports) |
| **[@beak-gaming/game-engine](./packages/game-engine/README.md)** | [README](./packages/game-engine/README.md) | Abstract game state machine |
| **[@beak-gaming/testing](./packages/testing/README.md)** | [README](./packages/testing/README.md) | Test utilities and mocks |

### Other Documentation

- **[CLAUDE.md](./CLAUDE.md)** - AI assistant guidance and monorepo overview
- **[.github/PULL_REQUEST_TEMPLATE.md](./.github/PULL_REQUEST_TEMPLATE.md)** - Pull request template (required for all PRs)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow, code style guidelines, and PR process.

## License

Private - All rights reserved
