# Iteration 2: Prose Documentation Rewrite Spec

**Audit head:** `a7369f16` (2026-04-13)
**Scope:** The 4 drift hotspots Phase 1 Area 2 identified — `docs/E2E_TESTING_GUIDE.md`, `apps/trivia/README.md`, `docs/templates/APP_README_TEMPLATE.md`, `docs/adr/ADR-001-e2e-hash-port-isolation.md`.
**Methodology:** Each disposition is grounded in a `file:line` or `git ls-files` probe. All source truth verified against HEAD on 2026-04-13.
**Provenance:** All cited files carry `[tracked-HEAD]` unless otherwise noted.

---

## Target 1: `docs/E2E_TESTING_GUIDE.md`

Source-truth probes run for this target (all `[tracked-HEAD]`):

- `git ls-files e2e/` — 22 tracked files; no `e2e/bingo/room-setup.spec.ts`, no `e2e/fixtures/auth.ts`. Tracked specs under `e2e/bingo/`: `accessibility, display, dual-screen, health, home, keyboard, presenter`. Tracked fixtures: only `e2e/fixtures/game.ts`.
- `grep "^export" e2e/utils/helpers.ts` — 19 exports: `waitForHydration`, `waitForText`, `waitForSyncConnection`, `openDisplayWindow`, `clickButton`, `getCurrentBallText`, `extractSessionId`, `navigateTo`, `hasFocus`, `pressKey`, `getTextContent`, `checkBasicA11y`, `scrollIntoView`, `waitForElementCount`, `getAllVisibleText`, `waitForDualScreenSync`, `waitForCondition`, `waitForDisplayBallCount`, `dismissAudioUnlockOverlay`, `startGameViaWizard`, `waitForSyncedContent`. **No `waitForRoomSetupModal`.**
- `rg "offline-session-id|online-room-code|room-pin-display|game-card-bingo|game-card-trivia|pattern-preview"` under `apps/` — **zero matches**. The one `current-ball` hit is a class-name regex in `e2e/bingo/accessibility.spec.ts:269`, not a `data-testid`.
- `rg "RoomStatus|GameSelector|PatternSelector|BallDisplay"` under `apps/` — `PatternSelector.tsx` and `BallDisplay.tsx` exist in `apps/bingo/src/components/presenter/`, but `RoomStatus` and `GameSelector` are unresolved (not tracked). `BallDisplay.tsx:52,147,152` uses `ball-display-${label}`, `balls-called-count`, `balls-remaining-count` — none of the testids the guide lists.
- `e2e/global-setup.ts` is 33 lines and calls only `waitForServers` on ports — no env-var validation, so the "Missing required environment variables" failure mode the guide documents cannot be produced.
- `scripts/setup-worktree-e2e.sh` exists `[tracked-HEAD]`.

### Section Disposition Table

Headings indexed by `##` level (primary sections) and `###` sub-sections where the disposition differs from the parent.

| Section | Line range | Disposition | Rationale |
|---|---|---|---|
| `## ⚠️ CRITICAL: Pre-Commit Requirements` | 3-9 | KEEP | Still accurate; roots CLAUDE.md:21 corroborates. See Phase 1 open Q about Actions state; treat as out-of-scope for this iterator. |
| `## Quick Start` (umbrella) | 11-81 | KEEP (with 1 line fix in child example) | The surrounding narrative about prod-build vs. dev-server mode is accurate against `scripts/e2e-with-build.sh` and `package.json` scripts (`test:e2e`, `test:e2e:dev`). |
| `### Prerequisites` | 13-23 | KEEP | Line 20 `THE_TRIVIA_API_KEY` is the single real env var; line 23 "no E2E_JWT_SECRET consumer" matches source. |
| `### Running E2E Tests` | 25-81 | REWRITE (line 36 + 380 example) | Replace `e2e/bingo/room-setup.spec.ts` in BOTH the example block and the worktree parallel-testing block with a spec that exists. |
| `## Anti-Pattern: Fixed Timeouts (waitForTimeout)` | 82-138 | KEEP | Guidance is framework-correct, still best-practice. No stale refs. |
| `## Quick Reference for Test Authors` | 142-195 | REWRITE (table at 186-193) | Prose at 144-184 is already BEA-714-accurate (describes `bingoPage`, `triviaPage`, `triviaPageWithQuestions`, `triviaGameStarted`). The `Key Imports` table at 186-193 still contains `waitForRoomSetupModal`, which has no export. |
| `### Understanding Test Results` | 197-234 | KEEP | `pnpm test:e2e:summary` exists; `test-results/` layout unchanged. |
| `## Production Build Testing` | 238-277 | KEEP | Narrative about service-worker-requires-prod is still valid against Serwist + `apps/*/src/sw.ts`. |
| `## Common Issues` umbrella | 280-301 | partial |  |
| `### Issue: "Missing environment variables"` | 282-292 | DELETE | `e2e/global-setup.ts` cannot produce this symptom; `cp apps/bingo/.env.local .env` is misdirection. |
| `### Issue: "page.reload: net::ERR_INTERNET_DISCONNECTED"` | 294-300 | KEEP | Accurate description of PWA dev-mode limitation. |
| `## Integration with Parallel Workflow` | 304-343 | KEEP | Refs `Skill(subagent-workflow)`, matches root CLAUDE.md. |
| `### Parallel Task Execution with Port Isolation` | 344-402 | REWRITE (line 380 example) | Replace the `e2e/bingo/room-setup.spec.ts` example with a spec that exists. |
| `## E2E Test Checklist (Mandatory)` | 406-418 | KEEP | |
| `## Writing New E2E Tests` | 422-474 | REWRITE (table at 464-472) | Delete the entire `data-testid` reference table — zero of the 7 selectors match source. Replace with a pointer to the real data-testid inventory. |
| `### Best Practices` | 448-456 | KEEP | Framework guidance, still correct. |
| `## Debugging Failed Tests` | 478-517 | KEEP | CLI invocations (`--headed`, `--ui`) are real Playwright flags. |
| `## CI/CD Without GitHub Actions` | 521-536 | KEEP | Flagged in Phase 1 as borderline but out of this iterator's scope (open Q 1 for Area 5). |
| `## Port Reference` | 539-586 | KEEP | Matches `e2e/utils/port-config.ts:19-157` exactly: default 3000/3001, 333-worktree capacity, SHA-256 hash of worktree path % 333 * 3. |

### REWRITE Blocks (with proposed text)

#### Rewrite 1.A — Replace stale spec-file example at line 36

**Current (`docs/E2E_TESTING_GUIDE.md:31-44`):**

```markdown
```bash
# Run all tests (builds apps automatically)
pnpm test:e2e

# Run specific tests
pnpm test:e2e e2e/bingo/room-setup.spec.ts
pnpm test:e2e --grep @critical

# Run with browser UI visible
pnpm test:e2e --headed

# View test results summary
pnpm test:e2e:summary
```
```

**Proposed replacement:**

```markdown
```bash
# Run all tests (builds apps automatically)
pnpm test:e2e

# Run a specific spec by path (any tracked file under e2e/)
pnpm test:e2e e2e/bingo/home.spec.ts
pnpm test:e2e e2e/trivia/setup-overlay.spec.ts

# Filter by tag (e.g. @critical) or a project slice
pnpm test:e2e --grep @critical
pnpm test:e2e --project=bingo

# Run with browser UI visible
pnpm test:e2e --headed

# View test results summary
pnpm test:e2e:summary
```
```

Source checks: `e2e/bingo/home.spec.ts` and `e2e/trivia/setup-overlay.spec.ts` both exist `[tracked-HEAD]`; `--project=bingo` / `--project=trivia` are configured projects per `playwright.config.ts` (can confirm later in Phase 2 synthesis, but naming convention is visible via `test:e2e:bingo` / `test:e2e:trivia` scripts in root `package.json`).

