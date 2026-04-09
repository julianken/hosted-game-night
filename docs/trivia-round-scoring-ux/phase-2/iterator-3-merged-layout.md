# Phase 2 — Iterator 3: Merged Center Panel Layout for round_scoring

## Summary

During `round_scoring`, removing the right sidebar expands the center panel from ~800-1100px to ~1100-1420px. The recommended layout is **side-by-side with a fixed-width left column (scoring form, ~400px) and a flex-1 right column (reference material)**. SceneNavButtons and NextActionHint should be **hidden** during `round_scoring` — the Done button inside RoundScoringPanel is the sole advancement path. The keyboard shortcuts reference panel and ThemeSelector below the center card should remain visible (they serve `round_scoring` users too) but they are below the fold in a scrolling center column, so they are not disruptive.

---

## 1. Component Inventory at round_scoring Entry

### Center panel (flex-1)

| Element | File | Lines | Current behavior |
|---------|------|-------|-----------------|
| Center card wrapper | `page.tsx` | 393–410 | `bg-surface border border-border rounded-xl p-4 shadow-md mb-3` — contains either QuestionDisplay or RoundScoringView |
| RoundScoringView | `RoundScoringView.tsx` | 16–152 | Two sections: "Standings" (flex-wrap team pills) + "Questions & Answers" (scrollable list). Both read from store. Zero props. |
| SceneNavButtons div | `page.tsx` | 413–416 | Always renders. For `round_scoring`: forward = "Review Answers" (enabled), back = "Round Summary" (enabled). |
| NextActionHint | `page.tsx` | 414–415 | For `round_scoring`: text = `"Enter scores in sidebar. Right Arrow to advance, Left Arrow to go back. Enter is blocked."` — references "sidebar" (will be stale if sidebar is removed) |
| Keyboard shortcuts reference panel | `page.tsx` | 419–450 | Always visible on `md:` breakpoints. Content is static. |
| ThemeSelector panel | `page.tsx` | 452–460 | Always visible. Lets presenter change themes. |
| RoundSummary overlay | `page.tsx` | 463–479 | Only shown when `showRoundSummary === true`. Won't be true during `round_scoring` under normal flow. |

### Right sidebar (w-80, 320px)

During `round_scoring`, the sidebar renders:
- TeamManager (always) — only rename is functional (`page.tsx:490–498`)
- RoundScoringPanel (conditional on `isRoundScoringScene`) — `page.tsx:511–519`
- QuickScoreGrid: suppressed (`!isRoundScoringScene` guard at `page.tsx:501`)
- TeamScoreInput: suppressed (`!isRoundScoringScene` guard at `page.tsx:523`)
- "Game Over" block: suppressed (status is `between_rounds`, not `ended`)

### RoundScoringPanel sections (right sidebar today)

| Section | Approx height | Notes |
|---------|---------------|-------|
| Header ("Round N Scoring" + "X/N entered") | ~40px | Duplicates RoundScoringView header |
| Instruction text | ~24px | "Enter the total score for each team this round:" |
| Team entries (per team: ~52px min-height + gap-2) | N × 54px | For 4 teams: ~228px; for 10 teams: ~580px; for 20 teams: ~1140px |
| Action row (Undo / Clear / Done) | ~44px | Conditional on undo stack / entries |

### RoundScoringView sections (center panel today)

| Section | Approx height | Notes |
|---------|---------------|-------|
| Header ("Round N Scoring" + "Round N of M") | ~44px | Duplicate of panel header |
| Standings pills (flex-wrap) | ~40–80px | Scales with team count |
| Q&A list | scrollable, `max-h-[calc(100vh-400px)]` | Hardcoded scroll constraint |

---

## 2. Space Analysis: Sidebar Removed → Center Expansion

### Current widths (1920px viewport)

```
Left rail (QuestionList):  w-64   = 256px
Center panel:              flex-1 ≈ 1024px (1920 - 256 - 320 = 1344px less borders/padding → ~1040px usable)
Right sidebar:             w-80   = 320px
```

### After sidebar removal (1920px viewport)

```
Left rail:   256px (unchanged)
Center:      flex-1 ≈ 1344px usable before padding (~1300px after p-4 padding both sides)
```

Gain: ~300px horizontal (23% more usable center width).

At 1440px viewport (laptop):
```
Current center: ~768px
After removal:  ~1072px
Gain: ~300px
```

At 1280px viewport (small laptop):
```
Current center: ~608px
After removal:  ~912px
Gain: ~304px
```

The gain is nearly constant (~300px) across viewport sizes because it equals the removed w-80 sidebar.

---

## 3. Layout Options Analysis

