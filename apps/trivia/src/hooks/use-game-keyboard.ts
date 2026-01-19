'use client';

import { useEffect, useState } from 'react';
import { useGame } from './use-game';

/**
 * Keyboard shortcut hook for trivia game controls.
 * ↑/↓ = Navigate questions
 * P = Peek answer (toggle, local only)
 * D = Toggle display (show/hide question on audience)
 * R = Reset game
 */
export function useGameKeyboard() {
  const game = useGame();
  const [peekAnswer, setPeekAnswer] = useState(false);

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
        case 'KeyP':
          // Toggle peek answer (local only)
          setPeekAnswer((prev) => !prev);
          break;
        case 'KeyD':
          // Toggle display question on audience
          if (game.displayQuestionIndex === game.selectedQuestionIndex) {
            // Currently showing this question, hide it
            game.setDisplayQuestion(null);
          } else {
            // Show the selected question
            game.setDisplayQuestion(game.selectedQuestionIndex);
          }
          break;
        case 'KeyR':
          game.resetGame();
          setPeekAnswer(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [game]);

  return {
    ...game,
    peekAnswer,
    setPeekAnswer,
  };
}
