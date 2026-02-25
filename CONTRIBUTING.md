# Contributing to Joolie Boolie

Thank you for your interest in contributing to Joolie Boolie!

## AI-Agent Development Model

This project is developed exclusively with AI agents. The following conventions reflect that model:

### Issue Tracking (Linear)

All work is tracked in **Linear** using `BEA-###` issue format. GitHub Issues are not used.

- Use `mcp__linear-server__*` tools to create, update, and query issues
- Reference the Linear issue in branch names and commit messages (e.g., `BEA-123`)
- Never create GitHub Issues — all tracking lives in Linear

### Branch Naming

Branches follow the `<type>/BEA-###-slug` pattern tied to Linear issues:

- `feat/BEA-###-slug` - New features
- `fix/BEA-###-slug` - Bug fixes
- `refactor/BEA-###-slug` - Code refactoring
- `docs/BEA-###-slug` - Documentation updates (when a Linear issue exists)
- `chore/BEA-###-slug` - Build/tooling changes

### Pull Request Template

All PRs must use the template at `.github/PULL_REQUEST_TEMPLATE.md`. It requires a **Five-Level Explanation** that communicates the change at five levels of technical detail:

1. **Level 1 - Non-technical:** Plain English for a non-technical audience
2. **Level 2 - Product/UX:** Impact on user-facing behavior and experience
3. **Level 3 - Engineering overview:** System-level architectural view
4. **Level 4 - Code-level:** Specific modules, interfaces, and patterns changed
5. **Level 5 - Deep technical:** Algorithms, data structures, performance, security details

Every PR must complete all five levels. This ensures reviewers and future agents have full context at their preferred level of detail.

### Pre-Commit Hooks

Husky + lint-staged run `pnpm lint`, `pnpm typecheck`, and `pnpm test:run` on changed packages before each commit. **Never use `--no-verify`** — if hooks fail, fix the underlying issue first.

### No Timeline Estimates

Never include time estimates, effort estimates, team size assumptions, or timeline projections. Focus on dependencies, complexity, scope, and completion status.

---

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9.15+
- Git

### Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd joolie-boolie

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feat/BEA-###-slug` - New features (e.g., `feat/BEA-123-bingo-pattern-editor`)
- `fix/BEA-###-slug` - Bug fixes (e.g., `fix/BEA-456-audio-volume-persistence`)
- `refactor/BEA-###-slug` - Code refactoring (e.g., `refactor/BEA-789-sync-store`)
- `docs/slug` - Documentation updates (e.g., `docs/api-reference`)
- `chore/slug` - Build/tooling changes (e.g., `chore/update-deps`)

### Commit Messages

Write clear, concise commit messages:

```
<type>(<scope>): <description>

[optional body]
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `refactor` - Code refactoring
- `test` - Test additions/changes
- `chore` - Build/tooling changes

Examples:
```
feat(bingo): add diamond pattern
fix(trivia): correct score calculation on team removal
docs(sync): update BroadcastChannel examples
test(game-engine): add transition edge case tests
```

## Code Style

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Export types from dedicated type files (`types/index.ts`)

### React

- Use functional components with hooks
- Follow the established component structure:
  - `components/presenter/` - Presenter view components
  - `components/audience/` - Audience view components
  - `components/ui/` - Shared UI components

### State Management

- Use Zustand for state management
- Follow the pure function engine pattern:
  - Engine functions in `lib/game/engine.ts`
  - Zustand store wraps engine functions
  - Separate selectors for derived state

```typescript
// Good: Pure engine function
export function callNextBall(state: GameState): GameState {
  // Transform and return new state
}

// Good: Store wraps engine
callBall: () => set((state) => callNextBall(state)),
```

### File Organization

```
src/
├── app/          # Next.js pages and API routes
├── components/   # React components by category
├── hooks/        # Custom React hooks
├── lib/          # Pure logic (engine, utilities)
├── stores/       # Zustand stores
├── types/        # TypeScript types
└── test/         # Test utilities and mocks
```

### Naming Conventions

- Components: `PascalCase` (e.g., `BallDisplay.tsx`)
- Hooks: `camelCase` with `use` prefix (e.g., `useGame.ts`)
- Types: `PascalCase` (e.g., `GameState`)
- Files: `kebab-case` for non-components (e.g., `game-store.ts`)

## Testing

### Running Tests

```bash
# All tests
pnpm test

# Single run
pnpm test:run

# With coverage
pnpm test:coverage

# Specific app
cd apps/bingo && pnpm test
```

### Test Structure

Tests live alongside the code in `__tests__` directories:

```
lib/game/
├── engine.ts
├── patterns.ts
└── __tests__/
    ├── engine.test.ts
    └── patterns.test.ts
```

### Writing Tests

- Test pure functions directly
- Mock browser APIs using `@joolie-boolie/testing`
- Reset stores between tests

```typescript
import { resetAllStores } from '@/test/helpers/store';
import { mockBroadcastChannel, MockBroadcastChannel } from '@joolie-boolie/testing';

beforeEach(() => {
  resetAllStores();
  mockBroadcastChannel();
});

afterEach(() => {
  MockBroadcastChannel.reset();
});
```

## Pull Request Process

### Before Submitting

1. **Run tests**: `pnpm test:run`
2. **Run linting**: `pnpm lint`
3. **Run type check**: `pnpm typecheck`
4. **Build**: `pnpm build`

### PR Guidelines

1. **Keep PRs focused**: One feature or fix per PR
2. **Update documentation**: Add/update CLAUDE.md, README.md as needed
3. **Add tests**: Include tests for new functionality
4. **Describe changes**: Write a clear PR description

### PR Template

All PRs must use the template at `.github/PULL_REQUEST_TEMPLATE.md`. It includes:

- **Human Summary** - 2-4 plain language bullets
- **Five-Level Explanation** (required, see AI-Agent Development Model section above)
- **Changes** - grouped by area
- **Testing checklist** - `pnpm test:run`, `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`
- **Risk/Impact** and **Notes for Reviewers**

## Architecture Guidelines

### BFF Pattern

Apps use the Backend-for-Frontend pattern. Frontend never talks directly to Supabase:

```
Frontend → API Routes → Supabase
```

### Dual-Screen Sync

Use BroadcastChannel for presenter/audience sync:

```typescript
// Presenter broadcasts state
broadcastSync.broadcastState(gameState);

// Audience receives and updates
broadcastSync.subscribe((message) => {
  if (message.type === 'STATE_UPDATE') {
    updateState(message.payload);
  }
});
```

### Game Engine Pattern

Pure functions transform state:

```typescript
// Pure function - no side effects
function callNextBall(state: GameState): GameState {
  return {
    ...state,
    currentBall: nextBall,
    calledBalls: [...state.calledBalls, nextBall],
  };
}
```

## Accessible Design

### Accessibility Requirements

- **Font size**: Minimum 18px for body text
- **Touch targets**: Minimum 44x44px (WCAG 2.1)
- **Contrast**: Meet WCAG AAA contrast ratios
- **Focus states**: Visible 4px focus rings
- **Keyboard**: All actions accessible via keyboard

### Audience Display

Optimize for projection/large TV:
- Extra large text (72px+ for important info)
- High contrast colors
- Readable from back of room

## Getting Help

- Check existing CLAUDE.md files for context
- Look at similar implementations in other apps
- Ask in PR comments or discussions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
