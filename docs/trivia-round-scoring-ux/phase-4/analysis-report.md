# Phase 4: Final Unified Analysis Report — Trivia Round Scoring UX Restructure

**Analysis question:** How to restructure the trivia app's `round_scoring` scene: (1) gate forward navigation on score submission, (2) relocate the scoring form from sidebar to center panel, (3) evaluate removing the right sidebar entirely.

**Phase:** 4 of 4 (Final)
**Date:** 2026-03-10
**Sources:** Phase 1 Areas 1-5, Phase 2 Iterators 1-5, Phase 3 Syntheses 1-3, Phase 0 Brief, direct code verification

---

## A) Executive Summary

The analysis examined three proposed changes to the `round_scoring` scene in `apps/trivia/`: gating forward navigation on score submission (Change a), relocating the scoring form to the center panel (Change b), and removing the right sidebar (Change c). All three changes are architecturally sound and well-supported by the codebase. Change a is fully specified and self-contained: a 3-line guard in `orchestrateSceneTransition()` following the existing reveal-lock pattern, with a `roundScoringSubmitted: boolean` flag in `TriviaGameState` whose lifecycle is precisely defined. Change b eliminates the current spatial inversion where the primary task (score entry) is cramped in a 296px sidebar while reference material occupies the wider center panel; a side-by-side merged layout recovers 35-50% more horizontal space for the scoring form. Change c has one mandatory hard requirement — co-deletion of the skip link at `page.tsx:239-244` targeting the sidebar's `id="game-controls"` anchor — and one prerequisite for global removal: a QuickScoreGrid relocation plan for non-`round_scoring` scenes. The recommended shipping sequence is Change a alone first, then Changes b and c together scoped to `round_scoring` only. A Phase 3 divergence on whether to hide or disable `SceneNavButtons` during `round_scoring` is resolved by direct code inspection: the back button is non-null during `round_scoring` (returns `'Round Summary'`), so hiding `SceneNavButtons` would remove the only mouse-accessible backward navigation path; the forward button must be disabled via `roundScoringSubmitted` in `useNavButtonLabels`, not hidden. Seven evidence gaps remain, five of which require under 10 minutes of targeted code audit to close.

---

## B) Analysis Question & Scope

**Original question:** How should the trivia app's `round_scoring` scene be restructured to: (1) gate forward navigation on score submission, (2) relocate the scoring form from sidebar to center panel, (3) evaluate removing the right sidebar entirely?

**In scope:** `apps/trivia/` only — presenter layout (`app/play/page.tsx`), scene state machine (`lib/game/scene.ts`, `lib/game/scene-transitions.ts`), game store (`stores/game-store.ts`), keyboard hooks (`hooks/use-game-keyboard.ts`), presenter hooks (`hooks/use-nav-button-labels.ts`), scoring components (`components/presenter/RoundScoringPanel.tsx`, `components/presenter/RoundScoringView.tsx`), and associated tests.

**Out of scope:** Audience display redesign, bingo app, platform-hub, database changes.

**Three labeled changes tracked throughout:**
- Change (a): Submission gate — blocks forward navigation until `Done` is pressed
- Change (b): Form relocation — moves `RoundScoringPanel` to center panel in side-by-side layout
- Change (c): Sidebar removal — removes right `<aside>` element, scoped to `round_scoring` or globally

---

## C) Table of Contents

| Section | Summary |
|---------|---------|
| D) Methodology | Static code analysis across 5 investigation areas, 5 iterators, 3 synthesizers. No live session observation. |
| E) Key Findings | Seven findings organized by theme: gate mechanism, feedback model, layout restructuring, sidebar removal, internal duplication, test surface, audience safety. |
| F) Analysis & Implications | 10 risks with mitigations, 8 opportunities, thematic patterns, architectural strengths found. |
| G) Confidence Assessment | Overall high confidence on all three changes. Weakest claim: exact `max-h` replacement value. Strongest: orchestrator insertion point. Six blind spots catalogued. |
| H) Recommendations | Four high-level recommendations with priority order, rationale, and trade-offs. |
| I) Open Questions | Seven questions requiring targeted follow-up, each with estimated resolution time. |
| J) Appendix: Evidence Index | File:line references for all primary evidence claims. |

---

## D) Methodology

This analysis was conducted in four phases across five investigation areas (Phase 1: state machine/gating, scoring layout, sidebar inventory, audience sync, test coverage), five iterators (Phase 2: sidebar replacement design, gating UX, merged layout, scene flow cross-cut, sidebar removal validation), and three synthesizers (Phase 3: thematic, risk/opportunity, gap/implication).

