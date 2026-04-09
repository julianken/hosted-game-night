# Context Packet: Phase 2

## Key Findings

1. **Deletion scope: ~43,000 lines (33% of monorepo), 261 files.** Platform Hub (28,240 lines), auth package (8,364 lines), auth API routes, middleware, OAuth pages, Supabase migrations. ~85,000 lines survive.
2. **CRUD replacement: 4 new Zustand stores** with persist middleware. No template stores exist today — components use useState + fetch. Templates/presets/question-sets become localStorage-backed stores. All parsing/conversion logic is already client-side.
3. **Static export NOT viable** — both apps have server components, middleware, and API routes. The trivia-api proxy (to the-trivia-api.com, no CORS) MUST be retained as the only surviving API route. Apps remain Next.js SSR on Vercel, just without auth.
4. **72% of tests (179 of 247) survive unchanged.** 68 auth-related tests deleted (28%). New tests needed for 4 localStorage stores. Game E2E tests (16) survive but auth fixture simplifies dramatically.
5. **13 env vars deleted** (all OAuth/Platform Hub), 4 core Supabase vars kept (URL, anon key, service role, JWT secret — even though Supabase is removed for CRUD, the trivia-api proxy and monitoring may still use them). jb_* cookies simplified.
6. **Middleware simplifies dramatically** — 4-step JWT chain reduces to guest-mode handling only. Token refresh (calls Platform Hub) deleted entirely.
7. **Package scorecard:** DELETE auth, TRIM testing (remove Supabase mocks), MODIFY database (keep types only), CLEANUP ui (remove LoginButton). 6 packages untouched.

## Confidence Levels

### High confidence
- Deletion scope is accurate (file/line counts verified)
- 4 new Zustand stores is the right replacement pattern
- 72% test survival rate
- Trivia-api proxy must stay (CORS)
- Static export impossible

### Medium confidence
- Supabase env vars may still be needed (monitoring tunnel, trivia-api cache?)
- game_sessions table fate (if standalone = single-device only, table is unnecessary)
- E2E game tests can run without any auth fixture at all

### Low confidence
- Migration path for existing production user data in Supabase
- Whether to keep Supabase connection at all (could the trivia-api proxy work without it?)

## Contradictions & Open Questions

1. **Supabase removal depth**: Removing auth doesn't necessarily mean removing Supabase entirely. The monitoring tunnel and error tracking may still use it. But if the goal is "no server dependencies," Supabase goes entirely.
2. **Guest mode already exists in Bingo** (guestModeEnabled: true). Does Trivia have equivalent? If so, much of the "standalone" plumbing already exists.
3. **Data migration**: No mechanism exists to export Supabase data to localStorage for existing users. This is a hard break for anyone with saved templates.
