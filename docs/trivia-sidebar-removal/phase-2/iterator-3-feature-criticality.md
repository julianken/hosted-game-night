# Iteration: Feature Criticality Assessment

## Assignment
Rate each sidebar-exclusive feature as MUST RELOCATE, SHOULD RELOCATE, or ACCEPTABLE LOSS based on test coverage, game flow dependency, and workaround quality.

## Findings

### "View Final Results" — MUST RELOCATE
- **Evidence:** Zero dedicated tests (unit, E2E, or manual). Only path to reopen RoundSummary when status==='ended'. Auto-show fires only during between_rounds (page.tsx:78-82). Code comment at page.tsx:62 confirms design depends on this button existing.
- **Confidence:** Definitive
- **Workaround:** None workable in a live event
- **Risk:** Hard blocker — removal without replacement leaves presenter unable to review final scores

### Mid-game team rename — SHOULD RELOCATE
- **Evidence:** 8 unit tests with explicit playing/between_rounds assertions. E2E @high test (setup only). Manual test PASS + session recovery verification. TeamManager deliberately does not gate rename on status==='setup' (intentional feature).
- **Confidence:** High
- **Workaround:** Restart game (loses all progress) — costly during live event
- **Risk:** Meaningful UX degradation for common pub trivia workflow (teams naming themselves after setup)

### Direct score override (setTeamScore) — SHOULD RELOCATE
- **Evidence:** 6 unit + 5 engine tests. E2E @medium. First-class engine operation. Only UI for setting score to arbitrary number. Keyboard only provides ±1.
- **Confidence:** High
- **Workaround:** Repeated ±1 keystrokes — acceptable for small errors, tedious for large (10+ point corrections)
- **Risk:** Meaningful degradation for error recovery during live events

### Per-round score breakdown — ACCEPTABLE LOSS
- **Evidence:** 4 unit tests, 1 E2E @medium. Informational only. Equivalent data available in recap flow (audience RecapScoresScene) and RoundSummary overlay.
- **Confidence:** High
- **Workaround:** Adequate — data visible at natural breakpoints via other in-app paths
- **Risk:** Minor inconvenience for score-auditing; zero impact on game outcomes

## Summary Table

| Feature | Tests | Workaround | Risk Rating |
|---------|-------|-----------|-------------|
| View Final Results | 0 dedicated | None | **MUST RELOCATE** |
| Mid-game rename | 8 unit, 1 E2E @high | Restart (costly) | **SHOULD RELOCATE** |
| Score override | 6+5 unit, 1 E2E @medium | Repeated ±1 (tedious) | **SHOULD RELOCATE** |
| Per-round breakdown | 4 unit, 1 E2E @medium | Recap flow | **ACCEPTABLE LOSS** |

## Resolved Questions
- Inverse test-coverage/risk: highest-risk feature (View Final Results) has zero tests
- Mid-game rename is the most defensible keep-or-relocate candidate based on test evidence

## Revised Understanding
One hard blocker (MUST RELOCATE), two significant losses (SHOULD RELOCATE), one acceptable loss. The ended state is architecturally underserved — the sidebar's Game Over block does double duty as end-game acknowledgment AND final results access.
