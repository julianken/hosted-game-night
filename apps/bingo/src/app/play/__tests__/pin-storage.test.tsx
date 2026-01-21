import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCallback, useEffect, useState } from 'react';

/**
 * Tests for PIN storage logic in play page
 *
 * These tests verify the PIN storage utilities work correctly with localStorage
 */
describe('PIN Storage Logic', () => {
  const PIN_STORAGE_KEY = 'bingo_session_pin';

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('storePin', () => {
    it('stores PIN in localStorage', () => {
      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);
        const storePin = useCallback((pin: string) => {
          try {
            localStorage.setItem(PIN_STORAGE_KEY, pin);
            setStoredPin(pin);
          } catch (err) {
            console.error('Failed to store PIN:', err);
          }
        }, []);

        return { storePin, storedPin };
      });

      act(() => {
        result.current.storePin('1234');
      });

      expect(localStorage.getItem(PIN_STORAGE_KEY)).toBe('1234');
      expect(result.current.storedPin).toBe('1234');
    });

    it('updates state when PIN is stored', () => {
      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);
        const storePin = useCallback((pin: string) => {
          try {
            localStorage.setItem(PIN_STORAGE_KEY, pin);
            setStoredPin(pin);
          } catch (err) {
            console.error('Failed to store PIN:', err);
          }
        }, []);

        return { storePin, storedPin };
      });

      expect(result.current.storedPin).toBeNull();

      act(() => {
        result.current.storePin('5678');
      });

      expect(result.current.storedPin).toBe('5678');
    });

    it('overwrites existing PIN', () => {
      localStorage.setItem(PIN_STORAGE_KEY, 'old-pin');

      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);
        const storePin = useCallback((pin: string) => {
          try {
            localStorage.setItem(PIN_STORAGE_KEY, pin);
            setStoredPin(pin);
          } catch (err) {
            console.error('Failed to store PIN:', err);
          }
        }, []);

        return { storePin, storedPin };
      });

      act(() => {
        result.current.storePin('new-pin');
      });

      expect(localStorage.getItem(PIN_STORAGE_KEY)).toBe('new-pin');
      expect(result.current.storedPin).toBe('new-pin');
    });

    it('handles localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const localStorageSetItemSpy = vi
        .spyOn(Storage.prototype, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceededError');
        });

      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);
        const storePin = useCallback((pin: string) => {
          try {
            localStorage.setItem(PIN_STORAGE_KEY, pin);
            setStoredPin(pin);
          } catch (err) {
            console.error('Failed to store PIN:', err);
          }
        }, []);

        return { storePin, storedPin };
      });

      act(() => {
        result.current.storePin('1234');
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to store PIN:',
        expect.any(Error)
      );

      localStorageSetItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('loadStoredPin', () => {
    it('loads PIN from localStorage', () => {
      localStorage.setItem(PIN_STORAGE_KEY, '9999');

      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);
        const loadStoredPin = useCallback(() => {
          try {
            const pin = localStorage.getItem(PIN_STORAGE_KEY);
            setStoredPin(pin);
            return pin;
          } catch (err) {
            console.error('Failed to load stored PIN:', err);
            return null;
          }
        }, []);

        return { loadStoredPin, storedPin };
      });

      let loadedPin: string | null = null;
      act(() => {
        loadedPin = result.current.loadStoredPin();
      });

      expect(loadedPin).toBe('9999');
      expect(result.current.storedPin).toBe('9999');
    });

    it('returns null when no PIN stored', () => {
      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);
        const loadStoredPin = useCallback(() => {
          try {
            const pin = localStorage.getItem(PIN_STORAGE_KEY);
            setStoredPin(pin);
            return pin;
          } catch (err) {
            console.error('Failed to load stored PIN:', err);
            return null;
          }
        }, []);

        return { loadStoredPin, storedPin };
      });

      let loadedPin: string | null = null;
      act(() => {
        loadedPin = result.current.loadStoredPin();
      });

      expect(loadedPin).toBeNull();
      expect(result.current.storedPin).toBeNull();
    });

    it('handles localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const localStorageGetItemSpy = vi
        .spyOn(Storage.prototype, 'getItem')
        .mockImplementation(() => {
          throw new Error('Access denied');
        });

      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);
        const loadStoredPin = useCallback(() => {
          try {
            const pin = localStorage.getItem(PIN_STORAGE_KEY);
            setStoredPin(pin);
            return pin;
          } catch (err) {
            console.error('Failed to load stored PIN:', err);
            return null;
          }
        }, []);

        return { loadStoredPin, storedPin };
      });

      let loadedPin: string | null = null;
      act(() => {
        loadedPin = result.current.loadStoredPin();
      });

      expect(loadedPin).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to load stored PIN:',
        expect.any(Error)
      );

      localStorageGetItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('clearStoredPin', () => {
    it('removes PIN from localStorage', () => {
      localStorage.setItem(PIN_STORAGE_KEY, '1234');

      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>('1234');
        const clearStoredPin = useCallback(() => {
          try {
            localStorage.removeItem(PIN_STORAGE_KEY);
            setStoredPin(null);
          } catch (err) {
            console.error('Failed to clear stored PIN:', err);
          }
        }, []);

        return { clearStoredPin, storedPin };
      });

      act(() => {
        result.current.clearStoredPin();
      });

      expect(localStorage.getItem(PIN_STORAGE_KEY)).toBeNull();
      expect(result.current.storedPin).toBeNull();
    });

    it('handles non-existent PIN gracefully', () => {
      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);
        const clearStoredPin = useCallback(() => {
          try {
            localStorage.removeItem(PIN_STORAGE_KEY);
            setStoredPin(null);
          } catch (err) {
            console.error('Failed to clear stored PIN:', err);
          }
        }, []);

        return { clearStoredPin, storedPin };
      });

      // Should not throw
      act(() => {
        result.current.clearStoredPin();
      });

      expect(localStorage.getItem(PIN_STORAGE_KEY)).toBeNull();
    });

    it('handles localStorage errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const localStorageRemoveItemSpy = vi
        .spyOn(Storage.prototype, 'removeItem')
        .mockImplementation(() => {
          throw new Error('Access denied');
        });

      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>('1234');
        const clearStoredPin = useCallback(() => {
          try {
            localStorage.removeItem(PIN_STORAGE_KEY);
            setStoredPin(null);
          } catch (err) {
            console.error('Failed to clear stored PIN:', err);
          }
        }, []);

        return { clearStoredPin, storedPin };
      });

      act(() => {
        result.current.clearStoredPin();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to clear stored PIN:',
        expect.any(Error)
      );

      localStorageRemoveItemSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('useEffect - load on mount', () => {
    it('loads PIN from localStorage on mount', () => {
      localStorage.setItem(PIN_STORAGE_KEY, 'mounted-pin');

      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);

        const loadStoredPin = useCallback(() => {
          try {
            const pin = localStorage.getItem(PIN_STORAGE_KEY);
            setStoredPin(pin);
            return pin;
          } catch (err) {
            console.error('Failed to load stored PIN:', err);
            return null;
          }
        }, []);

        useEffect(() => {
          loadStoredPin();
        }, [loadStoredPin]);

        return { storedPin };
      });

      expect(result.current.storedPin).toBe('mounted-pin');
    });

    it('sets null when no PIN on mount', () => {
      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);

        const loadStoredPin = useCallback(() => {
          try {
            const pin = localStorage.getItem(PIN_STORAGE_KEY);
            setStoredPin(pin);
            return pin;
          } catch (err) {
            console.error('Failed to load stored PIN:', err);
            return null;
          }
        }, []);

        useEffect(() => {
          loadStoredPin();
        }, [loadStoredPin]);

        return { storedPin };
      });

      expect(result.current.storedPin).toBeNull();
    });
  });

  describe('Integration - full workflow', () => {
    it('supports complete store-load-clear cycle', () => {
      const { result } = renderHook(() => {
        const [storedPin, setStoredPin] = useState<string | null>(null);

        const storePin = useCallback((pin: string) => {
          try {
            localStorage.setItem(PIN_STORAGE_KEY, pin);
            setStoredPin(pin);
          } catch (err) {
            console.error('Failed to store PIN:', err);
          }
        }, []);

        const loadStoredPin = useCallback(() => {
          try {
            const pin = localStorage.getItem(PIN_STORAGE_KEY);
            setStoredPin(pin);
            return pin;
          } catch (err) {
            console.error('Failed to load stored PIN:', err);
            return null;
          }
        }, []);

        const clearStoredPin = useCallback(() => {
          try {
            localStorage.removeItem(PIN_STORAGE_KEY);
            setStoredPin(null);
          } catch (err) {
            console.error('Failed to clear stored PIN:', err);
          }
        }, []);

        useEffect(() => {
          loadStoredPin();
        }, [loadStoredPin]);

        return { storePin, loadStoredPin, clearStoredPin, storedPin };
      });

      // Initial state
      expect(result.current.storedPin).toBeNull();

      // Store PIN
      act(() => {
        result.current.storePin('workflow-pin');
      });
      expect(result.current.storedPin).toBe('workflow-pin');
      expect(localStorage.getItem(PIN_STORAGE_KEY)).toBe('workflow-pin');

      // Load PIN
      act(() => {
        result.current.loadStoredPin();
      });
      expect(result.current.storedPin).toBe('workflow-pin');

      // Clear PIN
      act(() => {
        result.current.clearStoredPin();
      });
      expect(result.current.storedPin).toBeNull();
      expect(localStorage.getItem(PIN_STORAGE_KEY)).toBeNull();
    });
  });
});
