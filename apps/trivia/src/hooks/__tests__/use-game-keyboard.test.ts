import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameKeyboard } from '../use-game-keyboard';
import { useGameStore } from '@/stores/game-store';
import { resetAllStores } from '@/test/helpers/store';

// Mock uuid for predictable but unique values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

// Mock fullscreen API
const mockToggleFullscreen = vi.fn();
vi.mock('../use-fullscreen', () => ({
  useFullscreen: () => ({
    isFullscreen: false,
    toggleFullscreen: mockToggleFullscreen,
    enterFullscreen: vi.fn(),
    exitFullscreen: vi.fn(),
  }),
}));

describe('useGameKeyboard', () => {
  beforeEach(() => {
    resetAllStores();
    vi.clearAllMocks();
  });

  const dispatchKeyDown = (code: string, options?: { shiftKey?: boolean; target?: EventTarget }) => {
    const event = new KeyboardEvent('keydown', {
      code,
      shiftKey: options?.shiftKey ?? false,
      bubbles: true,
      cancelable: true,
    });
    if (options?.target) {
      Object.defineProperty(event, 'target', { value: options.target, writable: false });
    }
    window.dispatchEvent(event);
  };

  describe('arrow keys navigation', () => {
    it('should navigate down with ArrowDown', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(result.current.selectedQuestionIndex).toBe(0);

      act(() => {
        dispatchKeyDown('ArrowDown');
      });

      expect(result.current.selectedQuestionIndex).toBe(1);
    });

    it('should navigate up with ArrowUp', () => {
      const { result } = renderHook(() => useGameKeyboard());

      // First move down twice
      act(() => {
        dispatchKeyDown('ArrowDown');
      });
      act(() => {
        dispatchKeyDown('ArrowDown');
      });

      expect(result.current.selectedQuestionIndex).toBe(2);

      act(() => {
        dispatchKeyDown('ArrowUp');
      });

      expect(result.current.selectedQuestionIndex).toBe(1);
    });

    it('should not go below 0', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(result.current.selectedQuestionIndex).toBe(0);

      act(() => {
        dispatchKeyDown('ArrowUp');
      });

      expect(result.current.selectedQuestionIndex).toBe(0);
    });

    it('should not exceed questions length', () => {
      const { result } = renderHook(() => useGameKeyboard());

      const maxIndex = result.current.questions.length - 1;

      // Navigate to end (one event at a time to let state update)
      for (let i = 0; i < result.current.questions.length + 5; i++) {
        act(() => {
          dispatchKeyDown('ArrowDown');
        });
      }

      expect(result.current.selectedQuestionIndex).toBe(maxIndex);
    });
  });

  describe('Space key - peek answer', () => {
    it('should toggle peek answer', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(result.current.peekAnswer).toBe(false);

      act(() => {
        dispatchKeyDown('Space');
      });

      expect(result.current.peekAnswer).toBe(true);

      act(() => {
        dispatchKeyDown('Space');
      });

      expect(result.current.peekAnswer).toBe(false);
    });
  });

  describe('D key - toggle display', () => {
    it('should show question on display', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(result.current.displayQuestionIndex).toBeNull();

      act(() => {
        dispatchKeyDown('KeyD');
      });

      expect(result.current.displayQuestionIndex).toBe(0);
    });

    it('should hide question if already displayed', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        dispatchKeyDown('KeyD');
      });

      expect(result.current.displayQuestionIndex).toBe(0);

      act(() => {
        dispatchKeyDown('KeyD');
      });

      expect(result.current.displayQuestionIndex).toBeNull();
    });

    it('should show selected question when navigating', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        dispatchKeyDown('ArrowDown');
      });
      act(() => {
        dispatchKeyDown('ArrowDown');
      });
      act(() => {
        dispatchKeyDown('KeyD');
      });

      expect(result.current.selectedQuestionIndex).toBe(2);
      expect(result.current.displayQuestionIndex).toBe(2);
    });
  });

  describe('P key - pause/resume', () => {
    it('should pause when playing', () => {
      const { result } = renderHook(() => useGameKeyboard());

      // Start a game
      act(() => {
        result.current.addTeam('Team A');
      });
      act(() => {
        result.current.startGame();
      });

      expect(result.current.status).toBe('playing');

      act(() => {
        dispatchKeyDown('KeyP');
      });

      expect(result.current.status).toBe('paused');
    });

    it('should resume when paused', () => {
      const { result } = renderHook(() => useGameKeyboard());

      // Start a game and pause it
      act(() => {
        result.current.addTeam('Team A');
      });
      act(() => {
        result.current.startGame();
      });
      act(() => {
        dispatchKeyDown('KeyP');
      });

      expect(result.current.status).toBe('paused');

      act(() => {
        dispatchKeyDown('KeyP');
      });

      expect(result.current.status).toBe('playing');
    });
  });

  describe('E key - emergency pause', () => {
    it('should trigger emergency pause when playing', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        result.current.addTeam('Team A');
      });
      act(() => {
        result.current.startGame();
      });

      expect(result.current.emergencyBlank).toBe(false);

      act(() => {
        dispatchKeyDown('KeyE');
      });

      expect(result.current.status).toBe('paused');
      expect(result.current.emergencyBlank).toBe(true);
    });
  });

  describe('R key - reset game', () => {
    it('should reset game', () => {
      const { result } = renderHook(() => useGameKeyboard());

      // Set up some state
      act(() => {
        result.current.addTeam('Team A');
      });

      act(() => {
        result.current.startGame();
      });

      const teamId = result.current.teams[0].id;

      act(() => {
        result.current.adjustTeamScore(teamId, 100);
      });

      expect(result.current.status).toBe('playing');
      expect(result.current.teams[0].score).toBe(100);

      act(() => {
        dispatchKeyDown('KeyR');
      });

      expect(result.current.status).toBe('setup');
      expect(result.current.teams[0].score).toBe(0);
    });

    it('should reset peekAnswer', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        dispatchKeyDown('Space');
      });

      expect(result.current.peekAnswer).toBe(true);

      act(() => {
        dispatchKeyDown('KeyR');
      });

      expect(result.current.peekAnswer).toBe(false);
    });
  });

  describe('N key - next round', () => {
    it('should advance to next round when in between_rounds state', () => {
      const { result } = renderHook(() => useGameKeyboard());

      // Set up game and complete first round
      act(() => {
        result.current.addTeam('Team A');
      });
      act(() => {
        result.current.startGame();
      });
      act(() => {
        result.current.completeRound();
        // completeRound() only handles status transition; set scene manually
        // to simulate the advanceScene() flow that would normally set this.
        useGameStore.getState().setAudienceScene('round_summary');
      });

      expect(result.current.status).toBe('between_rounds');
      const initialRound = result.current.currentRound;

      act(() => {
        dispatchKeyDown('KeyN');
      });

      expect(result.current.currentRound).toBe(initialRound + 1);
      expect(result.current.status).toBe('playing');
    });

    it('should not advance round when not in between_rounds state', () => {
      const { result } = renderHook(() => useGameKeyboard());

      act(() => {
        result.current.addTeam('Team A');
      });
      act(() => {
        result.current.startGame();
      });

      const initialRound = result.current.currentRound;

      act(() => {
        dispatchKeyDown('KeyN');
      });

      expect(result.current.currentRound).toBe(initialRound);
    });
  });

  describe('M key - toggle TTS', () => {
    it('should toggle TTS enabled state', () => {
      renderHook(() => useGameKeyboard());

      const initialTtsState = useGameStore.getState().ttsEnabled;

      act(() => {
        dispatchKeyDown('KeyM');
      });

      expect(useGameStore.getState().ttsEnabled).toBe(!initialTtsState);

      act(() => {
        dispatchKeyDown('KeyM');
      });

      expect(useGameStore.getState().ttsEnabled).toBe(initialTtsState);
    });
  });

  describe('T key - toggle scoreboard', () => {
    it('should toggle scoreboard visibility', () => {
      renderHook(() => useGameKeyboard());

      const initialShowScoreboard = useGameStore.getState().showScoreboard;

      act(() => {
        dispatchKeyDown('KeyT');
      });

      expect(useGameStore.getState().showScoreboard).toBe(!initialShowScoreboard);

      act(() => {
        dispatchKeyDown('KeyT');
      });

      expect(useGameStore.getState().showScoreboard).toBe(initialShowScoreboard);
    });
  });

  describe('F key - toggle fullscreen', () => {
    it('should call toggleFullscreen', () => {
      renderHook(() => useGameKeyboard());

      act(() => {
        dispatchKeyDown('KeyF');
      });

      expect(mockToggleFullscreen).toHaveBeenCalled();
    });
  });

  describe('? key (Shift + /) - show help', () => {
    it('should toggle showHelp state', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(result.current.showHelp).toBe(false);

      act(() => {
        dispatchKeyDown('Slash', { shiftKey: true });
      });

      expect(result.current.showHelp).toBe(true);

      act(() => {
        dispatchKeyDown('Slash', { shiftKey: true });
      });

      expect(result.current.showHelp).toBe(false);
    });

    it('should not toggle showHelp without shift key', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(result.current.showHelp).toBe(false);

      act(() => {
        dispatchKeyDown('Slash', { shiftKey: false });
      });

      expect(result.current.showHelp).toBe(false);
    });
  });

  describe('ignores keys when typing', () => {
    it('should ignore keys when focused on input', () => {
      const { result } = renderHook(() => useGameKeyboard());

      const input = document.createElement('input');
      document.body.appendChild(input);

      const initialIndex = result.current.selectedQuestionIndex;

      act(() => {
        dispatchKeyDown('ArrowDown', { target: input });
      });

      // Should not have changed
      expect(result.current.selectedQuestionIndex).toBe(initialIndex);

      document.body.removeChild(input);
    });

    it('should ignore keys when focused on textarea', () => {
      const { result } = renderHook(() => useGameKeyboard());

      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      const initialIndex = result.current.selectedQuestionIndex;

      act(() => {
        dispatchKeyDown('ArrowDown', { target: textarea });
      });

      expect(result.current.selectedQuestionIndex).toBe(initialIndex);

      document.body.removeChild(textarea);
    });
  });

  describe('returned values', () => {
    it('should return fullscreen state and controls', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(result.current.isFullscreen).toBe(false);
      expect(typeof result.current.toggleFullscreen).toBe('function');
    });

    it('should return showHelp state and setter', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(result.current.showHelp).toBe(false);
      expect(typeof result.current.setShowHelp).toBe('function');

      act(() => {
        result.current.setShowHelp(true);
      });

      expect(result.current.showHelp).toBe(true);
    });

    it('should return toggle functions', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(typeof result.current.toggleScoreboard).toBe('function');
      expect(typeof result.current.toggleTTS).toBe('function');
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const { unmount } = renderHook(() => useGameKeyboard());
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'keydown',
        expect.any(Function)
      );
    });
  });
});
