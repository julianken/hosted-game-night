import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { createGameLifecycleLogger } from '@joolie-boolie/sync';
import type { TriviaGameState, GameSettings } from '@/types';
import type {
  AudienceScene,
  RevealPhase,
  ScoreDelta,
} from '@/types';
import {
  createInitialState,
  startGame as startGameEngine,
  endGame as endGameEngine,
  resetGame as resetGameEngine,
  selectQuestion as selectQuestionEngine,
  setDisplayQuestion as setDisplayQuestionEngine,
  addTeam as addTeamEngine,
  removeTeam as removeTeamEngine,
  renameTeam as renameTeamEngine,
  adjustTeamScore as adjustTeamScoreEngine,
  setTeamScore as setTeamScoreEngine,
  completeRound as completeRoundEngine,
  nextRound as nextRoundEngine,
  tickTimer as tickTimerEngine,
  startTimer as startTimerEngine,
  stopTimer as stopTimerEngine,
  resetTimer as resetTimerEngine,
  pauseGame as pauseGameEngine,
  resumeGame as resumeGameEngine,
  emergencyPause as emergencyPauseEngine,
  updateSettings as updateSettingsEngine,
  importQuestions as importQuestionsEngine,
  getSelectedQuestion,
  getDisplayQuestion,
  getProgress,
  canStartGame,
  isGameOver,
  getRoundProgress,
  getQuestionInRoundProgress,
  isLastQuestionOfRound,
  isLastRound,
  getCurrentRoundQuestions,
  getRoundWinners,
  getOverallLeaders,
  getTeamsSortedByScore,
  orchestrateSceneTransition,
} from '@/lib/game/engine';

const lifecycleLogger = createGameLifecycleLogger({ game: 'trivia' });

export interface GameStore extends TriviaGameState {
  _isHydrating: boolean; // Flag to prevent sync loops during hydration

  // -- Existing lifecycle actions (unchanged signatures) --------------------
  startGame: () => void;
  endGame: () => void;
  resetGame: () => void;
  selectQuestion: (index: number) => void;
  setDisplayQuestion: (index: number | null) => void;
  addTeam: (name?: string) => void;
  removeTeam: (teamId: string) => void;
  renameTeam: (teamId: string, name: string) => void;
  adjustTeamScore: (teamId: string, delta: number) => void;
  setTeamScore: (teamId: string, score: number) => void;
  completeRound: () => void;
  nextRound: () => void;

  // Timer actions
  tickTimer: () => void;
  startTimer: () => void;
  stopTimer: () => void;
  resetTimer: (duration?: number) => void;

  // Pause actions
  pauseGame: () => void;
  resumeGame: () => void;
  emergencyPause: () => void;

  // Settings actions
  updateSettings: (settings: Partial<GameSettings>) => void;
  loadTeamsFromSetup: (names: string[]) => void;

  // Question management
  importQuestions: (questions: import('@/types').Question[], mode?: 'replace' | 'append') => void;

  // Hydration for sync
  _hydrate: (state: Partial<TriviaGameState>) => void;

  // -- Scene control ---------------------------------------------------
  /** Set the audience display scene and record sceneTimestamp. */
  setAudienceScene: (scene: AudienceScene) => void;

  /**
   * Advance the audience scene by consulting getNextScene().
   * This is the SINGLE AUTHORITY for all scene transitions (except pause/emergency).
   * The trigger is one of the SCENE_TRIGGERS constants.
   */
  advanceScene: (trigger: string) => void;

  /** Set the reveal phase. Null clears an active reveal. */
  setRevealPhase: (phase: RevealPhase) => void;

  /** Replace the scoreDeltas array atomically (new reference guaranteed). */
  setScoreDeltasBatch: (deltas: ScoreDelta[]) => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  // Initial state
  ...createInitialState(),
  _isHydrating: false,

  // Actions
  startGame: () => {
    lifecycleLogger.emit('game.started');
    set((state) => ({
      ...startGameEngine(state),
      audienceScene: 'game_intro' as AudienceScene,
      sceneTimestamp: Date.now(),
    }));
  },

