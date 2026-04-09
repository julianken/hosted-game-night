# Phase 3 — Synthesis 2: Risk / Opportunity Analysis

**Document type:** Phase 3 synthesis
**Date:** 2026-03-10
**Analysis question:** How to restructure trivia `round_scoring` scene: (1) gate forward nav on score submission, (2) move scoring form from sidebar to center panel, (3) evaluate removing the right sidebar entirely.

---

## Risks

### R1 — Score Data Loss on Gate Bypass via Direct Score Re-entry (Medium/Low)

On backward re-entry from `recap_qa`, `roundScoringSubmitted` is preserved as `true` and `roundScoringEntries` are preserved. If the presenter modifies scores in the panel and then navigates forward via ArrowRight (enabled because `roundScoringSubmitted: true`), the panel's in-progress edits are abandoned without commit — committed store values remain from the previous submission.

**Classification:** Not data loss in the destructive sense — committed values are preserved. It is abandoned-edit confusion.

**Mitigation:** Existing Done button styling differential is sufficient for Phase 1 scope.

---

### R2 — Skip Link Dead Anchor (High/Certain)

`page.tsx:239-244` contains `href="#game-controls"` targeting `<aside id="game-controls">` at `page.tsx:484`. Removal without fix is a WCAG 2.1 failure.

**Mitigation:** Delete `page.tsx:239-244` in the same commit that removes the sidebar. Mandatory co-deployment.

---

### R3 — "View Final Results" Feature Loss (Medium/Certain if global removal)

The "View Final Results" button (`page.tsx:540-550`) calls `setShowRoundSummary(true)` — its only trigger. No keyboard shortcut or header button exists.

**Mitigation:** Auto-show round summary when `status === 'ended'` (preferred), or add header button. Risk eliminated if sidebar removal is scoped to `round_scoring` only.

---

### R4 — Test Failures from Gating (Low/Certain)

Two tests assert the current broken behavior: `scene-transitions.test.ts:428` and `game-store.test.ts:336`.

**Mitigation:** Rewrite both tests — one verifies gate returns `null` when unsubmitted, second verifies transition succeeds when submitted.

---

### R5 — QuickScoreGrid Displacement (Medium/Medium)

If sidebar removal is global, QuickScoreGrid loses its home during `question_closed | answer_reveal | round_summary`.

**Mitigation:** Scope change (c) to `round_scoring` only in Phase 1 implementation.

---

### R6 — `max-h-[calc(100vh-400px)]` Wrong in Merged Layout (Low/Certain)

Hardcoded constant at `RoundScoringView.tsx:103` assumes sidebar chrome. Correct value needs empirical measurement.

**Mitigation:** Replace with approximate `calc(100vh - 280px)` and tune post-implementation.

---

### R7 — TeamManager Rename Access Regression (Low/Certain if global removal)

Always-visible rename becomes modal-hidden (one extra click).

**Mitigation:** "Teams" modal triggered from header bar, reusing existing modal patterns.

---

### R8 — Dual Advancement Path Confusion (Medium/Certain if SceneNavButtons not hidden)

Done button and "Review Answers" forward button both visible in center panel creates parallel-path confusion.

**Mitigation:** Hide SceneNavButtons during `round_scoring`: `{!isRoundScoringScene && <SceneNavButtons />}`.

---

### R9 — BroadcastChannel Sync Payload Missing `roundScoringSubmitted` (Low/Medium)

New field may be silently dropped from `storeToGameState()` in `use-sync.ts:82`.

**Mitigation:** Add field to `storeToGameState()` mapping when adding it to `TriviaGameState`.

---

### R10 — `RoundScoringPanel` Re-mount Flash (Low/Certain)

One-render gap with stale `roundScoringEntries` on component mount in new location.

**Mitigation:** Pre-populate entries in store during `round_scoring` transition in `scene-transitions.ts`.

---

## Opportunities

### O1 — Eliminate Spatial Inversion (High)

Primary task (score entry) moves from cramped 296px sidebar to ~400px center column — 35% wider. Team names stop truncating. Q&A reference gets remaining ~900px on 1920px viewport.

### O2 — Consolidate Duplicate Headers (Low)

Two "Round N Scoring" headings from `RoundScoringView.tsx:57` and `RoundScoringPanel.tsx:134` merge into one unified header row.

### O3 — Eliminate Dual Sort Operations (Negligible)

Both components sort teams by score independently. Single hoisted sort in merged wrapper.

### O4 — Delete TeamScoreboard Dead Code (Low)

Zero production consumers confirmed in Phase 1. ~100 lines + 15+ tests deletable.

### O5 — Recover 320px Horizontal Space (High for laptops)

At 1280px viewport, center panel goes from ~608px to ~912px — 50% increase.

### O6 — Establish Reusable Gate Pattern (Medium)

`orchestrateSceneTransition()` gate pattern becomes a template for future conditional advancement.

### O7 — Zero Audience Display Regression Surface (Medium)

Sync is store-driven, DOM location irrelevant. Deployment risk reduced.

### O8 — Fix N-Key Scoring Bypass (High for game integrity)

`NEXT_ROUND` is in `ADVANCEMENT_TRIGGERS` — the gate catches it automatically. A game host pressing N by habit could previously corrupt a round's scoring with no warning.

---

## Risk/Opportunity Summary Matrix

| ID | Type | Severity | Likelihood | Change | Status |
|----|------|----------|------------|--------|--------|
| R1 | Risk | Medium | Low | (a) | Accept |
| R2 | Risk | High | Certain | (c) | **Mandatory mitigation: co-delete skip link** |
| R3 | Risk | Medium | Certain | (c) | Mitigate: auto-show results or stage removal |
| R4 | Risk | Low | Certain | (a) | Mitigate: rewrite 2 tests |
| R5 | Risk | Medium | Medium | (c) | Mitigate: scope to round_scoring only |
| R6 | Risk | Low | Certain | (b) | Mitigate: replace constant |
| R7 | Risk | Low | Certain | (c) | Mitigate: Teams modal |
| R8 | Risk | Medium | Certain | (b) | Mitigate: hide SceneNavButtons |
| R9 | Risk | Low | Medium | (a) | Mitigate: add to storeToGameState() |
| R10 | Risk | Low | Certain | (b) | Mitigate: pre-populate in transition |
| O1 | Opp | — | — | (b) | Capture |
| O2 | Opp | — | — | (b) | Capture |
| O3 | Opp | — | — | (b) | Capture |
| O4 | Opp | — | — | (c) | Capture |
| O5 | Opp | — | — | (c) | Capture |
| O6 | Opp | — | — | (a) | Capture |
| O7 | Opp | — | — | (a)+(b) | Capture |
| O8 | Opp | — | — | (a) | Capture |

---

## Critical Ordering Constraints

1. `roundScoringSubmitted` must be added to `TriviaGameState` before any downstream change.
2. `setRoundScores()` must set `roundScoringSubmitted: true` before `advanceScene('advance')` — current call sequence in `page.tsx:187-190` is already correct.
3. Skip link removal must be atomic with sidebar element removal.
4. Test fixes must land in the same PR as the gate implementation (pre-commit hook runs `pnpm test:run`).
