# Synthesis: Thematic

## Synthesis Approach
Organized all Phase 1/2 findings into cross-cutting themes by examining shared root causes and shared remedy paths. Themes ordered by impact severity, not discovery sequence.

## Core Narrative
The `round_scoring` scene is an architectural outlier within the trivia presenter flow. It is the only scene that couples a data-persistence action (submitting scores) with scene advancement, yet the navigation system was designed for scenes where "advance" is the sole action. This mismatch is the root cause of nearly every finding: the layout was designed for question-centric scenes and never adapts; the scoring panel was added to a 320px sidebar because that is where team widgets live; the navigation offers five exit paths where only one saves data; and the global keyboard system collides with the panel's local handlers. Underneath sits a clear intentional design: the bar/pub trivia model, where quick-score accumulation IS the primary scoring path and the RoundScoringPanel is optional. But this intent is invisible to the presenter, creating a clarity gap that transforms reasonable architecture into confusing UX.

## Key Conclusions

### Conclusion 1: Layout Inversion — Primary Task Gets Least Space
- **Supporting evidence:** Phase 1 Area 1 (center panel 864px stale content, scoring in 320px sidebar), Phase 2 Iterator 2 (overflow at 5-6 teams, 2.7x space gain from relocation)
- **Confidence:** High
- **Caveats:** 3-column layout is correct for all other scenes. Fix must not degrade the 12+ scenes where it works.

### Conclusion 2: Invisible Dual-Mechanism Design — Two Scoring Paths, No Signposting
- **Supporting evidence:** Phase 2 Iterator 1 (commit 0b531b90 bar-trivia intent), Phase 1 Area 2 (destructive vs additive semantics), Phase 1 Area 3 Finding 5 (no confirmation dialog)
- **Confidence:** Very High
- **Caveats:** Experienced presenters may learn the model. First-time presenters face genuine data-zeroing risk from partial panel submission.

### Conclusion 3: Navigation Inconsistency — Five Exits, One Saves
- **Supporting evidence:** Phase 1 Area 3 (5 exit paths enumerated), Phase 1 Area 3 Finding 6 (architecturally unique — only scene where nav button != primary action)
- **Confidence:** High
- **Caveats:** Advance-without-saving is intentional per bar-trivia model. Problem is indistinguishability in the UI.

### Conclusion 4: Wasted Center Panel — Available Data, No Display
- **Supporting evidence:** Phase 2 Iterator 4 (teamAnswers empty, but round questions with correct answers available), Phase 1 Area 4 Finding 5 (RoundSummary pure presentational, reusable)
- **Confidence:** High
- **Caveats:** Showing answers on presenter screen is fine (presenter-only), but audience seeing the presenter screen could be a spoiler.

### Conclusion 5: Latent Technical Debt — Dead State, Dual Handlers, Missing Guards
- **Supporting evidence:** Phase 2 Iterator 5 (roundScoringInProgress dead state, Ctrl+Z dual handlers), Phase 2 Iterator 3 (Enter double-advance harmless but unguarded)
- **Confidence:** High
- **Caveats:** All low-severity individually. Important only as part of broader cleanup.

## Blind Spots
1. Mobile/tablet presenter experience not analyzed
2. No real-world usage data (analytics, user reports, usability testing)
3. Multi-round interaction effects not tested empirically
4. Audience engagement during scoring pause not explored
5. Future per-question scoring mode implications not considered

## Recommendations (high-level only)
1. Relocate scoring UI to center panel during `round_scoring`
2. Clarify dual-mechanism relationship with inline guidance and pre-populated quick-score values
3. Unify advance behavior — forward nav saves current state before advancing
4. Clean up dead state and dual handlers
5. Enhance accessibility (aria-describedby, completion announcements)
