# Synthesis: Thematic

## Synthesis Approach
Themes identified by looking for convergent independent confirmation across Phase 1 investigation areas and Phase 2 iterators. Where multiple investigators independently arrived at the same structural insight about different parts of the codebase, those signals were grouped into a theme.

## Core Narrative
The conversion is overwhelmingly a subtraction problem, not a construction problem. Three-quarters of the work is deletion — 261 files, 43,000 lines (33% of the monorepo) — and the remaining quarter is four new Zustand stores and a simplified middleware. The game engines, UI, audio, dual-screen sync, PWA, observability, and theme systems are completely unentangled from auth. Auth was layered on top of a working game system and is mechanically removable.

What makes this conversion non-trivial is not technical complexity but consequences: it breaks cross-device access, eliminates data migration for existing users, and forces a decision about the product's value proposition. The architecture is ready for standalone operation today; the hard question is whether that tradeoff is worth making.

## Key Conclusions

### Conclusion 1: Auth is a wrapper, not a foundation
- **Supporting evidence:** area-1 (10,774 lines of OAuth-specific code isolated to auth package + Platform Hub), area-4 (game apps import getApiUser only in API routes, never in React components), area-5 (game-stats already localStorage-native)
- **Confidence:** High
- **Caveats:** The middleware-factory wrapper files (37 lines each) are a direct import dependency requiring active surgery.

### Conclusion 2: The server layer survives but hollowed out
- **Supporting evidence:** iterator-3 (static export blocked by server components, middleware, CORS proxy), area-3 (34 API routes, 27 auth-gated), iterator-2 (trivia-api proxy is the only surviving API route)
- **Confidence:** High
- **Caveats:** Whether Supabase env vars are still needed post-conversion is unresolved.

### Conclusion 3: Data persistence replaces rather than migrates
- **Supporting evidence:** area-5 (existing Zustand persist pattern, versioning infrastructure), iterator-2 (4 new stores, all parsing already client-side), area-3 (all CRUD uses getApiUser)
- **Confidence:** High
- **Caveats:** No migration path for existing Supabase data. localStorage is device-local and browser-local.

### Conclusion 4: The test suite is partitioned, not entangled
- **Supporting evidence:** iterator-4 (72% test survival, game tests have zero auth imports), area-4 (auth only at API route layer)
- **Confidence:** High
- **Caveats:** 4 new stores need new tests. E2E auth fixture simplifies but needs verification.

### Conclusion 5: The conversion is a one-way architectural downgrade with deliberate tradeoffs
- **Supporting evidence:** area-5 (features lost: cross-device sync, sharing, backup), iterator-3 (deployment simplifies to 2 Vercel projects), area-4 (6 packages retain full value)
- **Confidence:** High
- **Caveats:** Not technically irreversible (git history), but resuming server-backed model would require reverse data migration.

## Blind Spots
- Supabase retention depth unresolved
- Guest mode parity between games needs verification
- game_sessions table fate unclear
- localStorage namespace collision for shared devices

## Recommendations
One explicit decision must be made before execution: whether data migration tooling will be built for existing production users. Implementation should proceed in deletion order: Platform Hub + auth first, then API routes + middleware, then template CRUD replacement, then config cleanup.
