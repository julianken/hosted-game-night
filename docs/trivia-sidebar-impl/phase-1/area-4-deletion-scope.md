# Area 4: Sidebar Deletion Mechanics

## Deletion Manifest for page.tsx (~75 lines)

### Imports to delete
- Line 13: `TeamScoreInput` import (only callsite: sidebar line 529)
- Line 14: `TeamManager` import (only callsite: sidebar line 506)
- Line 15: `QuickScoreGrid` import (only callsite: sidebar line 518)
- Line 19: `useQuickScore` import (only callsite: page.tsx line 172)

### State/hooks to delete
- Line 172: `const quickScore = useQuickScore(game.selectedQuestionIndex)` — Instance 2, dead without QuickScoreGrid
- Lines 174-179: `isScoringScene` comment + constant — both callsites (516, 526) are inside sidebar

### JSX to delete
- Lines 496-563: Entire sidebar aside + `{!isRoundScoringScene && (...)}` wrapper

## Component Survival Analysis

| Component | Survives? | Reason |
|-----------|-----------|--------|
| TeamManager.tsx | YES | Used by WizardStepTeams.tsx |
| TeamScoreInput.tsx | YES (dormant) | SHOULD RELOCATE; a11y tests import it directly |
| QuickScoreGrid.tsx | DELETE | Zero consumers outside page.tsx; source of dual-instance bug |
| use-quick-score.ts | YES | Instance 1 in use-game-keyboard.ts survives |

## id="game-controls" — Zero External Consumers

Only references: docs/MANUAL_TEST_PLAN.md:598 and docs/trivia-round-scoring-ux-decisions/ — both documentation, no code.

## Test Impact

- All TeamManager (17) and TeamScoreInput (18) unit tests survive (test components in isolation)
- QuickScoreGrid has NO test file
- accessibility.test.tsx imports survive (components not deleted)
- use-game-keyboard tests survive (Instance 1 unaffected)

## Layout Changes

- Center panel gains +320px (+37% at 1440px)
- Need max-w-3xl mx-auto wrapper for content cards (not round-scoring layout)
- Visual verification required at 1280×800 and 1366×768
- Layout comment at lines 238-244 needs update for 2-column