#### Rewrite 1.B — Replace `Key Imports` table at lines 186-193

**Current:**

```markdown
### Key Imports

| Import | Use For |
|--------|---------|
| `test` from `fixtures/game` | Tests that need a navigated game page |
| `test` from `@playwright/test` | Tests that do NOT need page setup |
| `waitForHydration` from `utils/helpers` | Waiting for React hydration |
| `waitForRoomSetupModal` from `utils/helpers` | Waiting for modal after session recovery |
| `waitForSyncedContent` from `utils/helpers` | Dual-screen sync verification |
```

**Proposed replacement:**

```markdown
### Key Imports

Fixtures live in `e2e/fixtures/game.ts`. Helpers live in `e2e/utils/helpers.ts`.
Import the Trivia question seed builder from `e2e/utils/trivia-fixtures.ts` if you
write a spec that needs to stub `window.__triviaE2EQuestions` manually.

| Import | Source | Use For |
|--------|--------|---------|
| `test`, `expect` | `../fixtures/game` | Specs that need a navigated game page (Bingo or Trivia) |
| `test` | `@playwright/test` | Specs that do NOT need page setup (e.g. health specs) |
| `waitForHydration` | `../utils/helpers` | Gating on `<main>` having a visible child after navigation |
| `waitForSyncedContent` | `../utils/helpers` | Dual-screen sync — verifies content appears on the display page |
| `waitForDualScreenSync` | `../utils/helpers` | Checks the sync-indicator dot is visible on presenter/display |
| `waitForDisplayBallCount` | `../utils/helpers` | Bingo: waits for `data-testid="balls-called-count"` to reach N |
| `dismissAudioUnlockOverlay` | `../utils/helpers` | Bingo display: dismisses the click-to-activate audio overlay |
| `startGameViaWizard` | `../utils/helpers` | Trivia: drives the SetupGate wizard to completion |
| `openDisplayWindow` | `../utils/helpers` | Opens the display popup from a presenter page |
```

Source checks: every export in the proposed table is present in `e2e/utils/helpers.ts` (verified via `grep "^export" e2e/utils/helpers.ts`). `waitForRoomSetupModal` is removed because no such export exists.

#### Rewrite 1.C — Delete the "Missing environment variables" troubleshooting block (lines 282-292)

**Current:**

```markdown
### Issue: "Missing environment variables"

**Symptom**: Global setup fails with "Missing required environment variables"

**Cause**: Missing `.env` file in project root

**Fix**:
```bash
# Create .env in project root
cp apps/bingo/.env.local .env
```
```

**Disposition:** DELETE entirely. The current `e2e/global-setup.ts:11-30` does not validate env vars — it only waits for servers on configured ports. The guide should not document a failure mode the code cannot produce.

**Replacement (optional):** if a substitute is preferred, add:

```markdown
### Issue: "E2E Setup] Servers did not become ready"

**Symptom**: `e2e/global-setup.ts` logs `[E2E Setup] Checking server health...` and then times out waiting for `http://localhost:<bingoPort>` / `http://localhost:<triviaPort>`.

**Cause**: Bingo or Trivia dev/prod server is not running (or is running on a different port — likely when you are inside a worktree).

**Fix**:
```bash
# Confirm the ports Playwright expects
pnpm test:e2e  # the config logs the effective port config on startup

# Verify the servers are listening on those ports
curl -I http://localhost:3000
curl -I http://localhost:3001
```
```

Source check: `e2e/global-setup.ts:23-26` shows `waitForServers` is the only gating call; `e2e/helpers/wait-for-server.ts` is the timeout path.

#### Rewrite 1.D — Replace `e2e/bingo/room-setup.spec.ts` at line 380 with a real spec

**Current:**

```markdown
# Worktree A: Agent fixing BEA-334 (gets ports like 3156, 3157)
cd .worktrees/wt-BEA-334
source .env.e2e  # If setup script was run
./start-e2e-servers.sh
pnpm test:e2e e2e/bingo/room-setup.spec.ts

# Worktree B: Agent fixing BEA-335 (gets different ports like 3279, 3280)
cd .worktrees/wt-BEA-335
source .env.e2e
./start-e2e-servers.sh
pnpm test:e2e e2e/trivia/other-feature.spec.ts
```

**Proposed replacement:**

```markdown
# Worktree A: Agent fixing BEA-334 (gets ports like 3156, 3157)
cd .worktrees/wt-BEA-334
source .env.e2e  # If setup script was run
./start-e2e-servers.sh
pnpm test:e2e e2e/bingo/home.spec.ts

# Worktree B: Agent fixing BEA-335 (gets different ports like 3279, 3280)
cd .worktrees/wt-BEA-335
source .env.e2e
./start-e2e-servers.sh
pnpm test:e2e e2e/trivia/setup-overlay.spec.ts
```

#### Rewrite 1.E — Replace the data-testid table at lines 464-474

**Current:**

```markdown
### Using data-testid Attributes

Use data-testid when semantic selectors are inadequate:
- No semantic role exists
- DOM structure is complex
- Need to distinguish similar elements

| Component | data-testid | Purpose |
|-----------|-------------|---------|
| RoomStatus | offline-session-id | Offline session ID display |
| RoomStatus | online-room-code | Online room code display |
| RoomStatus | room-pin-display | PIN display |
| GameSelector | game-card-bingo | Bingo card |
| GameSelector | game-card-trivia | Trivia card |
| PatternSelector | pattern-preview | Pattern preview |
| BallDisplay | current-ball | Current ball |

**Reference:** See BEA-394 for full refactoring.
```

**Proposed replacement:**

```markdown
### Using data-testid Attributes

Use `data-testid` when semantic selectors (`getByRole`, `getByLabel`, `getByText`)
are inadequate:

- No semantic role exists (custom decorative containers)
- DOM structure is complex (nested variants of the same accessible name)
- You need to distinguish visually-identical elements

**Source-of-truth pattern:** authored testids live on the component that renders
them. Grep `apps/bingo/src` and `apps/trivia/src` for `data-testid=` to find the
current list. The selectors most often used by live E2E specs at HEAD are:

| Where rendered | data-testid | Purpose |
|----------------|-------------|---------|
| `apps/bingo/src/app/play/page.tsx` | `audio-output-indicator` | Bingo presenter: audio output chip |
| `apps/bingo/src/app/play/page.tsx` | `sync-indicator` | Bingo presenter: sync-indicator wrapper |
| `apps/bingo/src/app/play/page.tsx` | `current-ball-section` | Bingo presenter: ball-display region |
| `apps/bingo/src/components/presenter/BallDisplay.tsx` | `ball-display-${ball.label}` | Bingo: per-ball container (e.g. `ball-display-B-7`) |
| `apps/bingo/src/components/presenter/BallDisplay.tsx` | `balls-called-count` | Bingo: presenter/display ball count |
| `apps/bingo/src/components/presenter/BallDisplay.tsx` | `balls-remaining-count` | Bingo: remaining count |
| `apps/bingo/src/components/audience/AudienceBingoBoard.tsx` | `called-numbers-board` | Bingo display: full called-board |
| `apps/bingo/src/components/audience/BallsCalledCounter.tsx` | `balls-called` / `balls-called-count` | Bingo display: counter widget |
| `apps/bingo/src/components/audience/BallsCalledCounter.tsx` | `balls-remaining` / `balls-remaining-count` | Bingo display: remaining counter |
| `apps/bingo/src/app/display/page.tsx` | `audio-unlock-overlay` | Bingo display: click-to-activate overlay |
| `apps/trivia/src/components/presenter/SetupGate.tsx` | `setup-gate`, `setup-gate-header`, `setup-gate-content`, `setup-gate-connection`, `setup-gate-open-display` | Trivia setup overlay |
| `apps/trivia/src/components/presenter/SetupWizard.tsx` | `wizard-step-${index}` | Trivia setup wizard step buttons |
| `apps/trivia/src/components/presenter/WizardStepReview.tsx` | `wizard-step-review`, `review-edit-questions`, `review-edit-settings`, `review-edit-teams` | Trivia review step |
| `apps/trivia/src/components/presenter/SceneNavButtons.tsx` | `nav-back`, `nav-forward` | Trivia scene navigation |

