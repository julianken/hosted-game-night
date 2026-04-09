# Iterator 3: RoundScoringView Component Design

## Assignment
Design the new `RoundScoringView` component for the center panel during `round_scoring`.

## Proposed Component API

```typescript
// No props — reads all data from useGame() hook
export function RoundScoringView(): React.ReactNode
```

**Rationale:** Unlike RoundScoringPanel (which needs submission callbacks), this is display-only. Using `useGame()` directly avoids prop drilling and keeps it decoupled from page.tsx.

## Data Sources (all from `useGame()`)

| Data | Source | Notes |
|------|--------|-------|
| Round questions | `game.currentRoundQuestions` | `Question[]` for current round |
| Correct answers | `question.correctAnswers` | Always revealed during `round_scoring` |
| Team standings | `game.teamsSortedByScore` | Sorted by cumulative score |
| Category | `question.category` | For visual organization |
| Explanation | `question.explanation` | Optional per-question |
| Round number | `game.currentRound` | 0-based; display as +1 |

No store changes or new selectors needed — all data already available.

## Layout

```
┌────────────────────────────────────────────────┐
│  Round N — Scoring                    (header) │
│  "Enter scores using the panel on the right"   │
│                                                │
│  ┌─ QUESTIONS ────────────────────────────────┐│
│  │ 1. Question text...         Correct: [A]   ││
│  │    Category badge   Explanation (if any)    ││
│  │                                            ││
│  │ 2. Question text...         Correct: [True]││
│  │    ...                                     ││
│  └────────────────────────────────────────────┘│
│                                                │
│  ┌─ STANDINGS ────────────────────────────────┐│
│  │ 1. Team Alpha  420  2. Team Bravo  390     ││
│  │ 3. Team Charlie 350  ...                   ││
│  └────────────────────────────────────────────┘│
│                                                │
│  "Digit-key scores are saved. Right → to skip" │
└────────────────────────────────────────────────┘
```

## Reusable Patterns

| Pattern | Source | Reuse |
|---------|--------|-------|
| Standings row layout | `RoundSummary.tsx` lines 59-81 | Flex-wrap badges with rank |
| Category badge | Existing Tailwind patterns | `px-2 py-1 rounded text-xs bg-muted` |
| Winner highlight | `RoundSummary.tsx` line 68 | `bg-yellow-500/20 border-yellow-500/30` |
| Container style | Center panel existing | `bg-surface border border-border rounded-xl p-4 shadow-md` |

## Integration Point in page.tsx

At lines ~389-402, replace the unconditional QuestionDisplay with a conditional:

```tsx
{isRoundScoringScene ? (
  <div className="bg-surface border border-border rounded-xl p-4 shadow-md mb-3">
    <RoundScoringView />
  </div>
) : (
  <div className="bg-surface border border-border rounded-xl p-4 shadow-md mb-3">
    <QuestionDisplay ... />
  </div>
)}
```

`isRoundScoringScene` already defined at line 177. No new state or props needed.

## Accessibility

- `role="region"` with `aria-label="Round N scoring review"`
- Correct answers marked with semantic color (`text-success`)
- Standings use `role="list"` / `role="listitem"`

## File Location

`apps/trivia/src/components/presenter/RoundScoringView.tsx` (~150-200 lines)

## Confidence
**High.** All data sources verified as available. No store changes needed. Purely presentational component with well-established patterns to follow.
