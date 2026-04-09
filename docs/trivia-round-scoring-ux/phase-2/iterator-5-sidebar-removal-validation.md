# Phase 2 — Iterator 5: Sidebar Removal Validation

## Findings

The investigation covered all 7 requested areas. Here are the results.

### 1. CSS/Layout Classes — No Grid Breakage

The 3-column structure at `apps/trivia/src/app/play/page.tsx:360-560` uses flexbox, not CSS grid. The columns are siblings inside `<div className="flex flex-1 overflow-hidden">`. The center `<main className="flex-1">` will simply expand to fill all remaining horizontal space when the right `<aside>` is removed — that is exactly how `flex-1` is designed to work. No class on the wrapper references the sidebar. The `h-screen overflow-hidden` lock on the outer `<div id="main">` is on the root container and is entirely unaffected.

There are no responsive breakpoints on the sidebar element itself. `w-80 flex-shrink-0` is unconditional across all viewport widths. The sidebar does not collapse or reflow at any breakpoint.

### 2. Skip Link — One Hard Accessibility Break

`apps/trivia/src/app/play/page.tsx:239-244` contains:

```tsx
<a href="#game-controls" …>Skip to game controls</a>
```

The sidebar `<aside id="game-controls">` at `page.tsx:484` is its target. If the sidebar is removed, this skip link becomes a dead anchor — keyboard users will Tab to it and activate it with no observable effect (no scroll, no focus change). This is a concrete accessibility regression.

**Required fix:** Remove the skip link at `page.tsx:239-244` in the same commit that removes the sidebar. No other element in the codebase references `id="game-controls"` via aria attributes.

### 3. E2E Selectors — Zero DOM-Identity Coupling

All E2E selectors in `e2e/trivia/presenter.spec.ts` use semantic, role-based locators (headings, button labels, ARIA regions). None target `#game-controls`, the `aside` element tag, or any CSS class. The scoring-section tests scope to `page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) })` — this finds content by its heading, not by its container. If `TeamScoreInput` moves to the center panel, this locator will find it there without modification.

One E2E test at `presenter.spec.ts:461-464` expects a "settings button" (`page.getByRole('button', { name: /settings/i })`). No settings button exists in the current layout. This test is a pre-existing issue unrelated to sidebar removal.

### 4. Mount/Unmount Side Effects

`RoundScoringPanel` has two `useEffect` hooks that produce side effects:

- A `window.addEventListener('keydown', ...)` handler for its own Ctrl+Z undo stack, with proper `removeEventListener` cleanup on unmount (`RoundScoringPanel.tsx:112-126`).
- A progress-sync effect that calls `onProgressChange(filled)` on every `entries` change, which flows to `store.updateRoundScoringProgress()` and ultimately syncs partial scores to the audience display (`RoundScoringPanel.tsx:54-63`).

Both effects are bound to the component's lifecycle, not to its DOM location. If `RoundScoringPanel` is relocated to the center panel (same render condition `isRoundScoringScene`), both effects register and clean up identically. The audience sync side effect travels with the component and requires no wiring changes — the `onProgressChange` prop is passed from `handleRoundScoringProgress` at `page.tsx:193-195` regardless of where the JSX sits.

`QuickScoreGrid` has no `useEffect` hooks at all. `TeamManager`, `TeamScoreInput`, and `TeamScoreboard` also have no mount/unmount side effects.

### 5. Undo Stack Architecture — Two Independent Stacks, Scene-Based Exclusion

There are definitively two independent undo stacks, and they are coordinated by scene, not by component location:

**Stack A (`useQuickScore.historyRef`):** Instantiated at `use-game-keyboard.ts:100`. Ctrl+Z is wired at `use-game-keyboard.ts:288-296`. Active during all `SCORING_PHASE_SCENES` **except `round_scoring`**, enforced by this guard:

```ts
// use-game-keyboard.ts:291
if (SCORING_PHASE_SCENES.has(currentScene) && currentScene !== 'round_scoring') {
  event.preventDefault();
  quickScore.undo();
}
```

**Stack B (`RoundScoringPanel.undoStack`):** React state local to the component. Has its own `window` Ctrl+Z listener that fires whenever the component is mounted. Since `RoundScoringPanel` is only mounted when `audienceScene === 'round_scoring'`, and Stack A explicitly skips `round_scoring`, the two listeners never activate simultaneously.

**Removal implication:** If `RoundScoringPanel` moves to center panel under the same `isRoundScoringScene` condition, both stacks continue to operate identically. The exclusion in `use-game-keyboard.ts:291` is scene-based — it does not care about the panel's DOM location.

