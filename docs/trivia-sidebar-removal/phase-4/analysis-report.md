# Trivia Presenter Right Sidebar Removal: Final Unified Analysis Report

## A) Executive Summary

This report synthesizes findings from a four-phase analysis funnel — 5 area investigations, 5 deep-dive iterations, and 3 independent synthesis lenses — examining whether the 320px right sidebar (`complementary` landmark, `w-80`) in the trivia presenter view (`/play`) can be safely removed. The primary finding is that removal is not yet safe in its current codebase state, but becomes safe once one hard prerequisite is satisfied and two confirmed production bugs are filed for independent resolution. The hard prerequisite is an ended-state UI vacuum: when a game ends, the sidebar's "View Final Results" button is the only mechanism to open the final standings overlay, there is no keyboard fallback, and the feature has zero automated tests — meaning CI would pass green while the presenter cannot access final scores. Beyond that blocker, the sidebar is actively making the codebase worse: two confirmed production bugs — a dual `useQuickScore` instance causing visual desync and broken undo, and a divergent reset path that skips the confirmation modal and preserves teams — exist because the sidebar created competing implementations, and both are resolved as direct side effects of removal. Two additional capabilities (mid-game team rename and direct score override) are sidebar-exclusive and merit relocation, but are not hard blockers for removal. A latent bug in the `RoundSummary` "End Game" button — where `handleNextRound` calls `game.nextRound()` as a no-op when the game is ended, then unconditionally sets `audienceScene` to `round_intro` — is currently unreachable but becomes high-severity the moment any ended-state replacement is added, and must be fixed before the ended-state replacement ships.

## B) Analysis Question and Scope

**Primary Question:** Can the right sidebar (320px `complementary` region) in the trivia presenter view (`/play`) be safely removed? The stated hypothesis was that all sidebar items are either redundant (duplicated elsewhere) or not working properly.

**Sidebar Contents Analyzed (`page.tsx:496-563`):**
- `TeamManager` — always shown when sidebar visible; add/remove gated on `status === 'setup'`, rename always available
- `QuickScoreGrid` — shown during scoring scenes (`question_closed`, `answer_reveal`, `round_summary`); mouse affordance for keyboard quick-score
- `TeamScoreInput` — shown during non-scoring `playing`/`between_rounds`; provides ±1 adjustments, click-to-edit score override, per-round breakdown
- Game Over block — shown when `status === 'ended'`; "View Final Results" and "Start New Game" buttons
- Entire sidebar suppressed during `round_scoring` scene (BEA-673 prior art)

**In Scope:** All code in `apps/trivia/src/`. Presenter view at `apps/trivia/src/app/play/page.tsx`. All sidebar components, their store interactions, keyboard fallbacks, test coverage, accessibility structure, and layout impact.

**Out of Scope:** Implementation design for replacement features. Audience display changes. Non-trivia apps. Database or API changes.

## C) Table of Contents

**D) Methodology** — Investigation approach, tools, code areas analyzed.

**E) Key Findings** — 13 findings ordered by confidence × impact, each with evidence, impact, and cross-references.

**F) Analysis and Implications** — Thematic patterns, risk profile, opportunities, and gaps synthesized across all three lenses.

**G) Confidence Assessment** — Overall confidence, strongest claims, moderate claims, weakest claims, known blind spots.

**H) Recommendations** — High-level only. Priority, rationale, trade-offs, open questions for each.

**I) Open Questions** — Questions surfaced but not answered, why they matter, suggested approach.

**J) Appendix: Evidence Index** — Reference table mapping findings to source files and line numbers.

## D) Methodology

The analysis ran across four phases. Phase 0 framed the question and defined quality criteria. Phase 1 dispatched five simultaneous area investigators covering component inventory (area-1), redundancy mapping (area-2), exclusive functionality detection (area-3), accessibility and landmark impact (area-4), and layout and game-state edge cases (area-5). Phase 2 dispatched five deep-dive iterators targeting the ended-state lifecycle (iterator-1), `useQuickScore` duplication analysis (iterator-2), feature criticality assessment (iterator-3), scene-by-scene scoring matrix (iterator-4), and bug validation (iterator-5). Phase 3 produced three independent synthesis lenses — thematic/narrative (synthesis-1), risk/opportunity (synthesis-2), and gaps/implications (synthesis-3). Phase 4 (this document) weaves all outputs into a unified final report.

