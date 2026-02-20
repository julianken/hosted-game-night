'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGame } from './use-game';
import { useFullscreen } from './use-fullscreen';
import { useGameStore } from '@/stores/game-store';
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
 * - N = Next round (when in between_rounds state)
 *
 * Display:
 * - D = Toggle display (show/hide question on audience)
 * - T = Toggle scoreboard on audience display
 * - F = Toggle fullscreen
 *
 * Audio:
 * - M = Mute/unmute TTS
 *
 * Scene-aware shortcuts (T1.12):
 * - T key (KeyT, no modifier): Start timer — NOT toggle. Transitions to question_active.
 * - S key: Context-dependent scene transitions.
 * - Enter: Skip timed scenes.
 *
 * Quick Score shortcuts (T2.4):
 * - 1-9 (Digit1-Digit9): During scoring phases, toggle score for team N.
 *   1 = team at index 0, 9 = team at index 8.
 * - 0 (Digit0): During scoring phases, toggle score for team at index 9.
 * - Shift+1-9: During scoring phases, remove a point from team N.
 * - Ctrl/Cmd+Z: Undo last score action.
 *
 * Scoring phase scenes (when 1-9 keys are active):
 * - scoring_pause (batch mode)
 * - question_closed (both modes)
 * - answer_reveal (instant mode)
 * - score_flash (instant mode)
 * - round_reveal_question (batch ceremony)
 * - round_reveal_answer (batch ceremony)
 *
 * Help:
 * - ? = Show help modal
 */

/** Scenes that trigger the POST_REVEAL_LOCK */
const REVEAL_LOCK_SCENES: ReadonlySet<AudienceScene> = new Set([
  'answer_reveal',
  'round_reveal_answer',
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
  'scoring_pause',
  'question_closed',
  'answer_reveal',
  'score_flash',
  'round_reveal_question',
  'round_reveal_answer',
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

  // Quick score — keyed by selectedQuestionIndex so it resets per question
  const quickScore = useQuickScore(game.selectedQuestionIndex);

  // POST_REVEAL_LOCK: prevents premature advancement during reveal animation
  const isLockedRef = useRef(false);
  const pendingKeyRef = useRef<string | null>(null);
  const lockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      // -- Quick score: 1-9 / 0 digit keys (T2.4) --
      // Handle before the main switch so digit keys don't fall through
      if (event.code in DIGIT_TO_TEAM_INDEX) {
        // Ctrl+Z or Cmd+Z: Undo (note: 'z' not a digit, handled below in switch)
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
        // Outside scoring phase — fall through to allow digit keys for other uses
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

        // Pause/Resume game — scene-aware
        case 'KeyP':
          if (game.canPause) {
            game.pauseGame();
            store.setAudienceScene('paused');
          } else if (game.canResume) {
            game.resumeGame();
            // Restore previous scene on resume (sceneBeforePause is set by engine)
            const sceneBeforePause = useGameStore.getState().sceneBeforePause;
            if (sceneBeforePause) {
              store.setAudienceScene(sceneBeforePause);
            } else {
              store.setAudienceScene('waiting');
            }
          }
          break;

        // Emergency pause - blanks audience display — scene-aware
        case 'KeyE':
          if (game.canPause || game.canResume) {
            game.emergencyPause();
            store.setAudienceScene('emergency_blank');
          }
          break;

        // Reset game
        case 'KeyR':
          game.resetGame();
          setPeekAnswer(false);
          break;

        // Next round (only when between rounds)
        case 'KeyN':
          if (game.status === 'between_rounds') {
            game.nextRound();
          }
          break;

        // Mute/unmute TTS
        case 'KeyM':
          toggleTTS();
          break;

        // T key — start timer and transition to question_active scene
        // NOT a toggle: if timer is already running, no-op for the timer start.
        // Scene transition always fires when in question_reading scene.
        case 'KeyT':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            // Check if we're in a question scene where starting the timer makes sense
            if (
              currentScene === 'question_reading' ||
              currentScene === 'question_anticipation'
            ) {
              // Only start timer if not already running
              if (!store.timer.isRunning) {
                store.startTimer();
              }
              store.setAudienceScene('question_active');
            } else {
              // Fallback: toggle scoreboard (legacy T behavior for non-question scenes)
              toggleScoreboard();
            }
          } else {
            toggleScoreboard();
          }
          break;

        // S key — context-dependent scene transitions
        case 'KeyS':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            switch (currentScene) {
              case 'question_reading':
                // Skip timer — transition directly to answer reveal (or question_closed)
                // In instant mode, go to answer_reveal; otherwise question_closed
                if (store.settings.revealMode === 'instant') {
                  store.setAudienceScene('answer_reveal');
                } else {
                  store.setAudienceScene('question_closed');
                }
                break;
              case 'question_active':
                // Close question — transition to question_closed
                store.stopTimer();
                store.setAudienceScene('question_closed');
                break;
              case 'question_closed':
                // Enter scoring — in instant mode go to answer_reveal
                if (store.settings.revealMode === 'instant') {
                  store.setAudienceScene('answer_reveal');
                } else {
                  store.setAudienceScene('scoring_pause');
                }
                break;
              default:
                break;
            }
          }
          break;

        // Enter — skip timed scenes
        case 'Enter':
          switch (currentScene) {
            case 'game_intro':
              store.setAudienceScene('round_intro');
              break;
            case 'round_intro':
              store.setAudienceScene('question_anticipation');
              break;
            case 'question_anticipation':
              store.setAudienceScene('question_reading');
              break;
            case 'answer_reveal':
              store.setAudienceScene('score_flash');
              break;
            case 'score_flash':
              // Advance to next question (question_reading of next Q)
              store.setAudienceScene('question_reading');
              break;
            case 'final_buildup':
              store.setAudienceScene('final_podium');
              break;
            case 'round_reveal_intro':
              store.advanceCeremony();
              break;
            case 'round_reveal_question':
              store.advanceCeremony();
              break;
            case 'round_reveal_answer':
              store.advanceCeremony();
              break;
            default:
              break;
          }
          break;

        // Toggle fullscreen
        case 'KeyF':
          fullscreen.toggleFullscreen();
          break;

        // Ctrl/Cmd+Z — undo last score action (T2.4)
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
  }, [game, fullscreen, toggleScoreboard, toggleTTS, quickScore]);

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
    // Quick score (T2.4/T2.5)
    quickScore,
  };
}