This table enumerates the testids actually referenced by E2E specs at HEAD. If
you add a new testid, prefer a stable semantic name (component-scoped), record
it on the component that renders it, and add a grep-friendly constant if the
value is computed (see `ball-display-${ball.label}`).
```

Source checks: every entry was verified via `rg "data-testid="` across `apps/`. The original table's 7 rows were **all unresolved** against source.

### Cross-reference Verification (only items that survive the edits above)

| Claim in remaining guide prose | Source file | Line | Matches? |
|---|---|---|---|
| `fixtures/game` exports `bingoPage`, `triviaPage`, `triviaPageWithQuestions`, `triviaGameStarted` | `e2e/fixtures/game.ts` | 56-91, 117-188 | Yes |
| `e2e/fixtures/game.ts` is the only fixture file | `git ls-files e2e/fixtures/` | — | Yes |
| `waitForHydration`, `waitForSyncedContent` exist in `utils/helpers` | `e2e/utils/helpers.ts` | 20, 440 | Yes |
| `pnpm test:e2e:summary` script parses `test-results/results.json` | root `package.json` + `scripts/test-summary.js` | — | Exists (script referenced; Phase 2 Area 5 can spot-verify CLI text) |
| `scripts/setup-worktree-e2e.sh` generates `.env.e2e` with port assignments | `scripts/setup-worktree-e2e.sh` | — | File exists |
| Port range 3000-3999, 333 concurrent worktrees | `e2e/utils/port-config.ts:95,99-102` | — | Yes — `hashInt % 333`, multiply by 3, range 3000-3996 |
| Default ports 3000 bingo / 3001 trivia | `e2e/utils/port-config.ts:110-111` | — | Yes |
| `E2E_PORT_BASE`, `E2E_BINGO_PORT`, `E2E_TRIVIA_PORT` env overrides | `e2e/utils/port-config.ts:114-116, 121-131` | — | Yes |
| Service workers don't register in dev mode (Serwist) | `apps/*/src/sw.ts` + Serwist config | — | Known Serwist behavior; already reflected elsewhere in docs. |
| `GitHub Actions are disabled` framing | `CLAUDE.md:21` | — | Corroborated by project instructions; live-state verification is out of scope here (Area 5 open question). |

---

## Target 2: `apps/trivia/README.md`

Source-truth probes (all `[tracked-HEAD]`):

- `ls apps/trivia/src/app/` — dirs present: `api`, `display`, `play`, `serwist`; files: `error.tsx`, `global-error.tsx`, `globals.css`, `icon.tsx`, `layout.tsx`, `not-found.tsx`, `page.tsx`, `sw.ts`. **No `question-sets` dir.**
- `rg "NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_FEATURE_QUESTION_SETS" apps/trivia/src` — **zero matches.**
- `rg "process\.env\." apps/trivia/src` — the only app env vars with consumers are `THE_TRIVIA_API_KEY` (`lib/trivia-api/client.ts:200`, `lib/env-validation.ts:16`), `OTEL_EXPORTER_OTLP_ENDPOINT`/`OTEL_EXPORTER_OTLP_HEADERS` (`instrumentation.ts:7,14-21`), `SENTRY_DSN` (`instrumentation.ts:33`), `NODE_ENV` (`hooks/use-sync.ts:33`, `lib/game/helpers.ts:14`), `E2E_TESTING` (`hooks/use-sync.ts:33`, `instrumentation.ts:33`), `NEXT_RUNTIME` (`instrumentation.ts:6,40`).
- `NEXT_PUBLIC_FARO_URL` — referenced only in `apps/trivia/.env.example:29` and `apps/trivia/README.md:119`; no in-tree TS consumer under `apps/trivia/src`. (It is consumed by the bingo/trivia `error-tracking`/Faro bootstrap in `packages/error-tracking` per MEMORY.md's Turbo passthrough note, but a deeper trace is out of scope for this iterator.)
- `apps/trivia/.env.example:17` keeps `# NEXT_PUBLIC_FEATURE_QUESTION_SETS=true` as a commented-out line — this is an on-disk stale commented example, tracked `[tracked-HEAD]`, flagged as drift in Phase 1 Area 5 Finding 5.1 and not in this iterator's scope to rewrite, but the README should stop referencing it regardless.
- `apps/trivia/package.json`: `next` pin is `^16.2.3`, `react` is `19.2.3`, `tailwindcss` is `^4`, `zustand` is `^5.0.10`, `vitest` is `^4.0.17`, `serwist` is `^9.5.0`.

### Section Disposition Table

| Section | Line range | Disposition | Rationale |
|---|---|---|---|
| `# Trivia` + status blurb | 1-5 | KEEP | Brand-clean, accurate. |
| `## Features` | 7-22 | REWRITE | Line 14 (`Question Sets` bullet) is for a deleted feature (PR #517). The remainder is accurate. |
| `## Quick Start` | 23-53 | KEEP | `pnpm dev:trivia`, port 3001, pnpm 9.15+, Node 18+ all match `package.json`. |
| `### Key Routes` | 55-61 | REWRITE | Delete line 61 (`/question-sets`). Remaining routes (`/`, `/play`, `/display`) match source. |
| `### First-Time Setup` | 63-70 | KEEP | All 5 steps are accurate. |
| `## Architecture` → `### Tech Stack` | 71-82 | KEEP | Table matches `apps/trivia/package.json` major versions. |
| `### State Management` | 83-99 | KEEP | Matches `lib/game/engine.ts`, `stores/game-store.ts`, `hooks/use-game.ts`, `hooks/use-game-keyboard.ts`. |
| `### Dual-Screen Sync` | 101-109 | KEEP | Matches `@hosted-game-night/sync` + `hooks/use-sync.ts`. |
| `## Environment Variables` | 110-122 | REWRITE | Line 116 (`NEXT_PUBLIC_APP_URL`) claims Yes/required with zero consumer. Line 118 (`NEXT_PUBLIC_FEATURE_QUESTION_SETS`) is a phantom flag. Line 119 (`NEXT_PUBLIC_FARO_URL`) is optional and has an upstream consumer in packages — keep. |
| `## Development Workflow` → `### Running Tests` | 123-134 | KEEP | `pnpm test`, `test:run`, `test:coverage` all match `apps/trivia/package.json` scripts. |
| `### Keyboard Shortcuts` | 136-150 | REWRITE | The shortcut table at 138-149 is a **subset** of the real table in `apps/trivia/CLAUDE.md` (visible in the session-reminder CLAUDE.md). It omits Arrow Left/Right, N (next round), S (close question), Enter, 1-9/0 (quick score), Shift+1-9, Ctrl/Cmd+Z, `?` (help). Prefer delegating to CLAUDE.md rather than re-maintaining. |
| `## Shared Packages` | 152-163 | KEEP | 8 of 8 packages match `packages/` directory listing. |
| `## Known Issues & Limitations` | 165-167 | KEEP | Safari TTS is a real known limitation. |
| `## Future Work` | 169-172 | REWRITE | Line 171 `Pattern editor` is not a trivia concern (Phase 1 Finding 2 Surprise #5 flagged this as a copy-paste from bingo). |
| `## Design Requirements` | 174-179 | KEEP | Accessibility requirements match root + bingo. |
| `## Related Documentation` | 181-184 | KEEP | Paths resolve. |
| `## Contributing` | 186-188 | KEEP | Points to root README + CLAUDE.md. |

### REWRITE Blocks (with proposed text)

#### Rewrite 2.A — Features list (line 14 deletion)

**Current line 14:**

```markdown
- **Question Sets** - Import, organize, and manage question libraries (localStorage)
```

**Disposition:** DELETE line 14.

**Context after deletion** (lines 13-15 become):

```markdown
- **Question Display** - Toggle question visibility on audience display, peek answers locally
- **Question Import** - JSON import with drag-drop UI, plus Trivia API integration
- **Round Progression** - Multi-round gameplay with round completion and winner tracking
```

Source check: `apps/trivia/src/app/question-sets` does not exist. PR #517 (commit `a4be900e`) removed the feature; questions now load directly into the game via the importer, which is what the surviving `Question Import` bullet already describes.

#### Rewrite 2.B — Key Routes (line 61 deletion)

**Current lines 56-62:**

```markdown
### Key Routes

- **`/`** - Home page
- **`/play`** - Presenter view (question list, team manager, scoring, controls)
- **`/display`** - Audience view (large question display, scoreboard, waiting screen)
- **`/question-sets`** - Question set management
```

**Proposed replacement:**

```markdown
### Key Routes

- **`/`** - Home page (links to `/play` and `/display`)
- **`/play`** - Presenter view (question list, team manager, scoring, controls)
- **`/display`** - Audience view (large question display, scoreboard, waiting screen)

The app also exposes a minimal API surface under `/api/` (CSP reports, the
Sentry/OTel monitoring tunnel, and the Trivia API proxy); see
[`CLAUDE.md`](./CLAUDE.md) for the full route table.
```

Source check: `apps/trivia/src/app/api/` contains only `csp-report`, `health`, `monitoring-tunnel`, `trivia-api` — documented in the app's `CLAUDE.md`.

#### Rewrite 2.C — Environment Variables (lines 110-122)

**Current:**

```markdown
## Environment Variables

Create `.env.local` in `apps/trivia`:

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Yes | App URL (default: `http://localhost:3001`) |
| `THE_TRIVIA_API_KEY` | For API | Key for The Trivia API (free at https://the-trivia-api.com) |
| `NEXT_PUBLIC_FEATURE_QUESTION_SETS` | No | Set to `'false'` to disable question sets (default: enabled) |
| `NEXT_PUBLIC_FARO_URL` | No | Grafana Faro collector URL for frontend observability |

No auth or database env vars are needed. The app runs standalone with localStorage-only persistence.
```

**Proposed replacement:**

```markdown
## Environment Variables

Create `.env.local` in `apps/trivia` (all values optional for local dev; only
`THE_TRIVIA_API_KEY` is required to use the Trivia API importer):

| Variable | Required | Description |
|----------|----------|-------------|
| `THE_TRIVIA_API_KEY` | For Trivia API importer | Server-side key for The Trivia API proxy. Read in `src/lib/trivia-api/client.ts` and `src/lib/env-validation.ts`. Get a free key at https://the-trivia-api.com. |
| `NEXT_PUBLIC_FARO_URL` | Optional | Grafana Faro collector URL for frontend observability (RUM). Left unset in local dev. |
| `SENTRY_DSN` | Optional | Sentry DSN for server-side error reporting. Read by `src/instrumentation.ts`. |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | Optional | OpenTelemetry collector endpoint. Read by `src/instrumentation.ts`. |
| `OTEL_EXPORTER_OTLP_HEADERS` | Optional | Comma-separated `k=v` pairs appended as OTLP request headers. |

No auth or database env vars are needed. The app runs standalone with
localStorage-only persistence.

**Not currently consumed by `apps/trivia/src` at HEAD:** `NEXT_PUBLIC_APP_URL`
and `NEXT_PUBLIC_FEATURE_QUESTION_SETS` appear in `apps/trivia/.env.example`
but have no source consumer — they are leftover from the pre-standalone era
(Question Sets feature was removed in PR #517). Safe to omit.
```

Source checks: all five "Required / Optional" rows grounded in `rg "process\.env\." apps/trivia/src` output above; the "Not currently consumed" caveat matches Finding 2.7 and the empty-result grep for those two env names.

#### Rewrite 2.D — Keyboard Shortcuts (replace sub-table with pointer)

**Current lines 136-150:**

```markdown
### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **Arrow Up/Down** | Navigate questions |
| **Space** | Toggle display question on audience |
| **P** | Peek answer (local only) |
| **E** | Emergency blank (blanks audience display) |
| **R** | New game (with confirmation) |
| **M** | Mute/unmute TTS |
| **N** | Next round |
| **T** | Start timer / Toggle scoreboard |
| **F** | Toggle fullscreen |

**Implementation:** `hooks/use-game-keyboard.ts`
```

**Proposed replacement:**

```markdown
### Keyboard Shortcuts

The authoritative keyboard shortcut table lives in
[`CLAUDE.md`](./CLAUDE.md#keyboard-shortcuts) — it is maintained alongside
`hooks/use-game-keyboard.ts` and includes context-sensitive bindings for the
between-rounds flow (recap scenes, round scoring, final podium) plus the
Shift/Ctrl/Cmd modifier variants.

**Implementation:** `hooks/use-game-keyboard.ts`. When the handler changes,
update the CLAUDE.md table per the `Update Triggers` section at the bottom of
that file.
```

Source check: `apps/trivia/CLAUDE.md` (seen in this session's context) contains the full 19-row shortcut table with context column and modifier keys. The README's table omits 10+ bindings including `Arrow Left/Right`, `S`, `Enter`, `1-9/0`, `Shift+1-9`, `Ctrl/Cmd+Z`, `?`. Deferring avoids divergence.

#### Rewrite 2.E — Future Work (line 171 fix)

**Current:**

```markdown
## Future Work

- [ ] Pattern editor
- [ ] Analytics/history tracking
```

**Proposed replacement:**

```markdown
## Future Work

- [ ] Analytics/history tracking
```

Source check: `Pattern editor` is a bingo concept (29 patterns, `apps/bingo/src/lib/game/patterns/`). Trivia has no pattern concept — `git ls-files apps/trivia/src | grep -i pattern` returns nothing. Matches Phase 1 Area 2 Surprise #5 (copy-paste from bingo README).

### Cross-reference Verification (survivors)

| Claim | Source | Line | Matches? |
|---|---|---|---|
| Next.js 16 (App Router) | `apps/trivia/package.json` | 31 | Yes (`^16.2.3`) |
| React 19 + Tailwind CSS 4 | `apps/trivia/package.json` | 32-33, devDep `tailwindcss: ^4` | Yes |
| Zustand 5 (localStorage) | `apps/trivia/package.json` | 38 (`^5.0.10`) | Yes |
| Vitest 4 | `apps/trivia/package.json` devDep `vitest: ^4.0.17` | — | Yes |
| Serwist (Service Worker) | `apps/trivia/package.json` | 34 (`^9.5.0`) | Yes |
| `/play` and `/display` routes | `apps/trivia/src/app/play/page.tsx`, `apps/trivia/src/app/display/...` | — | Yes |
| `lib/game/engine.ts` exists | tracked file | — | Yes (per CLAUDE.md + source ref in-session) |
| `stores/game-store.ts`, `hooks/use-game.ts`, `hooks/use-game-keyboard.ts` | tracked files | — | Yes |
| `@hosted-game-night/sync`, `/ui`, `/theme`, `/game-stats`, `/testing`, `/types`, `/audio`, `/error-tracking` | `packages/` | — | 8/8 dirs present |

---

## Target 3: `docs/templates/APP_README_TEMPLATE.md`

Source-truth probes:

- `ls packages/` returns 8 dirs: `audio`, `error-tracking`, `game-stats`, `sync`, `testing`, `theme`, `types`, `ui`. **No `database`, no `auth`.**
- `rg "SESSION_TOKEN_SECRET|SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY"` across the repo — tracked matches only in docs (`APP_README_TEMPLATE.md`, ADR-002 as historical, `docs/drift-audit-*` + `docs/post-standalone-audit/*` reports, `docs/archive/*`) and `.serena/memories/*`. **Zero source consumers.**
- `apps/bingo/package.json` version pin: `next: ^16.2.3`, `react: 19.2.3`, `zustand: ^5.0.10`, `tailwindcss: ^4`.
- Both apps' `.env.local` files ship with only app-URL + observability keys; no DB or auth keys.

### Separating prescriptive content from generic placeholders

- **Prescriptive (must be rewritten):** lines that describe *this monorepo's* current stack or prescribe *specific* package/env-var names. If a scaffolder copies this template, those lines are copied verbatim into the new app's README.
- **Generic placeholder (fine as-is):** lines like `[FEATURE_CATEGORY]`, `[ROUTE_PATH]`, `[VARIABLE_NAME]` — these are obvious fill-ins.

**Prescriptive lines that are currently wrong:**

| Line | Current content | Problem |
|---|---|---|
| 55-56 | Example description mentions "cloud-based, web-accessible Bingo system" | Bingo is now standalone, no cloud. Misleading as an example. |
| 95 | `- Supabase project (for online mode)` | No Supabase in stack. |
| 166-175 | Tech Stack table rows: `Backend (BFF) | Next.js API Routes`, `Database | Supabase (PostgreSQL)`, `Auth | Supabase Auth (via BFF)` | No BFF, no DB, no auth. |
| 268-271 | Required env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SESSION_TOKEN_SECRET` | All three are dead env vars. |
| 277 | Optional env `SUPABASE_SERVICE_ROLE_KEY` | Dead. |
| 283-286 | Example `.env.local` with live-looking Supabase URLs and a 44-char base64 `SESSION_TOKEN_SECRET` value | Teaches the wrong env surface; the base64 value looks real enough to be copy-pasted into production. |
| 352-353 | `@hosted-game-night/database` and `@hosted-game-night/auth` in Shared Packages | Both packages deleted in BEA-688/694. |
| 367-369 | Integration Status table rows for `Database`, `Authentication` | Not concerns of this monorepo anymore. |

### Section Disposition Table

| Section | Line range | Disposition | Rationale |
|---|---|---|---|
| Instructions comment block | 1-44 | KEEP | Structural placeholders and section requirements list. Generic. |
| `# [APP_NAME]` + Status blurb | 46-48 | KEEP | Generic placeholder. |
| Description instruction block + `[DESCRIPTION]` | 50-58 | REWRITE (line 55-56) | Cloud-based example is wrong; change to a standalone example. |
| `## Features` | 60-81 | KEEP | Generic placeholders. |
| `## Quick Start` → `### Prerequisites` | 83-96 | REWRITE (line 95) | Drop Supabase pre-req; Node + pnpm are the only real ones. |
| `### Installation` | 98-123 | KEEP | Generic commands. |
| `### Key Routes` | 125-137 | KEEP | Generic placeholders. |
| `### First-Time Setup` | 139-152 | KEEP | Generic. |
| `## Architecture` → `### Tech Stack` | 154-175 | REWRITE (lines 166-175) | Replace Supabase/BFF/Auth rows with current stack. |
| `### Project Structure` | 177-207 | KEEP | Generic ASCII placeholder tree. |
| `### State Management` | 209-231 | KEEP | Generic placeholder. |
| `### Dual-Screen Sync (OPTIONAL)` | 233-250 | KEEP | Generic placeholder. |
| `## Environment Variables` + `### Required` + `### Optional` + example | 252-287 | REWRITE (lines 266-287) | Drop all Supabase/SESSION_TOKEN rows and example; replace with the realistic env surface + standard optional observability rows. |
| `## Development Workflow` → `### Running Tests` | 289-317 | KEEP | Generic. |
| `### Keyboard Shortcuts (OPTIONAL)` | 319-334 | KEEP | Generic. |
| `## Shared Packages` | 336-354 | REWRITE (lines 352-353) | Remove `@hosted-game-night/database` and `@hosted-game-night/auth` (deleted); list the real 8 shared packages as the example. |
| `## Integration Status` | 356-371 | REWRITE (lines 367-369) | Drop `Database` and `Authentication` example rows; use standalone-era examples. |
| `## Known Issues & Limitations` | 373-385 | KEEP | Generic placeholder. |
| `## Future Work` | 387-399 | KEEP | Generic. |
| `## Design Requirements` | 401-415 | KEEP | Generic (copy-consistent with both apps). |
| `## Related Documentation` | 417-428 | KEEP | Generic. |
| `## Contributing` | 430-432 | KEEP | Generic. |

### REWRITE Blocks (with proposed text)

#### Rewrite 3.A — Description-instruction example (lines 50-58)

**Current:**

```markdown
<!--
  DESCRIPTION INSTRUCTIONS:
  - Write 1-2 sentences describing what this app does
  - Mention the target audience (e.g., "designed for groups and communities")
  - Highlight the key differentiator or use case
  - Example: "A cloud-based, web-accessible Bingo system designed for retirement
    communities. Replaces USB-based solutions with a modern PWA that works offline."
-->
[DESCRIPTION]
```

**Proposed replacement:**

```markdown
<!--
  DESCRIPTION INSTRUCTIONS:
  - Write 1-2 sentences describing what this app does
  - Mention the target audience (e.g., "designed for groups and communities")
  - Highlight the key differentiator or use case
  - Example: "A standalone, web-accessible Bingo PWA designed for groups and
    communities. Runs entirely in the browser with localStorage persistence —
    no accounts, no server. Supports dual-screen presentation (presenter
    controls + audience display) via BroadcastChannel."
-->
[DESCRIPTION]
```

Source check: the example is now consistent with `apps/bingo/CLAUDE.md` (seen in session).

#### Rewrite 3.B — Prerequisites (line 95)

**Current (lines 93-96):**

```markdown
-->

- Node.js 18+ and pnpm 9.15+
- Supabase project (for online mode)
- [OTHER_REQUIREMENTS]
```

**Proposed replacement:**

```markdown
-->

- Node.js 18+ and pnpm 9.15+
- [OTHER_REQUIREMENTS]
```

#### Rewrite 3.C — Tech Stack table (lines 164-175)

**Current:**

```markdown
<!--
  TECH STACK INSTRUCTIONS:
  - List all major technologies used
  - Organize by layer/category
  - Include version numbers when relevant
  - Keep this table format for consistency
-->

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19 + Tailwind CSS 4 |
| Backend (BFF) | Next.js API Routes |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (via BFF) |
| State Management | Zustand 5 |
| PWA | Serwist (Service Worker) |
| Testing | Vitest 4 + Testing Library |
```

**Proposed replacement:**

```markdown
<!--
  TECH STACK INSTRUCTIONS:
  - List all major technologies used in THIS app. The stack below is the
    default for this monorepo; adjust only if the app genuinely differs.
  - This project has no database and no auth infrastructure — apps run
    standalone with localStorage-only persistence. Do NOT add Database or
    Auth rows unless the app introduces one.
  - API Routes are minimal (CSP reports, monitoring tunnel, and app-specific
    proxies if any). Keep the API row generic or delete it if your app has
    no API surface.
  - Include version numbers when relevant.
  - Keep this table format for consistency.
-->

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router) |
| Frontend | React 19 + Tailwind CSS 4 |
| State Management | Zustand 5 (localStorage persistence) |
| Dual-Screen Sync | `@hosted-game-night/sync` (BroadcastChannel) |
| PWA | Serwist (Service Worker) |
| Testing | Vitest 4 + Testing Library |
| Observability | Sentry + `@vercel/otel` + Grafana Faro (optional) |
```

Source checks: `apps/bingo/package.json` and `apps/trivia/package.json` pin `next ^16.2.3`, `react 19.2.3`, `zustand ^5.0.10`, `tailwindcss ^4`, `serwist ^9.5.0`, `vitest ^4.0.17`, `@sentry/nextjs ^10.39.0`, `@vercel/otel ^2.1.1`.

#### Rewrite 3.D — Environment Variables (lines 252-287)

**Current (lines 252-287):**

```markdown
## Environment Variables

Create `.env.local` in `apps/[APP_SLUG]`:

### Required Variables

<!--
  ENVIRONMENT VARIABLES INSTRUCTIONS:
  - List ALL required environment variables
  - Include description and example value for each
  - Separate required and optional variables
  - Provide generation instructions where needed
-->

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SESSION_TOKEN_SECRET` | Secret key for HMAC-signing session tokens | Generate with `openssl rand -base64 32` |
| `[VARIABLE_NAME]` | [Description] | `[example value]` |

### Optional Variables (OPTIONAL)

| Variable | Description |
|----------|-------------|
| `SUPABASE_SERVICE_ROLE_KEY` | For admin operations (optional) |
| `[VARIABLE_NAME]` | [Description] |

**Example `.env.local`:**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SESSION_TOKEN_SECRET=vGOwoWTO69KP5QXIcNYjyHGonXJZh3nFH3oq3XOCSwY=
[VARIABLE_NAME]=[example_value]
```
```

**Proposed replacement:**

```markdown
## Environment Variables

Create `.env.local` in `apps/[APP_SLUG]`. This monorepo runs standalone with
localStorage-only persistence, so apps typically need **no required env vars**
for local dev. Only list a variable as Required if your app has a server-side
path that hard-fails without it (see the trivia-api proxy in `apps/trivia` for
a real example of a required key).

### Required Variables

<!--
  ENVIRONMENT VARIABLES INSTRUCTIONS:
  - List ONLY variables that are actually required for the app to run or for a
    specific feature to work.
  - Do NOT add Supabase/database/auth variables — this monorepo does not use
    them. If your app genuinely introduces new infra, document it here; the
    template deliberately ships with an empty required table by default.
  - Include description and the file path that reads the variable.
  - Provide generation instructions if the value must be a secret.
-->

| Variable | Description | Read By |
|----------|-------------|---------|
| `[VARIABLE_NAME]` | [Description] | `src/[path/to/consumer].ts` |

### Optional Variables (OPTIONAL)

Common across both `apps/bingo` and `apps/trivia`:

| Variable | Description | Read By |
|----------|-------------|---------|
| `NEXT_PUBLIC_FARO_URL` | Grafana Faro collector URL (frontend RUM) | `@hosted-game-night/error-tracking` bootstrap |
| `SENTRY_DSN` | Sentry DSN (server-side error reporting) | `src/instrumentation.ts` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OpenTelemetry collector URL | `src/instrumentation.ts` |
| `OTEL_EXPORTER_OTLP_HEADERS` | Comma-separated `k=v` pairs for OTLP headers | `src/instrumentation.ts` |

**Example `.env.local`:**

```bash
# Most local-dev runs can leave .env.local empty. Observability + app-specific
# keys go here when needed.
# SENTRY_DSN=https://<public-key>@<org-id>.ingest.sentry.io/<project-id>
# OTEL_EXPORTER_OTLP_ENDPOINT=https://otlp-gateway-prod-us-west-0.grafana.net/otlp
# OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <base64(instance-id:token)>
# NEXT_PUBLIC_FARO_URL=https://faro-collector-prod-us-west-0.grafana.net/collect/<app-key>
```

**Do not add** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `SESSION_TOKEN_SECRET`, or any other auth/database
variable — none of these have consumers in this monorepo, and documenting them
here produces cargo-cult env files.
```

Source checks:
- `src/instrumentation.ts` consumers: verified in `apps/trivia/src/instrumentation.ts:6-33` and the bingo equivalent.
- `@hosted-game-night/error-tracking` is the Faro bootstrap consumer per MEMORY.md note on `NEXT_PUBLIC_FARO_URL` Turbo passthrough.
- The "do not add" list is the exact text of deleted env vars from BEA-682–696.

#### Rewrite 3.E — Shared Packages (lines 349-354)

**Current:**

```markdown
- [`@hosted-game-night/sync`](../../packages/sync/README.md) - [Brief description of usage]
- [`@hosted-game-night/ui`](../../packages/ui/README.md) - [Brief description of usage]
- [`@hosted-game-night/theme`](../../packages/theme/README.md) - [Brief description of usage]
- [`@hosted-game-night/database`](../../packages/database/README.md) - [Brief description of usage]
- [`@hosted-game-night/auth`](../../packages/auth/README.md) - [Brief description of usage]
- [`@hosted-game-night/[PACKAGE_NAME]`](../../packages/[PACKAGE_NAME]/README.md) - [Brief description of usage]
```

**Proposed replacement:**

```markdown
The 8 shared packages that exist in this monorepo (pick the ones the app
actually consumes; remove the rest):

- [`@hosted-game-night/sync`](../../packages/sync/README.md) - BroadcastChannel dual-screen synchronization
- [`@hosted-game-night/ui`](../../packages/ui/README.md) - Shared UI primitives (Button, Modal, Toggle, Toast, etc.)
- [`@hosted-game-night/theme`](../../packages/theme/README.md) - Design tokens (themes, typography, spacing, touch targets)
- [`@hosted-game-night/audio`](../../packages/audio/README.md) - Shared audio utilities (voice packs, sound effects)
- [`@hosted-game-night/game-stats`](../../packages/game-stats/README.md) - Shared game-statistics types, calculators, and localStorage storage
- [`@hosted-game-night/types`](../../packages/types/README.md) - Shared TypeScript types
- [`@hosted-game-night/testing`](../../packages/testing/README.md) - BroadcastChannel, Audio, Sentry, OTel mocks (devDependency only)
- [`@hosted-game-night/error-tracking`](../../packages/error-tracking/README.md) - Error logging and RUM wiring
```

Source check: every package listed corresponds to a directory in `packages/` confirmed via `ls packages/`. The deleted `database` and `auth` rows are dropped.

#### Rewrite 3.F — Integration Status (lines 366-371)

**Current:**

```markdown
| Feature | Status | Notes |
|---------|--------|-------|
| **Database** | ✅ Integrated | [Brief description of what's working] |
| **Authentication** | ❌ Not Integrated | [Brief status or plan] |
| **[FEATURE_NAME]** | ✅ Complete | [Brief description] |
| **[FEATURE_NAME]** | ⚠️ Partial | [Brief status] |
```

**Proposed replacement:**

```markdown
| Feature | Status | Notes |
|---------|--------|-------|
| **Dual-Screen Sync** | ✅ Complete | BroadcastChannel via `@hosted-game-night/sync` |
| **PWA / Offline** | ✅ Complete | Serwist service worker registered in `src/sw.ts` |
| **Theme System** | ✅ Complete | Light/Dark/System + 10+ color themes via `@hosted-game-night/theme` |
| **[FEATURE_NAME]** | ✅ Complete | [Brief description] |
| **[FEATURE_NAME]** | ⚠️ Partial | [Brief status] |
```

Source check: examples are now drawn from the two existing apps' real integration status per `apps/bingo/CLAUDE.md` and `apps/trivia/CLAUDE.md`.

### Cross-reference Verification (survivors)

| Claim | Source | Matches? |
|---|---|---|
| `Next.js 16 (App Router)` | `apps/{bingo,trivia}/package.json` next: `^16.2.3` | Yes |
| `React 19 + Tailwind CSS 4` | package.json `react: 19.2.3`, `tailwindcss: ^4` | Yes |
| `Zustand 5 (localStorage persistence)` | package.json `zustand: ^5.0.10` | Yes |
| `Serwist (Service Worker)` | package.json `serwist: ^9.5.0`, `apps/*/src/sw.ts` | Yes |
| `Vitest 4 + Testing Library` | package.json `vitest: ^4.0.17`, `@testing-library/react: ^16.3.1` | Yes |
| 8 shared packages | `ls packages/` → 8 dirs | Yes |
| Faro URL / Sentry DSN / OTLP env vars | `apps/*/src/instrumentation.ts`, `apps/*/.env.example` | Yes |

---

## Target 4: `docs/adr/ADR-001-e2e-hash-port-isolation.md`

Source-truth probes:

- `git ls-files e2e/fixtures/` — only `e2e/fixtures/game.ts`. No `auth.ts`.
- `git ls-files e2e/utils/` — `fixtures.ts`, `helpers.ts`, `port-config.ts`, `trivia-fixtures.ts`. **No `port-isolation.ts`.** (Phase 1 Area 2 did not flag this separately — note below.)
- `e2e/utils/port-config.ts` contains the full hash-port-offset logic at lines 93-103 and the config selector at 109-157. There is no separate `port-isolation.ts` file; the ADR's line 17, 47-48 "Files implementing this decision" list names both `port-isolation.ts` and `port-config.ts`, but only the latter is tracked at HEAD.
- `scripts/setup-worktree-e2e.sh` exists `[tracked-HEAD]`.
- `playwright.config.ts` exists `[tracked-HEAD]`.

### Section Disposition Table

| Section | Line range | Disposition | Rationale |
|---|---|---|---|
| `# ADR-001: E2E Hash-Based Port Isolation` | 1 | KEEP | Title accurate. |
| `## Status` | 3-5 | KEEP | Accepted is accurate; this is the live port-isolation ADR. |
| `## Context` | 7-11 | KEEP | Historical framing with in-line correction already added (`since removed in the standalone conversion BEA-682–696`). |
| `## Decision` | 13-33 | KEEP with minor notes | Algorithm steps 1-6 match `e2e/utils/port-config.ts:41-103,109-157`. One doc-vs-source drift: lines 17, 47-48 reference `e2e/utils/port-isolation.ts` as a distinct file — it does not exist at HEAD, the logic lives entirely in `e2e/utils/port-config.ts`. This is adjacent to the tail-Note scope assigned to this iterator; flagged for awareness but not rewritten here since Phase 1 Finding 2.12 confined this iterator's ADR-001 scope to the tail Note. |
| `## Consequences` | 35-51 | KEEP (see minor note above) | |
| Tail `Note:` at line 53 | 53 | **REWRITE (assigned scope)** | The note references `e2e/fixtures/auth.ts` which does not exist at HEAD. `git ls-files e2e/fixtures/` returns only `game.ts`. |

