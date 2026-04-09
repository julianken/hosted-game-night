# Area 1: Component Architecture — `round_scoring` Center Panel Redesign

## Investigation Summary

Files read:
- `apps/trivia/src/app/play/page.tsx` (603 lines)
- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` (312 lines)
- `apps/trivia/src/components/presenter/RoundSummary.tsx` (117 lines)
- `apps/trivia/src/components/presenter/QuestionDisplay.tsx` (170 lines)
- `apps/trivia/src/types/index.ts` — `TriviaGameState`, `Team`, `Question` shapes
- `apps/trivia/src/hooks/use-game.ts` — confirmed `currentRoundQuestions`, `roundWinners`, `overallLeaders`, `teamsSortedByScore`, `isLastRound` are all already exposed on the `game` object

---

## Current Layout Anatomy

The play page renders a fixed-viewport 3-column layout (`h-screen flex flex-col overflow-hidden`):

```
| LEFT RAIL (w-64)     | CENTER (flex-1)          | RIGHT SIDEBAR (w-80)         |
| QuestionList         | QuestionDisplay          | TeamManager (always)         |
|                      | SceneNavButtons          | QuickScoreGrid (isScoringScene && !roundScoring) |
|                      | NextActionHint           | RoundScoringPanel (isRoundScoringScene) |
|                      | KeyboardShortcuts        | TeamScoreInput (other scenes) |
|                      | ThemeSelector            |                              |
|                      | SettingsPanel (toggle)   |                              |
|                      | RoundSummary (overlay)   |                              |
```

### Exact conditional rendering points

**Right sidebar — lines 512–544 of page.tsx:**

```tsx
// QuickScoreGrid: playing/between_rounds + scoring scene + NOT round_scoring
{(game.status === 'playing' || game.status === 'between_rounds') && isScoringScene && !isRoundScoringScene && (
  <QuickScoreGrid ... />
)}

// RoundScoringPanel: between_rounds + round_scoring scene ONLY
{game.status === 'between_rounds' && isRoundScoringScene && (
  <RoundScoringPanel ... />
)}

