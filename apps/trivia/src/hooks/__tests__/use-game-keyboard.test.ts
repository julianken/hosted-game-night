import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, fireEvent } from '@testing-library/react';
import { useGameKeyboard } from '../use-game-keyboard';
import { resetAllStores } from '@/test/helpers/store';

// Mock uuid for predictable but unique values
const mockUuidCounter = vi.hoisted(() => ({ value: 0 }));
vi.mock('uuid', () => ({
  v4: vi.fn(() => `mock-uuid-${++mockUuidCounter.value}`),
}));

describe('useGameKeyboard', () => {
  beforeEach(() => {
    resetAllStores();
  });

  const dispatchKeyDown = (code: string, target?: EventTarget) => {
    const event = new KeyboardEvent('keydown', {
      code,
      bubbles: true,
      cancelable: true,
    });
    if (target) {
      Object.defineProperty(event, 'target', { value: target, writable: false });
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

  describe('P key - peek answer', () => {
    it('should toggle peek answer', () => {
      const { result } = renderHook(() => useGameKeyboard());

      expect(result.current.peekAnswer).toBe(false);

      act(() => {
        dispatchKeyDown('KeyP');
      });

      expect(result.current.peekAnswer).toBe(true);

      act(() => {
        dispatchKeyDown('KeyP');
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
        dispatchKeyDown('KeyP');
      });

      expect(result.current.peekAnswer).toBe(true);

      act(() => {
        dispatchKeyDown('KeyR');
      });

      expect(result.current.peekAnswer).toBe(false);
    });
  });

  describe('ignores keys when typing', () => {
    it('should ignore keys when focused on input', () => {
      const { result } = renderHook(() => useGameKeyboard());

      const input = document.createElement('input');
      document.body.appendChild(input);

      const initialIndex = result.current.selectedQuestionIndex;

      act(() => {
        const event = new KeyboardEvent('keydown', {
          code: 'ArrowDown',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', { value: input, writable: false });
        window.dispatchEvent(event);
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
        const event = new KeyboardEvent('keydown', {
          code: 'ArrowDown',
          bubbles: true,
        });
        Object.defineProperty(event, 'target', {
          value: textarea,
          writable: false,
        });
        window.dispatchEvent(event);
      });

      expect(result.current.selectedQuestionIndex).toBe(initialIndex);

      document.body.removeChild(textarea);
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
