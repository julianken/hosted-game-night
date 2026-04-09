# Iteration: TriviaApiImporter Dual-Context Behavior

## Assignment
Resolve whether the "Save to My Question Sets" button appears in the wizard (non-QS) context.

## Findings

### Save button is unconditionally visible in preview state
- **Evidence:** `TriviaApiImporter.tsx:671-686` — button renders with no `context` or `onSaveSuccess` guard
- **Confidence:** high
- **Relation to Phase 1:** Confirms Area 5's finding that TriviaApiImporter is a secondary QS entry point
- **Significance:** The wizard's save button is live — it POSTs to `/api/question-sets` regardless of context

### WizardStepQuestions passes no QS-related props
- **Evidence:** `WizardStepQuestions.tsx:46` — `<TriviaApiImporter disabled={false} />` with no `context` or `onSaveSuccess`
- **Confidence:** high
- **Significance:** `context` defaults to `'game'`, `onSaveSuccess` is undefined (no-op via optional chaining)

### Context prop only controls "Load into Game" button, NOT save button
- **Evidence:** `TriviaApiImporter.tsx:650` — `{!isManagement && (...)}` hides Load button in management mode. Save button has NO equivalent guard.
- **Confidence:** high

## Resolved Questions
- **Yes, the wizard renders the save button.** Both "Load into Game" AND "Save to My Question Sets" appear in preview state in the wizard.
- **The POST fires regardless of onSaveSuccess** — `onSaveSuccess?.()` is a no-op when undefined, but the API call at line 252 executes.

## Remaining Unknowns
- Whether displaying this button in the wizard was intentional (power-user convenience) or an oversight

## Revised Understanding
Feature flag must gate the save section inside TriviaApiImporter itself — layout gate alone is insufficient because the wizard is outside the `/question-sets` segment.
