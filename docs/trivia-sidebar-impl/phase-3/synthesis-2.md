# Synthesis 2: Sequencing, Risks, and Verification

## Merge Order and Critical Path

```
PR-D (skip link)  ─── any time (independent)
PR-E (Linear)     ─── any time (independent)

PR-A (Items 1+2) → PR-B (Items 3+4+5) → PR-C (Item 6)
     │                    │                    │
     │                    │                    └─ Visual verification only
     │                    └─ Largest deletion, structurally eliminates 2 bugs
     └─ Foundation: ended-state replacement + handleNextRound fix
```

**Critical path duration:** PR-A → PR-B → PR-C (sequential, ~3 work units)
**Parallel work:** PR-D and PR-E can happen simultaneously with any critical path PR.

## Carry-Forward Resolutions

### R1: max-w placement — RESOLVED
**Decision:** max-w goes in PR-C, NOT PR-B.
**Rationale:** Iterator 3 (PR grouping) says separate. Iterator 4 (deletion spec) mentions it in the deletion PR but this creates review noise. Layout constraints should be verified against the actual post-deletion layout, which only exists after PR-B merges. Separation gives clean verification.

### R2: Items 2+3 atomicity — RESOLVED
**Decision:** Items 2+3 stay in separate PRs (PR-A and PR-B).
**Rationale:** The analysis report R4 recommends atomicity, but the intermediate state (both sidebar and center panel have "View Final Results") is redundant, not harmful. The auto-show fires immediately on game end, so by the time a user could interact, the overlay is already open. Iterator 3's reasoning is sound. Separation gives cleaner review and test boundaries.

### R3: PR-E acceptance criteria — RESOLVED
**Decision:** Linear issues should include:
- Description of the feature being relocated
- Reference to sidebar removal PRs
- Suggested relocation target (setup wizard for rename, keyboard shortcuts or dedicated panel for score override)
- Priority: low (these are SHOULD items, not MUST)

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| handleNextRound fix breaks between_rounds flow | High | Low | Guard clause + E2E test for between_rounds |
| Deletion misses a reference (TypeScript error) | Medium | Low | TypeScript compiler will catch; CI-equivalent local check |
| Quick-score keyboard stops working | High | Low | Instance 1 in use-game-keyboard.ts untouched; E2E test |
| max-w-3xl too narrow at some viewport | Low | Medium | Visual verification at 2 viewports; easy to adjust |
| Scene corruption during ended state | High | Low | Dedicated E2E test for audienceScene value |

## Verification Checkpoints

### After PR-A merge:
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test:run` passes (all unit tests)
- [ ] `pnpm test:e2e` passes — check `pnpm test:e2e:summary` for "0 failed"
- [ ] Manual: play a full game → game ends → RoundSummary auto-shows → dismiss → re-open button appears
- **Stop condition:** Any E2E failure related to game flow

### After PR-B merge:
- [ ] `pnpm typecheck` passes (confirms no dangling references)
- [ ] `pnpm test:run` passes
- [ ] `pnpm test:e2e` passes (after deleting sidebar E2E tests)
- [ ] Manual: no `<aside>` in DOM, keyboard scoring works, full game flow intact
- **Stop condition:** TypeScript errors or keyboard scoring broken

### After PR-C merge:
- [ ] Visual verification at 1280×800 and 1366×768 via Playwright MCP
- [ ] No horizontal scroll
- [ ] Round scoring panel still full-width
- **Stop condition:** Content unreadable or layout broken at target viewports
