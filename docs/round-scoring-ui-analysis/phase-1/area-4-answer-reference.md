# Investigation: Answer Reference & Context During Scoring

## Summary

During `round_scoring`, the presenter's center panel renders a stale `QuestionDisplay` — whichever question was last `displayQuestionIndex` when leaving `recap_qa`. There is no mechanism to surface round answers, team performance context, or current standings while the `RoundScoringPanel` is active in the right sidebar. The audience sees only a minimal "Scoring in Progress" splash with a team-count progress bar. All the data the presenter would need (round questions with correct answers, per-team answer records, current standings) is fully available in the Zustand store at this point; none of it is surfaced. The `RoundSummary` component that shows standings is hidden during `round_scoring`, even though its data remains valid. The `recapShowingAnswer` field is explicitly nulled out on entry to `round_scoring`, meaning recap state is intentionally discarded at that boundary.

## Key Findings

### Finding 1: Center panel shows a stale, non-contextual QuestionDisplay during round_scoring

- **Evidence:** `apps/trivia/src/app/play/page.tsx:389-402` — `QuestionDisplay` is always rendered in the center panel with no scene-conditional logic. It shows `game.selectedQuestion` regardless of `audienceScene`.
- **Confidence:** High
- **Implication:** The presenter sees a frozen question card (the last one viewed during `recap_qa`) while entering scores. There is no answer-reference or round-summary view in the center column during this scene. This is the gap described in the investigation prompt.

### Finding 2: RoundScoringPanel shows only team name and cumulative total score — no per-round answer data

- **Evidence:** `apps/trivia/src/components/presenter/RoundScoringPanel.tsx:193-208` — each team row renders `team.name` and `team.score` (cumulative total). No correct answers, no team answer records, no round-specific context.
- **Confidence:** High
- **Implication:** The facilitator must keep their answer sheet in their head or on paper while entering scores. There is no in-UI reference for what the correct answers were this round, or how individual teams performed.

### Finding 3: All necessary data is available in the Zustand store at round_scoring time

- **Evidence:** `apps/trivia/src/types/index.ts:197-303` — `TriviaGameState` holds `questions` (with `correctAnswers`, `roundIndex`, `text`), `teamAnswers` (`TeamAnswer[]` with `teamId`, `questionId`, `isCorrect`, `pointsAwarded`), `teams` (with `roundScores[]` and cumulative `score`), and `currentRound`. All of these persist through the `recap_qa` → `round_scoring` transition — no data is cleared.
- **Confidence:** High
- **Implication:** The center panel could be replaced with a round-answer reference table showing each question's correct answer alongside team answer records, using only data already in the store. No additional async fetching would be required. A server component is not appropriate here since this is real-time presenter state from Zustand.

### Finding 4: recap_qa → round_scoring transition explicitly nulls recapShowingAnswer but preserves all question and answer data

- **Evidence:** `apps/trivia/src/lib/game/scene-transitions.ts:298-306` — the `round_scoring` entry side effect sets `roundScoringInProgress: true`, `roundScoringEntries: {}`, and `recapShowingAnswer: null`. It does not modify `questions`, `teamAnswers`, `displayQuestionIndex`, or `teams`.
- **Confidence:** High
- **Implication:** The `displayQuestionIndex` still points to the last question reviewed in `recap_qa` (the last round question, answer face). `recapShowingAnswer` being nulled is intentional cleanup of recap sub-state, not data loss. All answer data remains available. The scene boundary is a presentation concern, not a data boundary.

### Finding 5: RoundSummary component (standings) is conditionally hidden during round_scoring

- **Evidence:** `apps/trivia/src/app/play/page.tsx:513` — `isScoringScene` is `true` for `question_closed`, `answer_reveal`, and `round_summary` only (line 170-174). `isRoundScoringScene` is `true` when `audienceScene === 'round_scoring'` (line 177). The `RoundSummary` overlay is controlled by `showRoundSummary` local state (line 475-491), which is auto-hidden when `audienceScene` leaves `round_summary` (lines 60-70). By the time `round_scoring` is active, `showRoundSummary` is already `false`.
- **Confidence:** High
- **Implication:** `RoundSummary` shows sorted standings and round winner callout — exactly the context a facilitator needs while assigning team round scores. It could plausibly be kept visible (or rerendered) during `round_scoring` without conflict, since `RoundScoringPanel` occupies only the right sidebar. The auto-hide effect would need to be gated to preserve it through the `recap_qa` → `round_scoring` transition.

### Finding 6: Audience sees a minimal "Scoring in Progress" splash with only a team-count progress bar

