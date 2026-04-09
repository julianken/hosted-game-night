# Trivia Round Configuration Redesign: Final Unified Analysis Report

## A) Executive Summary

This report synthesizes findings from a five-phase analysis funnel (5 area investigations, 5 deep-dive iterations, 3 synthesis reports) examining how to redesign the trivia setup wizard's Step 2. The core change flips the data flow: instead of the user specifying questions-per-round (QPR) and the system deriving round count, the user specifies the number of rounds (or delegates to a "By Category" organizer), and QPR becomes a computed output. The analysis finds this redesign is architecturally well-aligned with the existing codebase: the engine is already agnostic to how `roundIndex` is assigned, the category system is mature with rich utilities, and the migration is purely additive (no fields removed, no types broken). The highest-risk area is not the algorithm or data model but the runtime interaction between dual stores during redistribution -- specifically the feedback loop between `importQuestions()` overwriting `settings.roundsCount` and the settings-to-game-store sync effect. A pre-existing bug in three audience scene components (modulo-based `questionInRound` calculation that fails for variable round sizes) must be fixed as part of this work, since "By Category" mode makes variable round sizes the default. The total scope is approximately 15-20 files modified, with the core logic concentrated in two new pure functions of roughly 15 lines each.

## B) Analysis Question & Scope

**Question:** How should the trivia setup wizard Step 2 be redesigned to remove the "Questions Per Round" input, add a "Number of Rounds" input with computed QPR, and add a "By Category" mode (default ON) that auto-organizes rounds by category?

**In scope:**
- Settings store changes (new `isByCategory` field, store migration v3 to v4)
- Round assignment algorithm design (by-count and by-category)
- Redistribution mechanism (when users change settings after questions are imported)
- UI changes to WizardStepSettings, WizardStepReview, SettingsPanel, save modals, preset/template selectors
- Validation (V6) behavior under the new model
- Audience scene compatibility with variable round sizes
- Preset and template interaction with new settings

**Out of scope:**
- Database schema migration for presets/templates tables (deferred decision)
- E2E test implementation (identified as a gap, not designed here)
- Question editor changes
- Game engine runtime behavior changes (confirmed unnecessary)

## C) Table of Contents

**D) Methodology** -- Tools used, code areas investigated, documents examined across all phases.

**E) Key Findings** -- 13 findings organized by theme, each with confidence level, evidence, impact, and cross-references. Covers the QPR phantom-input pattern, the uniform round-assignment formula, category system readiness, the timing gap requiring redistribution, migration additive-only property, the modulo bug in audience scenes, the feedback loop risk, the roundsCount max constraint, the SettingsPanel duplicate slider, the dual-store sync race, the toggle-off state loss risk, the V6 validation obsolescence, and the QuestionAnticipationScene correct pattern.

**F) Analysis & Implications** -- Thematic patterns across findings, risk/vulnerability profile, strengths and opportunities, and gaps that remain unresolved.

**G) Confidence Assessment** -- Overall confidence evaluation, ranking of strongest to weakest claims, and known blind spots.

**H) Recommendations** -- 8 prioritized recommendations with rationale, trade-offs, and open questions for each.

**I) Open Questions** -- 6 questions this analysis surfaced but did not resolve, with suggested approaches.

**J) Appendix: Evidence Index** -- Reference table mapping all findings to specific code files and line numbers.

## D) Methodology

### Tools and Approach
The analysis was conducted across five phases using code exploration tools (Glob, Grep, Read, Bash) to search and read files across the `apps/trivia/src/` directory tree. No files were modified.

