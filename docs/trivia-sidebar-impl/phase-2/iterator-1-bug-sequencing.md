# Iterator 1: Bug Fix Sequencing Resolution

## Decision: Option B — Absorb Both Bugs Into Sidebar Deletion PR

### Rationale
1. **Both bugs are inside the deletion zone.** Item 4 fix touches lines 19, 172, 520. Item 5 fix touches line 551. All are inside or feed the sidebar block (496-563) which Item 3 deletes.
2. **Critical path is 1-2 days.** Items 1→2→3 are small scoped changes (8 lines, 25 lines, 75 lines). Production exposure window is shorter than the time to implement/merge standalone fix PRs.
3. **Structural elimination > patches.** When the sidebar is deleted, Instance 2 is gone (Bug 1) and the divergent reset path is gone (Bug 2). No patching needed.
4. **History noise.** 3-line commits that survive for one PR and are deleted by the next create misleading git history.

### Exception Condition
If QuickScoreGrid survives sidebar deletion (relocated to center panel), Item 4 must be fixed first as a standalone PR. Area 4's deletion manifest lists QuickScoreGrid as "DELETE — zero consumers." If that holds, Option B stands.

### Item 3 PR Must Document
- Bug 1 (dual useQuickScore) resolved structurally by deletion of Instance 2
- Bug 2 (divergent reset) resolved structurally by deletion of sidebar reset button
- Close Linear issues for Items 4 and 5 as resolved-via-deletion
