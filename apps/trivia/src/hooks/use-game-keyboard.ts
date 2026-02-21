'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useGame } from './use-game';
import { useFullscreen } from './use-fullscreen';
import { useGameStore } from '@/stores/game-store';
import { useAudienceScene } from './use-audience-scene';
import type { AudienceScene } from '@/types/audience-scene';
import { REVEAL_TIMING } from '@/types/audience-scene';
import { useQuickScore } from './use-quick-score';
import { SCENE_TRIGGERS } from '@/lib/game/scene';

/**
 * Keyboard shortcut hook for trivia game controls.
 *
 * All scene transitions go through store.advanceScene(trigger), which
 * consults getNextScene() as the single source of truth. The keyboard
 * handler is a pure dispatcher: key -> trigger -> advanceScene.
 *
 * Exceptions that bypass advanceScene (need sceneBeforePause management):
 * - P (pause/resume)
 * - E (emergency blank/restore)
 * - R (reset game -- goes to 'waiting' unconditionally)
 *
 * Navigation:
 * - ArrowUp/ArrowDown = Navigate questions
 *
 * Answer reveal:
 * - Space = Peek answer (toggle, local only)
 *
 * Game controls:
 * - P = Pause/Resume game (scene-aware: sets/restores audienceScene)
 * - E = Emergency pause (blanks display, scene-aware)
 * - R = Reset game
 * - N = Next round (when in between_rounds AND scene is round_summary)
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
 * - Enter: Skip timed scenes via advanceScene('skip').
 * - Right Arrow: Advance via advanceScene('advance').
 *
 * Quick Score shortcuts:
 * - 1-9 (Digit1-Digit9): During scoring phases, toggle score for team N.
 * - 0 (Digit0): During scoring phases, toggle score for team at index 9.
 * - Shift+1-9: During scoring phases, remove a point from team N.
 * - Ctrl/Cmd+Z: Undo last score action.
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
]);

/**
 * Map from event.code (Digit1-Digit9, Digit0) to team index (0-based).
 */
const DIGIT_TO_TEAM_INDEX: Record<string, number> = {
  Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4,
  Digit6: 5, Digit7: 6, Digit8: 7, Digit9: 8, Digit0: 9,
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
        isLockedRef.current = true;
        pendingKeyRef.current = null;
        if (lockTimerRef.current) clearTimeout(lockTimerRef.current);

        lockTimerRef.current = setTimeout(() => {
          isLockedRef.current = false;
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

  // Auto-advance: when timeRemaining reaches 0, dispatch AUTO trigger.
  useEffect(() => {
    const { timeRemaining } = audienceSceneControls;
    if (timeRemaining !== 0) return;

    const store = useGameStore.getState();
    store.advanceScene(SCENE_TRIGGERS.AUTO);
  }, [audienceSceneControls.timeRemaining]); // intentional: only watch timeRemaining

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
      if (event.code in DIGIT_TO_TEAM_INDEX) {
        if (SCORING_PHASE_SCENES.has(currentScene)) {
          const teamIndex = DIGIT_TO_TEAM_INDEX[event.code];
          const teams = store.teams;
          const team = teams[teamIndex];

          if (team) {
            if (event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
              event.preventDefault();
              store.adjustTeamScore(team.id, -1);
            } else if (!event.ctrlKey && !event.metaKey && !event.altKey) {
              event.preventDefault();
              quickScore.toggleTeam(team.id);
            }
          }
          return;
        }
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

        // Right Arrow -- advance trigger (answer_reveal -> next)
        case 'ArrowRight':
          event.preventDefault();
          store.advanceScene(SCENE_TRIGGERS.ADVANCE);
          break;

        // Peek answer (local only)
        case 'Space':
          event.preventDefault();
          setPeekAnswer((prev) => !prev);
          break;

        // Toggle display question on audience
        case 'KeyD':
          if (game.displayQuestionIndex === game.selectedQuestionIndex) {
            game.setDisplayQuestion(null);
          } else {
            game.setDisplayQuestion(game.selectedQuestionIndex);
          }
          break;

        // Pause/Resume game -- scene-aware (bypasses advanceScene)
        case 'KeyP':
          if (game.canPause) {
            const sceneBeforePause = currentScene;
            game.pauseGame();
            useGameStore.setState({ sceneBeforePause });
            store.setAudienceScene('paused');
          } else if (game.canResume) {
            game.resumeGame();
            const sceneBeforePause = useGameStore.getState().sceneBeforePause;
            if (sceneBeforePause) {
              store.setAudienceScene(sceneBeforePause);
              useGameStore.setState({ sceneBeforePause: null });
            } else {
              store.setAudienceScene('waiting');
            }
          }
          break;

        // Emergency pause -- blanks audience display (bypasses advanceScene)
        case 'KeyE':
          if (currentScene === 'emergency_blank') {
            game.resumeGame();
            const sceneBeforePause = useGameStore.getState().sceneBeforePause;
            if (sceneBeforePause) {
              store.setAudienceScene(sceneBeforePause);
              useGameStore.setState({ sceneBeforePause: null });
            } else {
              store.setAudienceScene('waiting');
            }
          } else if (game.canPause || game.canResume) {
            const sceneBeforePause = currentScene;
            game.emergencyPause();
            useGameStore.setState({ sceneBeforePause });
            store.setAudienceScene('emergency_blank');
          }
          break;

        // Reset game (bypasses advanceScene -- unconditional return to waiting)
        case 'KeyR':
          game.resetGame();
          setPeekAnswer(false);
          store.setAudienceScene('waiting');
          break;

        // Next round (scene advance first, then status transition)
        // advanceScene must run before nextRound so isLastRound is computed
        // from the CURRENT round (the one being summarized), not the next.
        case 'KeyN':
          if (game.status === 'between_rounds' && currentScene === 'round_summary') {
            store.advanceScene(SCENE_TRIGGERS.NEXT_ROUND);
            store.nextRound();
          }
          break;

        // Mute/unmute TTS
        case 'KeyM':
          toggleTTS();
          break;

        // T key -- start timer or toggle scoreboard
        case 'KeyT':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (currentScene === 'question_display' || currentScene === 'question_anticipation') {
              if (!store.timer.isRunning) {
                store.startTimer();
              }
              // Ensure we're in question_display (anticipation -> display)
              if (currentScene === 'question_anticipation') {
                store.advanceScene(SCENE_TRIGGERS.SKIP);
              }
            } else {
              toggleScoreboard();
            }
          } else {
            toggleScoreboard();
          }
          break;

        // S key -- close question or reveal answer
        case 'KeyS':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (currentScene === 'question_display') {
              if (store.timer.isRunning) {
                store.stopTimer();
                store.advanceScene(SCENE_TRIGGERS.CLOSE);
              } else {
                store.advanceScene(SCENE_TRIGGERS.REVEAL);
              }
            } else if (currentScene === 'question_closed') {
              store.advanceScene(SCENE_TRIGGERS.REVEAL);
            }
          }
          break;

        // Enter -- skip timed scenes
        case 'Enter':
          store.advanceScene(SCENE_TRIGGERS.SKIP);
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
    // Quick score
    quickScore,
    // Scene controls (for presenter UI)
    audienceSceneControls,
  };
}