Tools used: `Glob`, `Grep`, `Read` applied to the `apps/trivia/src/` directory tree. No files were modified. Evidence is cited with file paths and line numbers throughout.

## E) Key Findings

Findings are ordered by confidence × impact. Confidence levels: Definitive (code-traced, no ambiguity), High (strong evidence, minor caveats), Medium (inferred, some unknowns). Impact levels: High (blocks removal or causes game-breaking regression), Medium (meaningful UX degradation), Low (minor or pre-existing).

### F1: Ended-State UI Vacuum — Hard Blocker for Removal
**Confidence:** Definitive | **Impact:** High

When `status === 'ended'`, the sidebar's "View Final Results" button (`page.tsx:542-549`) is the only mechanism to open the `RoundSummary` overlay showing final standings. The auto-show logic at `page.tsx:78-82` fires only when `audienceScene === 'round_summary' && status === 'between_rounds'` — neither condition holds during `ended`. The `VALID_SCENES_BY_STATUS` map for `ended` contains `{final_buildup, final_podium, emergency_blank}` — `round_summary` is explicitly absent. No keyboard shortcut triggers `setShowRoundSummary(true)` during `ended`. The `RoundSummary` component handles `ended` correctly (shows "Final Results" header, winner display, standings table) but is orphaned from any trigger during that state.

Additionally: once `RoundSummary` is dismissed during `ended`, there is no mechanism to reopen it except the sidebar button. Auto-show fires on `between_rounds` only. Any replacement must include a persistent re-open affordance, not merely a one-time auto-show trigger.

The feature has zero dedicated automated tests — no unit test, no E2E test, no manual test case. CI would pass green while this path is broken.

**Cross-references:** F7 (RoundSummary orphaned design), F8 (inverted test coverage), F4 (latent bug that must be fixed before replacement ships).

### F2: Dual useQuickScore Is a Confirmed Production Bug
**Confidence:** Definitive | **Impact:** High

Two fully independent `useQuickScore` instances exist: Instance 1 in `use-game-keyboard.ts:100` (keyboard pathway) and Instance 2 in `page.tsx:172` (passed to `QuickScoreGrid`). Each creates its own `useState<Set<string>>` for `scoredTeamIds` and its own `useRef` for `historyRef`. They share only the `adjustTeamScore` store action. Because state is not shared, pressing digit key 1 adds a team to Instance 1's `scoredTeamIds` but leaves Instance 2 unchanged — `QuickScoreGrid` shows the team as un-highlighted while the score increments. Clicking the grid button records in Instance 2, making the keyboard Ctrl+Z undo operate on the wrong history stack.

This is an actively observable bug in mixed keyboard+mouse scoring sessions. Sidebar removal eliminates Instance 2 as dead code (`page.tsx:172` becomes unused), leaving only the correct keyboard instance. Removal resolves the bug as a direct side effect with no additional work required.

**Cross-references:** F5 (sidebar as compensatory overlay), F13 (presenter operator model — pure-keyboard users do not experience this bug).

### F3: Divergent Reset Path Is a Confirmed Production Bug
**Confidence:** Definitive | **Impact:** High

The sidebar "Start New Game" button calls `game.resetGame()` directly (`page.tsx:551`) — no confirmation modal, teams preserved with scores zeroed. The header/R-key path goes through `confirmNewGame()` (`page.tsx:128-135`), which shows a confirmation modal then calls `resetGame()` AND removes all teams. A code comment at `page.tsx:130` — "Clear teams that resetGame preserves" — confirms the codebase is aware of the behavioral divergence.

Two defects compound this: (1) the sidebar reset does not call `store.setAudienceScene('waiting')`, leaving the audience display on `final_podium` after reset; (2) both paths present under similar "new game" language with no indication they behave differently. Sidebar removal routes all resets through the single correct path. No additional work required.

**Cross-references:** F5 (sidebar as patch), F8 (no test catches this behavioral divergence).

### F4: handleNextRound Latent Bug — Becomes High-Severity with Any Ended-State Replacement
**Confidence:** Definitive | **Impact:** High (conditional on replacement shipping)

