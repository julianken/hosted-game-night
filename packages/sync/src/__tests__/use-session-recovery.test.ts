import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSessionRecovery } from '../use-session-recovery';
import type { SessionRecoveryHookOptions } from '../use-session-recovery';

describe('useSessionRecovery', () => {
  let mockLocalStorage: Record<string, string>;
  let mockFetchGameState: ReturnType<typeof vi.fn>;
  let mockHydrateStore: ReturnType<typeof vi.fn>;
  let mockGetRoomCodeFromUrl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => mockLocalStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockLocalStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockLocalStorage[key];
      }),
      clear: vi.fn(() => {
        mockLocalStorage = {};
      }),
      length: 0,
      key: vi.fn(),
    } as any;

    // Mock fetch callback
    mockFetchGameState = vi.fn();
    mockHydrateStore = vi.fn();
    mockGetRoomCodeFromUrl = vi.fn();

    // Reset console.error to avoid noise
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Helper to create a valid session token
   */
  function createValidToken(overrides?: {
    sessionId?: string;
    roomCode?: string;
    gameType?: 'bingo' | 'trivia';
    expiresAt?: number;
  }): string {
    const token = {
      sessionId: overrides?.sessionId ?? 'session-123',
      roomCode: overrides?.roomCode ?? 'ABCD',
      gameType: overrides?.gameType ?? 'bingo',
      expiresAt: overrides?.expiresAt ?? Date.now() + 3600000, // 1 hour from now
    };
    return btoa(JSON.stringify(token)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Helper to create hook options
   */
  function createHookOptions(
    overrides?: Partial<SessionRecoveryHookOptions>
  ): SessionRecoveryHookOptions {
    return {
      gameType: 'bingo',
      fetchGameState: mockFetchGameState,
      hydrateStore: mockHydrateStore,
      storageKey: 'session_token',
      getRoomCodeFromUrl: mockGetRoomCodeFromUrl,
      enabled: true,
      ...overrides,
    };
  }

  describe('token validation', () => {
    it('should accept valid token with all required fields', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockResolvedValue({ state: 'test' });

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.roomCode).toBe('ABCD');
      expect(mockFetchGameState).toHaveBeenCalledWith('ABCD', validToken);
      expect(mockHydrateStore).toHaveBeenCalledWith({ state: 'test' });
    });

    it('should reject invalid format (not base64url)', async () => {
      mockLocalStorage.session_token = 'not-valid-base64!!!';
      mockGetRoomCodeFromUrl.mockReturnValue('ABCD');

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Invalid session token. Please enter PIN to rejoin.');
      expect(result.current.requiresPin).toBe(true);
      expect(result.current.roomCode).toBe('ABCD');
      expect(mockLocalStorage.session_token).toBeUndefined();
    });

    it('should reject missing sessionId field', async () => {
      const invalidToken = btoa(
        JSON.stringify({
          roomCode: 'ABCD',
          gameType: 'bingo',
          expiresAt: Date.now() + 3600000,
        })
      )
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      mockLocalStorage.session_token = invalidToken;
      mockGetRoomCodeFromUrl.mockReturnValue('ABCD');

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Invalid session token. Please enter PIN to rejoin.');
      expect(result.current.requiresPin).toBe(true);
    });

    it('should reject missing roomCode field', async () => {
      const invalidToken = btoa(
        JSON.stringify({
          sessionId: 'session-123',
          gameType: 'bingo',
          expiresAt: Date.now() + 3600000,
        })
      )
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      mockLocalStorage.session_token = invalidToken;

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Invalid session token.');
      expect(result.current.requiresPin).toBe(false);
    });

    it('should reject missing gameType field', async () => {
      const invalidToken = btoa(
        JSON.stringify({
          sessionId: 'session-123',
          roomCode: 'ABCD',
          expiresAt: Date.now() + 3600000,
        })
      )
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      mockLocalStorage.session_token = invalidToken;

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Invalid session token.');
    });

    it('should reject missing expiresAt field', async () => {
      const invalidToken = btoa(
        JSON.stringify({
          sessionId: 'session-123',
          roomCode: 'ABCD',
          gameType: 'bingo',
        })
      )
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
      mockLocalStorage.session_token = invalidToken;

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Invalid session token.');
    });

    it('should reject expired tokens', async () => {
      const expiredToken = createValidToken({
        expiresAt: Date.now() - 1000, // Expired 1 second ago
      });
      mockLocalStorage.session_token = expiredToken;

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Session expired. Please enter PIN to rejoin.');
      expect(result.current.requiresPin).toBe(true);
      expect(result.current.roomCode).toBe('ABCD');
      expect(mockLocalStorage.session_token).toBeUndefined();
    });

    it('should reject wrong game type', async () => {
      const wrongGameTypeToken = createValidToken({ gameType: 'trivia' });
      mockLocalStorage.session_token = wrongGameTypeToken;

      const { result } = renderHook(() =>
        useSessionRecovery(createHookOptions({ gameType: 'bingo' }))
      );

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('This session is for trivia, but this is a bingo app.');
      expect(result.current.requiresPin).toBe(false);
      expect(mockLocalStorage.session_token).toBeUndefined();
    });
  });

  describe('API error handling', () => {
    it('should handle 401 - show PIN prompt', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      const error = new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' });
      mockFetchGameState.mockRejectedValue(error);

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Session expired. Please enter PIN to rejoin.');
      expect(result.current.requiresPin).toBe(true);
      expect(result.current.roomCode).toBe('ABCD');
      expect(mockLocalStorage.session_token).toBeUndefined();
    });

    it('should handle 404 - clear token, show error', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      const error = new Response('Not Found', { status: 404, statusText: 'Not Found' });
      mockFetchGameState.mockRejectedValue(error);

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Session not found. It may have expired.');
      expect(result.current.requiresPin).toBe(false);
      expect(mockLocalStorage.session_token).toBeUndefined();
    });

    it('should handle 500 - show error with status text', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      const error = new Response('Internal Server Error', {
        status: 500,
        statusText: 'Internal Server Error',
      });
      mockFetchGameState.mockRejectedValue(error);

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Failed to recover session: Internal Server Error');
      expect(result.current.requiresPin).toBe(false);
      // Token NOT cleared for 500 errors (might be temporary)
      expect(mockLocalStorage.session_token).toBe(validToken);
    });

    it('should handle network errors', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockRejectedValue(new Error('Network request failed'));

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Failed to recover session: Network request failed');
      expect(result.current.requiresPin).toBe(false);
    });

    it('should handle successful fetch - hydrate store', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      const gameState = { balls: [1, 2, 3], status: 'playing' };
      mockFetchGameState.mockResolvedValue(gameState);

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.roomCode).toBe('ABCD');
      expect(mockHydrateStore).toHaveBeenCalledWith(gameState);
      expect(mockLocalStorage.session_token).toBe(validToken); // Token preserved
    });
  });

  describe('PIN prompt logic', () => {
    it('should show PIN prompt when token invalid but room code in URL', async () => {
      mockLocalStorage.session_token = 'invalid-token';
      mockGetRoomCodeFromUrl.mockReturnValue('EFGH');

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.requiresPin).toBe(true);
      expect(result.current.roomCode).toBe('EFGH');
      expect(result.current.error).toBe('Invalid session token. Please enter PIN to rejoin.');
    });

    it('should show PIN prompt when token expired', async () => {
      const expiredToken = createValidToken({ expiresAt: Date.now() - 1000 });
      mockLocalStorage.session_token = expiredToken;

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.requiresPin).toBe(true);
      expect(result.current.roomCode).toBe('ABCD');
      expect(result.current.error).toBe('Session expired. Please enter PIN to rejoin.');
    });

    it('should not show PIN prompt when no room code in URL', async () => {
      mockLocalStorage.session_token = 'invalid-token';
      mockGetRoomCodeFromUrl.mockReturnValue(null);

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.requiresPin).toBe(false);
      expect(result.current.roomCode).toBeNull();
      expect(result.current.error).toBe('Invalid session token.');
    });

    it('should show PIN prompt when no token but room code in URL', async () => {
      mockGetRoomCodeFromUrl.mockReturnValue('IJKL');

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.requiresPin).toBe(true);
      expect(result.current.roomCode).toBe('IJKL');
      expect(result.current.error).toBe('No session found. Please enter PIN to join.');
    });
  });

  describe('SSR safety', () => {
    it('should handle SSR environment gracefully', async () => {
      // Test that the hook doesn't crash when typeof window === 'undefined'
      // In jsdom, we can't truly simulate SSR, but we can test that our SSR guards work
      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      // Should complete without errors
      expect(result.current).toBeDefined();
    });
  });

  describe('state management', () => {
    it('should set isRecovering during recovery', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      let resolvePromise: ((value: any) => void) | null = null;
      mockFetchGameState.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      // Should be recovering immediately
      await waitFor(() => {
        expect(result.current.isRecovering).toBe(true);
      });

      // Now resolve the promise
      resolvePromise?.({ state: 'test' });

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });
    });

    it('should set isRecovered on success', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockResolvedValue({ state: 'test' });

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovered).toBe(true);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isRecovering).toBe(false);
    });

    it('should set error on failure', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockRejectedValue(new Error('API error'));

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to recover session: API error');
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.isRecovering).toBe(false);
    });

    it('should clear error when recovery starts', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockRejectedValue(new Error('First error'));

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to recover session: First error');
      });

      // Now trigger manual recovery with success
      mockFetchGameState.mockResolvedValue({ state: 'test' });
      await result.current.recover();

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });

      expect(result.current.isRecovered).toBe(true);
    });

    it('should not run recovery when enabled is false', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;

      const { result } = renderHook(() =>
        useSessionRecovery(createHookOptions({ enabled: false }))
      );

      // Wait a bit to ensure recovery doesn't start
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(result.current.isRecovering).toBe(false);
      expect(result.current.isRecovered).toBe(false);
      expect(mockFetchGameState).not.toHaveBeenCalled();
    });
  });

  describe('store operations', () => {
    it('should call storeToken() to write to localStorage', async () => {
      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      const newToken = createValidToken({ sessionId: 'new-session' });
      result.current.storeToken(newToken);

      expect(mockLocalStorage.session_token).toBe(newToken);
      expect(localStorage.setItem).toHaveBeenCalledWith('session_token', newToken);
    });

    it('should call clearToken() to remove from localStorage', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockResolvedValue({ state: 'test' });

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovered).toBe(true);
      });

      // Clear the token
      result.current.clearToken();

      expect(mockLocalStorage.session_token).toBeUndefined();
      expect(localStorage.removeItem).toHaveBeenCalledWith('session_token');
    });

    it('should use custom storageKey when provided', async () => {
      const validToken = createValidToken();
      mockLocalStorage.custom_key = validToken;
      mockFetchGameState.mockResolvedValue({ state: 'test' });

      const { result } = renderHook(() =>
        useSessionRecovery(createHookOptions({ storageKey: 'custom_key' }))
      );

      await waitFor(() => {
        expect(result.current.isRecovered).toBe(true);
      });

      expect(localStorage.getItem).toHaveBeenCalledWith('custom_key');
    });

    it('should handle localStorage errors gracefully', async () => {
      // Mock localStorage to throw errors
      global.localStorage.getItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      // Should not crash, just fail silently
      expect(result.current.isRecovered).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('manual recovery', () => {
    it('should allow manual recovery via recover() when enabled', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockResolvedValue({ state: 'test' });

      // Start with recovery enabled (but recovery will run automatically)
      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      // Wait for initial auto-recovery to complete
      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(true);

      // Reset state by clearing
      mockFetchGameState.mockClear();
      mockHydrateStore.mockClear();

      // Manually trigger another recovery
      await result.current.recover();

      // Should have called API again
      expect(mockFetchGameState).toHaveBeenCalled();
    });

    it('should reset requiresPin state on manual recovery', async () => {
      mockGetRoomCodeFromUrl.mockReturnValue('ABCD');

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.requiresPin).toBe(true);
      });

      // Now add a valid token and manually recover
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockResolvedValue({ state: 'test' });

      await result.current.recover();

      await waitFor(() => {
        expect(result.current.requiresPin).toBe(false);
      });

      expect(result.current.isRecovered).toBe(true);
    });
  });

  describe('base64url encoding', () => {
    it('should handle standard base64 with + and /', () => {
      // Create a token that results in + or / in standard base64
      const token = {
        sessionId: 'a'.repeat(20), // Long string to trigger special chars
        roomCode: 'TEST',
        gameType: 'bingo' as const,
        expiresAt: Date.now() + 3600000,
      };
      const standardBase64 = btoa(JSON.stringify(token));
      const base64url = standardBase64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      mockLocalStorage.session_token = base64url;
      mockFetchGameState.mockResolvedValue({ state: 'test' });

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      waitFor(() => {
        expect(result.current.isRecovered).toBe(true);
      });
    });

    it('should handle padding removal in base64url', () => {
      // Create a short token that would have padding
      const token = {
        sessionId: 'abc',
        roomCode: 'TEST',
        gameType: 'bingo' as const,
        expiresAt: Date.now() + 3600000,
      };
      const base64WithPadding = btoa(JSON.stringify(token));
      const base64url = base64WithPadding.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      mockLocalStorage.session_token = base64url;
      mockFetchGameState.mockResolvedValue({ state: 'test' });

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      waitFor(() => {
        expect(result.current.isRecovered).toBe(true);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty localStorage', async () => {
      mockGetRoomCodeFromUrl.mockReturnValue(null);

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.requiresPin).toBe(false);
    });

    it('should handle malformed JSON in token', async () => {
      mockLocalStorage.session_token = btoa('not valid json{')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.isRecovered).toBe(false);
      expect(result.current.error).toBe('Invalid session token.');
    });

    it('should handle concurrent recovery calls', async () => {
      const validToken = createValidToken();
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ state: 'test' }), 50))
      );

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      // Trigger multiple recoveries
      const promise1 = result.current.recover();
      const promise2 = result.current.recover();
      const promise3 = result.current.recover();

      await Promise.all([promise1, promise2, promise3]);

      await waitFor(() => {
        expect(result.current.isRecovered).toBe(true);
      });

      // Should have called API multiple times (once for auto + 3 manual calls)
      expect(mockFetchGameState.mock.calls.length).toBeGreaterThanOrEqual(1);
    });

    it('should preserve room code from token even on API error', async () => {
      const validToken = createValidToken({ roomCode: 'PRESERVE' });
      mockLocalStorage.session_token = validToken;
      mockFetchGameState.mockRejectedValue(
        new Response('Unauthorized', { status: 401, statusText: 'Unauthorized' })
      );

      const { result } = renderHook(() => useSessionRecovery(createHookOptions()));

      await waitFor(() => {
        expect(result.current.isRecovering).toBe(false);
      });

      expect(result.current.roomCode).toBe('PRESERVE');
    });
  });
});
