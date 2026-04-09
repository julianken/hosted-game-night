# Synthesis: Risk/Opportunity

## Synthesis Approach
Risks and opportunities assessed from the full Phase 1-2 evidence base with direct codebase verification. Each rated on severity/impact and likelihood/confidence.

## Core Narrative
The conversion is architecturally viable but not trivial. The risks cluster around data permanence (localStorage weaker than server DB), product regression (features disappear for signed-in users), and operational exposure (observability can silently break). The opportunities are substantial: radical codebase simplification, near-zero onboarding config, elimination of an entire class of auth-related bugs (SW cookie stripping, JWKS lazy init, HS256/ES256 divergence).

The single biggest risk: the conversion is a hard break for any user with saved templates/presets/question-sets in Supabase. No migration path exists.

## Key Conclusions

### Conclusion 1: User data is permanently stranded (RISK - HIGH)
- **Supporting evidence:** Templates/presets/question-sets in Supabase with user_id foreign keys. No export mechanism in current UI. questionsToTriviaQuestions converter is client-side, so export tool is buildable — just doesn't exist.
- **Confidence:** High
- **Caveats:** If production user base is zero/trivially small, risk is low-impact.
- **Severity:** High (permanent, irreversible). **Mitigation:** Build one-time export endpoint before cutover.

### Conclusion 2: localStorage is structurally weaker storage (RISK - MEDIUM)
- **Supporting evidence:** Browsers can evict localStorage under storage pressure on mobile. Domain change orphans data. No backup. settings-store.ts version-4 migration handles schema evolution but not eviction.
- **Confidence:** High
- **Caveats:** Acceptable for single-device use; material regression for institutional/rotating-host use.
- **Severity:** Medium. **Mitigation:** Ship explicit export/import UI from day one. Extend existing question exporter.

### Conclusion 3: Middleware simplification is an immediate win (OPPORTUNITY - HIGH)
- **Supporting evidence:** 4-step JWT verification chain is the source of SW Set-Cookie stripping, JWKS lazy init, and HS256/ES256 divergence bugs. Replacement: guestModeEnabled: true with no JWT verification. Both apps already set guestModeEnabled: true.
- **Confidence:** High
- **Opportunity impact:** High — eliminates an entire class of operational bugs.

### Conclusion 4: The 4 new Zustand stores are bounded, understood work (RISK - MEDIUM)
- **Supporting evidence:** No template stores exist today. Four new stores with persist middleware. Estimated 600-800 net-new lines. Follows established settings-store.ts pattern.
- **Confidence:** High
- **Caveats:** is_default singleton invariant and version migration callbacks are non-trivial details.

### Conclusion 5: Test infrastructure simplification (OPPORTUNITY - HIGH)
- **Supporting evidence:** 68 of 247 test files delete cleanly. E2E auth fixture dance disappears. pnpm test:e2e no longer requires Platform Hub. Test runtime drops.
- **Confidence:** High

### Conclusion 6: Observability must be audited before deletion (RISK - HIGH)
- **Supporting evidence:** Monitoring tunnel is required for Sentry CORS. validateEnvironment() imports from @joolie-boolie/auth/env-validation. Deleting auth without updating causes runtime boot failures.
- **Confidence:** High
- **Mitigation:** Enumerate all auth import sites before deletion. Move env validators to surviving packages.

### Conclusion 7: Near-zero onboarding config (OPPORTUNITY - HIGH)
- **Supporting evidence:** Current .env.local requires 13+ variables. Post-conversion: potentially zero required env vars if Supabase fully removed. pnpm dev:bingo produces a working game with no cloud services.
- **Confidence:** High

### Conclusion 8: Trivia API proxy dependency underappreciated (RISK - LOW-MEDIUM)
- **Supporting evidence:** Server-side in-process cache on Vercel serverless is functionally empty on most invocations (cold starts). Free-tier rate limits apply without THE_TRIVIA_API_KEY.
- **Confidence:** High
- **Mitigation:** Move to unstable_cache or CDN caching. Document API key more prominently.

## Blind Spots
- Production usage data unknown — all data-loss risk ratings conditioned on this
- Cross-device use case not addressed
- packages/database "types only" outcome underspecified
- Dead Service Worker /api/auth/ bypass code should be cleaned up
- E2E_TESTING security guard in middleware must survive simplification

## Recommendations
Before starting: (1) Determine production user count and saved data volume. (2) Decide packages/database fate: keep as types-only or migrate types to packages/types.
During: (3) Build stores before deleting routes (coexistence window). (4) Keep monitoring tunnel. (5) Audit all auth imports before package deletion.
Opportunity capture: (6) Ship localStorage export/import UI on day one. (7) Document simplified env requirements prominently.
