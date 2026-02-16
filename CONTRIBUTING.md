# Contributing to Joolie Boolie

Thank you for your interest in contributing to the Joolie Boolie!

## Development Setup

### Prerequisites

- Node.js 20+
- pnpm 9.15+
- Git

### Getting Started

```bash
# Clone the repository
git clone <repo-url>
cd joolie-boolie-platform

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

## Development Workflow

### Branch Naming

Use descriptive branch names with prefixes:

- `feature/` - New features (e.g., `feature/bingo-pattern-editor`)
- `fix/` - Bug fixes (e.g., `fix/audio-volume-persistence`)
- `refactor/` - Code refactoring (e.g., `refactor/sync-store`)
- `docs/` - Documentation updates (e.g., `docs/api-reference`)
- `test/` - Test additions/improvements (e.g., `test/game-engine`)

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

```markdown
## Summary

Brief description of changes.

## Changes

- Change 1
- Change 2

## Testing

How was this tested?

## Screenshots (if applicable)

Before/after screenshots for UI changes.
```

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
