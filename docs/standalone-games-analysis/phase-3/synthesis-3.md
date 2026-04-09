# Synthesis: Gaps & Implications

## Synthesis Approach
Examined every Phase 1 and Phase 2 artifact plus direct source code verification. Focused on what prior phases assumed but did not verify, what user-visible consequences were understated, and what decisions must be settled before conversion begins.

## Core Narrative
The Phase 2 analysis correctly identified the deletion as mostly mechanical. What it understated is the nature of the decision being made. This conversion changes the product from "multi-user, cross-device, organization-hosted trivia and bingo" to "single-user, single-device, browser-local trivia and bingo." These are different products serving different users. That distinction is not present in any prior analysis artifact.

Several Phase 2 conclusions rested on assumptions that were validated by this synthesis: both games DO have guestModeEnabled: true, Supabase CAN be fully removed (trivia-api proxy has zero Supabase dependency), and SavePresetModal DOES exist in trivia (correcting a Phase 2 unknown).

## Key Conclusions

### Conclusion 1: Both games already have guestModeEnabled — standalone plumbing exists
- **Supporting evidence:** apps/bingo/src/middleware.ts:12 and apps/trivia/src/middleware.ts:12 both set guestModeEnabled: true. Landing pages show "Play as Guest" path. Guests can play but can't load saved templates (API routes return 401).
- **Confidence:** High (verified directly in source)
- **Caveats:** Guest mode for gameplay exists; guest mode for template access does not. The conversion bridges this gap by moving templates to localStorage.

### Conclusion 2: Home page server components are the primary auth surface in game apps
- **Supporting evidence:** Both app/page.tsx files are async server components reading jb_access_token cookie to conditionally render "Play" vs "Sign in / Play as Guest." LoginButton from @joolie-boolie/ui initiates OAuth from these pages.
- **Confidence:** High
- **Caveats:** Net-positive: pages become simpler. But conversion touches user-facing UI, not just internal plumbing.

### Conclusion 3: game_sessions table represents a feature loss no prior phase named
- **Supporting evidence:** Migration 20260120000001 creates table with room_code (unique, bird-word format), pin_hash, pin_salt, game_state JSONB. This is cross-device game session sharing.
- **Confidence:** Medium — table exists but grep game_sessions in apps/ found zero UI-calling code. May be planned-but-unbuilt.
- **Caveats:** If no game app code calls game_sessions, this is a non-regression. MUST be verified before conversion decision.

### Conclusion 4: SavePresetModal DOES exist — Phase 2 "unknown" was wrong
- **Supporting evidence:** apps/trivia/src/components/presenter/SavePresetModal.tsx exists, imported in apps/trivia/src/app/play/page.tsx:23. POSTs to /api/presets.
- **Confidence:** High
- **Caveats:** All four CRUD flows have corresponding UI components. The Zustand store replacement story is complete.

### Conclusion 5: Supabase can be fully removed
- **Supporting evidence:** grep -r supabase apps/trivia/src/app/api/trivia-api/ returns no matches. Proxy fetches from the-trivia-api.com directly. Monitoring tunnel forwards to Sentry, not Supabase. CSP report logs to server logger, not Supabase.
- **Confidence:** High
- **Caveats:** Only remaining question: does @joolie-boolie/error-tracking import Supabase? Not directly verified.

### Conclusion 6: The conversion permanently destroys existing user data
- **Supporting evidence:** No export mechanism in current UI. No in-app export-to-JSON button. No email notification. No data retention period. Once Supabase tables dropped and routes deleted, saved templates are lost permanently.
- **Confidence:** High
- **Caveats:** Severity depends entirely on production usage (unknown).

### Conclusion 7: The question_sets feature flag needs adjustment for standalone
- **Supporting evidence:** NEXT_PUBLIC_FEATURE_QUESTION_SETS controls UI visibility. Currently gated on isAuthenticated AND flag enabled. In standalone (always guest), the isAuthenticated check must be removed, making question sets visible whenever the flag is true.
- **Confidence:** High

## Blind Spots

1. **game_sessions table usage** — zero UI-calling code found, but not conclusively verified. Single most important unverified fact.
2. **@joolie-boolie/error-tracking Supabase dependency** — never checked whether it imports Supabase.
3. **Production usage data** — no one examined Supabase to count users, templates, question sets. Could be zero or dozens.
4. **question_sets feature flag** in standalone mode — isAuthenticated guard must be removed.
5. **Supabase free-tier pausing** — if any Supabase connection retained, pause behavior could silently break things.
6. **packages/database keep-vs-delete** — which types are duplicated in packages/types vs only in packages/database? Never mapped.
7. **E2E_TESTING security guard** — simplified middleware must preserve the guard that prevents E2E mode on production Vercel.

## Recommendations

**Three questions to resolve before conversion begins (in order):**

1. **Does any game app code call game_sessions routes?** Run grep. If zero, feature is unbuilt. If non-zero, major feature regression.
2. **How many real users have saved data?** Run SELECT count(*) on production Supabase tables. If zero, no migration needed. If non-zero, build export tool first.
3. **Is this a product decision or technical decision?** The conversion changes the product's value proposition. Must be acknowledged explicitly.

**Architecture pre-decisions that unlock parallel work:**
- Keep monorepo or split into two repos?
- Retain Sentry/Grafana error tracking?
- Home page UX: remove auth conditional entirely, render only "Play" + "Open Display"?
