# Context Packet: Phase 1

## Key Findings

1. **Option A (center panel) is lowest-risk layout change** — new RoundScoringView in center, RoundScoringPanel stays in sidebar. Zero remount risk. Option B (move panel to center) has high remount risk due to local state. (Area 1, High confidence)
2. **Pre-fill is a one-line fix** — change useState initializer in RoundScoringPanel to read `team.roundScores[currentRound]`. No store changes needed. Eliminates destructive-overwrite trap. (Area 2, High confidence)
3. **Back navigation requires 3 one-line additions** — scene.ts (add back transition), nav-button-labels.ts (add label), use-game-keyboard.ts (add to ArrowLeft guard). Local state loss on back-nav is acceptable with pre-fill. (Area 3, High confidence)
4. **Enter key during `round_scoring` is a subtle trap** — dispatches SKIP unconditionally, advancing without save. Propose guarding Enter during round_scoring. (Area 3, Medium confidence — may surprise users)
5. **All critical tests should be Vitest store/unit tests** — 5 P0 tests document current behavior before changes. E2E is post-merge verification only. Zero E2E coverage exists today. (Area 4, High confidence)
6. **Optimal ordering: 4 waves** — Wave 1: tests + pre-fill (parallel). Wave 2: nav + cleanup (parallel). Wave 3: center panel. Wave 4: UX guidance. 3-4 PRs total. (Area 5, High confidence)
7. **State lifting (Option B) is deferred** — not needed for any Wave 1-4 work. Only needed if panel physically moves in the component tree. Pre-fill (Option A) is sufficient. (Area 2, High confidence)

## Confidence Levels

**High confidence:**
- Option A layout preserves RoundScoringPanel local state (code-verified: same JSX tree position)
- Pre-fill initializer reads stable value at mount time (React useState lazy init)
- Back transition is 3 one-line changes in well-tested state machine
- Ctrl+Z dual-handler conflict exists (code-verified: both fire when focus outside inputs)

**Medium confidence:**
- Enter guard during round_scoring (changes existing behavior — needs user validation)
- `roundScoringInProgress` is truly dead (grep found 0 guard reads, but could be used by external tools)

## Contradictions & Open Questions

1. **Enter key behavior**: Should Enter be fully blocked during `round_scoring`, or should it trigger the Done button's submit action? Area 3 proposes blocking; Area 4's test would verify blocking.
2. **State lifting timing**: Area 2 recommends deferring Option B. Area 1 notes the 320px sidebar constrains scoring UX for 6+ teams. If feedback says the sidebar is too narrow, state lifting becomes necessary for relocation.
3. **UX guidance content**: Area 5 defers to Wave 4 but no investigation explored what specific guidance text is needed. The analysis report suggested "Scores from digit keys are already saved" / "Press Right Arrow to continue without changes."

## Artifacts (read only if needed)
- `phase-1/area-1-component-arch.md`: 3 layout options with remount analysis
- `phase-1/area-2-state-mgmt.md`: 3 state management options with comparison table
- `phase-1/area-3-navigation.md`: 8 line-level edits for back nav + keyboard fixes
- `phase-1/area-4-test-strategy.md`: P0/P1/P2 test plan with code examples
- `phase-1/area-5-sequencing.md`: Dependency graph, 4 waves, 7 work units, 3-4 PRs