### REWRITE Block (with proposed text)

#### Rewrite 4.A — Tail Note at line 53

**Current (line 53):**

```markdown
Note: `e2e/fixtures/auth.ts` previously consumed the port config for Platform Hub URLs. After the standalone conversion (BEA-682–696), it navigates directly to `/play` on the target app and no longer reads hub URLs.
```

**Option A — DELETE.** The surrounding ADR body (lines 7-11, 24, 47-51) already accurately reflects that Platform Hub was removed and that the port config is consumed by `playwright.config.ts` / fixtures. The tail Note is a historical artifact of the pre-BEA-714 fixture layout and does not add information beyond what the `Consequences` section already says. Simplest fix.

**Option B — REWRITE.** Replace with a Note that points at the correct current fixture file:

```markdown
Note: the port config is consumed by `e2e/fixtures/game.ts` (which exports `bingoPage`, `triviaPage`, `triviaPageWithQuestions`, and `triviaGameStarted`) via the shared `getE2EPortConfig()` function in `e2e/utils/port-config.ts`. The pre-standalone `e2e/fixtures/auth.ts` file — which navigated through Platform Hub URLs — was removed as part of BEA-682–696 and superseded by the composable `game.ts` fixtures in BEA-714.
```

**Recommendation:** Option B. It preserves the historical pointer ("where did `auth.ts` go?") and grounds the current pointer in a file that actually exists, which is the exact pattern used elsewhere in Option B's tail-note that was rewritten for ADR-002 and ADR-007 (per Phase 1 Finding 2.13).

