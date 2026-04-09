# Phase 3 Synthesis 2: Risk/Opportunity Analysis

## Source Material
- Phase 1 areas 1-5 (QPR consumers, round assignment, categories, validation/templates, UI architecture)
- Phase 2 iterators 1-5 (timing, presets, algorithm, reassignment, migration)
- Direct codebase verification of all critical claims

---

## RISKS

### R1. Feedback Loop Between Stores During Redistribution
**Severity: HIGH** | **Likelihood: HIGH**

The proposed `redistributeQuestions()` mechanism in SetupGate triggers on `roundsCount` / `isByCategory` changes. But `importQuestions()` (questions.ts:74) **overwrites** `settings.roundsCount` with `maxRoundIndex + 1` derived from question roundIndex values. Meanwhile, play/page.tsx:108-119 syncs settings store values into game store on every change. This creates a potential circular dependency:

1. User changes roundsCount in settings store
2. play/page.tsx effect syncs roundsCount to game store
3. SetupGate effect detects change, calls redistributeQuestions
4. redistributeQuestions reassigns roundIndex, calls importQuestions
5. importQuestions overwrites game store `settings.roundsCount` with derived value
6. If derived value differs from user's selection, settings store may sync back, triggering step 3 again

**Evidence:** `importQuestions()` at questions.ts:66-76 forces `roundsCount: totalRounds`. The play/page.tsx effect at lines 108-119 watches both stores. The proposed SetupGate effect would watch the same values.

**Mitigation:** The new `redistributeQuestions()` must NOT call `importQuestions()`. It must be a separate engine function that only rewrites `roundIndex` on existing questions and updates `totalRounds` without touching `settings.roundsCount`. Alternatively, add a guard flag to prevent re-entrancy in the effect.

---

### R2. `questionInRound` Modulo Bug With Variable Round Sizes
**Severity: HIGH** | **Likelihood: CERTAIN** (when "By Category" mode is used)

Three audience scene components compute `questionInRound` using modulo arithmetic:
```typescript
(displayQuestionIndex % Math.max(questionsPerRound, 1)) + 1
```

This formula assumes uniform round sizes. With "By Category" mode, rounds will have different sizes (e.g., 12 Science, 3 History, 5 Geography). The modulo calculation will produce incorrect question numbers on the audience display.

**Affected files:**
- `QuestionDisplayScene.tsx:45`
- `QuestionClosedScene.tsx:41`
- `AnswerRevealScene.tsx:41`

**Evidence:** Each of these scenes derives `questionsPerRound` from `questions.filter(q => q.roundIndex === currentRound).length`, which is correct. But the `questionInRound` derivation uses `displayQuestionIndex % questionsPerRound`, which is globally indexed and does NOT account for the offset of questions in earlier rounds.

**Note:** The selector `getQuestionInRoundProgress()` at selectors.ts:135-142 uses `findIndex` which handles variable round sizes correctly. The scene components do not use this selector -- they compute locally.

**Mitigation:** Replace the modulo formula in all three scenes with a proper lookup: find the question within `questionsInRound` array and use its position. This is a pre-existing latent bug that becomes visible with variable round sizes.

---

### R3. roundsCount Max is 6, But 7 Categories Exist
**Severity: MEDIUM** | **Likelihood: MEDIUM**

`SETTINGS_RANGES.roundsCount.max` is 6 (settings-store.ts:60). There are 7 canonical categories. If a user fetches questions across all 7 categories with "By Category" mode ON, the algorithm would produce 7 rounds, exceeding the configured maximum.

The settings store `validateSetting()` (line 69-78) clamps roundsCount to the range. The game store `updateSettings()` in lifecycle.ts does NOT clamp. This creates inconsistency between where the value is stored.

**Evidence:** 7 categories defined in categories.ts:23-66. Settings range at settings-store.ts:60. The clamping function at settings-store.ts:65-77.

**Mitigation options:**
- (A) Raise `SETTINGS_RANGES.roundsCount.max` to 7 (or 10). Simple but changes existing constraints.
- (B) In "By Category" mode, bypass the range check since round count is determined by data, not by user input. The slider is hidden anyway.
- (C) Cap categories: if >6 unique categories, merge the smallest into "General Knowledge."

