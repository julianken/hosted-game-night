# Synthesis: Gap & Implication Analysis

## Synthesis Approach

This analysis examined all five Phase 2 iterations (timing, presets, algorithm, reassignment, migration) against the actual codebase to identify:

1. **Gaps**: What evidence does NOT exist or is untested
2. **Enabled decisions**: What can stakeholders decide with confidence
3. **Constrained options**: What is ruled out or risky
4. **Open questions**: What must be answered before implementation
5. **Blind spots**: What this lens might be missing

The verification process cross-referenced claims against actual source files (settings-store.ts, game-store.ts, questions.ts, categories.ts, WizardStepSettings.tsx, selectors.ts, lifecycle.ts) to identify discrepancies and unvalidated assumptions.

## Core Narrative

The analysis rightly identifies that question roundIndex assignment happens at import time (Step 1), creating a timing mismatch when users change "Number of Rounds" in Step 2. The proposed solution -- a new `redistributeQuestions()` engine function triggered by a React effect in SetupGate -- is architecturally sound and minimal. However, the analysis lacks depth in three critical areas: (1) UX implications of variable questions-per-round display when "By Category" mode produces unequal distribution, (2) concrete testing strategy for the algorithm across all edge cases present in production data, and (3) the precise mechanism for detecting when redistribution needs to happen (does it fire on every slider change, or only on settings save?). The preset and migration recommendations are solid but lack consideration of how "By Category" integrates into the preset system as a new user preference. Most significantly, the analysis assumes SetupGate has sufficient lifecycle hooks and can reliably trigger redistribution at the right time, but this isn't validated against the actual React patterns used in the codebase.

## Evidence Gaps

### Gap 1: UX Display Model for Variable Questions-Per-Round

**What's missing:**
The analysis acknowledges that "By Category" mode produces variable questions per round (depending on category distribution) but does not specify how Step 2 should display this to the user. The phase-2 summary states: "show computed QPR as info text but with 'By Category' mode the per-round count varies. Show per-category counts instead?" This is left unresolved.

**Why it matters:**
Users expect transparency about game structure. If a user selects 20 questions across 3 categories and toggles "By Category" mode, they see rounds with 8, 7, 5 questions respectively. If the slider says "5 questions per round" but reality is 8, 7, 5, this is confusing. The UI must clearly communicate what "variable" means.

**How to fill:**
Prototype Step 2 with three UI variants: (a) hide QPR field entirely, show "By Category mode: categories will determine questions per round"; (b) display a breakdown like "3 rounds across 3 categories: 8Q, 7Q, 5Q"; (c) show a dynamic badge that updates when `roundsCount` or `isByCategory` changes. Test with 2-3 users to pick the clearest option.

---

### Gap 2: Algorithm Robustness Across Production Category Distributions

**What's missing:**
The algorithm design (iterator-3) is theoretically sound, but lacks validation against actual production question distributions. The analysis cites "API category pool imbalanced" but doesn't test the algorithm against:
- Real category distributions from actual API fetches (not approximations)
- Edge cases where one category has 90% of questions
- Mixed user selections (e.g., 3 categories selected, only 2 have data)
- Rounding behavior when total questions aren't evenly divisible

**Why it matters:**
If `assignRoundsByCategory()` produces 1 round with 18 questions and 2 rounds with 1 question each, the UX breaks. The algorithm logic is correct, but its behavior in the tail (unequal distributions) isn't empirically validated.

**How to fill:**
Write unit tests for `assignRoundsByCategory()` with synthetic test data covering:
- Single category (1 round, 20 questions)
- 7 categories with equal distribution (7 rounds, ~3Q each)
- Skewed distribution (categories: [15, 4, 1] for 20 questions)
- Verify that no round gets 0 questions (edge case from iterator-3: "empty rounds don't appear")
- Run integration test with actual API fetch against known categories

---

### Gap 3: Reassignment Trigger Timing and Lifecycle Hook Safety

**What's missing:**
Iterator-4 proposes a "React effect in SetupGate" triggers redistribution when `roundsCount` or `isByCategory` changes, but:
- Doesn't specify the exact dependency array (`[roundsCount, isByCategory]`? Include `questions`?)
- Doesn't address whether redistribution should debounce on slider drag (the summary says "probably unnecessary" but doesn't test)
- Doesn't validate that SetupGate has access to `importQuestions` action AND that calling it during setup is safe
- Doesn't consider whether hydration or async state sync could cause the effect to fire at wrong times

