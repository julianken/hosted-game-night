# Context Packet: Phase 0

## Problem
6 concrete decisions needed before implementing trivia round config redesign. These block the subagent-workflow.

## The 6 Questions
1. **Q1 (QPR Display):** How to show variable questions-per-round in Step 2 when "By Category" is ON
2. **Q2 (Trigger):** Redistribution on every slider change vs. value settle
3. **Q3 (Dependencies):** Exact useEffect dependency array for redistribution
4. **Q4 (Presets):** Add isByCategory to preset DB schema or not
5. **Q5 (Review Grid):** WizardStepReview behavior with variable round sizes
6. **Q6 (E2E):** Test scenarios for new behavior

## Key Architecture
- Settings store: `stores/settings-store.ts` — Zustand persist v3, roundsCount (1-6), questionsPerRound (3-10)
- Settings sync: `play/page.tsx:108-119` — useEffect syncs settings to game store during setup
- SetupGate: bridges settings store + game store → passes props to SetupWizard
- WizardStepSettings: presentational, receives roundsCount/QPR as props
- WizardStepReview: per-round grid with `isMatch = count === questionsPerRound` coloring
- SettingsPanel: secondary QPR slider in gameplay sidebar
- E2E tests: e2e/trivia/setup-overlay.spec.ts + presenter.spec.ts
- Toggle component: @joolie-boolie/ui Toggle (accessible, used in SettingsPanel)
- Category utilities: getCategoryStatistics(), getCategoryName(), getCategoryBadgeClasses()

## Constraints
- Must follow existing patterns (pure functions, presentational components, settings store booleans)
- Analysis decisions accepted: QPR stays in store, additive migration, redistributeQuestions separate from importQuestions
- "By Category" is default ON
- All code must pass E2E tests before commit
