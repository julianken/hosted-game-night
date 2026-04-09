# Iterator 1: Enter Key Behavior During `round_scoring`

## Assignment
Resolve the Phase 1 open question: Should Enter during `round_scoring` be (A) blocked, (B) redirected to submit, or (C) left as-is?

## Current Behavior Analysis

**Global handler** (use-game-keyboard.ts:272-274): Enter dispatches `SCENE_TRIGGERS.SKIP` unconditionally, advancing to `recap_scores` without saving panel data.

**Input focus guard** (use-game-keyboard.ts:125-130): Early return for `HTMLInputElement` prevents global handler when focus is on a scoring input.

**Panel handler** (RoundScoringPanel.tsx:219-230): Enter on inputs cycles focus to next team. On the last input with all teams entered, it calls `handleSubmit()`.

**Net effect**: When focus is on an input, Enter stays within the panel. When focus is elsewhere (e.g., user clicked on center panel, or tabbed past all inputs), Enter silently advances without saving.

**CLAUDE.md documentation** (line 176): "Enter | Skip timed scene | Always (advances via `SKIP` trigger)" — no exceptions documented.

## Option Analysis

### Option A: Block Enter entirely
- **Pro**: Prevents accidental advance without save
- **Con**: Breaks keyboard muscle memory (Enter = advance in every other scene)
- **Con**: Must document exception to universal shortcut
- **Con**: Right Arrow and N key still advance without save — blocking Enter alone is inconsistent

### Option B: Redirect Enter to trigger Done button submit
- **Pro**: Preserves Enter as "action key" — submits form, then advances
- **Pro**: Prevents silent data loss
- **Pro**: Matches form-context expectations (Enter = submit in forms)
- **Con**: Enter becomes "submit" only in this scene — semantic inconsistency
- **Con**: Requires new mechanism: keyboard handler must call store action directly or dispatch a new trigger
- **Con**: If entries are partially filled, submitting may be premature (null → 0 for unentered teams)

### Option C: Leave as-is (advance without save)
- **Pro**: Zero code change, consistent with all other scenes
- **Pro**: Allows rapid skip-through (valid bar-trivia workflow: quick-score only, skip panel entirely)
- **Con**: Silent data loss if presenter accidentally hits Enter with partial panel entries
- **Con**: No validation feedback

## Recommendation: Option A (Block Enter)

**Rationale — revised from initial Option B recommendation:**

Option B sounds appealing but has a critical flaw: submitting partial entries converts all null values to 0, potentially zeroing teams the presenter intended to leave at their quick-score values. This is exactly the destructive-overwrite problem the pre-fill feature (R1) aims to solve. With pre-fill in place, Option B becomes safer — but it still changes Enter's semantics in a way that's unique to this scene.

Option A is simpler and more defensive:
- Block Enter at the global level during `round_scoring` (one conditional)
- Focus-on-input Enter still works (panel's onKeyDown fires before global handler due to early return for HTMLInputElement)
- The presenter uses Done button to submit, Right Arrow to advance without save, or ArrowLeft to go back
- This preserves the bar-trivia model: quick-score is primary, panel is optional, advancing without save is deliberate (via Right Arrow)

The key insight: **Right Arrow already exists as the explicit "advance" action**. Enter's role as a universal skip is genuinely confusing in a data-entry context. Blocking it for this one scene is a smaller semantic change than redirecting it to submit.

## Implementation

```ts
// use-game-keyboard.ts line 272
case 'Enter':
  if (currentScene !== 'round_scoring') {
    store.advanceScene(SCENE_TRIGGERS.SKIP);
  }
  break;
```

Update CLAUDE.md keyboard shortcuts: "Enter | Skip timed scene | All scenes except `round_scoring`"

## Confidence
**Medium-High.** The behavior change is small and contained. The risk is that some presenters use Enter to advance from `round_scoring` and will notice the change. Mitigated by Right Arrow still working as the explicit advance action.