### Option A: Side-by-side (scoring form left, Q&A reference right)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Round 4 Scoring                              Round 4 of 6          │
├──────────────────────────────┬──────────────────────────────────────┤
│  SCORING FORM (~400px fixed) │  Q&A REFERENCE (flex-1)             │
│                              │                                      │
│  Team A  ████  [ 8 ]        │  1. What is the capital…            │
│  Team B  ████  [ 5 ]        │     Answer: Paris                   │
│  Team C  ████  [ 3 ]        │                                      │
│  Team D  ████  [   ]        │  2. Which planet…                   │
│                              │     Answer: Mars                    │
│  ⟵Undo   Clear   Done →   │                                      │
│                              │  3. Who wrote…                      │
│  Standings: A(32) B(28)…   │     Answer: Tolstoy                 │
└──────────────────────────────┴──────────────────────────────────────┘
```

**Assessment:**
- Primary task (entering scores) is in the left column — natural reading order, left-first for Western locales
- Reference material (Q&A answers) in right column — exactly what you need to verify answers while entering scores
- Standings can be a compact row above or inside the scoring form section (removing the need to scroll the reference panel to see rankings)
- Q&A column can scroll independently with a flexible max-height using the available viewport height minus the card chrome — replacing the current hardcoded `max-h-[calc(100vh-400px)]`
- Team count scaling: 4 teams = ~270px left column height; 10 teams = ~620px; 20 teams = ~1200px. At 20 teams, the scoring column overflows and gains its own scroll — manageable since both columns can independently scroll
- Tab order: the scoring inputs traverse top-to-bottom within the left column naturally; the Q&A reference column has no interactive elements, so focus order is unaffected
- **Recommended for: 4–12 teams (the common case)**

**Weaknesses:**
- Left column width needs a floor. At 400px it comfortably holds team names (up to ~22 chars at 1rem with 12px dot + 3-col gap). At 320px (old sidebar width), long team names truncate. Since center is now ≥768px even on a 1280px laptop, 400px is viable.
- Single-panel Done button is obvious. No confusion with SceneNavButtons if SceneNavButtons are hidden (see section 5).

### Option B: Stacked (scoring form top, Q&A reference below)

```
┌────────────────────────────────────────────────────────────────────┐
│  Round 4 Scoring                              Round 4 of 6         │
│  ─────────────────────────────────────────────────────────────     │
│  Team A ████ [8]  Team B ████ [5]  Team C ████ [3]  Team D ████[] │
│                                            Done →                  │
├────────────────────────────────────────────────────────────────────┤
│  Questions & Answers (scrollable)                                  │
│  1. What is the capital…    Answer: Paris                         │
│  2. Which planet…           Answer: Mars                          │
└────────────────────────────────────────────────────────────────────┘
```

**Assessment:**
- Scoring form at top collapses to a compact grid row (horizontal team list)
- Q&A reference below gives full width for long questions
- With ≥1100px width, a horizontal team grid works for up to 6 teams. For 10–20 teams it would need 2-3 rows or overflow scroll
- Works well for small team counts (≤6). Degrades at large counts
- The "Done" button placement is less obvious in a horizontal grid row — it risks being missed
- Requires a significant rewrite of RoundScoringPanel layout logic (horizontal vs. vertical)
- **Not recommended** — horizontal grid degrades at scale and changes RoundScoringPanel's internal structure substantially

### Option C: Tabs (scoring vs. reference)

```
┌─────────────────────────────────────────────────────────────────┐
│  [Score Entry]  [Q&A Reference]                                  │
├─────────────────────────────────────────────────────────────────┤
│  (active tab content)                                            │
└─────────────────────────────────────────────────────────────────┘
```

**Assessment:**
- Hides reference material behind a click — presenter must switch tabs while reading Q&A and entering scores simultaneously
- Defeats the purpose of co-location: the value is having both visible at once
- **Not recommended** — tabs fragment the interaction that benefits from simultaneous visibility

### Recommendation: Option A (side-by-side)

Side-by-side is the correct layout. It:
1. Gives the primary task (score entry) prime position at left
2. Keeps reference material (Q&A) immediately visible without any click
3. Uses the recovered ~300px effectively — the extra space goes to the reference column
4. Preserves a standalone scroll region per column without either overflowing into the other
5. Works with the existing RoundScoringPanel internals — only its wrapper width changes

---

## 4. Consolidated Header Strategy

Both components currently render "Round N Scoring" headers:
- `RoundScoringView.tsx:57`: `<h2 className="text-xl font-bold">Round {roundNumber} Scoring</h2>` + `<span>Round N of M</span>`
- `RoundScoringPanel.tsx:138`: `<h3>Round {roundNumber} Scoring</h3>` + `<span>X/N entered</span>`

In the merged layout, a single unified header sits above both columns:

```
Round 4 Scoring                    4 of 6     |     3/4 entered
```

- One `<h2>` with the round title (left-aligned)
- "Round N of M" and "X/N entered" can share the right side of the header row or be on separate lines
- Both sub-components drop their own headers entirely — the wrapper owns the header
- The "X/N entered" counter from RoundScoringPanel should remain as an `aria-live="polite"` region (it already is at `RoundScoringPanel.tsx:145`)
- Standings can move from a separate section in RoundScoringView to a compact sub-row under the main header — a flex-wrap pill list takes ~40–80px and avoids consuming Q&A column space

---

## 5. SceneNavButtons and NextActionHint: Hide During round_scoring

### Current behavior

During `round_scoring`:
- `SceneNavButtons` forward = "Review Answers" (active, dispatches `SCENE_TRIGGERS.ADVANCE`)
- `SceneNavButtons` back = "Round Summary" (active, dispatches `SCENE_TRIGGERS.BACK`)
- `NextActionHint` = `"Enter scores in sidebar. Right Arrow to advance, Left Arrow to go back. Enter is blocked."`

### The dual-advancement problem

With the scoring form inside the center card:
- Done button (`RoundScoringPanel`) calls `setRoundScores(scores)` then `advanceScene('advance')`
- SceneNavButtons forward also calls `advanceScene(SCENE_TRIGGERS.ADVANCE)`
- Both advance to `recap_qa` — but only Done commits scores first

If both are visible, the presenter can click "Review Answers" in SceneNavButtons without entering any scores (the same bypass problem that the gating mechanism in Area 1 is meant to fix). The gating mechanism (Area 1: `roundScoringSubmitted` flag in `orchestrateSceneTransition`) addresses the keyboard bypass, but a visible "Review Answers" button with the label suggesting it's the right action would still invite clicking.

### Recommendation: Hide SceneNavButtons during round_scoring

Conditionally suppress `SceneNavButtons` when `audienceScene === 'round_scoring'`:

```tsx
// page.tsx, inside the SceneNavButtons div
<div className="mb-4 px-1 flex flex-col gap-1.5">
  {!isRoundScoringScene && <SceneNavButtons />}
  {!isRoundScoringScene && <NextActionHint />}