### Code Areas Investigated
- **Stores:** `stores/settings-store.ts` (settings persistence, validation, migration), `stores/game-store.ts` (game state management)
- **Engine:** `lib/game/questions.ts` (question import/export), `lib/game/lifecycle.ts` (game lifecycle, settings update), `lib/game/selectors.ts` (validation, computed values)
- **Categories:** `lib/categories.ts` (category config, statistics, filtering, mapping)
- **Questions module:** `lib/questions/` (parser, validator, converter, exporter, api-adapter -- 7 files)
- **UI components:** `components/presenter/WizardStepSettings.tsx`, `WizardStepReview.tsx`, `SetupWizard.tsx`, `SetupGate.tsx`, `SettingsPanel.tsx`, `SavePresetModal.tsx`, `SaveTemplateModal.tsx`, `PresetSelector.tsx`, `TemplateSelector.tsx`, `QuestionSetSelector.tsx`, `TriviaApiImporter.tsx`
- **Audience scenes:** `components/audience/scenes/QuestionDisplayScene.tsx`, `QuestionClosedScene.tsx`, `AnswerRevealScene.tsx`, `QuestionAnticipationScene.tsx`
- **Hooks:** `hooks/use-auto-load-default-template.ts`
- **Types:** `types/index.ts` (GameSettings interface, Question type)
- **Page:** `app/play/page.tsx` (dual-store sync effect)

### Quantitative Scope
- 127 occurrences of `questionsPerRound` across 36 files in `apps/trivia/src/`
- 5 independent sites duplicating the `Math.floor(index / questionsPerRound)` round-assignment formula
- 3 audience scene components with the modulo-based `questionInRound` bug
- 7 canonical question categories, 10 external API categories mapped to them

## E) Key Findings

### Finding: QPR is a Phantom Input With a Single User-Facing Control
**Confidence:** High
**Evidence:** `WizardStepSettings.tsx` lines 45-52 contain the only user-editable QPR slider. The 36-file footprint of `questionsPerRound` consists entirely of: the settings store definition (`settings-store.ts:17`), the game settings type (`types/index.ts:154`), store consumers that read the value, save modals that display it, and the audience scenes that use it for display calculations. `QuestionDisplayScene.tsx` at lines 39-42 already computes QPR from actual round membership (`questions.filter(q => q.roundIndex === currentRound).length`) and only falls back to the stored setting, proving the derived-value pattern is already viable in production.
**Impact:** Removing the QPR slider does not require removing QPR from the store, the types, or any consumer. The true scope is approximately 8 files that present QPR as editable or compare against it: the WizardStepSettings slider, the SettingsPanel slider, two save modals (SavePresetModal, SaveTemplateModal), the PresetSelector display, the WizardStepReview match comparison, the V6 validation, and the settings store migration.
**Related findings:** Migration Additive-Only, V6 Validation Obsolescence

---

### Finding: Round Assignment Uses a Single Duplicated Formula Across 5 Sites
**Confidence:** High
**Evidence:** All five round-assignment sites use the identical formula `Math.floor(index / questionsPerRound)`:
- `api-adapter.ts:203` -- `triviaApiQuestionsToQuestions()`
- `TriviaApiImporter.tsx:179` -- `handleLoadIntoGame()`
- `QuestionSetSelector.tsx:83` -- question set loading
- `TemplateSelector.tsx:114` -- template loading
- `use-auto-load-default-template.ts:34` -- auto-load hook

The engine function `importQuestions()` in `questions.ts:43-77` does NOT perform round assignment. It reads pre-assigned `roundIndex` values and derives `totalRounds` from `Math.max(...questions.map(q => q.roundIndex)) + 1`. The engine is fully agnostic to how rounds were assigned.
**Impact:** A single shared module (`lib/questions/round-assignment.ts`) can centralize both assignment strategies. All 5 call sites can delegate to it. The engine requires zero changes. This fits the existing pattern of the `lib/questions/` directory, which already contains pure transform functions (parser, validator, converter, exporter, api-adapter).
**Related findings:** Category System Readiness, Timing Gap

---

### Finding: Category System is Mature and Ready to Organize Rounds
**Confidence:** High
**Evidence:** `lib/categories.ts` (372 lines) provides a complete category infrastructure: 7 canonical categories defined at lines 23-66, `getCategoryStatistics()` at lines 259-292 (returns groups sorted by count descending with percentages), `getUniqueCategories()` at lines 342-350, `filterQuestionsBySingleCategory()` at lines 330-337, display utilities (`getCategoryName()`, `getCategoryColor()`, `getCategoryBadgeClasses()`), and external API mapping via `TRIVIA_API_CATEGORY_MAP` (lines 100-111) that maps 10 API categories to 7 internal ones. Every question has a mandatory `category: QuestionCategory` field guaranteed by `mapApiCategory()` which falls back to `'general_knowledge'` for unknown values.
**Impact:** The `assignRoundsByCategory()` function is nearly trivially derivable from existing utilities: call `getCategoryStatistics(questions)` to get sorted groups, assign sequential `roundIndex` per group. The number of rounds equals the number of distinct categories. No new category infrastructure is needed.
**Related findings:** roundsCount Max Constraint (tension between 7 categories and max=6)

