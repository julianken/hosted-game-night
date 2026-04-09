# Area 2: State Management — RoundScoringPanel Pre-Fill and State Survival

**Role:** State Manager
**Date:** 2026-03-06
**Scope:** `RoundScoringPanel` local state, Zustand store fields, and the
tradeoffs between three concrete approaches for pre-fill and remount
survival.

---

## 1. Current State Inventory

### 1.1 Component-local state (RoundScoringPanel.tsx)

```
entries:    Record<string, number | null>   // one slot per team, null = unentered
undoStack:  UndoEntry[]                     // { teamId, previousValue } stack
```

**Derived (not state):**
```
enteredCount = Object.values(entries).filter(v => v !== null).length
allEntered   = enteredCount === teams.length
```

**Initialization:** `useState` lazy initializer sets every `team.id` to
`null`. There is no read of `team.roundScores[currentRound]` — this is the
pre-fill gap.

**Sync path:** `useEffect` on `entries` calls `onProgressChange(filled)`,
which flows to `store.updateRoundScoringProgress(entries)`. That sets
`roundScoringEntries: Record<string, number>` in Zustand (note: no `null`
values; only entered scores appear).

**Undo mechanics:** `handleScoreChange` pushes `{ teamId, previousValue:
entries[teamId] }` onto the stack *before* mutating entries. `handleUndo`
pops the last entry and restores `entries[teamId]` to
`previousValue`. Both `undoStack` and `entries` are co-located in the
component and fully synchronized by design.

### 1.2 Zustand store fields (game-store.ts / TriviaGameState)

| Field | Type | Lifecycle |
|---|---|---|
| `roundScoringInProgress` | `boolean` | Set `true` when scene transitions to `round_scoring` (scene-transitions.ts:302); set `false` when `setRoundScores` resolves |
| `roundScoringEntries` | `Record<string, number>` | Cleared to `{}` on scene entry; progressively filled by `updateRoundScoringProgress`; cleared back to `{}` on `setRoundScores` |
| `team.roundScores` | `number[]` | Permanent per-round history; index is 0-based round number; set atomically by `setRoundScores` via `setTeamRoundScoreEngine` |

**Key insight:** `roundScoringEntries` is NOT an undo-aware draft — it is
a one-way progress mirror for the audience display (`RoundScoringScene.tsx`
reads it). It does not carry `null` for unentered teams. It cannot be used
directly to restore undo state.

**Key insight:** `team.roundScores[currentRound]` is the committed,
post-submit value. It is non-zero only after a previous `setRoundScores`
call for that round. In a first-time scoring flow it will be `0` (padded
by `padRoundScores`). In a re-entry flow (facilitator navigates back to
`round_scoring` after a mistake), it carries the prior committed score.

### 1.3 Where is this state?

Characteristic question #1 — "Where should this state live?" — splits by
concern:

- `entries` + `undoStack`: Ephemeral UI draft state. Currently **component
  local**. The only consumer is the panel itself.
- `roundScoringEntries`: Audience-facing progress mirror. Lives in
  **Zustand** and syncs via BroadcastChannel.
- `team.roundScores`: Permanent game record. Lives in **Zustand**.

---

## 2. Remount Analysis

### When does RoundScoringPanel remount?

The panel is rendered in `play/page.tsx` under:

```tsx
{game.status === 'between_rounds' && isRoundScoringScene && (
  <RoundScoringPanel ... />
)}
```

A remount happens when:

1. **Scene change:** `audienceScene` leaves `round_scoring` (e.g., the
   facilitator accidentally clicks Next, then navigates back). The
   component unmounts and remounts. Local `entries` and `undoStack` are
   destroyed.
2. **Relocation:** If the panel is moved to a modal or drawer, any
   conditional render gate will remount it.
3. **Page reload / hot module replacement:** Local state is always lost;
   Zustand state persists if the store is a singleton.

