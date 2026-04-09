# Trivia: Remove Recap Instructions from Display View

## Summary

Arrow key / keyboard instructions are currently shown in the **display (audience) view** footer during recap scenes. These should be removed from the display and moved to the **presenter view** instead — the audience doesn't need to see navigation hints.

## Current State

### Display (Audience) Scenes with Instructions

There are 3 recap display scenes, all in `apps/trivia/src/components/audience/scenes/`:

| File | Lines | Footer Text |
|------|-------|-------------|
| `RecapTitleScene.tsx` | 113-116 | `"-> Begin . N Skip to next round"` |
| `RecapQAScene.tsx` | 196-200 (answer face) | `"-> Next question . <- Back . N Next round"` or `"-> View scores . <- Back . N Next round"` |
| `RecapQAScene.tsx` | 239-243 (question face) | `"-> Show answer . <- Previous . N Next round"` |
| `RecapScoresScene.tsx` | 80-86 | `"Press Enter or N for next round"` (keyboard hints only, no arrows) |

### Presenter View Navigation

- **SceneNavButtons.tsx** (`apps/trivia/src/components/presenter/SceneNavButtons.tsx`, lines 82-137): Renders `<-` and `->` navigation buttons
- **nav-button-labels.ts** (`apps/trivia/src/lib/presenter/nav-button-labels.ts`, lines 48-122): Generates contextual button labels (e.g. "Previous", "Show answer", "View scores")
- **play/page.tsx** (`apps/trivia/src/app/play/page.tsx`, lines 388-425): Presenter view with controls and keyboard shortcuts panel

### Key Insight: Independent Systems

The display footer text is **hard-coded in each audience scene component** and is **independent** from the presenter's `SceneNavButtons` labels. They duplicate information but are maintained separately.

## How Dual-Screen Rendering Works

1. **Shared State**: Both views use the same `useGameStore` (Zustand)
2. **BroadcastChannel Sync**: Via `useSync()` hook in both pages
3. **Scene-Based Routing**: `SceneRouter` reads `audienceScene` state and renders the appropriate display component
4. **Display footer instructions**: Hard-coded per scene (not derived from any shared label system)

## Suggested Approach

### 1. Remove from Display Scenes

- `RecapTitleScene.tsx` (lines 113-116): Remove `-> Begin . N Skip to next round` from footer
- `RecapQAScene.tsx` (lines 196-200, 239-243): Remove all `->` / `<-` arrow instructions from both question and answer faces
- `RecapScoresScene.tsx` (lines 80-86): Remove `Press Enter or N for next round`
- Either leave footer empty/hidden, or show something audience-relevant (e.g. round name, team count)

### 2. Add to Presenter View

Options (pick one or combine):
- **Enhance SceneNavButtons**: Add helper text below buttons showing keyboard shortcuts
- **Add recap-specific instructions panel**: Similar to existing keyboard shortcuts panel (play/page.tsx lines 394-425), but contextual to recap scenes
- **Extend button titles**: Already have `title="Back (Arrow Left)"` at line 88 — could make these more visible

### 3. Scope

- Only recap scenes are affected — other scenes should be checked for similar patterns
- `RecapScoresScene.tsx` already has minimal instructions (no arrows), but still has keyboard hints the audience doesn't need
