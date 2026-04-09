# Context Packet: Phase 2

## Key Findings (by theme)

### Theme 1: Ended-State UI Vacuum (HARD BLOCKER)
- "View Final Results" button is definitively sidebar-exclusive — no auto-show, no keyboard shortcut, no alternative UI path when status==='ended' (confidence: definitive)
- RoundSummary component IS designed for ended state (has isLastRound handling) but orphaned — never triggered
- Center panel shows stale last question with disabled nav during ended state
- audienceScene goes final_buildup (3s) → final_podium (terminal) — round_summary NOT valid for ended
- **Rating: MUST RELOCATE** — zero workaround in live events

### Theme 2: Sidebar Removal Fixes Two Bugs
- **Dual useQuickScore** (REAL BUG): Two independent instances cause visual desync — keyboard scoring doesn't light up grid buttons, Ctrl+Z undo operates on split history stacks. Removal eliminates Instance 2, leaving single correct keyboard instance → bug resolved
- **Divergent reset** (REAL BUG): Sidebar "Start New Game" skips confirmation and preserves teams. Code comment confirms this is the degraded path. Removal routes all resets through the correct confirmNewGame flow
- **audienceScene not reset** (FALSE ALARM): resetGameEngine correctly resets via createInitialState() spread

### Theme 3: Feature Criticality Ratings
| Feature | Rating | Workaround |
|---------|--------|-----------|
| View Final Results | MUST RELOCATE | None |
| Mid-game team rename | SHOULD RELOCATE | Restart game (destructive) |
| Direct score override (setTeamScore) | SHOULD RELOCATE | Repeated ±1 (tedious for large errors) |
| Per-round score breakdown | ACCEPTABLE LOSS | Data in recap flow |

### Theme 4: Scoring Surface Coverage After Removal
- 5 active scenes lose mouse scoring but retain keyboard (question_closed, answer_reveal, round_summary, recap_qa, recap_scores)
- 7 non-scoring scenes lose TeamScoreInput emergency corrections (no keyboard fallback either — edge case tool)
- round_scoring already sidebar-free (RoundScoringPanel in center) — prior art for sidebar-free design
- Two scoring definitions disagree: SCORING_PHASE_SCENES (7 scenes) vs isScoringScene (3 scenes) — gap predates sidebar removal

## Confidence Levels
- **Definitive:** Ended-state vacuum, dual useQuickScore bug, divergent reset behavior, audienceScene false alarm
- **High:** All 4 feature criticality ratings, scoring matrix completeness
- **Medium:** Whether mid-game rename is actually used in practice (intentional feature, but usage frequency unknown)

## Contradictions & Open Questions
1. **Bug 1 was false alarm** — Phase 1 area-5 claimed audienceScene persists; Phase 2 proved resetGameEngine resets it correctly
2. **Sidebar removal is net positive for scoring correctness** — eliminates dual-instance bug and degraded reset path
3. **Open:** Should mid-game rename be relocated to center panel, header, or setup-only? Product decision needed

## Artifacts
- `phase-2/iterator-1-ended-state.md`: Full ended-state lifecycle trace
- `phase-2/iterator-2-quickscore-duplication.md`: useQuickScore instance analysis + dead code inventory
- `phase-2/iterator-3-feature-criticality.md`: Feature-by-feature risk ratings with test evidence
- `phase-2/iterator-4-scoring-matrix.md`: 16-scene scoring surface matrix
- `phase-2/iterator-5-bug-validation.md`: Three-bug validation (1 false alarm, 2 confirmed)
