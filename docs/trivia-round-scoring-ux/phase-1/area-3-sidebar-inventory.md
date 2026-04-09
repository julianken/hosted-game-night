# Investigation: Right Sidebar Inventory & Redundancy Analysis

## Summary

The right sidebar (w-80, 320px) always renders TeamManager as its top block, then conditionally renders exactly one of three contextual panels. During live gameplay, TeamManager's add/remove controls are gated to `status === 'setup'` but the sidebar is `inert` during setup — making those controls dead-in-context. Only rename works during live game. `TeamScoreboard` is fully built, fully tested dead code (zero consumers). `RoundScoringPanel` is the only sidebar component with a unique action path (no keyboard alternative for submitting round scores).

## Key Findings

### Finding 1: TeamManager provides only rename during live gameplay
- **Evidence:** `TeamManager.tsx:53-57,97-108,121-139` — add/remove/count all gated to `status === 'setup'`. Rename button (lines 87-96) has no status guard. `page.tsx:360-364` — 3-column layout is `inert` during setup.
- **Confidence:** High
- **Implication:** During playing/between_rounds/ended, TeamManager is essentially a read-only team list with a rename affordance. Rename is real but low-frequency.

### Finding 2: QuickScoreGrid and TeamScoreInput are non-overlapping, complementary
- **Evidence:** `page.tsx:501-532` — mutually exclusive conditions. QuickScoreGrid = toggle grid for scoring phases. TeamScoreInput = +1/-1 and direct-edit for non-scoring scenes.
- **Confidence:** High
- **Implication:** Neither is redundant with the other. Both are relocatable but not removable without replacement.

### Finding 3: TeamScoreboard is dead code
- **Evidence:** Grep across `apps/trivia/src` — zero imports in any component under `app/` or `components/` connecting to the live presenter layout. Only consumers are test files.
- **Confidence:** High
- **Implication:** ~100 lines + 15+ tests can be deleted. Or repurposed as a building block.

### Finding 4: RoundScoringPanel is the only component with a unique action path
- **Evidence:** `page.tsx:187-190` — `handleRoundScoresSubmitted` is the only code path that commits round scores. No keyboard shortcut exists for score submission.
- **Confidence:** High
- **Implication:** Cannot be removed without replacement. Moving to center panel is the solution.

### Finding 5: "ended" sidebar: "Start New Game" is redundant, "View Final Results" is unique
- **Evidence:** "Start New Game" duplicates top-bar button and R key. "View Final Results" (calls `setShowRoundSummary(true)`) has no other trigger — no keyboard shortcut, not in header.
- **Confidence:** High
- **Implication:** "View Final Results" needs a new trigger location if sidebar is removed during ended state.

### Finding 6: Sidebar is invisible during setup — it's a live-game-only surface
- **Evidence:** `page.tsx:360-364` — `inert` applied during setup. `SetupGate.tsx` renders fixed z-40 overlay. Team setup happens in `SetupWizard → WizardStepTeams`.
- **Confidence:** High

## Redundancy Classification

| Component | Classification | Reasoning |
|-----------|---------------|-----------|
| TeamManager add/remove/count | **Dead in context** | Gated to setup, but sidebar only active during live game |
| TeamManager rename | **Relocatable** | Rare but real. Could be modal or click-to-edit |
| QuickScoreGrid | **Essential — relocatable** | No duplicate. Must be preserved, can move to center |
| RoundScoringPanel | **Essential — unique action** | Only submission path. Primary relocation target |
| TeamScoreInput | **Partially redundant** | +1/-1 duplicates keyboard. Direct-set is unique |
| "View Final Results" | **Relocatable** | Sidebar-exclusive, needs new trigger |
| "Start New Game" | **Redundant** | Duplicates top-bar + R key |
| TeamScoreboard | **Dead code** | Zero production consumers |

## Surprises
- TeamManager's rename button has no status guard — works even during `ended`
- Two undo stacks coexist during scoring scenes (QuickScoreGrid vs global Ctrl+Z) — may be same or independent
- The 3-column layout being `inert` during setup means sidebar's add/remove controls are categorically unreachable

## Unknowns & Gaps
- What replaces rename if sidebar is removed? Need modal or click-to-edit
- Responsive behavior: no breakpoints on w-80 sidebar — may overflow on tablets
- Whether TeamScoreboard was intentionally removed or accidentally never wired up
