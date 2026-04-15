import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createGameLifecycleLogger } from '@hosted-game-night/sync';
import { GameState, BingoPattern, BingoBall } from '@/types';
import {
  createInitialState,
  startGame as startGameEngine,
  callNextBall as callNextBallEngine,
  undoLastCall as undoLastCallEngine,
  pauseGame as pauseGameEngine,
  resumeGame as resumeGameEngine,
  endGame as endGameEngine,
  resetGame as resetGameEngine,
  setPattern as setPatternEngine,
  setAutoCallEnabled as setAutoCallEnabledEngine,
  setAutoCallSpeed as setAutoCallSpeedEngine,
  setAudioEnabled as setAudioEnabledEngine,
  getBallsRemaining,
  getBallsCalled,
  canUndoCall,
  canCallBall,
  canStartGame,
  canPauseGame,
  canResumeGame,
} from '@/lib/game';
import { patternRegistry } from '@/lib/game/patterns';

const lifecycleLogger = createGameLifecycleLogger({ game: 'bingo' });

export interface GameStore extends GameState {
  // Internal flag for sync loop prevention
  _isHydrating?: boolean;

  // Actions
  startGame: (pattern?: BingoPattern) => void;
  callBall: () => BingoBall | null;
  undoCall: () => BingoBall | null;
  pauseGame: () => void;
  resumeGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  setPattern: (pattern: BingoPattern) => void;
  toggleAutoCall: () => void;
  setAutoCallSpeed: (speed: number) => void;
  toggleAudio: () => void;

  // Hydration for sync
  _hydrate: (state: Partial<GameState>) => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // Initial state
      ...createInitialState(),

      // Actions
      startGame: (pattern?: BingoPattern) => {
        lifecycleLogger.emit('game.started', { pattern: pattern?.name });
        set((state) => startGameEngine(state, pattern));
      },

      callBall: () => {
        const state = get();
        if (!canCallBall(state)) {
          return null;
        }
        const newState = callNextBallEngine(state);
        set(newState);
        // Emit ball called event with context
        if (newState.currentBall) {
          lifecycleLogger.emit('game.ball_called', {
            ball: newState.currentBall.label,
            ballsCalled: getBallsCalled(newState),
            ballsRemaining: getBallsRemaining(newState),
          });
        }
        return newState.currentBall;
      },

      undoCall: () => {
        const state = get();
        if (!canUndoCall(state)) {
          return null;
        }
        const previousBall = state.currentBall;
        set(undoLastCallEngine(state));
        if (previousBall) {
          lifecycleLogger.emit('game.ball_undone', {
            ball: previousBall.label,
          });
        }
        return previousBall;
      },

      pauseGame: () => {
        lifecycleLogger.emit('game.paused');
        set((state) => pauseGameEngine(state));
      },

      resumeGame: () => {
        lifecycleLogger.emit('game.resumed');
        set((state) => resumeGameEngine(state));
      },

      endGame: () => {
        const state = get();
        lifecycleLogger.emit('game.ended', { ballsCalled: getBallsCalled(state) });
        set((state) => endGameEngine(state));
      },

      resetGame: () => {
        lifecycleLogger.emit('game.reset');
        set((state) => resetGameEngine(state));
      },

      setPattern: (pattern: BingoPattern) => {
        lifecycleLogger.emit('game.pattern_changed', { pattern: pattern.name });
        set((state) => setPatternEngine(state, pattern));
      },

      toggleAutoCall: () => {
        set((state) => setAutoCallEnabledEngine(state, !state.autoCallEnabled));
      },

      setAutoCallSpeed: (speed: number) => {
        set((state) => setAutoCallSpeedEngine(state, speed));
      },

      toggleAudio: () => {
        set((state) => setAudioEnabledEngine(state, !state.audioEnabled));
      },

      _hydrate: (newState: Partial<GameState>) => {
        // Set hydrating flag AND merge state in a single set call to prevent broadcast loops
        // This ensures any subscribers triggered by the state change see _isHydrating as true
        set((state) => ({ ...state, ...newState, _isHydrating: true }));
        // Use setTimeout to clear the flag after the current synchronous execution
        setTimeout(() => {
          set({ _isHydrating: false });
        }, 0);
      },
    }),
    {
      name: 'hgn-bingo-game',
      version: 1,
      storage: createJSONStorage(() => localStorage),

      // Only persist the minimal game state needed for session recovery.
      // Actions, selectors, and transient flags are excluded.
      partialize: (s) => ({
        status: s.status,
        calledBalls: s.calledBalls,
        currentBall: s.currentBall,
        previousBall: s.previousBall,
        remainingBalls: s.remainingBalls,
        // Persist patternId only — pattern object is re-resolved on merge
        patternId: s.pattern?.id ?? null,
        // Always persist auto-call as disabled: force the host to re-enable
        // after reload so we never silently resume a ticking sequence.
        autoCallEnabled: false,
        autoCallSpeed: s.autoCallSpeed,
        audioEnabled: s.audioEnabled,
      }),

      // Merge persisted state into the default (freshly constructed) store state.
      // Key responsibilities:
      //  1. Re-resolve the BingoPattern object from its stored id via patternRegistry.
      //  2. Ensure autoCallEnabled is always false on reload (safety, covered by partialize too).
      //  3. Keep _isHydrating true during merge so the sync subscriber doesn't broadcast
      //     a stale-state clobber to a live /display peer.
      merge: (persisted, current) => {
        const p = persisted as Record<string, unknown>;
        return {
          ...current,
          ...p,
          // Restore the full BingoPattern object from the registry using the persisted id.
          // Falls back to null if the id no longer exists (e.g., pattern was removed).
          pattern: p.patternId
            ? (patternRegistry.get(String(p.patternId)) ?? null)
            : null,
          // Safety: never resume auto-call on page load
          autoCallEnabled: false,
          // Hold the hydrating flag during merge so useSync's subscriber
          // skips any broadcast triggered by this state change.
          _isHydrating: true,
        };
      },

      // Clear _isHydrating after rehydration completes so normal sync resumes.
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (error) {
            console.warn('[BingoGameStore] Failed to rehydrate from localStorage:', error);
          }
          // Schedule flag clear after the current tick so React components
          // that subscribed during rehydration still see _isHydrating=true.
          setTimeout(() => {
            useGameStore.setState({ _isHydrating: false });
          }, 0);
        };
      },
    }
  )
);

// Selector hooks for computed values
export const useGameSelectors = () => {
  const state = useGameStore();
  return {
    ballsRemaining: getBallsRemaining(state),
    ballsCalled: getBallsCalled(state),
    canUndo: canUndoCall(state),
    canCall: canCallBall(state),
    canStart: canStartGame(state),
    canPause: canPauseGame(state),
    canResume: canResumeGame(state),
  };
};
