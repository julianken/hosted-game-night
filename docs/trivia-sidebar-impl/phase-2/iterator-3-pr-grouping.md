# Iterator 3: PR Grouping Strategy

## Decision: 5 PRs

### Critical Path (sequential)

**PR-A: "Fix handleNextRound + Add ended-state center panel" (Items 1+2)**
- ~25 lines changed in page.tsx only
- handleNextRound rewrite + auto-show effect + re-open button
- Items 1+2 are inseparable: the guard only makes sense with the re-open mechanism
- Prerequisite: None

**PR-B: "Remove right sidebar" (Item 3, absorbing Items 4+5)**
- ~80 lines deleted from page.tsx, QuickScoreGrid.tsx deleted
- Bugs absorbed: dual useQuickScore + divergent reset eliminated by deletion
- Prerequisite: PR-A merged

**PR-C: "Center panel layout constraints" (Item 6)**
- ~10 lines + visual verification screenshots
- max-w-3xl wrapper, layout comment update
- Prerequisite: PR-B merged (must see actual layout)

### Independent (parallel, merge before PR-B)

**PR-D: "Fix skip link a11y target" (Item 7)**
- 2 lines changed in page.tsx

**PR-E: "File relocation Linear issues" (Item 8)**
- No code, Linear issue creation only

### Merge Order
```
PR-D (skip link)  ─── any time
PR-E (Linear)    ─── any time

PR-A (Items 1+2) → PR-B (Items 3+4+5) → PR-C (Item 6)
```

### Key Decision: Items 2+3 Stay Separate
The analysis report recommends atomicity, but the intermediate state (both sidebar and center panel have "View Final Results") is redundant, not harmful. The auto-show fires immediately on game end, so by the time a user could interact with either button, the overlay is already open. Separation gives cleaner review and test boundaries.