### 6. Viewport Scroll Behavior — Unaffected

The `h-screen overflow-hidden` that locks the viewport is on `<div id="main">` at `page.tsx:255`, which is the root container. The sidebar's `overflow-y-auto` is an independent per-column scroll region. Removing it does not change the outer scroll behavior in any way.

### 7. Responsive/Mobile — No Breakpoints on Sidebar

No `sm:`, `md:`, or `lg:` classes are applied to the sidebar `<aside>` element or its wrapper. The presenter view has no planned mobile/tablet adaptation for the sidebar. Removing it reduces the minimum useful viewport width by 320px — a net improvement.

### Additional Finding: `next-action-hints.ts` Copy

`apps/trivia/src/lib/presenter/next-action-hints.ts:30` contains:

```ts
round_scoring: 'Enter scores in sidebar. Right Arrow to advance…',
```

This is user-visible copy rendered by `NextActionHint` in the center panel. When `RoundScoringPanel` moves to the center panel, "in sidebar" becomes incorrect. This string must be updated. If `nav-button-labels.test.ts` or any other test asserts the exact text for `round_scoring`, it will also require updating.

---

## Summary Table

| Item | Severity | Action Required |
|------|----------|-----------------|
| Skip link `href="#game-controls"` becomes a dead anchor | Hard break (a11y) | Remove `page.tsx:239-244` in same commit |
| `next-action-hints.ts:30` says "in sidebar" | Copy regression | Update to "above" when panel moves to center |
| `RoundScoringPanel` Ctrl+Z handler | None — handler is component-scoped | No action |
| `RoundScoringPanel` progress-sync effect | None — travels with component | No action |
| E2E test selectors | None — all role-based | No action |
| Layout flex collapse | None — `flex-1` expands correctly | No action |
| Viewport scroll lock | None — anchored at root wrapper | No action |
| `QuickScoreGrid` relocation | None — no effects, pure render | No action |
| Responsive breakpoints | None — no sidebar breakpoints exist | No action |
| Two undo stacks coordination | None — exclusion is scene-based, not location-based | No action |
| "View Final Results" button | Feature loss (Phase 1 confirmed) | Needs new location in header or center |
| TeamManager rename during live game | Feature loss (Phase 1 confirmed) | Needs modal or click-to-edit affordance |

Now let me write this to the file. I'll construct the markdown and save it:

