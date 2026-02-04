# Suggested Commands

## Installation & Setup
```bash
pnpm install              # Install dependencies
```

## Development
```bash
pnpm dev                  # Run all apps in dev mode
pnpm dev:bingo            # Run only bingo app
pnpm dev:trivia           # Run only trivia app
pnpm dev:hub              # Run only platform-hub app
```

## Building
```bash
pnpm build                # Build all apps and packages
pnpm build:bingo          # Build bingo with dependencies
pnpm build:trivia         # Build trivia with dependencies
pnpm build:hub            # Build platform-hub with dependencies
```

## Testing
```bash
pnpm test                 # Run all unit tests (watch mode)
pnpm test:run             # Run all tests once (CI mode)
pnpm test:coverage        # Run tests with coverage
pnpm test:e2e             # Build + run E2E tests
pnpm test:e2e:summary     # Show E2E pass/fail counts
pnpm test:e2e:ui          # E2E with Playwright UI
pnpm test:e2e:bingo       # E2E for bingo only
pnpm test:e2e:trivia      # E2E for trivia only
```

## Quality
```bash
pnpm lint                 # Lint all apps and packages
pnpm typecheck            # TypeScript type checking
```

## Cleanup
```bash
pnpm clean                # Clean all build artifacts
```

## Analysis
```bash
pnpm analyze              # Bundle analysis for all apps
pnpm lighthouse           # Run Lighthouse performance tests
```

## Git (macOS/Darwin)
```bash
git status                # Check working tree status
git diff                  # Show unstaged changes
git log --oneline -10     # Recent commits
git branch -a             # List all branches
```

## File System (macOS/Darwin)
```bash
ls -la                    # List files with details
find . -name "*.ts"       # Find TypeScript files
grep -r "pattern" .       # Search recursively
```

## Environment
- Create `.env.local` in each app with Supabase credentials
- Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- For platform-hub: SESSION_TOKEN_SECRET (64-char hex)
