'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGame } from './use-game';
import { useFullscreen } from './use-fullscreen';
import { useGameStore } from '@/stores/game-store';
import type { AudienceScene } from '@/types/audience-scene';

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
 * Help:
 * - ? = Show help modal
 */
export function useGameKeyboard() {
  const game = useGame();
  const fullscreen = useFullscreen();
  const [peekAnswer, setPeekAnswer] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

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
  }, [game, fullscreen, toggleScoreboard, toggleTTS]);

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
  };
}
