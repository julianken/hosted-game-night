# Context Packet: Phase 2

## Key Findings
- **Timing solution:** New engine function `redistributeQuestions()` triggered by React effect in SetupGate when roundsCount/isByCategory changes. Option B from timing analysis — minimal architectural change.
- **Algorithm:** Two pure functions in `lib/questions/round-assignment.ts`: `assignRoundsByCategory(questions)` groups by category (largest first), `assignRoundsByCount(questions, roundsCount)` distributes evenly with `Math.ceil(total/rounds)`.
- **Migration:** Additive only — bump v3→v4, add `isByCategory: boolean` (default true). Keep `questionsPerRound` in store for backward compat. No breaking changes.
- **Presets:** Hide QPR from UI but keep DB column. Presets still useful for roundsCount + timerDuration. Consider adding `isByCategory` to presets.
- **Reassignment trigger:** SetupGate useEffect watches roundsCount + isByCategory → calls redistributeQuestions on game store → re-imports with new roundIndex values.

## Confidence Levels
- **High:** Algorithm design, migration path, timing solution, reassignment mechanism
- **Medium:** Preset deprecation strategy (depends on production data)
- **Low:** None — all major questions resolved

## Contradictions & Open Questions
1. **QPR display in Step 2:** Should show computed QPR as info text (e.g., "~7 questions per round") but with "By Category" mode the per-round count varies. Show per-category counts instead?
2. **Should presets gain `isByCategory` field?** Probably yes for consistency, but increases migration scope.
3. **Debouncing:** Should redistribution debounce on slider changes? Likely unnecessary (array remapping is <1ms).

## Artifacts
- phase-2/iterator-1-timing.md: Timing problem resolution (Option B recommended)
- phase-2/iterator-2-presets.md: Preset system impact (deprecate QPR display)
- phase-2/iterator-3-algorithm.md: Algorithm design for both assignment modes
- phase-2/iterator-4-reassignment.md: Trigger mechanism design
- phase-2/iterator-5-migration.md: Settings store v4 migration plan