- **Evidence:** `apps/trivia/src/components/audience/scenes/RoundScoringScene.tsx:12-83` — renders a heading ("Scoring in Progress"), a subtitle ("Round N - Collecting Team Scores"), and a progress bar driven by `roundScoringEntries` count vs `teams.length`. No question data, no standings, no answers are shown to the audience.
- **Confidence:** High
- **Implication:** The audience display is intentionally minimal during this scene — a reasonable design choice so the audience is not distracted. However, there is no audience-side standings display during this gap either. If the goal is to keep the audience engaged, a standings board (which `RoundSummary` audience counterpart already exists) could optionally be shown here.

### Finding 7: No recapQuestionIndex field exists — recap position is tracked via displayQuestionIndex

- **Evidence:** `grep` across all `apps/trivia/src` — no `recapQuestionIndex` symbol exists anywhere. `apps/trivia/src/lib/game/scene-transitions.ts:84-99` — `deriveTransitionContext` computes `currentRoundQIndex` by finding `displayQuestionIndex` within the current round's filtered question list.
- **Confidence:** High
- **Implication:** The recap Q/A position state is entirely embodied in `displayQuestionIndex`. When entering `round_scoring`, `displayQuestionIndex` still points to the last recap question (the last question of the current round). This is surfaceable data for a "here are the answers you just reviewed" panel.

### Finding 8: QuickScoreGrid is explicitly suppressed during round_scoring

- **Evidence:** `apps/trivia/src/app/play/page.tsx:513` — condition is `isScoringScene && !isRoundScoringScene`, so `QuickScoreGrid` (quick per-question point awards) is hidden when `round_scoring` is active. `TeamScoreInput` is also hidden (line 535).
- **Confidence:** High
- **Implication:** The right sidebar correctly shows only `RoundScoringPanel` during this scene. The suppression logic is clean and well-scoped. Any new answer-reference panel would belong in the center column, not the sidebar.

## Surprises

- There is no `recapQuestionIndex` in the state shape at all. The same `displayQuestionIndex` that tracks which question is on the audience screen doubles as the recap cursor. This is a deliberate design choice (one source of truth) but it means the "last recap question" and the "question on display" are the same pointer — leaving it pointing at the final round question when `round_scoring` begins.
- `recapShowingAnswer` is a three-way type (`boolean | null`), not a simple boolean. `null` means "not in recap" rather than false. Its explicit nulling on `round_scoring` entry is a clean sentinel reset, confirming that recap state is intentionally scoped to the recap scene family.
- The `RoundSummary` component takes all its data as props (no direct store reads) — it is a pure presentation component. This makes it trivially reusable or keep-alive-able in the center panel during `round_scoring` without coupling concerns.
- `RoundScoringPanel` sorts teams by descending cumulative score already (line 65), giving the facilitator a ranked list — but without score deltas or per-round breakdown, the rank context is limited.

## Unknowns & Gaps

- It is unclear from code alone whether the `recap_qa` scene always completes a full pass through all round questions before reaching `round_scoring`, or whether the presenter can shortcut. The `scene.ts` state machine shows `recap_qa` transitions directly to `round_scoring` on `advance` — the internal cycling in `scene-transitions.ts:142-165` only falls through to the state machine (which returns `round_scoring`) when showing the answer face of the last question. So `round_scoring` is always reached from the last-question-answer-face of `recap_qa`. This means `displayQuestionIndex` reliably points at the last round question on `round_scoring` entry.
- Whether `teamAnswers` is populated for all teams in bar-trivia mode (where scores are entered as totals rather than per-question) is not confirmed by reading these files alone. If the game is used in a "bar trivia" style where answers are not individually entered, `teamAnswers` may be empty, making a per-team answer breakdown display moot.
- Whether any keyboard shortcut context should be preserved (or announced) when the center panel changes content during `round_scoring` is not addressed by current code.

## Raw Evidence

| File | Lines | What was read |
|------|-------|---------------|
| `apps/trivia/src/components/audience/scenes/RoundScoringScene.tsx` | 1-83 | Full file — audience display during round_scoring |
| `apps/trivia/src/components/presenter/RoundSummary.tsx` | 1-117 | Full file — standings overlay component |
| `apps/trivia/src/app/play/page.tsx` | 1-603 | Full file — presenter layout, RoundSummary show/hide logic, scene guards |
| `apps/trivia/src/stores/game-store.ts` | 1-536 | Full file — store shape, setRoundScores, updateRoundScoringProgress |
| `apps/trivia/src/types/index.ts` | 1-391 | Full file — TriviaGameState, Question, Team, TeamAnswer shapes |
| `apps/trivia/src/types/audience-scene.ts` | 1-193 | Full file — AudienceScene type, scene validity maps |
| `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` | 1-312 | Full file — facilitator scoring UI |
| `apps/trivia/src/lib/game/scene.ts` | 1-370 | Full file — scene state machine, round_scoring transitions |
| `apps/trivia/src/lib/game/scene-transitions.ts` | 1-415 | Full file — orchestrator, recap_qa cycling, round_scoring entry side effects |
