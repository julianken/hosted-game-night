# Phase 2 Iterator 1: Sidebar Replacement Design — What Takes Over?

**Document type:** Design iteration  
**Analysis phase:** 2 of 4  
**Status:** Complete  
**Source files read:**
- `apps/trivia/src/components/presenter/TeamManager.tsx`
- `apps/trivia/src/components/presenter/QuickScoreGrid.tsx`
- `apps/trivia/src/components/presenter/TeamScoreInput.tsx`
- `apps/trivia/src/components/presenter/RoundScoringPanel.tsx`
- `apps/trivia/src/components/presenter/RoundScoringView.tsx`
- `apps/trivia/src/components/presenter/SceneNavButtons.tsx`
- `apps/trivia/src/app/play/page.tsx`
- `docs/trivia-round-scoring-ux/phase-1/area-3-sidebar-inventory.md`

---

## Background

The right sidebar (`w-80`, 320px) currently hosts four conditional blocks:

1. `TeamManager` — always present; rename works live, add/remove are dead during gameplay
2. `QuickScoreGrid` — shown during `question_closed | answer_reveal | round_summary`
3. `RoundScoringPanel` — shown during `round_scoring` exclusively
4. `TeamScoreInput` — shown during all other `playing | between_rounds` scenes; `ended` block has "View Final Results" + "Start New Game"

The proposal under analysis: remove the sidebar entirely and relocate each function to a better home.

---

## Component Deep Dives

### 1. TeamManager — Rename Flow

**Mechanism:** Inline edit. A "Rename" button per team row calls `handleStartEdit(team)`, which sets `editingId` and `editValue` in local state. The team row switches from a `<span>` to an `<input>` with `autoFocus`. Save fires on `Enter` or `onBlur`; cancel fires on `Escape`. Calls `onRenameTeam(id, name)` which maps to `game.renameTeam` in the store. The input is focused immediately — no separate confirmation step.

**Live-game availability:** The Rename button has no `status` guard (`TeamManager.tsx:87-96`). It renders for all statuses. Only add/remove are gated to `status === 'setup'` (`TeamManager.tsx:97-108, 121-139`).

**Size when rename-only:** The component renders a vertical list of team rows (each ~44px tall, max-height 300px with scroll), a "Teams" heading, and the Rename button per row. During live gameplay it is effectively a scrollable list of `[team name] [Rename button]` entries — no Add, no Remove, no count badge.

**Frequency of use:** Rename is low-frequency. It happens at game start when a team realizes their default "Table 3" name is wrong, or when a team requests a name change mid-game. It is not a per-question action.

---

### 2. QuickScoreGrid — Size and Interaction Model

**Mechanism:** A 3-column CSS grid of toggle buttons, one per team. Each button shows team name, current total score, and a keyboard hint badge (1–9, 0 for the 10th team). Pressing the button (or the corresponding digit key) calls `quickScore.toggleTeam(teamId)`. Toggle is binary — one press scores, a second press un-scores. Scored state is shown via team color border + subtle background. An Undo button appears when `scoredTeamIds.size > 0`, calling `quickScore.undo()`.

**Physical size:** Each button is `min-height: 64px, min-width: 44px`, padding `8px 6px`. With 3 columns and up to 20 teams, the grid can be 7 rows tall (~448px for 20 teams) plus header row and undo button. For the realistic 4–8 team case, the grid is 2–3 rows (~128–192px) plus header and undo (~90px combined). Total for 6 teams: ~220px.

**Keyboard dependency:** 1–9/0 keys work regardless of where the component renders, because the keyboard handler (`use-game-keyboard.ts`) operates on `window` events. The button grid is a visual affordance and touch target for the same action; it does not need to be adjacent to any other element to function correctly.

**Relocatability:** High. The grid is self-contained, depends only on `teams` array and the `useQuickScore` hook return. It has no position dependencies. It renders correctly at any width — the 3-column layout works at 240px (left rail) or 600px (center panel).

---

### 3. TeamScoreInput — Unique Capability Analysis

**What it provides:**
- **+1 button** per team → `onAdjustScore(teamId, +1)` → keyboard equivalent: `Shift+digit` adds a point
- **-1 button** per team → `onAdjustScore(teamId, -1)` → keyboard equivalent: `digit` then undo, or no direct single-key remove
- **Direct score set:** clicking the score display opens a `<input type="number">` inline, enter saves → `onSetScore(teamId, score)` → **no keyboard equivalent**
- **Per-round breakdown strip:** shows `R1: N, R2: N, ...` with current round highlighted → informational, no action

**Unique vs redundant breakdown:**

| Capability | Keyboard alternative | Verdict |
|---|---|---|
| +1 adjust | `Shift+digit` adds 1 | Redundant |
| -1 adjust | None (undo removes the last +1 only) | Partially unique |
| Direct score set (arbitrary integer) | None | Unique |
| Per-round breakdown display | None | Informational-only |

**When it appears:** `(playing || between_rounds) && !isScoringScene && !isRoundScoringScene`. This covers `question_anticipation`, `question_display`, `round_intro`, and the early part of `between_rounds` before scoring phases activate. It is the "idle" sidebar state during active gameplay.

**Physical size:** Each team row is a flex container with team name + [-][score][+] controls + round breakdown. Row height is ~72px (44px controls + 28px round strip). For 6 teams: ~432px plus the heading. It is taller than QuickScoreGrid for the same team count.

---

## Relocation Proposals

### Function 1: TeamManager Rename

**Current:** Sidebar column, always visible, inline edit within the team list row.

**Proposed location:** Modal dialog, triggered from a per-team inline button or a top-bar "Teams" management button.

**Trigger:** A small "Rename" icon button (pencil icon, 44×44px) per team row that appears wherever team names are displayed — in the standing strip inside `RoundScoringView`, in the `QuickScoreGrid` buttons (long-press or a separate overflow), or in a dedicated Teams modal.

**Recommended approach — Teams modal:** A "Teams" button in the top header bar (between status badge and Open Display), showing a compact modal with the team list and inline rename. This keeps rename accessible from any scene without consuming center panel space. The modal pattern already exists in this app (KeyboardShortcutsModal, SaveTemplateModal, SavePresetModal).

**Component reuse:** `TeamManager.tsx` can be reused as-is inside the modal. Its inline-edit mechanism works identically in a modal context. The `status` prop already gates add/remove; the modal can be rendered only when `status !== 'setup'` (since setup uses SetupWizard anyway).

**Interaction trigger:** Button in header bar labeled "Teams" or using a people/group icon. Opens modal. Keyboard shortcut could be added (e.g., unassigned letter key, though the keyboard is already dense).

**What is dropped:** No sidebar rename list means rename is one extra click away (button → modal → rename → close) vs. sidebar's always-visible list. This is acceptable given rename's low frequency.

---

### Function 2: QuickScoreGrid

**Current:** Sidebar column, shown during `question_closed | answer_reveal | round_summary`.

**Proposed location:** Center panel, embedded below `QuestionDisplay` as a persistent section during scoring-phase scenes, replacing the "Keyboard Shortcuts" card that currently occupies that space during scoring.

**Trigger:** Automatic — already scene-conditional (`isScoringScene`). No new trigger needed; the grid appears/disappears with the scene just as it does now.

**Layout specifics:** The center panel currently renders: