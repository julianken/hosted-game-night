# Context Packet: Phase 3

## Where the 3 Syntheses Agree

1. **"View Final Results" is a hard blocker** — all three identify it as the single non-negotiable prerequisite. Zero auto-show path, zero keyboard shortcut, zero tests. Must be relocated before any sidebar code is deleted.

2. **Sidebar removal fixes two real bugs** — dual useQuickScore (visual desync, broken undo) and divergent reset (no confirmation, teams preserved). Net positive for code correctness.

3. **The sidebar is compensatory, not primary** — it patches gaps in the center panel's design. Removal exposes those gaps rather than creating new ones.

4. **Per-round score breakdown is acceptable loss** — data available in recap flow. All three agree this is the lowest-priority item.

5. **Removal and MUST RELOCATE replacement must be atomic** — cannot ship sidebar deletion without simultaneous ended-state fix.

## Where They Diverge

1. **SHOULD RELOCATE urgency:** Synthesis 1 says "do not block removal on SHOULD RELOCATE items — add iteratively." Synthesis 2 agrees (defer to follow-up). Synthesis 3 cautions that sequencing risk means temporary degradation for all operators if SHOULD items ship later. Tension: speed of removal vs completeness of replacement.

2. **Mouse-only operator risk:** Synthesis 1 acknowledges touchscreen gap as a caveat. Synthesis 2 rates it Medium/Medium risk. Synthesis 3 elevates it to a structural gap — the entire analysis assumes keyboard proficiency without validating it.

3. **Independent bug filing:** Synthesis 3 uniquely argues the two confirmed bugs should be filed and fixed regardless of the sidebar decision, not framed only as "removal benefits."

## Strongest Conclusions (all 3 agree, definitive confidence)
- View Final Results is the single hard blocker (MUST RELOCATE)
- Sidebar removal resolves dual useQuickScore bug (net positive)
- Sidebar removal eliminates divergent reset path (net positive)
- Center panel has zero ended-state UI (architectural debt)
- round_scoring scene is prior art for sidebar-free design

## Largest Blind Spots (flagged by at least 2 syntheses)
- Presenter operator model undefined (keyboard vs mouse usage unknown)
- "End Game" button in RoundSummary has latent bug (handleNextRound no-op + invalid audienceScene during ended) — becomes high-severity with auto-show replacement
- E2E rename test covers wrong code path (setup wizard, not mid-game sidebar)
- Center panel visual quality at real presenter resolutions uninvestigated
- Bingo's sidebar-free production design never referenced as supporting evidence

## New Finding from Synthesis 3
The handleNextRound bug was traced to completion: game.nextRound() is a no-op when status!=='between_rounds' (rounds.ts:24-25), but handleNextRound unconditionally sets audienceScene to round_intro (page.tsx:89-93) — invalid for ended. This bug is currently unreachable but would be exposed by any auto-show replacement. Must be fixed before or simultaneously with the replacement.

## Artifacts
- `phase-3/synthesis-1.md`: Thematic — sidebar as compensatory overlay, 5 conclusions
- `phase-3/synthesis-2.md`: Risk/Opportunity — 5 risks, 3 opportunities, severity ratings
- `phase-3/synthesis-3.md`: Gaps — 8 gaps/implications, latent bug discovery, sequencing risk
