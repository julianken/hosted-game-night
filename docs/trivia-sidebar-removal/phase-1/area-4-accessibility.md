# Investigation: Accessibility & Landmark Impact

## Summary

The presenter layout has 4 ARIA landmarks: banner (header), two complementary (left aside + right aside), and main. Removing the right aside leaves 3 landmarks — still valid and navigable. The skip link targets `#main` (the flex container, not the `<main>` element — a pre-existing bug). No explicit focus management targets the sidebar. Tab order flows naturally through sidebar elements; removing them reduces focusable elements but doesn't break tab order. No accessibility tests verify landmark structure.

## Key Findings

### Finding 1: Skip Link targets wrong element
- **Evidence:** Skip link href="#main" (line 235) targets `<div id="main">` (line 246, root flex container), not `<main id="main-content">` (line 379). Focus lands on generic container, not the main landmark.
- **Confidence:** High
- **Implication:** Pre-existing bug unrelated to sidebar removal. Should be fixed regardless.

### Finding 2: Landmark structure remains valid after removal
- **Evidence:** Current landmarks: banner, complementary (×2), main. After removal: banner, complementary (×1), main. HTML spec allows any number of complementary landmarks. Single remaining aside has `aria-label="Question navigator"`.
- **Confidence:** High
- **Implication:** Screen reader landmark navigation (e.g., NVDA 'd' key) still works. Users lose the "Game controls and team management" landmark but gain simpler navigation.

### Finding 3: No navigation landmark exists (pre-existing gap)
- **Evidence:** No `<nav>` or `role="navigation"` in page.tsx. Header buttons (Open Display, Fullscreen, New Game, Help) are not wrapped in nav.
- **Confidence:** High
- **Implication:** Pre-existing gap. Removing sidebar doesn't worsen it.

### Finding 4: Focus management never targets the sidebar
- **Evidence:** Only explicit focus management: `mainRef.current.focus()` when status becomes 'playing' (page.tsx:219-226). mainRef points to `<main>` element. No code focuses the sidebar or elements within it.
- **Confidence:** High
- **Implication:** Removing sidebar won't break focus restoration patterns.

### Finding 5: Tab order — sidebar elements participate in natural flow
- **Evidence:** use-game-keyboard.ts handles only game-specific keys (Arrow, Space, P, E, R, N, M, T, S, Enter, F, Z, ?). Tab is native browser behavior. Sidebar buttons/inputs are in natural DOM order (left → center → right).
- **Confidence:** High
- **Implication:** Removing sidebar reduces focusable elements. Tab flows from center content directly to... nothing after main. No trap or lock exists.

### Finding 6: Rich ARIA structure inside sidebar components
- **Evidence:** TeamManager: `role="region" aria-label="Team management"`, `role="list"`, per-item `role="listitem" aria-label="Team: {name}"`. TeamScoreInput: `role="region" aria-label="Team score management"`, `role="group" aria-label="Score controls for {name}"`. QuickScoreGrid: `role="group" aria-label="Quick score team buttons"`, `aria-pressed` per button, `aria-live="polite"` on count.
- **Confidence:** High
- **Implication:** Removing sidebar removes well-structured accessible components. If functionality moves elsewhere, the ARIA patterns should be preserved.

### Finding 7: No accessibility tests verify landmark structure
- **Evidence:** accessibility.test.tsx runs axe-core on individual components but not on full page layout or landmark structure. No tests for landmark presence, skip link targets, or focus restoration.
- **Confidence:** Medium
- **Implication:** Removing sidebar won't trigger test failures. Manual/E2E testing needed to verify.

## Surprises
- Skip link points to wrong element (#main div vs #main-content main) — pre-existing bug
- No `<nav>` landmark in the entire presenter layout
- Sidebar has thorough ARIA (regions, lists, groups, live regions, pressed states) — better than most of the app

## Unknowns & Gaps
- SetupGate overlay focus management when sidebar is removed
- Screen reader announcement order impact
- Focus return after modal dismiss if focus was in sidebar
- Bingo app sidebar structure consistency

## Raw Evidence
Landmark catalog (current): banner, complementary (Question navigator), main (Current question), complementary (Game controls and team management)
After removal: banner, complementary (Question navigator), main (Current question)
