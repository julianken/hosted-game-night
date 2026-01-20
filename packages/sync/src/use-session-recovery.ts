'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Session token structure (decoded from base64url)
 */
export interface SessionToken {
  sessionId: string;
  roomCode: string;
  gameType: 'bingo' | 'trivia';
  expiresAt: number; // Unix timestamp
}

/**
 * Configuration options for useSessionRecovery hook
 */
export interface SessionRecoveryHookOptions {
  /** Game type for this app */
  gameType: 'bingo' | 'trivia';

  /** Function to fetch game state from API given roomCode and token */
  fetchGameState: (roomCode: string, token: string) => Promise<unknown>;

  /** Function to hydrate the game store with restored state */
  hydrateStore: (state: unknown) => void;

  /** LocalStorage key for storing token (default: 'session_token') */
  storageKey?: string;

  /** Function to get room code from URL (optional) */
  getRoomCodeFromUrl?: () => string | null;

  /** Enable/disable recovery (default: true) */
  enabled?: boolean;
}

/**
 * Return value from useSessionRecovery hook
 */
export interface SessionRecoveryState {
  /** Whether recovery is in progress */
  isRecovering: boolean;

  /** Whether recovery completed successfully */
  isRecovered: boolean;

  /** Error message if recovery failed */
  error: string | null;

  /** Recovered room code (if any) */
  roomCode: string | null;

  /** Whether PIN prompt is needed */
  requiresPin: boolean;

  /** Manually trigger recovery */
  recover: () => Promise<void>;

  /** Clear stored token */
  clearToken: () => void;

  /** Store new token */
  storeToken: (token: string) => void;
}

/**
 * Decode and validate session token
 */
function decodeSessionToken(token: string): SessionToken | null {
  try {
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(decoded) as SessionToken;

    // Validate required fields
    if (!parsed.sessionId || !parsed.roomCode || !parsed.gameType || !parsed.expiresAt) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired
 */
function isTokenExpired(token: SessionToken): boolean {
  return Date.now() > token.expiresAt;
}

/**
 * Hook for session restoration on page load
 *
 * Implements session recovery from the persistent sessions feature:
 * - Checks localStorage for session token on mount
 * - Validates token (format, expiry, game type)
 * - Fetches game state from API if token valid
 * - Calls store's hydrate method to restore state
 * - Handles token expiry gracefully
 * - Prompts for PIN if token invalid but room code in URL
 * - Provides loading, error, and PIN prompt states
 *
 * @example
 * ```tsx
 * function GameApp() {
 *   const { isRecovering, isRecovered, error, roomCode, requiresPin } =
 *     useSessionRecovery({
 *       gameType: 'bingo',
 *       fetchGameState: async (roomCode, token) => {
 *         const res = await fetch(`/api/sessions/${roomCode}`, {
 *           headers: { 'Authorization': `Bearer ${token}` }
 *         });
 *         return (await res.json()).gameState;
 *       },
 *       hydrateStore: (state) => useBingoStore.getState()._hydrate(state),
 *       getRoomCodeFromUrl: () => new URLSearchParams(window.location.search).get('room'),
 *     });
 *
 *   if (isRecovering) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   if (requiresPin) return <PinPrompt roomCode={roomCode!} />;
 *
 *   return <GameUI />;
 * }
 * ```
 */
export function useSessionRecovery(
  options: SessionRecoveryHookOptions
): SessionRecoveryState {
  const {
    gameType,
    fetchGameState,
    hydrateStore,
    storageKey = 'session_token',
    getRoomCodeFromUrl,
    enabled = true,
  } = options;

  const [isRecovering, setIsRecovering] = useState(false);
  const [isRecovered, setIsRecovered] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [requiresPin, setRequiresPin] = useState(false);

  /**
   * Store token in localStorage
   */
  const storeToken = useCallback(
    (token: string) => {
      if (typeof window === 'undefined') return;

      try {
        localStorage.setItem(storageKey, token);
      } catch (err) {
        console.error('Failed to store session token:', err);
      }
    },
    [storageKey]
  );

  /**
   * Clear token from localStorage
   */
  const clearToken = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      console.error('Failed to clear session token:', err);
    }
  }, [storageKey]);

  /**
   * Get token from localStorage
   */
  const getStoredToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;

    try {
      return localStorage.getItem(storageKey);
    } catch (err) {
      console.error('Failed to read session token:', err);
      return null;
    }
  }, [storageKey]);

  /**
   * Perform session recovery
   */
  const recover = useCallback(async () => {
    if (!enabled) return;

    setIsRecovering(true);
    setError(null);
    setRequiresPin(false);

    try {
      // Get stored token
      const storedToken = getStoredToken();

      if (!storedToken) {
        // No token stored - check if room code in URL
        const urlRoomCode = getRoomCodeFromUrl?.();
        if (urlRoomCode) {
          setRoomCode(urlRoomCode);
          setRequiresPin(true);
          setError('No session found. Please enter PIN to join.');
        }
        setIsRecovering(false);
        return;
      }

      // Decode token
      const decodedToken = decodeSessionToken(storedToken);

      if (!decodedToken) {
        // Invalid token format - clear it
        clearToken();
        const urlRoomCode = getRoomCodeFromUrl?.();
        if (urlRoomCode) {
          setRoomCode(urlRoomCode);
          setRequiresPin(true);
          setError('Invalid session token. Please enter PIN to rejoin.');
        } else {
          setError('Invalid session token.');
        }
        setIsRecovering(false);
        return;
      }

      // Check if expired
      if (isTokenExpired(decodedToken)) {
        clearToken();
        setRoomCode(decodedToken.roomCode);
        setRequiresPin(true);
        setError('Session expired. Please enter PIN to rejoin.');
        setIsRecovering(false);
        return;
      }

      // Check if game type matches
      if (decodedToken.gameType !== gameType) {
        clearToken();
        setError(`This session is for ${decodedToken.gameType}, but this is a ${gameType} app.`);
        setIsRecovering(false);
        return;
      }

      // Fetch game state from API
      try {
        const gameState = await fetchGameState(decodedToken.roomCode, storedToken);

        // Hydrate store
        hydrateStore(gameState);

        // Success!
        setRoomCode(decodedToken.roomCode);
        setIsRecovered(true);
        setIsRecovering(false);
      } catch (err) {
        // API error - check status
        if (err instanceof Response) {
          if (err.status === 401) {
            // Unauthorized - token invalid
            clearToken();
            setRoomCode(decodedToken.roomCode);
            setRequiresPin(true);
            setError('Session expired. Please enter PIN to rejoin.');
          } else if (err.status === 404) {
            // Session not found
            clearToken();
            setError('Session not found. It may have expired.');
          } else {
            setError(`Failed to recover session: ${err.statusText}`);
          }
        } else {
          setError(`Failed to recover session: ${err instanceof Error ? err.message : String(err)}`);
        }
        setIsRecovering(false);
      }
    } catch (err) {
      setError(`Recovery error: ${err instanceof Error ? err.message : String(err)}`);
      setIsRecovering(false);
    }
  }, [
    enabled,
    gameType,
    fetchGameState,
    hydrateStore,
    getStoredToken,
    getRoomCodeFromUrl,
    clearToken,
  ]);

  /**
   * Auto-recover on mount
   */
  useEffect(() => {
    if (enabled) {
      void recover();
    }
  }, [enabled]); // Only run on mount (recover is stable)

  return {
    isRecovering,
    isRecovered,
    error,
    roomCode,
    requiresPin,
    recover,
    clearToken,
    storeToken,
  };
}
