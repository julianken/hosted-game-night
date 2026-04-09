# Iteration: Bug Validation Report

## Assignment
Validate three potential bugs found during Phase 1 investigation.

## Findings

### Bug 1: audienceScene not reset — NOT A REAL BUG
- **Evidence:** resetGameEngine (lifecycle.ts:109-128) spreads createInitialState() which sets audienceScene:'waiting'. No subsequent override touches audienceScene. The scene IS correctly reset on every resetGame call.
- **Confidence:** Definitive
- **Relation to Phase 1:** Contradicts the claim from area-5
- **Significance:** One fewer concern for sidebar removal — the sidebar reset path works correctly for scene state

### Bug 2: Divergent reset behavior — REAL BUG, observable
- **Evidence:** Sidebar calls game.resetGame() only (preserves teams with zeroed scores). Header/R key goes through confirmNewGame which calls resetGame() AND removes all teams. Comment at page.tsx:130: "Clear teams that resetGame preserves" — confirms awareness of the difference.
- **Confidence:** Definitive
- **Relation to Phase 1:** Confirms findings from areas 1, 2, and 5

**Comparison table:**
| Aspect | Sidebar | Header/R key |
|---|---|---|
| Confirmation modal | No | Yes |
| Teams after reset | Preserved (scores zeroed) | Removed |
| Intent | Appears unintentional (no code comment justifying the difference) | Intentional full reset |

- **Significance:** Sidebar provides degraded reset, not enhanced. Removing it directs all resets through the single correct path.

### Bug 3: Dual useQuickScore instances — REAL BUG, actively observable
- **Evidence:** Instance 1 (keyboard, use-game-keyboard.ts:100) and Instance 2 (page.tsx:172) have independent useState and useRef. Keyboard digit press doesn't highlight QuickScoreGrid button. Click on grid button can't be undone with Ctrl+Z from keyboard.
- **Confidence:** Definitive
- **Relation to Phase 1:** Confirms finding from area-1

**Impact:** Mixed keyboard+mouse scoring produces incorrect visual state and broken undo. Sidebar removal eliminates Instance 2, leaving only the correct keyboard instance → bug resolved.

## Summary

| Bug | Real? | Observable? | Sidebar Removal Impact |
|---|---|---|---|
| audienceScene not reset | No | N/A | None |
| Divergent reset (no modal, teams kept) | Yes | Yes | Removal eliminates degraded path |
| Dual useQuickScore | Yes | Yes | Removal resolves the bug |

## Revised Understanding
Two of three claimed bugs are real. Both are RESOLVED by sidebar removal — one bug (dual useQuickScore) disappears entirely, and one inconsistency (divergent reset) is eliminated by routing all resets through the confirmed-correct path. The third bug (audienceScene) was a false alarm.
