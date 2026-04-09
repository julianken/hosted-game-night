# Synthesis: Thematic Analysis

## Synthesis Approach
Reads across all Phase 1/2 artifacts to identify recurring patterns. Asks: what is the sidebar's structural role, and what does removing it mean?

## Core Narrative

The trivia presenter sidebar did not emerge from deliberate design. It accumulated as a remediation layer — a place to put capabilities the center panel never modeled. The Game Over block exists because the center panel has no ended-state rendering. QuickScoreGrid exists because keyboard shortcuts needed a mouse affordance. TeamScoreInput exists because score corrections had nowhere else to live. TeamManager exists because the setup wizard gates add/remove on `status === 'setup'` and someone needed mid-game rename. None are primary features; they are patches applied to an underspecified center panel.

This explains why removal is both safer and harder than it appears. Safer: the sidebar's core functions are either duplicated in the keyboard layer or are bugs — two confirmed defects (dual useQuickScore, divergent reset) exist because the sidebar created competing implementations. Harder: removing the remediation layer exposes the architectural gaps it was masking. The center panel has no ended-state UI at all. That gap is not a sidebar feature — it is design debt the sidebar was quietly servicing.

## Key Conclusions

### Conclusion 1: The Sidebar is a Compensatory Overlay, Not a Primary Design Surface
- **Supporting evidence:** Each component compensates for a center panel omission: TeamManager for setup wizard's status gate, QuickScoreGrid for keyboard-only scoring feedback, TeamScoreInput for absent score-correction UI, Game Over for missing ended-state
- **Confidence:** High
- **Caveats:** "Compensatory" does not mean unnecessary — some patches address real gaps that must be relocated

### Conclusion 2: The Ended-State Gap is Architectural Debt the Sidebar Was Masking
- **Supporting evidence:** RoundSummary auto-show requires between_rounds (not ended). No keyboard shortcut. Center panel shows stale question. audienceScene goes final_buildup→final_podium (audience-only). The component IS designed for ended state but orphaned.
- **Confidence:** Definitive
- **Caveats:** Fix is low complexity — auto-trigger RoundSummary on status→ended, or add button to center panel

### Conclusion 3: The Sidebar Actively Degrades Scoring Correctness
- **Supporting evidence:** Dual useQuickScore: separate useState/useRef cause visual desync + broken undo. Divergent reset: skips confirmation, preserves teams. Both eliminated by removal.
- **Confidence:** Definitive
- **Caveats:** Bugs require mixed keyboard+mouse usage to observe; pure-keyboard users unaffected

### Conclusion 4: Scoring Coverage Degrades Gracefully Except setTeamScore
- **Supporting evidence:** 5 active scenes retain keyboard scoring. round_scoring already sidebar-free (prior art). The one semantic gap is setTeamScore (arbitrary score-set) — keyboard only does ±1.
- **Confidence:** High
- **Caveats:** Depends on presenter being keyboard-proficient — touchscreen-only presenters lose all mouse scoring

### Conclusion 5: The Relocation Map is Bounded — One Hard Dependency, Three Voluntary Choices
- **Supporting evidence:** MUST RELOCATE: View Final Results (zero workaround). SHOULD RELOCATE: rename (8 unit tests, intentional feature), score override (6+5 tests, tedious workaround). ACCEPTABLE LOSS: per-round breakdown.
- **Confidence:** High
- **Caveats:** SHOULD RELOCATE ratings involve product judgment about live-event workflows

## Blind Spots
- Usage frequency data absent — all ratings based on code analysis, not observed behavior
- Touchscreen-only presenter workflow not quantified
- Accessibility replacement parity out of scope
- handleNextRound/ended state interaction (latent bug in RoundSummary "End Game" button)

## Recommendations (high-level only)
1. **Prerequisite:** Add ended-state rendering path (auto-trigger RoundSummary or dedicated center panel state)
2. **Recommended:** Relocate mid-game rename and score override to center panel or modal
3. **Accept:** Per-round breakdown loss (data in recap flow)
4. **Do not block removal on SHOULD RELOCATE items** — they can be added iteratively