---

### Finding: Timing Gap Requires a New Redistribution Mechanism
**Confidence:** High
**Evidence:** Questions receive their `roundIndex` at import time (Step 1), but round configuration changes happen in Step 2. Today this gap is invisible because the QPR slider and the import both use the same `questionsPerRound` value. In the redesign, changing "Number of Rounds" or toggling "By Category" in Step 2 must cause existing questions to be redistributed. The engine function `updateSettings()` in `lifecycle.ts:133-155` updates `totalRounds` and timer state but does NOT touch questions. The proposed solution is a new `redistributeQuestions()` engine function triggered by a `useEffect` in `SetupGate.tsx` that watches `roundsCount` and `isByCategory` changes. This follows the established pattern: engine functions are pure transforms, store actions wrap them, and components trigger them via effects.
**Impact:** This is the only genuinely new architectural requirement. Everything else operates within existing patterns. The redistribution function is approximately 30 lines of new code.
**Related findings:** Feedback Loop Risk, Dual-Store Sync Race

---

### Finding: Migration is Additive-Only and Backward-Compatible
**Confidence:** High
**Evidence:** The settings store at `settings-store.ts` is currently version 3 (line 117). The migration requires: bump to version 4, add `isByCategory: boolean` (default `true`) to `SettingsState`, add to `SETTINGS_DEFAULTS`, add to `partialize`, and add migration case for `fromVersion <= 3`. No fields are removed. The `questionsPerRound` field stays in the store, in `GameSettings` (`types/index.ts:154`), in the database columns (`questions_per_round` on templates and presets), and in all consumers. It transitions from "user input" to "computed and stored for display/compat." The `GameSettings` type does NOT need `isByCategory` because category mode is a setup-time UI concern, not a runtime engine concern.
**Impact:** The 36-file footprint requires no type-level changes. Test files need minor updates (adding `isByCategory` to default expectations, updating migration test cases).
**Related findings:** QPR Phantom Input, Preset Integration Gap

---

### Finding: Modulo Bug in 3 Audience Scenes (Pre-existing, Exposed by This Redesign)
**Confidence:** High
**Evidence:** Three audience scenes compute `questionInRound` using:
```typescript
(displayQuestionIndex % Math.max(questionsPerRound, 1)) + 1
```
This formula assumes uniform round sizes. It appears in:
- `QuestionDisplayScene.tsx:44-46`
- `QuestionClosedScene.tsx:39-42`
- `AnswerRevealScene.tsx:40-42`

With "By Category" mode, rounds have different sizes (e.g., 12 Science, 3 History, 5 Geography). The modulo calculation produces incorrect question numbers because `displayQuestionIndex` is a global index, not a round-relative index.

Notably, `QuestionAnticipationScene.tsx:34-40` already uses the correct approach: `findIndex` within the round's questions array. The selector `getQuestionInRoundProgress()` at `selectors.ts:135-142` also uses `findIndex` correctly. The modulo pattern in the three scenes is inconsistent with the rest of the codebase.
**Impact:** This is a pre-existing latent bug that becomes visible with variable round sizes. It must be fixed as part of this redesign. The fix is to unify all four scenes (and the selector) to use a single `findIndex`-based approach.
**Related findings:** Opportunity to Unify questionInRound Selector

---

### Finding: Feedback Loop Risk Between Stores During Redistribution
**Confidence:** High
**Evidence:** The `play/page.tsx` effect at lines 108-119 syncs settings store values (including `roundsCount`, `questionsPerRound`) into the game store on every change by calling `updateSettings()`. Meanwhile, `importQuestions()` at `questions.ts:66-76` forces `settings.roundsCount = totalRounds` (derived from `maxRoundIndex + 1`). The proposed redistribution effect in SetupGate would watch `roundsCount` and `isByCategory` changes. If `redistributeQuestions()` internally calls `importQuestions()`, the chain becomes: user changes roundsCount -> settings store updates -> play/page.tsx syncs to game store -> SetupGate effect fires redistributeQuestions -> importQuestions overwrites settings.roundsCount -> if different from user's selection, the cycle may repeat.
**Impact:** The `redistributeQuestions()` function MUST NOT call `importQuestions()`. It must be a separate engine function that rewrites `roundIndex` on existing questions and updates `totalRounds` without triggering the import chain. This is the single highest-risk implementation detail.
**Related findings:** Timing Gap, Dual-Store Sync Race