  endGame: () => {
    set((state) => {
      lifecycleLogger.emit('game.ended', { currentRound: state.currentRound, totalRounds: state.totalRounds, teamCount: state.teams.length });
      const baseUpdate = endGameEngine(state);
      return {
        ...baseUpdate,
        audienceScene: 'final_buildup' as AudienceScene,
        sceneTimestamp: Date.now(),
      };
    });
  },

  resetGame: () => {
    lifecycleLogger.emit('game.reset');
    set((state) => ({
      ...resetGameEngine(state),
      sceneTimestamp: Date.now(),
    }));
  },

  selectQuestion: (index: number) => {
    set((state) => selectQuestionEngine(state, index));
  },

  setDisplayQuestion: (index: number | null) => {
    set((state) => {
      if (index !== null) {
        const question = state.questions[index];
        lifecycleLogger.emit('game.question_displayed', {
          questionIndex: index,
          round: state.currentRound,
          category: question?.category,
        });
      } else if (state.displayQuestionIndex !== null) {
        lifecycleLogger.emit('game.question_hidden', {
          questionIndex: state.displayQuestionIndex,
          round: state.currentRound,
        });
      }
      const baseUpdate = setDisplayQuestionEngine(state, index);

      // Transition audience scene when showing/hiding a question on display.
      // 'display_question' trigger: waiting -> question_anticipation (scene.ts)
      if (index !== null && state.audienceScene === 'waiting') {
        return {
          ...baseUpdate,
          audienceScene: 'question_anticipation' as AudienceScene,
          sceneTimestamp: Date.now(),
        };
      }
      // Hiding question: return to waiting if currently in a question scene
      if (index === null) {
        return {
          ...baseUpdate,
          audienceScene: 'waiting' as AudienceScene,
          sceneTimestamp: Date.now(),
        };
      }
      return baseUpdate;
    });
  },

  addTeam: (name?: string) => {
    set((state) => addTeamEngine(state, name));
  },

  removeTeam: (teamId: string) => {
    set((state) => removeTeamEngine(state, teamId));
  },

  renameTeam: (teamId: string, name: string) => {
    set((state) => renameTeamEngine(state, teamId, name));
  },

  adjustTeamScore: (teamId: string, delta: number) => {
    set((state) => adjustTeamScoreEngine(state, teamId, delta));
  },

  setTeamScore: (teamId: string, score: number) => {
    set((state) => setTeamScoreEngine(state, teamId, score));
  },

  completeRound: () => {
    set((state) => {
      lifecycleLogger.emit('game.round_completed', { round: state.currentRound, totalRounds: state.totalRounds });
      // Only handle status transition (playing -> between_rounds).
      // Scene ownership is handled by advanceScene().
      return completeRoundEngine(state);
    });
  },

  nextRound: () => {
    set((state) => {
      lifecycleLogger.emit('game.round_started', { round: state.currentRound + 1, totalRounds: state.totalRounds });
      // Only handle status transition (between_rounds -> playing with next round).
      // Scene ownership is handled by advanceScene().
      return nextRoundEngine(state);
    });
  },

  // Timer actions
  tickTimer: () => {
    set((state) => tickTimerEngine(state));
  },

  startTimer: () => {
    set((state) => startTimerEngine(state));
  },

  stopTimer: () => {
    set((state) => stopTimerEngine(state));
  },

  resetTimer: (duration?: number) => {
    set((state) => resetTimerEngine(state, duration));
  },

  // Pause actions
  pauseGame: () => {
    lifecycleLogger.emit('game.paused');
    set((state) => pauseGameEngine(state));
  },

  resumeGame: () => {
    lifecycleLogger.emit('game.resumed');
    set((state) => resumeGameEngine(state));
  },

  emergencyPause: () => {
    lifecycleLogger.emit('game.emergency_pause');
    set((state) => emergencyPauseEngine(state));
  },

