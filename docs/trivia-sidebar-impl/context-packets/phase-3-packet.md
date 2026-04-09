# Context Packet: Phase 3

## Decisions Made

1. **5 PRs, 3-wave execution:** PR-A (Items 1+2) → PR-B (Items 3+4+5) → PR-C (Item 6), with PR-D and PR-E independent
2. **max-w in PR-C (not PR-B):** Layout constraints separated from deletion for clean visual verification
3. **Items 2+3 stay separate PRs:** Intermediate redundancy is harmless; cleaner review boundaries
4. **Bugs absorbed into deletion PR (PR-B):** Both bugs are inside the deletion zone — structural elimination
5. **PR-E is orchestrator-only:** Linear issue creation, no code agent needed

## Key Data — Agreement Across All 3 Syntheses

- All 3 agree on the 5-PR structure and merge order
- All 3 agree on exact code changes for PR-A (from Iterator 2)
- All 3 agree on deletion manifest for PR-B (from Iterator 4)
- All 3 agree on test strategy (1 unit + 5 new E2E + 5 deleted E2E)
- All 3 agree PR-D is independent and trivial (2 lines)

## Key Data — Divergence

- **None significant.** Phase 2 resolved all major contradictions. Phase 3 synthesizers converged.

## Carry-Forward Concerns

1. Linear issue IDs not yet created — Phase 4 plan must note this as a prerequisite step
2. PR-E acceptance criteria for SHOULD RELOCATE items need suggested relocation targets
3. Visual verification viewports for PR-C: 1280×800 and 1366×768 agreed, but 1920×1080 should also be checked

## Artifacts
- synthesis-1.md: Complete work unit specs with acceptance criteria and tests
- synthesis-2.md: Sequencing, risk register, verification checkpoints, carry-forward resolutions
- synthesis-3.md: Linear issue drafts, 3-wave agent orchestration, branch strategy