Source checks:
- `e2e/fixtures/game.ts:56-91,117-188` exports the four fixtures listed.
- `e2e/utils/port-config.ts:109` exports `getE2EPortConfig`.
- `e2e/fixtures/game.ts:3` imports from `../utils/port-config`.
- `git log --diff-filter=D -- e2e/fixtures/auth.ts` would confirm the deletion commit; Phase 1 Finding 2.12 identifies BEA-714 (`d2a6d207`) and BEA-716 (`6d412fd5`) as the refactor/purge pair.

### Adjacent finding (out-of-scope for this iterator but worth logging)

The ADR body at lines 17 and 47-48 names `e2e/utils/port-isolation.ts` as if it were a separate implementation file. At HEAD, that file does not exist — the logic is in `e2e/utils/port-config.ts`. This is lower-severity than the tail Note because it reads as an accurate-sounding name inside a correctly-named neighbor; still, if the ADR is being edited anyway, consider replacing both occurrences with `e2e/utils/port-config.ts` or noting that the former `port-isolation.ts` was consolidated into `port-config.ts`. Flagging rather than rewriting to keep this iterator's scope tight to Phase 1 Finding 2.12.

### Cross-reference Verification (survivors)

| Claim | Source | Matches? |
|---|---|---|
| Hash-based port offset for worktrees | `e2e/utils/port-config.ts:93-103` | Yes (SHA-256, first 8 hex chars, `% 333`, `* 3`) |
| Priority: env override → hash → default | `e2e/utils/port-config.ts:114-156` | Yes |
| Default ports 3000 bingo / 3001 trivia | `e2e/utils/port-config.ts:110-111` | Yes |
| `scripts/setup-worktree-e2e.sh` generates `.env.e2e` | tracked file exists | Yes (on-disk & tracked) |
| `playwright.config.ts` consumes port config | `e2e/fixtures/game.ts:3` imports from `../utils/port-config`; playwright.config uses same helper | Yes |
| Worktree detection via `.git` being a file | `e2e/utils/port-config.ts:41-89` | Yes |
| 333 concurrent-worktree capacity | `e2e/utils/port-config.ts:101` (`hashInt % 333`) | Yes |

