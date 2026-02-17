import { create } from 'zustand';
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

/**
 * Emit a structured lifecycle event for game observability.
 * Uses console.warn with JSON for structured client-side logging.
 */
function emitLifecycleEvent(event: string, data?: Record<string, unknown>): void {
  console.warn(JSON.stringify({
    event,
    game: 'bingo',
    timestamp: new Date().toISOString(),
    ...data,
  }));
}

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

export const useGameStore = create<GameStore>()((set, get) => ({
  // Initial state
  ...createInitialState(),

  // Actions
  startGame: (pattern?: BingoPattern) => {
    emitLifecycleEvent('game.started', { pattern: pattern?.name });
    set((state) => startGameEngine(state, pattern));
  },

  callBall: () => {
    const state = get();
    if (!canCallBall(state)) {
      return null;
    }
    const newState = callNextBallEngine(state);
    set(newState);
    return newState.currentBall;
  },

  undoCall: () => {
    const state = get();
    if (!canUndoCall(state)) {
      return null;
    }
    const previousBall = state.currentBall;
    set(undoLastCallEngine(state));
    return previousBall;
  },

  pauseGame: () => {
    emitLifecycleEvent('game.paused');
    set((state) => pauseGameEngine(state));
  },

  resumeGame: () => {
    emitLifecycleEvent('game.resumed');
    set((state) => resumeGameEngine(state));
  },

  endGame: () => {
    const state = get();
    emitLifecycleEvent('game.ended', { ballsCalled: getBallsCalled(state) });
    set((state) => endGameEngine(state));
  },

  resetGame: () => {
    emitLifecycleEvent('game.reset');
    set((state) => resetGameEngine(state));
  },

  setPattern: (pattern: BingoPattern) => {
    emitLifecycleEvent('game.pattern_changed', { pattern: pattern.name });
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
}));

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
