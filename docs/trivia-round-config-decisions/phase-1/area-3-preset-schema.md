# Area 3 Decision: Preset Schema — Should `isByCategory` Be Added?

## Decision

**NO.** Do not add `isByCategory` to the `trivia_presets` database table in phase 1.

---

## Evidence Summary

### What Presets Currently Store

The `trivia_presets` table (`supabase/migrations/20260215000003_create_trivia_presets.sql`, lines 6-14) has exactly these columns:

```
id, user_id, name, rounds_count, questions_per_round, timer_duration, is_default, created_at, updated_at
```

No `is_by_category` column exists. `isByCategory` does not appear anywhere in the codebase today — it is a net-new field not yet present in the settings store, the game store, the `GameSettings` type, or any component.

### What `SavePresetModal` Captures

`apps/trivia/src/components/presenter/SavePresetModal.tsx:48-54` sends exactly:

```json
{
  "name": "...",
  "rounds_count": settings.roundsCount,
  "questions_per_round": settings.questionsPerRound,
  "timer_duration": settings.timerDuration,
  "is_default": false
}
```

The settings object reads from `useGameStore(state => state.settings)`, which maps to `GameSettings` in `apps/trivia/src/types/index.ts:152-159`. `GameSettings` contains `roundsCount`, `questionsPerRound`, `timerDuration`, `timerAutoStart`, `timerVisible`, and `ttsEnabled` — no `isByCategory`. The analysis report confirms this is by design: `GameSettings` is a runtime engine concern; `isByCategory` is a setup-time UI concern and must not live there.

### What `PresetSelector` Applies on Load

`apps/trivia/src/components/presenter/PresetSelector.tsx:74-84` applies to both stores:

```ts
updateSettings({ timerDuration, roundsCount, questionsPerRound });
updateSetting('timerDuration', preset.timer_duration);
updateSetting('roundsCount', preset.rounds_count);
updateSetting('questionsPerRound', preset.questions_per_round);
```

Only `timer_duration`, `rounds_count`, and `questions_per_round` are read from the preset. No boolean mode flags are touched.

### Preset Display Format

`apps/trivia/src/components/presenter/PresetSelector.tsx:135`:

```tsx
({preset.rounds_count}R / {preset.questions_per_round}Q / {preset.timer_duration}s)
```

After QPR is demoted to a derived/display-only value, this display becomes `({preset.rounds_count}R / {preset.timer_duration}s)` — no reference to category mode.

### No Default Presets or Seeding

There is no seeding mechanism and no server-side preset factory. `getDefaultTriviaPreset()` in `packages/database/src/tables/trivia-presets.ts:118-125` returns whatever preset the user marked `is_default: true`. Each user starts with zero presets; most have 0-3.

### Prior Analysis Recommendation

`docs/trivia-round-config-analysis/phase-4/analysis-report.md`, Recommendation H (Priority: Low):

> "Defer isByCategory in Presets to a Follow-Up. The feature can ship with presets saving/loading `roundsCount` and `timerDuration` only. Adding `isByCategory` to presets can be done as a follow-up once the feature is validated."

Section B (Out of Scope) also explicitly lists: "Database schema migration for presets/templates tables (deferred decision)."

---

## Rationale

### 1. `isByCategory` is a global user preference, not a per-game differentiator

"By Category" is the default mode (ON). A boolean that is `true` in 95%+ of saved presets adds no discriminating value. Users differentiate presets on round count and timer — "Quick Game" (2R / 15s) vs "Full Evening" (5R / 30s) — not on question-organization algorithm.

### 2. The setting persists independently via `localStorage`

`apps/trivia/src/stores/settings-store.ts:115-128` persists all settings fields to `localStorage` (key `'trivia-settings'`, version 3 -> 4 after migration). `isByCategory` will be part of this snapshot. A preset does not need to store a preference that is already durably preserved per-device.

### 3. The migration cost is real; the yield is not

Adding `is_by_category` requires a production `ALTER TABLE` migration plus changes to 9 files: database types, Zod schema, API routes (POST and PATCH), SavePresetModal, PresetSelector, and 3 test files. That cost is unjustified for a field that will hold `true` in virtually every row.

### 4. The load-path behavior is correct without the field

When a user loads a preset, `isByCategory` is not touched. It retains the value from localStorage — the user's current preference. This is correct: preset load applies round count and timer; it does not override the user's mode preference.

### 5. The redistribution guard makes preset interaction correct regardless

The analysis report (Finding: Dual-Store Sync Race) establishes that preset loads must suppress the redistribution effect via a guard mechanism. This guard is needed whether or not `isByCategory` is in the schema. With the guard in place, whether the preset carries `isByCategory` or not is moot from an engine perspective.

---

## What Happens When a User Loads a Preset (Behavioral Spec)

1. User selects a preset from `PresetSelector`.
2. `loadPreset()` applies `timerDuration`, `roundsCount`, `questionsPerRound` to both stores.
3. The `skipNextRedistribution` guard in `SetupGate` suppresses redistribution.
4. **`isByCategory` is not touched.** It retains the user's current preference from `localStorage`.
5. Preset display format changes from `(NR / NQ / Ns)` to `(NR / Ns)` as part of the QPR-demotion work.

No data is lost. No user preference is overwritten.

---

## Condition for Reversing This Decision

Revisit if:
1. Users report confusion because loading a preset unexpectedly changes their mode setting, OR
2. Users explicitly request presets that capture mode along with round count

If either arises, add `is_by_category boolean NOT NULL DEFAULT true` with an `ALTER TABLE` migration. The default matches current behavior so no existing rows are affected.

---

*Investigated: 2026-03-05. Files read: `SavePresetModal.tsx`, `PresetSelector.tsx`, `api/presets/route.ts`, `api/presets/[id]/route.ts`, `packages/database/src/tables/trivia-presets.ts`, `packages/database/src/types.ts`, `supabase/migrations/20260215000003_create_trivia_presets.sql`, `stores/settings-store.ts`, `types/index.ts`, `docs/trivia-round-config-analysis/phase-4/analysis-report.md`.*
