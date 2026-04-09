# Synthesis 2: Risk/Opportunity

## Synthesis Approach
Evaluated all findings through a risk/opportunity/constraint lens, rating severity and identifying interactions between risks.

## Core Narrative
The implementation plan has a favorable risk profile: the highest-value change (pre-fill) is also the lowest-risk (one-line initializer change), and the riskiest change (center panel relocation) is purely presentational with no state implications. The most subtle risk is the hidden `recapShowingAnswer` side effect required for back navigation — a bug that would pass unit tests but produce wrong visual output. The constraint that state lifting is deferred creates an acceptable UX trade-off (panel edits lost on back-nav) mitigated by pre-fill recovering quick-score values.

## Risks

### R1: Enter Key Block Changes Muscle Memory (Medium)
Enter = "skip" is universal across 16 scenes. Blocking it during `round_scoring` breaks this contract. Presenters will press Enter, get no response, and be confused.

**Mitigation:** Right Arrow still works as advance. UX guidance (Wave 4) should explain the exception. CLAUDE.md must be updated in the same PR.

### R2: Back Navigation Loses Panel Edits (Medium)
Local `useState` for entries/undoStack destroyed on unmount. Re-entry recovers only quick-score values via pre-fill — not unsaved panel-only edits.

**Mitigation:** Pre-fill ensures baseline recovery. Back-nav is a deliberate action, unlikely to be accidental. Bar-trivia model treats panel as optional. State lifting can be added later if needed.

### R3: Hidden Side Effect for Back Nav (High)
`round_scoring` → `recap_qa` back transition requires `recapShowingAnswer: true` in scene-transitions.ts. Without it, presenter sees question face (not answer face) when returning to recap — disorienting.

**Mitigation:** Already identified by Iterator 4. Must be included in WU-3 scope. Dedicated test case required.

### R4: Dead State Removal Touches ~17 Files (Low)
Wide but shallow change. Each individual deletion is trivial but breadth creates merge conflict risk.

**Mitigation:** TypeScript compiler catches all missed references. Ship as atomic commit within Wave 2 PR.

### R5: Dual Ctrl+Z Persists Until Wave 2 (Low)
Both handlers fire when focus outside inputs during `round_scoring`. Rare in practice — presenter focus is almost always on input.

**Mitigation:** Fix is one conditional addition. Sequenced in Wave 2 immediately after Wave 1.

### R6: Center Panel Ternary Creates Two Render Paths (Low)
Conditional rendering in page.tsx adds maintenance surface.

**Mitigation:** Purely presentational component, no props, trivially readable. `isRoundScoringScene` already computed.

### R7: No E2E Test Coverage (Medium)
Zero E2E tests exist for round_scoring. All proposed tests are Vitest. Visual layout changes (Wave 3) cannot be verified by unit tests.

**Mitigation:** Manual Playwright MCP testing for visual verification. E2E can be added incrementally post-stabilization.

## Risk Interaction Map

```
R3 (hidden dep) ←→ R2 (state loss): Both involve back-nav. Pre-fill (O1) mitigates R2.
R1 (Enter block) ←→ R7 (no E2E): Changed behavior can't be E2E-tested yet.
R4 (wide cleanup) ←→ R5 (Ctrl+Z): Same PR minimizes conflict window.
```

## Opportunities

### O1: Pre-fill Is One-Line, Immediate Value (High)
Single initializer change eliminates the destructive-overwrite trap. All edge cases validated. Engine guarantees non-negative scores.

### O2: Wave 1 Parallelism (High)
Tests + pre-fill have zero file overlap. Both land in first wave, providing safety net AND UX improvement simultaneously.

### O3: Scene Machine Makes Back Nav Trivial (Medium)
Existing pattern for back transitions. Three one-line additions plus one side effect. Well-tested architecture.

### O4: Dead State Removal Simplifies Mental Model (Medium)
TypeScript enforces completeness on removal. Eliminates confusing field future devs might try to use as guard.

### O5: RoundScoringView Reuses Established Patterns (Medium)
~150-200 lines, purely presentational. All data available via useGame(). Reuses RoundSummary + QuestionDisplay patterns.

### O6: Scene-Transitions Is Highly Testable (Medium)
Pure functions, well-defined inputs/outputs. Existing test file has ~60 cases with established helpers.

## Constraints

| Constraint | Type | Implication |
|-----------|------|-------------|
| Bar-trivia dual-mechanism preserved | Hard | Right Arrow/N must advance without saving panel |
| Scene state machine is single source of truth | Hard | Back nav via getNextScene, side effects via applyTransitionSideEffects |
| 3-column layout unchanged for other scenes | Hard | Changes scoped to center/sidebar content during round_scoring only |
| E2E tests must pass before commit | Hard | Type removal must update all references |
| State lifting deferred | Soft | Panel data lost on back-nav; acceptable with pre-fill |

## Highest-Value, Lowest-Risk Path

1. **Wave 1:** Pre-fill + tests (parallel). Zero risk, immediate value.
2. **Wave 2:** Back nav + keyboard guards + cleanup. Medium risk (R3 must not be missed).
3. **Wave 3:** Center panel. Low risk (purely presentational).
4. **Wave 4:** UX guidance. Zero risk.

## Blind Spots
- No real-world presenter feedback on Enter block UX impact
- No E2E verification for visual layout changes until post-merge
- handleClear reset behavior is a UX preference, not validated