`handleNextRound` at `page.tsx:89-93` calls `game.nextRound()` then unconditionally sets `audienceScene` to `round_intro`. `game.nextRound()` in `rounds.ts:24-25` is a no-op when `status !== 'between_rounds'` — it returns without state changes. If `handleNextRound` is called when `status === 'ended'`, the game state does not advance, but `audienceScene` is set to `round_intro` — an invalid scene for `ended` status.

This call path is currently unreachable: `handleNextRound` is wired to the `RoundSummary` "End Game" button, and `RoundSummary` does not render during `ended` (it is gated behind `showRoundSummary` which starts `false` and has no trigger during `ended`). The moment any replacement adds auto-show or a persistent "View Final Results" button, every user who clicks "End Game" from the overlay during `ended` triggers this bug. It must be fixed before the replacement ships.

**Cross-references:** F1 (the trigger gap the replacement must fill), F7 (RoundSummary component design).

### F5: The Sidebar Is Compensatory Infrastructure, Not Primary Design
**Confidence:** High | **Impact:** High

Each of the four sidebar sections compensates for a specific gap in the center panel's design:
- `TeamManager` (rename-only at runtime): compensates for the setup wizard gating add/remove on `status === 'setup'` with no mid-game rename path
- `QuickScoreGrid`: compensates for the keyboard scoring pathway having no visual feedback in the center panel
- `TeamScoreInput`: compensates for the absence of score correction UI in the center panel during non-scoring scenes
- Game Over block: compensates for the center panel having zero ended-state UI

The sidebar accumulated as a remediation layer rather than emerging from deliberate design. This explains why removal is both safer and harder than it appears: safer because the core functions are either duplicated or bugs; harder because removal exposes the architectural gaps the sidebar was quietly servicing.

**Cross-references:** F1 (ended-state gap), F2 (QuickScoreGrid visual feedback), F9 (rename gap), F10 (score override gap).

### F6: round_scoring Scene Is Definitive Prior Art for Sidebar-Free Design
**Confidence:** Definitive | **Impact:** Medium

The sidebar is already suppressed during `round_scoring` via `{!isRoundScoringScene && (<aside>)}` at `page.tsx:497`. The `RoundScoringPanel` in the center panel provides complete scoring during this scene — number inputs, undo, clear, Done button — with no sidebar dependency. This was implemented deliberately (BEA-673) and already shipped to users.

This constitutes proof-of-concept within the same codebase that sidebar-free presenter scoring is viable. The bingo app's presenter view (`/play`) also operates without a right sidebar, providing a second production data point on the same platform — this evidence was not referenced during earlier investigation phases and represents an unexamined source of supporting pattern evidence.

**Cross-references:** F5 (sidebar as compensatory), F11 (center panel layout expansion).

### F7: RoundSummary Component Is Designed for Ended State but Orphaned from Any Trigger
**Confidence:** Definitive | **Impact:** High

`RoundSummary.tsx` correctly handles the ended state: it renders a "Final Results" header when `isLastRound === true` (passed as `game.isLastRound || game.status === 'ended'` at `page.tsx:480-483`), shows winner display, and renders a standings table. The component architecture was designed with ended state in mind. The gap is the trigger: `showRoundSummary` is never auto-set to `true` during `ended`. The code was built to depend on the sidebar button as the only trigger, with no alternative path.

**Cross-references:** F1 (the trigger gap), F4 (the handleNextRound bug exposed when the overlay is shown during ended).

### F8: Test Coverage Is Inverted Relative to Risk
**Confidence:** Definitive | **Impact:** Medium

The most critical sidebar-exclusive feature ("View Final Results", MUST RELOCATE classification) has zero dedicated tests: no unit test, no E2E test, no manual test case. The least critical feature (per-round score breakdown, ACCEPTABLE LOSS classification) has 4 unit tests and 1 E2E test at `@medium`. Mid-game rename has 8 unit tests and 1 E2E test marked `@high` — but that E2E test (`presenter.spec.ts:138-162`) exercises the setup wizard path, not the mid-game sidebar rename. After sidebar removal, this test continues passing while mid-game rename silently disappears.

Sidebar removal can pass all automated quality gates while simultaneously breaking the most important end-game workflow. Any removal commit must include, at minimum, an E2E test for the ended-state flow as a non-negotiable artifact.

**Cross-references:** F1 (the zero-test blocker), F9 (rename test covers wrong path).

### F9: Mid-Game Team Rename Is Sidebar-Exclusive and Intentionally Ungated
**Confidence:** High | **Impact:** Medium