  _hydrate: (newState: Partial<TriviaGameState>) => {
    set((state) => {
      const updatedState: GameStore = {
        ...state,
        ...newState,
        _isHydrating: false,
      };

      // -- Existing array reconstructions (unchanged) -----------------------
      if (newState.teams) {
        updatedState.teams = [...newState.teams.map((team) => ({ ...team }))];
      }
      if (newState.questions) {
        updatedState.questions = [...newState.questions.map((q) => ({ ...q }))];
      }
      if (newState.teamAnswers) {
        // teamAnswers is a flat array -- force new array reference
        updatedState.teamAnswers = [...newState.teamAnswers.map((a) => ({ ...a }))];
      }

      // -- scoreDeltas array -------------------------------------------
      // Force new reference so subscribers detect the change.
      if (newState.scoreDeltas !== undefined) {
        updatedState.scoreDeltas = [...(newState.scoreDeltas ?? [])];
      }

      return updatedState;
    });
  },

  // Settings actions
  updateSettings: (settings: Partial<GameSettings>) => {
    set((state) => updateSettingsEngine(state, settings));
  },

  loadTeamsFromSetup: (names: string[]) => {
    set((state) => {
      // Only allow loading teams during setup
      if (state.status !== 'setup') return state;

      // Clear existing teams and add new ones
      // Extract only TriviaGameState properties (not store actions)
      let newState: TriviaGameState = {
        // -- Existing fields (unchanged) ------------------------------------
        sessionId: state.sessionId,
        status: state.status,
        statusBeforePause: state.statusBeforePause,
        teams: [],
        questions: state.questions,
        selectedQuestionIndex: state.selectedQuestionIndex,
        displayQuestionIndex: state.displayQuestionIndex,
        currentRound: state.currentRound,
        totalRounds: state.totalRounds,
        settings: state.settings,
        timer: state.timer,
        teamAnswers: state.teamAnswers,
        showScoreboard: state.showScoreboard,
        emergencyBlank: state.emergencyBlank,
        ttsEnabled: state.ttsEnabled,

        // -- Scene fields (carry current values) -----------------------
        audienceScene: state.audienceScene,
        sceneBeforePause: state.sceneBeforePause,
        sceneTimestamp: state.sceneTimestamp,
        scoreDeltas: [],             // Fresh empty array -- no deltas during setup
        revealPhase: state.revealPhase,
        recapShowingAnswer: null,    // Not in recap during setup
        questionStartScores: {},     // No round started yet during setup
      };

      for (const name of names) {
        newState = addTeamEngine(newState, name);
      }
      return newState;
    });
  },

  importQuestions: (questions: import('@/types').Question[], mode: 'replace' | 'append' = 'replace') => {
    set((state) => importQuestionsEngine(state, questions, mode));
  },

  // -- Scene control actions -------------------------------------------

  setAudienceScene: (scene: AudienceScene) => {
    set({ audienceScene: scene, sceneTimestamp: Date.now() });
  },

  advanceScene: (trigger: string) => {
    const state = get();
    const update = orchestrateSceneTransition(state, trigger);

    // No-op: orchestrator found no valid transition.
    if (update === null || Object.keys(update).length === 0) return;

    // Lifecycle logging — detect which transition occurred and emit the
    // appropriate log event. These are store-level side effects that the
    // pure orchestrator intentionally does not handle.
    const nextScene = update.audienceScene;
    if (nextScene === 'round_summary' && state.audienceScene === 'question_closed') {
      lifecycleLogger.emit('game.round_completed', { round: state.currentRound, totalRounds: state.totalRounds });
    } else if (nextScene === 'final_buildup' && state.audienceScene !== 'final_buildup') {
      lifecycleLogger.emit('game.ended', { currentRound: state.currentRound, totalRounds: state.totalRounds, teamCount: state.teams.length });
    } else if (nextScene === 'round_intro' && state.status === 'between_rounds') {
      lifecycleLogger.emit('game.round_started', { round: state.currentRound + 1, totalRounds: state.totalRounds });
    }

    set(update);
  },

  setRevealPhase: (phase: RevealPhase) => {
    set({ revealPhase: phase });
  },

  setScoreDeltasBatch: (deltas: ScoreDelta[]) => {
    // Explicit copy ensures Zustand detects reference change even if
    // the caller passes the same array reference across multiple calls.
    set({ scoreDeltas: [...deltas] });
  },
}));