All findings are static-code-based. No live presenter session was observed, and no empirical layout measurements were taken. The primary evidence sources are: `apps/trivia/src/app/play/page.tsx`, `apps/trivia/src/lib/game/scene-transitions.ts`, `apps/trivia/src/lib/game/scene.ts`, `apps/trivia/src/lib/presenter/nav-button-labels.ts`, `apps/trivia/src/hooks/use-nav-button-labels.ts`, `apps/trivia/src/components/presenter/SceneNavButtons.tsx`, `apps/trivia/src/components/presenter/RoundScoringPanel.tsx`, and `apps/trivia/src/components/presenter/RoundScoringView.tsx`.

Direct code verification for this Phase 4 report confirmed: (1) `ADVANCEMENT_TRIGGERS` set at `scene-transitions.ts:46`, (2) `orchestrateSceneTransition()` guard structure at `scene-transitions.ts:360-396`, (3) `nav-button-labels.ts` return values for `round_scoring` at lines 95-96 and 118-119, (4) `SceneNavButtons.tsx` disabled logic at lines 26-27 and 91, (5) skip link anchor at `page.tsx:239-244` and target at `page.tsx:484`, (6) `handleRoundScoresSubmitted` call sequence at `page.tsx:187-190`, (7) `SceneNavButtons` render location at `page.tsx:414`.

---

## E) Key Findings

### Finding 1: Three independent forward-bypass paths exist; all are caught by one orchestrator guard

**Theme:** Gate mechanism
**Confidence:** High
**Evidence:** Direct code references at `use-game-keyboard.ts:189` (ArrowRight → `ADVANCE`), `use-game-keyboard.ts:228-236` (N key → `NEXT_ROUND`), `SceneNavButtons.tsx:61-66` (`round_scoring` case → `ADVANCE`). `ADVANCEMENT_TRIGGERS` at `scene-transitions.ts:46` contains `'advance'`, `'skip'`, `'next_round'`, `'close'` — all three forward paths use triggers already in this set.
**Impact:** A single guard at `orchestrateSceneTransition()` line ~367 (after the reveal-lock guard, before Layer 1) catches all three simultaneously. Keyboard-layer guards cannot be sufficient because `SceneNavButtons` would remain unguarded.

### Finding 2: The reveal-lock pattern is an exact precedent for the submission gate

**Theme:** Gate mechanism
**Confidence:** High
**Evidence:** `scene-transitions.ts:364-367` — `if (isRevealLocked() && ADVANCEMENT_TRIGGERS.has(trigger)) { return null; }`. The submission gate mirrors this precisely: `if (state.audienceScene === 'round_scoring' && !state.roundScoringSubmitted && ADVANCEMENT_TRIGGERS.has(trigger)) { return null; }`.
**Impact:** No new abstractions or type changes beyond one boolean field. Silent rejection matches established app convention (not toast, not modal).

### Finding 3: `roundScoringEntries` cannot serve as the submission indicator; a dedicated flag is required

**Theme:** Gate mechanism
**Confidence:** High
**Evidence:** `roundScoringEntries` is cleared on submission, making it empty both before submission (no scores entered) and after submission (cleared). A new `roundScoringSubmitted: boolean` field in `TriviaGameState` is required.
**Impact:** Flag lifecycle is asymmetric: forward entry from `round_summary` resets it to `false`; backward entry from `recap_qa` preserves it as `true` (scores remain committed from prior submission).

### Finding 4: The forward button must be disabled (not hidden) during round_scoring when unsubmitted; the back button must remain visible

**Theme:** Feedback model — divergence resolved
**Confidence:** High (verified by direct code inspection in Phase 4)
**Evidence:** `nav-button-labels.ts:118` returns `'Round Summary'` (non-null) for `round_scoring` back label. `SceneNavButtons.tsx:27` sets `backDisabled = labels.back === null` — since back is non-null, the back button is fully active with labeled text during `round_scoring`. Hiding `SceneNavButtons` entirely would remove this button, eliminating the only mouse-accessible backward navigation path.
**Impact:** The forward button must be disabled (38% opacity, `pointer-events-none`) when `!roundScoringSubmitted` via `useNavButtonLabels` transient-disable logic — exactly as the reveal-lock disables forward during `answer_reveal`. The back button renders unchanged. This resolves the Phase 3 divergence between Iterator 2 (disable) and Iterators 3-4 (hide) in favor of disable.

### Finding 5: The current layout has spatial inversion — primary task in cramped 296px sidebar, reference in wide center

