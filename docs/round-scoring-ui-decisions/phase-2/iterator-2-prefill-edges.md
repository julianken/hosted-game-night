# Iterator 2: Pre-fill Edge Cases

## Assignment
Validate the pre-fill guard logic and investigate edge cases for 0, negative, undefined, re-entry, and audience display interaction.

## Proposed Guard

```ts
const committed = team.roundScores?.[currentRound];
initial[team.id] = (committed !== undefined && committed > 0) ? committed : null;
```

## Edge Case Analysis

### Q1: What happens when `committed === 0`?

**Finding:** The `> 0` guard correctly treats 0 as null (blank).

A team with 0 quick-score points has no accumulated data to pre-fill. Showing "0" in the input would be confusing — it implies the presenter deliberately entered 0. Showing blank (null) with placeholder text correctly communicates "no score entered yet."

**Verdict:** `> 0` is correct. Do not use `!== 0`.

### Q2: Can `committed` be negative?

**Finding:** Negative `roundScores` are impossible.

All four score-mutation functions in `scoring.ts` enforce `Math.max(0, ...)`:
- `adjustTeamScore` (line 23): `Math.max(0, (roundScores[currentRound] || 0) + delta)`
- `setTeamScore` (line 52): `Math.max(0, score - otherRoundsTotal)`
- `setTeamRoundScore` (line 78): `Math.max(0, score)`
- `amendCorrectAnswers` (line 189): `Math.max(0, (roundScores[roundIndex] || 0) + adjustment)`

**Verdict:** No negative guard needed. Engine guarantees non-negative.

### Q3: Re-entry after `setRoundScores` was called?

**Finding:** Re-entry correctly shows submitted values.

When `setRoundScores(scores)` runs, it calls `setTeamRoundScoreEngine` per team, updating `team.roundScores[currentRound]`. If the presenter navigates back to `round_scoring`, the panel remounts and the initializer reads the committed (submitted) values. The presenter sees their previous submission and can adjust.

**Verdict:** Correct and desirable behavior.

### Q4: Round 2+ — does `roundScores[1]` exist?

**Finding:** May be undefined if the array hasn't been padded yet.

`padRoundScores` expands the array before mutations, but the pre-fill logic reads `team.roundScores[currentRound]` directly. If `roundScores.length < currentRound + 1`, the access returns `undefined`.

**Verdict:** The `committed !== undefined` check handles this correctly. No change needed.

### Q5: Does `onProgressChange` fire with pre-filled values on mount?

**Finding:** Yes — the audience display immediately shows pre-filled values.

The `onProgressChange` callback runs in a `useEffect` with `[entries, onProgressChange]` deps. On mount, `entries` is initialized with pre-filled values, the effect fires, and `updateRoundScoringProgress(entries)` syncs to the audience via BroadcastChannel.

**Implication:** The audience's "Scoring in Progress" screen will show pre-filled entry counts immediately on scene entry. This means if 4 out of 5 teams have quick-score values, the audience sees "4 of 5 entered" before the presenter touches anything.

**Assessment:** This is acceptable and arguably desirable — it shows the audience that scoring is progressing. The audience display (`RoundScoringScene.tsx`) uses `Object.keys(roundScoringEntries).length` for the count. Pre-filled values flow through `onProgressChange` which filters out null values, so only teams with actual scores appear in the count.

## Additional Observations

### Undo behavior with pre-fill
- On mount, undo stack is empty
- If presenter modifies a pre-filled value, the undo stack captures the pre-filled value as `previousValue`
- Ctrl+Z restores the pre-filled value, not null
- This is correct — pre-fill values are the "starting state" for undo purposes

### Clear button behavior
- Current `handleClear` resets all entries to null
- With pre-fill, Clear should arguably reset to pre-filled values (not null) to match the "fresh state" semantics
- **Recommendation:** Update `handleClear` to reset to initial pre-fill values. Store the initial values in a `useRef` for comparison.

### Submit with unchanged pre-fill
- If presenter clicks Done without changing any pre-filled values, `handleSubmit` sends the pre-filled values as scores
- `setRoundScores` writes them to `team.roundScores[currentRound]` — same values that were already there
- This is a no-op in terms of data (idempotent write). No harm.

## Verdict

**The proposed guard `(committed !== undefined && committed > 0)` is correct.** No adjustments needed.

Minor enhancement: update `handleClear` to reset to pre-fill values rather than null. This ensures the presenter can undo all their changes back to the quick-score baseline.

## Confidence
**High.** All edge cases verified against code. Engine guarantees make negative/undefined cases safe.