// TeamScoreInput: playing/between_rounds + not scoring scene + not round_scoring
{(game.status === 'playing' || game.status === 'between_rounds') && !isScoringScene && !isRoundScoringScene && (
  <TeamScoreInput ... />
)}
```

**Center panel — no `round_scoring`-specific conditional exists today.** QuestionDisplay always renders during gameplay regardless of `audienceScene`. The stale question is visible to the presenter while the sidebar has the scoring panel — there is no center-panel branch for `isRoundScoringScene`.

**`isScoringScene` (line 170):**
```ts
const isScoringScene = (
  audienceScene === 'question_closed' ||
  audienceScene === 'answer_reveal' ||
  audienceScene === 'round_summary'
);
```

Note: `round_scoring` is intentionally excluded from `isScoringScene`. It has its own `isRoundScoringScene` flag (line 177).

---

## RoundScoringPanel: Component API and State Profile

**Props:**
```ts
interface RoundScoringPanelProps {
  teams: Team[];
  currentRound: number;
  onSubmitScores: (scores: Record<string, number>) => void;
  onProgressChange?: (entries: Record<string, number>) => void;
}
```

**Local state (remount-sensitive):**
- `entries: Record<string, number | null>` — one slot per team, initialized from `teams` prop
- `undoStack: UndoEntry[]` — stack of `{ teamId, previousValue }` pairs
- `inputRefs` — `useRef` map of DOM input elements per team

**Key behaviors:**
- `entries` initializes lazily from `teams` in `useState(() => {...})` — a remount resets all inputs to null
- `undoStack` is local-only — a remount destroys all undo history
- A global `keydown` listener for Ctrl+Z is registered in `useEffect` — survives as long as the component is mounted
- Inputs support Enter-to-advance focus traversal via `inputRefs`

**Remount cost:** High. The facilitator may have partially entered scores when any layout change causes a remount. Losing `entries` mid-entry forces re-entry of all scores. The component has no external state persistence for `entries` — it is purely local React state.

---

## RoundSummary: Reusability Assessment

RoundSummary is an informational display component for standings. It renders:
- Round/final header + round winners badge
- Compact `teamsSortedByScore` standings (max 5 + overflow count)
- Action buttons: Back to Game, Review Answers (optional), Next Round / End Game

It accepts no scoring-input state. It is safe to conditionally mount/unmount without consequence. Its `onNextRound`, `onReviewAnswers`, and `onClose` callbacks are pure handler props.

The standings row format (`flex-wrap gap-2`, rank badges) is reusable as a sub-component but is currently not extracted — it is inlined in RoundSummary's JSX.

---

## Available Data for a Round Question Recap

The `game` object from `useGame()` already exposes:
- `game.currentRoundQuestions: Question[]` — questions for the current round (via `getCurrentRoundQuestions` engine helper)
- `game.currentRound: number` — 0-based round index
- `game.teams: Team[]` — includes `roundScores: number[]` per team
- `game.teamsSortedByScore: Team[]`
- `game.roundWinners: Team[]`

`Question` has `correctAnswers: string[]`, `text`, `options`, `optionTexts`, `category`, and optional `explanation`.

No additional store selectors need to be added to support a question recap display.

---

## Options

### Option A: Conditionally replace QuestionDisplay with a new `RoundScoringView` component

**What renders where:**

- Center panel: A new `RoundScoringView` component renders during `round_scoring`, replacing the `QuestionDisplay` + keyboard shortcuts + theme blocks
- Right sidebar: `RoundScoringPanel` stays in its current position (w-80 sidebar, unchanged)
- `RoundScoringView` shows: round question list with correct answers revealed (using `game.currentRoundQuestions`), current standings summary (reusing the standings row pattern from RoundSummary), and a contextual label like "Scoring in progress..."

**Files that change:**
- `apps/trivia/src/app/play/page.tsx` — add `isRoundScoringScene` branch in center panel `<main>`; no sidebar changes
- `apps/trivia/src/components/presenter/RoundScoringView.tsx` — new component (created)

**Remount risk for RoundScoringPanel state:** None. The panel stays in the sidebar at the same DOM position. No remount occurs. `entries` and `undoStack` are preserved for the full duration of the `round_scoring` scene.

**Tradeoffs:**
- Low risk: sidebar layout is untouched, no remount hazard
- The 320px sidebar still constrains the scoring input UX — small inputs in a narrow column
- RoundScoringView in the center gives the facilitator contextual reference (correct answers) while entering scores
- New component is purely presentational with no state — easy to test and iterate
- The center panel already scrolls (`overflow-y-auto`) so a tall question list fits naturally

---

### Option B: Move RoundScoringPanel to center, keep sidebar for TeamManager only

**What renders where:**

- Center panel: `RoundScoringPanel` renders during `round_scoring` instead of `QuestionDisplay`; question recap can be embedded above or below the panel within the same center region
- Right sidebar: `TeamManager` only during `round_scoring` (QuickScoreGrid and TeamScoreInput already hidden)

**Files that change:**
- `apps/trivia/src/app/play/page.tsx` — add `isRoundScoringScene` branch in `<main>`; remove `RoundScoringPanel` from sidebar conditional; move its JSX to center panel
- No new components required

**Remount risk for RoundScoringPanel state:** High risk if not handled correctly. Moving `RoundScoringPanel` from one JSX tree position to another causes React to unmount and remount the component — React's reconciliation is position-keyed in the component tree. To avoid this, either:
  - Use a `key` prop that stays stable across positions (React will still remount on tree position change regardless of `key`)
  - Lift `entries` and `undoStack` state up to the page component and pass them as controlled props (requires converting RoundScoringPanel to a controlled component)
  - Store `entries` in Zustand (`roundScoringEntries` already exists in `TriviaGameState` and is already synced via `updateRoundScoringProgress`) — the panel could initialize from store state on mount

The store already has `roundScoringEntries: Record<string, number>` and `roundScoringInProgress: boolean`. However `undoStack` is not stored anywhere — that history would be lost on any remount.

**Tradeoffs:**
- Larger input area for RoundScoringPanel (flex-1 center vs. w-80 sidebar) — more ergonomic for 6+ teams
- Requires either a state-lift refactor or accepting that undo history is lost if any intermediate remount occurs
- Simpler file change count (one file, no new component) but higher internal complexity
- The center panel's `overflow-y-auto` handles tall team lists naturally

---

### Option C: Expand the sidebar temporarily; center shows inline recap only

**What renders where:**

- Right sidebar: During `round_scoring`, the sidebar switches to a wider `w-[480px]` or uses a two-column sub-layout (team scoring inputs left, standings right) via CSS grid
- Center panel: A lightweight `RoundQuestionRecap` component renders — read-only question+answer list for the current round, no interactive elements
- Left rail: QuestionList is still visible (navigator context), which may be useful if the facilitator needs to reference a specific question while scoring

**Files that change:**
- `apps/trivia/src/app/play/page.tsx` — conditionally apply wider class to the right `<aside>` during `round_scoring`; add center-panel branch with `RoundQuestionRecap`
- `apps/trivia/src/components/presenter/RoundQuestionRecap.tsx` — new component (created, read-only)
- Right sidebar JSX: `RoundScoringPanel` stays in place (no remount risk), sidebar gets width token change

**Remount risk for RoundScoringPanel state:** None — same tree position, same DOM element, React reuses the instance. Only the container's CSS class changes.

**Tradeoffs:**
- No state risk at all — panel never moves
- Dynamic sidebar width is the smallest possible footprint change
- The wider sidebar can use a two-column layout internally: team inputs (60%) + running totals/rank (40%)
- Slightly unusual layout behavior — sidebar expands during one specific scene, which could look jarring without transition
- Requires a CSS transition (`transition-[width]`) on the aside element to avoid a hard jump
- The `w-80 flex-shrink-0` class on the sidebar is hardcoded inline — it would need to become a conditional class expression

---

## Recommendation

**Option A is the lowest-risk path** given the remount hazard in Option B and the layout jank risk in Option C.

The key architectural insight is that `RoundScoringPanel`'s local state (`entries`, `undoStack`) is the primary design constraint. Anything that causes a remount mid-session discards partial score entries, which is a significant UX failure during a live game. Option A never touches the panel's position in the component tree.

Option A also creates the right separation: the center panel becomes a contextual reference surface (what were the questions? what are the correct answers?) while the sidebar remains the facilitator's action surface (enter scores). This mirrors the existing split between center (question context) and sidebar (team actions) that the layout already establishes for all other scenes.

If the 320px scoring panel is genuinely too narrow for large team counts (6+ teams), the right follow-up is to extract `entries` state into Zustand (using the existing `roundScoringEntries` field) and then safely move the panel to the center in a subsequent pass — after state is no longer remount-sensitive.

**Option C** is a reasonable alternative if the goal is purely to add the question recap without any layout shift risk. It has zero remount hazard and the smallest diff.

**Option B should be deferred** until `entries` state is lifted to the store or RoundScoringPanel is converted to a fully controlled component.

---

## Open Questions for the Implementer

1. Should `RoundScoringView` (Option A center content) show the full question text and all options, or only the question text + correct answer(s)? The `Question.explanation` field is available but not currently surfaced anywhere in the presenter view.
2. Should the correct-answer display in the recap use the same `peekAnswer` gating pattern, or is `round_scoring` an always-revealed context where answers are shown unconditionally?
3. The `RoundSummary` overlay (`showRoundSummary` state) can appear in the center panel simultaneously with any center content during `between_rounds`. Does the `RoundScoringView` need to account for this overlap, or does the overlay always take full-column precedence via its `mt-4` block?
4. Is there a desired ordering for `RoundScoringView` content — standings first (motivates accurate scoring) or question recap first (reference while entering)?
