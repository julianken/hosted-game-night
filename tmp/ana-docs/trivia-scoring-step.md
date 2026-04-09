# Trivia: Scoring Step for Bar/Pub Trivia (Updated)

## Summary

Bar/pub trivia uses **per-round scoring**: the host reads all questions in a round, then teams write answers. After the round ends, the host reads the correct answers, and teams score each other (or self-score). The app needs to facilitate this digital flow where the facilitator collects one cumulative score per team per round.

The current system scores per-question (QuickScoreGrid), but there's a natural pivot point: the `round_summary` scene is where per-round scoring should happen. The app already computes round totals via `roundScores[currentRound]` — we just need a UI for the facilitator to **enter the total score per team for the round** rather than toggle individual questions.

---

## Complete Game Architecture

### Two-Layer State Model

1. **GameStatus** (5 states): `setup` → `playing` → `between_rounds` → `ended`
   - Orthogonal state layer — unchanged by per-round scoring
   - Controls what game phase we're in

2. **AudienceScene** (15 scenes): Controls what the audience display renders
   - Proposal: **INSERT NEW SCENE** for per-round scoring

### Current Scene Flow (Question-by-Question)

```
setup (waiting)
  → game_intro
  → round_intro
  → question_anticipation
  → question_display              (timer running, teams write answers)
  → question_closed               (TIME'S UP! — facilitator scores per-question)
  → [repeat: question_anticipation for next Q]
  
After last question in round:
  → round_summary                 (shows round score deltas)
  → recap_title                   (ROUND N RECAP)
  → recap_qa                      (host reads Q&A pairs, teams score papers)
  → recap_scores                  (full leaderboard)
  → [next round: round_intro]
```

### Proposed Scene Flow (Per-Round Bar Trivia)

Replace the per-question scoring model with a **single facilitator scoring step per round**:

```
setup (waiting)
  → game_intro
  → round_intro
  → question_anticipation
  → question_display              (timer running, teams write answers)
  → question_closed               (TIME'S UP! — answer shown, no scoring yet)
  → [repeat: question_anticipation for next Q]
  
After last question in round:
  → recap_title                   (ROUND N RECAP)
  → recap_qa                      (host reads all Q&A pairs)
                                  (during this: teams score their own papers or swap)
  → round_scoring                 (NEW — facilitator enters one total score per team)
  → round_summary                 (shows updated leaderboard + deltas)
  → recap_scores                  (full scoreboard display)
  → [next round: round_intro]
```

**Key change:** The facilitator does NOT score during `question_closed`. Instead:
1. Host reads answers during `recap_qa` (already exists, teams score)
2. Facilitator collects scores during new `round_scoring` scene
3. Scores are recorded as `roundScores[currentRound]` per team
4. Deltas are computed from `questionStartScores` (round start totals)

---

## State Machine Changes

### New Scene: `round_scoring`

**Type definition** (add to `apps/trivia/src/types/audience-scene.ts`):

```typescript
export type AudienceScene =
  // ... existing 15 scenes ...
  | 'round_scoring'     // NEW — facilitator enters per-team round scores
```

**Scene transition** (in `apps/trivia/src/lib/game/scene.ts` `getNextScene()`):

```typescript
case 'recap_qa':
  // From recap_qa: advance to round_scoring (new scoring step)
  if (trigger === 'advance' || trigger === 'skip') return 'round_scoring';
  if (trigger === 'next_round') {
    return isLastRound ? 'final_buildup' : 'round_intro';
  }
  return null;

case 'round_scoring':  // NEW
  // From round_scoring: advance to round_summary (display updated scores)
  if (trigger === 'advance') return 'round_summary';
  // N key: skip round_scoring, go directly to next round
  if (trigger === 'next_round') {
    return isLastRound ? 'final_buildup' : 'round_intro';
  }
  return null;
```

### State Field: `roundScoringInProgress`

Add a flag to track if facilitator is entering scores:

```typescript
// In TriviaGameState (types/index.ts)
roundScoringInProgress: boolean;  // Set when entering round_scoring scene
roundScoringEntries: Record<string, number>; // { teamId: enteredScore }
```