// Selector hooks for computed values
// IMPORTANT: This hook subscribes to the entire store, which means the component
// will re-render on ANY state change. For performance-critical components, use
// individual selectors instead.
export function useGameSelectors() {
  // Subscribe to specific state that affects selectors to ensure re-renders
  const displayQuestionIndex = useGameStore((state) => state.displayQuestionIndex);
  const questions = useGameStore((state) => state.questions);
  const teams = useGameStore((state) => state.teams);
  const status = useGameStore((state) => state.status);
  const currentRound = useGameStore((state) => state.currentRound);
  const selectedQuestionIndex = useGameStore((state) => state.selectedQuestionIndex);
  const totalRounds = useGameStore((state) => state.totalRounds);
  const teamAnswers = useGameStore((state) => state.teamAnswers);
  const settings = useGameStore((state) => state.settings);

  // Scene layer subscriptions
  const audienceScene = useGameStore((state) => state.audienceScene);
  const revealPhase = useGameStore((state) => state.revealPhase);

  // CRITICAL FIX (BEA-374): Build state object from reactive subscriptions
  // DO NOT use getState() here - it can return stale state during React's
  // reconciliation phase, causing computed selectors to return wrong values.
  // This was causing display components to not re-render after state hydration.
  const state: TriviaGameState = {
    sessionId: '',                   // Not used by any selector
    status,
    statusBeforePause: null,         // Not used by any selector
    questions,
    selectedQuestionIndex,
    displayQuestionIndex,
    currentRound,
    totalRounds,
    teams,
    teamAnswers,
    timer: { duration: 0, remaining: 0, isRunning: false }, // Not used
    settings,
    showScoreboard: false,           // Not used by any selector
    emergencyBlank: false,           // Not used by any selector
    ttsEnabled: false,               // Not used by any selector

    // -- Scene fields --------------------------------------------------
    audienceScene,
    sceneBeforePause: null,          // Not used for selector computation
    sceneTimestamp: 0,               // Not used for selector computation
    scoreDeltas: [],                 // Not used for selector computation
    revealPhase,
    recapShowingAnswer: null,        // Not used for selector computation
    questionStartScores: {},         // Not used for selector computation
  };

  return {
    selectedQuestion: getSelectedQuestion(state),
    displayQuestion: getDisplayQuestion(state),
    progress: getProgress(state),
    canStart: canStartGame(state),
    isGameOver: isGameOver(state),
    // Round selectors
    roundProgress: getRoundProgress(state),
    questionInRoundProgress: getQuestionInRoundProgress(state),
    isLastQuestionOfRound: isLastQuestionOfRound(state),
    isLastRound: isLastRound(state),
    currentRoundQuestions: getCurrentRoundQuestions(state),
    roundWinners: getRoundWinners(state, currentRound),
    overallLeaders: getOverallLeaders(state),
    teamsSortedByScore: getTeamsSortedByScore(state),
    // Pause selectors
    isPaused: status === 'paused',
    canPause: status === 'playing' || status === 'between_rounds',
    canResume: status === 'paused',

    // -- Scene layer ---------------------------------------------------
    /** Current audience display scene. */
    audienceScene,

    /** True when answer_reveal scene is active. */
    isRevealActive: audienceScene === 'answer_reveal',

    /** True when the current scene has an auto-advance timer running. */
    isSceneTimedAutoAdvance: (
      audienceScene === 'game_intro' ||
      audienceScene === 'round_intro' ||
      audienceScene === 'question_anticipation' ||
      audienceScene === 'final_buildup'
    ),
  };
}

// Timer-specific selector for optimized re-renders
export function useTimerState() {
  return useGameStore(useShallow((state) => ({
    remaining: state.timer.remaining,
    duration: state.timer.duration,
    isRunning: state.timer.isRunning,
  })));
}

// Timer actions for components
export function useTimerActions() {
  return useGameStore(useShallow((state) => ({
    startTimer: state.startTimer,
    stopTimer: state.stopTimer,
    resetTimer: state.resetTimer,
    tickTimer: state.tickTimer,
  })));
}
