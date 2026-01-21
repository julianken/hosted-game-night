/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as secureGeneration from '@/lib/session/secure-generation';

// Mock fetch globally
global.fetch = vi.fn();

/**
 * Hook that mimics the PIN persistence logic from PlayPage
 */
function usePinPersistence() {
  const [currentPin, setCurrentPin] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const pinGeneratedRef = useRef(false);

  // Load stored PIN on mount
  useEffect(() => {
    const stored = secureGeneration.getStoredPin();
    if (stored) {
      // Test hook - intentionally calling setState in effect
      // eslint-disable-next-line
      setCurrentPin(stored);
    }
  }, []);

  // Generate or retrieve PIN when modal opens
  useEffect(() => {
    if (showModal && !pinGeneratedRef.current) {
      let pin = currentPin;

      if (!pin) {
        pin = secureGeneration.getStoredPin();
      }

      if (!pin) {
        pin = secureGeneration.generateSecurePin();
        pinGeneratedRef.current = true;
      }

      // Test hook - intentionally calling setState in effect
      // eslint-disable-next-line
      setCurrentPin(pin);
      secureGeneration.storePin(pin);
    }
  }, [showModal, currentPin]);

  // Reset PIN generation flag when modal closes
  useEffect(() => {
    if (!showModal) {
      pinGeneratedRef.current = false;
    }
  }, [showModal]);

  const handleCreateSession = useCallback(async (pin: string) => {
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin, initialState: {} }),
    });

    if (!response.ok) {
      // Clear PIN on error
      secureGeneration.clearStoredPin();
      setCurrentPin(null);
      pinGeneratedRef.current = false;
      throw new Error('Failed to create session');
    }

    return await response.json();
  }, []);

  return {
    currentPin,
    showModal,
    setShowModal,
    handleCreateSession,
  };
}