---

### Finding: roundsCount Maximum is 6 But 7 Categories Exist
**Confidence:** High
**Evidence:** `SETTINGS_RANGES.roundsCount.max` is 6 (`settings-store.ts:60`). There are 7 canonical categories (`categories.ts:23-66`). If a user fetches questions across all 7 categories and enables "By Category" mode, the algorithm would produce 7 rounds, exceeding the maximum. The `validateSetting()` function at `settings-store.ts:69-78` clamps values to the range, but the game store's `updateSettings()` in `lifecycle.ts:133-155` does NOT clamp.
**Impact:** Must be resolved before implementation. Three options: (A) raise max to 10, (B) bypass range check in "By Category" mode since the slider is hidden, (C) merge smallest categories when count exceeds max. Option B is recommended because it preserves existing behavior for manual mode while allowing category-driven mode to use as many rounds as needed.
**Related findings:** Category System Readiness

---

### Finding: SettingsPanel Has Duplicate QPR Slider Not Covered by Phase 1/2
**Confidence:** High
**Evidence:** `SettingsPanel.tsx` lines 88-97 render a QPR slider independent of `WizardStepSettings.tsx`. This component is used during gameplay (accessed from `play/page.tsx` sidebar). If QPR is removed from the wizard, the SettingsPanel slider must also be removed or hidden, and the "By Category" toggle should be added for consistency. This was not identified in Phase 1 or Phase 2 analysis.
**Impact:** Low severity but certain occurrence. One additional component to update. The slider is already disabled when `status !== 'setup'`, so it only matters during the setup phase when the game is reset.
**Related findings:** QPR Phantom Input

---

### Finding: Dual-Store Sync Race on Template/Preset Load
**Confidence:** Medium
**Evidence:** `TemplateSelector.tsx:113-132` assigns `roundIndex` via `Math.floor(index / questionsPerRound)`, calls `importQuestions(convertedQuestions, 'replace')` (which sets `roundsCount` from question data), then writes settings to both game store and settings store. The proposed redistribution effect would observe the settings store `roundsCount` change and trigger redistribution, potentially overwriting the template's round structure. Similarly, `PresetSelector.tsx:74-84` writes settings that would trigger redistribution of questions that were imported from a different source.
**Impact:** The redistribution effect must detect and suppress firing when questions were just loaded by a template/preset/question-set. A guard mechanism is needed -- either a `skipNextRedistribution` ref flag, or only redistributing when the user explicitly changes settings via the slider/toggle (tracking source of change).
**Related findings:** Feedback Loop Risk, Timing Gap

---

### Finding: Toggle-Off Loses User's Manual roundsCount
**Confidence:** Medium
**Evidence:** When "By Category" is ON, the round count is determined by the number of distinct categories (e.g., 5 categories = 5 rounds). If `roundsCount` in the settings store is updated to match this category-derived count, toggling "By Category" OFF would redistribute into 5 rounds rather than the user's original preference (e.g., 3). The settings store has a single `roundsCount` field with no mechanism to distinguish user-set from derived values.
**Impact:** Should store `roundsCount` independently from category-derived count. When "By Category" is ON, compute round count from categories without overwriting `roundsCount`. When toggled OFF, revert to the stored `roundsCount` value. This may require a second field (e.g., `userRoundsCount`) or using the `roundsCount` field only for manual mode.
**Related findings:** Migration Additive-Only

---

### Finding: V6 Validation Becomes Semantically Meaningless
**Confidence:** High
**Evidence:** V6 validation at `selectors.ts:76-89` compares `getQuestionsForRound(state, i).length` against `state.settings.questionsPerRound`. When QPR is computed from the actual distribution (rather than being user-set), this comparison always passes by definition. In "By Category" mode with variable round sizes, V6 would fire for every round that differs from the (single) computed QPR value, producing confusing warnings like "Round 1 has 12 questions but 5 are configured."
**Impact:** V6 should either be suppressed when `isByCategory` is true, or replaced with a more useful "round balance" warning that alerts when round sizes differ significantly.
**Related findings:** QPR Phantom Input, WizardStepReview match indicator at line 97