---

### R4. SettingsPanel Has Duplicate QPR Slider (Separate From Wizard)
**Severity: LOW** | **Likelihood: CERTAIN**

`SettingsPanel.tsx` (used during gameplay, accessed from play/page.tsx sidebar) has its own QPR slider (lines 89-97) independent of `WizardStepSettings.tsx`. If QPR is removed from the wizard, the SettingsPanel slider must also be removed or hidden. The analysis documents mention WizardStepSettings but do not mention SettingsPanel.

**Evidence:** SettingsPanel.tsx:89-97 renders a QPR slider. It also renders a rounds slider (lines 78-86). Both are disabled when `status !== 'setup'`, but if the game is reset, the user returns to setup and sees the old QPR slider.

**Mitigation:** Remove or hide the QPR slider from SettingsPanel. Add "By Category" toggle to SettingsPanel for consistency with the wizard.

---

### R5. Dual-Store Sync Race on Template/Preset Load
**Severity: MEDIUM** | **Likelihood: MEDIUM**

TemplateSelector (lines 119-132) and PresetSelector (lines 74-84) both write to game store first, then mirror to settings store. When the proposed redistribution effect fires, it will observe the settings store change and trigger redistribution. But the template already imported questions with its own roundIndex assignment. The redistribution would overwrite the template's round structure.

**Evidence:** TemplateSelector:119 calls `importQuestions(convertedQuestions, 'replace')`, which sets `roundsCount` from question data. Then line 131 writes `questionsPerRound` to settings store. The proposed SetupGate effect would see `roundsCount` change and redistribute.

**Mitigation:** The redistribution effect in SetupGate must detect and suppress firing when questions were just loaded by a template/preset. Options: (A) debounce/guard flag, (B) only redistribute when the user explicitly changes settings (track source of change), (C) skip if questions have stable roundIndex matching the requested configuration.

---

### R6. Test Surface Area Is Large (~36 Files)
**Severity: LOW** | **Likelihood: CERTAIN**

44 files reference `questionsPerRound` or `questions_per_round`. Many have associated test files. The migration is additive (no field removal), but test assertions that check exact field counts, default values, or QPR-related behavior will need updating.

**Evidence:** Phase 1 area-1 identified ~36 files. My search found 44 files. Test files include: settings-store.test.ts, engine.test.ts, WizardStepReview.test.tsx, SettingsPanel.test.tsx, PresetSelector.test.tsx, SavePresetModal.test.tsx, SaveTemplateModal.test.tsx, TriviaApiImporter.test.tsx, QuestionClosedScene.test.tsx, api-adapter.test.ts, and more.

**Mitigation:** Most tests need only minor changes (adding `isByCategory` default, removing QPR slider assertions). The most impactful test changes are in engine.test.ts and settings-store.test.ts where assertion counts and migration tests must be updated.

---

### R7. "By Category" Mode Hides Round Count But importQuestions Still Overrides It
**Severity: MEDIUM** | **Likelihood: HIGH**

When "By Category" is ON, the "Number of Rounds" slider is disabled/hidden since rounds are determined by category count. But if the user then toggles "By Category" OFF, the system needs to know what round count to use. If `roundsCount` was overwritten by the category count during "By Category" mode, the user loses their previous manual selection.

**Evidence:** The analysis proposes `isByCategory: boolean` (default true) added to settings store. When toggled, the redistribution effect fires. But if `roundsCount` was changed to match category count (e.g., 5 categories = 5 rounds), toggling OFF would redistribute into 5 rounds rather than the user's original preference (e.g., 3).

**Mitigation:** Store `roundsCount` independently from category-derived round count. When "By Category" is ON, compute rounds from categories without modifying `roundsCount`. When toggled OFF, revert to the stored `roundsCount` value.

---

## OPPORTUNITIES

### O1. Unify questionInRound Calculation Into a Single Selector
**Impact: HIGH** | **Effort: LOW**

