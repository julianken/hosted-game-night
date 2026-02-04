# Code Conventions & Style

## TypeScript
- Strict mode enabled
- Explicit return types on exported functions
- Prefer `type` over `interface` for object types
- Use `unknown` over `any` where possible

## React
- Functional components only
- React 19 hooks (use, useOptimistic, useFormStatus)
- Server Components by default in App Router
- Client components marked with `'use client'` directive

## Naming Conventions
- **Files**: kebab-case (e.g., `game-engine.ts`, `use-auth.ts`)
- **Components**: PascalCase (e.g., `GameBoard.tsx`)
- **Hooks**: camelCase with `use` prefix (e.g., `useGameState`)
- **Types**: PascalCase (e.g., `GameStatus`, `PlayerScore`)
- **Constants**: SCREAMING_SNAKE_CASE

## Directory Structure (App Router)
```
src/
├── app/              # Next.js App Router pages
├── components/       # React components
├── lib/              # Utilities, hooks, services
│   ├── auth/         # Authentication
│   ├── game/         # Game logic
│   └── utils/        # Helpers
├── types/            # Local type definitions
└── styles/           # Global styles
```

## Imports
- Use path aliases (`@/` for src root)
- Group imports: external, internal packages, local
- Prefer named exports over default exports

## Tailwind CSS 4
- Use design tokens from `@beak-gaming/theme`
- Minimum touch targets: 44x44px
- Minimum body text: 18px
- High contrast for accessibility

## Testing
- Test files: `*.test.ts` or `*.test.tsx`
- Co-locate tests with source in `__tests__/` directories
- Use Testing Library queries (getByRole, getByText)
- E2E tests in root `e2e/` directory

## Comments
- JSDoc for exported functions/types
- Inline comments only for complex logic
- No obvious comments (e.g., "// increment counter")
