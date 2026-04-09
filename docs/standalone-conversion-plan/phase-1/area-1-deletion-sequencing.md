# Investigation: Deletion Sequencing

## Recommended: Strategy C — Parallel-Safe Batches

Six atomic batches, each leaves build green. External prerequisite (new stores) only gates Batch 5.

### Batch 0: Delete Platform Hub (leaf node, zero prerequisites)
- Delete apps/platform-hub/ entirely (159 files, 28,240 lines)
- Remove dev:hub, build:hub, analyze:hub, lighthouse:hub from root package.json
- Remove NEXT_PUBLIC_PLATFORM_HUB_URL, NEXT_PUBLIC_OAUTH_CLIENT_ID from turbo.json globalEnv
- pnpm install && verify

### Batch 1: Auth surface removal from game apps (bingo + trivia parallel)
- Delete app/api/auth/ routes (logout, token, token-redirect)
- Replace middleware.ts with passthrough (preserve E2E guard)
- Delete app/auth/callback/page.tsx
- Delete lib/auth/__tests__/
- Replace lib/env-validation.ts (remove auth imports)
- Rewrite app/page.tsx (remove LoginButton, remove cookie auth check)

### Batch 2: packages/ui cleanup
- Delete login-button.tsx + test
- Remove LoginButton export from index.ts
- Remove @joolie-boolie/auth from ui/package.json

### Batch 3: Delete packages/auth
- Delete packages/auth/ entirely
- Remove @joolie-boolie/auth from game app package.json
- Delete packages/testing/src/mocks/supabase.ts + remove exports
- Remove jose, @supabase/ssr, @supabase/supabase-js from game deps
- pnpm install && verify

### Batch 4: Database type migration
- Copy BingoTemplate, TriviaTemplate, etc. types to packages/types
- Update UI component imports from @joolie-boolie/database/types to @joolie-boolie/types

### Batch 5: Delete CRUD API routes (REQUIRES new stores built first)
- Delete app/api/templates/, presets/, question-sets/ (bingo + trivia parallel)
- Replace health routes with simple ok response
- Delete related test files

### Batch 6: Delete packages/database + Supabase
- Delete packages/database/ entirely
- Delete supabase/ directory
- Remove remaining Supabase env vars from turbo.json
- pnpm install && final verify

## Critical Dependency: packages/ui → packages/auth
packages/ui depends on auth via LoginButton. Auth CANNOT be deleted until ui is cleaned (Batch 2 before Batch 3).

## Parallelization: Batches 1 and 5 support bingo/trivia parallel workers.