</div>
```

**Rationale:**
- The Done button inside RoundScoringPanel (now in center panel) is the only correct advancement path during `round_scoring`
- Back navigation ("Round Summary") is handled by Left Arrow key — its keyboard hint can appear in a compact text label inside the merged card itself (e.g., "← Arrow Left to go back to Round Summary")
- NextActionHint's text references "sidebar" — this text becomes stale/misleading after the form moves. Hiding the hint is cleaner than updating text, and in-card context replaces the need for a hint
- Keyboard bypass (ArrowRight / N) is handled by the gating mechanism from Area 1

**What the back path looks like without SceneNavButtons:**
The Left Arrow key remains active (gated in `use-game-keyboard.ts` — Enter is blocked but Left Arrow is not). A subtle in-card label "Use ← to return to Round Summary" gives discoverability without SceneNavButtons. This can be a single line of `text-sm text-muted-foreground` at the bottom of the merged card.

---

## 6. Below-Card Chrome (Keyboard Shortcuts, ThemeSelector)

### Current elements below center card

1. SceneNavButtons + NextActionHint div (`page.tsx:413–416`)
2. Keyboard shortcuts reference panel (`page.tsx:419–450`) — `hidden md:block`
3. ThemeSelector panel (`page.tsx:452–460`)
4. RoundSummary overlay (`page.tsx:463–479`) — not shown during `round_scoring`

### Assessment

The keyboard shortcuts panel and ThemeSelector are present in all non-setup scenes. They appear below the center card and are accessible by scrolling the center column (which is `overflow-y-auto`). During `round_scoring`, the center card will be taller (merged scoring + Q&A), pushing these panels further down.

**Recommendation: Keep both panels as-is (no change needed)**

- The keyboard shortcuts panel does not interfere with scoring — it's useful reference for the presenter even during `round_scoring`
- ThemeSelector is a low-frequency action; below-fold placement is fine
- Both panels are already below-fold in many practical configurations (center card is already tall)
- Hiding them would require scene-conditional logic with no meaningful UX benefit; they are not disruptive
- Vertical scroll in the center column already handles overflow cleanly

The only change: since SceneNavButtons + NextActionHint are hidden during `round_scoring`, the keyboard shortcuts panel moves up by ~80px (the height of the nav buttons div), which is benign.

---

## 7. Structural Sketch: Merged Card Implementation

Current `page.tsx:393–410`:

```tsx
<div className="bg-surface border border-border rounded-xl p-4 shadow-md mb-3">
  {isRoundScoringScene ? (
    <RoundScoringView />
  ) : (
    <QuestionDisplay ... />
  )}