describe('PIN Persistence Logic', () => {
  let mockFetch: typeof global.fetch;

  beforeEach(() => {
    mockFetch = global.fetch as typeof global.fetch;
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('PIN Auto-Generation', () => {
    it('should generate a PIN when modal opens and none exists', async () => {
      const generateSpy = vi.spyOn(secureGeneration, 'generateSecurePin');
      generateSpy.mockReturnValue('1234');
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(null);

      const { result } = renderHook(() => usePinPersistence());

      expect(result.current.currentPin).toBeNull();

      // Open modal
      act(() => {
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(generateSpy).toHaveBeenCalledOnce();
        expect(result.current.currentPin).toBe('1234');
      });
    });

    it('should use generated PIN for session creation', async () => {
      const generatedPin = '5678';
      vi.spyOn(secureGeneration, 'generateSecurePin').mockReturnValue(generatedPin);
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(null);

      vi.mocked(mockFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            session: { roomCode: 'ABC123' },
            sessionToken: 'test-token',
          },
        }),
      });

      const { result } = renderHook(() => usePinPersistence());

      // Open modal to generate PIN
      act(() => {
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(result.current.currentPin).toBe(generatedPin);
      });

      // Create session
      await act(async () => {
        await result.current.handleCreateSession(generatedPin);
      });

      // Verify fetch was called with generated PIN
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/sessions',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining(generatedPin),
        })
      );
    });
  });

  describe('PIN Storage', () => {
    it('should store PIN when modal opens', async () => {
      const generatedPin = '9999';
      vi.spyOn(secureGeneration, 'generateSecurePin').mockReturnValue(generatedPin);
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(null);
      const storeSpy = vi.spyOn(secureGeneration, 'storePin');

      const { result } = renderHook(() => usePinPersistence());

      act(() => {
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(storeSpy).toHaveBeenCalledWith(generatedPin);
      });
    });

    it('should load stored PIN on mount', () => {
      const storedPin = '4444';
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(storedPin);

      const { result } = renderHook(() => usePinPersistence());

      expect(result.current.currentPin).toBe(storedPin);
    });

    it('should use stored PIN if available instead of generating new one', async () => {
      const storedPin = '3333';
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(storedPin);
      const generateSpy = vi.spyOn(secureGeneration, 'generateSecurePin');

      const { result } = renderHook(() => usePinPersistence());

      // PIN should be loaded from storage on mount
      expect(result.current.currentPin).toBe(storedPin);

      // Open modal
      act(() => {
        result.current.setShowModal(true);
      });

      // Should NOT generate a new PIN
      await waitFor(() => {
        expect(generateSpy).not.toHaveBeenCalled();
        expect(result.current.currentPin).toBe(storedPin);
      });
    });
  });

  describe('PIN Persistence Across Refreshes', () => {
    it('should persist PIN in localStorage', async () => {
      const pin = '7777';
      vi.spyOn(secureGeneration, 'generateSecurePin').mockReturnValue(pin);
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(null);

      const { result } = renderHook(() => usePinPersistence());

      act(() => {
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(result.current.currentPin).toBe(pin);
      });

      // Verify PIN is in localStorage
      expect(localStorage.getItem('bingo_pin')).toBe(pin);
    });

    it('should maintain PIN after multiple modal open/close cycles', async () => {
      const pin = '2222';
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(null);
      vi.spyOn(secureGeneration, 'generateSecurePin').mockReturnValue(pin);

      const { result } = renderHook(() => usePinPersistence());

      // First open
      act(() => {
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(result.current.currentPin).toBe(pin);
      });

      // Close
      act(() => {
        result.current.setShowModal(false);
      });

      // Reopen
      act(() => {
        result.current.setShowModal(true);
      });

      // PIN should still be the same (not regenerated)
      expect(secureGeneration.generateSecurePin).toHaveBeenCalledOnce();
      expect(result.current.currentPin).toBe(pin);
    });
  });

  describe('PIN Clearing on Errors', () => {
    it('should clear PIN when session creation fails', async () => {
      const pin = '8888';
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(null);
      vi.spyOn(secureGeneration, 'generateSecurePin').mockReturnValue(pin);

      // Spy that calls through to the real implementation
      const clearSpy = vi.spyOn(secureGeneration, 'clearStoredPin');
      clearSpy.mockImplementation(() => {
        localStorage.removeItem('bingo_pin');
      });

      vi.mocked(mockFetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => usePinPersistence());

      act(() => {
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(result.current.currentPin).toBe(pin);
      });

      // Try to create session (fails)
      let error: Error | undefined;
      await act(async () => {
        try {
          await result.current.handleCreateSession(pin);
        } catch (e) {
          error = e as Error;
        }
      });

      // Verify error occurred
      expect(error).toBeDefined();

      // Verify clearStoredPin was called
      expect(clearSpy).toHaveBeenCalled();
    });

    it('should NOT clear PIN on successful session creation', async () => {
      const pin = '6666';
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(null);
      vi.spyOn(secureGeneration, 'generateSecurePin').mockReturnValue(pin);
      const clearSpy = vi.spyOn(secureGeneration, 'clearStoredPin');

      vi.mocked(mockFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            session: { roomCode: 'SUCCESS' },
            sessionToken: 'valid-token',
          },
        }),
      });

      const { result } = renderHook(() => usePinPersistence());

      act(() => {
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(result.current.currentPin).toBe(pin);
      });

      // Create session (succeeds)
      await act(async () => {
        await result.current.handleCreateSession(pin);
      });

      // PIN should NOT be cleared
      expect(clearSpy).not.toHaveBeenCalled();
      expect(result.current.currentPin).toBe(pin);
    });

    it('should allow retry with new PIN after clearing on error', async () => {
      const firstPin = '1111';
      const secondPin = '2222';
      const generateSpy = vi
        .spyOn(secureGeneration, 'generateSecurePin')
        .mockReturnValueOnce(firstPin)
        .mockReturnValueOnce(secondPin);

      vi.spyOn(secureGeneration, 'getStoredPin')
        .mockReturnValueOnce(null) // First mount
        .mockReturnValueOnce(null) // After clear
        .mockReturnValueOnce(null); // Second modal open

      // Spy that actually clears localStorage
      vi.spyOn(secureGeneration, 'clearStoredPin').mockImplementation(() => {
        localStorage.removeItem('bingo_pin');
      });

      // First attempt fails
      vi.mocked(mockFetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Error',
      });

      const { result } = renderHook(() => usePinPersistence());

      // First open
      act(() => {
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(result.current.currentPin).toBe(firstPin);
      });

      // Try to create (fails)
      await act(async () => {
        try {
          await result.current.handleCreateSession(firstPin);
        } catch {
          // Expected
        }
      });

      // Verify clearStoredPin was called after first failure
      expect(secureGeneration.clearStoredPin).toHaveBeenCalled();

      // Close modal
      act(() => {
        result.current.setShowModal(false);
      });

      // Second attempt
      vi.mocked(mockFetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            session: { roomCode: 'RETRY' },
            sessionToken: 'retry-token',
          },
        }),
      });

      // Reopen modal (should generate new PIN)
      act(() => {
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(result.current.currentPin).toBe(secondPin);
        expect(generateSpy).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle localStorage being unavailable', () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const pin = '1234';
      vi.spyOn(secureGeneration, 'generateSecurePin').mockReturnValue(pin);
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(null);

      // Should not crash
      expect(() => renderHook(() => usePinPersistence())).not.toThrow();

      localStorage.setItem = originalSetItem;
    });

    it('should handle concurrent modal opens gracefully', async () => {
      const pin = '3456';
      vi.spyOn(secureGeneration, 'generateSecurePin').mockReturnValue(pin);
      vi.spyOn(secureGeneration, 'getStoredPin').mockReturnValue(null);

      const { result } = renderHook(() => usePinPersistence());

      // Rapid modal opens
      act(() => {
        result.current.setShowModal(true);
        result.current.setShowModal(true);
        result.current.setShowModal(true);
      });

      await waitFor(() => {
        expect(result.current.currentPin).toBe(pin);
      });

      // Should only generate PIN once
      expect(secureGeneration.generateSecurePin).toHaveBeenCalledOnce();
    });
  });
});