**Current behavior on remount:** All entries reset to `null`, undo stack
is empty. If `team.roundScores[currentRound]` was `> 0` (from a prior
partial submit or a back-navigation situation), the panel shows blank
inputs even though committed data exists.

---

## 3. Characteristic Questions Applied

**"Is this state derived or independent?"**
`entries` is independent draft state — it is not derivable from
`roundScoringEntries` because that field omits `null` (unentered) teams.
It IS derivable from `team.roundScores[currentRound]` for the pre-fill
case — but only as an initial value, not as a live derivation.

**"What is the cache invalidation strategy?"**
`roundScoringEntries` is invalidated (cleared to `{}`) on every scene
entry to `round_scoring` (`scene-transitions.ts:303`) and again on
`setRoundScores` completion. This means the audience display always starts
fresh per scoring session. Any lifted draft must follow the same
invalidation boundary.

**"Where should this state live?"**
Answered per option below.

---

## 4. Option A: Pre-Fill Only (Keep Local State)

**Philosophy:** Minimal change. Local state is appropriate for ephemeral
UI drafts. The only missing piece is initial population.

### What changes

In `RoundScoringPanel.tsx`, change the `useState` lazy initializer:

```tsx
// BEFORE
const [entries, setEntries] = useState<Record<string, number | null>>(() => {
  const initial: Record<string, number | null> = {};
  for (const team of teams) {
    initial[team.id] = null;
  }
  return initial;
});

// AFTER
const [entries, setEntries] = useState<Record<string, number | null>>(() => {
  const initial: Record<string, number | null> = {};
  for (const team of teams) {
    const committed = team.roundScores?.[currentRound];
    initial[team.id] = (committed !== undefined && committed > 0) ? committed : null;
  }
  return initial;
});
```

No prop changes. No store changes.

### Undo behavior

Unchanged. The pre-filled values are simply the starting state of the undo
chain. If a facilitator edits a pre-filled value and then undoes, they
recover the pre-filled value (i.e., the committed score), not `null`. This
is correct.

### Advance-without-save

If the facilitator advances past `round_scoring` without clicking Done,
`entries` is discarded on unmount. The audience sees a brief progress state
and then the scene moves on. No partial data is committed. `setRoundScores`
is never called so `team.roundScores` is untouched. This is safe.

### Interaction with setRoundScores

No change. `handleSubmit` collects `entries` and passes them to
`onSubmitScores`, which calls `store.setRoundScores`. The store then calls
`setTeamRoundScoreEngine` per team and clears `roundScoringInProgress` and
`roundScoringEntries`.

### Back-navigation re-entry

On remount, the lazy initializer runs again and reads
`team.roundScores[currentRound]` from current store state. If a prior
`setRoundScores` already ran (unlikely in back-nav, but possible if the
facilitator submitted, moved forward, then used keyboard to re-enter the
scene), the inputs will pre-fill with the committed scores. If no
`setRoundScores` has run yet (the facilitator is re-entering before
committing), inputs will be blank again because `roundScores[currentRound]`
is still `0`.

**This is the critical limitation of Option A.** In-progress entries
entered before a nav-away are lost. The panel cannot recover partial
in-flight work from a remount.

### Verdict

Correct for the stated goal of pre-fill. Does not solve remount survival.
Appropriate when: (a) the panel is in a stable position that never
conditionally unmounts mid-flow, and (b) back-navigation into an
in-progress scoring session is not an expected user pattern.

---

## 5. Option B: Lift Entries to Store (New `roundScoringDraftEntries` Field)

**Philosophy:** State that must survive component remounts belongs in a
store. The undo stack is part of the draft, so it also lifts.

### What changes

**`apps/trivia/src/types/index.ts`** — add to `TriviaGameState`:

```ts
/**
 * Draft entries for the round_scoring UI, including null for unentered teams.
 * Distinct from roundScoringEntries (audience mirror). Null entries are
 * preserved here so the panel can distinguish "unentered" from "zero".
 * Cleared on scene entry and on setRoundScores completion.
 */
roundScoringDraftEntries: Record<string, number | null>;

/**
 * Undo stack for the round_scoring UI. Each entry records the teamId and
 * the value that existed before the edit. Cleared on scene entry and on
 * setRoundScores completion.
 */
roundScoringUndoStack: Array<{ teamId: string; previousValue: number | null }>;
```

**`apps/trivia/src/stores/game-store.ts`** — add actions:

```ts
setRoundScoringDraft: (entries: Record<string, number | null>, undoStack: Array<...>) => void;
```

```ts
setRoundScoringDraft: (entries, undoStack) => {
  set({ roundScoringDraftEntries: entries, roundScoringUndoStack: undoStack });
},
```

**`scene-transitions.ts`** — in the `round_scoring` entry block, also set
initial draft from `team.roundScores`:

```ts
if (nextScene === 'round_scoring') {
  const draftEntries: Record<string, number | null> = {};
  for (const team of state.teams) {
    const committed = team.roundScores?.[state.currentRound];
    draftEntries[team.id] = (committed !== undefined && committed > 0) ? committed : null;
  }
  return {
    ...buildSceneUpdate(nextScene),
    roundScoringInProgress: true,
    roundScoringEntries: {},
    roundScoringDraftEntries: draftEntries,
    roundScoringUndoStack: [],
    recapShowingAnswer: null,
  };
}
```

**`RoundScoringPanel.tsx`** — replace `useState` with store reads; write
back to store on every change:

```tsx
const draftEntries = useGameStore((s) => s.roundScoringDraftEntries);
const undoStack = useGameStore((s) => s.roundScoringUndoStack);
const setDraft = useGameStore((s) => s.setRoundScoringDraft);

const handleScoreChange = useCallback((teamId: string, value: string) => {
  const numValue = value === '' ? null : Math.max(0, parseInt(value, 10));
  if (value !== '' && isNaN(parseInt(value, 10))) return;
  const newUndo = [...undoStack, { teamId, previousValue: draftEntries[teamId] ?? null }];
  const newEntries = { ...draftEntries, [teamId]: numValue };
  setDraft(newEntries, newUndo);
}, [draftEntries, undoStack, setDraft]);

const handleUndo = useCallback(() => {
  if (undoStack.length === 0) return;
  const last = undoStack[undoStack.length - 1];
  setDraft(
    { ...draftEntries, [teamId]: last.previousValue },
    undoStack.slice(0, -1)
  );
}, [draftEntries, undoStack, setDraft]);
```

`entries` is no longer local `useState` — it reads directly from the store.

### Undo behavior

Fully store-backed. Undo state survives remount. The undo stack in the
store is always consistent with `roundScoringDraftEntries` because both
are written atomically in `setRoundScoringDraft`.

### Advance-without-save

The draft and undo stack persist in the store even after the component
unmounts. If the facilitator advances and returns, all in-flight work is
recovered. To discard draft on a true advance-without-save (where the scene
leaves `round_scoring` permanently), the `scene-transitions.ts` handler for
scenes *leaving* `round_scoring` must clear the draft fields — or
alternatively, `setRoundScores` already clears them on submit.

A scene exit without submit (advance past `round_scoring` via the N key,
for example) does not currently call any cleanup. Option B requires an
explicit cleanup action: either (a) `advanceScene` clears draft fields when
transitioning away from `round_scoring`, or (b) the draft is left stale
and re-seeded on the next scene entry (the `scene-transitions.ts` seed
always resets it).

**Chosen approach:** Re-seed on entry is sufficient. The next time the
facilitator enters `round_scoring`, `scene-transitions.ts` overwrites the
draft with fresh values. Stale draft from a prior abandoned session is
overwritten atomically.

### Interaction with setRoundScores

`setRoundScores` currently clears `roundScoringEntries: {}`. It must also
clear the draft fields:

