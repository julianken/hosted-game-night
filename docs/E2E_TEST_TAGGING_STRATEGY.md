# E2E Test Tagging Strategy

**Created:** 2026-01-23
**Issue:** BEA-313 - E2E Infrastructure: Sharding & CI Integration
**Status:** Implementation in progress

## Overview

This document defines the test tagging strategy for the Beak Gaming Platform E2E test suite. Tags enable selective test execution for faster CI feedback loops.

## Tag Levels

### @critical (Target: 30-40 tests)
**Purpose:** Must-work features that MUST pass on every PR.
**CI Impact:** Runs on all PRs in parallel (4 shards), target <5 min execution.

**Criteria:**
- Core authentication flows (login, signup, logout)
- Cross-app SSO initialization and token exchange
- Protected route redirects
- Session persistence after OAuth
- Dashboard navigation to games
- Critical game initialization (app starts, basic UI loads)

**Current Distribution:**
- Platform Hub Auth: ~15-20 tests (BEA-314 - not yet implemented)
- Bingo Core: ~5-7 tests
- Trivia Core: ~5-7 tests
- Cross-app SSO: ~3-5 tests (BEA-316 - not yet implemented)

### @high (Target: 50-60 tests)
**Purpose:** Important flows and data validation that should run on all PRs.
**CI Impact:** Runs with @critical tests (combined ~80-100 tests), target <8 min execution.

**Criteria:**
- Core game mechanics (ball calling, question display, scoring)
- Dual-screen synchronization
- Navigation between key pages
- Important user interactions (button clicks, form submissions)
- Basic accessibility (keyboard navigation, headings)
- Senior-friendly UI requirements (button sizes, contrast)

**Current Distribution:**
- Bingo Gameplay: ~25-30 tests
- Trivia Gameplay: ~20-25 tests
- Platform Hub Dashboard: ~8-10 tests (BEA-315 - not yet implemented)

### @medium (Target: 150-170 tests)
**Purpose:** Secondary features and edge cases. Runs in full suite only.
**CI Impact:** Only runs on main branch and nightly builds.

**Criteria:**
- Settings and configuration changes
- Pattern selection and game modes
- Modal dialogs and timing
- Keyboard shortcuts
- Secondary UI elements
- Feature discovery and help text

**Current Distribution:**
- Bingo Features: ~70-80 tests
- Trivia Features: ~60-70 tests
- Platform Hub Features: ~20-25 tests (BEA-315, BEA-318 - not yet implemented)

### @low (Target: ~100 tests)
**Purpose:** Nice-to-have validations and minor UI checks. Full suite only.
**CI Impact:** Only runs on main branch and nightly builds.

**Criteria:**
- Footer text and branding
- Non-critical UI polish
- Edge case error handling
- Optional accessibility enhancements
- Performance edge cases

**Current Distribution:**
- Bingo: ~40-50 tests
- Trivia: ~30-40 tests
- Platform Hub: ~15-20 tests (BEA-318 - not yet implemented)

## Implementation Status

### ✅ Completed
- Playwright config updated with 4-worker sharding
- GitHub Actions workflow updated with shard matrix
- Critical-only job for PRs (<5 min target)
- Full suite job for main branch
- package.json scripts added (`test:e2e:critical`, `test:e2e:high`)

### 🚧 In Progress
- Tagging existing Bingo tests (8 files, ~150 tests)
- Tagging existing Trivia tests (5 files, ~130 tests)

### ⏳ Pending (Future Issues)
- Platform Hub auth tests (BEA-314) - will be tagged @critical
- Platform Hub dashboard tests (BEA-315) - will be tagged @high and @medium
- Cross-app SSO tests (BEA-316) - will be tagged @critical and @high
- Accessibility and security tests (BEA-318) - will be tagged @medium and @low

## Tagging Examples

### Bingo App

#### home.spec.ts
```typescript
test('displays the main title and tagline @medium', ...)
test('has Play Now button that links to presenter view @high', ...)
test('navigates to presenter view when Play Now is clicked @high', ...)
test('displays feature cards @medium', ...)
test('has accessible structure with proper headings @high', ...)
test('footer mentions Beak Gaming Platform @low', ...)
test('has senior-friendly button sizes (min 44x44px) @high', ...)
```