---

## Facilitator Scoring UI Design

### Scene: `round_scoring` (Presenter View)

```
┌──────────────────────────────────────────────────────┐
│  ROUND 2 SCORING                                     │
│──────────────────────────────────────────────────────│
│                                                      │
│  Enter the total score for each team:                │
│                                                      │
│  ┌─────────────┬──────────┐                          │
│  │ Team        │ Score    │                          │
│  ├─────────────┼──────────┤                          │
│  │ Table 1     │ [5 ▲▼]   │  ← click or type        │
│  │ Table 2     │ [3 ▲▼]   │                          │
│  │ Table 3     │ [4 ▲▼]   │                          │
│  │ Table 4     │ [  ]     │                          │
│  │ Table 5     │ [  ]     │                          │
│  └─────────────┴──────────┘                          │
│                                                      │
│  Progress: 3/5 teams entered                         │
│                                                      │
│  [Clear]  [Done] →                                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Features:**
- Team list in current score order (highest first)
- Input field for each team (number spinner or text input)
- Progress counter: "X/N teams entered"
- [Clear] button to reset all entries
- [Done] button (or press Enter) to advance
- Undo support (Ctrl+Z) for last entry
- Large touch targets (min 44x44px)
- Team accent colors via `getTeamColor()`

**Implementation location:**
- New component: `apps/trivia/src/components/presenter/RoundScoringPanel.tsx`
- New scene display: `apps/trivia/src/components/audience/scenes/RoundScoringScene.tsx`

### Scene: `round_scoring` (Audience View)

Minimal, non-distracting:

```
┌────────────────────────────┐
│                            │
│   SCORING IN PROGRESS      │
│                            │
│   Round 2 · Collecting     │
│        Team Scores         │
│                            │
│   ░░░░░░░░░░░░░░░░  3/5   │
│                            │
└────────────────────────────┘
```

Or show the scoreboard in read-only mode (no animations), so teams can see who's ahead while facilitator enters scores.

---

## Data Flow: Score Recording

### Current Flow (Per-Question)

1. Timer expires → `question_closed` scene
2. Presenter uses QuickScoreGrid (1-9 keys) to toggle teams
3. Each toggle calls `adjustTeamScore(teamId, ±1)`
4. This modifies `teams[i].roundScores[currentRound]`
5. When last question closes → auto-advance to `round_summary`
6. Side effect in `scene-transitions.ts`: compute `scoreDeltas` from `questionStartScores`

### Proposed Flow (Per-Round)

1. Last question closes → presenter skips to recap flow
2. `recap_qa` scene: host reads answers, teams score on paper
3. Presenter presses → to advance to new `round_scoring` scene
4. Presenter enters total score for each team
5. On [Done], system applies all scores at once:
   - For each team: `setTeamRoundScore(teamId, roundIndex, enteredScore)`
   - Compute `scoreDeltas` from `questionStartScores`
6. Scene auto-advances to `round_summary`
7. Audience sees updated leaderboard

### Key Functions to Wire

From `apps/trivia/src/lib/game/scoring.ts`:

- **`setTeamRoundScore(state, teamId, roundIndex, score)`** (lines 62-86)
  - Already exists! Sets `roundScores[roundIndex]` for a specific round
  - Recomputes total score from all roundScores
  - Already returns frozen state

- **`computeScoreDeltas(teams, previousScores)`** (lines 214-239)
  - Computes rank changes and point deltas
  - Called in `scene-transitions.ts` when `question_closed` → `round_summary`
  - Will be called again when `round_scoring` → `round_summary`

### Store Action: `setRoundScores(scoresMap)`

New store action needed in `game-store.ts`:

```typescript
setRoundScores: (teamScoresMap: Record<string, number>) => {
  set((state) => {
    let newState = state;
    for (const [teamId, score] of Object.entries(teamScoresMap)) {
      newState = setTeamRoundScore(newState, teamId, state.currentRound, score);
    }
    // Compute deltas for the round
    const prevScores = state.questionStartScores ?? {};
    const deltas = computeScoreDeltas(newState.teams, prevScores);
    return {
      ...newState,
      scoreDeltas: [...deltas],
      roundScoringInProgress: false,
      roundScoringEntries: {},
    };
  });
}
```

---

## Side Effects & Scene Transitions

### From `scene-transitions.ts` `applyTransitionSideEffects()`

**When entering `round_scoring`:**

```typescript
if (nextScene === 'round_scoring') {
  return {
    ...buildSceneUpdate(nextScene),
    roundScoringInProgress: true,
    roundScoringEntries: {}, // Clear any previous entries
  };
}
```

**When leaving `round_scoring` → `round_summary`:**

The store action `setRoundScores()` handles this:
- Applies all entered scores to teams
- Computes scoreDeltas
- Returns state with `roundScoringInProgress: false`

---

## Facilitator UI Integration

### Presenter View (`apps/trivia/src/app/play/page.tsx`)

Current scoring code (lines 167-172):

```typescript
/** Scoring-phase scenes where QuickScoreGrid should appear (T3.6) */
const isScoringScene = (
  audienceScene === 'question_closed' ||
  audienceScene === 'answer_reveal' ||
  audienceScene === 'round_summary'
);
```

**New version:**

```typescript
/** Per-question scoring (T3.6) */
const isQuestionScoringScene = (
  audienceScene === 'question_closed' ||
  audienceScene === 'answer_reveal'
);