**Why it matters:**
React effects are powerful but fragile. Wrong dependencies cause infinite loops or missed updates. If redistribution happens on *every* render instead of only on settings change, it wastes CPU and could cause UI flicker. If it doesn't happen when needed, users see stale roundIndex values.

**How to fill:**
1. Review SetupGate lifecycle: confirm `useEffect` with `[roundsCount, isByCategory]` (NOT including questions) triggers redistributeQuestions() -> importQuestions()
2. Add explicit check: skip redistribution if questions array hasn't changed (use `useRef` to track previous length)
3. Write test: render SetupGate, change roundsCount slider, verify `importQuestions` called exactly once
4. Verify: hydration flag prevents the effect from firing during initial sync

---

### Gap 4: Preset + isByCategory Integration Model

**What's missing:**
Iterator-2 recommends hiding QPR from preset UI but keeping in DB. However, it doesn't address:
- Should `isByCategory` be saved as a preset field? The analysis says "probably yes, for consistency" but leaves it as an open question.
- If a user saves a preset with `isByCategory=true`, loads it later, and their question pool has changed categories, does the preset still make sense?
- Should `SavePresetModal` UI include the "By Category" toggle, or is preset-level category preference not a thing?

**Why it matters:**
Presets are meant to save repeatable game configs. If "By Category" mode is a user preference that changes, presets should capture it. But the current preset schema (rounds_count, questions_per_round, timer_duration, is_default) doesn't include it, and the analysis doesn't decide whether to add it.

**How to fill:**
1. Decide: is `isByCategory` a persistent preference or a per-game choice?
2. If persistent: migrate presets table to add `is_by_category BOOLEAN DEFAULT true`, update SavePresetModal to capture it
3. If per-game: add UI note in PresetSelector: "Preset rounds count only; 'By Category' mode set in Settings"
4. Test: save preset with isByCategory=true, load into new game, verify mode persists

---

### Gap 5: Validation (V6) Becomes Meaningless with "By Category" Mode

**What's missing:**
The selectors.ts code shows V6 validation (lines 76-89): "Round X has Y questions but Z are configured". With "By Category" mode, Z (questionsPerRound from settings) is no longer meaningful per-round because each category produces a different count.

The analysis doesn't address:
- Should V6 warning be suppressed when `isByCategory=true`?
- Should V6 be reframed to check the *actual* range (min/max questions per round) instead of exact match?
- Does the Review step show V6 warnings, and will users be confused by "Round 1 has 8 questions but 5 are configured"?

**Why it matters:**
V6 is a user-facing validation warning in `WizardStepReview`. If it fires on every "By Category" game and says something confusing, it will confuse or frustrate users.

**How to fill:**
1. Update V6 logic: `if (state.settings.isByCategory) skip V6 check entirely`
2. Add new validation for "By Category" mode: check that each round has at least 1 question
3. Test: load questions, toggle "By Category" on/off, verify V6 appears/disappears and is accurate

---

### Gap 6: Settings Store Partialize and Persistence

