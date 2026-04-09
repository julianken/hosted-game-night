# Iteration: Preset System Impact

## Assignment
Determine how removing QPR from UI affects the preset system (settings-only, no questions).

## Findings

### Presets Store Only 3 Meaningful Settings Fields
- **Evidence:** `presets/route.ts` — `rounds_count`, `questions_per_round`, `timer_duration`, plus `is_default` and metadata. QPR is 1 of only 3 game-config fields.
- **Confidence:** high
- **Significance:** Removing QPR removes 33% of the preset's configuration value

### PresetSelector Displays QPR Prominently
- **Evidence:** `PresetSelector.tsx:135` — format: `({preset.rounds_count}R / {preset.questions_per_round}Q / {preset.timer_duration}s)`
- **Confidence:** high
- **Significance:** Users see QPR as part of preset identity

### QPR in Presets is NOT Used by Game Logic
- **Evidence:** QPR from presets goes to settings store only. Game engine never reads QPR from presets directly. V6 validation uses it but only as a warning.
- **Confidence:** high
- **Significance:** Removing QPR from presets is functionally harmless

### Recommended: Option B — Deprecate But Keep in DB
- Hide QPR from PresetSelector display and SavePresetModal capture
- Keep DB column for backward compat
- Presets remain useful for roundsCount + timerDuration + is_default
- No migration needed immediately

## Resolved Questions
- "Do presets break without QPR?" → No, functionally harmless
- "Is the UX impact acceptable?" → Yes — presets still carry rounds count and timer duration

## Remaining Unknowns
- Whether users have many saved presets in production that reference QPR

## Revised Understanding
Presets are lighter than expected — QPR removal is low-risk. The bigger design question is whether presets should gain `isByCategory` as a new field (probably yes, for consistency).
