# Phase 2 — Iterator 2: Engine Idempotency Contract for `redistributeQuestions()`

## Role: State Manager

**Characteristic questions answered in this spec:**
- Where should this state live? (what it writes, what it must not write)
- Is this state derived or independent? (roundIndex is derived; roundsCount is independent)
- What's the cache invalidation strategy? (same-reference return = no Zustand re-render)

---

## 1. Source of Truth: What `importQuestions` Tells Us

Current implementation at `apps/trivia/src/lib/game/questions.ts:43-77`:

```
importQuestions(state, questions, mode) -> TriviaGameState
  - Allowed only during 'setup' status
  - Computes totalRounds = max(question.roundIndex) + 1
  - Writes: questions, totalRounds, selectedQuestionIndex (0), displayQuestionIndex (null)
  - Also writes: settings.roundsCount = totalRounds   <-- THIS IS THE FEEDBACK SOURCE
```

The feedback loop risk: `importQuestions` writes `settings.roundsCount`. If `redistributeQuestions` ever called `importQuestions`, any settings-triggered re-run of the effect would see a stale `roundsCount`, recompute, write again, and loop.

`redistributeQuestions` must therefore:
- Never call `importQuestions`
- Never write `settings.roundsCount` (or any `settings.*` field)
- Never write `totalRounds`

---

## 2. Function Signature

```typescript
// Location: apps/trivia/src/lib/game/questions.ts
// Export via: apps/trivia/src/lib/game/engine.ts barrel

export function redistributeQuestions(
  state: TriviaGameState,
  roundsCount: number,
  questionsPerRound: number,
  mode: 'by_count' | 'by_category'
): TriviaGameState
```

### Parameter semantics

| Parameter | Source | Constraint |
|---|---|---|
| `state` | Current Zustand game store snapshot | Must have `status === 'setup'` |
| `roundsCount` | `settingsStore.roundsCount` (integer, 1-6) | Used only in `by_count` mode |
| `questionsPerRound` | `settingsStore.questionsPerRound` (integer, 3-10) | Used only in `by_count` mode |
| `mode` | `settingsStore.isByCategory` mapped to this union | Selects algorithm |

### Return value

`TriviaGameState` — either:
- The **same reference** (`state`) when the computed assignment is identical to what is already stored (idempotent short-circuit), OR
- A **new frozen reference** with `questions` replaced (new array, each question is a new object with updated `roundIndex`)

---

## 3. Idempotency Contract: The Core Invariant

The entire feedback-loop prevention strategy (Q3, Phase 1) depends on this invariant:

> If and only if every `state.questions[i].roundIndex` already equals the `roundIndex` that the algorithm would assign for that position and mode, `redistributeQuestions` MUST return `state` (the same object reference, identity equality).

Zustand's `set()` compares the returned object by reference. When `redistributeQuestions` returns `state` unchanged, `set((s) => redistributeQuestions(s, ...))` produces no state update, no re-render, and the `useEffect` in SetupGate does not re-fire.

### What "identical assignment" means per mode

**By Count mode:** question at array position `i` has `roundIndex === Math.floor(i / questionsPerRound)`.

**By Category mode:** The algorithm groups questions by `category` in stable discovery order (first occurrence of each category in the array), then assigns all questions within a group to the same `roundIndex`. "Identical" means each question's current `roundIndex` matches what the algorithm produces for that category group in the current array order.

---

## 4. Idempotency Check Pseudocode (Short-Circuit)

```
function redistributeQuestions(state, roundsCount, questionsPerRound, mode):

  // Guard: only runs during setup
  if state.status !== 'setup':
    return state

  // Edge case: no questions — nothing to redistribute
  if state.questions.length === 0:
    return state

  // Step 1: Compute the target roundIndex for each position
  targetAssignments: number[] = computeTargetAssignments(
    state.questions, roundsCount, questionsPerRound, mode
  )

  // Step 2: Idempotency check — compare computed vs. stored
  isAlreadyCorrect = state.questions.every(
    (q, i) => q.roundIndex === targetAssignments[i]
  )

  if isAlreadyCorrect:
    return state  // Same reference — Zustand detects no change

  // Step 3: Build new questions array with updated roundIndex values
  newQuestions = state.questions.map(
    (q, i) => ({ ...q, roundIndex: targetAssignments[i] })
  )

  // Step 4: Return new state — only questions changes
  return deepFreeze({
    ...state,
    questions: newQuestions,
    // NOTE: selectedQuestionIndex is NOT reset (user may be reviewing)
    // NOTE: displayQuestionIndex is NOT reset (no active display during setup)
    // NOTE: totalRounds is NOT written
    // NOTE: settings is NOT written
  })
```

