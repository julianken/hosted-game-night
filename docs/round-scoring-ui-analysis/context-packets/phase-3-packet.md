# Context Packet: Phase 3

## Synthesis Comparison

### Where All Three Agree
1. **Layout inversion is the highest-impact problem.** Center panel (60% of screen) shows stale content while scoring form is crammed in 320px sidebar that overflows at 5-6 teams. All three syntheses rate this as the top priority.
2. **The dual-mechanism design is intentional but invisible.** Quick-score is primary, panel is optional. The UX problem is lack of clarity, not data loss. Pre-filling the panel with quick-score values is the highest-value fix.
3. **Test coverage must precede UX changes.** Zero E2E coverage for the advance-without-save path. Cannot safely change navigation semantics without tests.
4. **`roundScoringInProgress` is dead state.** Should be removed or wired into a soft warning.
5. **Back navigation from `round_scoring` is missing** and should be added (one-line state machine change).

### Where They Diverge
1. **Scope of center panel redesign:**
   - Synthesis 1 recommends relocating the scoring form to center panel (replaces stale QuestionDisplay)
   - Synthesis 2 agrees and adds pre-filling as the single highest-value change
   - Synthesis 3 raises a constraint: this breaks a layout invariant (center panel is identical across all `between_rounds` scenes). Suggests deciding scope first: single-scene exception vs systemic overhaul.

2. **Whether to unify advance behavior:**
   - Synthesis 1 recommends making forward nav/ArrowRight call `setRoundScores()` before advancing
   - Synthesis 2 focuses on pre-fill (which makes the overwrite harmless rather than preventing it)
   - Synthesis 3 notes panel state is local React state (not in store), so auto-saving requires lifting state first

3. **Dead code cleanup priority:**
   - Syntheses 1 and 2 treat technical debt (Ctrl+Z, dead flag, double-advance) as part of a broader cleanup
   - Synthesis 3 argues these are decision constraints — fix tests first, then clean up

### Strongest Conclusions (High Confidence, All Three Agree)
- Pre-fill panel with `team.roundScores[currentRound]` (eliminates destructive overwrite risk)
- Move/enlarge scoring UI into center panel during `round_scoring` (solves overflow + visual hierarchy)
- Add back navigation from `round_scoring` to `recap_qa`
- Add round question recap with correct answers as center panel reference content
- Write E2E tests for both exit paths before changing navigation semantics

### Largest Blind Spots
- No real-world usage data (analytics, user reports, usability testing)
- No mobile/tablet testing (layout may already be broken on 1024px iPads)
- No analysis of multi-round compounding confusion
- RoundScoringPanel local state is lost on remount (constraint for relocation)
- `scoreDeltas` fidelity on advance-without-save path never empirically tested

## Artifacts
- `phase-3/synthesis-1.md`: Thematic — 5 themes, root cause analysis, causal relationships
- `phase-3/synthesis-2.md`: Risk/Opportunity — 5 risks rated, 5 opportunities rated, 2 strengths
- `phase-3/synthesis-3.md`: Gaps/Implications — 7 evidence gaps and design constraints
