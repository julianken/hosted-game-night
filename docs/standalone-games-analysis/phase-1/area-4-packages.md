# Investigation: Package Dependency Untangling

## Summary

Of 10 shared packages, 6 survive unchanged (sync, game-stats, types, theme, audio, error-tracking), 1 gets deleted entirely (auth — 40 files, ~3100 lines), 1 gets severely trimmed (testing — remove Supabase mocks), 1 needs surgery (database — keep table query types, remove auth-coupled functions), and 1 needs minor cleanup (ui — remove LoginButton). The dependency graph shows auth is consumed by game API routes only (not frontend); database doesn't import auth at the code level; and most packages are leaf dependencies with no internal coupling.

## Key Findings

### Finding 1: @joolie-boolie/auth — DELETE entirely
- **Evidence:** 92 mentions across codebase, 40 source files. Game apps import only `getApiUser` (API routes) and `generatePKCE` (tests). Zero imports of AuthProvider, useAuth, ProtectedRoute in game frontend code.
- **Confidence:** High
- **Implication:** All frontend auth UI lives only in Platform Hub. Game apps use auth only in API route handlers. Deleting auth breaks API routes (which are also being deleted), nothing else.

### Finding 2: @joolie-boolie/database — MODIFY (split auth from data)
- **Evidence:** 117 imports, 268 exports. Exports include auth-coupled functions (getCurrentProfile, userOwnsBingoTemplate) AND pure table queries (listBingoTemplates, createBingoTemplate). Database doesn't import @joolie-boolie/auth — it uses Supabase directly.
- **Confidence:** High
- **Implication:** Cannot fully delete. Keep type definitions (BingoTemplate, TriviaTemplate, etc.) and validation logic. Remove Supabase client operations, profile functions, ownership checks. ~60+ exports for templates/presets needed; ~40+ for profiles/auth not needed.

### Finding 3: @joolie-boolie/sync — KEEP entirely
- **Evidence:** Only depends on @joolie-boolie/types. Pure BroadcastChannel API, no auth/database coupling. Exports: BroadcastSync, SyncHeartbeat, useSyncStore, useSync.
- **Confidence:** High
- **Implication:** No changes needed. Core dual-screen infrastructure is completely auth-independent.

### Finding 4: @joolie-boolie/game-stats — KEEP entirely
- **Evidence:** 10 imports (all from games). Zero dependencies on auth/database. Uses localStorage directly for statistics persistence.
- **Confidence:** High
- **Implication:** Already localStorage-native. Centerpiece of the standalone persistence model.

### Finding 5: @joolie-boolie/types — KEEP with minor cleanup
- **Evidence:** 18 imports. Pure type definitions with zero dependencies. Contains User type (userId + email) which becomes simplified without auth.
- **Confidence:** High
- **Implication:** Simplify User type. Remove unused auth-related type exports.

### Finding 6: @joolie-boolie/theme — KEEP entirely
- **Evidence:** 18 imports. Design tokens, Zustand theme store, Next.js font loaders. No auth dependency.
- **Confidence:** High

### Finding 7: @joolie-boolie/audio — KEEP entirely
- **Evidence:** 5 imports. Pure audio pool management. No auth/database dependency.
- **Confidence:** High

### Finding 8: @joolie-boolie/error-tracking — KEEP entirely
- **Evidence:** 94 imports. Faro + Sentry monitoring. No auth coupling.
- **Confidence:** High

### Finding 9: @joolie-boolie/ui — KEEP with minor cleanup
- **Evidence:** 109 imports. LoginButton.tsx imports startOAuthFlow from auth — only auth-coupled component. All other exports (Button, Modal, Card, Badge, Skeleton, Toggle, Slider, etc.) are pure.
- **Confidence:** High
- **Implication:** Delete LoginButton. All other ~15 actively-used components are safe.

### Finding 10: @joolie-boolie/testing — DELETE or severely trim
- **Evidence:** ~10 imports (tests only, not runtime). Exports: mockBroadcastChannel, mockAudio, createMockSupabaseClient, createMockUser, mockSentry, mockOtel. Supabase mocks become useless.
- **Confidence:** High
- **Implication:** Keep only mockBroadcastChannel and mockAudio. Delete Supabase/auth mocks.

### Finding 11: Cross-Package Dependency Graph
```
UI → auth (LoginButton only), error-tracking, sync, types
Database → error-tracking (only)
Sync → types
Game-Stats → (none)
Types → (none)
Theme → (none)
Audio → (none)
Error-Tracking → (none)
Testing → (test-only)
```
- **Implication:** Deleting auth breaks only UI's LoginButton. Deleting database breaks nothing at package level. Clean dependency tree.

## Surprises
1. Database package doesn't import auth package at all — auth coupling is conceptual (user-scoped functions), not structural
2. Game apps use getApiUser only in API routes, never in React components — frontend is already auth-free
3. UI's LoginButton is the only auth-coupled UI component
4. Testing package is not imported by any runtime code — only used in monorepo tests

## Unknowns & Gaps
1. Will games remain in a monorepo or become separate repos? Affects whether shared packages stay shared
2. Should database type definitions be kept for localStorage data shapes?
3. Will error-tracking (Faro/Sentry) be retained in standalone mode?
4. Service-role client in database package — unused in standalone but not breaking

## Raw Evidence
- auth: 40 files, ~3110 lines, 92 import mentions
- database: 268 exports, 117 import mentions
- ui: 109 import mentions, ~15 components used by games
- sync: 25 import mentions
- types: 18 import mentions
- theme: 18 import mentions
- error-tracking: 94 import mentions
- game-stats: 10 import mentions
- audio: 5 import mentions
- testing: ~10 import mentions (test files only)
