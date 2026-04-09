# Context Packet: Phase 2

## Key Findings (by theme)

### Theme 1: Intentional Dual-Mechanism Design
- Advance-without-saving is **intentional** (bar/pub trivia model). Quick-score (1-9 keys) is primary; RoundScoringPanel is optional secondary UI. (Iterator 1, very high confidence)
- Both mechanisms write to `roundScores[currentRound]` — quick-score additively, panel destructively. Panel can zero out quick-score accumulation. (Phase 1 Area 2 + Iterator 1)
- Real UX problem is **lack of clarity**, not data loss — presenters may not understand the panel is optional, and partial submission zeros unentered teams.

### Theme 2: Severe Layout Waste
- Center panel: 864px (59.8% of screen) shows stale QuestionDisplay. Scoring form: 320px sidebar (22.2%). (Iterator 2, high confidence)
- RoundScoringPanel overflows in sidebar at **5-6 teams** (with TeamManager above). Standalone, fits 12 teams. (Iterator 2, high confidence)
- Moving scoring UI to center panel would provide **2.7x more vertical space** (464px → 844px). (Iterator 2)

### Theme 3: Available Data for Center Panel
- `teamAnswers` is **empty** in bar-trivia mode — no per-team answer grid possible. (Iterator 4, high confidence)
- Round questions with correct answers ARE available: `questions.filter(q => q.roundIndex === currentRound)`. (Iterator 4, high confidence)
- RoundSummary standings display is reusable (pure presentational, props-only). Full component has conflicting action buttons. (Iterator 4)
- Recommended center content: round question recap + correct answers + current standings. Zero async fetching needed.

### Theme 4: Latent Bugs (Low Severity)
- Enter-on-Done-button double-advance: **confirmed but harmless** — `recap_scores + skip` returns null in state machine. Fix: add `onKeyDown` + `preventDefault()` on Done button. (Iterator 3, high confidence)
- Ctrl+Z dual handlers: both fire when focus outside inputs. Panel undo + quick-score undo on different stacks. Confusing but rarely triggered. (Iterator 5, high confidence)
- `roundScoringInProgress` flag: dead state. Never read as guard, never cleared on advance-without-save, persists through `nextRound()`. Could be removed or wired up as guard. (Iterator 5, high confidence)

## Confidence Levels

**Very High:**
- Advance-without-saving is intentional (commit message evidence)
- Layout measurements (direct code evidence)

**High:**
- Scoring panel overflows at 5-6 teams (calculated from component measurements)
- `teamAnswers` empty in bar-trivia (traced through engine code)
- Double-advance is a no-op (state machine returns null)
- `roundScoringInProgress` is dead state (full codebase search)

**Medium:**
- Zustand synchronous state visibility during race condition (not tested)

## Contradictions & Open Questions

1. **Phase 1 vs Phase 2 on "data loss":** Phase 1 Area 3 framed advance-without-saving as a bug. Phase 2 Iterator 1 reframed it as intentional. The remaining UX problem is **clarity**: presenters don't know the panel is optional, and partial submission zeros unentered teams.

2. **Panel placement question:** Should RoundScoringPanel move to center panel, or should the center panel show reference content while keeping the panel in the sidebar? Layout quantification strongly favors moving the panel (2.7x more space), but this changes the consistent 3-column layout pattern.

3. **Dead state cleanup vs guard implementation:** Should `roundScoringInProgress` be removed (dead code) or wired up as a navigation guard? Iterator 1's finding (panel is optional) suggests it should NOT be a blocking guard, but could show a "scores not submitted" warning.

## Artifacts (read only if needed)
- `phase-2/iterator-1-design-intent.md`: Advance-without-saving is intentional bar-trivia design
- `phase-2/iterator-2-layout-quantification.md`: Pixel measurements, overflow thresholds, visual hierarchy inversion
- `phase-2/iterator-3-double-advance.md`: Enter-on-Done race condition trace, confirmed harmless
- `phase-2/iterator-4-answer-data.md`: Available data shapes, teamAnswers empty, center panel content proposal
- `phase-2/iterator-5-ctrl-z-flags.md`: Ctrl+Z dual handlers confirmed, roundScoringInProgress dead state