---

### Finding: QuestionAnticipationScene Already Uses Correct Pattern
**Confidence:** High
**Evidence:** `QuestionAnticipationScene.tsx:34-40` computes `questionInRound` using `findIndex` within the filtered round questions array, correctly handling variable round sizes. This stands in contrast to the three other scenes that use the buggy modulo pattern. This confirms the correct implementation pattern already exists in the codebase and can serve as a reference for fixing the other three scenes.
**Impact:** Reduces implementation risk for the modulo bug fix -- the correct pattern is already established and tested in production.
**Related findings:** Modulo Bug in Audience Scenes

## F) Analysis & Implications

### Thematic Patterns

**1. Conceptual Inversion:** The redesign corrects a conceptual inversion in data flow. The current model (user sets QPR, system derives round count) is backwards from how users think about game structure. Users think in terms of rounds and categories, not distribution ratios. Every finding in this report confirms that the codebase is architecturally prepared for this inversion.

**2. Existing Patterns Suffice:** Every proposed change follows an existing pattern in the codebase. The round-assignment module follows the `lib/questions/` pure-function pattern. The `isByCategory` setting follows the boolean-toggle pattern of `timerAutoStart` and `ttsEnabled`. The redistribution function follows the pure-engine-transform pattern of `importQuestions()` and `updateSettings()`. The SetupGate orchestration follows its existing role as the smart bridge between stores. No new architectural patterns are required.

**3. Dual-Store Complexity is the Primary Risk Source:** The settings store (persisted, UI-facing) and game store (transient, engine-facing) create a dual-source-of-truth architecture with bidirectional sync. The `play/page.tsx` effect syncs settings-to-game, while template/preset loaders write to both stores in sequence. Adding a redistribution effect introduces a third reactive pathway. The risk is not in any single pathway but in their interaction -- specifically, re-entrancy and race conditions. This is the only area where the redesign introduces genuinely new complexity.

### Risks & Vulnerabilities

| Risk | Severity | Likelihood | Mitigation Complexity |
|------|----------|------------|----------------------|
| Feedback loop between stores during redistribution (R1) | HIGH | HIGH | Medium -- requires careful function separation |
| Modulo bug in 3 audience scenes (R2) | HIGH | CERTAIN | Low -- known pattern exists in QuestionAnticipationScene |
| Template/preset load race with redistribution (R5) | MEDIUM | MEDIUM | Medium -- requires guard mechanism |
| Toggle-off loses user's roundsCount (R7) | MEDIUM | HIGH | Low -- store design decision |
| roundsCount max=6 vs 7 categories (R3) | MEDIUM | MEDIUM | Low -- policy decision |
| SettingsPanel duplicate slider (R4) | LOW | CERTAIN | Low -- straightforward removal |
| Test surface area (R6) | LOW | CERTAIN | Low -- mostly minor assertion updates |

### Strengths & Opportunities

The category system's maturity is the strongest asset. With `getCategoryStatistics()`, `getUniqueCategories()`, `getCategoryBadgeClasses()`, and `getCategoryName()` already production-tested, the "By Category" mode requires minimal new code.

Key opportunities:
- **Unify questionInRound into a single selector** -- fixes a pre-existing bug, eliminates 3x code duplication, creates a single source of truth
- **Centralize round assignment into a shared module** -- replaces 5 duplicated sites with 2 well-tested pure functions
- **Evolve V6 into a round-balance warning** -- more useful than the current exact-match check
- **Category-aware Review step** -- leverages existing badge utilities for better UX

### Gaps & Unknowns

**UX display model for variable QPR:** The most significant unresolved design question. When "By Category" mode produces rounds with 12, 3, and 5 questions respectively, how should Step 2 communicate this? Three options exist (hide QPR entirely, show per-category breakdown, show range) but none has been tested with users.

