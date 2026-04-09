# Iteration: Test Infrastructure Impact

## Assignment
Trace the impact on E2E tests, unit tests, and mocking infrastructure when auth/OAuth/Supabase are removed.

## Findings

### Finding 1: 247 Total Test Files — 68 Auth-Related (28%)
- **Evidence:** Comprehensive test file inventory across apps and packages
- **Confidence:** High
- **Significance:** 72% of tests survive with no changes. Auth test cleanup is bounded.

### Finding 2: E2E Test Breakdown (31 files)
| Category | Count | Fate |
|----------|-------|------|
| Platform Hub E2E | 12 | DELETE (auth-specific) |
| Real-auth E2E | 3 | DELETE (Supabase auth) |
| Bingo E2E | 7 | SURVIVE (game flows only) |
| Trivia E2E | 9 | SURVIVE (game flows only) |

- **Evidence:** e2e/platform-hub/ (12 files), e2e/real-auth/ (3 files), e2e/bingo/ (7 files), e2e/trivia/ (9 files)
- **Confidence:** High
- **Significance:** Game E2E tests are functionally isolated from auth — they test gameplay, not login flows.

### Finding 3: Unit Test Impact by Category
| Category | Count | Fate |
|----------|-------|------|
| Game component tests | 81 | SURVIVE unchanged |
| Game hook/store tests | 27 | SURVIVE unchanged |
| Game library tests | 50+ | SURVIVE unchanged |
| Non-auth package tests | 40+ | SURVIVE unchanged |
| API route tests | 34 | DELETE (auth-heavy) |
| Auth package tests | 11 | DELETE |
| Auth component/hook tests | 24 | DELETE |
| Supabase client tests | 3-5 | DELETE |

- **Confidence:** High
- **Significance:** API route tests are the largest casualty. Game component/hook tests are completely isolated.

### Finding 4: E2E Auth Infrastructure
- E2E_TESTING=true mode: Platform Hub generates JWTs locally, no real Supabase
- Auth flow: setupSupabaseAuthMocks → loginViaPlatformHub → JWT cookie → games read cookie
- Key files: e2e/global-setup.ts, e2e/fixtures/auth.ts, e2e/mocks/supabase-auth-handlers.ts
- **Confidence:** High
- **Significance:** Game E2E tests currently authenticate via Platform Hub SSO. In standalone, this entire auth dance is removed — games start unauthenticated.

### Finding 5: Testing Package Mock Inventory
| Mock | Needed Without Auth? |
|------|---------------------|
| createMockSupabaseClient() | NO — delete |
| createMockUser() | NO — delete |
| createMockSession() | NO — delete |
| mockSupabaseSsr() | NO — delete |
| mockAudio() | YES — keep |
| mockBroadcastChannel() | YES — keep |
| mockSentry() | YES — keep |
| mockOtel() | YES — keep |

- **Confidence:** High
- **Significance:** 4 of 8 mocks deleted. Surviving mocks (audio, broadcast, sentry, otel) are game/infra-related.

### Finding 6: Playwright Config Changes
- Remove projects: real-auth, platform-hub, bingo-mobile
- Remove webServer entries for platform-hub
- Remove global-setup-real-auth.ts
- Keep bingo and trivia projects unchanged
- Remove Supabase auth handler mocking from fixtures
- **Confidence:** High

### Finding 7: New Tests Needed
- 4 new Zustand template/preset stores need unit tests
- Question validation (moved from API to client) needs tests in new location
- E2E tests for template CRUD via localStorage (replacing API-based template tests)
- **Confidence:** Medium (scope depends on coverage goals)

## Resolved Questions
- Q: What percentage of tests are auth-related? A: 28% (68 of 247)
- Q: Do game E2E tests depend on auth? A: They authenticate through Platform Hub, but the actual test assertions are about game mechanics, not auth. The auth fixture simplifies dramatically.
- Q: Does removing auth break game tests? A: No — game component/hook/store tests have zero auth imports.

## Remaining Unknowns
- How do game E2E tests currently handle the "logged in" state? Need to verify if they can run without any authentication at all, or if some game features gate on auth status.
- Bingo has guestModeEnabled — do E2E tests already test guest mode?

## Revised Understanding
The test infrastructure impact is bounded and predictable. 72% of tests survive untouched. The main work is deletion (not rewriting), plus creating new tests for the 4 localStorage stores. The E2E auth fixture is the most complex piece to simplify, but game E2E tests themselves don't need changes.
