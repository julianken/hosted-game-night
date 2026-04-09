# Phase 3 Synthesis 3: Gap and Implication Analysis

**Document type:** Gap/implication synthesis
**Analysis phase:** 3 of 4
**Status:** Complete

---

## 1. Evidence Gaps

### Gap 1: Hide-vs-disable SceneNavButtons contradiction unresolved

Iterator 2 recommends visible-but-disabled forward button (38% opacity). Iterator 3 recommends hiding SceneNavButtons entirely. Iterator 4 leans toward hiding but does not resolve with decisive code-backed argument.

**Why it matters:** A disabled "Review Answers" communicates "condition not met yet." A hidden SceneNavButtons says "Done button IS the path." Meaningfully different UX messages.

**Approach:** Examine SceneNavButtons visibility across all 16 scenes in `nav-button-labels.ts`. Check if any scene suppresses SceneNavButtons at the `page.tsx:413-416` level. A 5-minute code audit resolves this.

---

### Gap 2: `roundScoringSubmitted` BroadcastChannel sync inclusion unresolved

Iterator 4 listed this as open. The audience `RoundScoringScene` only reads `roundScoringEntries`, not `roundScoringSubmitted`. But `storeToGameState()` in `use-sync.ts:82` has an explicit field map — new fields must be added or they are silently dropped.

**Why it matters:** If future audience components depend on the flag, or if a second presenter window hydrates, the flag would be missing.

**Approach:** Read `storeToGameState()` return type in `use-sync.ts`. If explicitly typed, compiler catches omissions. 3-minute read.

---

### Gap 3: `max-h-[calc(100vh-400px)]` replacement unverified

The 400px constant in `RoundScoringView.tsx:103` was calibrated for 3-column layout. Iterator 3 estimates `calc(100vh - 280px)` but flags as needing empirical verification.

**Why it matters:** Wrong constant either clips Q&A prematurely or allows overflow.

**Approach:** Measure rendered heights after first implementation. Consider CSS custom property for tunability.

---

### Gap 4: TeamManager rename modal design unspecified

Iterator 1 proposed a Teams modal but did not detail: trigger placement, button label, keyboard shortcut, header space constraints.

**Why it matters:** Sidebar provides always-visible rename. Modal adds friction. If trigger is not surfaced clearly, presenters cannot find where to rename teams.

**Approach:** Read header JSX in `page.tsx` for available space. Follow existing modal patterns. 10-minute audit.

---

### Gap 5: QuickScoreGrid center-panel relocation for non-round_scoring scenes out of scope

Iterator 1 proposed moving QuickScoreGrid to center panel for `question_closed | answer_reveal | round_summary`. Not examined whether it fits below QuestionDisplay or creates visual inconsistency.

**Why it matters:** If sidebar removed globally without relocating QuickScoreGrid, presenter loses their fastest scoring tool during the most frequent scoring moments.

**Approach:** Separate sub-analysis needed if global sidebar removal is pursued.

---

### Gap 6: `hideHeader` prop a11y impact on `aria-live` counter

Iterator 3 proposed `hideHeader: boolean` on `RoundScoringPanel`. The header contains an `aria-live="polite"` progress counter at `RoundScoringPanel.tsx:145`. Hiding the header may silence screen reader progress feedback.

**Why it matters:** Accessibility regression for a component with existing careful a11y design.

**Approach:** Read `RoundScoringPanel.tsx:131-149` to identify which DOM nodes carry `aria-live` and whether `hideHeader` can suppress visual header while preserving the live region.

---

## 2. Implications for the Audience

### Decisions this analysis enables

- **Gating (Change a) is fully specified and ready to implement.** Insertion point, flag name, flag lifecycle, UX feedback, and 2 test updates all documented with file:line precision.
- **Sidebar removal risk profile is fully characterized.** Skip link is only hard break. Layout flex expansion clean. E2E decoupled. Undo stacks scene-based. Sync store-driven.
- **Merged layout is specified at architectural level.** Side-by-side columns, unified header, hidden SceneNavButtons. 10-file change list complete.
- **Test breakage surface is small.** 2 failing tests from gating. Zero from layout or sidebar changes.

