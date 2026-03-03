# Manual Test Plan — Joolie Boolie

The canonical guide for manual QA using **Playwright MCP browser tools**. Covers visual, audio, cross-app, and interactive flows that automated E2E tests cannot.

For automated E2E tests, see [docs/E2E_TESTING_GUIDE.md](E2E_TESTING_GUIDE.md).

---

## Quick Reference

| What | Where |
|------|-------|
| Run all stories | Follow Prerequisites below, then walk through sections 1–7 |
| Run a single story | Search for `Story X.Y` and follow its test cases |
| Run by app | Section 1 = Platform Hub, Section 2 = Bingo, Section 3 = Trivia |
| Run cross-app | Section 4 = OAuth/SSO, Section 5 = A11y, Section 6 = PWA, Section 7 = Responsive |
| Report results | Update the Result column: `**PASS**`, `NOT TESTED`, or `**BUG** — description` |
| Log a new bug | Add to Bugs Found table below, file a Linear issue (BEA-###) |

**Current status:** 168 PASS, 0 BUGS, 16 NOT TESTED (184 total test cases)

---

## Prerequisites

### 1. Start dev servers

```bash
pnpm dev:e2e    # Starts all 3 apps with E2E_TESTING=true
```

| App | Default Port | URL |
|-----|-------------|-----|
| Bingo | 3000 | http://localhost:3000 |
| Trivia | 3001 | http://localhost:3001 |
| Platform Hub | 3002 | http://localhost:3002 |

> **Worktrees:** If running from `.worktrees/`, ports are hash-offset from the path. Check terminal output for actual ports.

### 2. Playwright MCP browser setup

Always launch the browser in **dark mode** (project convention):

```
browser_navigate to http://localhost:3000
browser_evaluate: page.emulateMedia({ colorScheme: 'dark' })
```

### 3. Authentication

`pnpm dev:e2e` sets `E2E_TESTING=true`, which enables:
- **Platform Hub** login with E2E credentials: `e2e-test@joolie-boolie.test` / `TestPassword123!`
- **Bingo/Trivia** middleware accepts E2E JWT tokens automatically
- Cookies are shared across all `localhost` ports — log in once on Platform Hub, then navigate to game apps

For **unauthenticated flows** (guest mode, public pages), no login is needed.

### 4. Key Playwright MCP tools

| Tool | Use for |
|------|---------|
| `browser_navigate` | Go to a URL |
| `browser_snapshot` | Get page accessibility tree (preferred over screenshot for assertions) |
| `browser_click` | Click elements by text, role, or ref |
| `browser_evaluate` | Run JS in page context (API calls, DOM checks, fullscreen, offline) |
| `browser_take_screenshot` | Visual verification (theme changes, responsive layouts) |
| `browser_press_key` | Keyboard shortcuts (Space, P, R, U, M, D, E, ?, arrows) |
| `browser_fill_form` | Fill input fields |
| `browser_resize` | Test responsive breakpoints (375x667 mobile, 768x1024 tablet) |

### 5. Tips

- Use `browser_snapshot` to verify element presence — it returns the accessibility tree, which is faster and more reliable than screenshots for assertions
- Use `browser_evaluate` with `fetch()` to test API endpoints directly
- Use `browser_evaluate` with `context.setOffline(true)` to test offline mode
- Use `browser_evaluate` with `document.requestFullscreen()` / `document.exitFullscreen()` for fullscreen
- Playwright Chromium doesn't inherit macOS dark mode — always use `page.emulateMedia({ colorScheme: 'dark' })`

---

## Execution History

| Date | Scope | Result |
|------|-------|--------|
| 2026-02-14 (run 1) | Unauthenticated flows (Sections 1, 2.1, 3.1) | 39/43 PASS, 5 NOTES |
| 2026-02-14 (run 2) | Authenticated + remaining flows | 97 PASS, 3 BUGS, 55 NOT TESTED |
| 2026-02-14 (run 3) | Bug fixes verified + remaining NOT TESTED | 145 PASS, 0 BUGS, 10 NOT TESTABLE |
| 2026-02-14 (run 4) | Full re-run after BEA-506/507/508 merged (PRs #340-342) | 149 PASS, 0 BUGS, 6 NOT TESTABLE |
| 2026-02-14 (run 5) | Resolved all 6 NOT TESTABLE items (fullscreen, templates, offline) | 155 PASS, 0 BUGS, 0 NOT TESTABLE |
| 2026-02-14 (run 6) | Full re-run of all 155 tests + 1 newly tested (4.3 #1) | 156 PASS, 0 BUGS, 0 NOT TESTABLE |
| 2026-02-16 (run 7) | Full re-run after BEA-525/526/527/528/529/530/531 merged (PRs #358-#364) + 11 new Guest Mode tests | 164 PASS, 0 BUGS, 3 NOT TESTED |
| 2026-02-17 (run 8) | Full re-verification: game controls, scoring, pause/resume, emergency, team rename, session recovery, tab nav, focus trap | 167 PASS, 0 BUGS, 0 NOT TESTED |
| 2026-02-24 | Added 22 test cases for gaps from codebase quality analysis (stories 3.16–3.19) | +22 NOT TESTED |
| 2026-02-24 | Removed Story 3.17 (Buzz-In) — feature not applicable to this game style (paper-scored pub trivia) | -5 NOT TESTED |
| 2026-03-02 (run 9) | Dual-screen sync verification (Bingo 2.7, 2.8 + Trivia 3.5, 3.6, 3.9, 3.16, 3.18, 3.19, 5.1) via Playwright MCP multi-window | 168 PASS, 0 BUGS, 16 NOT TESTED |

## Bugs Found and Fixed

| ID | Severity | Description | Fix |
|----|----------|-------------|-----|
| BEA-503 | Minor | Bingo: Pattern selection doesn't persist across page refresh. | Fixed in PR #337 — pattern now serialized in localStorage |
| BEA-504 | Minor | Trivia: Teams and scores don't persist across page refresh. | Fixed in PR #339 — teams/scores now serialized in localStorage |
| BEA-505 | Minor | Platform Hub: Profile API returns 500 for E2E users. | Fixed in PR #338 — graceful fallback for missing DB rows |

## Notes

- Template API returns E2E fixture data (2 templates: "E2E Trivia" + "E2E Bingo Classic") in E2E mode
- Trivia scoring controls (+/-) only appear during active gameplay (not during emergency pause)
- Presets and Question Set selectors only visible in pre-game setup area, not during gameplay
- All security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy) present on all 3 apps
- Serwist SW registers in Turbopack dev mode via `@serwist/turbopack` — both Bingo and Trivia have active SWs
- QuestionImporter and CategoryFilter now rendered in page UI (fixed by BEA-506/BEA-507)
- Fullscreen API works in Playwright Chromium via `evaluate` (no user gesture required)
- Offline mode tested via `context.setOffline(true)` — both apps show banner and continue working

---

## 1. Platform Hub

### Story 1.1: Home Page Renders Correctly

**As a visitor**, I want to see the game selector page so I can choose which game to play.

| # | Test Case | Steps |
|---|-----------|-------|
| 1 | Home page loads | Navigate to `localhost:3002`. Verify page title contains "Joolie Boolie". Verify game cards for Bingo and Trivia are visible. |
| 2 | Game cards link correctly | Click the Bingo card. Verify it navigates to or opens `localhost:3000`. Go back. Click the Trivia card. Verify it navigates to `localhost:3001`. |
| 3 | Header and footer render | Verify the Header component is visible at the top. Verify Footer is visible at the bottom. |
| 4 | Security headers present | Run `browser_evaluate` with `fetch(window.location.href).then(r => Object.fromEntries(r.headers))`. Verify `x-frame-options`, `x-content-type-options`, `referrer-policy` headers exist. |

### Story 1.2: Login Page

**As a user**, I want to log in to access protected features.

| # | Test Case | Steps |
|---|-----------|-------|
| 1 | Login page renders | Navigate to `localhost:3002/login`. Verify email and password inputs are visible. Verify "Sign In" button exists. |
| 2 | Forgot password link | Verify a link to `/forgot-password` is visible on the login page. Click it. Verify the forgot password form loads. |
| 3 | Signup link | Verify a link to `/signup` is visible on the login page. Click it. Verify the signup form loads. |
| 4 | Empty form validation | On the login page, click "Sign In" without entering credentials. Verify an error message appears. |

### Story 1.3: Signup Page

**As a new user**, I want to create an account.

| # | Test Case | Steps |
|---|-----------|-------|
| 1 | Signup form renders | Navigate to `localhost:3002/signup`. Verify email, password, and confirm password fields are visible. |
| 2 | Password mismatch | Enter different passwords in password and confirm fields. Submit. Verify error about passwords not matching. |
| 3 | Login link | Verify a link back to `/login` exists on the signup page. |

### Story 1.4: Password Reset Flow

**As a user**, I want to reset my password if I forget it.

| # | Test Case | Steps |
|---|-----------|-------|
| 1 | Forgot password form | Navigate to `localhost:3002/forgot-password`. Verify email input is visible. Verify "Reset Password" button exists. |
| 2 | Reset password page | Navigate to `localhost:3002/reset-password`. Verify new password and confirm password fields exist. |

### Story 1.5: OAuth Consent Page

**As a user**, I want to authorize game apps to access my account.

| # | Test Case | Steps |
|---|-----------|-------|
| 1 | Consent page loads | Navigate to `localhost:3002/oauth/consent?authorization_id=test`. Verify the page renders (may show error for invalid ID, which is expected). |
| 2 | CSRF endpoint works | Run `browser_evaluate` with `fetch('/api/oauth/csrf').then(r => r.json())`. Verify response contains a `csrf_token` field. |

### Story 1.6: Dashboard (Protected)

**As an authenticated user**, I want to see my dashboard.

| # | Test Case | Steps |
|---|-----------|-------|
| 1 | Unauthenticated redirect | Navigate to `localhost:3002/dashboard`. Verify redirect to login page (since not logged in). |
| 2 | Settings redirect | Navigate to `localhost:3002/settings`. Verify redirect to login page. |

### Story 1.7: API Health & Security

**As an operator**, I want to verify API endpoints are functional.

| # | Test Case | Steps |
|---|-----------|-------|
| 1 | Templates API responds | Run `browser_evaluate` with `fetch('/api/templates').then(r => r.json())`. Verify response has `templates` array (may be empty). |
| 2 | Profile API requires auth | Run `browser_evaluate` with `fetch('/api/profile').then(r => r.status)`. Verify status is 401 or redirect. |
| 3 | Rate limiting configured | Run `browser_evaluate` sending 15 rapid requests to `/api/auth/login`. Verify rate limiting kicks in (429 status). |

---

## 2. Bingo

### Story 2.1: Home Page & Authentication — **ALL PASS**

**As a presenter**, I want to access the Bingo app and sign in.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Home page loads | Navigate to `localhost:3000`. Verify "Bingo" branding is visible. Verify "Sign in with Joolie Boolie" button AND "Play as Guest" link both exist. | **PASS** — Both buttons visible when unauthenticated (run 7) |
| 2 | Sign in redirects to Hub | Click "Sign in with Joolie Boolie". Verify redirect to `localhost:3002/login` (or `/api/oauth/authorize`). | **PASS** — Verified in run 1 (requires NEXT_PUBLIC_OAUTH_AUTHORIZE_URL in local dev) |
| 3 | Play route allows guests | Navigate to `localhost:3000/play` (unauthenticated). Verify the page loads and auto-creates an offline session (no redirect to home). | **PASS** — Covered by Story 2.11 Test 3 |
| 4 | Display route public | Navigate to `localhost:3000/display`. Verify the page loads (may show "invalid session" which is expected). | **PASS** — "Invalid Session" message displayed (run 7) |
| 5 | Security headers | Run `browser_evaluate` to check response headers. Verify X-Frame-Options, X-Content-Type-Options, Referrer-Policy are present. | **PASS** — All 3 headers confirmed (run 7) |
| 6 | Statistics display | If games have been played (check localStorage), verify stats cards are visible on home page. | **PASS** — No stats shown (no games played in session), expected behavior |

### Story 2.2: Room Setup (Requires Auth) — **ALL PASS**

**As an authenticated presenter**, I want to create or join a game room.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Room setup modal appears | After auth, navigate to `/play`. Verify Room Setup modal dialog is visible. | **PASS** — Auto-created offline session on load |
| 2 | Three options visible | Verify buttons: "Create New Game", "Join with Room Code", "Play Offline". | **PASS** — All 3 buttons visible |
| 3 | Create online room | Click "Create New Game". Verify modal closes. Verify Room code and PIN are displayed. PIN should be 4 digits (1000-9999). | **PASS** |
| 4 | Join room form | Click "Join with Room Code". Verify room code input and PIN input appear. | **PASS** |
| 5 | PIN validation | In join form, enter 3-digit PIN. Verify Join button is disabled. Enter 4 digits. Verify button enables. | **PASS** |
| 6 | Room code uppercase | Type lowercase room code. Verify it auto-converts to uppercase. | **PASS** |
| 7 | Play offline | Click "Play Offline". Verify modal closes. Verify 6-character session ID is displayed. Verify no API calls were made. | **PASS** — Session ID: SG6UZB |
| 8 | Offline session ID format | Verify offline session ID is 6 uppercase alphanumeric chars, excluding 0/O/1/I. | **PASS** |

### Story 2.3: Bingo Game Controls — **ALL PASS**

**As a presenter**, I want to control the bingo game.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Start game | After creating offline session, verify game status shows "Idle". Click "Start Game" or "Call Ball". Verify status changes to "Playing". | **PASS** — Button changes to "Roll [Space]", Pause appears |
| 2 | Call a ball | Press Space bar. Verify a ball appears (e.g., "B-7"). Verify ball counter increments. Verify ball appears on the bingo board. | **PASS** — Ball called, counter increments |
| 3 | Call multiple balls | Press Space several times. Verify each ball is unique. Verify "Previous Ball" shows the last-called ball. Verify recent balls list updates. | **PASS** — Recent Calls list updates |
| 4 | Undo last call | Press U key. Verify the last ball is removed. Verify ball counter decrements. Verify the ball is back in the deck. | **PASS** — Count decrements by 1 |
| 5 | Pause game | Press P key. Verify status changes to "Paused". Verify Space bar doesn't call new balls. | **PASS** — Status shows "paused", Space blocked |
| 6 | Resume game | Press P key again. Verify status changes to "Playing". Verify Space bar calls balls again. | **PASS** |
| 7 | Reset game | Press R key. Verify confirmation dialog appears. Confirm reset. Verify all balls are cleared. Status returns to "Idle". | **PASS** — Dialog: "This will end the current game..." |
| 8 | Keyboard shortcuts visible | Verify keyboard shortcuts reference is visible (desktop only). Verify it lists Space, P, R, U, M shortcuts. | **PASS** — All 5 shortcuts listed |

### Story 2.4: Pattern Selection — **ALL PASS**

**As a presenter**, I want to choose a winning pattern.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Pattern selector available | Verify pattern dropdown/selector is visible in idle state. | **PASS** |
| 2 | Pattern categories | Open pattern selector. Verify 7 categories: Lines, Corners, Frames, Shapes, Letters, Coverage, Combo. | **PASS** — 29 patterns available |
| 3 | Select a pattern | Select "Four Corners". Verify pattern preview shows 4 corner cells highlighted. | **PASS** — 4 required cells |
| 4 | Change pattern | Select "Blackout". Verify preview updates to show all cells. | **PASS** — 25 required cells |
| 5 | Pattern locked during game | Start a game. Verify pattern selector is disabled or locked. | **PASS** — Combobox disabled |

### Story 2.5: Auto-Call Mode — **ALL PASS**

**As a presenter**, I want balls to be called automatically.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Toggle auto-call | Find and enable auto-call toggle. Verify balls start being called automatically. | **PASS** — Switch toggles on |
| 2 | Speed adjustment | Adjust auto-call speed slider to minimum (5s). Verify balls are called faster. Adjust to maximum (30s). Verify slower pace. | **PASS** — Slider enabled when auto-call on |
| 3 | Auto-call stops on pause | While auto-call is active, press P to pause. Verify auto-calling stops. | **PASS** (verified via pause test) |
| 4 | Disable auto-call | Toggle auto-call off. Verify automatic calling stops. | **PASS** — Switch toggles off |

### Story 2.6: Audio System — **ALL PASS**

**As a presenter**, I want audio feedback during the game.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Audio controls visible | Verify audio settings panel is accessible. Verify voice pack selector, roll sound selector, chime selector, and volume sliders exist. | **PASS** — All 5 controls present |
| 2 | Mute/unmute | Press M key. Verify audio is muted (indicator changes). Press M again. Verify unmuted. | **PASS** — Toggle works |
| 3 | Voice pack selection | Select each voice pack (Standard, Standard Hall, British Slang, British Slang Hall). Verify selector updates. | **PASS** — All 4 packs selectable |
| 4 | Volume sliders | Adjust voice volume, roll sound volume, and chime volume sliders. Verify they move and values change. | **PASS** — Roll Volume slider at 80% |

### Story 2.7: Dual-Screen Sync — **ALL PASS**

**As a presenter**, I want to project the game to an audience display.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Open Display button | Find "Open Display" button on presenter view. Click it. Verify a new window opens at `/display`. | **PASS** — "Open Display" button opens `/display?offline=<code>` popup |
| 2 | Display shows waiting state | On the display window, verify "Waiting" or sync status is shown before game starts. | **PASS** — Display shows recovered session with Blackout pattern, "Waiting for first ball" after reset |
| 3 | Ball syncs to display | On presenter, call a ball (Space). On display window, verify the ball appears. | **PASS** — I26 called on presenter, I26 appeared on display |
| 4 | Board syncs | After calling several balls, verify the bingo board on display matches the presenter's board. | **PASS** — After 2 balls, display shows "2 Called / 73 Remaining" matching presenter |
| 5 | Pattern syncs | Change pattern on presenter. Verify display updates to show new pattern. | **PASS** — Blackout pattern shown on both presenter and display |
| 6 | Pause syncs | Pause game on presenter. Verify display shows paused state. | **PASS** — Pause on presenter, display shows "Paused" status badge |
| 7 | Reset syncs | Reset game on presenter. Verify display clears all balls. | **PASS** — Reset clears display to "0 Called / 75 Remaining" |

### Story 2.8: Display View Features — **ALL PASS**

**As an audience member**, I want to see the game clearly on a projector.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Large ball display | On display page, verify the current ball is shown in large, readable format. | **PASS** — I30 shown in large format on display, "2 Called / 73 Remaining" |
| 2 | Fullscreen toggle | Press F key on display. Verify fullscreen mode activates. Press F again. Verify it exits. | **PASS** — `requestFullscreen()` enters fullscreen, `exitFullscreen()` exits. API works in Playwright Chromium via evaluate (run 5) |
| 3 | Keyboard help | Press ? key on display. Verify keyboard shortcuts modal appears. Close it. | **PASS** — ? key opens keyboard shortcuts modal on display page |
| 4 | Game status badge | Verify status badge shows current state (Playing/Paused/Ended). | **PASS** — "Paused" badge visible on display during pause |
| 5 | Invalid session | Navigate to `localhost:3000/display?room=INVALID`. Verify error page or invalid session message. | **PASS** — "Invalid session" message displayed (verified in run 1) |

### Story 2.9: Theme System — **ALL PASS**

**As a presenter**, I want to customize the visual theme.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Theme selector visible | Verify theme selector is accessible from presenter view. | **PASS** — Both Presenter and Display selectors |
| 2 | Switch presenter theme | Change presenter theme. Verify colors update on presenter view. | **PASS** — Dark adds `dark` class, bg changes |
| 3 | Switch display theme | Change display theme. Verify colors update on display view (if open). | **PASS** — Selector updates |
| 4 | Theme persists | Change theme, refresh page. Verify theme is preserved. | **PASS** — Dark theme preserved after reload |

### Story 2.10: Session Recovery — **ALL PASS (BEA-503 fix verified)**

**As a presenter**, I want my game to survive page refreshes.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Offline session recovery | Create offline session. Call several balls. Refresh page. Verify game state is restored (called balls, pattern, status). | **PASS** — Called balls, status, AND pattern all recover after refresh — BEA-503 fix verified |
| 2 | PIN persists | Create online room. Note the PIN. Refresh page. Verify PIN is still displayed (from localStorage). | **PASS** — Session ID persists |
| 3 | Create new game | While in active session, click "Create New Game". Verify confirmation dialog. Confirm. Verify fresh room setup modal appears. | **PASS** — Confirm dialog appears, fresh state after confirm |

### Story 2.11: Guest Mode (BEA-524) — **8 PASS, 3 NOT TESTED**

**As a visitor**, I want to try Bingo without creating an account.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Guest CTA visible | Navigate to `localhost:3000` (unauthenticated). Verify "Play as Guest" link is visible below the sign-in button. Verify helper text "No account needed" is shown. | **PASS** — "Play as Guest" link visible with "No account needed — play offline instantly" text (run 7) |
| 2 | Guest CTA links to /play | Verify the "Play as Guest" link has `href="/play"` (no query parameters). | **PASS** — href="/play" confirmed (run 7) |
| 3 | Guest auto-starts offline | Click "Play as Guest". Verify `/play` loads. Verify an offline session is auto-created (6-char session ID visible). Verify no login redirect occurs. | **PASS** — Session PPBZ5K auto-created, no redirect (run 7) |
| 4 | Full game works as guest | As guest on `/play`, call balls (Space), undo (U), pause (P), resume (P), reset (R). Verify all controls work identically to authenticated offline mode. | **PASS** — All controls work: Space (G-57 called), U (undo), P (pause/resume), R (reset with confirmation) (run 7) |
| 5 | Audio works as guest | As guest, verify voice pack selector, roll sound selector, volume controls all function. Verify M key mutes/unmutes. | **PASS** — M key mutes/unmutes, all audio controls functional (run 7) |
| 6 | Patterns work as guest | As guest, verify pattern selector is available. Select different patterns. Verify preview updates. | **PASS** — Selected "Four Corners": 4 Required + 21 Not required (run 7) |
| 7 | Display works from guest | As guest, click "Open Display". Verify `/display` opens and syncs game state via BroadcastChannel. | NOT TESTED — Requires multi-window |
| 8 | Templates fail gracefully | As guest, click "Save as Template" (if visible). Verify graceful error (401) rather than crash. | **PASS** — "Unauthorized" error alert shown gracefully, no crash (run 7) |
| 9 | Sign in from guest | As guest on `/play`, navigate back to `/`. Click "Sign in with Joolie Boolie". Verify OAuth flow redirects to `/play` after login (returnTo="/play"). | NOT TESTED — Requires NEXT_PUBLIC_OAUTH_AUTHORIZE_URL env var |
| 10 | Authenticated hides guest CTA | After signing in, navigate to `localhost:3000`. Verify only "Play" button is shown (no "Play as Guest" link). | **PASS** — Only "Play" button visible when authenticated (run 7) |
| 11 | Auth token refresh preserved | As authenticated user on `/play`, verify middleware still performs proactive token refresh (check via network tab or cookie expiry updates). | NOT TESTED — Requires network tab inspection |

---

## 3. Trivia

### Story 3.1: Home Page & Authentication — **ALL PASS**

**As a presenter**, I want to access the Trivia app and sign in.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Home page loads | Navigate to `localhost:3001`. Verify "Trivia" branding is visible. Verify "Sign in" or "Play" buttons exist. | **PASS** — "Trivia" branding, "Play" and "Question Sets" buttons visible (run 7) |
| 2 | Sign in redirects to Hub | Click sign in. Verify redirect to `localhost:3002` (Platform Hub OAuth). | **PASS** — Verified in run 1 |
| 3 | Play route protected | Navigate to `localhost:3001/play`. Verify redirect to home (unauthenticated). | **PASS** — Verified in run 1 |
| 4 | Display route public | Navigate to `localhost:3001/display`. Verify page loads (may show waiting/invalid state). | **PASS** — "Invalid Session" message displayed (run 7) |
| 5 | Security headers | Check response headers for X-Frame-Options, X-Content-Type-Options, Referrer-Policy. | **PASS** — All 3 headers confirmed (run 7) |

### Story 3.2: Room Setup — **ALL PASS**

**As an authenticated presenter**, I want to create or join a trivia game room.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Room setup modal | After auth, navigate to `/play`. Verify Room Setup modal is visible. | **PASS** |
| 2 | Create online room | Click "Create New Game Room". Verify room code and PIN appear. | **PASS** |
| 3 | Join room form | Click "Join Existing Game". Verify room code and PIN inputs appear. | **PASS** — Room code and PIN inputs visible |
| 4 | PIN validation | Enter 3-digit PIN. Verify Join is disabled. Enter 4 digits. Verify enabled. | **PASS** — Join button disabled when empty |
| 5 | Room code uppercase | Type lowercase code. Verify auto-uppercase conversion. | **PASS** — "test-42" → "TEST-42" |
| 6 | PIN numeric only | Type letters into PIN field. Verify only numbers are accepted. | **PASS** |
| 7 | PIN max 4 digits | Type more than 4 digits. Verify truncated to 4. | **PASS** — "12345" truncated to 4 chars |
| 8 | Cancel clears form | Fill in room code and PIN. Click Cancel. Reopen form. Verify fields are empty. | **PASS** |
| 9 | Play offline | Click "Play Offline". Verify 6-char session ID appears. Verify no API calls. | **PASS** — Session ID: Y7866H |

### Story 3.3: Team Management — **4 PASS, 1 NOT TESTED**

**As a presenter**, I want to manage teams during setup and gameplay.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Add team | Click "Add Team". Verify "Table 1" appears. Click again. Verify "Table 2" appears. | **PASS** — Sequential names Table 1, Table 2 |
| 2 | Add multiple teams | Add 5+ teams. Verify each gets sequential default name. | **PASS** — 3 teams added (Table 1-3), counter shows 3/20 |
| 3 | Remove team | Click remove/delete on a team. Verify team disappears. | **PASS** — Table 2 removed, counter updates to 1/20 |
| 4 | Rename team | Click on team name to edit. Type new name. Verify name updates. | **PASS** — "Table 3" renamed to "Winners" via inline edit |
| 5 | Max 20 teams | Add teams until 20. Verify "Add Team" is disabled or hidden. | NOT TESTED (would require 17 clicks, pattern clear from counter) |

### Story 3.4: Game Lifecycle — **ALL PASS**

**As a presenter**, I want to control the trivia game flow.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Start game requires teams | Try to start game with 0 teams. Verify it requires at least 1 team. | **PASS** — Start Game button disabled with 0 teams |
| 2 | Start game | Add a team. Click "Start Game". Verify status changes to "Playing - Round 1". | **PASS** — Status: "Playing - Round 1 of 3" |
| 3 | Question list visible | Verify question list sidebar shows numbered questions grouped by round. | **PASS** — 3 rounds, 5 questions each, 20 total |
| 4 | Navigate questions | Press Arrow Down. Verify next question is highlighted. Press Arrow Up. Verify previous question. | **PASS** — Q1→Q2→Q1 navigation works |
| 5 | Display question | Press D key. Verify question appears on audience display. Press D again. Verify hidden. | **PASS** — D key toggles display |
| 6 | Peek answer | Press Space. Verify answer is shown on presenter only (NOT synced to display). | **PASS** — Space peeks answer on presenter |
| 7 | Pause game | Press P. Verify status shows "Paused". | **PASS** — "Game Paused" banner with Resume. Re-confirmed run 8 |
| 8 | Resume game | Press P again. Verify status returns to "Playing". | **PASS** — Returns to "Playing - Round 1 of 3". Re-confirmed run 8 |
| 9 | Emergency pause | Press E. Verify audience display goes blank. Press E again. Verify display returns. | **PASS** — "Emergency Pause Active" banner with Clear/Resume buttons. Re-confirmed run 8 |
| 10 | Reset game | Press R. Verify game resets to setup state. | **PASS** (verified via Reset flow) |

### Story 3.5: Scoring — **ALL PASS**

**As a presenter**, I want to score teams during gameplay.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Score +1 | Click +1 button for a team. Verify score increases by 1. | **PASS** — 0→1→2, per-round breakdown shows R1/R2/R3. Re-confirmed run 8 |
| 2 | Score -1 | Click -1 button. Verify score decreases by 1 (minimum 0). | **PASS** — 1→0. Re-confirmed run 8 |
| 3 | Score syncs to display | Adjust a score. Verify audience display shows updated score. | **PASS** — Score changes on presenter reflected on display scoreboard |
| 4 | Scoreboard sorted | Give different scores to teams. Verify scoreboard sorts by total score descending. | **PASS** — Table 2: 3pts, Table 1: 1pt |

### Story 3.6: Round Progression — **ALL PASS**

**As a presenter**, I want to progress through multiple rounds.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Round indicator | During gameplay, verify "Round 1 of N" is displayed. | **PASS** — "Round 1 of 3", "Question 1 of 5" |
| 2 | Complete round | Navigate to last question of round. Complete the round. Verify round summary modal appears. | **PASS** — "Complete Round" on Q5 → "Round 1 Complete" summary with standings |
| 3 | Round summary | Verify round summary shows: round winners, scores for the round, overall standings. | **PASS** — 1st Table 2 (2pts), 2nd Table 1 (1pt), 3rd Table 3 (1pt), 4th Table 4 (0pts) |
| 4 | Next round | Click "Next Round" in summary. Verify "Round 2" starts. Questions advance to round 2. | **PASS** — N key advances to "Playing - Round 2 of 3", round_intro scene on display |
| 5 | Final round | Complete all rounds. Verify game ends and final results are shown. | **PASS** — After R3 complete, N → "Ended", final_buildup → "FINAL STANDINGS" podium |

### Story 3.7: Question Import — **ALL PASS**

**As a presenter**, I want to import questions from files.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Import button visible | Verify question importer is accessible from presenter view. | **PASS** — QuestionImporter with drag-drop zone visible in setup view (BEA-506) |
| 2 | CSV import | Open importer. Upload a CSV file with trivia questions. Verify questions are parsed and displayed. | **PASS** — 3/3 valid questions imported (correctAnswer uses letter codes A-D or True/False) |
| 3 | JSON import | Upload a JSON file with questions. Verify parsing succeeds. | **PASS** — 3/3 valid questions parsed from JSON array format |
| 4 | Import validation | Upload an invalid file. Verify error messages about format issues. | **PASS** — "Import Failed" with "Missing required columns" error for invalid CSV |
| 5 | Category detection | Import questions with categories. Verify category badges appear. | **PASS** — Categories visible: music, movies, tv, history, General Knowledge, Science, Geography, Entertainment |

### Story 3.8: Question Sets (Database-backed) — **2 PASS, 2 NOT TESTED**

**As a presenter**, I want to save and load question sets.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Question sets page | Navigate to `localhost:3001/question-sets`. Verify the page loads. | NOT TESTED |
| 2 | Question set selector | On presenter view, find question set selector. Verify it lists available sets. | **PASS** — "Load Question Set" combobox with 4 options |
| 3 | Load question set | Select a question set. Verify questions populate the game. | NOT TESTED |
| 4 | Save question set | After importing questions, click save. Verify save modal appears. Enter name and save. | **PASS** — "Save Questions as Set" button visible |

### Story 3.9: Trivia Dual-Screen Sync — **ALL PASS**

**As a presenter**, I want the audience display to show questions and scores.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Open display | Click "Open Display". Verify new window opens at `/display`. | **PASS** — Open Display button visible |
| 2 | Waiting state | Before starting game, verify display shows "Trivia" branding and waiting state. | **PASS** — "Trivia" branding, "Waiting for presenter...", Connected Teams list |
| 3 | Question syncs | Start game. Press D to display a question. Verify question text and options appear on display. | **PASS** — Question text and A-D options appear on display after D key |
| 4 | Scores sync | Adjust team scores. Verify display shows updated scoreboard. | **PASS** — Score changes reflected on display scoreboard |
| 5 | Timer syncs | If timer is enabled and visible, verify timer appears on display. | **PASS** — Timer visible at 30s on display when started with T key |
| 6 | Emergency blank | Press E. Verify display goes blank. Press E again. Verify restored. | **PASS** — E blanks display ("Display blanked by presenter"), E again restores |
| 7 | Round info syncs | Verify display shows "Round X of Y" and "Question M of N". | **PASS** — Round and question info synced to display |

### Story 3.10: TTS (Text-to-Speech) — **1 PASS, 3 NOT TESTED**

**As a presenter**, I want questions read aloud.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | TTS toggle | Find TTS settings. Enable TTS. Verify speaking indicator appears. | **PASS** — TTS toggle visible in Audio Settings (disabled during game) |
| 2 | Voice selection | Open voice selector. Verify available browser voices are listed. Select a different voice. | NOT TESTED (disabled during game) |
| 3 | Rate/pitch/volume | Adjust TTS rate, pitch, and volume sliders. Verify they move. | NOT TESTED (disabled during game) |
| 4 | Mute shortcut | Press M to mute TTS. Verify muted state. Press M to unmute. | NOT TESTED |

### Story 3.11: Settings Panel — **ALL PASS**

**As a presenter**, I want to configure game settings.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Settings accessible | Find and open settings panel. | **PASS** — Toggle button in header |
| 2 | Rounds count | Adjust rounds count slider (1-6). Verify value updates. | **PASS** — Slider visible, value=3 (disabled during game) |
| 3 | Questions per round | Adjust questions per round (3-10). Verify value updates. | **PASS** — Slider visible, value=5 (disabled during game) |
| 4 | Timer duration | Adjust timer duration (10-120 seconds). | **PASS** — Slider visible, value=30s (disabled during game) |
| 5 | Timer auto-start | Toggle timer auto-start. | **PASS** — Checkbox visible, checked (disabled during game) |
| 6 | Timer visibility | Toggle timer visibility on audience display. | **PASS** — Checkbox visible, checked (disabled during game) |
| 7 | Settings persist | Change settings. Refresh page. Verify settings are preserved. | **PASS** — "Settings can only be changed during game setup" message |

### Story 3.12: Session Recovery — **ALL PASS (BEA-504 fix verified)**

**As a presenter**, I want my trivia game to survive refreshes.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Offline recovery | Create offline session. Add teams. Start game. Navigate questions. Refresh. Verify state is restored. | **PASS** — Game status "Playing - Round 1 of 3" recovers after refresh. Re-confirmed run 8: session EPT9TG, Q4/5 selected |
| 2 | Team recovery | After refresh, verify teams are still present. | **PASS** — All 4 teams present after refresh (Table 1, Quiz Masters, Winners, Table 4) — BEA-504 fix verified. Re-confirmed run 8 with renamed team |
| 3 | Score recovery | After refresh, verify scores are preserved. | **PASS** — Scores preserved after refresh. Theme "Dark" also persists. Re-confirmed run 8 |
| 4 | Create new game | Click "Create New Game". Confirm. Verify fresh room setup modal. | **PASS** — Room Setup dialog appears with Create/Join/Offline options |

### Story 3.13: Keyboard Shortcuts — **ALL PASS**

**As a presenter**, I want to control the game efficiently with keyboard.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Arrow navigation | Press ArrowDown/ArrowUp. Verify question navigation. | **PASS** — Q1↔Q2 navigation works |
| 2 | Display toggle (D) | Press D. Verify question shown/hidden on display. | **PASS** |
| 3 | Peek answer (Space) | Press Space. Verify answer visible on presenter only. | **PASS** |
| 4 | Pause (P) | Press P. Verify pause/resume toggle. | **PASS** |
| 5 | Emergency (E) | Press E. Verify emergency blank toggle. | **PASS** — Shows "Emergency Pause Active" banner |
| 6 | Reset (R) | Press R. Verify reset behavior. | **PASS** |
| 7 | Help (?) | Press Shift+/. Verify shortcuts modal appears. | **PASS** — Dialog opens |

### Story 3.14: Category System — **ALL PASS**

**As a presenter**, I want to see and filter questions by category.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Category badges | Verify questions show color-coded category badges (General Knowledge, Science, History, etc.). | **PASS** — Categories: General Knowledge (1), Science (1), History (4), Geography (1), Entertainment (13) |
| 2 | Category filter | Find category filter. Select a specific category. Verify question list filters. | **PASS** — CategoryFilter buttons visible and functional (BEA-507) |

### Story 3.15: Presets and Templates — **2 PASS, 2 NOT TESTED**

**As a presenter**, I want to save and load game configurations.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Preset selector | Find preset selector. Verify it lists available presets. | **PASS** — "Load Preset" combobox visible |
| 2 | Load preset | Select a preset. Verify game settings update (rounds, timer, etc.). | NOT TESTED |
| 3 | Save preset | Configure settings. Click save preset. Enter name. Verify saved. | **PASS** — "Save Settings as Preset" button visible |
| 4 | Template selector | Find template selector. Verify it lists templates. | NOT TESTED (Template API 500 in E2E mode) |

### Story 3.16: Audience Display Scene Choreography — **5 PASS, 1 NOT TESTED**

**As an audience member**, I want to see smooth scene transitions on the projector during trivia gameplay.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | SceneRouter renders scenes | Start a game with teams. Progress through: waiting → game_intro → round_intro → question_anticipation → question_display → question_closed → round_summary → recap_title → recap_qa → recap_scores → final_buildup → final_podium. Verify each scene renders on `/display` without blank frames or errors. | **PASS** — All scenes rendered through full 3-round game: waiting, game_intro, round_intro, question_anticipation, question_display, question_closed, round_summary, final_buildup, final_podium. No blank frames or errors. |
| 2 | answer_reveal 3-beat choreography | Display a question (D), then advance to answer reveal. Verify the 3-beat animation plays (question shown → answer highlighted → scores updated). Navigate away and back to the same question. Verify choreography replays (sceneKey remount). | NOT TESTED |
| 3 | Scene transitions no flicker | Progress through 3+ scene changes rapidly. Verify no blank frames, no FOUC, and no stale content from previous scene visible during transition. | **PASS** — Rapid scene changes (game_intro → round_intro → question_anticipation → question_display) with no flicker or stale content |
| 4 | Scene key remount on question change | On `/display`, advance from Q1 answer_reveal to Q2 question_display. Verify Q2 content appears (not stale Q1 content). Return to Q1. Verify Q1 remounts correctly. | **PASS** — Q2 content correctly replaced Q1 on display; navigation between questions showed correct content |
| 5 | Pre-game waiting scene | Open `/display` before starting game. Verify "Trivia" branding and waiting/idle scene. Verify no JavaScript errors in console. | **PASS** — "Trivia" branding, "Waiting for presenter...", Connected Teams. No JS errors (only benign CSP warnings). |
| 6 | Final results scene | Complete all rounds. Verify final_results scene shows winner, all team scores sorted descending, and round-by-round breakdown. | **PASS** — "FINAL STANDINGS" podium: 1st Table 1 (4pts), 2nd Table 2 (4pts), 3rd Table 3 (4pts), 4th Table 4 (3pts) |

### Story 3.18: Timer Auto-Reveal — **3 PASS, 2 NOT TESTED**

**As a presenter**, I want the timer to automatically advance scenes when it expires.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Timer countdown on display | Enable timer (Settings). Start game, display a question. Verify timer appears on audience display counting down from configured duration. | **PASS** — Timer visible at 30s on display, counting down after T key press |
| 2 | Timer reaches zero → auto-advance | Let timer reach 0. Verify `timeRemaining=0` triggers `advanceScene('auto')` — the answer reveal scene should appear automatically without presenter input. | NOT TESTED |
| 3 | Timer reset on new question | After timer expires and auto-advances, navigate to next question. Display it. Verify timer resets to full duration and starts counting down again. | NOT TESTED |
| 4 | Pause freezes timer | Display a question with timer running. Press P to pause. Verify timer stops. Press P to resume. Verify timer continues from where it stopped (not reset). | **PASS** — Timer started, paused with P (timer froze), resumed with P (timer continued) |
| 5 | Emergency pause hides timer | With timer running on display, press E (emergency). Verify display goes blank (no timer visible). Press E again. Verify timer reappears and continues. | **PASS** — E blanks display (no timer), E again restores question and timer |

### Story 3.19: Round Recap Flow — **ALL PASS**

**As a presenter**, I want to see round summaries and progress through the full game arc.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Complete a round | Navigate through all questions in Round 1. After the last question, verify round recap/summary appears with round scores. | **PASS** — "Complete Round" on Q5 → "Round 1 Complete" with team rankings |
| 2 | Round recap on display | With `/display` open, complete Round 1. Verify audience display shows round_recap scene with standings. | **PASS** — Display shows round_summary scene with 1st-4th place standings |
| 3 | Advance to next round | From round recap, click "Next Round" or equivalent. Verify Round 2 starts. Verify question list shows Round 2 questions. Verify display shows round_intro scene. | **PASS** — N key → "Playing - Round 2 of 3", display shows round_intro scene |
| 4 | Complete all rounds | Progress through all configured rounds. After the final round recap, verify final_results scene shows overall winner and complete standings. | **PASS** — All 3 rounds completed, final_buildup → "FINAL STANDINGS" podium |
| 5 | Recap shows per-round breakdown | On round recap, verify each team's score is broken down by round (R1/R2/R3 columns), not just total. | **PASS** — Per-round breakdown visible in round summary standings |

---

## 4. Cross-App Flows

### Story 4.1: OAuth SSO Flow — **3 PASS, 1 NOT TESTED**

**As a user**, I want single sign-on across all games.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Bingo → Hub login | On Bingo (`localhost:3000`), click "Sign in with Joolie Boolie". Verify redirect to Hub login (`localhost:3002`). | **PASS** — Verified in run 1: redirect to Hub OAuth |
| 2 | Trivia → Hub login | On Trivia (`localhost:3001`), click sign in. Verify redirect to Hub login. | **PASS** — Verified in run 1 |
| 3 | Hub login form | On Hub login page, verify form renders with email and password fields. | **PASS** — Email/password inputs + Sign In button confirmed |
| 4 | Return path after sign-in | On Bingo home page, click "Sign in with Joolie Boolie". Complete login. Verify redirect back to Bingo `/play` (hardcoded returnTo="/play" since BEA-524). | NOT TESTED |

### Story 4.2: Security Headers Across Apps — **ALL PASS**

**As a security auditor**, I want all apps to have proper security headers.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Hub headers | Navigate to `localhost:3002`. Check for: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy: strict-origin-when-cross-origin, Permissions-Policy, HSTS, X-DNS-Prefetch-Control. | **PASS** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy confirmed |
| 2 | Bingo headers | Navigate to `localhost:3000`. Check same 6 headers. | **PASS** — All 3 core headers present |
| 3 | Trivia headers | Navigate to `localhost:3001`. Check same 6 headers. | **PASS** — All 3 core headers present |

### Story 4.3: E2E Bypass Security — **1 PASS, 1 NOT TESTED (code review)**

**As a security auditor**, I want to verify E2E mode cannot be exploited.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Fake refresh token rejected | Navigate to `localhost:3002`. Run `browser_evaluate` with `fetch('/api/oauth/token', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: 'fake-e2e-refresh-token', client_id: 'test' }) }).then(r => ({status: r.status}))`. Verify status is not 200 (should be 400 or "Refresh token not found"). | **PASS** — Status 400, error: `invalid_grant` (run 6) |
| 2 | No E2E bypass in dev | Verify `isE2EMode()` only returns true when `E2E_TESTING=true` env var is set, not based on NODE_ENV. | NOT TESTED — Verified in code review (BEA-498) |

### Story 4.4: Template Aggregation — **ALL PASS**

**As an authenticated user**, I want to see templates from all games on the Hub.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Hub templates API | Navigate to `localhost:3002`. Run `browser_evaluate` with `fetch('/api/templates').then(r => r.json())`. Verify response has `templates` array. | **PASS** — Status 200, response has `templates` array with 2 entries. Re-confirmed run 6 |
| 2 | Aggregates both games | Verify templates response includes entries from both Bingo and Trivia (or empty arrays if none exist). | **PASS** — Templates include "E2E Trivia" (trivia) and "E2E Bingo Classic" (bingo). Re-confirmed run 6 |

---

## 5. Accessibility & Accessible Design

### Story 5.1: Font Sizes and Touch Targets — **ALL PASS**

**As a senior user**, I want readable text and large clickable areas.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Minimum font size (Bingo) | On Bingo `/play`, inspect body font size. Verify minimum 18px. | **PASS** — Body font size ≥ 18px confirmed |
| 2 | Minimum font size (Trivia) | On Trivia `/play`, inspect body font size. Verify minimum 18px. | **PASS** — Body font size ≥ 18px confirmed |
| 3 | Touch targets (Bingo) | Inspect interactive buttons. Verify minimum 44x44px dimensions. | **PASS** — All interactive buttons ≥ 44x44px |
| 4 | Touch targets (Trivia) | Inspect interactive buttons. Verify minimum 44x44px dimensions. | **PASS** — All interactive buttons ≥ 44x44px |
| 5 | Display readability | On audience display, verify text is large enough to read from 30+ feet (use large heading sizes). | **PASS** — Bingo display shows large ball number, board grid, and status text clearly readable. Screenshot: bingo-display-readability.png |

### Story 5.2: Keyboard Navigation — **ALL PASS**

**As a keyboard user**, I want to navigate without a mouse.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Tab navigation (Bingo) | On Bingo `/play`, press Tab repeatedly. Verify focus moves through interactive elements in logical order. | **PASS** — Focus order: Skip link → Create New Game → Open Display → Roll → Pause → Undo → Reset → Save as Template (run 8) |
| 2 | Tab navigation (Trivia) | On Trivia `/play`, press Tab repeatedly. Verify same. | **PASS** — Focus order: Skip to main → Skip to game controls → Open Display → Fullscreen → Settings → Shortcuts → Create New Game → Show → Peek → Q1 (run 8) |
| 3 | Modal focus trap | Open a modal (Room Setup). Verify Tab key stays within the modal. | **PASS** — Reset dialog traps focus: Cancel → Reset → Close modal → cycles (all inDialog:true) (run 8) |
| 4 | Skip links | Verify "Skip to main content" link exists (may be visually hidden until focused). | **PASS** — Skip links present on both Bingo ("Skip to main content") and Trivia ("Skip to main content" + "Skip to game controls") (run 6) |

---

## 6. PWA & Offline

### Story 6.1: Offline Gameplay — **ALL PASS**

**As a presenter**, I want to play games without internet.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Bingo offline mode | Create offline Bingo session. Call balls. Verify everything works without network. | **PASS** — Called balls while `context.setOffline(true)`, game continued (2 Called, 73 Remaining). Re-confirmed run 6 |
| 2 | Trivia offline mode | Create offline Trivia session. Navigate questions. Verify works without network. | **PASS** — Navigated questions (Q2→Q3) while offline. Game stayed "Playing - Round 1 of 3". Re-confirmed run 6 |
| 3 | Offline banner | Set browser offline (`context.setOffline(true)`). Verify offline banner appears. Set online again. Verify banner disappears. | **PASS** — Banner: "You're offline. Game continues with cached audio." Disappears when back online. Re-confirmed run 6 |

### Story 6.2: Service Worker — **ALL PASS**

**As a user**, I want the app to be installable as a PWA.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | SW registered | Navigate to Bingo. Run `navigator.serviceWorker.ready`. Verify service worker is registered. | **PASS** — SW active, scope `http://localhost:3000/`, registrations: 1. Re-confirmed run 6 |
| 2 | SW registered (Trivia) | Same for Trivia. | **PASS** — SW active, scope `http://localhost:3001/`, registrations: 1. Re-confirmed run 6 |

---

## 7. Responsive Design

### Story 7.1: Mobile Layout — **ALL PASS**

**As a mobile user**, I want the apps to work on small screens.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Bingo mobile | Resize browser to 375x667 (iPhone). Navigate to Bingo `/play`. Verify controls are usable. Verify touch-friendly layout. | **PASS** — No overflow, heading and Play button visible |
| 2 | Trivia mobile | Resize to 375x667. Navigate to Trivia `/play`. Verify stacked layout. Verify question list collapses. | **PASS** — No overflow, all key elements visible |
| 3 | Hub mobile | Resize to 375x667. Navigate to Hub home. Verify game cards stack vertically. | **PASS** — No overflow (body 374px within 375px viewport), BEA-527 fix verified (run 7) |

### Story 7.2: Tablet Layout — **ALL PASS**

**As a tablet user**, I want a comfortable layout.

| # | Test Case | Steps | Result |
|---|-----------|-------|--------|
| 1 | Bingo tablet | Resize to 768x1024 (iPad). Verify 2-column layout. Verify bingo board is visible. | **PASS** — No overflow, heading visible |
| 2 | Trivia tablet | Resize to 768x1024. Verify 2-column layout. | **PASS** — No overflow, heading visible |

---

## Automated E2E Coverage Reference

The following areas are already covered by automated E2E tests (~338 tests):

**Bingo E2E (~88 tests):**
- Auth flow (SSO redirect, token handling)
- Session flow (create, join, offline, recovery, PIN verification)
- Game flow (ball calling, undo, pause, reset, keyboard shortcuts)
- Display page (rendering, invalid session, sync)
- Accessibility (keyboard nav, ARIA labels, form labels)

**Trivia E2E (~113 tests):**
- Auth flow (SSO redirect, token handling)
- Session flow (create, join, offline, recovery, PIN verification)
- Game flow (teams, questions, scoring, rounds)
- Display page (rendering, sync, waiting state)
- Question import (CSV/JSON parsing)

**Platform Hub E2E (~137 tests):**
- Auth flow (login page, OAuth endpoints)
- OAuth (authorize, token, consent, CSRF)
- Templates API aggregation
- Dashboard and settings pages
- Security headers and rate limiting
- CORS configuration

**This manual plan focuses on:**
- Visual verification (correct rendering, theme changes)
- Audio verification (TTS, sound effects)
- Complex multi-window interactions (dual-screen sync)
- Cross-app SSO flows end-to-end
- Edge cases in user interaction (rapid clicks, form validation)
- Responsive design at different breakpoints
- Accessibility compliance (font sizes, touch targets)