```ts
// in setRoundScores resolver
return {
  ...newState,
  scoreDeltas: [...deltas],
  roundScoringInProgress: false,
  roundScoringEntries: {},
  roundScoringDraftEntries: {},   // ADD
  roundScoringUndoStack: [],      // ADD
};
```

### sync / hydration implications

Both new fields appear in `TriviaGameState`, so they are included in
`_hydrate` automatically. They also flow through `use-sync.ts` (which
spreads all state). However, the audience display does not consume
`roundScoringDraftEntries` — only the presenter does. Consider marking
them presenter-only in comments so future sync pruning can exclude them.
They are small objects (N teams, small values), so sync cost is negligible.

### Store shape colocation question

`roundScoringDraftEntries` and `roundScoringUndoStack` are collocated
with `roundScoringEntries` in the game store. This is correct: they share
the same invalidation boundary (scene entry and `setRoundScores`), and
they describe the same round_scoring moment in game state.

### Verdict

Full solution. Survives remount, preserves undo history, handles relocation.
Cost: two new store fields + store type changes + scene-transitions update +
component rewrite from `useState` to store reads. Adds surface area to
`TriviaGameState`, which flows through guards, tests, and all test
factories. Appropriate when: remount survival or relocation is required.

---

## 6. Option C: Lift Entries to Store via `roundScoringEntries` (Minimal Store Changes)

**Philosophy:** Reuse the existing `roundScoringEntries` field to carry
draft state, eliminating the need for a second field. Accept the limitation
that `null` (unentered) values cannot be represented (the existing field
is `Record<string, number>`, no nulls).

### Key constraint

`roundScoringEntries` is `Record<string, number>` — it cannot represent
"unentered" vs "zero". The audience display (`RoundScoringScene.tsx`) uses
`Object.keys(roundScoringEntries).length` for `enteredCount`. If the panel
writes `0` for an unentered team, the audience display will count it as
entered.

This means the component must maintain the distinction locally: it reads
from `roundScoringEntries` as the initial value, but tracks `null` (unentered)
in its own local `useState`. The local state is now a projection of the store
state — pre-filled on mount, written back to the store (without nulls) as
the user types.

### What changes

**`RoundScoringPanel.tsx`** — change the lazy initializer to read from the
store:

```tsx
// Caller passes roundScoringEntries as a new prop
const [entries, setEntries] = useState<Record<string, number | null>>(() => {
  const initial: Record<string, number | null> = {};
  for (const team of teams) {
    const inProgress = roundScoringEntries[team.id];
    const committed = team.roundScores?.[currentRound];
    if (inProgress !== undefined) {
      initial[team.id] = inProgress;  // recover in-progress value
    } else if (committed !== undefined && committed > 0) {
      initial[team.id] = committed;   // pre-fill from committed
    } else {
      initial[team.id] = null;        // unentered
    }
  }
  return initial;
});
```

**`RoundScoringPanelProps`** — add:

```ts
roundScoringEntries?: Record<string, number>;
```

**`play/page.tsx`** — pass the store value:

```tsx
<RoundScoringPanel
  teams={game.teams}
  currentRound={game.currentRound}
  roundScoringEntries={roundScoringEntriesFromStore}
  onSubmitScores={handleRoundScoresSubmitted}
  onProgressChange={handleRoundScoringProgress}
/>
```

The undo stack remains local `useState` — it is not recoverable on remount
in this option.

### Undo behavior

Local only. Undo stack is lost on remount. This is a partial solution.

### Advance-without-save

`roundScoringEntries` persists in the store and is cleared on scene entry.
On a back-navigation within the same scene entry (remount without scene
re-entry), the stored entries act as a recovery source. On a full scene
exit and re-entry, `scene-transitions.ts` clears `roundScoringEntries` to
`{}` so recovery does not persist across scene boundaries.

### Interaction with setRoundScores

No change needed. `setRoundScores` already clears `roundScoringEntries: {}`
on completion.

