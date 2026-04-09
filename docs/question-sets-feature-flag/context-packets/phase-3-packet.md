# Context Packet: Phase 3

## Agreement Across All 3 Syntheses
- TriviaApiImporter wizard leak is the highest-priority risk — all 3 syntheses flag it
- Dead code (1,411 lines) must be separated into a cleanup PR merged before the flag PR
- `lib/feature-flags.ts` module shape is the primary blocking decision: recommend `export const QUESTION_SETS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_QUESTION_SETS !== 'false'`
- API routes need 404 (not 403/503) when flag off, after auth check
- Layout gate must be placed BEFORE E2E bypass in `layout.tsx`
- Shared deps (`lib/categories.ts`, `api-adapter.ts`, `TriviaQuestion` type) cannot be gated
- Base `GET/POST /api/question-sets` route has zero test coverage — tests required

## Divergence Between Syntheses
- **Test handling specifics**: S1 notes the problem, S2 recommends `vi.skipIf`, S3 says read the files first to determine grouping strategy (`describe.skipIf` vs `it.skipIf`)
- **Scope of edge cases**: S3 identifies gaps not covered by S1/S2 — PWA/service worker caching, client-side navigation after flag change, E2E test suite interaction, Sentry noise from 404s
- **Implementation ordering**: S2 prescribes a specific PR sequence (CLAUDE.md fix → cleanup PR → flag PR), S3 focuses on module-first within the flag PR

## Strongest Conclusions (high confidence)
- Complete gating surface: 6 active changes + 2 dead code removals (all 3 agree)
- Feature boundary clean at data layer, leaky at UI layer (S1 theme 1)
- 9 specific risk/opportunity items with severity ratings (S2)
- E2E bypass ordering creates test gap if flag placed after it (S2 conclusion 2)

## Key Gaps Identified (S3)
- Flag module shape not designed (blocking)
- TriviaApiImporter check not prototyped — exact JSX boundaries needed
- Cross-feature test grouping structure unknown — affects skip strategy
- E2E test QS coverage not inventoried
- SW caching / client-nav edge cases accepted as known limitations (API gates provide defense)

## Blind Spots (combined)
- Build-time flag cannot be toggled without redeploy
- Existing user data in `trivia_question_sets` table persists when flag off
- No RLS policy analysis on the question sets table
- Browser caching of home page may show stale QS link briefly
- If `lib/feature-flags.ts` uses server-only pattern, TriviaApiImporter (client component) needs prop threading — massive complexity increase

## Artifacts
- phase-3/synthesis-1.md: Thematic synthesis (4 themes — boundary asymmetry, dead code separation, shared infra, test mirroring)
- phase-3/synthesis-2.md: Risk/opportunity synthesis (9 conclusions — wizard leak, E2E ordering, API gating, dead code sequencing, test handling, CLAUDE.md error, 3 opportunities)
- phase-3/synthesis-3.md: Gaps/implications synthesis (8 conclusions — module shape, opt-out default, TriviaApiImporter pattern, page data fetching, cross-feature tests, navigation, E2E suite, PWA/SW)