`TeamManager.tsx:88-95` deliberately renders the Rename button regardless of `status`. The add/remove buttons are gated on `status === 'setup'` (`lines 97-108, 121-139`) but rename is intentionally available during gameplay. No keyboard shortcut for rename exists in `use-game-keyboard.ts`. No other component calls `renameTeam` during `playing`/`between_rounds`/`ended`. The setup wizard's `SetupGate` only renders during `status === 'setup'`.

Classification: **SHOULD RELOCATE.** 8 unit tests with explicit status-variant assertions establish this as an intentional, well-tested feature. The only workaround — restarting the game — loses all progress, which is a costly consequence in a live pub trivia event where teams may misspell names after the game starts.

**Cross-references:** F5 (sidebar as patch for setup wizard gate), F8 (E2E test covers wrong path).

### F10: Direct Score Override (setTeamScore) Is Sidebar-Exclusive
**Confidence:** High | **Impact:** Medium

`TeamScoreInput.tsx:27-35` is the only callsite for `setTeamScore` during active gameplay. The keyboard pathway only provides `adjustTeamScore` (±1) and `quickScore.toggleTeam` (±1 toggle). `RoundScoringPanel` uses `setRoundScores` (bulk), not `setTeamScore`. No alternative UI path exists for setting a team's score to an arbitrary number.

Classification: **SHOULD RELOCATE.** 6 unit tests and 5 engine tests cover this path. The workaround — repeated ±1 keystrokes — is acceptable for small corrections (1-3 points) but impractical for large corrections (correcting 150 to 15 requires 135 keypresses) under live event time pressure.

**Cross-references:** F5 (sidebar as correction UI patch), F13 (operator model affects severity rating).

### F11: Center Panel Gains +320px Width With No Max-Width Constraints
**Confidence:** High | **Impact:** Medium

The 3-column flex layout gives the center panel `flex-1`. At a 1440px viewport, the center panel currently occupies approximately 864px; after sidebar removal it would occupy approximately 1184px — a 37% increase. No CSS media queries reference the sidebar (`page.tsx` and `globals.css` contain no sidebar-targeting responsive breakpoints). No max-width constraints exist on center panel content cards.

Net positive for projector-mirrored viewports. However, without `max-w-*` constraints, content cards will stretch to full width, potentially producing awkward line lengths. Requires visual verification at common presenter resolutions (1280×800, 1366×768) before merge.

**Cross-references:** F6 (prior art in round_scoring scene and bingo app).

### F12: Accessibility Impact Is Net Neutral to Positive
**Confidence:** High | **Impact:** Low

Current landmarks: `banner`, `complementary` (Question navigator), `main`, `complementary` (Game controls and team management). After removal: `banner`, `complementary` (Question navigator), `main`. Valid landmark structure remains. The sidebar's well-structured ARIA (regions, lists, groups, `aria-live`, `aria-pressed`) should be replicated on any replacement components.

Two pre-existing accessibility bugs are unrelated to removal and should be fixed independently: (1) the skip link at `page.tsx:235` targets `#main` (a `<div id="main">`) rather than the `<main id="main-content">` element; (2) no `<nav>` landmark wraps the header buttons. Focus management code never targets the sidebar (`mainRef.current.focus()` targets `<main>` on status transition), so removal creates no focus restoration regression.

### F13: Presenter Operator Model Is Undefined — Acts as Risk Multiplier for SHOULD Items
**Confidence:** High | **Impact:** Medium (as severity modifier)

Every "keyboard fallback exists" conclusion throughout the analysis rests on an assumption that the presenter is keyboard-proficient. This was never validated from usage data, user research, or product specification. If a significant portion of presenters operate via trackpad or touchscreen only — plausible for a laptop used at pub trivia nights — then keyboard fallbacks for scoring (digit keys 1-9, Shift+digit, Ctrl+Z) are not fallbacks at all.

This does not change the MUST RELOCATE classification for "View Final Results" (which has no keyboard fallback regardless). It does affect the severity of SHOULD RELOCATE items: if presenters are predominantly mouse-first, losing `QuickScoreGrid` visual scoring and `TeamScoreInput` score override represents primary-path regression, not minor UX degradation. This finding should be resolved before SHOULD items are permanently deferred.

**Cross-references:** F2 (dual useQuickScore bug affects only mixed keyboard+mouse users), F9, F10.

