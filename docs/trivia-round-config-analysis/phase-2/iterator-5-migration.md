# Iteration: Settings Store Migration Path

## Assignment
Plan the settings store migration from v3 to v4.

## Findings

### Keep `questionsPerRound` in Store (Option A — Recommended)
- **Evidence:** Removing QPR breaks GameSettings type (types/index.ts:152-159), validation V6, preset/template save/load, and all importers that use it. Keeping it avoids all these changes.
- **Confidence:** high
- **Significance:** QPR remains in store as a derived/computed value, just not user-editable via slider

### Migration is Additive Only
- Bump version 3 → 4
- Add `isByCategory: boolean` (default `true`) to SettingsState
- Add to SETTINGS_DEFAULTS, partialize, migrate function
- Migrate function: `if (fromVersion === 3) return { ...stored, isByCategory: true }`
- **Confidence:** high
- **Significance:** No breaking changes, no field removals

### GameSettings Type Does NOT Need `isByCategory`
- **Evidence:** GameSettings (types/index.ts:152-159) is used by the game engine during play. Category mode is a setup-time UI concern, not a runtime concern. Engine doesn't need to know.
- **Confidence:** high
- **Significance:** Keep isByCategory in SettingsState only, not GameSettings

### SETTINGS_RANGES Unchanged
- roundsCount range (1-6) stays
- questionsPerRound range (3-10) stays — still used for validation/clamping
- No new range needed for isByCategory (boolean)
- **Confidence:** high

### Selector Updates
- `useSettings()` — add `isByCategory: state.isByCategory`
- `useGameSettings()` — no change (returns roundsCount + questionsPerRound for game logic)
- No new selector needed
- **Confidence:** high

### Test Updates Required
- Default value test: `expect(state.isByCategory).toBe(true)`
- Update test: `updateSetting('isByCategory', false)` → verify
- Partialize test: expect 9 keys (was 8)
- Migration test: v3 data → v4 adds isByCategory=true
- **Confidence:** high

## Resolved Questions
- "Should QPR be removed from store?" → No — keep for backward compat and existing consumers
- "Should isByCategory go in GameSettings?" → No — UI concern only
- "Is the migration breaking?" → No — additive only

## Remaining Unknowns
- None for the store migration itself. UI changes are separate.
