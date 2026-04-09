# Phase 3 Synthesis 1: Thematic Synthesis

**Analysis question:** How to restructure the trivia app's `round_scoring` scene: gate forward navigation on score submission, relocate the scoring form from sidebar to center panel, evaluate removing the right sidebar.

**Phase:** 3 of 4
**Synthesizer role:** Thematic
**Date:** 2026-03-10

---

## Theme 1: The Gate Belongs at the Orchestrator, Not at the Keyboard

**Statement:** All forward navigation from `round_scoring` must pass through `orchestrateSceneTransition()`. That is the single correct insertion point for a submission gate, and the reveal-lock pattern is an exact precedent requiring only a 3-line addition.

**Supporting evidence:**

- Area 1 identified three independently-unguarded forward paths: ArrowRight dispatches `SCENE_TRIGGERS.ADVANCE` (`use-game-keyboard.ts:189`), N key dispatches `SCENE_TRIGGERS.NEXT_ROUND` (`use-game-keyboard.ts:228-236`), and SceneNavButtons "Review Answers" dispatches `SCENE_TRIGGERS.ADVANCE` (`SceneNavButtons.tsx:61-66`). No single keyboard-layer guard covers all three simultaneously.
- Area 1 found the reveal-lock at `scene-transitions.ts:364-367` — an `ADVANCEMENT_TRIGGERS` set (`'advance', 'skip', 'next_round', 'close'`) plus a guard returning `null` before all handler layers. This pattern already intercepts all three forward paths.
- Area 1 confirmed `getNextScene()` must remain pure; the orchestrator layer is the only correct non-pure interception point.
- Iterator 2 confirmed the keyboard handler ignores the boolean returned by `store.advanceScene()` — so keyboard-layer guards would leave SceneNavButtons unguarded, requiring orchestrator-level gating regardless.
- Iterator 4 confirmed `NEXT_ROUND` is in `ADVANCEMENT_TRIGGERS`, so the N-key bypass is caught automatically alongside ArrowRight.
- Area 1 confirmed `roundScoringEntries` cannot serve as the submitted indicator — it is cleared on submission, making it empty both before and after. A dedicated `roundScoringSubmitted: boolean` field in `TriviaGameState` is required.
- Area 1 / Iterator 4 confirmed the flag lifecycle asymmetry: forward entry from `round_summary` must reset `roundScoringSubmitted: false`; backward entry from `recap_qa` must preserve it as `true`.

**Confidence:** High. The reveal-lock is a direct code-grounded precedent. The 3-line gate insertion mirrors an existing established pattern and requires no new abstractions or type changes beyond adding one boolean field.

**Caveats:** The flag lifecycle asymmetry (reset on forward, preserve on backward) must be implemented correctly in `scene-transitions.ts`. If the backward-entry branch accidentally resets `roundScoringSubmitted`, a presenter returning from `recap_qa` to correct a score will find forward navigation blocked again despite scores being committed. This requires a targeted test case.

---

## Theme 2: The Forward Button Feedback Pattern Is Already Established — Extend It

**Statement:** The existing `NavButtonState.disabled` transient-disabled mechanism (38%-opacity button text, from the reveal-lock) is the correct and complete UX feedback model for the submission gate. No new feedback primitives — no toast, no modal, no dynamic labels — are needed.

**Supporting evidence:**

- Iterator 2 identified two distinct disabled tiers in `SceneNavButtons.tsx:26`: structural `null` (button text absent, terminal scenes) and transient `disabled: true` (button text visible at 38% opacity, action temporarily blocked). The reveal-lock uses transient disabled. The submission gate should use the same tier.
- Iterator 2 confirmed `NavButtonState.disabled` is computed in the hook layer at `use-nav-button-labels.ts:71-79`, not inside `getNavButtonLabels()`. Adding `roundScoringSubmitted` requires no type changes.
- Iterator 2 confirmed toast is wrong for this gate on three grounds: (1) the app uses `useToast()` exclusively for async CRUD results, not synchronous UI constraints; (2) stacked toasts on repeated keypresses; (3) the reveal-lock uses silent rejection.
- Iterator 2 confirmed the forward button label `'Review Answers'` should remain unchanged.
- Iterator 2 recommended updating `next-action-hints.ts:30` from `'Enter scores in sidebar...'` to `'Enter scores for all teams, then press Done. Left Arrow to go back.'`

**Confidence:** High for the gate mechanism and feedback model. Medium confidence on the exact presentation (hide vs disable SceneNavButtons) — see contradiction below.

**Caveats:** The hide-vs-disable tension is real. Iterator 4 resolved it by noting the forward button is never visible-and-enabled in normal flow — Done auto-advances before the user can observe the button transition. This makes the disabled-button signal practically invisible. Hiding SceneNavButtons is cleaner for the normal-flow case. On backward re-entry, the button would be enabled but redundant with keyboard navigation. Phase 4 must commit to one approach.

