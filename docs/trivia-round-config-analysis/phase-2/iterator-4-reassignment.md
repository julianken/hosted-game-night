# Iteration: Re-assignment Mechanism

## Assignment
Design how Step 2 settings changes trigger question redistribution.

## Findings

### SetupGate is the Right Location for Triggering
- **Evidence:** SetupGate.tsx has access to both game store (questions, importQuestions) and settings store (roundsCount, questionsPerRound). WizardStepSettings is presentational-only.
- **Confidence:** high
- **Significance:** No changes needed to WizardStepSettings props or architecture

### Two Viable Approaches

**Approach A: React Effect in SetupGate**
- useEffect watches roundsCount, isByCategory changes
- Calls a redistribution function that re-assigns roundIndex on existing questions
- Calls importQuestions() with updated questions
- Pros: Simple, no new store actions
- Cons: Effect-based coupling

**Approach B: New Game Store Action `redistributeQuestions()`**
- Explicit action: `redistributeQuestions(mode, roundsCount)`
- Called from SetupGate when settings change
- Internally rewrites roundIndex and updates totalRounds
- Pros: Explicit, testable as store action
- Cons: Another store method

### Recommended: Hybrid — New Engine Function + Effect Trigger
- Create `redistributeQuestions()` as a pure engine function in `lib/game/questions.ts`
- Add as action in game-store.ts
- Trigger from SetupGate via useEffect on settings changes
- **Confidence:** high
- **Significance:** Follows existing pattern (engine function → store action → component trigger)

### WizardStepSettings Stays Presentational
- **Evidence:** Current component receives only roundsCount, questionsPerRound, onUpdateSetting. No store access.
- **Confidence:** high
- **Significance:** Adding isByCategory follows same pattern — just another prop + callback

## Resolved Questions
- "Where does redistribution trigger?" → SetupGate via useEffect
- "Does WizardStepSettings need store access?" → No, stays presentational

## Remaining Unknowns
- Should redistribution happen on EVERY slider change or debounced? (Probably on every change — it's just array remapping, ~1ms)
