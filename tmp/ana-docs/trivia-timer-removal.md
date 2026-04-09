# Trivia: Remove Timer from Display UI

## Summary

The timer appears in the bottom-right of the audience/display view as a circular countdown with color-coded urgency. It's safe to remove from the display — the timer drives game logic (auto-reveal) independently of its visual rendering.

## Timer Architecture

### Type Definition (`apps/trivia/src/types/index.ts`)
```typescript
interface Timer {
  duration: number;      // Total duration in seconds
  remaining: number;     // Time remaining
  isRunning: boolean;    // Currently counting down
}
```

### Core Files

| File | Purpose | Critical? |
|------|---------|-----------|
| `apps/trivia/src/lib/game/timer.ts` | Pure functions: tickTimer, startTimer, stopTimer, resetTimer | YES - core engine |
| `apps/trivia/src/hooks/use-timer-auto-reveal.ts` | Monitors timer→0 and calls `advanceScene('auto')` | YES - drives scene flow |
| `apps/trivia/src/stores/game-store.ts` | Zustand store wrapper | YES |
| `apps/trivia/src/hooks/use-game-keyboard.ts` (lines 236-267) | T key starts timer, S key stops | YES |

### Display Rendering

| File | Lines | What it does |
|------|-------|-------------|
| `apps/trivia/src/app/display/page.tsx` | 143-147 | Renders `AudienceTimerDisplay` when `timer.isRunning` |
| `apps/trivia/src/components/audience/AudienceTimerDisplay.tsx` | all | Circular SVG progress ring, color-coded (green->amber->red), "TIME!" announcement |
| `apps/trivia/src/components/audience/AudienceTimer.tsx` | all | Alternate timer component (currently unused) |

### Presenter Rendering

| File | What it does |
|------|-------------|
| `apps/trivia/src/components/presenter/TimerDisplay.tsx` | Start/Stop/Reset controls with progress bar |

## Two Distinct Purposes

The timer serves **two independent purposes**:

1. **Visual feedback** for the audience (the circular countdown on display) — purely presentational
2. **Game logic driver** for auto-advancing scenes — `use-timer-auto-reveal.ts` monitors `timer.remaining` transitioning to 0 and calls `advanceScene('auto')` to move from `question_display` -> `question_closed`

Removing #1 does NOT affect #2.

## Is It Safe to Remove from Display?

**YES.** Removing `AudienceTimerDisplay` from `display/page.tsx` is purely visual. The timer will continue to:
- Tick down in the Zustand store
- Auto-close questions when it hits 0
- Respond to T/S keyboard shortcuts from the presenter
- Sync state via BroadcastChannel

## Suggested Approach

### Simple removal (recommended)

1. In `apps/trivia/src/app/display/page.tsx`:
   - Remove the `AudienceTimerDisplay` import (line 12)
   - Remove the rendering block (lines 143-147)
2. Update/remove tests in `apps/trivia/src/components/audience/__tests__/AudienceTimerDisplay.test.tsx` if desired
3. Optionally delete `AudienceTimerDisplay.tsx` and `AudienceTimer.tsx` if no longer needed anywhere

### Other files referencing timer (no changes needed)

- `apps/trivia/src/components/audience/scenes/SceneRouter.tsx` — passes `timerIsRunning` to `QuestionDisplayScene`
- `apps/trivia/src/components/audience/scenes/QuestionDisplayScene.tsx` — receives `answersEnabled` (tied to timer)
- `apps/trivia/src/components/audience/index.ts` — exports timer components
- Tests: `use-timer-auto-reveal.test.ts`, `TimerDisplay.test.tsx`, `SceneRouter.test.tsx`