Three audience scene components (QuestionDisplayScene, QuestionClosedScene, AnswerRevealScene) each independently compute `questionInRound` with the same buggy modulo formula. The selector layer already has `getQuestionInRoundProgress()` which does it correctly. Creating a dedicated `getQuestionNumberInRound()` numeric selector and using it in all three scenes would:
- Fix the modulo bug (R2)
- Eliminate 3x code duplication
- Create a single source of truth for this calculation

**Evidence:** selectors.ts:135-142 uses `findIndex` (correct). All three scenes use `displayQuestionIndex % questionsPerRound` (incorrect for variable rounds). This is a pre-existing quality improvement independent of the redesign.

---

### O2. Algorithm Module Creates Clean Separation of Concerns
**Impact: HIGH** | **Effort: LOW**

The proposed `lib/questions/round-assignment.ts` module would centralize all 8 round assignment sites into 2 pure functions. Currently the formula `Math.floor(index / questionsPerRound)` is duplicated in:
- TriviaApiImporter.tsx:179
- QuestionSetSelector.tsx:83
- TemplateSelector.tsx:113-116
- useAutoLoadDefaultTemplate.ts:34
- api-adapter.ts:203

Replacing all with `assignRoundsByCount(questions, roundsCount)` and `assignRoundsByCategory(questions)` eliminates duplication and makes the assignment strategy testable in isolation.

**Evidence:** All 5 sites use identical logic. The `lib/questions/` directory already holds pure transform functions (parser, validator, converter, exporter). Round assignment fits the same pattern.

---

### O3. V6 Validation Can Evolve Into Meaningful "Round Balance" Warning
**Impact: MEDIUM** | **Effort: LOW**

V6 validation currently compares actual per-round count to `settings.questionsPerRound`, which becomes meaningless when QPR is computed. Rather than simply removing V6, it can be replaced with a more useful "round balance" warning that alerts when round sizes differ by more than a threshold (e.g., >50% difference between largest and smallest round). This would be genuinely useful in "By Category" mode where unequal category sizes create very unbalanced rounds.

**Evidence:** selectors.ts:76-90 (current V6). getCategoryStatistics() at categories.ts:259-292 already produces per-category counts. A balance check like `if (maxCount > 3 * minCount) warn(...)` would take ~5 lines.

---

### O4. Category-Aware Review Step Provides Better UX Than Current Per-Round Grid
**Impact: MEDIUM** | **Effort: MEDIUM**

WizardStepReview currently shows a flat per-round grid with green/amber match indicators (lines 94-111). With "By Category" mode, this grid can be enhanced to show category names and colors per round (e.g., "Round 1: Science (12 questions)"). The category utility library already provides `getCategoryBadgeClasses()`, `getCategoryName()`, and `getCategoryColor()` -- all ready to use.

**Evidence:** WizardStepReview.tsx:94-111 already iterates rounds and counts questions. Adding category display requires only reading the category of questions in each round and using existing badge utilities.

---

### O5. Presets Can Gain `isByCategory` For Free
**Impact: LOW** | **Effort: LOW**

Since the migration is additive and presets have only 3 game-config fields (roundsCount, questionsPerRound, timerDuration), adding `isByCategory` as a 4th field increases preset utility by 33%. Users can save "By Category" vs "By Count" preferences along with timer and round settings. The DB column addition is trivial (boolean, default true, nullable for backward compat).

**Evidence:** SavePresetModal.tsx:48-54 sends 4 fields. Adding one more boolean is a one-line change per component.

---

### O6. Computed QPR Info Label Creates Transparency
**Impact: MEDIUM** | **Effort: LOW**

Replacing the QPR slider with a computed info label (e.g., "~7 questions per round" or per-round breakdown) gives users better insight into their game structure. In "By Category" mode, showing per-category round sizes (e.g., "Science: 12, History: 3, Geography: 5") is more informative than a single QPR number ever was.

**Evidence:** The questions are already in the game store by Step 2 (WizardStepQuestions is Step 0). `getCategoryStatistics()` returns exactly what's needed for this display. The current QPR slider provides less information than the computed display would.

---

### O7. New Engine Function Pattern Improves Testability
**Impact: MEDIUM** | **Effort: LOW**

