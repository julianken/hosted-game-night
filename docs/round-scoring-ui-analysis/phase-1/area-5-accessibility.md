# Investigation: Accessibility & Input Ergonomics

## Summary

The RoundScoringPanel has solid foundational accessibility: 44x44px touch targets, ARIA labels on inputs, a `role="group"` wrapper, and an `aria-live="polite"` progress counter. The global keyboard handler (`use-game-keyboard.ts:125-130`) returns early when focus is on an `HTMLInputElement`, which mitigates most keyboard conflicts — Enter, ArrowUp/ArrowDown, and digit keys all behave correctly inside the number inputs. However, when focus leaves the inputs (e.g., Tab to the Done button, or click on panel background), the global handler re-engages: Enter fires a SKIP trigger that advances the scene, and digit keys route to quick-score. There is also a double Ctrl+Z handler issue — both RoundScoringPanel and the global keyboard hook register `keydown` listeners for Ctrl+Z, creating potential double-undo behavior. Screen reader support is partial: inputs have labels but there are no dynamic announcements for "all scores entered" state changes.

## Key Findings

### Finding 1: Global keyboard handler returns early for HTMLInputElement — mitigates most conflicts

- **Evidence:** `use-game-keyboard.ts:125-130` — early return when `event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement`. This runs before ANY key handling in the global handler.
- **Confidence:** High
- **Implication:** While focus is on a score input: Enter navigates between inputs (handled by RoundScoringPanel's `onKeyDown`), ArrowUp/ArrowDown increment/decrement the number spinbutton (browser default), and digit keys type numbers. The global handler does NOT interfere. This is correct behavior. The conflicts only emerge when focus is NOT on an input.

### Finding 2: Enter key advances scene when focus is outside inputs (e.g., Done button)

- **Evidence:** `use-game-keyboard.ts:272-274` — Enter dispatches `SCENE_TRIGGERS.SKIP` unconditionally. `scene.ts:270-277` — `round_scoring + skip → recap_scores`. If the presenter Tabs past the last input to the Done button and presses Enter, the button click fires `handleSubmit()` BUT the global handler also fires `advanceScene(SKIP)` since the button is not an `HTMLInputElement`.
- **Confidence:** Medium — depends on whether button click and keydown both fire, and in what order.
- **Implication:** Potential double-advance: `handleSubmit()` calls `onSubmitScores()` → `setRoundScores()` + `advanceScene(ADVANCE)`, then the global handler calls `advanceScene(SKIP)`. If the first advance already changed the scene, the second may be a no-op (same trigger on a new scene) or could advance further. This is a race condition.

### Finding 3: Ctrl+Z has double handler — component and global hook both listen

- **Evidence:**
  - `RoundScoringPanel.tsx:111-125` — registers `window.addEventListener('keydown')` for Ctrl+Z, calls `undoLastChange()` to revert the panel's last entry.
  - `use-game-keyboard.ts:282-289` — global handler checks `SCORING_PHASE_SCENES.has(currentScene)` and calls `quickScore.undo()` for Ctrl+Z.
  - `round_scoring` is in `SCORING_PHASE_SCENES` (`use-game-keyboard.ts:70`).
- **Confidence:** High
- **Implication:** When Ctrl+Z is pressed during `round_scoring` with focus NOT on an input, both handlers fire: the panel's undo reverts the last spinbutton entry, and the global undo reverts the last quick-score action. These are two independent undo stacks operating on different data. When focus IS on an input, the global handler returns early, so only the panel's undo fires — which is correct. The issue is the non-input-focused case.

### Finding 4: Touch targets meet 44x44px requirement

- **Evidence:** `RoundScoringPanel.tsx:235-236` — score inputs have `minHeight: '44px', minWidth: '44px'`. Done button has `min-h-[44px]` class. +/- buttons have `min-w-[44px] min-h-[44px]`.
- **Confidence:** High
- **Implication:** Touch target requirements are met for all interactive elements in the scoring panel.

### Finding 5: Input width constrained but adequate at w-16 (64px)

- **Evidence:** `RoundScoringPanel.tsx:233` — input class includes `w-16` (Tailwind = 4rem = 64px). The sidebar is `w-80` (320px). Each row has: team name + "Total: N" label + input + increment/decrement buttons. With team names up to ~15 characters, the layout fits without wrapping.
- **Confidence:** High
- **Implication:** For typical team names (5-12 chars), the 320px sidebar provides adequate space. Very long team names may truncate or cause wrapping, but this is acceptable.

### Finding 6: Tab navigation relies on browser default — works but unmanaged

- **Evidence:** `RoundScoringPanel.tsx:219-230` — `onKeyDown` handles only Enter key. Tab is not intercepted. `inputRefs` object (line 46) stores refs for Enter-driven focus management but is not used for Tab. Teams are sorted by descending score (line 65), and inputs render in that order.
- **Confidence:** High
- **Implication:** Tab navigation follows DOM order, which matches the visual sort order (descending score). Shift+Tab goes backwards. This works correctly without explicit management. No focus trap exists — Tab can escape the scoring panel to other page elements (TeamManager, nav buttons), which is appropriate since the panel is not a modal.

### Finding 7: Screen reader support is partial

- **Evidence:**
  - `RoundScoringPanel.tsx:143` — Progress counter has `aria-live="polite"` and `aria-label` (e.g., "2 of 5 scores entered").
  - Line 159: Team list wrapper has `role="group" aria-label="Team round scores"`.
  - Line 240: Each input has `aria-label={`Score for ${team.name}`}`.
  - No `aria-describedby` linking inputs to the instruction text ("Enter the total score for each team this round").
  - No dynamic announcement for "all scores entered — press Enter to submit" state change.
- **Confidence:** High
- **Implication:** Basic screen reader support is present (inputs are labeled, progress is announced). Missing: instruction linkage via `aria-describedby`, completion state announcement, and guidance on Enter-to-advance behavior between inputs.

### Finding 8: ArrowUp/ArrowDown work correctly in inputs but NOT outside inputs

- **Evidence:** Inside inputs: global handler returns early (Finding 1), browser default spinbutton increment/decrement works. Outside inputs: `use-game-keyboard.ts:158-170` — ArrowUp/ArrowDown call `store.selectQuestion()` with `preventDefault()`, navigating the question list instead.
- **Confidence:** High
- **Implication:** If a presenter clicks on the panel background (not on an input) and presses ArrowDown, the question list navigates instead of scrolling the scoring panel. This is a minor usability issue — the question list navigation is not useful during `round_scoring` but the global handler doesn't know that.

## Surprises

- The `RoundScoringPanel` registers its own `window.addEventListener('keydown')` for Ctrl+Z instead of using the global keyboard hook — creating a parallel handler that both duplicates and conflicts with the global Ctrl+Z in the `round_scoring` scene. This is the only presenter component that registers its own global keydown listener.
- The early return for `HTMLInputElement` in the global handler is a broad protection that works well — but it means keyboard shortcuts (including useful ones like `?` for help) are completely disabled while typing in a score input. This is correct behavior but worth noting.
- Number inputs (`type="number"`) are used without `inputmode="numeric"` — on mobile devices, `type="number"` shows a numeric keyboard but also allows `e`, `+`, `-`, `.` characters which are not useful for integer scores.

## Unknowns & Gaps

- Whether the Done button's Enter behavior (Finding 2) actually causes a double-advance in practice — this depends on event ordering between the button's click handler and the global keydown handler. Not tested.
- Whether `overflow-y-auto` on the sidebar correctly scrolls the RoundScoringPanel when there are 8+ teams, and whether off-screen inputs remain Tab-accessible.
- Whether `aria-live="polite"` on the progress counter actually triggers announcements on each score entry, or whether the attribute placement on a non-updating text node means updates are silent.
- Mobile touch experience — whether the 320px sidebar scoring UI works well on tablet-sized screens used as presenter devices.

## Raw Evidence

- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` (312 lines) — full component with input handlers, ARIA attrs, touch targets, Ctrl+Z handler
- `apps/trivia/src/hooks/use-game-keyboard.ts` (325 lines) — global keyboard handler with early return for inputs, Enter/Arrow/Digit/Ctrl+Z handling
- `apps/trivia/src/app/play/page.tsx` (603 lines) — layout structure, sidebar width (w-80), RoundScoringPanel rendering conditions