**Preset integration model:** Whether `isByCategory` should be saved as a preset field remains undecided. The current preset schema sends `rounds_count`, `questions_per_round`, `timer_duration`, and `is_default`. Adding `isByCategory` increases preset utility but changes the save/load contract.

**E2E testing strategy:** No E2E test plan exists for the new behavior. The analysis covers unit and integration testing of pure functions but does not address the full wizard flow.

## G) Confidence Assessment

**Overall confidence: High.** The codebase exploration was thorough (36 files examined, 5 round-assignment sites verified, all 4 audience scenes read, all relevant store/engine/component code read directly). All Phase 3 claims were verified against actual source code.

**Strongest claims (highest confidence):**
- QPR can safely become a derived value without removing it from stores or types
- The round-assignment module is a clean refactor opportunity with 5 duplicated sites
- The category system has all utilities needed for the by-category algorithm
- The engine requires zero changes (it reads `roundIndex` from questions, never assigns it)
- The migration is additive-only (verified: no field removals, no type breaks)
- The modulo bug exists in exactly 3 scenes and can be fixed using the existing `findIndex` pattern from QuestionAnticipationScene

**Moderate confidence claims:**
- The redistribution effect dependency array should be `[roundsCount, isByCategory]` without `questions` -- needs empirical validation
- Debouncing is unnecessary for redistribution (claim: microsecond-scale for 20-50 questions) -- should be profiled
- The template/preset load race can be solved with a guard flag -- specific mechanism not validated

**Weakest claims / known blind spots:**
- UX implications of variable QPR display -- pure design question, no code evidence can answer it
- Whether redistribution should fire on every slider drag or only on value settle -- needs UX testing
- Backward compatibility of saved games with old `roundIndex` assignments -- untested edge case
- Audience display behavior during setup changes via BroadcastChannel sync -- not traced

## H) Recommendations

### Recommendation: Create a Dedicated redistributeQuestions() Engine Function Separate From importQuestions()
**Priority:** High
**Rationale:** Findings on the feedback loop risk (R1) and the timing gap both converge on this requirement. The function must rewrite `roundIndex` on existing questions and update `totalRounds` without resetting `selectedQuestionIndex`, `displayQuestionIndex`, or `settings.roundsCount` -- all of which `importQuestions()` does. Calling `importQuestions()` from the redistribution path creates the feedback loop.
**Trade-offs:** Some code duplication with `importQuestions()` (both compute `totalRounds` from `maxRoundIndex`). But the duplication is small (2-3 lines) and the semantic difference is critical.
**Open questions:** Should `redistributeQuestions()` live in `lib/game/questions.ts` alongside `importQuestions()`, or in the new `lib/questions/round-assignment.ts` module?

---

### Recommendation: Centralize Round Assignment Into lib/questions/round-assignment.ts
**Priority:** High
**Rationale:** Five independent sites duplicate the same `Math.floor(index / questionsPerRound)` formula. A single module with two pure functions (`assignRoundsByCount` and `assignRoundsByCategory`) eliminates this duplication, makes the strategy testable in isolation, and follows the existing `lib/questions/` pattern (parser, validator, converter, exporter, api-adapter).
**Trade-offs:** All 5 call sites must be updated to use the new module. This is a broader refactor than strictly necessary for the feature, but the payoff in testability and consistency is significant.
**Open questions:** Should the existing 5 call sites be updated in the same PR as the feature, or in a preparatory refactor PR?

---

### Recommendation: Fix the questionInRound Modulo Bug in 3 Audience Scenes
**Priority:** High
**Rationale:** The modulo formula `displayQuestionIndex % questionsPerRound` is incorrect for variable round sizes, which "By Category" mode produces by default. `QuestionAnticipationScene.tsx` already demonstrates the correct `findIndex` approach. A new shared selector (e.g., `getQuestionNumberInRound()`) can serve all 4 scenes and the existing `getQuestionInRoundProgress()` selector, creating a single source of truth.
**Trade-offs:** Requires updating 3 scene components and their tests. But this fixes a pre-existing bug and reduces code duplication.
**Open questions:** None -- the correct pattern is already established.

---