/** Per-round scoring (NEW) */
const isRoundScoringScene = audienceScene === 'round_scoring';

// Show QuickScoreGrid only for per-question phases
// (in a bar trivia mode, could be disabled entirely)
if (isQuestionScoringScene && !useBarTrivia) {
  <QuickScoreGrid teams={game.teams} quickScore={quickScore} />
}

// Show RoundScoringPanel during round_scoring phase
if (isRoundScoringScene) {
  <RoundScoringPanel teams={game.teams} onDone={handleRoundScoresSubmitted} />
}
```

### Conditional Rendering

To support both **per-question** (current) and **per-round** (bar trivia) modes:

1. Add a settings flag: `barTriviaMode: boolean` (in `GameSettings`)
2. If `barTriviaMode`:
   - Hide `QuickScoreGrid` during `question_closed`
   - Enable `round_scoring` scene in state machine
3. If not `barTriviaMode`:
   - Use existing `question_closed` scoring flow
   - Skip `recap_qa` → go directly to `round_summary`

---

## Reconciliation with Existing Data Structures

### `roundScores` (per-team, per-round)

```typescript
// In Team type (types/index.ts, line 145)
roundScores: number[];  // Index = roundIndex, value = score for that round
```

**Current usage:**
- Per-question scoring: increments `roundScores[currentRound]` each time a team is toggled
- Sum of all `roundScores[i]` = `team.score` (total game score)

**With per-round scoring:**
- The facilitator enters the entire `roundScores[currentRound]` value at once
- No per-question accumulation; the total is manually entered
- Sum remains: `team.score = roundScores.reduce((a, b) => a + b, 0)`

**API used:** `setTeamRoundScore(state, teamId, roundIndex, score)` ✓ Already exists

### `questionStartScores` (baseline for delta computation)

```typescript
// In TriviaGameState (types/index.ts)
questionStartScores: Record<string, number>;  // Snapshot at round start
```

**Current usage:**
- Set at game start (line 90 in `lifecycle.ts`)
- Used in `computeScoreDeltas()` to diff final vs. initial scores
- Reset each new round? **CHECK: Does it get reset?** Looking at `nextRound()` in `rounds.ts`...

**From `rounds.ts` (lines 30-50+):**
```typescript
export function nextRound(state: TriviaGameState): TriviaGameState {
  // ... status transition ...
  // Snapshot scores at the START of the new round
  const roundStartScores: Record<string, number> = {};
  for (const t of state.teams) {
    roundStartScores[t.id] = t.score;  // Current total = baseline for this round
  }
  return {
    ...state,
    questionStartScores: roundStartScores,
    // ... advance round ...
  };
}
```

**Perfect.** `questionStartScores` is reset to current totals each round. When `round_scoring` applies the round score, `computeScoreDeltas()` will show the delta for just that round. ✓

---

## QuickScoreGrid (Current Per-Question Model)

### Implementation (`apps/trivia/src/components/presenter/QuickScoreGrid.tsx`)

- **Lines 36-180:** Toggle-based UI for per-question scoring
- Each button maps to team (1-9 keys, 0 for 10th)
- Shows "3/6 scored" progress
- Undo button with Ctrl+Z support

### Hook (`apps/trivia/src/hooks/use-quick-score.ts`)

- **Lines 50-125:** Per-question state tracking
- `scoredTeamIds: Set<string>` — teams scored THIS question
- Resets when `selectedQuestionIndex` changes (line 59)
- Each toggle calls `adjustTeamScore(teamId, ±1)`
- Undo via history stack

### What This Means for Bar Trivia

If we want to **disable** per-question scoring and use **per-round only**:

1. Don't render `QuickScoreGrid` when `barTriviaMode` is true
2. Remove the per-question scoring logic from `question_closed` scene
3. Skip directly to `recap_qa` after last question closes
4. Use the new `RoundScoringPanel` instead

Or, if we want to **support both modes**:

1. Keep `QuickScoreGrid` in code
2. Conditionally render based on `barTriviaMode`
3. Conditionally enable `round_scoring` scene in state machine

---

## Key Files & Line Numbers

| File | Lines | Purpose |
|------|-------|---------|
| `apps/trivia/src/types/audience-scene.ts` | 32-62 | AudienceScene type — ADD `round_scoring` |
| `apps/trivia/src/lib/game/scene.ts` | 172-303 | Scene state machine `getNextScene()` — ADD transitions for `round_scoring` |
| `apps/trivia/src/lib/game/scene-transitions.ts` | 217-351 | Side effects `applyTransitionSideEffects()` — ADD `round_scoring` entry side effect |
| `apps/trivia/src/lib/game/scoring.ts` | 62-86 | `setTeamRoundScore()` — ALREADY EXISTS, use this ✓ |
| `apps/trivia/src/lib/game/scoring.ts` | 214-239 | `computeScoreDeltas()` — ALREADY EXISTS, call when round scores set ✓ |
| `apps/trivia/src/lib/game/lifecycle.ts` | 59-92 | `startGame()` — initializes `questionStartScores` ✓ |
| `apps/trivia/src/lib/game/rounds.ts` | 30-50+ | `nextRound()` — resets `questionStartScores` each round ✓ |
| `apps/trivia/src/stores/game-store.ts` | 52-105 | GameStore interface — ADD `setRoundScores` action |
| `apps/trivia/src/stores/game-store.ts` | 107-371 | Store implementation — ADD `setRoundScores` logic |
| `apps/trivia/src/components/presenter/QuickScoreGrid.tsx` | 1-180 | Current per-question UI — conditional render if `!barTriviaMode` |
| `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` | — | NEW component — facilitator enters total per team ✓ |
| `apps/trivia/src/components/audience/scenes/RoundScoringScene.tsx` | — | NEW scene display — audience sees "Scoring in progress..." ✓ |
| `apps/trivia/src/app/play/page.tsx` | 30-200+ | Presenter view — conditional rendering of scoring panels |
| `apps/trivia/src/types/index.ts` | 140-146 | Team type — `roundScores` already exists ✓ |
| `apps/trivia/src/types/index.ts` | 150-170 | GameSettings type — ADD `barTriviaMode?: boolean` (optional) |

---

## Summary of Changes

### New Scene: `round_scoring`
- Fits between `recap_qa` and `round_summary`
- Presenter enters one total score per team
- Audience sees "Scoring in progress..." minimally

### State Machine Updates
- Add `round_scoring` to AudienceScene type
- Add transitions: `recap_qa` → `round_scoring` → `round_summary`
- Add side effect for entering `round_scoring` (clear entries, set flag)

### New Store Action: `setRoundScores(teamScoresMap)`
- Applies multiple round scores atomically
- Computes scoreDeltas
- Clears scoring state

### New UI Components
- `RoundScoringPanel.tsx` — facilitator input for round totals
- `RoundScoringScene.tsx` — audience display (minimal)

### Integration Points
- Conditional render in `/play` based on `barTriviaMode` flag
- Optional: disable `QuickScoreGrid` when using per-round mode
- Reuse: `setTeamRoundScore()`, `computeScoreDeltas()`, `questionStartScores`

---

## Design Decisions Made

1. **Per-round (not per-question):** Bar trivia flow is naturally round-based. Teams write answers, host reads them, then one score per team is entered. ✓

2. **Recap before scoring:** `recap_qa` comes before `round_scoring` so teams can score their own papers while hearing answers. ✓

3. **Automatic delta computation:** Use existing `computeScoreDeltas()` when scores are entered, so `round_summary` shows round-over-round progress. ✓

4. **Reuse existing data structures:** `setTeamRoundScore()` and `roundScores` already support per-round totals. ✓

5. **Conditional feature flag:** Support both per-question and per-round modes via optional `barTriviaMode` setting. Allows gradual rollout. ✓

6. **Facilitator input focus:** One score per team avoids ambiguity (vs. marking individual questions right/wrong, which teams already did on paper). ✓

---

## Next Steps (Implementation Order)

1. **Define the scene** (20 min)
   - Add `round_scoring` to AudienceScene type
   - Add scene timing constant (indefinite)
   - Add to VALID_SCENES_BY_STATUS

2. **Add state machine transitions** (20 min)
   - Wire `recap_qa` → `round_scoring` → `round_summary` in `getNextScene()`
   - Add side effect in `applyTransitionSideEffects()`

3. **Add store action** (15 min)
   - Implement `setRoundScores()` in game-store
   - Wire it to call `setTeamRoundScore()` + `computeScoreDeltas()`

4. **Create facilitator UI** (60 min)
   - `RoundScoringPanel.tsx` — number inputs, undo, done button
   - Integrate into `/play` page
   - Hook up keyboard support (Esc to cancel, Enter/Tab to advance)

5. **Create audience UI** (30 min)
   - `RoundScoringScene.tsx` — minimal progress display

6. **E2E test** (30 min)
   - Test per-round flow: recap → scoring → summary
   - Verify scoreDeltas computed correctly
   - Verify audience sees updated leaderboard

7. **Optional: Settings integration** (20 min)
   - Add `barTriviaMode` to GameSettings
   - Conditionally enable/disable per-question vs per-round UI

---

## Open Questions

1. **Should per-question scoring (QuickScoreGrid) be disabled entirely in bar trivia mode?**
   - Pro: Simpler, cleaner UX for bar trivia facilitators
   - Con: Removes flexibility for hybrid scenarios (some questions scored per-question, some per-round)
   - **Recommendation:** Start with per-round only. QuickScoreGrid stays in code but doesn't render.

2. **Should teams be able to enter scores directly (on tablets)?**
   - Pro: Decentralizes scoring, reduces facilitator burden
   - Con: More complex, requires per-team auth/access control
   - **Recommendation:** Facilitator-only for MVP. Teams score on paper.

3. **Should the audience see a real-time scoreboard during `round_scoring`?**
   - Pro: Transparent, fun (teams see where they stand)
   - Con: Might reveal incomplete/wrong scores mid-entry
   - **Recommendation:** Show read-only scoreboard of previous rounds + current team list in order. Don't show new scores until [Done].

4. **What if a facilitator enters the wrong score?**
   - Current UX: Undo button for QuickScoreGrid
   - Bar trivia: Undo could clear an entry, or allow re-entry
   - **Recommendation:** Ctrl+Z to undo last entry. Long-press or "Edit" button to change a submitted entry.

---

## References

- **Scene engine:** `CLAUDE.md` / Architecture Notes / Scene Engine
- **Scoring:** `apps/trivia/src/lib/game/scoring.ts` (functions already exist!)
- **Flow:** `apps/trivia/src/lib/game/scene.ts` + `scene-transitions.ts`
- **Existing per-round support:** `roundScores` array on Team, `setTeamRoundScore()` in scoring.ts
