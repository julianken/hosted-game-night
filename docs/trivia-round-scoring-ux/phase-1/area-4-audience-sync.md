# Investigation: Audience Display & Sync During round_scoring

## Summary

The sync path is completely independent of presenter layout — it runs through the store, not through any presenter UI structure. `RoundScoringPanel` calls `onProgressChange` → `store.updateRoundScoringProgress(entries)` → Zustand subscriber detects change → BroadcastChannel broadcasts full `TriviaGameState` → audience `_hydrate` receives it → `RoundScoringScene` reads `roundScoringEntries` and renders a live progress bar. Moving `RoundScoringPanel` from sidebar to center panel changes nothing in the sync path.

## Key Findings

### Finding 1: `roundScoringEntries` is a first-class field in sync payload
- **Evidence:** `use-sync.ts:82` — `storeToGameState()` explicitly maps `roundScoringEntries: state.roundScoringEntries`. TypeScript return type annotation ensures compile error if field is omitted.
- **Confidence:** High
- **Implication:** Every keystroke that changes entries is automatically included in next STATE_UPDATE broadcast.

### Finding 2: Sync is triggered by Zustand store subscription, not UI events
- **Evidence:** `use-sync.ts:290-298` — `useGameStore.subscribe((state, prevState) => { if (state !== prevState) { sync.broadcastState(storeToGameState(state)); } })`.
- **Confidence:** High
- **Implication:** Panel DOM location is irrelevant to sync. Path is: panel → store action → Zustand → subscriber → BroadcastChannel → audience store.

### Finding 3: `updateRoundScoringProgress` is a trivial one-liner
- **Evidence:** `game-store.ts:252-254` — `set({ roundScoringEntries: entries })`. No validation or transformation.
- **Confidence:** High

### Finding 4: Audience `RoundScoringScene` renders live progress bar
- **Evidence:** `RoundScoringScene.tsx:15-17` — reads `roundScoringEntries` from store. `enteredCount / totalTeams` renders progress bar.
- **Confidence:** High
- **Implication:** Audience shows real-time "X/N teams scored" as presenter types.

### Finding 5: SceneRouter routes `round_scoring` → `RoundScoringScene` unconditionally
- **Evidence:** `SceneRouter.tsx:134-135` — `case 'round_scoring': return <RoundScoringScene />;`
- **Confidence:** High

### Finding 6: `_hydrate` passes `roundScoringEntries` through spread
- **Evidence:** `game-store.ts:307-309` — `{ ...state, ...newState }`. Plain Record passes through without special handling.
- **Confidence:** High

### Finding 7: No sidebar-specific state in audience display
- **Evidence:** Audience components only consume store fields. No reference to presenter layout structure, sidebar width, or component positioning.
- **Confidence:** High
- **Implication:** Sidebar removal has zero audience display impact.

## Surprises
- `RoundScoringPanel` fires `onProgressChange` on every React render triggered by entries change — rapid keystroke broadcasts are deduped by BroadcastChannel's 100ms window
- Audience `RoundScoringScene` renders even before any scores are entered (0/N progress bar)
- Panel remount (from layout change) safely re-initializes from `team.roundScores[currentRound]` and re-syncs entries

## Unknowns & Gaps
- Panel remount during layout change: one-render flash of stale `roundScoringEntries` until effect fires (cosmetic, not functional)
- Late-joining displays handled correctly via REQUEST_SYNC → STATE_UPDATE handshake
