# Investigation: questionsPerRound Consumers

## Summary
questionsPerRound is referenced in ~36 files across 10 functional areas. The value flows from settings store → game store → components/engine. Key consumers: WizardStepSettings (user input), validation V6 (mismatch warning), TriviaApiImporter (round assignment), templates/presets (DB persistence), audience display (progress). QuestionDisplayScene already derives QPR from actual round question count — this is the model pattern.

## Key Findings

### Finding 1: Settings Store is Primary Authority
- **Evidence:** `settings-store.ts:17,46,61` — type, default (5), range (3-10)
- **Confidence:** high
- **Implication:** Removing QPR from user input doesn't mean removing from store — it could remain as a computed/derived value

### Finding 2: 4 Code Paths Write QPR to Settings
- **Evidence:** WizardStepSettings slider (line 47), PresetSelector (line 84), TemplateSelector (line 122-126), useAutoLoadDefaultTemplate (line 53)
- **Confidence:** high
- **Implication:** Only the slider write is "user input" — others load from stored data

### Finding 3: Templates & Presets Store QPR in Database
- **Evidence:** `api/templates/route.ts:147` (`questions_per_round: body.questions_per_round ?? 10`), `api/presets/route.ts:96`
- **Confidence:** high
- **Implication:** DB column needs migration strategy. Presets are settings-only (no questions), so QPR in presets is truly independent

### Finding 4: QuestionDisplayScene Already Computes QPR
- **Evidence:** `QuestionDisplayScene.tsx:39-42` — derives from `questions.filter(q => q.roundIndex === currentRound).length`, falls back to `settings.questionsPerRound`
- **Confidence:** high
- **Implication:** Proven pattern for computed QPR already exists in codebase

### Finding 5: Validation V6 Depends on QPR
- **Evidence:** `selectors.ts:80` — `const expected = state.settings.questionsPerRound;` compares to actual per-round count
- **Confidence:** high
- **Implication:** V6 becomes meaningless if QPR is computed from actual distribution

## Raw Evidence
- settings-store.ts (lines 17, 46, 61, 121, 154, 165)
- game-store.ts (lines 70, 336-337)
- lifecycle.ts (lines 2, 13, 142)
- types/index.ts (lines 72, 154)
- selectors.ts (line 80)
- WizardStepSettings.tsx (lines 16, 46-49)
- WizardStepReview.tsx (lines 25, 97, 132)
- SettingsPanel.tsx (lines 18, 90-93)
- SetupGate.tsx (line 35)
- SetupWizard.tsx (lines 39, 67, 184, 209)
- SaveTemplateModal.tsx (lines 79, 171)
- SavePresetModal.tsx (lines 51, 134)
- TemplateSelector.tsx (lines 106, 111)
- PresetSelector.tsx (lines 77, 84, 135)
- useAutoLoadDefaultTemplate.ts (lines 32, 34, 46, 53)
- api-adapter.ts (lines 21, 196, 203, 264, 282)
- QuestionDisplayScene.tsx (lines 39-42, 45)
- play/page.tsx (lines 98, 112)
- Template/preset API routes
