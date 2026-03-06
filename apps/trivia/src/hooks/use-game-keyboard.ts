'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGame } from './use-game';
import { useFullscreen } from './use-fullscreen';
import { useGameStore } from '@/stores/game-store';
import { useAudienceScene } from './use-audience-scene';
import type { AudienceScene } from '@/types/audience-scene';
import { useQuickScore } from './use-quick-score';
import { SCENE_TRIGGERS } from '@/lib/game/scene';

/**
 * Keyboard shortcut hook for trivia game controls.
 *
 * All scene transitions go through store.advanceScene(trigger), which
 * consults getNextScene() as the single source of truth. The keyboard
 * handler is a pure dispatcher: key -> trigger -> advanceScene.
 *
 * Exceptions that bypass advanceScene:
 * - E (emergency blank/restore — visual only, no game status change)
 * - R (reset game -- goes to 'waiting' unconditionally)
 *
 * Navigation:
 * - ArrowUp/ArrowDown = Navigate questions
 *
 * Display:
 * - Space = Toggle display (show/hide question on audience)
 *
 * Answer reveal:
 * - P = Peek answer (toggle, local only)
 *
 * Game controls:
 * - E = Emergency pause (blanks display, scene-aware)
 * - R = Reset game
 * - N = Next round (when in between_rounds AND scene is round_summary)
 *
 * Display (additional):
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

/**
 * Scenes where 1-9/0 quick-score keys and Shift+digit/-score keys are active.
 * Includes recap scenes so the host can adjust scores while reviewing answers.
 */
const SCORING_PHASE_SCENES: ReadonlySet<AudienceScene> = new Set([
  'question_closed',
  'answer_reveal',
  'round_summary',
  'recap_title',
  'recap_qa',
  'round_scoring',
  'recap_scores',
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

  // Reset peekAnswer when game resets to setup
  useEffect(() => {
    if (game.status === 'setup') {
      setPeekAnswer(false);
    }
  }, [game.status]);

  // Quick score -- keyed by selectedQuestionIndex so it resets per question
  const quickScore = useQuickScore(game.selectedQuestionIndex);

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

        // Left Arrow -- recap backward navigation (all recap scenes)
        case 'ArrowLeft':
          if (
            store.status === 'between_rounds' &&
            (currentScene === 'recap_qa' || currentScene === 'recap_title' || currentScene === 'recap_scores')
          ) {
            event.preventDefault();
            store.advanceScene(SCENE_TRIGGERS.BACK);
          }
          break;

        // Right Arrow -- advance trigger (round_summary -> answer review -> next)
        case 'ArrowRight':
          event.preventDefault();
          store.advanceScene(SCENE_TRIGGERS.ADVANCE);
          break;

        // Toggle display question on audience
        case 'Space':
          event.preventDefault();
          if (game.displayQuestionIndex === game.selectedQuestionIndex) {
            game.setDisplayQuestion(null);
          } else {
            game.setDisplayQuestion(game.selectedQuestionIndex);
          }
          break;

        // Peek answer (local only)
        case 'KeyP':
          setPeekAnswer((prev) => !prev);
          break;

        // Emergency blank -- blanks audience display (visual only, bypasses advanceScene)
        case 'KeyE':
          store.toggleEmergencyBlank();
          break;

        // Reset game (bypasses advanceScene -- unconditional return to waiting)
        case 'KeyR':
          game.resetGame();
          setPeekAnswer(false);
          store.setAudienceScene('waiting');
          break;

        // Next round (advanceScene handles both scene change and nextRound side effect)
        case 'KeyN':
          if (
            game.status === 'between_rounds' &&
            (
              currentScene === 'round_summary' ||
              currentScene === 'answer_reveal' ||
              currentScene === 'recap_title' ||
              currentScene === 'recap_qa' ||
              currentScene === 'round_scoring' ||
              currentScene === 'recap_scores'
            )
          ) {
            store.advanceScene(SCENE_TRIGGERS.NEXT_ROUND);
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

        // S key -- close question (pub trivia: no per-question reveals)
        case 'KeyS':
          if (!event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) {
            if (currentScene === 'question_display') {
              if (store.timer.isRunning) {
                store.stopTimer();
              }
              store.advanceScene(SCENE_TRIGGERS.CLOSE);
            } else if (currentScene === 'question_closed') {
              store.advanceScene(SCENE_TRIGGERS.CLOSE);
            }
          }
          break;

        // Enter -- skip timed scenes (blocked during round_scoring to prevent accidental advance)
        case 'Enter':
          if (currentScene === 'round_scoring') break;
          store.advanceScene(SCENE_TRIGGERS.SKIP);
          break;

        // Toggle fullscreen
        case 'KeyF':
          fullscreen.toggleFullscreen();
          break;

        // Ctrl/Cmd+Z -- undo last score action (excluded during round_scoring; panel owns undo)
        case 'KeyZ':
          if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
            if (SCORING_PHASE_SCENES.has(currentScene) && currentScene !== 'round_scoring') {
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