## F) Analysis and Implications

### Thematic Pattern: The Sidebar as Accumulated Debt

The sidebar's four sections share a single structural origin: the center panel was underspecified, and the sidebar absorbed the overflow. This is not a flaw unique to the sidebar — it is a natural consequence of iterative feature development. The pattern explains why the component inventory felt incoherent (team management, scoring, and game-over controls all in one place) and why redundancy analysis found both deep duplication and genuine unique capabilities simultaneously. The sidebar was never a coherent "team management panel" or "scoring panel." It was a catch-all for whatever the center panel could not accommodate.

The consequence for removal: removing the sidebar is not just deleting 67 lines of JSX. It is withdrawing the compensation for five distinct center panel design decisions that were never revisited. The safe path is not to pretend these gaps don't exist but to identify which ones are genuinely problematic and address only those.

### Thematic Pattern: Production Bugs Framed as Removal Benefits vs. Independent Issues

Syntheses 1 and 2 frame the dual `useQuickScore` bug and the divergent reset bug as "removal benefits" — side effects that make removal net positive. This framing is factually accurate but strategically incomplete. Both bugs affect production today, independent of any sidebar decision. A user who mixes keyboard and click-based scoring experiences visual desync and broken undo right now. A presenter who clicks "Start New Game" from the sidebar leaves the audience display on `final_podium` right now.

Synthesis 3 correctly identifies that tying these fixes to the sidebar removal delays resolution and makes corrections contingent on a larger architectural decision. The correct position — adopted here — is to file both bugs as independent Linear issues and fix them on their own merit. If removal ships first, the bugs are resolved as a side effect. If the bugs are fixed independently first, they either fix the sidebar in-place (acceptable) or strengthen the case for removal by demonstrating the sidebar creates competing implementation paths.

### Risk Profile: One Hard Blocker, One Latent Time Bomb, Two Meaningful Losses, Net Positive

The overall risk profile is asymmetric. One item is a hard engineering blocker (F1: ended-state UI vacuum). One item is a latent bug that becomes high-severity the moment the blocker is fixed (F4: `handleNextRound`). Two items are meaningful UX losses that are recoverable (F9: rename, F10: score override). Everything else is net positive or neutral (F2, F3 bugs eliminated; F11 layout improvement; F12 accessibility net neutral).

The counterintuitive conclusion stands: the sidebar is making the codebase demonstrably worse in two quantifiable ways (F2, F3), while providing features whose risk profile ranges from "must relocate" to "acceptable loss." A properly executed removal leaves the codebase in better shape than the current sidebar-present state.

### Sequencing Divergence Resolution: Atomicity for MUST, Simultaneous Issue Creation for SHOULD

Syntheses 1 and 2 recommend proceeding with removal once the MUST RELOCATE item (F1) is addressed, deferring SHOULD RELOCATE items (F9, F10) to follow-up. Synthesis 3 warns that separate PRs create an intermediate state where features are silently missing, with CI passing green.

The resolution: deferral of SHOULD items is acceptable only if the intermediate state is explicitly documented and follow-up issues are filed simultaneously with the removal PR — not as a promise for later. The danger Synthesis 3 correctly identifies is the "I'll file that later" gap that becomes permanent. Atomicity is required for the MUST item (no sidebar deletion without simultaneous ended-state fix). Simultaneous issue creation is required for SHOULD items (filed and linked before the removal PR merges, not after).

### Gaps: What the Full Investigation Does Not Know

Three material unknowns persist after all phases of investigation:

1. **Presenter operator model (F13).** The analysis cannot definitively rate keyboard-fallback-dependent SHOULD items without knowing how presenters actually use the product. This is the highest-priority open question before the SHOULD items are classified as permanently deferred.

2. **Center panel visual quality at real presenter resolutions (F11).** The +37% width increase was analyzed at CSS level but not visually verified at 1280×800 or 1366×768. Requires manual verification.

3. **Whether production bugs F2 and F3 have been observed.** Code analysis confirms the bugs are real and triggerable. Urgency of independent filing depends on whether users are encountering them, which is observable via Sentry or a manual Playwright MCP reproduction test.

## G) Confidence Assessment

### Overall Confidence

High. The four-phase funnel produced consistent findings across independent investigators with minimal contradictions. Every disagreement was traceable to a specific blind spot (operator model) or a scope boundary (visual resolution testing). The three synthesis lenses disagreed on urgency and framing but agreed on all fundamental conclusions.

