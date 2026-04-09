# Context Packet: Phase 3

## Agreement Across All 3 Syntheses
- QPR should stay in store as derived value, NOT be removed (unanimous)
- "By Category" as default-ON is safe — category system is mature and always populated
- Migration is additive-only: v3→v4, add `isByCategory: boolean`, no field removals
- New `redistributeQuestions()` engine function + SetupGate useEffect is the right architecture
- Two pure functions in `lib/questions/round-assignment.ts`: `assignRoundsByCategory()` and `assignRoundsByCount()`
- Engine (importQuestions) is agnostic to assignment method — reads pre-assigned roundIndex

## Key Risks (from Synthesis 2)
- **R1 (HIGH):** Feedback loop — redistributeQuestions must NOT call importQuestions; must be separate function that only rewrites roundIndex without touching settings.roundsCount
- **R2 (HIGH):** `questionInRound` modulo bug in 3 audience scenes — uses `displayQuestionIndex % questionsPerRound` which breaks with variable round sizes. Fix: use existing findIndex-based selector
- **R3 (MEDIUM):** roundsCount max=6 but 7 categories exist — "By Category" with all 7 hits limit
- **R5 (MEDIUM):** Template/preset load race — redistribution effect fires when template writes to settings store, overwriting template's own round structure
- **R7 (MEDIUM):** Toggle-off loses user's manual roundsCount — store roundsCount independently from category-derived count
- **R4 (LOW):** SettingsPanel.tsx has duplicate QPR slider not mentioned in Phase 1/2

## Key Gaps (from Synthesis 3)
- UX display model for variable QPR in "By Category" mode — unresolved
- isByCategory in presets — not decided (persistent preference vs per-game choice?)
- V6 validation behavior in "By Category" mode — needs suppression or reframing
- Effect dependency array for redistribution trigger — not specified
- E2E testing strategy — not covered

## Top 5 Themes (from Synthesis 1)
1. QPR is already a "phantom input" — only 1 site accepts it as user input
2. Uniform assignment formula (`Math.floor(index/QPR)`) is duplicated 8x — clean centralization opportunity
3. Category system is mature — `getCategoryStatistics()`, `filterQuestionsBySingleCategory()` ready to use
4. Timing gap is the only genuinely new architectural requirement (~30 lines of new code)
5. Migration is contained — 1 store version bump, 1 boolean field, UI hiding in 4-5 components

## Implementation Sequence (agreed)
1. Round assignment module (pure functions, testable in isolation) — parallel with step 2
2. Settings store migration (v3→v4, add isByCategory) — parallel with step 1
3. Redistribution mechanism (engine function + SetupGate effect) — depends on 1+2
4. UI changes (WizardStepSettings, WizardStepReview, save modals, SettingsPanel) — depends on 3
5. V6 validation update + audience scene questionInRound fix — depends on 4

## Artifacts
- phase-3/synthesis-1.md: Thematic analysis (5 themes, cross-cutting observations)
- phase-3/synthesis-2.md: Risk/opportunity analysis (7 risks R1-R7, 7 opportunities O1-O7)
- phase-3/synthesis-3.md: Gap/implication analysis (7 gaps, enabled decisions, constrained options, open questions)
