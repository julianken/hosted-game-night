# Iterator 4: Deletion and Cleanup Specification

## page.tsx Changes (~77 net lines removed)

### Imports to Delete (4 lines)
| Line | Import |
|------|--------|
| 13 | TeamScoreInput |
| 14 | TeamManager |
| 15 | QuickScoreGrid |
| 19 | useQuickScore |

### Hooks/Constants to Delete (9 lines)
| Lines | Content |
|-------|---------|
| 171 | Quick score hook comment |
| 172 | `const quickScore = useQuickScore(...)` (Instance 2) |
| 173 | blank line |
| 174 | Scoring-phase scenes comment |
| 175-179 | `const isScoringScene = (...)` — confirmed dead, only used at 516/526 inside sidebar |

### JSX to Delete (68 lines)
| Lines | Content |
|-------|---------|
| 496 | Sidebar comment |
| 497 | `{!isRoundScoringScene && (` |
| 498-562 | Entire `<aside id="game-controls">` |
| 563 | `)}` |

### Variables to KEEP
- `isRoundScoringScene` (line 182) — used at lines 380, 385 (center panel)
- `game.addTeam/removeTeam/renameTeam/adjustTeamScore/setTeamScore` — stay in hook return, just no longer used in JSX

### Layout Modifications
- Lines 238-244: Update comment from 3-column to 2-column
- Add `max-w-3xl mx-auto w-full` wrapper inside center panel (non-round-scoring content only)

## File to Delete
- `apps/trivia/src/components/presenter/QuickScoreGrid.tsx` — zero consumers, zero tests, source of dual-instance bug

## Files NOT to Delete
- TeamManager.tsx — used by WizardStepTeams.tsx
- TeamScoreInput.tsx — dormant, SHOULD RELOCATE pending
- use-quick-score.ts — Instance 1 in use-game-keyboard.ts alive

## TypeScript Safety
All deleted references are self-contained: import removed + JSX usage removed in same changeset. No dangling references expected.