</div>
```

Proposed replacement for the `isRoundScoringScene` branch:

```tsx
{isRoundScoringScene ? (
  <div className="flex flex-col gap-4">
    {/* Unified header */}
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: 'var(--font-display)' }}>
        Round {roundNumber} Scoring
      </h2>
      <div className="flex items-center gap-4">
        <span className="text-base text-muted-foreground">Round {roundNumber} of {totalRounds}</span>
        {/* enteredCount/teams.length counter lifted out of RoundScoringPanel */}
      </div>
    </div>

    {/* Compact standings row */}
    <RoundScoringStandings />  {/* or inlined flex-wrap pills */}

    {/* Side-by-side columns */}
    <div className="flex gap-4 min-h-0">
      {/* Left: scoring form (~400px fixed) */}
      <div className="w-[400px] flex-shrink-0">
        <RoundScoringPanel
          teams={game.teams}
          currentRound={game.currentRound}
          onSubmitScores={handleRoundScoresSubmitted}
          onProgressChange={handleRoundScoringProgress}
          hideHeader={true}  {/* new prop to suppress duplicate h3 */}
        />
      </div>

      {/* Right: Q&A reference (flex-1) */}
      <div className="flex-1 min-w-0 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <RoundScoringQAReference />  {/* extracted from RoundScoringView */}
      </div>
    </div>

    {/* Back navigation hint */}
    <p className="text-sm text-muted-foreground">
      Press ← Arrow Left to return to Round Summary
    </p>
  </div>
) : (
  <QuestionDisplay ... />
)}
```

Key implementation notes:
- `RoundScoringPanel` gets a `hideHeader` prop (bool, default false) — suppresses its internal `<h3>` and instruction text to avoid duplication. Alternatively, extract the header into a slot. The prop approach is lower impact.
- The Q&A section from `RoundScoringView` can be extracted into a `RoundScoringQAReference` component or kept inline — it has no props and minimal state, so either approach works
- `max-h` on the Q&A column: replace the current `calc(100vh-400px)` with something like `calc(100vh - 280px)` which accounts for: 56px header bar + 32px card padding + 44px unified header + 80px standings + some gap. This needs empirical tuning after implementation
- The `w-[400px]` left column: this handles up to ~20-char team names at `clamp(0.8rem, 1.3vw, 1rem)` without truncation. At 1280px viewport, the Q&A column gets `912 - 400 - 16 (gap) - 32 (card padding) = 464px` — adequate for question text
- For 20 teams, the left column's scoring list overflows its height and gains an independent scroll (add `overflow-y-auto max-h-[calc(100vh-280px)]` to the left column too)

---

## 8. Summary of Recommendations

| Item | Recommendation | Rationale |
|------|---------------|-----------|
| Layout pattern | Side-by-side (scoring left ~400px, Q&A right flex-1) | Optimal use of recovered space; primary task left, reference right; both visible simultaneously |
| Header | Single unified header above both columns in center card | Eliminates current duplicate "Round N Scoring" headers in both components |
| Standings | Compact pill row in header zone (above the two columns) | Low height cost (~40–80px); frees Q&A column from holding standings |
| SceneNavButtons | **Hide during round_scoring** | Done button is the sole correct path; SceneNavButtons "Review Answers" creates a bypass vector |
| NextActionHint | **Hide during round_scoring** | Text references "sidebar" (stale); replaced by in-card back navigation hint |
| Back nav affordance | In-card text label "Press ← Arrow Left to return to Round Summary" | Discoverability without SceneNavButtons clutter |
| Keyboard shortcuts panel | No change — keep below card | Useful reference; not disruptive; scroll handles overflow |
| ThemeSelector panel | No change — keep below card | Low-frequency; below-fold is fine |
| Q&A scroll height | Replace `calc(100vh-400px)` with `calc(100vh - 280px)` (tune empirically) | Current constant assumes sidebar chrome that changes in merged layout |
| RoundScoringPanel header | Add `hideHeader` prop (bool) to suppress internal h3 | Avoids duplicate header with minimal refactor |
| Team sort | Hoist sort to merged card wrapper; pass sorted teams to both columns | Eliminates independent duplicate sorts in both components |

---

## 9. Open Questions for Phase 3

1. **Exact scroll height constant**: `calc(100vh - 280px)` is estimated. Needs verification against actual rendered heights after implementation. The center card's `p-4` padding, the unified header height, and the standings row height all contribute.

2. **20-team left column overflow**: With 20 teams at ~54px per row, the left column needs ~1080px — it will always overflow vertically. A `max-h` + `overflow-y-auto` on the left column is needed. Does this feel natural to scroll independently from Q&A?

3. **`hideHeader` vs. component split**: Is a `hideHeader` prop clean enough, or should `RoundScoringPanel` be split into `RoundScoringFormBody` (inputs + actions) and `RoundScoringFormHeader` (title + progress counter) for better composability?

4. **Back nav hint accessibility**: The in-card text label "Press ← Arrow Left to return" should have `aria-live` or be part of a region. Does it need to be? It's static (doesn't change on entry).

5. **Entry transition**: When `round_scoring` is entered, the center card content switches from QuestionDisplay to the merged layout. A subtle fade transition (the existing card wrapper handles this via conditional rendering) would smooth the context switch.
```

Now let me write this to the filesystem. Since I don't have a write tool available directly in this session, I'll provide the complete document text that the user or an agent can write to disk. But let me check if there's a file write capability I should use.

Looking at the task instructions again — I'm asked to "Write findings to `/Users/j/repos/beak-gaming-platform/docs/trivia-round-scoring-ux/phase-2/iterator-3-merged-layout.md`". I don't have a direct file-write tool in this context. Let me check what tools are available and whether I need to use a shell command approach.

Looking at my available tools: Glob, Grep, Read, WebFetch, WebSearch — no write tool is available. I'll present the complete document content clearly so it can be written.

Here is the complete analysis document to be written to `/Users/j/repos/beak-gaming-platform/docs/trivia-round-scoring-ux/phase-2/iterator-3-merged-layout.md`:

---

# Phase 2 — Iterator 3: Merged Center Panel Layout for round_scoring

## Summary

During `round_scoring`, removing the right sidebar expands the center panel from roughly 1040px to roughly 1340px of usable width. The recommended layout is **side-by-side with a fixed-width left column (~400px, scoring form) and a flex-1 right column (Q&A reference)**. SceneNavButtons and NextActionHint should be **hidden** during `round_scoring` — the Done button inside RoundScoringPanel becomes the sole explicit advancement path. The keyboard shortcuts reference panel and ThemeSelector below the center card should remain unchanged; they are already below-fold during scoring and don't disrupt the task.

