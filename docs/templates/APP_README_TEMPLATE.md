<!--
┌──────────────────────────────────────────────────────────────────────────────┐
│                        APP README TEMPLATE                                   │
│                                                                              │
│ PURPOSE: Template for app READMEs (apps/bingo, apps/trivia, etc.)          │
│                                                                              │
│ WHEN TO USE:                                                                │
│   - Creating a new game app in the apps/ directory                          │
│   - Standardizing existing app READMEs                                      │
│                                                                              │
│ INSTRUCTIONS:                                                                │
│   1. Copy this entire file to your app directory as README.md               │
│   2. Replace ALL placeholders in [BRACKETS] with actual values              │
│   3. Remove sections marked as (OPTIONAL) if not applicable                 │
│   4. Delete this instruction block before committing                        │
│                                                                              │
│ PLACEHOLDERS TO REPLACE:                                                     │
│   [APP_NAME]           - Full app name (e.g., "Beak Bingo")                │
│   [APP_SLUG]           - Directory name (e.g., "bingo")                     │
│   [PORT]               - Dev server port (e.g., "3000")                     │
│   [STATUS]             - Current status (e.g., "✅ Production Ready (85%)") │
│   [DESCRIPTION]        - 1-2 sentence description of what the app does      │
│   [FEATURE_CATEGORY]   - Replace with actual feature categories             │
│   [ROUTE_PATH]         - Replace with actual route paths                    │
│   [VARIABLE_NAME]      - Replace with actual environment variable names     │
│   [PACKAGE_NAME]       - Replace with actual package names used             │
│                                                                              │
│ REQUIRED SECTIONS (Do not delete):                                          │
│   1. Title & Status Badge                                                   │
│   2. Features                                                                │
│   3. Quick Start                                                             │
│   4. Architecture                                                            │
│   5. Environment Variables                                                   │
│   6. Development Workflow                                                    │
│   7. Shared Packages                                                         │
│   8. Integration Status                                                      │
│   9. Known Issues & Limitations                                              │
│  10. Future Work                                                             │
│  11. Design Requirements                                                     │
│  12. Related Documentation                                                   │
│  13. Contributing                                                            │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
-->

# [APP_NAME]

**Status:** [STATUS]

<!--
  DESCRIPTION INSTRUCTIONS:
  - Write 1-2 sentences describing what this app does
  - Mention the target audience (e.g., "designed for retirement communities")
  - Highlight the key differentiator or use case
  - Example: "A cloud-based, web-accessible Bingo system designed for retirement
    communities. Replaces USB-based solutions with a modern PWA that works offline."
-->
[DESCRIPTION]

## Features

<!--
  FEATURES INSTRUCTIONS:
  - List ALL major features with checkboxes (✅ complete, 🚧 in progress, ❌ not started)
  - Group related features under subheadings if needed
  - Use the format: "- ✅ **Feature Name** - Brief description"
  - Include feature details in parentheses when helpful
  - Order by importance/usage frequency

  EXAMPLE CATEGORIES (adjust for your app):
  - Game mechanics
  - Audio/Visual features
  - User interface features
  - Technical features (PWA, sync, etc.)
  - Authentication/session features
-->

- ✅ **[FEATURE_CATEGORY]** - [Brief description of feature]
- ✅ **[FEATURE_CATEGORY]** - [Brief description of feature]
- 🚧 **[FEATURE_CATEGORY]** - [Brief description and current status]
- ❌ **[FEATURE_CATEGORY]** - [Brief description] (planned)

## Quick Start

### Prerequisites

<!--
  PREREQUISITES INSTRUCTIONS:
  - List required software and versions
  - Include any external services (Supabase, etc.)
  - Be specific about version numbers
-->

- Node.js 18+ and pnpm 9.15+
- Supabase project (for online mode)
- [OTHER_REQUIREMENTS]

### Installation

From monorepo root:

```bash
# Install dependencies
pnpm install

# Run [APP_SLUG] app on port [PORT]
pnpm dev:[APP_SLUG]
```

From `apps/[APP_SLUG]`:

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

<!--
  ROUTES INSTRUCTIONS:
  - List all main routes in the app
  - Include a brief description of what each route is for
  - Use backticks for route paths
  - Common routes: /, /play, /display, /settings, etc.
-->

- **`/`** - [Description of home/landing page]
- **`/[ROUTE_PATH]`** - [Description of route purpose]
- **`/[ROUTE_PATH]`** - [Description of route purpose]

### First-Time Setup

<!--
  SETUP INSTRUCTIONS:
  - Provide step-by-step instructions for first-time users
  - Include all necessary configuration steps
  - Reference the environment variables section
  - Include URLs for local development
-->

1. Create `.env.local` in `apps/[APP_SLUG]` (see Environment Variables below)
2. Run `pnpm dev:[APP_SLUG]` from root or `pnpm dev` from `apps/[APP_SLUG]`
3. Open [http://localhost:[PORT]](http://localhost:[PORT])
4. [Additional setup steps specific to your app]

## Architecture

### Tech Stack

<!--
  TECH STACK INSTRUCTIONS:
  - List all major technologies used
  - Organize by layer/category
  - Include version numbers when relevant
  - Keep this table format for consistency
-->

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19 + Tailwind CSS 4 |
| Backend (BFF) | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (via BFF) |
| State Management | Zustand 5 |
| PWA | Serwist (Service Worker) |
| Testing | Vitest 4 + Testing Library |

### Project Structure

<!--
  PROJECT STRUCTURE INSTRUCTIONS:
  - Show the complete src/ directory structure
  - Include brief inline comments for each major directory
  - List key files in each directory
  - Keep this ASCII tree format for consistency
-->

```
src/
├── app/
│   ├── api/           # [Brief description of API routes]
│   ├── [ROUTE_PATH]/  # [Brief description of route]
│   └── layout.tsx     # [Brief description]
├── components/
│   ├── [CATEGORY]/    # [Brief description of component category]
│   └── ui/            # [Brief description of UI components]
├── hooks/
│   ├── use-[NAME].ts  # [Brief description of hook]
│   └── use-[NAME].ts  # [Brief description of hook]
├── lib/
│   └── [MODULE]/      # [Brief description of module]
├── stores/
│   ├── [NAME]-store.ts # [Brief description of store]
│   └── [NAME]-store.ts # [Brief description of store]
├── types/             # TypeScript type definitions
├── test/              # Test utilities and mocks
└── sw.ts              # Service worker (Serwist)
```

### State Management

<!--
  STATE MANAGEMENT INSTRUCTIONS:
  - Explain your state management approach
  - Include a diagram if using a specific pattern (pure functions + Zustand, etc.)
  - List key files responsible for state
  - Explain the flow of data through the app
-->

Pure function-based game engine wrapped in Zustand stores:

```
GameState (immutable) → engine functions → new GameState
                              ↓
                    Zustand store (reactive)
                              ↓
                    React components via hooks
```

**Key Files:**
- `lib/[MODULE]/engine.ts` - [Description of what engine does]
- `stores/[NAME]-store.ts` - [Description of what store does]

### Dual-Screen Sync (OPTIONAL)

<!--
  DUAL-SCREEN SYNC INSTRUCTIONS:
  - Include this section if your app has presenter/audience views
  - Explain the sync mechanism (BroadcastChannel, etc.)
  - List all sync message types
  - Describe the role of each screen
  - Delete this section if not applicable
-->

Uses BroadcastChannel API for same-device window communication:

- **Presenter window** (`/play`): [Description of presenter features]
- **Audience window** (`/display`): [Description of audience features]
- **Message types**: `MESSAGE_TYPE_1`, `MESSAGE_TYPE_2`, `MESSAGE_TYPE_3`

**Implementation:** [Description of where sync logic lives]

## Environment Variables

Create `.env.local` in `apps/[APP_SLUG]`:

### Required Variables

<!--
  ENVIRONMENT VARIABLES INSTRUCTIONS:
  - List ALL required environment variables
  - Include description and example value for each
  - Separate required and optional variables
  - Provide generation instructions where needed
-->

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SESSION_TOKEN_SECRET` | Secret key for HMAC-signing session tokens | Generate with `openssl rand -base64 32` |
| `[VARIABLE_NAME]` | [Description] | `[example value]` |

### Optional Variables (OPTIONAL)

| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | For admin operations (optional) |
| `[VARIABLE_NAME]` | [Description] |

**Example `.env.local`:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SESSION_TOKEN_SECRET=vGOwoWTO69KP5QXIcNYjyHGonXJZh3nFH3oq3XOCSwY=
[VARIABLE_NAME]=[example_value]
```

## Development Workflow

### Running Tests

<!--
  TESTING INSTRUCTIONS:
  - Explain where tests are located
  - Provide commands for different test modes
  - List test locations by category
-->

Tests are located alongside code in `__tests__` directories:

```bash
# From apps/[APP_SLUG]
pnpm test             # Watch mode
pnpm test:run         # Single run
pnpm test:coverage    # With coverage report

# Run specific test file
pnpm vitest src/lib/[MODULE]/__tests__/[FILE].test.ts
```

**Test Locations:**
- `stores/__tests__/` - Store tests
- `hooks/__tests__/` - Hook tests
- `components/**/__tests__/` - Component tests
- `lib/[MODULE]/__tests__/` - [Module] tests
- `app/api/**/__tests__/` - API route tests

### Keyboard Shortcuts (OPTIONAL)

<!--
  KEYBOARD SHORTCUTS INSTRUCTIONS:
  - List all keyboard shortcuts if applicable
  - Use a table format
  - Include the key and the action
  - Delete this section if not applicable
-->

| Key | Action |
|-----|--------|
| **[KEY]** | [Action description] |
| **[KEY]** | [Action description] |

**Implementation:** `[path/to/keyboard/handler.ts]`

## Shared Packages

<!--
  SHARED PACKAGES INSTRUCTIONS:
  - List ALL shared packages this app depends on
  - Link to each package's README
  - Add brief description of how the package is used
  - Use relative paths for links
  - Note if a package is not yet integrated
-->

This app depends on the following shared packages:

- [`@beak-gaming/sync`](../../packages/sync/README.md) - [Brief description of usage]
- [`@beak-gaming/ui`](../../packages/ui/README.md) - [Brief description of usage]
- [`@beak-gaming/theme`](../../packages/theme/README.md) - [Brief description of usage]
- [`@beak-gaming/database`](../../packages/database/README.md) - [Brief description of usage]
- [`@beak-gaming/auth`](../../packages/auth/README.md) - [Brief description of usage]
- [`@beak-gaming/[PACKAGE_NAME]`](../../packages/[PACKAGE_NAME]/README.md) - [Brief description of usage]

## Integration Status

<!--
  INTEGRATION STATUS INSTRUCTIONS:
  - Create a table showing the status of major features/integrations
  - Use ✅ for complete, ⚠️ for partial, ❌ for not started
  - Include notes column for additional context
  - Keep this updated as features are completed
-->

| Feature | Status | Notes |
|---------|--------|-------|
| **Database** | ✅ Integrated | [Brief description of what's working] |
| **Authentication** | ❌ Not Integrated | [Brief status or plan] |
| **[FEATURE_NAME]** | ✅ Complete | [Brief description] |
| **[FEATURE_NAME]** | ⚠️ Partial | [Brief status] |

## Known Issues & Limitations

<!--
  KNOWN ISSUES INSTRUCTIONS:
  - List all known issues, bugs, and limitations
  - Be honest about what doesn't work or has limitations
  - Include workarounds if available
  - Use bullet points
-->

- **[Issue Category]:** [Description of issue or limitation]
- **[Issue Category]:** [Description of issue or limitation]
- **[Issue Category]:** [Description of issue or limitation]

## Future Work

<!--
  FUTURE WORK INSTRUCTIONS:
  - List planned features and improvements
  - Use checkboxes for tracking
  - Prioritize roughly by importance
  - Link to GitHub issues if available
-->

- [ ] [Planned feature or improvement]
- [ ] [Planned feature or improvement]
- [ ] [Planned feature or improvement]

## Design Requirements

<!--
  DESIGN REQUIREMENTS INSTRUCTIONS:
  - List key design principles and constraints
  - Include accessibility requirements
  - Mention senior-friendly considerations if applicable
  - Keep these high-level, not implementation details
-->

- **Senior-friendly:** Large fonts (min 18px body), high contrast, large click targets (min 44x44px)
- **Audience display:** Optimized for projector/large TV, readable from back of room
- **Touch targets:** Minimum 44x44px for all interactive elements
- **Color contrast:** WCAG AA compliant for text and interactive elements
- **[REQUIREMENT_CATEGORY]:** [Description]

## Related Documentation

<!--
  RELATED DOCUMENTATION INSTRUCTIONS:
  - Link to all relevant documentation files
  - Use relative paths
  - Include brief descriptions of what each document contains
-->

- **AI Context:** [`CLAUDE.md`](./CLAUDE.md) - Detailed architecture, game mechanics, state machine
- **Monorepo:** [`../../README.md`](../../README.md) - Root README with project overview
- **Pull Request Template:** [`../../.github/PULL_REQUEST_TEMPLATE.md`](../../.github/PULL_REQUEST_TEMPLATE.md)

## Contributing

See the [root README](../../README.md) for monorepo setup instructions and the [CLAUDE.md](./CLAUDE.md) file for AI assistant guidance.