---

## Theme 3: The Center Panel Restructuring Is Self-Contained and Low-Blast-Radius

**Statement:** Moving the scoring form to the center panel and removing the sidebar during `round_scoring` affects a small, well-bounded set of files. The side-by-side layout (scoring form ~400px left column, Q&A reference flex-1 right column) is the correct layout. No other between-rounds scene requires center panel changes.

**Supporting evidence:**

- Iterator 4 confirmed only `round_scoring` requires center panel restructuring among the 5 between-rounds scenes.
- Iterator 4 produced a definitive file inventory: 8 production files + 2 test files.
- Iterator 3 quantified the space gain: removing the `w-80` sidebar reclaims ~300px across all viewport sizes.
- Iterator 3 evaluated three layout options. Option A (side-by-side) is recommended: primary task left-first, reference visible simultaneously, columns scroll independently, props unchanged.
- Iterator 5 confirmed CSS layout degrades cleanly to 2-column — `flex-1` center expands naturally.
- Iterator 5 confirmed zero E2E selector coupling to sidebar DOM identity.
- Iterator 5 confirmed `RoundScoringPanel`'s two `useEffect` hooks are component-lifecycle-scoped and travel with the component to any DOM location.

**Confidence:** High. CSS, E2E, and effect analyses are all code-grounded.

**Caveats:** The hardcoded `max-h-[calc(100vh-400px)]` at `RoundScoringView.tsx:103` must change — the 400px figure was calibrated for a 3-column layout. The exact replacement needs empirical verification. For 20-team games, both columns require `overflow-y-auto`.

---

## Theme 4: Sidebar Removal Has One Hard Blocker and Two Bounded Feature-Loss Items

**Statement:** The right sidebar can be cleanly removed with one mandatory a11y fix, two known feature-relocation decisions (TeamManager rename, "View Final Results" button), and no CSS or behavioral regressions.

**Supporting evidence:**

- Iterator 5 identified the single hard accessibility break: skip link at `page.tsx:239-244` (`href="#game-controls"`) targeting the sidebar. Must remove in same commit.
- Iterator 5 confirmed two undo stacks are independent and scene-coordinated, not location-coordinated.
- Iterator 5 confirmed viewport scroll lock is anchored at root wrapper, not at any column.
- Iterator 5 confirmed no responsive breakpoints exist on the sidebar.
- Iterator 1 mapped the two feature-loss items: TeamManager rename → modal; "View Final Results" → auto-show or header button.
- Iterator 1 confirmed TeamScoreInput ±1 buttons are redundant with keyboard shortcuts.
- Iterator 1 confirmed QuickScoreGrid is fully relocatable.

**Confidence:** High for the hard break and relocation findings. Medium for the "drop TeamScoreInput ±1" recommendation.

**Caveats:** Full sidebar removal affects all gameplay scenes, not just `round_scoring`. The iterators confirmed safety from a CSS/dependency standpoint, but QuickScoreGrid relocation for non-`round_scoring` scenes was not fully designed. Phase 4 must scope this: conditionally suppress during `round_scoring` only, or remove globally?

---

## Theme 5: The Current Split Layout Has Internal Duplication That the Merge Resolves

**Statement:** The existing `round_scoring` UI has two components rendering overlapping content — `RoundScoringView` in center and `RoundScoringPanel` in sidebar — each with independent headers, standings, and scroll regions. Merging them is a design improvement independent of the three stated goals.

**Supporting evidence:**

- Iterator 3 identified two duplicate "Round N Scoring" headers.
- Iterator 3 identified the hardcoded `max-h` constant as an artifact of the split layout.
- Iterator 3 noted standings and scoring inputs are conceptually a single workflow artificially split across two panels.
- Iterator 4 noted `RoundScoringPanel` initializes from committed `team.roundScores[currentRound]`, independently of the store's `roundScoringEntries`.
- Iterator 3 proposed a consolidated unified header row with the `aria-live="polite"` progress counter.

**Confidence:** High for the duplication diagnosis. Medium for the specific consolidated header design.

**Caveats:** The `hideHeader` prop approach creates mixed responsibility. Extracting `RoundScoringFormBody` is architecturally cleaner but higher refactor cost. Phase 4 should specify which approach.

---

## Blind Spots This Lens Might Be Missing

1. **BroadcastChannel sync payload for `roundScoringSubmitted`** — not confirmed whether the field needs to be in the sync mapping.
2. **20-team dual-scroll ergonomics** — empirically unverified.
3. **Full sidebar removal vs. `round_scoring`-only suppression** — different scopes with different risk profiles.
4. **Done button auto-advance atomicity** — `setRoundScores()` then `advanceScene()` batching unverified (likely fine with React 18+).
5. **Back navigation discoverability without SceneNavButtons** — usability regression for mouse-only presenters, accepted without evidence.