---

## 1. Component Inventory at round_scoring

### Center panel (flex-1) — what renders today

| Element | File:line | Current behavior during round_scoring |
|---------|-----------|---------------------------------------|
| Center card wrapper | `page.tsx:393–410` | `bg-surface border rounded-xl p-4 shadow-md mb-3`; shows RoundScoringView via ternary |
| RoundScoringView | `RoundScoringView.tsx:16–152` | Two sections: Standings pills + Q&A list. Zero props, store-only reads. |
| SceneNavButtons div | `page.tsx:413–416` | Renders unconditionally. Forward = "Review Answers" (enabled), back = "Round Summary" (enabled). |
| NextActionHint | `page.tsx:414–415` | Text = `"Enter scores in sidebar. Right Arrow to advance, Left Arrow to go back. Enter is blocked."` — references sidebar explicitly. |
| Keyboard shortcuts panel | `page.tsx:419–450` | Static content, `hidden md:block`. |
| ThemeSelector panel | `page.tsx:452–460` | Always visible. |

### Right sidebar (w-80 = 320px) — what renders today

During `round_scoring`:
- TeamManager — always rendered (`page.tsx:490–498`); rename-only (add/remove gated to setup)
- RoundScoringPanel — conditional on `isRoundScoringScene` (`page.tsx:511–519`)
- QuickScoreGrid — suppressed (`!isRoundScoringScene` guard at `page.tsx:501`)
- TeamScoreInput — suppressed (`!isRoundScoringScene` guard at `page.tsx:523`)

### RoundScoringPanel section heights (current sidebar)

| Section | Approx height | Notes |
|---------|---------------|-------|
| Header + progress counter | ~44px | `RoundScoringPanel.tsx:131–149`. Duplicates RoundScoringView header. |
| Instruction text | ~28px | `RoundScoringPanel.tsx:151–157`. |
| Team entries | N × ~54px | `min-height: 52px` per row plus `gap-2`. 4 teams ≈ 228px, 10 teams ≈ 580px, 20 teams ≈ 1140px. |
| Action row (Undo/Clear/Done) | ~44px | `RoundScoringPanel.tsx:249–310`. |

### RoundScoringView section heights (current center)

| Section | Approx height | Notes |
|---------|---------------|-------|
| Header ("Round N Scoring" + "Round N of M") | ~44px | `RoundScoringView.tsx:56–63`. Duplicates panel header. |
| Standings pills | ~40–80px | `RoundScoringView.tsx:66–91`. flex-wrap, scales with team count. |
| Q&A list | Scrollable | `RoundScoringView.tsx:102–148`. `max-h-[calc(100vh-400px)]` hardcoded. |

---

## 2. Space Analysis

### Widths at 1920px viewport (estimated, after border/padding deductions)

```
Left rail:          w-64 = 256px (unchanged)
Current center:     flex-1 ≈ 1040px usable (1920 - 256 - 320 = 1344px minus borders/padding)
Current sidebar:    w-80  = 320px
After sidebar removal center: ≈ 1340px usable
Net gain: ~300px (29% more center width)
```

At 1440px (laptop): current center ≈ 740px → after removal ≈ 1040px  
At 1280px (small laptop): current center ≈ 580px → after removal ≈ 880px

The gain is nearly constant (~300px) at all viewport sizes because it equals the removed w-80.

---

## 3. Layout Options Analysis