**What's missing:**
Iterator-5 says to add `isByCategory: boolean` to SettingsState and include in partialize. However:
- The actual settings-store.ts file (version 3) has no `isByCategory` field yet
- Adding a new boolean field requires updating SETTINGS_DEFAULTS, partialize, and migrate function
- No guidance on whether `isByCategory` should have SETTINGS_RANGES (it's a boolean, so no)
- No test plan for the migration path from v3 to v4 (what if user has old v3 data in localStorage?)

**Why it matters:**
Store persistence is the foundation of settings recovery. If `isByCategory` isn't properly initialized or migrated, users will experience unexpected resets or missing preferences.

**How to fill:**
1. Add `isByCategory: boolean` to SettingsState with default true
2. Update SETTINGS_DEFAULTS: add `isByCategory: true`
3. Update partialize: add `isByCategory: state.isByCategory`
4. Update migrate function: `if (fromVersion <= 3) return { ...stored, isByCategory: true }`
5. Write test: delete localStorage, load app (isByCategory defaults to true); load old v3 data, verify isByCategory=true

---

### Gap 7: SettingsPanel Not Addressed

**What's missing:**
`SettingsPanel.tsx` (used during gameplay, accessed from play/page.tsx sidebar) has its own QPR slider independent of `WizardStepSettings.tsx`. If QPR is removed from the wizard, the SettingsPanel slider must also be removed or hidden. The Phase 2 analysis does not mention SettingsPanel at all.

**Why it matters:**
SettingsPanel is a secondary path to the same settings. If it's not updated, users can find and use a QPR slider during gameplay that contradicts the new UI paradigm.

**How to fill:**
Read SettingsPanel.tsx, identify QPR slider, plan its removal. Add "By Category" toggle to SettingsPanel for consistency.

---

## Enabled Decisions

Based on the evidence, stakeholders can confidently:

1. **Proceed with "By Category" as default-ON mode.** All 7 canonical categories are always present on questions (guaranteed by mapApiCategory). The utility library is rich and tested. Default ON is safe.

2. **Keep QPR in the settings store as a non-user-editable derived value.** It doesn't break any existing system. Consumers like V6 validation and audience display can still read it. It's harmless backward-compat.

3. **Hide QPR slider from Step 2 UI.** Confirmed safe: QPR isn't used by game logic during play, only at setup for validation and display. Users won't miss it.

4. **Place `isByCategory` toggle in Step 2 (WizardStepSettings).** The component is purely presentational, receives settings as props, and calls onUpdateSetting callback. Adding a toggle is a low-risk extension.

## Constrained Options

These options are now ruled out or risky:

1. **Removing QPR from SettingsState entirely.** Would break: GameSettings type in game-store initialization, V6 validation, useGameSettings() hook, and any code that reads `settings.questionsPerRound`. Risk: high. Scope: 36+ files. Benefit: minimal.

2. **Deferring round redistribution to game start (Option C from iterator-1).** Would require rewriting round navigation in scene-transitions and rounds.ts logic. Scene engine, nextRound(), and findIndex would all need changes. Risk: very high. Avoid.

3. **Making "By Category" a per-preset preference only (not global).** Conflicts with findings: isByCategory is a user preference that affects how ALL questions are organized, not just one saved preset. Should be in settings-store (global + persisted).

4. **Computing isByCategory on-the-fly instead of storing it.** Would require storing user's category selections and checking "do categories span 2+ internal categories?" on every render. Over-complicated. Better to store the boolean preference explicitly.

5. **Hiding "By Category" toggle from Step 2 and making it a hidden feature.** Conflicts with Phase 1 finding: users pre-filter categories in Step 1. They should see that Step 1 category choice feeds into Step 2's "By Category" mode. Hiding creates a mystery.

## Open Questions (ranked by blocking potential)

1. **Should redistribution happen on EVERY slider change or only on settings save?** -- *BLOCKS algorithm design*. If every change: SetupGate effect fires on each slider drag. If save: need a "save settings" button or auto-save debounce. Recommendation: Profile with 100 questions; if redistributeQuestions() is <1ms per call, every change is fine.

2. **How should Step 2 display questions-per-round when "By Category" mode produces variable counts?** -- *BLOCKS UI implementation*. Show per-category breakdown? Show range? Hide entirely? Recommendation: Design 3 UI variants, test with users.

3. **Should isByCategory be added to the Preset schema, or only to global Settings?** -- *BLOCKS preset implementation*. If preset: users can save/load different modes. If global only: simpler. Recommendation: Decide based on use case.

4. **What is the exact condition for triggering redistribution? Does it depend on `questions` array changing?** -- *BLOCKS effect dependency array*. Recommendation: Test SetupGate effect with and without `questions` in dependency.

5. **How should V6 validation behave in "By Category" mode?** -- *BLOCKS validation logic*. Suppress V6 when isByCategory=true? Show new warning? Recommendation: Mock up Review step with both modes.

## Blind Spots

- **E2E testing not covered.** The analysis doesn't mention how to test "By Category" mode with actual E2E flow (Step 1 import -> Step 2 toggle -> play). No mention of test plan in E2E guide.

- **Keyboard navigation in Step 2.** The analysis doesn't address whether the new "By Category" toggle should be keyboard-accessible or if it breaks tab order.

- **Undo/redo behavior.** What if user toggles "By Category" on, then off? Does the question array snap back to original roundIndex, or does it recompute fresh?

- **Audience display behavior with variable rounds.** Does audience display update when Step 2 settings change during setup? How does audience learn that mode changed?

- **Backward compatibility for imported/saved games.** If a user saves a game mid-setup with old roundIndex assignments (pre-feature), and then later loads it and toggles "By Category" on, does redistribution re-assign?

- **API failure recovery.** If redistributeQuestions() is called but the questions array is malformed (missing roundIndex on some questions), what happens?
