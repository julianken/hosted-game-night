# Iteration: useQuickScore Duplication Analysis

## Assignment
Trace the two useQuickScore instances to determine if the duplication is intentional, and what happens if the sidebar is removed.

## Findings

### Two fully independent instances with no shared state
- **Evidence:** Instance 1 in use-game-keyboard.ts:100, Instance 2 in page.tsx:172. Each creates own useState<Set<string>> for scoredTeamIds and own useRef for historyRef. Only shared resource is adjustTeamScore store action.
- **Confidence:** Definitive
- **Relation to Phase 1:** Confirms the duplication finding
- **Significance:** Visual desync is real — keyboard presses don't light up sidebar buttons

### Visual desync bug is actively observable
- **Evidence:** Pressing digit 1 → Instance 1 adds to its scoredTeamIds, Instance 2's scoredTeamIds unchanged → QuickScoreGrid shows team as un-highlighted despite score incrementing. Clicking grid button → Instance 2 records, Instance 1 unaware → Ctrl+Z operates on wrong history stack.
- **Confidence:** Definitive
- **Relation to Phase 1:** Confirms as latent bug, not intentional design
- **Significance:** Mixed keyboard+mouse scoring produces incorrect visual state and broken undo

### Sidebar removal eliminates Instance 2 entirely
- **Evidence:** Instance 2 (page.tsx:172) only consumer is QuickScoreGrid (page.tsx:520). If sidebar removed, Instance 2 becomes dead code. Instance 1 (keyboard hook) continues functioning correctly with accurate scoredTeamIds and undo history.
- **Confidence:** Definitive
- **Relation to Phase 1:** Extends — removal actually fixes a bug
- **Significance:** Sidebar removal resolves the dual-instance bug as a side effect

### Dead code after removal
- page.tsx:172 `const quickScore = useQuickScore(...)` — dead
- page.tsx:19 `import { useQuickScore }` — dead
- page.tsx:15 `import { QuickScoreGrid }` — dead
- page.tsx:175-179 `isScoringScene` — dead (if TeamScoreInput also removed)

### Tests exist but don't catch the cross-instance bug
- **Evidence:** use-quick-score.test.ts has 8 tests covering hook in isolation. No integration test verifies keyboard and visual instances share state. use-game-keyboard.test.ts verifies store score changes but not scoredTeamIds.
- **Confidence:** High

## Resolved Questions
1. Are instances truly independent? Yes — separate useState, separate useRef
2. Is this intentional? No — comment at page.tsx:171 suggests intent was to "wire" them together
3. What happens on removal? Instance 2 becomes dead code, Instance 1 unaffected, bug resolved

## Remaining Unknowns
- Whether anyone has observed the visual desync in practice

## Revised Understanding
The dual-instance duplication is an unintentional bug. Sidebar removal is net positive for scoring correctness — it eliminates the competing instance, leaving a single coherent quick-score path via keyboard.