#### presenter.spec.ts
```typescript
test('displays presenter view header @medium', ...)
test('shows Open Display button @high', ...)
test('displays bingo board with B-I-N-G-O columns @high', ...)
test('shows pattern selector @high', ...)
test('can call a ball with button click @high', ...)
test('displays current ball after calling @high', ...)
test('board updates when ball is called @high', ...)
test('can pause and resume the game @medium', ...)
test('undo removes the last called ball @high', ...)
test('reset clears all called balls @high', ...)
```

#### accessibility.spec.ts
```typescript
test('has proper heading hierarchy @high', ...)
test('has main landmark @high', ...)
test('links have accessible names @high', ...)
test('buttons have accessible names @high', ...)
test('color contrast is sufficient for text @medium', ...)
test('keyboard navigation works @high', ...)
test('focus indicators are visible @medium', ...)
test('screen reader labels are present @medium', ...)
```

#### dual-screen.spec.ts
```typescript
test('BroadcastChannel syncs state between windows @high', ...)
test('audience display receives ball updates @high', ...)
test('pattern changes sync to display @high', ...)
test('reset syncs to both windows @medium', ...)
```

#### keyboard.spec.ts
```typescript
test('Space key rolls next ball @medium', ...)
test('P key pauses/resumes game @medium', ...)
test('R key resets game @medium', ...)
test('U key undoes last call @medium', ...)
test('M key mutes audio @low', ...)
```

### Trivia App

#### home.spec.ts
```typescript
test('displays main title @medium', ...)
test('has Start Game button @high', ...)
test('navigates to setup page @high', ...)
test('displays feature cards @medium', ...)
```

#### presenter.spec.ts
```typescript
test('displays presenter view @medium', ...)
test('shows question text @high', ...)
test('displays answer options @high', ...)
test('can navigate between questions @high', ...)
test('can reveal answer @high', ...)
test('timer counts down correctly @high', ...)
test('can pause timer @medium', ...)
```

#### session-flow.spec.ts
```typescript
test('can create new trivia session @high', ...)
test('can select question set @high', ...)
test('session state persists @high', ...)
test('can end session @medium', ...)
```

## Running Tagged Tests

```bash
# Run only critical tests (PR workflow)
pnpm test:e2e:critical

# Run critical + high tests
pnpm test:e2e:high

# Run full suite (main branch)
pnpm test:e2e

# Run specific tag locally
npx playwright test --grep @medium
npx playwright test --grep '@critical|@high'

# Run specific app with tag
npx playwright test --project=bingo --grep @critical
```

## CI Configuration

### PR Workflow (Critical Only)
- **Trigger:** Every pull request
- **Shards:** 4 parallel jobs
- **Tests:** ~30-40 @critical tests
- **Target Time:** <5 minutes total
- **Purpose:** Fast feedback on must-work features

### Main Branch Workflow (Full Suite)
- **Trigger:** Push to main
- **Shards:** 4 parallel jobs
- **Tests:** All ~384-387 tests (when Platform Hub complete)
- **Target Time:** <15 minutes total
- **Purpose:** Comprehensive validation before deployment

## Performance Targets

| Test Type | Environment | Shards | Tests | Target Time |
|-----------|-------------|--------|-------|-------------|
| Critical-only | PR | 4 | ~30-40 | <5 min |
| High-priority | PR (optional) | 4 | ~80-100 | <8 min |
| Full suite | Main/Nightly | 4 | ~384-387 | <15 min |

## Tag Distribution Goals

| Tag | Current (Bingo+Trivia) | After Platform Hub | Total Target |
|-----|------------------------|-------------------|--------------|
| @critical | ~10-15 | ~25-30 | 30-40 tests |
| @high | ~50-60 | ~80-90 | 80-100 tests |
| @medium | ~150-170 | ~170-190 | 190-220 tests |
| @low | ~70-80 | ~90-110 | 100-130 tests |
| **TOTAL** | **~288** | **~384-387** | **~400-440** |

## Tagging Guidelines

1. **Be conservative with @critical** - Only truly must-work features
2. **Use @high for core flows** - Important but not blocking
3. **Tag by impact, not complexity** - Simple test can be @critical if feature is critical
4. **Consider execution time** - Fast tests preferred for @critical
5. **Group related tests** - Keep test suites cohesive within tag levels

## Related Documentation

- [E2E Testing Project Plan](/docs/LINEAR_E2E_PROJECT_PLAN.md)
- [E2E Testing Roadmap](/docs/E2E_TESTING_ROADMAP.md)
- [Playwright Configuration](/playwright.config.ts)
- [E2E Workflow](/.github/workflows/e2e.yml)

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2026-01-23 | Initial strategy document | Agent-1 (BEA-313) |
