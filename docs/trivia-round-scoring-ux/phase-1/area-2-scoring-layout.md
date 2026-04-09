# Investigation: Scoring Form & Center Panel Layout

## Summary

During `round_scoring`, `RoundScoringPanel` (primary action — entering scores) is in the right sidebar (w-80, 320px) while `RoundScoringView` (reference material — standings + Q&A answers) occupies the wider center panel (flex-1, ~800-1100px). This is spatially inverted. Relocation is structurally low-risk: `RoundScoringPanel` has 4 simple props with no sidebar-specific coupling, `RoundScoringView` has zero props (reads from store). The center panel uses a simple ternary at `page.tsx:394-409`.

## Key Findings

### Finding 1: RoundScoringPanel has no sidebar-specific coupling
- **Evidence:** Props: `teams`, `currentRound`, `onSubmitScores`, `onProgressChange` — all provided directly from `page.tsx:513-518`.
- **Confidence:** High
- **Implication:** Can move to any render location without prop changes.

### Finding 2: RoundScoringView is zero-prop, store-driven
- **Evidence:** `RoundScoringView.tsx:16` — no props. Reads directly from `useGameStore`.
- **Confidence:** High
- **Implication:** Can be placed anywhere in the React tree without prop threading.

### Finding 3: Center panel uses a simple ternary
- **Evidence:** `page.tsx:394-409` — `isRoundScoringScene ? <RoundScoringView /> : <QuestionDisplay ... />`
- **Confidence:** High
- **Implication:** Replacing with a merged layout is a one-location edit.

### Finding 4: Scoring form is width-constrained in sidebar
- **Evidence:** Sidebar usable width ~296px (w-80 minus padding). Team names truncated. Input is w-16 (64px).
- **Confidence:** High
- **Implication:** Center panel gives 2-3x more horizontal space. Team names untruncated, inputs larger, potential 2-column grid for many teams.

### Finding 5: RoundScoringView's Q&A scroll height is hardcoded
- **Evidence:** `RoundScoringView.tsx:103` — `max-h-[calc(100vh-400px)]` assumes current chrome.
- **Confidence:** High
- **Implication:** Must adjust to flex layout if co-located with scoring form.

### Finding 6: Both components render duplicate "Round N Scoring" headers
- **Evidence:** `RoundScoringPanel.tsx:138` has `<h3>`, `RoundScoringView.tsx:57` has `<h2>`.
- **Confidence:** High
- **Implication:** Must consolidate to one header in merged layout.

### Finding 7: Moving panel leaves sidebar with only TeamManager during round_scoring
- **Evidence:** `page.tsx:489-498` always renders TeamManager. Other blocks suppressed during round_scoring.
- **Confidence:** High
- **Implication:** Sidebar would be sparse but not broken. Strengthens case for sidebar removal.

### Finding 8: Ctrl+Z undo is a global window listener — position-agnostic
- **Evidence:** `RoundScoringPanel.tsx:111-126` — `window.addEventListener('keydown', ...)`.
- **Confidence:** High

### Finding 9: Both components sort teams by score independently
- **Evidence:** Panel: `[...teams].sort((a, b) => b.score - a.score)` (line 66). View: `getTeamsSortedByScore()`.
- **Confidence:** High
- **Implication:** One sort can be shared in merged layout.

## Surprises
- `RoundScoringView` manually constructs a full `TriviaGameState` object (25 fields) just to call two selectors
- Below the center card, SceneNavButtons + NextActionHint + keyboard shortcuts + ThemeSelector still render during round_scoring — this chrome could be hidden to give the form more focus
- Done button and SceneNavButtons both advance — dual advancement paths would be more visible in merged layout

## Unknowns & Gaps
- 20-team ergonomics: 2-column grid may break Enter-key tab-order traversal
- SceneNavButtons + Done button overlap: may need to hide SceneNavButtons during round_scoring
