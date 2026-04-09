# Phase 0: Problem Statement

## Problem Restatement

The trivia round config analysis (docs/trivia-round-config-analysis/) produced a comprehensive execution plan but left 6 open questions that must be answered before implementation can begin. These are concrete design/engineering decisions, not open-ended research questions.

1. **QPR Display (Q1):** When "By Category" mode produces variable questions per round (e.g., 12 Science, 3 History, 5 Geography), how should Step 2 communicate this to the user?
2. **Redistribution Trigger (Q2):** Should the redistributeQuestions() effect fire on every slider onChange event, or only when the user stops dragging?
3. **Effect Dependencies (Q3):** What exact values go in the useEffect dependency array for the redistribution trigger in SetupGate?
4. **Preset Schema (Q4):** Should `isByCategory` be added to the preset database table, or kept only in the settings store?
5. **Review Grid (Q5):** WizardStepReview shows per-round counts with green/amber match coloring. How should this behave when rounds have variable sizes?
6. **E2E Testing (Q6):** What E2E test scenarios should cover the new round config behavior?

## Assumptions
- The analysis report's recommendations are accepted (keep QPR in store, additive migration, redistributeQuestions as separate function, etc.)
- Implementation will follow the 5-step sequence from the analysis (assignment module → store migration → redistribution → UI → validation)
- "By Category" is default ON; "By Count" (manual rounds) is the alternative
- The @joolie-boolie/ui Toggle component exists and is accessible
- E2E tests live in e2e/trivia/ and use Playwright

## Domain Tags
UI/Visual, React/Components, State Management, Testing

## Evaluation Criteria

| Criterion | Weight | Description |
|-----------|--------|-------------|
| User clarity | 25% | Does the user understand what's happening? |
| Correctness | 20% | Does it solve the actual problem completely? |
| Consistency | 15% | Does it follow existing codebase patterns? |
| Simplicity | 15% | Minimal new complexity |
| Testability | 15% | Can we verify it works? |
| Risk | 10% | What can go wrong? |

## 5 Investigation Areas

### Area 1: UI Display Patterns for Variable Data
**Questions addressed:** Q1 (QPR display), Q5 (Review grid)
**Focus:** How does the codebase currently display computed/variable quantities? What patterns exist for category badges, round info, and derived values? What does WizardStepReview look like and how can it be adapted?
**Agent type:** frontend-excellence:react-specialist

### Area 2: React Effect Patterns and Dual-Store Sync
**Questions addressed:** Q2 (trigger timing), Q3 (dependency array)
**Focus:** Study the existing settings sync effect at play/page.tsx:108-119. Study how other effects handle slider changes. Analyze the Slider component's onChange behavior. Determine safe patterns for the redistribution effect.
**Agent type:** frontend-excellence:state-manager

### Area 3: Preset Data Model and Save/Load Flow
**Questions addressed:** Q4 (preset schema)
**Focus:** Study SavePresetModal, PresetSelector, and the preset API routes. Understand what data flows through presets. Determine if isByCategory adds value or just scope.
**Agent type:** feature-dev:code-architect

### Area 4: E2E Test Patterns for Trivia Setup
**Questions addressed:** Q6 (E2E strategy)
**Focus:** Study existing E2E tests in e2e/trivia/ (especially setup-overlay.spec.ts). Understand test helpers, auth patterns, and how the setup wizard is tested today. Design test scenarios for the new behavior.
**Agent type:** backend-development:tdd-orchestrator

### Area 5: Cross-Question Interactions
**Questions addressed:** All 6 (interaction effects)
**Focus:** How do the answers to Q1-Q4 affect each other? If we choose "show per-category breakdown" for Q1, does that change Q5? If we fire on every slider change (Q2), does that affect the display (Q1)? Map the decision dependencies.
**Agent type:** feature-dev:code-architect