---

## 5. Algorithm: "By Count" Mode

Assign each question to a round based purely on its array position.

```
function computeByCount(questions, questionsPerRound):
  return questions.map((_, i) => Math.floor(i / questionsPerRound))
```

This exactly mirrors the assignment that callers do before calling `importQuestions` (e.g., the question-set import pipeline at `lib/questions/`). The result is a flat sequential distribution: questions 0..QPR-1 → round 0, QPR..2QPR-1 → round 1, etc.

**No upper bound clamping by `roundsCount`.** If `questions.length > roundsCount * questionsPerRound`, overflow questions are assigned to round `roundsCount` or higher. This produces an overage that the review grid (WizardStepReview) surfaces as an amber/warning condition. The engine does not silently discard overflow questions.

---

## 6. Algorithm: "By Category" Mode

Assign all questions of the same category to the same round, with one round per category.

```
function computeByCategory(questions):

  // Step 1: Discover categories in stable order (first occurrence wins)
  categoryOrder: string[] = []
  seen: Set<string> = new Set()
  for each q in questions:
    if not seen.has(q.category):
      categoryOrder.push(q.category)
      seen.add(q.category)

  // Step 2: Build a category -> roundIndex map
  categoryToRound: Map<string, number> = new Map()
  for (idx, category) of categoryOrder.entries():
    categoryToRound.set(category, idx)

  // Step 3: Assign each question
  return questions.map(q => categoryToRound.get(q.category))
```

**Stable order guarantee:** The first question with a given `category` value (by array index) determines that category's round assignment. This is critical for idempotency: the same questions array with the same ordering must always produce the same `targetAssignments`. Callers must not sort or shuffle `state.questions` without expecting a redistribution.

**`roundsCount` is not used in By Category mode.** The number of rounds is implicitly `uniqueCategoryCount`. The settings store's `roundsCount` is a "By Count" parameter. In By Category mode, `roundsCount` remains in the settings store but is not written to state and does not influence assignment. The review grid reads `perRoundExpected` from the redistribution output (see section 9) rather than from `settings.roundsCount`.

---

## 7. What `redistributeQuestions` Writes and Must Not Write

### Writes (conditionally — only when assignment changed)

| Field | Value |
|---|---|
| `state.questions` | New array, each element is a new object with updated `roundIndex` |

### Must NOT write — hard constraints

| Field | Reason |
|---|---|
| `state.settings.roundsCount` | Writing this is what `importQuestions` does — it is the feedback loop source |
| `state.settings.questionsPerRound` | Settings are owned by the settings store, not the game engine |
| `state.settings.*` (any settings field) | Settings are never touched by redistribution |
| `state.totalRounds` | Derived display value, not owned by this function |
| `state.selectedQuestionIndex` | Preserves user's current position in the question list |
| `state.displayQuestionIndex` | No question is on display during setup |
| `state.status` | Status transitions are owned by lifecycle functions |
| `state.teams` | Unrelated |
| `state.timer` | Unrelated |
| `state.currentRound` | Unrelated |

---

## 8. Edge Cases

### 8a. Zero questions (`state.questions.length === 0`)

Return `state` unchanged (same reference). No assignment to compute.

**Rationale:** The SetupGate effect fires when the dependency array `[questions, roundsCount, questionsPerRound]` changes. An empty array is a valid initial state (store initializes with `questions: []`). Short-circuiting here avoids producing a new object reference for no purpose.

### 8b. More rounds than questions (By Count mode)

Example: `questionsPerRound = 5`, questions.length = 3, roundsCount = 3.

`Math.floor(i / 5)` assigns all 3 questions to round 0. Rounds 1 and 2 have 0 questions. The engine does not pad or invent questions. The review grid shows rounds 1 and 2 as empty (amber/block state). `validateGameSetup` (V3 rule) will block game start until populated.

This is intentional: the engine surfaces the problem visually; it does not silently fix it.

### 8c. More rounds than categories (By Category mode)

Example: 3 unique categories but `uniqueCategoryCount = 3` produces rounds 0-2. If the UI reports `roundsCount = 5` from the settings store, rounds 3 and 4 are empty in the assignment. The review grid surfaces this. The engine does not synthesize phantom rounds.

### 8d. Categories with 0 questions (By Category mode)

Cannot occur by construction: the algorithm only discovers a `category` value if at least one question has it. A category with 0 questions is never in `categoryOrder` and never gets a round assignment.

