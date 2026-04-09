# Investigation: UI Architecture & State Flow

## Summary
WizardStepSettings is a simple presentational component with two Slider controls. Props flow: settings store → SetupGate → SetupWizard → WizardStepSettings. roundIndex assignment happens at import time (Step 1), not at settings change time (Step 2). Toggle component exists in @joolie-boolie/ui. Questions are in game store by the time user reaches Step 2.

## Key Findings

### Finding 1: Settings Flow is Props-Only (No Direct Store Access in Step)
- **Evidence:** WizardStepSettings receives `roundsCount`, `questionsPerRound`, `onUpdateSetting` as props. SetupGate reads stores and passes down.
- **Confidence:** high
- **Implication:** Adding "By Category" toggle follows same pattern — add prop, add to SetupGate extraction

### Finding 2: roundIndex Assignment Happens at Import Time
- **Evidence:** TriviaApiImporter.handleLoadIntoGame() (line 177-179) maps roundIndex THEN calls importQuestions(). importQuestions() in engine just reads pre-assigned values.
- **Confidence:** high
- **Implication:** Changing "Number of Rounds" in Step 2 does NOT redistribute questions. Need explicit re-assignment on rounds change.

### Finding 3: Toggle Component Available in @joolie-boolie/ui
- **Evidence:** Toggle with props: checked, onChange, label, disabled, size, labelPosition. Meets 44x44px touch target requirement.
- **Confidence:** high
- **Implication:** Ready to use for "By Category" toggle

### Finding 4: Questions Are in Game Store by Step 2
- **Evidence:** Step 0 (Questions) imports via TriviaApiImporter → game store. Step 1 (Settings) can read `questions` from game store.
- **Confidence:** high
- **Implication:** Can compute "N questions across M categories" info display in Step 2

### Finding 5: Settings Store is Best Location for isByCategory
- **Evidence:** Follows pattern of other settings (roundsCount, timerDuration etc). Persisted via localStorage. Updated via same onUpdateSetting callback.
- **Confidence:** high
- **Implication:** Add to SettingsState interface, SETTINGS_DEFAULTS, partialize

### Finding 6: Timing Issue — When to Reassign roundIndex
- **Evidence:** Currently roundIndex is set at import time using questionsPerRound from store. But if user changes rounds count in Step 2, questions already have stale roundIndex values.
- **Confidence:** high
- **Implication:** Need to re-assign roundIndex when: (a) user changes "Number of Rounds" in Step 2, (b) user toggles "By Category" mode. This means Step 2 needs access to questions and importQuestions action.

## Raw Evidence
- WizardStepSettings.tsx (full — 56 lines, two Sliders)
- SetupWizard.tsx (props interface, step rendering)
- SetupGate.tsx (store extraction, prop passing)
- TriviaApiImporter.tsx:172-188 (import time assignment)
- questions.ts:43-77 (importQuestions reads roundIndex)
- packages/ui/ (Toggle, Slider components)
- stores/__tests__/setup-flow-sync.test.ts (settings ↔ game store sync)