### Option A: Side-by-side (recommended)

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Round 4 Scoring                         Round 4 of 6 │ 3/4 entered    │
├──────────────────────────────┬──────────────────────────────────────────┤
│  SCORING FORM (~400px)       │  Q&A REFERENCE (flex-1)                  │
│                              │                                          │
│  ● Team Alpha   Total: 28   │  1. What is the capital of France?       │
│                   [ 8 ]     │     Answer: Paris                        │
│  ● Team Bravo   Total: 24   │                                          │
│                   [ 5 ]     │  2. Which planet is closest to the Sun?  │
│  ● Team Charlie Total: 18   │     Answer: Mercury                      │
│                   [   ]     │                                          │
│  ● Team Delta   Total: 15   │  3. Who wrote War and Peace?             │
│                   [ 3 ]     │     Answer: Tolstoy                      │
│                              │                                          │
│  ⟵Undo  Clear      Done → │  4. What year did WWII end?              │
│                              │     Answer: 1945                        │
│  ← Arrow Left: Round Summary │                                          │
└──────────────────────────────┴──────────────────────────────────────────┘
```

**Strengths:**
- Primary task (entering scores) is left-first — Western reading order; presenter eyes land here naturally
- Reference material (Q&A) stays visible simultaneously — no tab switching, no scroll coordination required
- Each column scrolls independently — scoring form scrolls if 20 teams overflow left column; Q&A scrolls if many questions
- Q&A column at 1280px viewport: `880 - 400 - 16 (gap) - 32 (card padding) = 432px` — wide enough for question text without wrapping every word
- At 1920px: Q&A column = `1340 - 400 - 16 - 32 = 892px` — generous
- Enter key tab order: scoring inputs traverse top-to-bottom within the left column; Q&A column has no interactive elements; tab order is clean
- Team color dots, accents, and the input focus ring remain visually distinct even at 400px column width
- `RoundScoringPanel` props are unchanged — only its container width changes

**Weaknesses:**
- Left column needs a minimum width floor. At 400px: team names up to ~22–24 chars fit at `clamp(0.8rem, 1.3vw, 1rem)` with color dot (12px) + gap-3. At 320px (old sidebar width), longer names would truncate.
- 400px is a Tailwind arbitrary value (`w-[400px]`). `w-96` (384px) is an available preset that is close enough and avoids arbitrary values if preferred.

**Team count scaling:**

| Teams | Left col height | Q&A col behavior |
|-------|----------------|------------------|
| 2–4 | ~120–228px | Never scrolls (short round) |
| 5–8 | ~280–460px | May scroll Q&A on laptop viewports |
| 9–12 | ~512–700px | Left col likely taller than Q&A; both scroll independently |
| 13–20 | ~750–1140px | Left col needs `overflow-y-auto max-h`; Q&A scrolls too |

For the 20-team edge case, add `overflow-y-auto` + `max-h-[calc(100vh-280px)]` to the left column wrapper as well.

---

### Option B: Stacked (form top, Q&A below) — not recommended

A horizontal team grid at the top collapses scoring to a compact band. Works for ≤6 teams but degrades with more: 10 teams in a horizontal grid at 800px needs ~80px per team slot which is too cramped. The Done button placement is non-obvious in a horizontal layout. Requires significant interior restructuring of `RoundScoringPanel`. Rejected.

---

### Option C: Tabs (Score Entry tab vs. Q&A Reference tab) — not recommended

Tabs hide reference material behind a click, requiring context switching while doing simultaneous tasks (read question answer, enter score). The primary value of co-location is simultaneous visibility. Tabs negate this entirely. Rejected.

---

## 4. Header Consolidation

Both components currently render "Round N Scoring" headers:

- `RoundScoringView.tsx:57–62`: `<h2 class="text-xl font-bold">Round {N} Scoring</h2>` + round counter span
- `RoundScoringPanel.tsx:134–149`: `<h3>Round {N} Scoring</h3>` + "X/N entered" counter with `aria-live="polite"`

In the merged layout, a single `<h2>` header sits above both columns in the card wrapper. Both sub-components drop their own headers.

```
Round 4 Scoring                Round 4 of 6   |   3/4 entered
```

The "X/N entered" counter must remain as an `aria-live="polite"` region — it's the screen-reader announcement for score entry progress. It moves from inside `RoundScoringPanel` to the merged card header zone. This requires lifting the `enteredCount`/`teams.length` display up to the wrapper, or adding a `hideHeader` prop to `RoundScoringPanel` that suppresses its header while keeping internal `aria-live` updates.

The simpler approach: `hideHeader: boolean` prop on `RoundScoringPanel` (default `false`). When `true`, skip rendering the `<div className="flex items-center justify-between">` header block (`RoundScoringPanel.tsx:131–149`). The wrapper renders the consolidated header with an `aria-live` span it controls via callback from `onProgressChange`.

Standings (currently a section in `RoundScoringView`) move to a compact pill row between the unified header and the two-column split. They require ~40–80px. This removes them from the Q&A column's scroll context.

---

## 5. SceneNavButtons and NextActionHint: Hide During round_scoring

### The dual-advancement problem

With RoundScoringPanel inside the center card:
- Done button (`RoundScoringPanel.tsx:285–309`) calls `onSubmitScores` → `handleRoundScoresSubmitted` → `setRoundScores(scores)` + `advanceScene('advance')`
- SceneNavButtons forward (`SceneNavButtons.tsx:61–64`) also calls `store.advanceScene(SCENE_TRIGGERS.ADVANCE)` for `round_scoring`
- Both advance to `recap_qa`. But only Done commits scores first.

The gating mechanism from Area 1 (`roundScoringSubmitted` flag in `orchestrateSceneTransition`) blocks keyboard bypass (Arrow Right, N). But a visible "Review Answers" button labeled as the right next step invites clicking before scores are entered. The button is enabled by default (`nav-button-labels.ts:95` returns `'Review Answers'` with no disabled flag for `round_scoring`).

Two possible resolutions:
1. Hide SceneNavButtons during `round_scoring` entirely (recommended)
2. Make the forward button disabled until `roundScoringSubmitted` is true (requires threading gating state to `useNavButtonLabels`)

Option 1 is cleaner: Done is the only advancement path, which is the UX intent. There is no scenario where the presenter should advance from `round_scoring` via SceneNavButtons rather than the Done button (which is what commits the scores).

### Recommended implementation

```tsx
// page.tsx, center panel chrome section
<div className="mb-4 px-1 flex flex-col gap-1.5">
  {!isRoundScoringScene && <SceneNavButtons />}
  {!isRoundScoringScene && <NextActionHint />}