The proposed `redistributeQuestions()` as a pure engine function continues the existing pattern of pure-function game logic. Unlike wrapping redistribution inside `importQuestions()` (which has import-specific side effects like resetting `selectedQuestionIndex`), a dedicated function is testable with simple input/output assertions and has clearly scoped behavior.

**Evidence:** The engine is already structured as pure functions (lifecycle.ts, questions.ts, rounds.ts, scene.ts). The new function fits this pattern exactly.

---

## SUMMARY MATRIX

| ID | Type | Severity/Impact | Likelihood | Phase 2 Coverage |
|----|------|----------------|------------|------------------|
| R1 | Risk | HIGH | HIGH | Partially covered (timing iterator mentions Option B but misses feedback loop) |
| R2 | Risk | HIGH | CERTAIN | NOT covered (undiscovered in Phase 1 or 2) |
| R3 | Risk | MEDIUM | MEDIUM | Partially covered (edge case table mentions 7 categories) |
| R4 | Risk | LOW | CERTAIN | NOT covered (SettingsPanel not mentioned) |
| R5 | Risk | MEDIUM | MEDIUM | NOT covered (template/preset loading interaction with redistribution) |
| R6 | Risk | LOW | CERTAIN | Acknowledged but not quantified |
| R7 | Risk | MEDIUM | HIGH | NOT covered (toggle-off behavior not analyzed) |
| O1 | Opportunity | HIGH | - | NOT identified (pre-existing duplication/bug) |
| O2 | Opportunity | HIGH | - | Covered (algorithm iterator) |
| O3 | Opportunity | MEDIUM | - | Partially covered (V6 removal mentioned, evolution not) |
| O4 | Opportunity | MEDIUM | - | Not explicitly covered |
| O5 | Opportunity | LOW | - | Mentioned as open question |
| O6 | Opportunity | MEDIUM | - | Partially covered (open question about display format) |
| O7 | Opportunity | MEDIUM | - | Covered (timing iterator) |

## KEY TAKEAWAYS

1. **Three new risks discovered** that Phase 1/2 did not identify: the `questionInRound` modulo bug (R2), the SettingsPanel duplicate slider (R4), and the template/preset load race with redistribution (R5). R2 is the most dangerous because it silently corrupts the audience display.

2. **The feedback loop risk (R1) is the hardest to get right.** The dual-store architecture (settings store + game store) with bidirectional sync effects makes re-entrancy a real concern. The `redistributeQuestions()` function must be carefully designed to avoid triggering the sync chain.

3. **The roundsCount max=6 constraint (R3) must be resolved before implementation.** "By Category" mode with all 7 categories is a natural usage pattern that hits this limit.

4. **The biggest untapped opportunity (O1) is fixing a pre-existing bug** while refactoring. The modulo-based questionInRound calculation in 3 audience scenes is wrong today for any game where rounds have different sizes. Centralizing into a selector fixes this and simplifies the scenes.

5. **The migration is genuinely low-risk** from a data perspective. No fields are removed, no DB columns are dropped, and backward compatibility is maintained. The risk is concentrated in runtime behavior (feedback loops, race conditions) not in data shape.

---

### Critical Files for Implementation
- `apps/trivia/src/lib/game/questions.ts` - Core engine function that needs a new `redistributeQuestions()` alongside `importQuestions()`, with careful separation to avoid the feedback loop (R1)
- `apps/trivia/src/components/audience/scenes/QuestionDisplayScene.tsx` - Contains the buggy modulo questionInRound calculation (R2) that must be replaced; pattern is duplicated in QuestionClosedScene and AnswerRevealScene
- `apps/trivia/src/stores/settings-store.ts` - v3-to-v4 migration adding `isByCategory`, roundsCount max adjustment (R3), and QPR compute logic
- `apps/trivia/src/components/presenter/SetupGate.tsx` - The redistribution trigger location; must handle the sync race with template/preset loads (R5) and avoid re-entrancy (R1)
- `apps/trivia/src/components/presenter/SettingsPanel.tsx` - Secondary QPR slider location (R4) that Phase 1/2 analysis missed; must be updated alongside WizardStepSettings
