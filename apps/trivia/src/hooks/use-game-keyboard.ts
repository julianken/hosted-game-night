'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGame } from './use-game';
import { useFullscreen } from './use-fullscreen';
import { useGameStore } from '@/stores/game-store';

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
 * - P = Pause/Resume game
 * - E = Emergency pause (blanks display)
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

        // Pause/Resume game
        case 'KeyP':
          if (game.canPause) {
            game.pauseGame();
          } else if (game.canResume) {
            game.resumeGame();
          }
          break;

        // Emergency pause - blanks audience display
        case 'KeyE':
          if (game.canPause || game.canResume) {
            game.emergencyPause();
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

        // Toggle scoreboard on display
        case 'KeyT':
          toggleScoreboard();
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