### Strongest Claims (Definitive — full call chain traced)

- "View Final Results" (`page.tsx:542-549`) is the only mechanism to open `RoundSummary` during `ended`. No keyboard fallback. No auto-show path.
- The dual `useQuickScore` instances are fully independent (separate `useState`, separate `useRef`). Visual desync is actively observable.
- The sidebar reset (`game.resetGame()` direct) and header/R-key reset (`confirmNewGame()`) have materially different behavior. The divergence is a bug.
- `handleNextRound` at `page.tsx:89-93` unconditionally sets `audienceScene` to `round_intro` even when `game.nextRound()` is a no-op for `ended` state.
- `round_summary` is not a valid scene during `ended` status per `VALID_SCENES_BY_STATUS`.
- The sidebar is already suppressed during `round_scoring` (confirmed prior art).

### Moderate Claims (High — strong evidence, minor caveats)

- The sidebar is compensatory infrastructure rather than primary design (high confidence on the pattern; "compensatory" involves interpretive judgment about design intent, but the evidence is strong).
- Mid-game rename is intentionally ungated on `status` (high confidence from code; intentionality inferred from deliberate asymmetry between gated add/remove and ungated rename).
- `setTeamScore` has no keyboard equivalent during gameplay (high confidence; full callsite scan performed across the codebase).
- Center panel has no max-width constraints (high confidence from CSS inspection; visual impact at real resolutions uninvestigated).

### Weakest Claims (Medium — inferred, meaningful unknowns)

- Mouse-only operator risk rated "Medium/Medium" by Synthesis 2. This rating assumes keyboard-first operator population — an assumption never validated. The actual risk could be higher.
- "Per-round breakdown is ACCEPTABLE LOSS." Based on code analysis of alternative data views, not observation of whether presenters use this view mid-game.

### Known Blind Spots

1. Presenter operator model — keyboard vs. mouse vs. touchscreen usage distribution is unknown and unvalidated.
2. `handleNextRound` bug — currently unreachable; real-world impact depends entirely on how the ended-state replacement is designed.
3. Visual quality of center panel at 1280×800 with +320px — not tested.
4. Bingo's sidebar-free presenter was noted as a gap in Phase 3 but not substantively analyzed as pattern evidence.
5. `id="game-controls"` reference search was not performed — any external consumers of this aside ID would be affected by removal.

## H) Recommendations

Recommendations are ordered by priority. No implementation design is provided.

### R1: File the Two Confirmed Production Bugs Independently (Priority: Immediate, unconditional)

Dual `useQuickScore` (F2) and divergent reset (F3) affect production today. They should be filed as independent Linear issues and fixed on their own merit. Framing them only as "removal benefits" delays resolution and makes corrections contingent on a larger architectural decision that may not ship soon. Fixing these bugs in the sidebar-present state requires modifying sidebar code that may later be deleted — accept that short-term duplication.

Trade-off: minimal. The fixes are self-contained. The only cost is doing the work before the sidebar removal decision is finalized.

### R2: Fix the handleNextRound Latent Bug Before Designing the Ended-State Replacement (Priority: Before replacement design begins)

F4 is currently unreachable but becomes high-severity the moment any auto-show or persistent "View Final Results" mechanism is added. Fix the call path before designing the replacement so the replacement design space is clear. The fix requires a product decision: what should "End Game" do when clicked from `RoundSummary` during `ended`? Dismiss only? Trigger a reset flow? The answer shapes the fix.

Trade-off: fixing a currently-unreachable bug feels premature but costs almost nothing and prevents a guaranteed high-severity regression.

### R3: Address the Ended-State UI Vacuum as a Hard Prerequisite to Sidebar Removal (Priority: Must precede any sidebar deletion)

F1 is the single hard blocker. The replacement must: (a) provide a mechanism to open `RoundSummary` during `ended`, (b) provide a persistent re-open affordance (not just a one-time auto-show trigger, since dismissing the overlay currently leaves no way back), and (c) be accompanied by an E2E test covering the ended-state flow before the removal commit merges. The `RoundSummary` component is ready for ended state — only the trigger mechanism and re-open affordance are missing.

Trade-off: the replacement scope is smaller than it appears. The component handles ended state correctly. The work is connecting the trigger and fixing F4.