**Theme:** Layout restructuring
**Confidence:** High
**Evidence:** `page.tsx:482-485` — sidebar is `w-80` (320px). With border, scoring panel width is approximately 296px. Center panel is `flex-1` (full remaining width, ~900px+ at 1280px viewport). `RoundScoringPanel` (score inputs) is in sidebar; `RoundScoringView` (standings + Q&A) is in center.
**Impact:** Moving scoring form to a ~400px left column in a side-by-side center layout gives 35% more space for team name display and eliminates score-row truncation. At 1280px, center panel grows from ~608px to ~912px.

### Finding 6: The side-by-side merged layout is architecturally clean with one hardcoded constant to replace

**Theme:** Layout restructuring
**Confidence:** High for structure; medium for exact `max-h` value
**Evidence:** Iterator 3 quantified three layout options. Side-by-side (Option A) is optimal: primary task left-first, reference simultaneously visible, columns scroll independently, no prop changes required. `RoundScoringView.tsx:103` contains `max-h-[calc(100vh-400px)]` calibrated for 3-column layout — must change. Iterator 3 estimated `calc(100vh - 280px)` as approximation requiring empirical verification.
**Impact:** Both columns need `overflow-y-auto` for 20-team games. Duplicate "Round N Scoring" headers (one in each component) must be consolidated. The `aria-live="polite"` progress counter in `RoundScoringPanel.tsx:145` must be preserved in the merged header.

### Finding 7: Sidebar removal has one hard blocker (skip link) and one prerequisite (QuickScoreGrid plan)

**Theme:** Sidebar removal
**Confidence:** High for hard blocker; high for prerequisite identification
**Evidence:** `page.tsx:239-244` — skip link `href="#game-controls"` targets `<aside id="game-controls">` at `page.tsx:484`. Removing the sidebar without removing the skip link produces a dead anchor (WCAG 2.1 failure). `page.tsx:500-508` — `QuickScoreGrid` conditionally renders in sidebar during `question_closed | answer_reveal | round_summary` scoring scenes. Global sidebar removal without QuickScoreGrid relocation removes the fastest scoring tool during the most frequent scoring moments.
**Impact:** Skip link co-deletion is mandatory in the same commit as sidebar removal. QuickScoreGrid relocation is a prerequisite for global removal, out of scope for initial implementation. Recommended mitigation: scope Change (c) to `round_scoring` only in Phase 1 by conditionally suppressing the sidebar with `{!isRoundScoringScene && <aside ...>}`.

---

## F) Analysis & Implications

### Thematic Patterns

**Pattern 1: The app uses layered, precedent-driven guard patterns.** The reveal-lock is not an ad-hoc mechanism — it is an established interceptor at the orchestrator boundary that blocks all forward motion during transient conditions. The submission gate fits this pattern exactly. Any future scene-specific advancement condition should use the same orchestrator-layer insertion point.

**Pattern 2: Presentation and submission are currently tangled at the component boundary.** `RoundScoringPanel` owns the Done button and fires `advanceScene` implicitly (via `handleRoundScoresSubmitted` in `page.tsx:187-190`). The submission flag should be set as part of `setRoundScores()` in the store, not as a separate store action, to preserve the atomicity of the existing call sequence.

**Pattern 3: The two-component split during `round_scoring` is an artifact of sidebar architecture, not a deliberate UX choice.** `RoundScoringView` and `RoundScoringPanel` were placed in center and sidebar respectively because that is where things go — not because the split serves the presenter. The merge resolves both the spatial inversion and the content duplication.

### Risks

| ID | Description | Severity | Likelihood | Change | Mitigation |
|----|-------------|----------|------------|--------|------------|
| R1 | Abandoned-edit confusion on backward re-entry | Medium | Low | (a) | Accept — committed values preserved |
| R2 | Skip link dead anchor | High | Certain if (c) | (c) | Mandatory co-deletion in same commit |
| R3 | "View Final Results" feature loss | Medium | Certain if global | (c) | Auto-show on ended, or scope to round_scoring only |
| R4 | Test failures from gating (2 tests) | Low | Certain | (a) | Rewrite both tests |
| R5 | QuickScoreGrid displacement | Medium | Medium if global | (c) | Scope to round_scoring only |
| R6 | `max-h` constant wrong in merged layout | Low | Certain | (b) | Replace with ~280px, tune empirically |
| R7 | TeamManager rename regression | Low | Certain if global | (c) | Teams modal in header bar |
| R8 | Dual advancement path confusion | Medium | Certain if (b) | (b) | Forward button disabled when unsubmitted |
| R9 | `roundScoringSubmitted` dropped from sync | Low | Medium | (a) | Add to storeToGameState() |
| R10 | Re-mount flash with stale entries | Low | Certain | (b) | Pre-populate in store transition |