---

## Cost Estimate (bytes / lines to rewrite per target)

| Target | Total lines at HEAD | Lines touched | % churn | Edit type |
|---|---|---|---|---|
| `docs/E2E_TESTING_GUIDE.md` | 586 | ~45 (1 deletion block + 4 small rewrites + 1 table replacement) | ~8% | Mostly surgical deletions and table replacement; prose left intact. |
| `apps/trivia/README.md` | 188 | ~35 (5 rewrite blocks: feature bullet, route bullet, env var table, keyboard table, future-work bullet) | ~19% | All are targeted, not structural. |
| `docs/templates/APP_README_TEMPLATE.md` | 433 | ~55 (6 rewrite blocks: description example, prereq, tech stack, env vars, shared packages, integration status) | ~13% | Centered on the four Supabase/auth spots; structure + headings untouched. |
| `docs/adr/ADR-001-e2e-hash-port-isolation.md` | 53 | 1 (the tail Note) + optional 2-line adjacent cleanup | ~2% | Smallest of the four; single-line replacement. |

**Total estimated edit footprint:** ~136 lines across 4 files. Each change is append/replace against a quoted current excerpt, so a downstream implementer can apply them mechanically.

**Rebuild risk:** Low. No code imports any of these docs; the edits are content-only. Cross-file dependency exists between `APP_README_TEMPLATE.md` and any future scaffolded app, but there is no scaffolding automation in tree (`rg "APP_README_TEMPLATE\|\.md"` returns only doc-internal refs) — so no template consumer will break.

