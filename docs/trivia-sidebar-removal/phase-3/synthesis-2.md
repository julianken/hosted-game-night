# Synthesis: Risk/Opportunity Analysis

## Synthesis Approach
Each finding assessed on severity × likelihood for risks and impact × leverage for opportunities. Live-event pub trivia context is the interpretive frame.

## Core Narrative

The removal has an asymmetric risk profile: one catastrophic blocker (ended-state UI vacuum), two meaningful-but-recoverable losses (rename, score override), and genuine opportunities that make removal net positive. The ended-state blocker is an engineering constraint, not a product question. The counterintuitive finding: the sidebar is actively making the codebase worse — two confirmed bugs are resolved as direct side effects of removal. A clean removal with proper relocation leaves the codebase in better shape than the current sidebar-present state.

## Key Conclusions

### Risk 1: Ended-State UI Vacuum — Hard Blocker
- **Type:** Risk
- **Severity/Impact:** High
- **Likelihood:** High (code-level certainty)
- **Supporting evidence:** setShowRoundSummary(true) has exactly one callsite when ended (page.tsx:543). Auto-show requires between_rounds. round_summary not in VALID_SCENES_BY_STATUS[ended].
- **Mitigation:** Mandatory pre-condition: auto-show on status→ended or add center panel button

### Risk 2: Mouse-Only Operator Workflow
- **Type:** Risk
- **Severity/Impact:** Medium
- **Likelihood:** Medium (unknown how many operators are mouse-only)
- **Supporting evidence:** 5 scenes lose all mouse scoring. Keyboard remains. round_scoring already sidebar-free (prior art).
- **Mitigation:** QuickScoreGrid is portable — embed in center panel wired to keyboard hook's instance

### Risk 3: Mid-Game Team Rename Loss
- **Type:** Risk
- **Severity/Impact:** Medium
- **Likelihood:** Medium (feature is intentionally ungated on status)
- **Supporting evidence:** TeamManager.tsx:88-95 deliberately renders Rename regardless of status. 8 unit tests. Restart is the only workaround.
- **Mitigation:** Modal or inline edit in center panel team list

### Risk 4: Direct Score Override Loss
- **Type:** Risk
- **Severity/Impact:** Medium
- **Likelihood:** Low (large corrections infrequent)
- **Supporting evidence:** TeamScoreInput.tsx:27-35 is sole callsite. Keyboard only does ±1.
- **Mitigation:** Context menu or score-editing modal accessible from header

### Opportunity 1: Dual useQuickScore Bug Elimination
- **Type:** Opportunity
- **Severity/Impact:** High
- **Likelihood:** High (deterministic fix)
- **Supporting evidence:** Two independent useState/useRef instances. Removal eliminates Instance 2, leaving single correct keyboard instance.
- **Mitigation:** Zero additional work required. If replacement widget is added, must wire to keyboard instance (not create new one).

### Opportunity 2: Degraded Reset Path Elimination
- **Type:** Opportunity
- **Severity/Impact:** Medium
- **Likelihood:** High
- **Supporting evidence:** Sidebar "Start New Game" skips confirmation, preserves teams. Code comment confirms awareness. Removal routes all resets through correct path.
- **Mitigation:** No extra work. Single-click reset in ended state could be added if valued.

### Opportunity 3: Center Panel Width Expansion
- **Type:** Opportunity
- **Severity/Impact:** Medium
- **Likelihood:** High (mechanical CSS consequence)
- **Supporting evidence:** +320px (+37% at 1440px). Benefits projector-mirrored viewport.
- **Mitigation:** May need max-width constraint on content cards

### Risk 5: Test Coverage Gap Amplification
- **Type:** Risk
- **Severity/Impact:** Medium
- **Likelihood:** High (confirmed gap)
- **Supporting evidence:** View Final Results: 0 tests. Relocated feature must include minimum viable test.
- **Mitigation:** Non-negotiable: unit test + E2E @high for ended-state flow in the removal commit

## Blind Spots
- Usage frequency unobservable from code
- Mouse-only operator personas unquantified
- Component decomposition complexity for QuickScoreGrid relocation unestimated

## Recommendations (high-level only)
1. Implement ended-state auto-show BEFORE any sidebar deletion
2. Remove sidebar (eliminates dual-useQuickScore + divergent reset)
3. Relocate QuickScoreGrid to center panel wired to keyboard hook's instance
4. Defer rename + score override to follow-up tickets
5. Add tests for relocated View Final Results as part of removal commit