### Null representation gap

The audience display counts `Object.keys(roundScoringEntries).length` as
`enteredCount`. If the panel writes `0` for a team to the store, the
audience will show it as entered (which is arguably correct — `0` is a
valid score). The panel's local state retains `null` for visual distinction
(no border color, no count increment in panel). This asymmetry is
acceptable because the audience display's count does not need to distinguish
"entered as zero" from "entered as non-zero".

### Verdict

Partial solution. Recovers in-progress values across remounts (within the
same scene entry) without adding new store fields. Undo history is still
lost on remount. Type mismatch between `Record<string, number>` (store)
and `Record<string, number | null>` (local) requires careful seeding logic
but no type changes. Appropriate when: remount recovery of entered values
is needed but undo history loss on remount is acceptable, and store
schema expansion is undesirable.

---

## 7. Comparison Table

| Dimension | Option A (Pre-fill only) | Option B (Full lift) | Option C (Reuse field) |
|---|---|---|---|
| Pre-fill from committed scores | Yes | Yes (via scene entry seed) | Yes |
| Recover in-progress on remount | No | Yes | Yes (same scene entry only) |
| Undo history survives remount | No | Yes | No |
| New store fields | 0 | 2 | 0 |
| Type changes to TriviaGameState | 0 | 2 fields | 0 |
| Scene-transitions.ts changes | 0 | Add draft seed | 0 |
| setRoundScores changes | 0 | Clear 2 fields | 0 |
| Component complexity | Low | Medium (store reads) | Medium (dual-source init) |
| Test factory impact | 0 | All test factories need new fields | 0 |
| Sync payload increase | None | Minor (2 small objects) | None |
| Audience display consistency | Unchanged | Unchanged | `enteredCount` behavior changes for `0` scores (acceptable) |

---

## 8. Recommendation

**For the pre-fill requirement alone:** Option A. One-line change in the
lazy initializer. No store changes, no type changes, no test factory
updates. The lazy initializer in React runs exactly once on mount so there
is no reactivity concern — `team.roundScores[currentRound]` is a stable
read at mount time.

**For remount survival:** Option B with a scoped guard. The two new fields
(`roundScoringDraftEntries`, `roundScoringUndoStack`) belong in the store
because they share the exact same invalidation boundary as the existing
`roundScoringEntries` field — both are cleared on scene entry and on
`setRoundScores`. The colocation is clean. The undo stack must be in the
store if it is to survive a remount at all; there is no way to persist it
across a React unmount without external storage.

**Avoid Option C as a final state.** It recovers values but silently drops
undo history, which violates the principle of least surprise for the
facilitator. Its only advantage over Option B is avoiding two new type
fields — a low cost that does not outweigh the incomplete behavior.

**Implementation order if doing both pre-fill and survival:**

1. Implement Option A first (zero risk, immediate value).
2. Validate whether remount scenarios actually occur in practice (the panel
   currently only unmounts when the scene changes, which the facilitator
   intentionally triggers).
3. If remount scenarios are confirmed, implement Option B on top of A —
   Option A's lazy initializer logic moves into `scene-transitions.ts` as
   the draft seed, and the component switches from `useState` to store
   selectors.

---

## 9. Files Affected

| File | Option A | Option B | Option C |
|---|---|---|---|
| `apps/trivia/src/components/presenter/RoundScoringPanel.tsx` | initializer only | full rewrite to store reads | initializer + new prop |
| `apps/trivia/src/types/index.ts` | no | add 2 fields to TriviaGameState | no |
| `apps/trivia/src/stores/game-store.ts` | no | add action + clear in setRoundScores | no |
| `apps/trivia/src/lib/game/scene-transitions.ts` | no | add draft seed at round_scoring entry | no |
| `apps/trivia/src/app/play/page.tsx` | no | no | pass new prop |
| Test factories (all files with `roundScoringInProgress`) | no | add 2 fields to fixtures | no |