### R4: Treat Sidebar Deletion and the Ended-State Replacement as a Single Atomic PR (Priority: Architecture constraint for the removal PR)

Separate PRs create an intermediate state where the sidebar is deleted and final scores are inaccessible with CI green. Synthesis 3's atomicity concern is valid and correct for the MUST item. The removal PR should not merge without the ended-state replacement fully implemented and tested within the same commit.

Trade-off: the atomic PR is slightly larger but the risk of a green-CI regression justifies the constraint.

### R5: File SHOULD RELOCATE Items as Simultaneous Issues at Removal PR Creation (Priority: At removal PR creation, not later)

Mid-game rename (F9) and direct score override (F10) are meaningful losses but not hard blockers. The pragmatic "defer to follow-up" approach from Syntheses 1 and 2 is sound if and only if follow-up issues are created and linked at the time the removal PR is raised. Deferred issues filed "later" frequently become permanent deferral. The removal PR description should enumerate deferred capabilities as known regressions (not bugs) with linked Linear issue numbers, created before the PR merges.

Trade-off: deferred SHOULD items create a temporary degradation window proportional to the time before follow-up ships. Severity depends on resolving F13.

### R6: Resolve the Presenter Operator Model Before Permanently Classifying SHOULD Items (Priority: Before final SHOULD deferral decision)

F13 is a severity multiplier. If presenters are predominantly keyboard-first, deferring SHOULD items is low-risk. If a significant portion are mouse-first or touchscreen-first, the SHOULD items may need to be elevated to near-MUST priority. The operator model should be resolved — through telemetry, user research, or a conservative design posture that treats all scoring surfaces as mouse-accessible — before SHOULD items are indefinitely deferred.

Trade-off: may require data or research that is not immediately available. A conservative fallback: treat the operator as mouse-first until proven otherwise.

### R7: Visually Verify Center Panel at 1280x800 Before Merging Removal (Priority: Quality gate, pre-merge)

F11 confirms the mechanical CSS consequence (+37% width increase) but not the visual result at typical presenter laptop resolutions. Playwright MCP screenshot at `1280×800` and `1366×768` before and after the layout change. Add `max-w-*` constraints to center content if cards stretch awkwardly.

Trade-off: low effort, catches layout regressions before they reach production.

### R8: Fix the Pre-Existing Skip Link Bug Independently of Sidebar Removal (Priority: Independent, low urgency)

The skip link at `page.tsx:235` targets `#main` (a `<div>`) instead of `#main-content` (the `<main>` element). Pre-existing accessibility bug unrelated to sidebar removal. Should be filed and fixed on its own merit.

## I) Open Questions

### OQ1: What should happen when "End Game" is clicked from RoundSummary during ended status?
**Why it matters:** F4 confirms the current `handleNextRound` call chain is incorrect for `ended`. The fix requires a product decision: should "End Game" from the overlay during `ended` dismiss only, trigger a reset flow, or show a confirmation modal? The fix itself is a few lines, but the behavior must be specified first.
**Suggested approach:** Product decision, then code fix. The fix is localized to `handleNextRound` or a new handler for the `ended` context.

### OQ2: What is the presenter operator model for input modality?
**Why it matters:** The keyboard-fallback rationale for SHOULD RELOCATE items rests on an unvalidated assumption. If a meaningful portion of presenters are mouse-first or touchscreen-first, SHOULD item severity changes materially.
**Suggested approach:** Review Grafana Cloud Tempo traces for click vs. keyboard events on `adjustTeamScore`. Alternatively, adopt a conservative posture treating all scoring surfaces as mouse-accessible.

### OQ3: Does anything reference `id="game-controls"` (the sidebar's aside element)?
**Why it matters:** If any CSS, JavaScript, or test references this ID, removal silently breaks those references.
**Suggested approach:** `grep -r "game-controls"` across the full monorepo before the removal PR is finalized.

### OQ4: How does the +37% center panel width affect visual design at common presenter resolutions?
**Why it matters:** F11 confirmed the mechanical consequence but not the visual result. Content cards stretching to 1184px at 1440px viewport may produce unusable layouts at 1280×800.
**Suggested approach:** Playwright MCP screenshots at `1280×800` and `1366×768` viewports before and after. Add `max-w-*` constraints as needed.

