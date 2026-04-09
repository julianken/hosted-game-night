# Context Packet: Phase 1

## Key Findings

1. **Gating mechanism is well-defined**: Add `roundScoringSubmitted: boolean` to `TriviaGameState`. Gate in `orchestrateSceneTransition()` using the existing reveal-lock pattern (3-line addition). `setRoundScores()` sets flag to `true`. Clear on forward entry to `round_scoring`, preserve on backward re-entry. (Area 1, high confidence)

2. **Scoring form relocation is structurally clean**: `RoundScoringPanel` has 4 simple props, no sidebar coupling. `RoundScoringView` has zero props. Center panel uses a simple ternary at `page.tsx:394-409`. One-location edit. (Area 2, high confidence)

3. **Sidebar is largely redundant during live game**: TeamManager only provides rename (add/remove gated to setup, but sidebar is `inert` during setup). `TeamScoreboard` is dead code. "Start New Game" button duplicates top-bar + R key. Only `RoundScoringPanel` and `QuickScoreGrid` are essential and both are relocatable. (Area 3, high confidence)

4. **Audience sync is layout-independent**: Sync runs through store → Zustand subscriber → BroadcastChannel. Panel DOM location is irrelevant. Sidebar removal has zero audience display impact. (Area 4, high confidence)

5. **Test impact is minimal**: Only 2 definite test breaks from gating (`scene-transitions.test.ts:428`, `game-store.test.ts:336`). Zero breaks from layout move or sidebar removal. Forward label for `round_scoring` is untested. Zero E2E coverage. (Area 5, high confidence)

## Confidence Levels

- **High confidence**: All 5 investigation areas produced high-confidence findings backed by specific code references
- **Medium confidence**: 20-team ergonomics (2-column grid tab order), exact responsive behavior
- **Low confidence**: Whether `RoundScoringView`'s `max-h-[calc(100vh-400px)]` constant is correct in a merged layout (needs empirical verification)

## Convergences
- All 5 areas agree: sidebar removal is low-risk and high-value
- Areas 1+2+3 agree: `RoundScoringPanel` should move to center panel
- Areas 1+5 agree: gating at `orchestrateSceneTransition` is the cleanest approach (single intercept point)
- Areas 2+3 agree: sidebar would be empty/sparse after panel relocation, strengthening removal case

## Contradictions
- None found between investigation areas

## Gaps
- No investigation covered: what replaces team rename if sidebar is removed (modal? click-to-edit?)
- No investigation covered: SceneNavButtons + Done button overlap when panel moves to center
- No investigation covered: whether `QuickScoreGrid` should also move to center (during its active scenes)
- "View Final Results" button in ended state has no alternative trigger — needs new location

## Artifacts
- phase-1/area-1-state-machine-gating.md: Scene machine, keyboard, orchestrator analysis
- phase-1/area-2-scoring-layout.md: Component structure, layout analysis
- phase-1/area-3-sidebar-inventory.md: Full sidebar inventory with redundancy classification
- phase-1/area-4-audience-sync.md: Sync path tracing
- phase-1/area-5-test-coverage.md: Test impact assessment with counts