### 8e. Single question, any mode

`Math.floor(0 / questionsPerRound) = 0`. By Category: only one category discovered, assigned to round 0. Both modes assign `roundIndex = 0`. If already `roundIndex = 0`, idempotent return.

### 8f. All questions in one category (By Category mode)

All questions assigned to round 0. Subsequent rounds are empty. Review grid surfaces this. Engine does not scatter within a category to fill rounds.

### 8g. Called during non-setup status

Return `state` unchanged (same reference). The guard at the top prevents redistribution during active gameplay, which would corrupt `roundIndex` values that scoring and navigation depend on.

---

## 9. Outputs for Upstream Consumers (SetupGate)

`redistributeQuestions` returns only `TriviaGameState`. SetupGate is responsible for computing any additional display data from the result, so these are **not return values of the function** but derived computations that SetupGate performs after calling it.

### `perRoundExpected: number[]`

An array of length equal to the number of rounds in play, where `perRoundExpected[i]` is the expected question count for round `i`.

- **By Count mode:** Every slot = `questionsPerRound` (the WizardStepReview amber threshold). Length = `roundsCount` (from settings store).
- **By Category mode:** Every slot = number of questions with the category assigned to round `i`. Length = `uniqueCategoryCount`.

### `perRoundBreakdown: Record<number, { count: number; categories: QuestionCategory[] }>`

Per-round summary for the Q1 category badge display. Keyed by `roundIndex`. Derived by scanning `state.questions` after redistribution.

Both `perRoundExpected` and `perRoundBreakdown` are the **same single pass** over `state.questions` — compute them together in SetupGate after calling `redistributeQuestions`.

---

## 10. Store Integration Pattern

The store action wraps the engine function exactly as other engine functions are wrapped in `game-store.ts`:

```typescript
// In GameStore interface (game-store.ts):
redistributeQuestions: (
  roundsCount: number,
  questionsPerRound: number,
  mode: 'by_count' | 'by_category'
) => void;

// In useGameStore create() body:
redistributeQuestions: (roundsCount, questionsPerRound, mode) => {
  set((state) => redistributeQuestionsEngine(state, roundsCount, questionsPerRound, mode));
},
```

Because `redistributeQuestionsEngine` returns `state` unchanged on idempotent calls, `set()` receives the same object reference. Zustand performs a shallow equality check and skips the update — no subscriber re-renders, no effect re-fires.

---

## 11. Effect Pattern in SetupGate (Summary)

The SetupGate effect that calls this action (Q3, Phase 1 decision):

```typescript
useEffect(() => {
  store.redistributeQuestions(roundsCount, questionsPerRound, isByCategory ? 'by_category' : 'by_count');
}, [questions, roundsCount, questionsPerRound]);
// Note: isByCategory intentionally in effect body, not dependency array.
// isByCategory changes trigger re-render of SetupGate which re-mounts, not re-runs this effect.
// (Or isByCategory IS in the dep array — implementation decides. Either way, engine idempotency
//  is the safety net, not the dep array composition.)
```

The effect fires when any of the three dependencies change. The idempotency check inside `redistributeQuestions` is the **only** mechanism preventing a feedback loop. There is no debounce, no equality check in the effect itself, and no guard on `settings.roundsCount` writes — because `redistributeQuestions` is contractually prohibited from writing settings fields.

---

## 12. Relationship to `importQuestions`

| | `importQuestions` | `redistributeQuestions` |
|---|---|---|
| Purpose | Load a new question set into game state | Remap existing questions to rounds |
| Input | External `Question[]` array | `state.questions` (already in state) |
| Writes `settings.roundsCount` | YES | NO (hard constraint) |
| Writes `totalRounds` | YES | NO (hard constraint) |
| Resets `selectedQuestionIndex` | YES (to 0) | NO |
| Status guard | `setup` only | `setup` only |
| Idempotent short-circuit | NO (always produces new state) | YES (must return same ref when unchanged) |
| Feedback loop safe | N/A (not called from effect) | YES (by design) |

They are not interchangeable and must not be composed. `redistributeQuestions` operates purely on the `roundIndex` fields of questions that are already in state.

---

## 13. File Placement

```
apps/trivia/src/lib/game/questions.ts     <- implementation lives here
apps/trivia/src/lib/game/engine.ts        <- add to barrel export
apps/trivia/src/stores/game-store.ts      <- store action wrapper + interface addition
```

The function belongs in `questions.ts` alongside `importQuestions`, `clearQuestions`, and the other question management functions. It is exported via the `engine.ts` barrel with the same pattern as all other engine functions.