**Sequencing recommendation:**
1. ADR-001 tail Note (1 line, immediate).
2. `apps/trivia/README.md` (highest user-facing blast radius per visit — the app's landing doc).
3. `docs/E2E_TESTING_GUIDE.md` (highest agent blast radius — the canonical E2E authoring reference).
4. `docs/templates/APP_README_TEMPLATE.md` (latent blast radius — only triggers on the next scaffold).

---

## Resolved Questions

1. **Do `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_FEATURE_QUESTION_SETS` have any source consumers under `apps/trivia/src`?** No. `rg "NEXT_PUBLIC_APP_URL|NEXT_PUBLIC_FEATURE_QUESTION_SETS" apps/trivia/src` returns zero matches. Phase 1 Finding 2.7 is confirmed.

2. **Does `/question-sets` exist as a route at HEAD?** No. `ls apps/trivia/src/app/` returns no `question-sets` directory. Phase 1 Finding 2.6 is confirmed.

3. **Do any of the 7 `data-testid` values in `E2E_TESTING_GUIDE.md:464-472` resolve to source?** No. `rg "offline-session-id|online-room-code|room-pin-display|game-card-bingo|game-card-trivia|pattern-preview"` under `apps/` returns zero. `current-ball` hits only as a class regex in `e2e/bingo/accessibility.spec.ts:269`, not a testid. Phase 1 Finding 2.2 is confirmed.

4. **Does `waitForRoomSetupModal` exist in `e2e/utils/helpers.ts`?** No. `grep "^export" e2e/utils/helpers.ts` returns 19 exports, none matching. Phase 1 Finding 2.1 is confirmed.

5. **Does `e2e/bingo/room-setup.spec.ts` exist?** No. `git ls-files e2e/` returns 7 bingo specs, none matching. Phase 1 Finding 2.4 is confirmed.

6. **Does `e2e/fixtures/auth.ts` exist?** No. `git ls-files e2e/fixtures/` returns only `game.ts`. Phase 1 Finding 2.12 is confirmed.

7. **Do `packages/database` and `packages/auth` exist?** No. `ls packages/` returns 8 dirs, neither present. Phase 1 Finding 2.9 is confirmed.

8. **Does `e2e/global-setup.ts` throw "Missing required environment variables"?** No. The file contains only `waitForServers()` — it has no env-var validation code path. Phase 1 Finding 2.3 is confirmed.

9. **Which `data-testid` values DO resolve in source, so the rewritten table is truthful?** Enumerated via `rg "data-testid="` in the Rewrite 1.E block above; ~20 testids across `apps/bingo/src` (play page, BallDisplay, BallsCalledCounter, AudienceBingoBoard, audio-unlock-overlay) and `apps/trivia/src` (SetupGate, SetupWizard, WizardStepReview, SceneNavButtons).

10. **Do `Trivia` README's tech-stack version numbers match `apps/trivia/package.json`?** Yes. `next ^16.2.3`, `react 19.2.3`, `tailwindcss ^4`, `zustand ^5.0.10`, `vitest ^4.0.17`, `serwist ^9.5.0`.

11. **Does `Pattern editor` make sense as Future Work for trivia?** No. `git ls-files apps/trivia/src | grep -i pattern` returns nothing; trivia has no pattern concept. Phase 1 Surprise #5 is confirmed.

## Remaining Unknowns

1. **ADR-001 body drift (out of tail-Note scope).** `e2e/utils/port-isolation.ts` is named in lines 17 and 47-48 but does not exist at HEAD. This iterator's scope per Phase 1 Finding 2.12 was the tail Note; whether the body mentions should also be corrected is a follow-up for Phase 3 (synthesis).

2. **Playwright `--project=bingo` / `--project=trivia` naming.** The rewrite of 1.A includes `--project=bingo` as a hint; I did not open `playwright.config.ts` to verify the exact project name registration. Root `package.json` has `test:e2e:bingo` and `test:e2e:trivia` script aliases, so the projects almost certainly exist under those names, but a Phase 3 implementer should spot-check the exact string before landing the edit.

3. **`NEXT_PUBLIC_FARO_URL` Faro consumer path.** The README rewrites defer Faro to `@hosted-game-night/error-tracking`. I did not open `packages/error-tracking/` to confirm the exact file that reads it; MEMORY.md corroborates the Turbo passthrough + commit `a717c61a`, and Phase 1 Area 5 Finding 5.2 presumably confirms this. If the rewrite is landed verbatim, verify against `packages/error-tracking/src/*` in Phase 3.

4. **`scripts/e2e-with-build.sh` exact invocation.** The existing guide already references it at line 244; not rewritten, but any implementer landing the "Missing env vars" deletion should read the script to confirm no latent env-validation path calls the symptom text.

5. **Whether the template's `.env.local` example value `SESSION_TOKEN_SECRET=vGOwoWTO69KP5QXIcNYjyHGonXJZh3nFH3oq3XOCSwY=` exists anywhere else in tree.** Phase 1 Finding 2.8 flagged this as security-adjacent. The rewrite deletes the line; a separate probe (`rg "vGOwoWTO69KP5QXIcNYjyHGonXJZh3nFH3oq3XOCSwY"`) should be run by Phase 3 to confirm the value is not hidden in `.env.example` or any config under `.github/`.

6. **Should the Rewrite 1.E data-testid table be maintained long-term, or replaced with an auto-generated inventory?** The table lists ~20 testids; hand-maintaining it violates the "source is authoritative" principle that burned the original. A Phase 3 discussion could decide whether to swap the table for a grep recipe that emits today's current list (e.g., `rg "data-testid=\"" apps/*/src --sort path | sed 's/.*data-testid="\\([^"]*\\)".*/\\1/' | sort -u`). I included the literal table in the rewrite because the user asked for proposed text; a recipe-only version is a drop-in alternative.