### Opportunities

| ID | Description | Impact | Change |
|----|-------------|--------|--------|
| O1 | Eliminate spatial inversion — 35% wider scoring form | High | (b) |
| O2 | Consolidate duplicate headers | Low | (b) |
| O3 | Eliminate dual sort operations | Negligible | (b) |
| O4 | Delete TeamScoreboard dead code | Low | (c) |
| O5 | Recover 320px horizontal space | High | (c) |
| O6 | Establish reusable gate pattern | Medium | (a) |
| O7 | Zero audience display regression surface | Medium | (a)+(b) |
| O8 | Fix N-key scoring bypass (game integrity) | High | (a) |

### Architectural Strengths Found

The codebase shows three strengths that make these changes low-risk: (1) `orchestrateSceneTransition()` is a clean pure-function orchestrator with a well-established guard pattern; (2) dual-screen sync is store-driven, meaning DOM changes have zero audience display impact; (3) E2E tests have no CSS selector coupling to sidebar DOM identity.

---

## G) Confidence Assessment

**Overall confidence: High** across all three proposed changes. The insertion point, mechanism, and file inventory for each change are code-grounded.

**Strongest claims:**
- Orchestrator insertion point for the gate (`scene-transitions.ts:364` pattern) — verified by direct code reading
- `ADVANCEMENT_TRIGGERS` catches all three forward bypass paths — verified by direct code reading
- Skip link dead anchor (`page.tsx:239-244`) — verified by direct code reading
- Disable (not hide) `SceneNavButtons` forward button — resolved by Phase 4 code inspection of `nav-button-labels.ts:118` and `SceneNavButtons.tsx:27`

**Weakest claims:**
- Exact `max-h` replacement value (`calc(100vh - 280px)` estimated, not measured)
- 20-team dual-scroll ergonomics (logical argument, not observed behavior)
- Side-by-side layout column sizing (~400px left, flex-1 right) — principled recommendation without empirical presenter workflow data

**Blind spots:**

1. **Presenter workflow not observed.** All layout recommendations are logical but not grounded in observed behavior.
2. **High team count stress not tested.** Two simultaneously scrollable regions at 15-20 teams may feel disorienting.
3. **Modified-but-uncommitted entries on backward re-entry.** Gate stays open for uncommitted changes after backward re-entry.
4. **Keyboard tab order through merged layout not verified.**
5. **`hideHeader` prop a11y impact on `aria-live` counter.** May suppress screen reader progress feedback.
6. **Multi-operator scenario unexamined.** Analysis assumes single presenter.

---

## H) Recommendations

### Recommendation 1: Ship Change (a) — Submission Gate — as a standalone PR

**Priority:** Highest. This is a game integrity fix: a presenter pressing N or ArrowRight during `round_scoring` currently advances without recording scores.

**Rationale:** Change (a) is fully independent of (b) and (c). Precise insertion point, direct code precedent, known 2-test update surface. Immediate value.

**Trade-offs:** New `roundScoringSubmitted` flag must be added to `TriviaGameState` and `storeToGameState()`. Flag lifecycle asymmetry requires targeted test coverage.

### Recommendation 2: Ship Changes (b) + (c) together, scoped to `round_scoring` only

**Priority:** High. Spatial inversion is a significant presenter UX problem.

**Rationale:** Change (b) without (c) produces split-brain layout. Change (c) without (b) leaves form cramped. Scoping to `round_scoring` only avoids QuickScoreGrid relocation prerequisite and "View Final Results" feature loss.

**Trade-offs:** Sidebar still renders during other scenes. Conditional `{!isRoundScoringScene && <aside ...>}` achieves this. Global removal deferred to separate analysis.

### Recommendation 3: Resolve five short evidence gaps before implementation begins

**Priority:** Medium.

- Gap 2: Read `storeToGameState()` return type (3 min)
- Gap 4: Read header JSX for TeamManager modal trigger placement (10 min, only for global removal)
- Gap 6: Read `RoundScoringPanel.tsx:131-149` for `aria-live` impact (5 min)
- Gap 3: Measure `max-h` empirically post-implementation (5 min)
- Gap 5: QuickScoreGrid center placement analysis (separate, only for global removal)

### Recommendation 4: Do not use toast, modal, or dynamic button labels as gate feedback

