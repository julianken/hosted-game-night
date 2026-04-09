# Context Packet: Phase 3

## Synthesis Comparison

### Where all 3 synthesizers agree:

1. **Gating (Change a) is fully specified and ready to implement.** 3-line addition to `orchestrateSceneTransition()` following the reveal-lock pattern. `roundScoringSubmitted: boolean` flag with asymmetric lifecycle (reset on forward entry, preserve on backward). 2 test updates. No new abstractions needed.

2. **Sidebar removal is low-risk for CSS/layout.** `flex-1` expands naturally. No E2E coupling. Undo stacks independent. Only hard break is skip link `href="#game-controls"` at `page.tsx:239-244` — mandatory co-deletion.

3. **Side-by-side merged layout is correct.** ~400px scoring left, flex-1 Q&A right. Consolidate duplicate headers. Replace hardcoded `max-h` constant.

4. **Toast is ruled out** as feedback. Silent rejection (matching reveal-lock) is correct.

5. **N-key scoring bypass is fixed as side effect** of the gate — `NEXT_ROUND` is in `ADVANCEMENT_TRIGGERS`.

6. **Changes should ship as: (a) alone, then (b)+(c) together.** Gating is independent. Form move + sidebar removal are coupled.

### Where synthesizers diverge:

1. **Hide vs. disable SceneNavButtons during round_scoring:**
   - Synthesis 1 (thematic): Presents both sides; notes forward button is never visible-enabled in normal flow
   - Synthesis 2 (risk): R8 rates dual-path confusion as Medium/Certain; recommends hiding
   - Synthesis 3 (gaps): Lists as Gap 1, suggests 5-minute code audit to resolve
   - **Resolution for Phase 4:** Hiding is the stronger recommendation (2 of 3 lean that way)

2. **Scope of sidebar removal:**
   - Synthesis 1: Flags `round_scoring`-only vs. global as unresolved
   - Synthesis 2: R5 recommends scoping to `round_scoring` only in Phase 1
   - Synthesis 3: Hard dependency — global removal requires QuickScoreGrid relocation (out of scope)
   - **Resolution for Phase 4:** Scope to `round_scoring`-only for initial implementation

3. **`hideHeader` prop vs. component extraction:**
   - Synthesis 1: Notes mixed responsibility vs. higher refactor cost
   - Synthesis 3: Gap 6 flags a11y risk if `aria-live` counter is hidden
   - **Resolution for Phase 4:** Needs explicit recommendation with a11y safeguard

### Strongest conclusions (high confidence):

- Gate at orchestrator layer, not keyboard layer
- `roundScoringSubmitted: boolean` is the correct flag (entries cannot double as indicator)
- Skip link co-deletion is mandatory
- 2 definite test breaks, zero from layout/sidebar changes
- Audience sync is entirely unaffected by all changes

### Largest blind spots:

- Presenter's actual workflow not observed (static code analysis only)
- 20-team dual-scroll ergonomics empirically unverified
- Modified-but-uncommitted entries after backward re-entry (gate stays open)
- Back navigation discoverability without SceneNavButtons for mouse-only users

## Key Risks (from Synthesis 2):

| Risk | Severity | Required Action |
|------|----------|----------------|
| R2: Skip link dead anchor | High | Co-delete in same commit |
| R8: Dual advancement paths | Medium | Hide SceneNavButtons during round_scoring |
| R3: "View Final Results" loss | Medium | Auto-show on ended, or stage removal |
| R5: QuickScoreGrid displacement | Medium | Scope to round_scoring only |

## Key Opportunities (from Synthesis 2):

| Opportunity | Impact |
|-------------|--------|
| O1: Eliminate spatial inversion | High — 35% wider scoring form |
| O5: Recover 320px horizontal space | High for laptops |
| O8: Fix N-key scoring bypass | High for game integrity |
| O6: Establish reusable gate pattern | Medium architectural value |

## Artifacts

- phase-3/synthesis-1.md: Thematic synthesis (5 themes, 5 blind spots)
- phase-3/synthesis-2.md: Risk/opportunity synthesis (10 risks, 8 opportunities, 4 ordering constraints)
- phase-3/synthesis-3.md: Gap/implication synthesis (6 evidence gaps, scope implications, 6 blind spots)
