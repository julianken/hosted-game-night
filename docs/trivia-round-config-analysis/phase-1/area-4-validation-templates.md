# Investigation: Validation, Templates & Presets

## Summary
Removing QPR as independent setting impacts: V6 validation (remove), templates (DB column `questions_per_round`), presets (DB column + display in PresetSelector), save modals (capture QPR), settings store migration (v3→v4). Templates include questions so QPR can be derived; presets are settings-only so QPR has independent meaning there.

## Key Findings

### Finding 1: V6 Validation Becomes Meaningless
- **Evidence:** `selectors.ts:76-90` — V6 compares actual per-round count to `state.settings.questionsPerRound`. If QPR is computed from actual distribution, they always match.
- **Confidence:** high
- **Implication:** Remove V6 entirely, or replace with "uneven round distribution" warning

### Finding 2: Templates Store QPR in Database
- **Evidence:** DB schema `questions_per_round integer not null default 5`, API `templates/route.ts:147` saves it, TemplateSelector uses it for round assignment (line 111)
- **Confidence:** high
- **Implication:** Keep DB column for backward compat. When loading templates, derive QPR from template questions instead of stored value.

### Finding 3: Presets Are Settings-Only (No Questions)
- **Evidence:** `presets/route.ts:96` saves QPR, PresetSelector displays `({preset.rounds_count}R / {preset.questions_per_round}Q / {preset.timer_duration}s)` (line 135)
- **Confidence:** high
- **Implication:** If QPR is no longer a user-facing setting, presets that stored it become partially obsolete. However, presets could still store QPR as a "target" that controls how subsequently-loaded questions get distributed.

### Finding 4: Save Modals Capture QPR
- **Evidence:** SaveTemplateModal.tsx:79 sends `questions_per_round: settings.questionsPerRound`, SavePresetModal.tsx:51 does same
- **Confidence:** high
- **Implication:** Save modals would need to either: (a) compute QPR from actual distribution, or (b) stop sending it

### Finding 5: Settings Store Needs v4 Migration
- **Evidence:** `settings-store.ts:117` version is 3, partialize includes questionsPerRound (line 121)
- **Confidence:** high
- **Implication:** Bump to v4, remove `questionsPerRound` from partialize OR keep it as a derived value that gets auto-populated

### Finding 6: WizardStepReview Displays Per-Round Validation
- **Evidence:** `WizardStepReview.tsx:97` — `const isMatch = count === questionsPerRound`, colors green/amber
- **Confidence:** high
- **Implication:** Replace with simple per-round question count display (no match/mismatch concept)

## Surprises
- Presets being settings-only (no questions) means QPR has genuinely independent meaning there — this is a design tension with removing QPR as a user input
- The default template auto-load hook also uses QPR for round assignment

## Raw Evidence
- selectors.ts:76-90 (V6)
- templates/route.ts:21,147 (DB column, POST default)
- templates/[id]/route.ts:140-141 (PATCH)
- presets/route.ts:96 (POST default)
- presets/[id]/route.ts:106-107 (PATCH)
- PresetSelector.tsx:77,84,135
- TemplateSelector.tsx:106,111
- SaveTemplateModal.tsx:79,171
- SavePresetModal.tsx:51,134
- WizardStepReview.tsx:25,97,132
- settings-store.ts:117,121,131-142 (migration)
- DB migrations for templates and presets tables