## Revised Understanding

Phase 1 Area 2's framing — "~30% stale, ~70% accurate" for `E2E_TESTING_GUIDE.md` — holds up at the line level. The stale portions are concentrated: one table (Key Imports), one table (data-testid), two identical spec-name example strings, and one troubleshooting block that documents an impossible failure. Nothing in the *structure* of the guide needs to move; the fixes are purely in-line substitutions.

The `APP_README_TEMPLATE.md` drift is the most epistemically harmful. Unlike the E2E guide which is for humans + agents reading about tests they run, the template is for humans + agents **scaffolding new apps**. A scaffold today would bake in dead env vars and deleted package names. BEA-719 rebranded the strings but left the semantic content; a future mechanical rebrand will not fix this — only a semantic rewrite like the one specified above will. The template is therefore the iterator's highest-ROI target even though its blast radius is presently zero (no one has scaffolded a new app since the standalone conversion).

The `apps/trivia/README.md` drift is the narrowest (Question Sets feature + phantom flag + phantom URL env) and easiest to land. It is also the highest-frequency read of the four targets — anyone opening the trivia app directory hits this file first. Cost/benefit favors landing this ahead of the template.

The ADR-001 tail Note is trivially small (one sentence, one line) and should be landed with zero ceremony. The body-level `port-isolation.ts` drift is flagged separately as an adjacent finding that Phase 3 synthesis can choose to bundle or defer.

Overall: Phase 1 Area 2's findings translate cleanly into concrete edits. The remaining risk is not in the specification above, but in whether Phase 3 / the landing implementer reads `playwright.config.ts` and `packages/error-tracking/` to close the two open source-truth probes before merging.
