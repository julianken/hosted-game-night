# Bingo Display Audio Sequencing Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the broken bingo ball audio sequence when the display window is open, so the display plays roll sound → reveal chime → ball voice in order, and both the presenter and display visually reveal the ball at the same time (matching current local-only behavior).

**Architecture:** Move the audio call sequence from the presenter to the display. Replace the three fire-and-forget broadcasts (`PLAY_ROLL_SOUND`, `PLAY_REVEAL_CHIME`, `PLAY_BALL_VOICE`) with a single `PLAY_BALL_SEQUENCE` message carrying the ball. The display runs the `await`-based sequence locally. The display signals back via `BALL_REVEAL_READY` (trigger for presenter to commit the ball) and `BALL_SEQUENCE_COMPLETE` (unblock presenter's `isProcessing` and auto-call scheduling). Both sides use a local `revealedBall` concept: the display has its own React state, and the presenter's state comes from the game store's `currentBall` (unchanged there). A peek-then-broadcast-then-commit ordering guarantees `PLAY_BALL_SEQUENCE` reaches the channel before `GAME_STATE_UPDATE`.

**Tech Stack:** Next.js 16 App Router, React 19, Zustand 5, BroadcastChannel API, `@joolie-boolie/sync`, Vitest 4 + Testing Library

---

## Context — Read First

Current broken behavior (from investigation):

`apps/bingo/src/hooks/use-game.ts:32-60` contains `executeCallSequence`. The local path `await`s each audio step (`playRollSound` → ball commit → 400ms → `playRevealChime` → `playBallVoice`), which works correctly. The broadcast path calls `audioBroadcast.broadcastPlayRollSound()`, `broadcastPlayRevealChime()`, `broadcastPlayBallVoice()` — all fire-and-forget — so the display receives all three messages within ~400ms. The display plays all three sounds simultaneously instead of sequentially.

`packages/sync/src/broadcast.ts:369` confirms `send()` returns `void`, not a Promise.

The ball also visually reveals on the display too early: `callBallFn()` fires immediately in the broadcast path, `GAME_STATE_UPDATE` broadcasts ~1ms later, display hydrates and shows the new ball while the roll sound is still playing.

**User explicitly requires:** the display is the audio authority (no audio should play on the presenter when display is open). The presenter's ball reveal must happen at the same moment as the display's reveal, matching the current local-only behavior (ball appears after roll sound ends).

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `apps/bingo/src/types/index.ts` | modify | Replace 3 `PLAY_*` message types with `PLAY_BALL_SEQUENCE`, add `BALL_REVEAL_READY` and `BALL_SEQUENCE_COMPLETE` |
| `apps/bingo/src/hooks/use-sync.ts` | modify | `BingoBroadcastSync` gains `broadcastPlayBallSequence`, `waitForReveal()`, `waitForComplete()`; router handles new incoming types; remove old per-sound broadcast/receive handlers; add `onPlayBallSequence` option to `useSync` |
| `apps/bingo/src/hooks/use-game.ts` | modify | Rewrite broadcast branch of `executeCallSequence` with peek → await reveal → commit → await complete pattern; update `AudioBroadcast` interface to single async method |
| `apps/bingo/src/app/play/page.tsx` | modify | Rewire `audioBroadcast` object to new shape |
| `apps/bingo/src/app/display/page.tsx` | modify | Add `revealedBall` state, `sequenceRunningRef`, `handleBallSequence` callback passed into `useSync`, effect to sync `revealedBall ← currentBall` only when no sequence is running, pass `revealedBall` to `<BallReveal>` instead of `currentBall` |
| `apps/bingo/src/hooks/__tests__/use-game.test.ts` | modify | Add broadcast-path tests |
| `apps/bingo/src/hooks/__tests__/use-sync.test.ts` | modify | Add sequence round-trip tests (if this file exists; otherwise skip and rely on use-game tests) |

---

## Task 1: Update sync message types

**Files:**
- Modify: `apps/bingo/src/types/index.ts:102-115,144-157`

- [ ] **Step 1: Update `SyncMessageType` union**

Replace the three `PLAY_*` entries with the new types.

In `apps/bingo/src/types/index.ts`, change lines 102-115 from:

```typescript
export type SyncMessageType =
  | 'GAME_STATE_UPDATE'
  | 'BALL_CALLED'
  | 'GAME_RESET'
  | 'PATTERN_CHANGED'
  | 'REQUEST_SYNC'
  | 'AUDIO_SETTINGS_CHANGED'
  | 'DISPLAY_THEME_CHANGED'
  | 'CHANNEL_READY'
  | 'PLAY_ROLL_SOUND'
  | 'PLAY_REVEAL_CHIME'
  | 'PLAY_BALL_VOICE'
  | 'AUDIO_UNLOCKED'
  | 'DISPLAY_CLOSING';
```

To:

```typescript
export type SyncMessageType =
  | 'GAME_STATE_UPDATE'
  | 'BALL_CALLED'
  | 'GAME_RESET'
  | 'PATTERN_CHANGED'
  | 'REQUEST_SYNC'
  | 'AUDIO_SETTINGS_CHANGED'
  | 'DISPLAY_THEME_CHANGED'
  | 'CHANNEL_READY'
  | 'PLAY_BALL_SEQUENCE'
  | 'BALL_REVEAL_READY'
  | 'BALL_SEQUENCE_COMPLETE'
  | 'AUDIO_UNLOCKED'
  | 'DISPLAY_CLOSING';
```

- [ ] **Step 2: Update `BingoSyncMessage` discriminated union**

In `apps/bingo/src/types/index.ts`, change lines 144-157 from:

```typescript
export type BingoSyncMessage =
  | (SyncMessageBase & { type: 'GAME_STATE_UPDATE'; payload: GameState })
  | (SyncMessageBase & { type: 'BALL_CALLED'; payload: BingoBall })
  | (SyncMessageBase & { type: 'GAME_RESET'; payload: null })
  | (SyncMessageBase & { type: 'PATTERN_CHANGED'; payload: BingoPattern })
  | (SyncMessageBase & { type: 'REQUEST_SYNC'; payload: null })
  | (SyncMessageBase & { type: 'AUDIO_SETTINGS_CHANGED'; payload: AudioSettingsPayload })
  | (SyncMessageBase & { type: 'DISPLAY_THEME_CHANGED'; payload: ThemePayload })
  | (SyncMessageBase & { type: 'CHANNEL_READY'; payload: null })
  | (SyncMessageBase & { type: 'PLAY_ROLL_SOUND'; payload: null })
  | (SyncMessageBase & { type: 'PLAY_REVEAL_CHIME'; payload: null })
  | (SyncMessageBase & { type: 'PLAY_BALL_VOICE'; payload: BingoBall })
  | (SyncMessageBase & { type: 'AUDIO_UNLOCKED'; payload: null })
  | (SyncMessageBase & { type: 'DISPLAY_CLOSING'; payload: null });
```

To:

```typescript
export type BingoSyncMessage =
  | (SyncMessageBase & { type: 'GAME_STATE_UPDATE'; payload: GameState })
  | (SyncMessageBase & { type: 'BALL_CALLED'; payload: BingoBall })
  | (SyncMessageBase & { type: 'GAME_RESET'; payload: null })
  | (SyncMessageBase & { type: 'PATTERN_CHANGED'; payload: BingoPattern })
  | (SyncMessageBase & { type: 'REQUEST_SYNC'; payload: null })
  | (SyncMessageBase & { type: 'AUDIO_SETTINGS_CHANGED'; payload: AudioSettingsPayload })
  | (SyncMessageBase & { type: 'DISPLAY_THEME_CHANGED'; payload: ThemePayload })
  | (SyncMessageBase & { type: 'CHANNEL_READY'; payload: null })
  | (SyncMessageBase & { type: 'PLAY_BALL_SEQUENCE'; payload: BingoBall })
  | (SyncMessageBase & { type: 'BALL_REVEAL_READY'; payload: null })
  | (SyncMessageBase & { type: 'BALL_SEQUENCE_COMPLETE'; payload: null })
  | (SyncMessageBase & { type: 'AUDIO_UNLOCKED'; payload: null })
  | (SyncMessageBase & { type: 'DISPLAY_CLOSING'; payload: null });
```

- [ ] **Step 3: Typecheck to see expected breakage**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm typecheck --filter=@joolie-boolie/bingo`
Expected: Errors in `use-sync.ts` and `use-game.ts` for the removed `PLAY_ROLL_SOUND`, `PLAY_REVEAL_CHIME`, `PLAY_BALL_VOICE` cases in the discriminated union router and the broadcast methods. These are expected — Tasks 2-5 will fix them.

- [ ] **Step 4: Commit**

```bash
git add apps/bingo/src/types/index.ts
git commit -m "types(bingo): replace per-sound sync messages with PLAY_BALL_SEQUENCE + ack types"
```

---

## Task 2: Write failing test for `executeCallSequence` broadcast path

**Files:**
- Modify: `apps/bingo/src/hooks/__tests__/use-game.test.ts`

This task adds tests BEFORE implementation. The tests will fail (red) until Task 4 is done.

- [ ] **Step 1: Read existing test file for context**

Read: `apps/bingo/src/hooks/__tests__/use-game.test.ts`

Find where `executeCallSequence` or `callBall` is tested. Look for how the audio store is mocked.

- [ ] **Step 2: Add new describe block for broadcast path**

Append this describe block at the end of the test file, inside the top-level `describe('useGame', ...)` block (or at file level if there's no wrapping describe):

```typescript
describe('executeCallSequence broadcast path (display audio active)', () => {
  let broadcastPlayBallSequenceMock: ReturnType<typeof vi.fn>;
  let waitForRevealMock: ReturnType<typeof vi.fn>;
  let waitForCompleteMock: ReturnType<typeof vi.fn>;
  let resolveReveal: () => void;
  let resolveComplete: () => void;

  beforeEach(() => {
    broadcastPlayBallSequenceMock = vi.fn();
    waitForRevealMock = vi.fn(
      () => new Promise<void>((r) => { resolveReveal = r; })
    );
    waitForCompleteMock = vi.fn(
      () => new Promise<void>((r) => { resolveComplete = r; })
    );
  });

  it('broadcasts PLAY_BALL_SEQUENCE with the next ball BEFORE committing state', async () => {
    // Arrange: start a game
    const { result } = renderHook(() =>
      useGame({
        audioBroadcast: {
          broadcastPlayBallSequence: broadcastPlayBallSequenceMock,
          waitForReveal: waitForRevealMock,
          waitForComplete: waitForCompleteMock,
        },
        displayAudioActive: true,
      })
    );
    act(() => {
      result.current.startGame();
    });
    const initialCalled = result.current.calledBalls.length;
    const expectedNextBall = useGameStore.getState().remainingBalls[0];

    // Act: call ball
    const callPromise = act(async () => {
      await result.current.callBall();
    });

    // Before reveal ack: broadcast should have fired with the peeked ball
    //   and state should NOT have been committed yet.
    await waitFor(() => {
      expect(broadcastPlayBallSequenceMock).toHaveBeenCalledWith(expectedNextBall);
    });
    expect(result.current.calledBalls.length).toBe(initialCalled);

    // Resolve reveal ack → state commits
    resolveReveal();
    await waitFor(() => {
      expect(result.current.calledBalls.length).toBe(initialCalled + 1);
    });

    // Resolve complete ack → callBall resolves
    resolveComplete();
    await callPromise;
  });

  it('does not broadcast when audio is disabled (falls through to direct commit)', async () => {
    const { result } = renderHook(() =>
      useGame({
        audioBroadcast: {
          broadcastPlayBallSequence: broadcastPlayBallSequenceMock,
          waitForReveal: waitForRevealMock,
          waitForComplete: waitForCompleteMock,
        },
        displayAudioActive: true,
      })
    );
    act(() => {
      result.current.startGame();
      result.current.toggleAudio(); // disable
    });

    await act(async () => {
      await result.current.callBall();
    });

    expect(broadcastPlayBallSequenceMock).not.toHaveBeenCalled();
    expect(result.current.calledBalls.length).toBe(1);
  });

  it('awaits both reveal and complete acks in order', async () => {
    const { result } = renderHook(() =>
      useGame({
        audioBroadcast: {
          broadcastPlayBallSequence: broadcastPlayBallSequenceMock,
          waitForReveal: waitForRevealMock,
          waitForComplete: waitForCompleteMock,
        },
        displayAudioActive: true,
      })
    );
    act(() => {
      result.current.startGame();
    });

    let callResolved = false;
    act(() => {
      void result.current.callBall().then(() => { callResolved = true; });
    });

    // Wait for broadcast to fire
    await waitFor(() => {
      expect(waitForRevealMock).toHaveBeenCalled();
    });
    expect(waitForCompleteMock).toHaveBeenCalled();
    expect(callResolved).toBe(false);

    resolveReveal();
    await Promise.resolve();
    expect(callResolved).toBe(false); // still waiting on complete

    resolveComplete();
    await waitFor(() => {
      expect(callResolved).toBe(true);
    });
  });
});
```

If the existing test file uses `import { waitFor, act } from '@testing-library/react'` already, reuse that. If `beforeEach` imports differ, adapt to the file's existing style.

- [ ] **Step 3: Run the test to see it fail**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm --filter=@joolie-boolie/bingo test:run src/hooks/__tests__/use-game.test.ts`
Expected: The new describe block fails with TypeScript errors on the `audioBroadcast` shape (old vs. new interface) — that's OK. If the existing tests still pass, proceed.

- [ ] **Step 4: Commit**

```bash
git add apps/bingo/src/hooks/__tests__/use-game.test.ts
git commit -m "test(bingo): add failing tests for executeCallSequence broadcast path"
```

---

## Task 3: Implement `broadcastPlayBallSequence`, `waitForReveal`, `waitForComplete` in `BingoBroadcastSync`

**Files:**
- Modify: `apps/bingo/src/hooks/use-sync.ts`

- [ ] **Step 1: Add new methods to `BingoBroadcastSync` class**

In `apps/bingo/src/hooks/use-sync.ts`, replace the three broadcast methods `broadcastPlayRollSound`, `broadcastPlayRevealChime`, `broadcastPlayBallVoice` (lines 46-56) with these new methods. Keep the `broadcastDisplayClosing` method that follows.

Remove this block:

```typescript
  broadcastPlayRollSound(): void {
    this.send('PLAY_ROLL_SOUND', null);
  }

  broadcastPlayRevealChime(): void {
    this.send('PLAY_REVEAL_CHIME', null);
  }

  broadcastPlayBallVoice(ball: BingoBall): void {
    this.send('PLAY_BALL_VOICE', ball);
  }
```

Add this block in its place:

```typescript
  broadcastPlayBallSequence(ball: BingoBall): void {
    this.send('PLAY_BALL_SEQUENCE', ball);
  }

  broadcastBallRevealReady(): void {
    this.send('BALL_REVEAL_READY', null);
  }

  broadcastBallSequenceComplete(): void {
    this.send('BALL_SEQUENCE_COMPLETE', null);
  }
```

- [ ] **Step 2: Update message router**

In `apps/bingo/src/hooks/use-sync.ts`, update `createMessageRouter`:

Replace these handler option keys (in the handlers object and switch statement, lines 85-133):

```typescript
  onPlayRollSound: () => void;
  onPlayRevealChime: () => void;
  onPlayBallVoice: (ball: BingoBall) => void;
```

With:

```typescript
  onPlayBallSequence: (ball: BingoBall) => void;
  onBallRevealReady: () => void;
  onBallSequenceComplete: () => void;
```

Replace these switch cases:

```typescript
      case 'PLAY_ROLL_SOUND':
        handlers.onPlayRollSound?.();
        break;
      case 'PLAY_REVEAL_CHIME':
        handlers.onPlayRevealChime?.();
        break;
      case 'PLAY_BALL_VOICE':
        handlers.onPlayBallVoice?.(message.payload);
        break;
```

With:

```typescript
      case 'PLAY_BALL_SEQUENCE':
        handlers.onPlayBallSequence?.(message.payload);
        break;
      case 'BALL_REVEAL_READY':
        handlers.onBallRevealReady?.();
        break;
      case 'BALL_SEQUENCE_COMPLETE':
        handlers.onBallSequenceComplete?.();
        break;
```

- [ ] **Step 3: Add `onPlayBallSequence` option to `useSync`**

In `apps/bingo/src/hooks/use-sync.ts`, update the `UseSyncOptions` interface (around line 137):

```typescript
interface UseSyncOptions {
  role: SyncRole;
  sessionId: string;
  /** Whether audio has been unlocked on the display window (audience role only) */
  displayAudioUnlocked?: boolean;
  /** Callback invoked on the audience when a PLAY_BALL_SEQUENCE message arrives.
   *  Must return a Promise that resolves when the full display-side sequence
   *  (roll → reveal → chime → voice) is complete. */
  onPlayBallSequence?: (ball: BingoBall) => Promise<void>;
}
```

Update the hook signature:

```typescript
export function useSync({ role, sessionId, displayAudioUnlocked, onPlayBallSequence }: UseSyncOptions) {
```

- [ ] **Step 4: Replace audience audio handlers in the router subscription**

In the `router` creation inside the init `useEffect` (around lines 301-316), replace:

```typescript
      // Audio playback handlers (audience/display receives these from presenter)
      onPlayRollSound: () => {
        if (role !== 'audience') return;
        const audioStore = useAudioStore.getState();
        audioStore.playRollSound();
      },
      onPlayRevealChime: () => {
        if (role !== 'audience') return;
        const audioStore = useAudioStore.getState();
        audioStore.playRevealChime();
      },
      onPlayBallVoice: (ball) => {
        if (role !== 'audience') return;
        const audioStore = useAudioStore.getState();
        audioStore.playBallVoice(ball);
      },
```

With:

```typescript
      // Audience runs the full audio sequence locally, awaiting each step.
      // After the roll completes it acks BALL_REVEAL_READY (presenter commits
      // the ball then). After chime+voice finish it acks BALL_SEQUENCE_COMPLETE.
      onPlayBallSequence: async (ball) => {
        if (role !== 'audience') return;
        const callback = onPlayBallSequenceRef.current;
        if (!callback) return;
        try {
          await callback(ball);
        } finally {
          sync.broadcastBallSequenceComplete();
        }
      },
      // Presenter receives these acks from the display
      onBallRevealReady: () => {
        if (role !== 'presenter') return;
        const resolver = pendingRevealResolverRef.current;
        pendingRevealResolverRef.current = null;
        resolver?.();
      },
      onBallSequenceComplete: () => {
        if (role !== 'presenter') return;
        const resolver = pendingCompleteResolverRef.current;
        pendingCompleteResolverRef.current = null;
        resolver?.();
      },
```

- [ ] **Step 5: Add the refs used by the handlers**

In the `useSync` function body (near the other `useRef` calls around line 151), add:

```typescript
  // Latest onPlayBallSequence callback (ref so init effect doesn't need re-run)
  const onPlayBallSequenceRef = useRef(onPlayBallSequence);
  useEffect(() => {
    onPlayBallSequenceRef.current = onPlayBallSequence;
  }, [onPlayBallSequence]);

  // One-shot resolvers for ack-based Promises on the presenter side
  const pendingRevealResolverRef = useRef<(() => void) | null>(null);
  const pendingCompleteResolverRef = useRef<(() => void) | null>(null);
```

- [ ] **Step 6: Replace the presenter's per-sound broadcast helpers with sequence helpers**

Find the `broadcastPlayRollSound`, `broadcastPlayRevealChime`, `broadcastPlayBallVoice` useCallbacks near the end of `useSync` (around lines 512-525). Replace them with:

```typescript
  const REVEAL_TIMEOUT_MS = 15_000;
  const COMPLETE_TIMEOUT_MS = 15_000;

  // Broadcast PLAY_BALL_SEQUENCE (presenter only). Callers should first
  // register the reveal/complete promises via waitForReveal/waitForComplete.
  const broadcastPlayBallSequence = useCallback((ball: BingoBall) => {
    if (role !== 'presenter') return;
    broadcastSyncRef.current?.broadcastPlayBallSequence(ball);
  }, [role]);

  // Returns a Promise that resolves when the next BALL_REVEAL_READY arrives,
  // or after REVEAL_TIMEOUT_MS as a safety fallback.
  const waitForReveal = useCallback((): Promise<void> => {
    if (role !== 'presenter') return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        if (pendingRevealResolverRef.current === resolverWithTimeout) {
          pendingRevealResolverRef.current = null;
          console.warn('[Bingo sync] BALL_REVEAL_READY timed out after', REVEAL_TIMEOUT_MS, 'ms');
          resolve();
        }
      }, REVEAL_TIMEOUT_MS);
      const resolverWithTimeout = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      pendingRevealResolverRef.current = resolverWithTimeout;
    });
  }, [role]);

  // Returns a Promise that resolves when the next BALL_SEQUENCE_COMPLETE arrives,
  // or after COMPLETE_TIMEOUT_MS as a safety fallback.
  const waitForComplete = useCallback((): Promise<void> => {
    if (role !== 'presenter') return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timeoutId = setTimeout(() => {
        if (pendingCompleteResolverRef.current === resolverWithTimeout) {
          pendingCompleteResolverRef.current = null;
          console.warn('[Bingo sync] BALL_SEQUENCE_COMPLETE timed out after', COMPLETE_TIMEOUT_MS, 'ms');
          resolve();
        }
      }, COMPLETE_TIMEOUT_MS);
      const resolverWithTimeout = () => {
        clearTimeout(timeoutId);
        resolve();
      };
      pendingCompleteResolverRef.current = resolverWithTimeout;
    });
  }, [role]);
```

- [ ] **Step 7: Update the hook return shape**

Find the `return {...}` at the end of `useSync` (around line 539). Replace:

```typescript
    displayAudioActive,
    broadcastPlayRollSound,
    broadcastPlayRevealChime,
    broadcastPlayBallVoice,
```

With:

```typescript
    displayAudioActive,
    broadcastPlayBallSequence,
    waitForReveal,
    waitForComplete,
```

- [ ] **Step 8: Typecheck**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm typecheck --filter=@joolie-boolie/bingo`
Expected: Errors now in `use-game.ts` (the `AudioBroadcast` interface still references old methods) and `play/page.tsx`. These are fixed in Tasks 4-5.

- [ ] **Step 9: Commit**

```bash
git add apps/bingo/src/hooks/use-sync.ts
git commit -m "feat(bingo): add ball sequence broadcast + ack promises in use-sync"
```

---

## Task 4: Rewrite `executeCallSequence` broadcast path in `use-game.ts`

**Files:**
- Modify: `apps/bingo/src/hooks/use-game.ts:11-60`

- [ ] **Step 1: Update imports**

At the top of `apps/bingo/src/hooks/use-game.ts`, ensure `canCallBall` is imported from `@/lib/game`. Find the existing import from `@/lib/game`:

```typescript
import { getRecentBalls } from '@/lib/game';
```

Replace with:

```typescript
import { getRecentBalls, canCallBall } from '@/lib/game';
```

- [ ] **Step 2: Update `AudioBroadcast` interface**

Replace lines 11-16 (the current `AudioBroadcast` interface):

```typescript
interface AudioBroadcast {
  broadcastPlayRollSound: () => void;
  broadcastPlayRevealChime: () => void;
  broadcastPlayBallVoice: (ball: import('@/types').BingoBall) => void;
}
```

With:

```typescript
interface AudioBroadcast {
  broadcastPlayBallSequence: (ball: import('@/types').BingoBall) => void;
  waitForReveal: () => Promise<void>;
  waitForComplete: () => Promise<void>;
}
```

- [ ] **Step 3: Rewrite `executeCallSequence`**

Replace the entire `executeCallSequence` function body (lines 32-60):

```typescript
async function executeCallSequence(
  audioStore: ReturnType<typeof useAudioStore.getState>,
  callBallFn: () => ReturnType<ReturnType<typeof useGameStore.getState>['callBall']>,
  audioEnabled: boolean,
  audioBroadcast?: AudioBroadcast,
  displayAudioActive?: boolean
) {
  const useDisplayAudio = displayAudioActive && audioBroadcast;

  if (useDisplayAudio && audioEnabled) {
    // Broadcast path: display owns the sequence. Peek the next ball without
    // committing, send PLAY_BALL_SEQUENCE, then wait for the display to ack
    // BALL_REVEAL_READY before committing state. This keeps the presenter
    // and display visually in sync (both reveal at the same moment).
    const state = useGameStore.getState();
    if (!canCallBall(state.status) || state.remainingBalls.length === 0) {
      return null;
    }
    const nextBall = state.remainingBalls[0];

    // Register ack listeners BEFORE broadcasting (avoid race where the ack
    // arrives before we're listening).
    const revealPromise = audioBroadcast.waitForReveal();
    const completePromise = audioBroadcast.waitForComplete();

    audioBroadcast.broadcastPlayBallSequence(nextBall);

    await revealPromise;
    const ball = callBallFn();
    await completePromise;
    return ball;
  }

  // Local path (no display audio): presenter plays audio itself.
  if (audioEnabled) {
    await audioStore.playRollSound();
  }
  const ball = callBallFn();
  if (ball && audioEnabled) {
    await new Promise<void>((r) => setTimeout(r, 400));
    await audioStore.playRevealChime();
    await audioStore.playBallVoice(ball);
  }
  return ball;
}
```

Note: `canCallBall` imported from `@/lib/game` takes a `GameStatus` (not the full state). Verify at implementation time that the signature matches `canCallBall(state.status)`; if it takes the full state, adjust to `canCallBall(state)`. Check by reading `apps/bingo/src/lib/game/state-machine.ts` or `apps/bingo/src/lib/game/engine.ts`.

- [ ] **Step 4: Typecheck**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm typecheck --filter=@joolie-boolie/bingo`
Expected: Only `apps/bingo/src/app/play/page.tsx` should still have errors (old `audioBroadcast` wiring). Fixed in Task 5.

- [ ] **Step 5: Commit**

```bash
git add apps/bingo/src/hooks/use-game.ts
git commit -m "feat(bingo): rewrite executeCallSequence broadcast path for display-owned audio"
```

---

## Task 5: Rewire `audioBroadcast` in `play/page.tsx`

**Files:**
- Modify: `apps/bingo/src/app/play/page.tsx`

- [ ] **Step 1: Read the current wiring**

Read `apps/bingo/src/app/play/page.tsx` and find where `audioBroadcast` is constructed. It should look something like:

```typescript
const audioBroadcast = useMemo(() => ({
  broadcastPlayRollSound: sync.broadcastPlayRollSound,
  broadcastPlayRevealChime: sync.broadcastPlayRevealChime,
  broadcastPlayBallVoice: sync.broadcastPlayBallVoice,
}), [sync.broadcastPlayRollSound, sync.broadcastPlayRevealChime, sync.broadcastPlayBallVoice]);
```

(The exact structure may differ — find the real code.)

- [ ] **Step 2: Update to new shape**

Replace with:

```typescript
const audioBroadcast = useMemo(() => ({
  broadcastPlayBallSequence: sync.broadcastPlayBallSequence,
  waitForReveal: sync.waitForReveal,
  waitForComplete: sync.waitForComplete,
}), [sync.broadcastPlayBallSequence, sync.waitForReveal, sync.waitForComplete]);
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm typecheck --filter=@joolie-boolie/bingo`
Expected: Clean typecheck on production code. Tests may still fail to compile if they reference old methods — next tasks address that.

- [ ] **Step 4: Run tests to see the Task 2 tests now pass**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm --filter=@joolie-boolie/bingo test:run src/hooks/__tests__/use-game.test.ts`
Expected: The new `executeCallSequence broadcast path` describe block now passes (or close to it). Existing tests should still pass.

If any existing test is broken because it passed the old `broadcastPlayRollSound`/etc. shape into `useGame`, update those tests to either omit `audioBroadcast` entirely or use the new shape with `vi.fn()` stubs.

- [ ] **Step 5: Commit**

```bash
git add apps/bingo/src/app/play/page.tsx
git commit -m "feat(bingo): wire play page audioBroadcast to new sequence interface"
```

---

## Task 6: Add display-side `revealedBall` state and `handleBallSequence` callback

**Files:**
- Modify: `apps/bingo/src/app/display/page.tsx`

- [ ] **Step 1: Read current `AudienceDisplay` component to locate the state declarations**

Read `apps/bingo/src/app/display/page.tsx` around lines 109-140 where `useState`, `useSync`, and the `useGameStore` selectors live.

- [ ] **Step 2: Add new imports**

Ensure the imports at the top include `useRef`. Current imports should already have it. Also ensure `BingoBall` type is imported:

```typescript
import type { BingoBall } from '@/types';
```

Add if not present.

- [ ] **Step 3: Add `revealedBall` state and `sequenceRunningRef`**

Inside `AudienceDisplay`, find where `currentBall` is selected from the store:

```typescript
const currentBall = useGameStore((state) => state.currentBall);
```

Immediately after the store selectors, add:

```typescript
// Local revealed ball state. During a PLAY_BALL_SEQUENCE handler run,
// this is driven by the sequence handler so the visual reveal lines up
// with the end of the roll sound. Outside of a sequence (initial sync,
// undo, reset), an effect syncs it from the store's currentBall.
const [revealedBall, setRevealedBall] = useState<BingoBall | null>(null);
const sequenceRunningRef = useRef(false);

// Sync revealedBall ← currentBall when no sequence is running
useEffect(() => {
  if (!sequenceRunningRef.current) {
    setRevealedBall(currentBall);
  }
}, [currentBall]);
```

- [ ] **Step 4: Define the sequence handler callback**

After the state/ref/effect block, add:

```typescript
const playBallCall = useAudioStore((state) => state.playBallCall);
const playRollSoundFn = useAudioStore((state) => state.playRollSound);
const playRevealChimeFn = useAudioStore((state) => state.playRevealChime);
const playBallVoiceFn = useAudioStore((state) => state.playBallVoice);

const handleBallSequence = useCallback(
  async (ball: BingoBall) => {
    if (sequenceRunningRef.current) {
      // Drop overlapping sequences
      return;
    }
    sequenceRunningRef.current = true;
    try {
      await playRollSoundFn();
      setRevealedBall(ball);
      // Tell presenter to commit the ball now (sync reveal timing)
      sync.broadcastPlayBallSequence is a presenter method; display acks via
      // broadcastBallRevealReady. But we don't have direct access — the
      // `onPlayBallSequence` wrapper in use-sync handles the COMPLETE ack.
      // For the REVEAL ack we need to send it directly. See next step.
      // (Handled via a new callback exposed by useSync — see Task 7.)
      await new Promise<void>((r) => setTimeout(r, 400));
      await playRevealChimeFn();
      await playBallVoiceFn(ball);
    } finally {
      sequenceRunningRef.current = false;
    }
  },
  [playRollSoundFn, playRevealChimeFn, playBallVoiceFn]
);
```

**NOTE:** This step has a gap — `handleBallSequence` needs to emit `BALL_REVEAL_READY` at the right point but doesn't have access to `sync.broadcastBallRevealReady`. Task 7 closes that gap by adding a `sendBallRevealReady` method to the `useSync` return and wiring it through.

- [ ] **Step 5: Do NOT commit yet — the handler is incomplete**

Proceed to Task 7. The code won't compile (`sync.broadcastPlayBallSequence is a presenter method...` is a stray comment and won't parse). Fix in Task 7.

---

## Task 7: Expose `sendBallRevealReady` from `useSync` and wire into display

**Files:**
- Modify: `apps/bingo/src/hooks/use-sync.ts`
- Modify: `apps/bingo/src/app/display/page.tsx`

- [ ] **Step 1: Add `sendBallRevealReady` useCallback in `useSync`**

In `apps/bingo/src/hooks/use-sync.ts`, near the other audio helpers (after `broadcastPlayBallSequence`), add:

```typescript
// Audience ack: "my roll sound is done, you can commit the ball now"
const sendBallRevealReady = useCallback(() => {
  if (role !== 'audience') return;
  broadcastSyncRef.current?.broadcastBallRevealReady();
}, [role]);
```

- [ ] **Step 2: Return it from the hook**

In the `return {...}` block, add:

```typescript
    sendBallRevealReady,
```

near the other sync-returned functions.

- [ ] **Step 3: Update `AudienceDisplay` to use it**

In `apps/bingo/src/app/display/page.tsx`, update the `useSync` destructuring:

```typescript
const { isConnected, connectionError, requestSync, sendBallRevealReady } = useSync({
  role: 'audience',
  sessionId,
  displayAudioUnlocked: audioUnlocked,
  onPlayBallSequence: handleBallSequence,
});
```

(Note the added `onPlayBallSequence: handleBallSequence`.)

**Chicken-and-egg:** `handleBallSequence` is defined later in the component and references `sendBallRevealReady`, which comes from `useSync`. Restructure as follows:

1. Call `useSync` first (without `onPlayBallSequence`) and destructure `sendBallRevealReady`
2. Define `handleBallSequence` using `sendBallRevealReady`
3. Pass `handleBallSequence` back into `useSync` via a ref

Or simpler: use a ref for `handleBallSequence` and read it from the ref inside a stable wrapper passed to `useSync`:

```typescript
// Declare ref first (value will be assigned below)
const handleBallSequenceRef = useRef<((ball: BingoBall) => Promise<void>) | null>(null);

// Stable wrapper that dispatches to the ref
const onPlayBallSequence = useCallback(async (ball: BingoBall) => {
  await handleBallSequenceRef.current?.(ball);
}, []);

const { isConnected, connectionError, requestSync, sendBallRevealReady } = useSync({
  role: 'audience',
  sessionId,
  displayAudioUnlocked: audioUnlocked,
  onPlayBallSequence,
});

// ... later, after sendBallRevealReady is available ...
const handleBallSequence = useCallback(
  async (ball: BingoBall) => {
    if (sequenceRunningRef.current) return;
    sequenceRunningRef.current = true;
    try {
      await playRollSoundFn();
      setRevealedBall(ball);
      sendBallRevealReady();
      await new Promise<void>((r) => setTimeout(r, 400));
      await playRevealChimeFn();
      await playBallVoiceFn(ball);
    } finally {
      sequenceRunningRef.current = false;
    }
  },
  [playRollSoundFn, playRevealChimeFn, playBallVoiceFn, sendBallRevealReady]
);

useEffect(() => {
  handleBallSequenceRef.current = handleBallSequence;
}, [handleBallSequence]);
```

- [ ] **Step 4: Pass `revealedBall` to `<BallReveal>`**

Find the `<BallReveal ball={currentBall} ... />` in the JSX (around line 329) and change the prop:

```tsx
<BallReveal
  ball={revealedBall}
  autoCallInterval={autoCallSpeed}
  isAutoCall={autoCallEnabled}
  size="display"
/>
```

- [ ] **Step 5: Handle GAME_RESET explicitly**

When the game is reset, the `currentBall` becomes `null`. The effect in Task 6 Step 3 will handle this (if no sequence is running). Add a safety clear for `revealedBall` in the reset path too — but the existing effect should cover it since `currentBall` → null. Verify no extra code needed.

Also: when `calledBalls.length === 0` and there's no sequence, `revealedBall` should be null. This is naturally handled by the effect.

- [ ] **Step 6: Typecheck**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm typecheck --filter=@joolie-boolie/bingo`
Expected: Clean.

- [ ] **Step 7: Run all bingo tests**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm --filter=@joolie-boolie/bingo test:run`
Expected: All existing tests pass; new `executeCallSequence broadcast path` tests pass.

- [ ] **Step 8: Commit**

```bash
git add apps/bingo/src/hooks/use-sync.ts apps/bingo/src/app/display/page.tsx
git commit -m "feat(bingo): display owns ball audio sequence with reveal ack"
```

---

## Task 8: Lint and full monorepo typecheck

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm lint --filter=@joolie-boolie/bingo`
Expected: Clean. Fix any issues.

- [ ] **Step 2: Full typecheck**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm typecheck`
Expected: Clean across the monorepo. The type changes in `apps/bingo/src/types/index.ts` are local to bingo, so other apps shouldn't break.

- [ ] **Step 3: Full bingo test run**

Run: `cd /Users/j/repos/beak-gaming-platform && pnpm --filter=@joolie-boolie/bingo test:run`
Expected: All tests green.

- [ ] **Step 4: Commit any fixes**

If any lint/typecheck fixes were needed:

```bash
git add <changed files>
git commit -m "fix(bingo): resolve lint/typecheck issues from audio sequence refactor"
```

Otherwise skip the commit.

---

## Task 9: Manual Playwright verification

**Files:** none (manual verification only)

- [ ] **Step 1: Start dev server**

Run in background: `cd /Users/j/repos/beak-gaming-platform && pnpm dev:bingo`
(Use `run_in_background: true` in Bash tool.)

Wait for dev server ready (check output).

- [ ] **Step 2: Open presenter in Playwright MCP (dark mode)**

Use `mcp__playwright__browser_navigate` to `http://localhost:3000/play`. Use `mcp__playwright__browser_evaluate` with `page.emulateMedia({ colorScheme: 'dark' })` — actually, dark mode must be set via `browser_navigate` options or by clicking the theme toggle. Use whatever approach the existing MANUAL_TEST_PLAN.md prescribes.

- [ ] **Step 3: Open the display window**

Click the "Open Display" button in the presenter UI, which opens a new tab/window at `/display?session=...`. Capture the session URL.

In Playwright MCP, open a new tab for the display URL. Click the audio unlock overlay.

- [ ] **Step 4: Start a game and call 3 balls**

On presenter: click Start, then click "Call Ball" (or press Space) three times with ~2s gaps.

- [ ] **Step 5: Verify the sequence on the display**

Use `mcp__playwright__browser_snapshot` on the display tab after each ball call. For each call:
1. Confirm the roll sound plays first (no other audio overlapping)
2. Confirm the reveal chime plays after the roll sound ends
3. Confirm the ball voice plays after the chime
4. Confirm the ball visually reveals on the display at the end of the roll sound (not instantly)
5. Confirm the ball visually reveals on the presenter at the same time as the display

Audio is harder to verify via snapshot — rely on the browser_console_messages to check for any warnings, and verify visually that the ball-reveal animation is delayed until the expected moment.

- [ ] **Step 6: Verify auto-call mode**

Enable auto-call at 5s speed on the presenter. Observe 3 consecutive auto-calls on the display. Each should complete its full sequence before the next one starts (no overlap).

- [ ] **Step 7: Verify undo and reset still work**

Click Undo — the ball should immediately revert on both tabs (no audio sequence needed). Click Reset — both tabs should clear to idle state.

- [ ] **Step 8: Close the dev server**

Kill the background Bash shell.

- [ ] **Step 9: If issues found, return to Phase 1 of systematic-debugging and fix before proceeding**

---

## Task 10: Final commit and cleanup

**Files:** none (meta)

- [ ] **Step 1: Verify no leftover dead code**

Run: `cd /Users/j/repos/beak-gaming-platform && grep -r "PLAY_ROLL_SOUND\|PLAY_REVEAL_CHIME\|PLAY_BALL_VOICE\|broadcastPlayRollSound\|broadcastPlayRevealChime\|broadcastPlayBallVoice" apps/bingo/src packages/ --include="*.ts" --include="*.tsx"`
Expected: No matches (or only matches in stale comments that should also be removed).

If matches exist outside `apps/bingo/src/types/index.ts` (which was already updated), remove them.

- [ ] **Step 2: Verify git log**

Run: `git log --oneline origin/main..HEAD`
Expected: ~7-8 commits, each scoped to a single task.

- [ ] **Step 3: Push branch and open PR**

```bash
git push -u origin HEAD
gh pr create --repo julianken/joolie-boolie --title "fix(bingo): correct audio sequencing when display window is open" --body "$(cat <<'EOF'
## Summary
- Moves bingo audio sequence (roll → chime → voice) from presenter to display when display audio is active
- Replaces 3 fire-and-forget per-sound broadcasts with a single `PLAY_BALL_SEQUENCE` message + `BALL_REVEAL_READY` and `BALL_SEQUENCE_COMPLETE` acks
- Presenter and display now reveal the ball visually at the same moment (display sends `BALL_REVEAL_READY` after its roll sound finishes, which triggers the presenter to commit)
- Fixes the bug where the roll sound, reveal chime, and ball voice all played simultaneously on the display

## Root cause
`executeCallSequence` in `apps/bingo/src/hooks/use-game.ts` used `await` on local audio playback but fire-and-forget `broadcast*` calls. `BroadcastChannel.postMessage()` returns `void` — the sender has no idea when the receiver finishes. With only a 400ms gap between broadcasts, all three sounds queued up on the display simultaneously.

## Architecture
- Presenter: peek `remainingBalls[0]` without committing → broadcast `PLAY_BALL_SEQUENCE(ball)` → `await` reveal ack → commit ball → `await` complete ack → return
- Display: receive `PLAY_BALL_SEQUENCE` → `await playRollSound()` → `setRevealedBall(ball)` + send `BALL_REVEAL_READY` → 400ms wait → `await playRevealChime()` → `await playBallVoice()` → send `BALL_SEQUENCE_COMPLETE`
- Display has local `revealedBall` state; `BallReveal` reads from that instead of the store's `currentBall` directly. A `sequenceRunningRef` gates the sync effect so undo/reset/initial-sync still work.
- 15s timeout fallbacks on both presenter promises so a closed display tab can't wedge the host.

## Test plan
- [ ] Unit tests pass (new broadcast-path tests for `executeCallSequence`)
- [ ] Manual Playwright verification: presenter + display, 3 ball calls, auto-call at 5s, undo, reset
- [ ] Verify visually that the ball appears on both tabs at the same moment (end of roll sound)

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 4: Done**

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Message order race (`GAME_STATE_UPDATE` arrives before `PLAY_BALL_SEQUENCE`) | Peek-then-broadcast-then-commit ordering; BroadcastChannel preserves FIFO within a channel |
| Stale display tab wedges presenter | 15s timeout fallback on both reveal and complete promises |
| Display audio error mid-sequence | Sequence handler has `try/finally` that always sends `BALL_SEQUENCE_COMPLETE`; presenter uses the ack to unblock |
| Overlapping sequences from rapid button mashing | Presenter's existing `isProcessingRef` guard + display's own `sequenceRunningRef` drop-if-running guard |
| `canCallBall` signature mismatch | Verify at implementation time whether it takes `GameStatus` or full `GameState` and adjust call site |
| Existing tests mock `broadcastPlayRollSound` etc. | Task 5 Step 4 updates any such tests to use the new shape or omit `audioBroadcast` entirely |
