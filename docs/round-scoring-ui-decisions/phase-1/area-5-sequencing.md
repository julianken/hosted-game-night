# Area 5: Implementation Sequencing & Dependencies

## Investigation Summary

Cross-referencing Areas 1-4 to build a dependency graph between the 6 recommendations from the analysis report. Determining optimal ordering, parallelization opportunities, and work unit boundaries.

---

## The 6 Recommendations (from Analysis Report)

| # | Recommendation | Priority |
|---|---------------|----------|
| R1 | Pre-fill RoundScoringPanel with quick-score values | P0 |
| R2 | Move scoring UI into center panel during `round_scoring` | P1 |
| R3 | Add back navigation from `round_scoring` to `recap_qa` | P2 |
| R4 | Establish E2E test coverage before navigation changes | P0 |
| R5 | Add inline UX guidance | P2 |
| R6 | Clean up dead state and dual handlers | P3 |

---

## Dependency Graph

```
R4 (tests) ─────────────┐
                         │
R1 (pre-fill) ──────────┤──► R2 (center panel) ──► R5 (UX guidance)
                         │
R6 (cleanup) ───────────┘
                         │
R3 (back nav) ──────────┘
```

### Dependencies explained

| From | To | Reason |
|------|----|--------|
| R4 → R2, R3 | Tests must exist before navigation/layout changes | Tests document current behavior; changes without tests risk silent regressions |
| R1 → R2 | Pre-fill should be in place before center panel work | If R2 causes a remount (Option B), pre-fill ensures inputs recover from `roundScores`. With Option A (no remount), R1 still provides value independently |
| R1 → R3 | Pre-fill makes back-nav useful | Without pre-fill, returning to `round_scoring` shows blank inputs — confusing |
| R2 → R5 | UX guidance needs the center panel for space | Guidance text in the 320px sidebar is too cramped; center panel provides room |
| R6 → independent | Cleanup has no upstream dependencies | Can be done at any point, but logically fits after navigation changes are settled |

### Independence

- **R1 and R4 are independent** — pre-fill is a one-line initializer change; tests are new files
- **R6 is independent** — cleanup touches different code areas (dead state flag, Ctrl+Z handlers)
- **R3 and R2 are independent** — back navigation is state machine + keyboard; center panel is layout

---

## Optimal Ordering

### Wave 1: Foundation (parallel)
- **R4: Write P0 integration tests** — 5 Vitest store tests documenting current advance-without-save, setRoundScores, scoreDeltas, and multi-round behavior
- **R1: Pre-fill panel entries** — one-line change in RoundScoringPanel useState initializer

These two are completely independent and can be done in parallel. R4 creates a safety net; R1 delivers immediate user value.

### Wave 2: Navigation + Cleanup (parallel, after Wave 1)
- **R3: Add back navigation** — 3 one-line changes (scene.ts, nav-button-labels.ts, use-game-keyboard.ts) + Enter guard + scene test
- **R6: Clean up dead state and dual handlers** — remove/wire `roundScoringInProgress`, scope Ctrl+Z, add `type="button"` to Done

These are independent of each other but both benefit from Wave 1's test coverage.

### Wave 3: Center Panel (after Waves 1-2)
- **R2: Move scoring context to center panel** — new RoundScoringView component showing round questions with correct answers + current standings

Depends on pre-fill (R1) being in place. The center panel content is purely presentational — no state risk.

### Wave 4: Polish (after Wave 3)
- **R5: Add inline UX guidance** — contextual labels explaining the dual-mechanism design

Best paired with R2 since the center panel provides the space for guidance text.

---

## Work Units

| Unit | Wave | Files Changed | Estimated Scope |
|------|------|--------------|-----------------|
| **WU-1: P0 Tests** | 1 | `round-scoring-store.test.ts`, `round-scoring-scenes.test.ts` | ~80 lines of test code |
| **WU-2: Pre-fill** | 1 | `RoundScoringPanel.tsx` (1 line change in initializer) | Minimal — smallest possible diff |
| **WU-3: Back Nav** | 2 | `scene.ts`, `nav-button-labels.ts`, `use-game-keyboard.ts`, `round-scoring-scenes.test.ts` | ~15 lines changed across 4 files |
| **WU-4: Keyboard Guards** | 2 | `use-game-keyboard.ts` (Enter guard, Ctrl+Z scope) | ~10 lines changed |
| **WU-5: Cleanup** | 2 | `RoundScoringPanel.tsx` (stopPropagation, type=button), `game-store.ts` or `scene-transitions.ts` (dead state) | ~10 lines changed |
| **WU-6: Center Panel** | 3 | `page.tsx` (center conditional), new `RoundScoringView.tsx` | ~100-150 lines new component + ~10 lines page.tsx |
| **WU-7: UX Guidance** | 4 | `RoundScoringView.tsx` or `RoundScoringPanel.tsx` (guidance text) | ~20 lines |

### Grouping for commits/PRs

Work units can be grouped into 3-4 PRs:

1. **PR 1: Foundation** (WU-1 + WU-2) — Tests + pre-fill. Low risk, high value.
2. **PR 2: Navigation & Cleanup** (WU-3 + WU-4 + WU-5) — Back nav, keyboard guards, dead state cleanup. Medium risk, medium value.
3. **PR 3: Center Panel + Guidance** (WU-6 + WU-7) — New component, layout change, UX text. Medium risk, high value.

---

## Parallelization Opportunities

| Can run in parallel | Reason |
|--------------------|--------|
| WU-1 and WU-2 | Independent files, no conflicts |
| WU-3 and WU-5 | Different files, different concerns |
| WU-4 and WU-5 | Both touch `use-game-keyboard.ts` — CANNOT parallelize, must sequence |

**Key conflict:** WU-3 (back nav) and WU-4 (keyboard guards) both modify `use-game-keyboard.ts`. They should be in the same PR to avoid merge conflicts.

---

## Risk Sequencing

| Change | Risk Level | Why |
|--------|-----------|-----|
| WU-2 (pre-fill) | Very Low | One-line initializer change, no new behavior paths |
| WU-1 (tests) | None | Pure additions, no production code changes |
| WU-3 (back nav) | Low | 3 one-line additions to well-tested state machine |
| WU-4 (keyboard guards) | Medium | Changes existing Enter behavior — may surprise users who use Enter to advance from `round_scoring` |
| WU-5 (cleanup) | Low | Removing dead code, scoping handlers |
| WU-6 (center panel) | Medium | New component + conditional rendering — needs visual verification |
| WU-7 (UX guidance) | Low | Pure text addition, no logic changes |

---

## Open Questions

1. **Should WU-3 and WU-4 be separate PRs?** They both modify `use-game-keyboard.ts` but serve different purposes. Keeping them together reduces merge conflict risk.
2. **Should state lifting (Area 2, Option B) be planned as a follow-up?** It's not needed for Wave 1-4 but would enable future panel relocation to center.
3. **Should the E2E smoke test (P2 from Area 4) be in PR 3 or a separate follow-up?** It requires all changes to be in place but adds build overhead to CI.
