'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGame } from './use-game';
import { useFullscreen } from './use-fullscreen';
import { useGameStore } from '@/stores/game-store';
import { useAudienceScene } from './use-audience-scene';
import type { AudienceScene } from '@/types/audience-scene';
import { REVEAL_TIMING } from '@/types/audience-scene';
import { useQuickScore } from './use-quick-score';

/**
 * Keyboard shortcut hook for trivia game controls.
 *
 * Navigation:
 * - ArrowUp/ArrowDown = Navigate questions
 *
 * Answer reveal:
 * - Space = Peek answer (toggle, local only - original behavior preserved)
 *
 * Game controls:
 * - P = Pause/Resume game (scene-aware: sets/restores audienceScene)
 * - E = Emergency pause (blanks display, scene-aware)
 * - R = Reset game
 * - N = Next round (when in between_rounds state AND scene is round_summary)
 *
 * Display:
 * - D = Toggle display (show/hide question on audience)
 * - T = Toggle scoreboard on audience display
 * - F = Toggle fullscreen
 *
 * Audio:
 * - M = Mute/unmute TTS
 *
 * Scene-aware shortcuts:
 * - T key (KeyT, no modifier): Start timer (stays in question_display).
 * - S key: Context-dependent scene transitions.
 * - Enter: Skip timed scenes.
 * - Right Arrow: Advance from answer_reveal/score_flash.
 *
 * Quick Score shortcuts:
 * - 1-9 (Digit1-Digit9): During scoring phases, toggle score for team N.
 * - 0 (Digit0): During scoring phases, toggle score for team at index 9.
 * - Shift+1-9: During scoring phases, remove a point from team N.
 * - Ctrl/Cmd+Z: Undo last score action.
 *
 * Scoring phase scenes (when 1-9 keys are active):
 * - question_closed
 * - answer_reveal
 * - score_flash
 *
 * Help:
 * - ? = Show help modal
 */

/** Scenes that trigger the POST_REVEAL_LOCK */
const REVEAL_LOCK_SCENES: ReadonlySet<AudienceScene> = new Set([
  'answer_reveal',
]);

/** Keys blocked during the reveal lock (advancement keys only) */
const LOCKED_KEY_CODES: ReadonlySet<string> = new Set([
  'Enter',
  'ArrowRight',
  'Space',
]);

/**
 * Scenes where 1-9/0 quick-score keys and Shift+digit/-score keys are active.
 */
const SCORING_PHASE_SCENES: ReadonlySet<AudienceScene> = new Set([
  'question_closed',
  'answer_reveal',
  'score_flash',
]);

/**
 * Map from event.code (Digit1-Digit9, Digit0) to team index (0-based).
 * Digit1 -> 0, Digit2 -> 1, ..., Digit9 -> 8, Digit0 -> 9.
 */
const DIGIT_TO_TEAM_INDEX: Record<string, number> = {
  Digit1: 0,
  Digit2: 1,
  Digit3: 2,
  Digit4: 3,
  Digit5: 4,
  Digit6: 5,
  Digit7: 6,
  Digit8: 7,
  Digit9: 8,
  Digit0: 9,
};

