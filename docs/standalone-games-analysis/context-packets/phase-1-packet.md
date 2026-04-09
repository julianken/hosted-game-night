# Context Packet: Phase 1

## Key Findings

1. **~10,774 lines of auth/OAuth code** across the monorepo. Platform Hub OAuth server (~7,090 lines), auth package (~3,110 lines), game middleware chains, cookie infrastructure. All deletable.
2. **34 API routes total** (11 Bingo, 23 Trivia), 27 auth-gated via `getApiUser()`. All template/preset/question-set CRUD goes through Supabase. 2 public trivia-api proxy routes have no auth dependency.
3. **6 game-data tables** (bingo_templates, bingo_presets, trivia_templates, trivia_presets, trivia_question_sets, game_sessions) + 5 platform-only tables (oauth_clients, oauth_authorizations, oauth_audit_log, user_roles, facilities) + profiles. Clean separation.
4. **Of 10 packages:** 6 survive unchanged (sync, game-stats, types, theme, audio, error-tracking), 1 DELETE (auth), 1 DELETE/trim (testing), 1 MODIFY (database — keep types, remove Supabase operations), 1 minor cleanup (ui — remove LoginButton).
5. **localStorage already used** for audio, theme, settings, statistics (~7.6KB). Templates/presets would add ~30-70KB. Under 1% of 5-10MB limit.
6. **Game state is completely ephemeral** — never persisted, lost on refresh. This is current design, not a regression.
7. **BroadcastChannel sync has zero server dependency.** Dual-screen works standalone.

## Confidence Levels

### High confidence
- Auth package can be fully deleted — game frontend has zero auth imports
- All game-data tables fit in localStorage with massive headroom
- BroadcastChannel sync is purely client-side
- 6 of 10 packages survive unchanged
- Platform Hub has no features that games depend on (beyond OAuth)

### Medium confidence  
- Database package can be split (keep types, remove operations) — needs verification of edge cases
- game_sessions table may or may not be needed (depends on whether multiplayer/room-codes are in scope)
- Public trivia-api proxy routes could move to client-side fetch but CORS may be an issue

### Low confidence
- Migration path for existing production user data (templates in Supabase → localStorage)
- PIN/hash security in game_sessions — unclear if server-enforced

## Contradictions & Open Questions

1. **Scope of "standalone"**: Does this mean static-site-deployable (no server at all) or just "no auth/no hub" (still Next.js with API routes for non-auth purposes)?
2. **Trivia API proxy**: The trivia-api questions endpoint proxies to the-trivia-api.com — client-side fetch may hit CORS. Keep as lightweight server route or find alternative?
3. **game_sessions table**: Used for room codes and multiplayer. If standalone means single-device only, this table is unnecessary. If multi-device is still wanted, this needs a different solution.

## Artifacts
- phase-1/area-1-auth-oauth.md: Auth/OAuth infrastructure mapping (18KB)
- phase-1/area-2-platform-hub.md: Platform Hub dependency analysis (17KB)
- phase-1/area-3-api-database.md: API route and database inventory
- phase-1/area-4-packages.md: Package dependency classification
- phase-1/area-5-localstorage.md: localStorage migration feasibility