### Recommendation: Add a Guard Mechanism for the Redistribution Effect
**Priority:** High
**Rationale:** Template/preset/question-set loaders assign `roundIndex` and write to both stores, which would trigger the redistribution effect and overwrite the loaded round structure. A guard is needed to distinguish user-initiated settings changes (which should trigger redistribution) from programmatic loads (which should not).
**Trade-offs:** A `useRef` guard flag adds minor complexity to SetupGate. Alternatively, tracking "source of change" in the store is more robust but more invasive.
**Open questions:** Which mechanism is simplest and most reliable? The ref-based guard needs careful placement to cover all load paths.

---

### Recommendation: Bypass roundsCount Range Check in "By Category" Mode
**Priority:** Medium
**Rationale:** 7 canonical categories vs max=6 roundsCount creates a constraint collision. In "By Category" mode the slider is hidden and rounds are data-driven, so the range check is semantically inappropriate. Bypassing it for category-driven mode preserves existing behavior for manual mode.
**Trade-offs:** The `validateSetting()` function in settings-store would need conditional logic, or the redistribution function would bypass the settings store entirely when computing round count from categories.
**Open questions:** Should the max be raised globally (simpler) or conditionally bypassed (more precise)?

---

### Recommendation: Preserve User's roundsCount When "By Category" is ON
**Priority:** Medium
**Rationale:** If `roundsCount` is overwritten with the category-derived count, toggling "By Category" OFF loses the user's manual preference. The cleanest solution is to not modify `roundsCount` in the settings store when category mode is active -- instead, derive the effective round count at redistribution time and write only to the game store.
**Trade-offs:** Creates a divergence between settings store `roundsCount` and game store `settings.roundsCount` when category mode is active. This is conceptually clean but may confuse future maintainers.
**Open questions:** Should a separate `effectiveRoundsCount` computed property be exposed, or should consumers always derive it?

---

### Recommendation: Replace V6 Validation With Round-Balance Warning
**Priority:** Medium
**Rationale:** V6 becomes meaningless when QPR is computed. Replacing it with a warning that fires when the largest round has more than 3x the questions of the smallest round provides genuinely useful feedback, especially in "By Category" mode where category imbalance is common.
**Trade-offs:** Loses exact-match validation for manual mode. But exact-match was always a warning (not a block), and the new check is more practically useful.
**Open questions:** What threshold should trigger the warning? 2x? 3x? Should it only fire in "By Category" mode?

---

### Recommendation: Defer isByCategory in Presets to a Follow-Up
**Priority:** Low
**Rationale:** The preset schema decision (whether to add `is_by_category` as a database column) is independent of the core feature. The feature can ship with presets saving/loading `roundsCount` and `timerDuration` only, with QPR becoming a display-only field. Adding `isByCategory` to presets can be done as a follow-up once the feature is validated.
**Trade-offs:** Users cannot save "By Category" preference in presets initially. But presets are primarily used for timer and round count settings, making this a minor gap.
**Open questions:** If deferred, should PresetSelector display be updated to remove QPR display now, or leave it as informational?

## I) Open Questions

### 1. How should Step 2 display questions-per-round when "By Category" mode produces variable counts?
**Why it matters:** Users expect transparency about game structure. A single QPR number is misleading when rounds have 12, 3, and 5 questions respectively. This is a UX design decision that code analysis cannot resolve.
**Suggested approach:** Prototype three UI variants: (a) hide QPR entirely with a text label "Categories determine round sizes"; (b) show per-category breakdown with counts and badges; (c) show a range like "3-12 questions per round." Test with 2-3 representative users.

### 2. Should redistribution happen on every slider change or only on value settle?
**Why it matters:** If the "Number of Rounds" slider triggers redistribution on every drag position, it fires rapidly. The analysis claims redistribution is sub-millisecond for typical question counts (20-50), but this is unverified.
**Suggested approach:** Profile `assignRoundsByCount()` with 100 questions. If under 1ms, fire on every change. If not, debounce with 150ms delay or use `onPointerUp` rather than `onChange`.

### 3. What is the exact dependency array for the redistribution effect?
**Why it matters:** Wrong dependencies cause infinite loops (too broad) or missed updates (too narrow). The current proposal is `[roundsCount, isByCategory]` without `questions`, but this means adding/removing questions does not trigger redistribution.
**Suggested approach:** Start with `[roundsCount, isByCategory]`. If the user returns to Step 1 and imports new questions, those questions go through the existing import path which assigns `roundIndex`. Redistribution is only needed when the user changes the organizing principle in Step 2 AFTER questions are already loaded.

