# Context Packet: Phase 1

## Decisions Made
- Deletion sequencing: Strategy C (Parallel-Safe Batches) — 7 atomic batches, build green at each step
- Critical dependency: packages/ui → packages/auth (LoginButton). UI must be cleaned before auth deleted.
- External gate: new Zustand stores must be built before CRUD API routes can be deleted (Batch 5)
- 4 new stores follow settings-store.ts version+migrate pattern, NOT audio-store merge pattern
- categories field in question sets is DERIVED (not stored) — use selector
- Validation moves to apps/trivia/src/lib/questions/validate.ts (existing lib/questions/ directory)

## Key Data
- 13 components + 1 hook need rewiring
- 70 test files delete, 179 survive, 11 need updating, 4 new store tests needed
- Both home pages (server components) simplify to synchronous renders
- convertTemplateQuestion export in TemplateSelector must be preserved (imported by hook)
- Service worker /api/auth/ bypass is dead code post-conversion — remove

## Carry-Forward Concerns
1. Batch ordering is critical: Batches 0-4 can run before stores exist, Batch 5-6 require stores
2. pnpm install must run after every package deletion or turbo resolution fails
3. Database types must migrate to packages/types before packages/database is deleted
