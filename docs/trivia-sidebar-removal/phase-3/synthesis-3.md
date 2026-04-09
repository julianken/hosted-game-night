# Synthesis: Gaps & Implications

## Synthesis Approach
Examines what evidence does NOT tell us and what second-order effects were not investigated. Treats the boundary of known evidence as data.

## Core Narrative

The analysis is thorough on components and their redundancy but does not address the presenter as an operator in a live event — a human under social pressure, potentially on a laptop with a trackpad, no keyboard shortcuts memorized. Every "keyboard fallback exists" conclusion assumes keyboard proficiency; the analysis never validates this from usage data. The second structural gap: removal without simultaneous replacement creates an intermediate state where the game is degraded for all operators, and the zero-test status of "View Final Results" means CI will be green while the feature is broken.

## Key Conclusions

### Gap 1: Presenter Operator Model Was Never Defined
- **Type:** Gap
- **Supporting evidence:** All feature ratings use keyboard as fallback. No usage data, user research, or product spec defines expected input modality.
- **Confidence:** High (gap is definitively present)
- **Why it matters:** If 40% of sessions are mouse-only, keyboard-only scoring is a primary-path regression. If 90% are keyboard-first, it's acceptable.

### Gap 2: "End Game" Button in RoundSummary Has Confirmed Latent Bug
- **Type:** Gap + Implication
- **Supporting evidence:** handleNextRound (page.tsx:89-93) calls game.nextRound() which is a no-op when status!=='between_rounds' (rounds.ts:24-25), then unconditionally sets audienceScene to round_intro — invalid for ended status. Currently unreachable for most users. Any auto-show replacement routes ALL users through this bug.
- **Confidence:** Definitive (full call chain traced)
- **Why it matters:** Must fix this call path BEFORE adding auto-show, or replacement exposes the bug to every user

### Gap 3: Test Coverage Inverted Relative to Risk
- **Type:** Implication
- **Supporting evidence:** View Final Results: 0 tests, MUST RELOCATE. The @high rename E2E test (presenter.spec.ts:138-162) exercises setup-wizard path, not mid-game sidebar rename. After removal, CI passes while mid-game rename is silently gone.
- **Confidence:** Definitive
- **Why it matters:** Removal can pass all quality gates while introducing two user-visible regressions

### Gap 4: +320px Center Panel Width Uninvestigated Visually
- **Type:** Gap
- **Supporting evidence:** +37% width at 1440px, no max-width constraints. No investigator examined actual visual impact at common presenter resolutions (1280x800).
- **Confidence:** High
- **Why it matters:** Requires manual verification at real presenter hardware resolutions

### Gap 5: Bingo's Sidebar-Free Presenter Not Used as Evidence
- **Type:** Gap
- **Supporting evidence:** Bingo /play has no right sidebar — production-ready 2-column layout. Never referenced in analysis.
- **Confidence:** High
- **Why it matters:** Strongest available evidence that sidebar-free presenter works in production for this platform

### Gap 6: Removal Sequencing Risk Unaddressed
- **Type:** Implication
- **Supporting evidence:** MUST RELOCATE item has 0 tests. Separate PRs for removal vs replacement creates intermediate state with broken ended-state.
- **Confidence:** High
- **Why it matters:** Removal and MUST RELOCATE replacement must be a single atomic change

### Gap 7: RoundSummary Dismiss-and-Reopen Is One-Way in Ended State
- **Type:** Implication
- **Supporting evidence:** Auto-show fires on between_rounds only. If presenter closes overlay during ended, no reopening mechanism exists without sidebar button.
- **Confidence:** Definitive
- **Why it matters:** Replacement needs persistent re-open affordance, not just one-time auto-show trigger

### Gap 8: Two Bugs Framed as Removal Benefits Rather Than Independent Issues
- **Type:** Implication
- **Supporting evidence:** Dual useQuickScore and divergent reset affect production today. Should be filed and fixed regardless of sidebar decision.
- **Confidence:** High
- **Why it matters:** Tying fixes to removal delays resolution and makes fixes contingent on larger architectural decision

## Blind Spots
- Presenter hardware and input model assumptions
- "End Game" button bug becomes high-severity with auto-show replacement
- E2E rename test covers wrong path (false assurance)
- id="game-controls" reference search never performed
- Center panel visual quality at 1280x800

## Recommendations (high-level only)
1. Fix "End Game"/handleNextRound bug independently before designing replacement
2. File dual useQuickScore and divergent reset as independent Linear issues
3. Treat removal and MUST RELOCATE replacement as single atomic PR
4. Define presenter operator model before rating SHOULD RELOCATE items
