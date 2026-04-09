# Area 1: Dependency Graph & Sequencing

## Hard Dependency Chain (Critical Path)

```
Item 1 (handleNextRound guard, page.tsx:89-93)
  → Item 2 (ended-state replacement, page.tsx:78-82, 475-491)
    → Item 3 (sidebar deletion, page.tsx:496-563)
      → Item 6 (layout cleanup, page.tsx center panel)
```

4 sequential PRs on the critical path.

## Independent Items (Batch A — parallel with each other and B1)

- **Item 7:** Skip link a11y fix (page.tsx:232, 1-line change)
- **Item 4:** Fix dual useQuickScore (delete page.tsx:172, change prop at 520)
- **Item 5:** Fix divergent reset (page.tsx:551, change onClick to handleNewGame)
- **Item 8:** File SHOULD RELOCATE as Linear issues (no code)

All must merge before Item 3 (sidebar deletion).

## Line-Level Conflict Analysis

Items 4 and 5 modify lines inside the sidebar block that Item 3 deletes. If Item 3 merges first, the fixes are absorbed (lines deleted). If Items 4/5 merge first, Item 3 has trivial rebase (lines already changed/deleted).

## Key Finding: isScoringScene

`isScoringScene` (page.tsx:175-179) is ONLY used at lines 516 and 526, both inside the sidebar. It is dead after sidebar removal and should be deleted.

## Recommendation

- Items 1, 2, 3 should be SEPARATE PRs (testability boundaries, rollback granularity, one-issue-one-PR rule)
- Bug fixes (4, 5) can be done sidebar-present but may be wasted churn since the lines get deleted by Item 3
- Items 4, 5, 7 can all start immediately in parallel with Item 1
- Minimum PR count: 7 (or 5 if bugs absorbed into Item 3)
