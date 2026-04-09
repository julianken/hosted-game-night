# Context Packet: Phase 3

## Synthesis Agreement (all 3 lenses converge)
1. **Auth is a wrapper, not a foundation.** Game engines, UI, audio, sync, themes have zero auth coupling. Removal is mechanical deletion + 4 new Zustand stores.
2. **~43K lines (33%) delete, ~85K survive.** 261 files removed. 72% of tests unchanged. Server layer survives but hollowed (only trivia-api proxy + monitoring tunnel).
3. **This is a product change, not just a technical one.** The conversion transforms "multi-user, cross-device, organization-hosted" into "single-user, single-device, browser-local." This must be an explicit decision.
4. **No migration path for existing user data.** Templates/presets/question-sets in Supabase are permanently inaccessible. Severity depends on production usage (unknown).
5. **Both games already have guestModeEnabled: true.** The "standalone plumbing" is partially built — guests can play but can't access saved templates. The conversion bridges this by moving templates to localStorage.

## Key Divergences Between Lenses
- **Thematic** focuses on the clean separation (auth is a wrapper) and the mechanical nature of the work
- **Risk/Opportunity** weights the data permanence risk heavily and highlights the middleware simplification as the biggest immediate win
- **Gaps** surfaced several unverified assumptions: game_sessions table may be unbuilt (zero UI code found), SavePresetModal DOES exist (correcting Phase 2), Supabase CAN be fully removed

## Strongest Conclusions (high confidence)
- Auth package + Platform Hub deletable with zero game frontend impact
- 4 new Zustand stores follow established codebase patterns (settings-store.ts)
- Static export NOT viable (CORS, middleware, server components)
- Middleware simplifies from 4-step JWT chain to guest-mode only
- Trivia-api proxy has zero Supabase dependency (fully removable)
- 72% test survival with clean partition (game tests never imported auth)

## Largest Blind Spots
1. **game_sessions usage** — table has room_code + PIN but zero UI-calling code found. Unbuilt feature or real regression?
2. **Production user data** — no one checked Supabase for actual user/template counts. Determines migration urgency.
3. **error-tracking Supabase dependency** — never verified whether package imports Supabase
4. **question_sets feature flag** — isAuthenticated guard must be removed for standalone mode

## Pre-Conversion Decisions Required
1. Is any game app code calling game_sessions? (grep to verify)
2. How many production users have saved data? (Supabase query)
3. Is this an explicit product decision? (value proposition changes)
4. Keep monorepo or split repos?
5. Retain Sentry/Grafana?
6. packages/database: keep as types-only or migrate types to packages/types?