export function useGameKeyboard() {
  const game = useGame();
  const fullscreen = useFullscreen();
  const [peekAnswer, setPeekAnswer] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Quick score -- keyed by selectedQuestionIndex so it resets per question
  const quickScore = useQuickScore(game.selectedQuestionIndex);

  // POST_REVEAL_LOCK: prevents premature advancement during reveal animation
  const isLockedRef = useRef(false);
  const pendingKeyRef = useRef<string | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // useAudienceScene for the presenter -- gives us timeRemaining for auto-advance
  const audienceSceneControls = useAudienceScene({ role: 'presenter' });

  // Toggle scoreboard visibility
  const toggleScoreboard = useCallback(() => {
    const state = useGameStore.getState();
    useGameStore.setState({ showScoreboard: !state.showScoreboard });
  }, []);

  // Toggle TTS
  const toggleTTS = useCallback(() => {
    const state = useGameStore.getState();
    useGameStore.setState({ ttsEnabled: !state.ttsEnabled });
  }, []);

  // POST_REVEAL_LOCK: Start lock when entering a reveal scene, clear after POST_REVEAL_LOCK_MS.
  // Queued keypresses are replayed by dispatching a synthetic keydown event.
  useEffect(() => {
    const unsub = useGameStore.subscribe((state, prevState) => {
      const scene = state.audienceScene;
      const prevScene = prevState.audienceScene;
      if (scene !== prevScene && REVEAL_LOCK_SCENES.has(scene)) {
        // Entering a reveal scene: engage lock
        isLockedRef.current = true;
        pendingKeyRef.current = null;

        // Clear any existing timer
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);

        lockTimerRef.current = setTimeout(() => {
          isLockedRef.current = false;
          // Replay queued keypress
          const pending = pendingKeyRef.current;
          pendingKeyRef.current = null;
          if (pending) {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: pending, bubbles: true }));
          }
        }, REVEAL_TIMING.POST_REVEAL_LOCK_MS);
      }
    });

    return () => {
      unsub();
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current);
    };
  }, []);

  // Helper: determine if current question is last of current round
  const isLastQuestionInRound = useCallback((): boolean => {
    const store = useGameStore.getState();
    const roundQs = store.questions.filter(
      (q) => q.roundIndex === store.currentRound
    );
    const displayIdx = store.displayQuestionIndex;
    const currentRoundQIndex = displayIdx !== null
      ? roundQs.findIndex((q) => store.questions.indexOf(q) === displayIdx)
      : -1;
    return currentRoundQIndex >= 0 && currentRoundQIndex >= roundQs.length - 1;
  }, []);

  // Helper: determine if current round is the last round
  const isLastRoundNow = useCallback((): boolean => {
    const store = useGameStore.getState();
    return store.currentRound >= store.totalRounds - 1;
  }, []);

  // Auto-advance: when timeRemaining reaches 0, fire the appropriate next-scene transition.
  useEffect(() => {
    const { timeRemaining, scene } = audienceSceneControls;
    if (timeRemaining !== 0) return;

    // timeRemaining hit 0 -- auto-advance this scene
    const store = useGameStore.getState();

    switch (scene) {
      case 'game_intro':
        store.setAudienceScene('round_intro');
        break;
      case 'round_intro':
        store.setAudienceScene('question_anticipation');
        break;
      case 'question_anticipation':
        store.setAudienceScene('question_display');
        break;
      case 'answer_reveal':
        store.setAudienceScene('score_flash');
        break;
      case 'score_flash': {
        // FIX Bug #1: score_flash auto-advance must branch correctly
        const lastQ = isLastQuestionInRound();
        const lastR = isLastRoundNow();
        if (lastQ) {
          if (lastR) {
            store.setAudienceScene('final_buildup');
          } else {
            store.completeRound();
            // completeRound already sets 'round_summary'
          }
        } else {
          store.setAudienceScene('question_anticipation');
        }
        break;
      }
      case 'final_buildup':
        store.setAudienceScene('final_podium');
        break;
      default:
        break;
    }
  // Only re-run when timeRemaining transitions to 0
  }, [audienceSceneControls.timeRemaining, isLastQuestionInRound, isLastRoundNow]); // intentional: only watch timeRemaining

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // POST_REVEAL_LOCK: Queue advancement keys during reveal animation
      if (isLockedRef.current && LOCKED_KEY_CODES.has(event.code)) {
        event.preventDefault();
        pendingKeyRef.current = event.code;
        return;
      }

      // Read current scene at event time (avoids stale closure)
      const currentScene: AudienceScene = useGameStore.getState().audienceScene;
      const store = useGameStore.getState();

      // -- Quick score: 1-9 / 0 digit keys --
      // Handle before the main switch so digit keys don't fall through
      if (event.code in DIGIT_TO_TEAM_INDEX) {
        // During scoring phases: toggle or remove team score
        if (SCORING_PHASE_SCENES.has(currentScene)) {
          const teamIndex = DIGIT_TO_TEAM_INDEX[event.code];
          const teams = useGameStore.getState().teams;
          const team = teams[teamIndex];

          if (team) {
            if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
              // Shift+Digit: remove a point from team N (direct -1, no toggle tracking)
              event.preventDefault();
              store.adjustTeamScore(team.id, -1);
            } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
              // Plain digit: toggle score for team N
              event.preventDefault();
              quickScore.toggleTeam(team.id);
            }
          }
          return;
        }
        // Outside scoring phase -- fall through to allow digit keys for other uses
      }

      switch (event.code) {
        // Navigation
        case 'ArrowUp':
          event.preventDefault();
          if (game.selectedQuestionIndex > 0) {
            game.selectQuestion(game.selectedQuestionIndex - 1);
          }
          break;

        case 'ArrowDown':
          event.preventDefault();
          if (game.selectedQuestionIndex < game.questions.length - 1) {
            game.selectQuestion(game.selectedQuestionIndex + 1);
          }
          break;

        // Right Arrow -- context-dependent advancement
        case 'ArrowRight': {
          event.preventDefault();
          switch (currentScene) {
            // FIX Bug #4: answer_reveal + ArrowRight should go to score_flash
            case 'answer_reveal':
              store.setAudienceScene('score_flash');
              break;

            case 'score_flash': {
              // FIX Bug #5: score_flash + ArrowRight must branch correctly
              const lastQ = isLastQuestionInRound();
              const lastR = isLastRoundNow();
              if (lastQ) {
                if (lastR) {
                  store.setAudienceScene('final_buildup');
                } else {
                  store.completeRound();
                  // completeRound sets 'round_summary'
                }
              } else {
                store.setAudienceScene('question_anticipation');
              }
              break;
            }

            default:
              break;
          }
          break;
        }

        // Peek answer (local only)
        case 'Space':
          event.preventDefault();
          setPeekAnswer((prev) => !prev);
          break;

        // Toggle display question on audience
        case 'KeyD':
          if (game.displayQuestionIndex === game.selectedQuestionIndex) {
            // Currently showing this question, hide it
            game.setDisplayQuestion(null);
          } else {
            // Show the selected question
            game.setDisplayQuestion(game.selectedQuestionIndex);
          }
          break;

        // Pause/Resume game -- scene-aware
        // FIX Bug #11: save sceneBeforePause before pausing, restore on resume
        case 'KeyP':
          if (game.canPause) {
            // Save current scene before pausing
            const sceneBeforePause = currentScene;
            game.pauseGame();
            useGameStore.setState({ sceneBeforePause });
            store.setAudienceScene('paused');
          } else if (game.canResume) {
            game.resumeGame();
            // Restore previous scene on resume (sceneBeforePause is set above)
            const sceneBeforePause = useGameStore.getState().sceneBeforePause;
            if (sceneBeforePause) {
              store.setAudienceScene(sceneBeforePause);
              useGameStore.setState({ sceneBeforePause: null });
            } else {
              store.setAudienceScene('waiting');
            }
          }
          break;

        // Emergency pause - blanks audience display -- scene-aware
        // FIX Bug #11: save sceneBeforePause before emergency blank, restore on restore
        case 'KeyE':
          if (currentScene === 'emergency_blank') {
            // Restore from emergency blank
            game.resumeGame();
            const sceneBeforePause = useGameStore.getState().sceneBeforePause;
            if (sceneBeforePause) {
              store.setAudienceScene(sceneBeforePause);
              useGameStore.setState({ sceneBeforePause: null });
            } else {
              store.setAudienceScene('waiting');
            }
          } else if (game.canPause || game.canResume) {
            // Save current scene before emergency blank
            const sceneBeforePause = currentScene;
            game.emergencyPause();
            useGameStore.setState({ sceneBeforePause });
            store.setAudienceScene('emergency_blank');
          }
          break;

        // Reset game
        case 'KeyR':
          game.resetGame();
          setPeekAnswer(false);
          store.setAudienceScene('waiting');
          break;

        // Next round (only when between rounds AND scene is round_summary)
        case 'KeyN':
          if (game.status === 'between_rounds' && currentScene === 'round_summary') {
            game.nextRound();
          }
          break;

        // Mute/unmute TTS
        case 'KeyM':
          toggleTTS();
          break;

        // T key -- start timer (stays in question_display scene)
        case 'KeyT':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            // Check if we're in a question scene where starting the timer makes sense
            if (
              currentScene === 'question_display' ||
              currentScene === 'question_anticipation'
            ) {
              // Only start timer if not already running
              if (!store.timer.isRunning) {
                store.startTimer();
              }
              // Ensure we're in question_display (anticipation -> display)
              if (currentScene === 'question_anticipation') {
                store.setAudienceScene('question_display');
              }
            } else {
              // Fallback: toggle scoreboard (legacy T behavior for non-question scenes)
              toggleScoreboard();
            }
          } else {
            toggleScoreboard();
          }
          break;

        // S key -- context-dependent scene transitions
        case 'KeyS':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            switch (currentScene) {
              case 'question_display':
                if (store.timer.isRunning) {
                  // Timer is running -- close question (stop timer, go to question_closed)
                  store.stopTimer();
                  store.setAudienceScene('question_closed');
                } else {
                  // Timer not started -- skip directly to answer reveal
                  store.setAudienceScene('answer_reveal');
                }
                break;
              case 'question_closed':
                // Enter scoring -- go to answer_reveal
                store.setAudienceScene('answer_reveal');
                break;
              default:
                break;
            }
          }
          break;

        // Enter -- skip timed scenes
        case 'Enter':
          switch (currentScene) {
            case 'game_intro':
              store.setAudienceScene('round_intro');
              break;
            case 'round_intro':
              store.setAudienceScene('question_anticipation');
              break;
            case 'question_anticipation':
              store.setAudienceScene('question_display');
              break;
            case 'answer_reveal':
              store.setAudienceScene('score_flash');
              break;
            case 'score_flash': {
              // FIX Bug #2: Enter on score_flash must branch correctly
              const lastQ = isLastQuestionInRound();
              const lastR = isLastRoundNow();
              if (lastQ) {
                if (lastR) {
                  store.setAudienceScene('final_buildup');
                } else {
                  store.completeRound();
                  // completeRound sets 'round_summary'
                }
              } else {
                store.setAudienceScene('question_anticipation');
              }
              break;
            }
            case 'final_buildup':
              store.setAudienceScene('final_podium');
              break;
            default:
              break;
          }
          break;

        // Toggle fullscreen
        case 'KeyF':
          fullscreen.toggleFullscreen();
          break;

        // Ctrl/Cmd+Z -- undo last score action
        case 'KeyZ':
          if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
            if (SCORING_PHASE_SCENES.has(currentScene)) {
              event.preventDefault();
              quickScore.undo();
            }
          }
          break;

        // Show help modal (? = Shift + /)
        case 'Slash':
          if (event.shiftKey) {
            event.preventDefault();
            setShowHelp((prev) => !prev);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [game, fullscreen, toggleScoreboard, toggleTTS, quickScore, isLastQuestionInRound, isLastRoundNow]);

  return {
    ...game,
    peekAnswer,
    setPeekAnswer,
    showHelp,
    setShowHelp,
    // Fullscreen state and controls
    isFullscreen: fullscreen.isFullscreen,
    toggleFullscreen: fullscreen.toggleFullscreen,
    // Additional toggles
    toggleScoreboard,
    toggleTTS,
    // Quick score
    quickScore,
    // Scene controls (for presenter UI)
    audienceSceneControls,
  };
}