### 4. Should isByCategory be added to the preset database schema?
**Why it matters:** Presets capture repeatable game configurations. If "By Category" is a per-game preference that affects game feel significantly, presets should capture it. If it is a global user preference that rarely changes, presets do not need it.
**Suggested approach:** Ship the feature without it in presets. Observe whether users switch between modes frequently or set-and-forget. Add to presets in a follow-up if mode-switching is common.

### 5. How should the WizardStepReview per-round grid behave with variable round sizes?
**Why it matters:** `WizardStepReview.tsx:97` currently uses `isMatch = count === questionsPerRound` to color-code rounds green (match) or amber (mismatch). With "By Category" mode, the concept of "match" loses meaning since each round is expected to have a different count.
**Suggested approach:** In "By Category" mode, display category name and badge color per round instead of match/mismatch coloring. In manual mode, keep the existing comparison but use the computed QPR (which will always match by definition), or simply show the count without coloring.

### 6. What is the E2E testing strategy for the new behavior?
**Why it matters:** The feature changes the setup wizard flow, which is a critical user path. No E2E tests currently exercise "By Category" mode or the round-count slider behavior.
**Suggested approach:** Add E2E scenarios: (a) import questions with multiple categories, verify "By Category" mode auto-organizes rounds, (b) toggle "By Category" off, verify manual round count applies, (c) change round count via slider, verify redistribution, (d) load a template, verify redistribution does not overwrite template's rounds.

## J) Appendix: Evidence Index

| Finding | Primary Evidence File(s) | Line(s) | Secondary Evidence |
|---------|-------------------------|---------|-------------------|
| QPR Phantom Input | `WizardStepSettings.tsx` | 45-52 | `QuestionDisplayScene.tsx:39-42` (derived pattern) |
| Round Assignment Duplication | `api-adapter.ts` | 203 | `TriviaApiImporter.tsx:179`, `QuestionSetSelector.tsx:83`, `TemplateSelector.tsx:114`, `use-auto-load-default-template.ts:34` |
| Category System Readiness | `categories.ts` | 23-66, 100-111, 259-292, 342-350 | 7 categories, `getCategoryStatistics()`, `getUniqueCategories()` |
| Timing Gap | `questions.ts` | 43-77 | `lifecycle.ts:133-155` (`updateSettings` does not touch questions) |
| Migration Additive-Only | `settings-store.ts` | 14-26, 44-53, 117, 119-128, 131-142 | `types/index.ts:152-158` (GameSettings type) |
| Modulo Bug (3 scenes) | `QuestionDisplayScene.tsx` | 44-46 | `QuestionClosedScene.tsx:39-42`, `AnswerRevealScene.tsx:40-42` |
| Correct Pattern (1 scene) | `QuestionAnticipationScene.tsx` | 34-40 | `selectors.ts:135-142` (`getQuestionInRoundProgress`) |
| Feedback Loop Risk | `questions.ts` | 66-76 | `play/page.tsx:108-119` (sync effect), `lifecycle.ts:133-155` |
| roundsCount Max vs Categories | `settings-store.ts` | 60 | `categories.ts:23-66` (7 categories) |
| SettingsPanel Duplicate | `SettingsPanel.tsx` | 88-97 | Not covered by Phase 1/2 |
| Dual-Store Sync Race | `TemplateSelector.tsx` | 113-132 | `PresetSelector.tsx:74-84`, `QuestionSetSelector.tsx:80-87` |
| Toggle-Off State Loss | `settings-store.ts` | 14-26 | Single `roundsCount` field, no user-vs-derived distinction |
| V6 Validation Obsolescence | `selectors.ts` | 76-89 | `WizardStepReview.tsx:97` (isMatch comparison) |
| Preset Schema | `SavePresetModal.tsx` | 48-54 | `PresetSelector.tsx:74-84, 135` (display format) |
| Game Store updateSettings | `lifecycle.ts` | 133-155 | Does not clamp settings ranges |
| Engine Agnosticism | `questions.ts` | 62-64 | Derives `totalRounds` from `maxRoundIndex + 1` |
