# Context Packet: Phase 1

## Key Findings
- QPR referenced in ~36 files; user input only in WizardStepSettings slider — all other consumers READ it
- All 8 roundIndex assignment sites use same formula: `Math.floor(index / questionsPerRound)`
- Assignment happens at import time (Step 1), NOT at game start or settings change
- Categories always present on questions; 7 canonical categories with rich utility library
- Templates store QPR in DB (with questions). Presets store QPR in DB (settings-only, no questions)
- V6 validation compares actual vs configured QPR — becomes meaningless if QPR is computed
- QuestionDisplayScene already derives QPR from actual round count — proven pattern
- Toggle component available in @joolie-boolie/ui

## Confidence Levels
- **High:** QPR consumer mapping, round assignment patterns, category availability, UI architecture
- **Medium:** API category distribution estimates, edge case behavior with very small/large fetches
- **Low:** Impact on existing saved templates/presets in production DB

## Contradictions & Open Questions
1. **Timing problem:** roundIndex assigned at import time but user changes rounds count AFTER import in Step 2. Need re-assignment mechanism when rounds/mode changes.
2. **Preset tension:** Presets are settings-only (no questions). If QPR removed from UI, presets that stored QPR lose meaning. But presets could store "target QPR" for future question distribution.
3. **Should QPR remain in settings store?** Could keep as derived value auto-populated from actual distribution, or remove entirely with v4 migration.

## Artifacts
- phase-1/area-1-qpr-consumers.md: All QPR consumers mapped
- phase-1/area-2-round-assignment.md: All roundIndex assignment patterns
- phase-1/area-3-category-distribution.md: Category system and edge cases
- phase-1/area-4-validation-templates.md: Validation, templates, presets impact
- phase-1/area-5-ui-architecture.md: Component tree and state flow