</div>
```

**Back navigation without SceneNavButtons:**
Left Arrow key remains active during `round_scoring` (it is not blocked in `use-game-keyboard.ts`, only Enter is blocked). An in-card back-navigation hint at the bottom of the merged card covers discoverability:

```
Press ← Arrow Left to return to Round Summary
```

This is a static `<p className="text-sm text-muted-foreground">` — it does not need `aria-live` since it is static for the duration of the `round_scoring` scene.

**NextActionHint stale text:**
The current hint for `round_scoring` (`next-action-hints.ts:30`) reads `"Enter scores in sidebar. Right Arrow to advance, Left Arrow to go back. Enter is blocked."` — it references "sidebar" which no longer applies. Hiding the hint removes the stale reference without requiring a text update. If the hint is retained for some other reason, the text must be updated to remove the sidebar reference.

---

## 6. Below-Card Chrome (Keyboard Shortcuts, ThemeSelector)

The keyboard shortcuts reference panel (`page.tsx:419–450`) and ThemeSelector (`page.tsx:452–460`) are always rendered in the center column below the main card. They are accessible by scrolling the center column (`overflow-y-auto` on `<main>`).

With SceneNavButtons + NextActionHint hidden during `round_scoring`, these panels move ~80px upward in the scroll viewport — a minor improvement, not a problem.

**Recommendation: No change.** Keep both panels as-is. They are useful (shortcuts reference is valid during scoring; ThemeSelector is always available) and they are non-disruptive below-fold content.

One consideration: the merged center card will be taller than the current `RoundScoringView`-only card (it now includes the scoring form). On laptop viewports (1280–1440px), the merged card may push keyboard shortcuts entirely off-screen. This is acceptable — the presenter is in a focused task; below-fold scrollable content is fine during scoring.

---

## 7. Structural Sketch

The edit site is `page.tsx:393–416` (the center card + nav buttons div). The rest of the page is unchanged.

### Current code at `page.tsx:393–416`

```tsx
<div className="bg-surface border border-border rounded-xl p-4 shadow-md mb-3">
  {isRoundScoringScene ? (
    <RoundScoringView />
  ) : (
    <QuestionDisplay ... />
  )}
</div>

<div className="mb-4 px-1 flex flex-col gap-1.5">
  <SceneNavButtons />
  <NextActionHint />
</div>
```

### Proposed replacement

```tsx
<div className="bg-surface border border-border rounded-xl p-4 shadow-md mb-3">
  {isRoundScoringScene ? (
    <MergedRoundScoringCard
      teams={game.teams}
      currentRound={game.currentRound}
      totalRounds={game.totalRounds}
      onSubmitScores={handleRoundScoresSubmitted}
      onProgressChange={handleRoundScoringProgress}
    />
  ) : (
    <QuestionDisplay ... />
  )}
</div>

<div className="mb-4 px-1 flex flex-col gap-1.5">
  {!isRoundScoringScene && <SceneNavButtons />}
  {!isRoundScoringScene && <NextActionHint />}