### OQ5: Are the two confirmed production bugs (F2, F3) reproducible in production today?
**Why it matters:** Code analysis confirms the bugs are real and triggerable. Whether users are encountering them affects urgency of independent bug filing.
**Suggested approach:** Manual Playwright MCP test: during a game, press digit key 1, then click the QuickScoreGrid button for the same team — observe whether visual highlight state matches. Check Sentry for related errors.

### OQ6: Does Bingo's sidebar-free presenter design offer reusable layout patterns?
**Why it matters:** Bingo's `/play` view has operated without a right sidebar in production. Its layout and UX patterns for a 2-column presenter view may directly inform how the trivia center panel accommodates relocated content, with less trial and error.
**Suggested approach:** Read `apps/bingo/src/app/play/page.tsx` to identify the 2-column layout structure, max-width patterns, and any scoring surface design decisions that translate to trivia.

## J) Appendix: Evidence Index

| Finding | Key Files | Line References |
|---------|-----------|-----------------|
| F1: Ended-state UI vacuum | `page.tsx`, `game-store.ts`, `audience-scene.ts`, `scene-transitions.ts` | `page.tsx:78-82` (auto-show guard), `page.tsx:542-549` (View Final Results button), `audience-scene.ts:177-192` (VALID_SCENES_BY_STATUS) |
| F2: Dual useQuickScore | `use-game-keyboard.ts`, `page.tsx`, `use-quick-score.ts` | `use-game-keyboard.ts:100` (Instance 1), `page.tsx:172` (Instance 2), `page.tsx:520` (QuickScoreGrid consumer) |
| F3: Divergent reset | `page.tsx`, `game-store.ts` | `page.tsx:128-135` (confirmNewGame), `page.tsx:551` (sidebar direct reset), `page.tsx:130` (code comment), `game-store.ts:143-150` (resetGame no audienceScene reset) |
| F4: handleNextRound latent bug | `page.tsx`, `rounds.ts` | `page.tsx:89-93` (handleNextRound), `rounds.ts:24-25` (nextRound no-op guard) |
| F5: Sidebar as compensatory | `page.tsx`, `TeamManager.tsx`, `WizardStepTeams.tsx` | `page.tsx:496-563` (sidebar block), `TeamManager.tsx:88-95` (rename ungated), `TeamManager.tsx:97-108` (add/remove gated on setup) |
| F6: round_scoring prior art | `page.tsx`, `RoundScoringPanel.tsx` | `page.tsx:497` (sidebar suppression), `page.tsx:385-405` (round_scoring layout) |
| F7: RoundSummary orphaned | `RoundSummary.tsx`, `page.tsx` | `page.tsx:475-495` (RoundSummary render guard), `page.tsx:480-483` (isLastRound prop with ended check) |
| F8: Inverted test coverage | `presenter.spec.ts`, test files | `presenter.spec.ts:138-162` (rename E2E covers setup wizard, not mid-game sidebar) |
| F9: Mid-game rename | `TeamManager.tsx`, `use-game-keyboard.ts`, `SetupGate.tsx` | `TeamManager.tsx:88-95` (rename ungated), `page.tsx:511` (sidebar callsite), `SetupGate.tsx:29,158` (setup-only renameTeam calls) |
| F10: setTeamScore | `TeamScoreInput.tsx`, `use-game-keyboard.ts` | `TeamScoreInput.tsx:27-35` (only callsite for setTeamScore), `use-game-keyboard.ts:141-158` (keyboard ±1 only) |
| F11: Center panel width | `page.tsx`, `globals.css` | `page.tsx:352` (flex container), `page.tsx:496` (w-80 sidebar declaration) |
| F12: Accessibility | `page.tsx`, `accessibility.test.tsx` | `page.tsx:235` (skip link), `page.tsx:246` (wrong target div), `page.tsx:379` (main element) |
| F13: Operator model | N/A — gap finding | Absence of usage data is the evidence; no code reference |

---

*Report produced by Phase 4 Final Synthesizer. Source artifacts: `docs/trivia-sidebar-removal/phase-1/area-{1-5}-*.md`, `docs/trivia-sidebar-removal/phase-2/iterator-{1-5}-*.md`, `docs/trivia-sidebar-removal/phase-3/synthesis-{1-3}.md`, `docs/trivia-sidebar-removal/context-packets/phase-{0-3}-packet.md`.*

---
