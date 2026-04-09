# Synthesis 1: Thematic

## Synthesis Approach
Organized all Phase 1/2 findings into 4 coherent themes that capture the core architectural patterns and their implementation implications.

## Core Narrative
The `round_scoring` scene's problems stem from a single root cause: it was designed as a display-only scene transition step but is actually a data-entry context. This mismatch manifests in four areas: invisible dual-mechanism scoring, keyboard shortcuts that assume display-only semantics, navigation transitions that lack side-effect awareness, and dead state that obscures the real data flow. Each area has a contained, low-risk fix. The implementation order is determined by a clear dependency chain: pre-fill enables back navigation, keyboard fixes enable the ArrowLeft handler, and cleanup is hygiene that follows after the structural changes settle.

## Theme 1: The Dual-Mechanism Trust Problem

**Core insight:** Quick-score (additive, persisted immediately) and panel form (destructive overwrite, persisted only on Done) interact invisibly. The panel starts blank, hiding accumulated quick-score values.

**Evidence:** RoundScoringPanel.tsx lines 37-43 (useState initializer ignores roundScores), lines 102-108 (null→0 on submit). Iterator 2 confirmed the `> 0` guard handles all edge cases.

**Implications:**
- Pre-fill is the highest-value single change (one-line initializer modification)
- `handleClear` should reset to pre-fill values, not null (store initial values in useRef)
- Audience sees pre-filled counts immediately via onProgressChange (acceptable)

## Theme 2: The Keyboard Contract Has a Data-Entry Blind Spot

**Core insight:** Enter, Ctrl+Z, and ArrowLeft all assume display-only semantics. `round_scoring` is the only scene where these assumptions are wrong.

**Evidence:** Enter dispatches SKIP unconditionally (use-game-keyboard.ts:272-274). Ctrl+Z fires both panel and global handlers (lines 111-125 and 282-289). ArrowLeft excludes round_scoring (lines 173-181).

**Implications:**
- Block Enter during round_scoring (1 conditional). Redirect-to-submit rejected (partial submit zeroes teams).
- Exclude round_scoring from global Ctrl+Z (1 line addition)
- Add round_scoring to ArrowLeft guard (1 line addition)
- All three changes in same file — same PR to avoid merge conflicts

## Theme 3: Navigation Integrity Requires Side-Effect Awareness

**Core insight:** Back navigation is 3 one-line changes + 1 hidden dependency. The `recapShowingAnswer` side effect must be set to `true` when entering `recap_qa` from `round_scoring`.

**Evidence:** Iterator 4 found scene-transitions.ts handles recap_qa entry differently by origin (lines 279-296). Without the side effect, backing from round_scoring shows question face instead of answer face.

**Implications:**
- Four changes required (not three): scene.ts + nav-button-labels.ts + use-game-keyboard.ts + scene-transitions.ts
- Pre-fill must precede back nav (otherwise back→forward→Done zeroes teams)
- Test the side effect explicitly

## Theme 4: Dead State Removal Is Low-Risk Hygiene

**Core insight:** `roundScoringInProgress` is written in 4 locations, never read as guard. Pure dead state. Removal is wide (~22 lines, ~17 files) but shallow.

**Evidence:** Iterator 5 exhaustive grep confirmed 0 guard reads. Audience reads `roundScoringEntries` (NOT the boolean flag). 13 test files reference it in fixtures.

**Implications:**
- Remove entirely (do NOT wire up as guard — adds friction to intentional advance-without-save)
- Do NOT remove `roundScoringEntries` (actively consumed by audience)
- Sequence after navigation changes to avoid merge conflicts

## Cross-Theme Dependencies

| Theme | Depends On | Enables |
|-------|-----------|---------|
| 1 (Pre-fill) | None | Theme 3 (back nav safe with pre-fill) |
| 2 (Keyboard) | None | Theme 3 (ArrowLeft guard) |
| 3 (Navigation) | Themes 1+2 | Theme 4 (cleanup after nav settles) |
| 4 (Cleanup) | None (sequenced after 3) | Future state simplification |

Center panel (RoundScoringView) and UX guidance are display-only additions orthogonal to Themes 1-4.

## Blind Spots
- No real-world presenter feedback on whether the keyboard changes feel natural
- No mobile/tablet testing of the sidebar scoring UX
- UX guidance text content not specified