**Priority:** Informational.

**Rationale:** Toast is for async CRUD results only. Modal is too disruptive. Dynamic labels are not established. Silent rejection with disabled forward button (38% opacity) matches the reveal-lock precedent.

---

## I) Open Questions

| # | Question | Required for | Resolution approach | Est. time |
|---|----------|--------------|---------------------|-----------|
| Q1 | Does `roundScoringSubmitted` need explicit addition to `storeToGameState()`? | Change (a) | Read `use-sync.ts:82` return type | 3 min |
| Q2 | Does `hideHeader` suppress `aria-live` counter at `RoundScoringPanel.tsx:145`? | Change (b) a11y | Read `RoundScoringPanel.tsx:131-149` | 5 min |
| Q3 | Correct `max-h` replacement for merged layout? | Change (b) visual | Empirical measurement post-implementation | 5 min |
| Q4 | TeamManager rename trigger placement in header? | Global Change (c) | Read header JSX, follow modal patterns | 10 min |
| Q5 | QuickScoreGrid center placement for non-round_scoring scenes? | Global Change (c) | Separate sub-analysis | Separate |
| Q6 | Is Q&A reference column high-value to presenters? | Layout sizing | Live presenter observation | Empirical |
| Q7 | Tab order through merged layout: any focus interruptions? | Change (b) a11y | DOM inspection post-implementation | 5 min |

---

## J) Appendix: Evidence Index

All file paths are relative to `apps/trivia/src/`.

| Claim | File | Line(s) |
|-------|------|---------|
| ArrowRight dispatches ADVANCE | `hooks/use-game-keyboard.ts` | 189 |
| N key dispatches NEXT_ROUND | `hooks/use-game-keyboard.ts` | 228-236 |
| SceneNavButtons dispatches ADVANCE for round_scoring | `components/presenter/SceneNavButtons.tsx` | 61-66 |
| ADVANCEMENT_TRIGGERS set definition | `lib/game/scene-transitions.ts` | 46 |
| Reveal-lock guard (precedent pattern) | `lib/game/scene-transitions.ts` | 364-367 |
| orchestrateSceneTransition structure | `lib/game/scene-transitions.ts` | 360-396 |
| round_scoring forward label ('Review Answers') | `lib/presenter/nav-button-labels.ts` | 95-96 |
| round_scoring back label ('Round Summary') | `lib/presenter/nav-button-labels.ts` | 118-119 |
| backDisabled = labels.back === null | `components/presenter/SceneNavButtons.tsx` | 27 |
| Transient disable in useNavButtonLabels | `hooks/use-nav-button-labels.ts` | 70-79 |
| SceneNavButtons render location | `app/play/page.tsx` | 414 |
| handleRoundScoresSubmitted call sequence | `app/play/page.tsx` | 187-190 |
| Skip link href="#game-controls" | `app/play/page.tsx` | 239-244 |
| Sidebar element id="game-controls" | `app/play/page.tsx` | 484 |
| QuickScoreGrid conditional render | `app/play/page.tsx` | 500-508 |
| RoundScoringPanel conditional render | `app/play/page.tsx` | 510-520 |
| TeamManager always-visible render | `app/play/page.tsx` | 490-498 |
| "View Final Results" button | `app/play/page.tsx` | 540-550 |
| RoundScoringPanel sidebar width | `app/play/page.tsx` | 482-485 |
| max-h hardcoded constant | `components/presenter/RoundScoringView.tsx` | 103 |
| aria-live progress counter | `components/presenter/RoundScoringPanel.tsx` | 145 |
| Existing failing test (scene-transitions) | `lib/game/__tests__/scene-transitions.test.ts` | 428 |
| Existing failing test (game-store) | `stores/__tests__/game-store.test.ts` | 336 |
| applyTransitionSideEffects round_scoring entry | `lib/game/scene-transitions.ts` | 273-288 |
| roundScoringEntries cleared on forward entry | `lib/game/scene-transitions.ts` | 278-283 |
| roundScoringEntries preserved on backward entry | `lib/game/scene-transitions.ts` | 285-288 |
| storeToGameState sync mapping | `hooks/use-sync.ts` | 82 |
| Audience RoundScoringScene reads entries | `components/audience/scenes/RoundScoringScene.tsx` | 15-17 |
| TeamScoreboard zero consumers (dead code) | Grep across `apps/trivia/src` | — |
| Enter key blocked during round_scoring | `hooks/use-game-keyboard.ts` | 279 |

---

*End of Phase 4 Final Unified Analysis Report*