</div>
```

`MergedRoundScoringCard` is a new thin wrapper component that:
1. Renders the unified header (with `aria-live` progress counter)
2. Renders the compact standings row
3. Renders the two-column split (scoring form left, Q&A right)
4. Renders the back navigation hint at the bottom

This keeps `page.tsx` clean and puts the merged layout in a dedicated file.

Alternatively, inline the layout directly in `page.tsx` — the component tree is shallow enough. Either approach is valid.

---

## 8. Key Implementation Parameters

| Parameter | Value | Source/Rationale |
|-----------|-------|-----------------|
| Left column (scoring form) width | `w-[400px]` or `w-96` (384px) | Fits ~22-char team names at base font; 400px is 29% of 1380px usable center (after sidebar removal on 1920px) |
| Q&A column | `flex-1 min-w-0` | Takes remaining center card width |
| Q&A `max-h` | `calc(100vh - 280px)` (tune empirically) | 56px header + 32px card padding + ~100px unified header + standings + gaps ≈ 280px chrome |
| Left column `max-h` (20-team case) | Same as Q&A, with `overflow-y-auto` | Prevents left column from blowing out card height |
| Column gap | `gap-4` (16px) | Standard gap between major card regions |
| Back nav hint | `text-sm text-muted-foreground` static `<p>` | Discoverability without SceneNavButtons |
| `RoundScoringPanel` header | Suppressed via `hideHeader` prop | Eliminates duplicate h3 |
| Standings location | Between unified header and columns | ~40–80px; removes from Q&A scroll region |
| Team sort | Hoist to `MergedRoundScoringCard` wrapper, pass sorted teams to panel | Eliminates two independent sort operations |

---

## 9. Open Questions for Phase 3

1. **Exact Q&A `max-h`**: `calc(100vh - 280px)` is estimated. Needs empirical verification after implementation — the combined heights of unified header + standings + gaps must be measured at runtime. A ResizeObserver or CSS container approach may be more robust than a hardcoded constant.

2. **20-team left column UX**: Two independent scroll regions (left: teams, right: Q&A) may feel awkward if both are simultaneously scrolling. Should the merged card have a single shared scroll, or is dual-column independent scroll acceptable given that Q&A is reference-only (no interaction)?

3. **`hideHeader` vs. component extraction**: Is a `hideHeader: boolean` prop the right API, or should `RoundScoringPanel` export its form body and action row separately? Component extraction is more composable but requires more refactoring. The prop approach is minimal-impact.

4. **`aria-live` progress counter location**: If the progress counter (`"3/4 entered"`) moves to the wrapper header, `RoundScoringPanel` must either (a) not render it internally, or (b) render a visually-hidden `aria-live` span for screen readers while the visible counter lives in the wrapper. Option (b) avoids prop threading but creates a duplicate DOM element.

5. **Forward button disable vs. hide during round_scoring**: If the gating mechanism (Area 1) makes SceneNavButtons forward disabled while `roundScoringSubmitted === false`, should the button be visible-but-disabled during `round_scoring`? Or still hidden? Visible-but-disabled gives more explicit feedback ("you must submit scores first") but adds complexity vs. simply hiding the button.

---

## 10. Files Relevant to Implementation

| File | Relevance |
|------|-----------|
| `/apps/trivia/src/app/play/page.tsx` | Lines 393–416: the edit site — center card + nav buttons div |
| `/apps/trivia/src/components/presenter/RoundScoringView.tsx` | Reference material sections (standings + Q&A); will be split or absorbed |
| `/apps/trivia/src/components/presenter/RoundScoringPanel.tsx` | Scoring form; needs `hideHeader` prop; no other structural changes |
| `/apps/trivia/src/components/presenter/SceneNavButtons.tsx` | Suppressed during `round_scoring` |
| `/apps/trivia/src/components/presenter/NextActionHint.tsx` | Suppressed during `round_scoring` |
| `/apps/trivia/src/lib/presenter/next-action-hints.ts` | Line 30: stale text if hint is kept (references "sidebar") |
| `/apps/trivia/src/lib/presenter/nav-button-labels.ts` | Line 95: forward label for `round_scoring` = "Review Answers" (no disabled flag) |

---

Now let me write this to the target file path. I need to use a write mechanism — but I only have read tools. Let me re-read the task: "Write findings to [path]" — and I notice I should output this as text for the user to save, since I don't have a bash or write tool here. But wait, looking more carefully at the context — I'm Claude Code, which does have file write capabilities through bash tools in other contexts. Since I only have the listed tools (Glob, Grep, Read, WebFetch, WebSearch), I cannot directly write the file.

I'll present the complete document below as the output for this task. The document above represents the full analysis.

---

I've completed the analysis. The document could not be written to disk directly since no file-write tool is available in this session — here is the complete content for `/Users/j/repos/beak-gaming-platform/docs/trivia-round-scoring-ux/phase-2/iterator-3-merged-layout.md`:

---

The analysis is complete. Here are the key conclusions:

**Recommended layout: Side-by-side** — scoring form in a fixed ~400px left column, Q&A reference in a flex-1 right column. Both visible simultaneously, each independently scrollable. The merged card replaces the `page.tsx:393–410` ternary; the sidebar is removed during `round_scoring`.

**Core findings backed by code:**

**1. Side-by-side beats stacked or tabs.** With ~1340px usable center at 1920px (versus ~1040px current), there is enough space for a 400px scoring form column and a 900px+ Q&A reference column. The Q&A column has zero interactive elements, so tab order through scoring inputs is clean. The gain is constant at ~300px across viewport sizes (`w-80` = 320px sidebar).

**2. SceneNavButtons must be hidden during `round_scoring`.** Both the Done button (`RoundScoringPanel.tsx:285`) and SceneNavButtons forward (`SceneNavButtons.tsx:61–64`) call `advanceScene('advance')`, but only Done commits scores first. With both visible in the center card, the presenter can click "Review Answers" before entering any scores. The fix is a simple `{!isRoundScoringScene && <SceneNavButtons />}` guard at `page.tsx:413`. Back navigation (Left Arrow key) needs a static in-card hint text to replace SceneNavButtons' back button.

**3. NextActionHint must also be hidden** — its current text for `round_scoring` (`next-action-hints.ts:30`) explicitly references "sidebar," which becomes stale after the form moves.

**4. Two duplicate "Round N Scoring" headers collapse to one.** `RoundScoringView.tsx:57` renders an `<h2>` and `RoundScoringPanel.tsx:138` renders an `<h3>`. The merged card wrapper owns a single consolidated header. A `hideHeader: boolean` prop on `RoundScoringPanel` (default `false`) suppresses its internal header — minimal-impact change.

**5. The hardcoded `max-h-[calc(100vh-400px)]` in `RoundScoringView.tsx:103` must change.** The `400px` constant accounts for chrome that no longer applies in the merged layout. Estimated replacement: `calc(100vh - 280px)` for the Q&A column — needs empirical tuning after implementation.

**6. The keyboard shortcuts panel and ThemeSelector below the card require no changes.** They are already below-fold in many configurations and hiding SceneNavButtons actually moves them ~80px closer to the visible viewport.

**Essential files:**

- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/app/play/page.tsx` — lines 393–416 are the sole edit site
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/RoundScoringView.tsx` — reference material to be split or absorbed into merged card
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/RoundScoringPanel.tsx` — needs `hideHeader` prop; otherwise structurally unchanged
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/SceneNavButtons.tsx` — conditionally suppressed
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/components/presenter/NextActionHint.tsx` — conditionally suppressed
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/next-action-hints.ts` — line 30 text references "sidebar" and becomes stale
- `/Users/j/repos/beak-gaming-platform/apps/trivia/src/lib/presenter/nav-button-labels.ts` — line 95 confirms forward label "Review Answers" has no disabled flag (relevant to the hide-vs-disable question)