### Decisions this analysis constrains

- **Gating must be at orchestrator layer**, not keyboard layer — SceneNavButtons would be unguarded otherwise.
- **Done button must remain always-clickable** — existing design intent confirmed by Iterator 2.
- **Toast is ruled out** as feedback mechanism — three independent findings establish it's wrong.
- **`getNextScene()` must not be modified** — pure-context design must be preserved.

---

## 3. Scope Implications

### Are the 3 changes independent or coupled?

**Change (a) — Gate — is fully independent.** Can ship alone. Works regardless of form location.

**Change (b) — Move form to center — has soft dependency on (c).** Moving form while keeping sidebar creates incoherent split-brain layout. Most valuable when paired with (c).

**Change (c) — Remove sidebar — has hard dependency on QuickScoreGrid relocation plan.** If sidebar removed during non-`round_scoring` scenes without relocating QuickScoreGrid, the presenter loses the fastest scoring tool during `question_closed | answer_reveal | round_summary`.

**Recommended shipping strategy:**
1. Ship Change (a) alone as standalone improvement
2. Ship Changes (b) + (c) together with QuickScoreGrid relocation as complete sidebar-to-center migration

### Should scope expand?

- **QuickScoreGrid relocation must be added** to scope of Change (c)
- **TeamManager modal design must be added** to scope of Change (c)
- **Audience display does NOT need scope expansion** — Area 4 conclusively established it's unaffected

---

## 4. Blind Spots

### Blind spot 1: Presenter's actual workflow during round_scoring was not observed

The analysis is static-code-based. The side-by-side layout recommendation rests on logical argument (primary task left, reference right), not observed behavior. Presenters may reference Q&A on a printed sheet or separate device — the Q&A column may occupy space better used for larger scoring fonts.

### Blind spot 2: Multi-round games with 10+ teams not stress-tested

Two simultaneously scrollable regions (scoring left, Q&A right) may feel disorienting at high team counts. Layout may be correct for 4–8 teams but fractured at 15+.

### Blind spot 3: Single-operator assumption

The layout assumes one person simultaneously enters scores and references Q&A. Multi-operator scenarios (reader + scorer) may need different column sizing.

### Blind spot 4: Audience experience during round_scoring not evaluated for UX

Audience sees a progress bar during scoring. Whether this is a good audience experience was never asked. Orthogonal to the three analysis questions but unevaluated.

### Blind spot 5: Keyboard tab order through merged layout not verified

Iterator 3 stated "tab order is clean" but did not verify whether non-interactive elements in the merged card wrapper (unified header, standings, back nav hint) interrupt the scoring-to-Done tab path.

### Blind spot 6: Modified-but-uncommitted entries on backward re-entry

If presenter returns from `recap_qa`, modifies scores, then navigates forward without re-pressing Done, `roundScoringSubmitted: true` is still set (from first submission) but displayed entries differ from committed scores. The gate is open for uncommitted changes.

---

## 5. Summary Table

| Decision | Analysis enables? | Gap or constraint |
|----------|------------------|-------------------|
| Implement gating (Change a) | Yes — fully specified | None |
| Choose hide vs. disable SceneNavButtons | No | Unresolved; 5-min audit resolves |
| Ship sidebar removal alone | No | QuickScoreGrid relocation + TeamManager modal undesigned |
| Ship form move + sidebar removal together | Yes, architecturally | `max-h` needs empirical tuning; `hideHeader` a11y needs verification |
| Ship Changes b+c without Change a | Possible | Gating is independent |
| Include `roundScoringSubmitted` in sync | No | Needs `use-sync.ts:82` audit |
| Design TeamManager modal | No | Header space not audited |
| Design QuickScoreGrid center placement | No | Out of scope; required for Change c |