The file content is ready. Let me produce it as a proper write operation by reading what I can from the existing phase-2 structure (which doesn't exist yet) and then presenting the document. Since I can only read files, I'll present the complete document text below and note that it must be saved to the specified path.

Here is the complete file content that must be written to `/Users/j/repos/beak-gaming-platform/docs/trivia-round-scoring-ux/phase-2/iterator-5-sidebar-removal-validation.md`:

---

```markdown
# Iterator 5: Sidebar Removal Validation — Hidden Dependencies & Edge Cases

**Phase:** 2
**Iterator:** 5 of 5
**Date:** 2026-03-10

---

## Investigation Scope

Seven areas examined to determine what would break or require attention if the right sidebar (`<aside id="game-controls" className="w-80 flex-shrink-0 …">` at `apps/trivia/src/app/play/page.tsx:483-559`) is removed during gameplay.

---

## 1. CSS / Layout Classes

**File:** `apps/trivia/src/app/play/page.tsx:246-560`

The 3-column layout uses flexbox, not CSS grid:

```
<div id="main" className="h-screen flex flex-col overflow-hidden">
  <header …> (flex-shrink-0, 56px)
  <div className="flex flex-1 overflow-hidden">  ← row container
    <aside className="w-64 flex-shrink-0 …">    ← left rail
    <main className="flex-1 overflow-y-auto …"> ← center
    <aside id="game-controls" className="w-80 flex-shrink-0 …"> ← right
  </div>
</div>
```

Removing the right `<aside>` leaves `<main className="flex-1">` to expand into all remaining horizontal space — the intended flex-1 behavior. No class on the row wrapper references the sidebar by count or position. No CSS grid column template exists that would leave a gap.

There are no responsive breakpoints (`sm:`, `md:`, `lg:`) on the sidebar element itself. `w-80 flex-shrink-0` is unconditional. The sidebar never collapses or reflows. Removing it reduces the minimum useful presenter viewport width by 320px — a net improvement on narrower screens.

**Finding: No layout breakage. Clean 2-column degradation.**

---

## 2. Accessibility: Skip Link and `id="game-controls"`

**File:** `apps/trivia/src/app/play/page.tsx:232-244, 483-487`

A skip link at `page.tsx:239-244` targets the sidebar:

```tsx
<a
  href="#game-controls"
  className="sr-only skip-link focus:not-sr-only …"
>
  Skip to game controls
</a>
```

The sidebar carries `id="game-controls"` at `page.tsx:484`. If the element is removed, this skip link becomes a dead anchor. Keyboard users pressing Tab at page top will activate a link that scrolls nowhere and focuses nothing — a concrete WCAG 2.1 failure (broken skip link).

No other element in the codebase has an `aria-labelledby`, `aria-controls`, or `aria-describedby` pointing to `id="game-controls"`. The sidebar's own `aria-label="Game controls and team management"` disappears with the element.

**Finding: HARD BREAK (accessibility). Remove the skip link at `page.tsx:239-244` in the same commit that removes the sidebar.**

---

## 3. E2E Tests: Selector Coupling

**Files:** `e2e/trivia/presenter.spec.ts` (full file), `e2e/trivia/display.spec.ts`, `e2e/trivia/dual-screen.spec.ts`

All trivia E2E test selectors use semantic, role-based or text-based locators. None use:
- `#game-controls` (sidebar id)
- `[aria-label="Game controls and team management"]` (sidebar aria-label)
- CSS class selectors (`.w-80`, `.sidebar`)
- The `aside` element tag
- XPath positional selectors

The scoring section tests scope to content by heading: `page.locator('section, div').filter({ has: page.getByRole('heading', { name: /team scores/i }) })`. This locates the `TeamScoreInput` component's container by its heading text. If `TeamScoreInput` moves to the center panel, this locator finds it there without change.

One pre-existing test at `presenter.spec.ts:461-464` expects `page.getByRole('button', { name: /settings/i })`. No settings button exists anywhere in the current layout. This is a pre-existing broken test, unrelated to sidebar removal.

**Finding: Zero E2E selector coupling to sidebar DOM identity. Relocation of components requires no selector updates.**

---

## 4. Mount/Unmount Side Effects

**Files:** `apps/trivia/src/components/presenter/RoundScoringPanel.tsx:54-63, 112-126`; `QuickScoreGrid.tsx`, `TeamManager.tsx`, `TeamScoreInput.tsx` (no effects)

`RoundScoringPanel` has two `useEffect` hooks with side effects:

**Effect A — global Ctrl+Z handler (`RoundScoringPanel.tsx:112-126`):**
```ts
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => { … };
  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [handleUndo]);
```
Registers and cleans up on the component lifecycle. DOM location is irrelevant to `window` events. Travels cleanly to center panel with zero behavioral change.

**Effect B — progress sync to audience display (`RoundScoringPanel.tsx:54-63`):**
```ts
useEffect(() => {
  if (!onProgressChange) return;
  const filled: Record<string, number> = {};
  for (const [teamId, value] of Object.entries(entries)) {
    if (value !== null) { filled[teamId] = value; }
  }
  onProgressChange(filled);
}, [entries, onProgressChange]);
```
Calls `handleRoundScoringProgress` → `store.updateRoundScoringProgress(entries)` → syncs partial scores to the audience display via BroadcastChannel. The `onProgressChange` prop is passed from `page.tsx:193-195` regardless of where in the JSX the component renders. This side effect is component-scoped, not sidebar-scoped.

**Finding: No side effects are lost or broken by relocation. Both effects travel with the component.**

---

## 5. Undo Stack Architecture

**Files:** `apps/trivia/src/hooks/use-quick-score.ts:50-124`, `apps/trivia/src/hooks/use-game-keyboard.ts:100, 288-296`, `apps/trivia/src/components/presenter/RoundScoringPanel.tsx:46, 82-92, 112-126`

Two undo stacks coexist, coordinated by scene rather than by component location:

**Stack A — `useQuickScore.historyRef` (per-question toggle undo):**
- Instantiated at `use-game-keyboard.ts:100`
- Ctrl+Z wired at `use-game-keyboard.ts:288-296`
- Active during all `SCORING_PHASE_SCENES` **except** `round_scoring`:
  ```ts
  // use-game-keyboard.ts:291
  if (SCORING_PHASE_SCENES.has(currentScene) && currentScene !== 'round_scoring') {
    event.preventDefault();
    quickScore.undo();
  }
  ```

**Stack B — `RoundScoringPanel.undoStack` (number-input entry undo):**
- React state local to `RoundScoringPanel`
- Own `window` Ctrl+Z handler (registered only while component is mounted)
- `RoundScoringPanel` is only mounted when `audienceScene === 'round_scoring'`
- Stack A explicitly skips `round_scoring` via the guard above

The two handlers never activate simultaneously. The exclusion is scene-based — it does not depend on where `RoundScoringPanel` renders in the DOM tree.

**Finding: The two undo stacks are independent and scene-coordinated, not location-coordinated. Relocating `RoundScoringPanel` to the center panel requires no changes to the undo coordination.**

---

## 6. Viewport Scroll Behavior

**File:** `apps/trivia/src/app/play/page.tsx:254-256`

```tsx
<div id="main" className="h-screen flex flex-col overflow-hidden">
```

The `h-screen overflow-hidden` viewport lock is on the root wrapper — not on any column. Each column has its own independent internal scroll region (`overflow-y-auto`). The sidebar's `overflow-y-auto` is one such region. Removing it removes one scrollable region; the outer lock is entirely unaffected.

**Finding: No change to viewport scroll behavior.**

---

## 7. Responsive / Mobile Considerations

No `sm:`, `md:`, or `lg:` breakpoints are applied to the sidebar `<aside>` or its immediate wrapper. The sidebar does not adapt at any viewport width. It was designed exclusively for desktop use.

The center panel's keyboard shortcuts reference block is already `hidden md:block` (`page.tsx:419`) — it hides on small screens. This is unrelated to sidebar removal but confirms the presenter view has limited mobile design investment.

**Finding: No mobile layout implications. Removing the sidebar improves viewport utilization at all screen sizes.**

---

## Additional Finding: Stale Copy in `next-action-hints.ts`

**File:** `apps/trivia/src/lib/presenter/next-action-hints.ts:30`

```ts
round_scoring: 'Enter scores in sidebar. Right Arrow to advance, Left Arrow to go back. Enter is blocked.',
```

This string is rendered in the center panel via `NextActionHint`. When `RoundScoringPanel` moves to the center panel, "in sidebar" becomes factually incorrect.

**Required:** Update the string when the form relocates. If `nav-button-labels.test.ts` asserts this exact string, it will also need updating. (Phase 1 confirmed this test exists but does not currently test the `round_scoring` forward label — verify before assuming no test impact.)

---

## Summary Table

| Item | Severity | Action Required |
|------|----------|-----------------|
| Skip link `href="#game-controls"` → dead anchor | **Hard break (a11y)** | Remove `page.tsx:239-244` in same commit as sidebar removal |
| `next-action-hints.ts:30` says "in sidebar" | **Copy regression** | Update hint text when panel relocates |
| `RoundScoringPanel` Ctrl+Z handler | None | Travels with component |
| `RoundScoringPanel` progress-sync effect | None | Travels with component |
| E2E selectors | None | All role-based, zero DOM-identity coupling |
| Flex layout collapse | None | `flex-1` center expands correctly |
| Viewport scroll lock | None | Anchored at root wrapper |
| `QuickScoreGrid` relocation | None | No effects, pure render |
| Responsive breakpoints | None | No sidebar breakpoints exist |
| Two undo stacks | None | Coordination is scene-based, not location-based |
| "View Final Results" button | Feature loss (Phase 1) | Needs new trigger in header or center panel |
| TeamManager rename during live game | Feature loss (Phase 1) | Needs modal or click-to-edit affordance |

---

## Confidence Assessment

All findings are derived from static code reading with direct file:line citations. No empirical testing was required. The two hard items (skip link, hint text) are definitive. The two feature-loss items were already established in Phase 1 and are confirmed here. The undo stack finding resolves the Phase 1 uncertainty ("may be same or independent") with a definitive answer: they are independent, coordinated by scene guard at `use-game-keyboard.ts:291`.
```

---

## Key Files Referenced

- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/play/page.tsx` — layout structure, skip links, sidebar element, component wiring (lines 239-244, 360-364, 483-559)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/use-game-keyboard.ts` — Stack A undo, `round_scoring` exclusion guard (lines 100, 288-296)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/hooks/use-quick-score.ts` — Stack A implementation, `historyRef` (lines 50-124)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/RoundScoringPanel.tsx` — Stack B undo, progress-sync effect, global Ctrl+Z handler (lines 46, 54-63, 82-92, 112-126)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/QuickScoreGrid.tsx` — confirmed no `useEffect` hooks
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/TeamManager.tsx` — confirmed no `useEffect` hooks; rename has no status guard (lines 87-96)
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/next-action-hints.ts` — stale "in sidebar" copy (line 30)
- `/Users/j/repos/beak-gaming-platform/e2e/trivia/presenter.spec.ts` — all role-based selectors, no sidebar-identity coupling