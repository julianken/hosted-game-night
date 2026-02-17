'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SessionId, RoomCode } from '@joolie-boolie/types/branded';
import { makeSessionId, makeRoomCode } from '@joolie-boolie/types/branded';
import { useSessionRecovery } from './use-session-recovery';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Session mode for the presenter.
 * - setup: no session yet (initial state or after reset)
 * - online: active Supabase-backed room session
 * - offline: local-only session (no network required)
 * - joined: joined an existing room via PIN verification
 */
export type PresenterSessionMode = 'setup' | 'online' | 'offline' | 'joined';

/**
 * Options for createRoom action.
 */
export interface CreateRoomOptions {
  /** The PIN to protect the room */
  pin: string;
  /** Serialized initial game state to send to the API */
  initialState: unknown;
}

/**
 * Configuration for the usePresenterSession hook.
 * App-specific behavior is injected via these options.
 */
export interface UsePresenterSessionOptions {
  /**
   * Game type string used for session recovery validation.
   * Must match the gameType set when the session token was created.
   */
  gameType: 'bingo' | 'trivia';

  /**
   * localStorage key prefix for PIN and offline session storage.
   * Keeps bingo and trivia storage keys isolated.
   * Example: 'bingo' produces keys 'bingo_pin', 'bingo_offline_session_id'
   */
  storagePrefix: string;

  /**
   * localStorage key prefix for offline session state entries.
   * Example: 'bingo_offline_session' produces keys like 'bingo_offline_session_ABC123'
   */
  offlineSessionStoragePrefix: string;

  /**
   * Function to fetch game state from the API during session recovery.
   */
  fetchGameState: (roomCode: string, token: string) => Promise<unknown>;

  /**
   * Function to hydrate the game store from recovered state.
   * Called after a successful session recovery.
   */
  hydrateStore: (state: unknown) => void;

  /**
   * Function to serialize current game state for sending to the API.
   * Used when creating a new room (POST /api/sessions).
   */
  serializeState: () => unknown;

  /**
   * Whether to automatically create an offline session when no session exists
   * after both online and offline recovery attempts complete.
   * Bingo enables this to avoid showing the setup modal by default.
   * Trivia disables this to show the modal and prompt for room setup.
   * Default: false
   */
  autoCreateOffline?: boolean;

  /**
   * Callback invoked when auto-create offline fires.
   * Allows the app to set any initial game state before the offline session is created.
   */
  onAutoCreateOffline?: (newSessionId: string) => void;
}

/**
 * Return value from usePresenterSession.
 */
export interface UsePresenterSessionReturn {
  /** Current session mode */
  mode: PresenterSessionMode;

  /** Active room code (online/joined mode) or null */
  roomCode: RoomCode | null;

  /** Active offline session ID (offline mode) or null */
  offlineSessionId: SessionId | null;

  /**
   * The effective session ID for BroadcastChannel sync.
   * Resolves to roomCode (online), offlineSessionId (offline), or '' (setup).
   */
  sessionId: SessionId;

  /** Current PIN for the session, or null */
  pin: string | null;

  /** Whether a session creation/join operation is in progress */
  isLoading: boolean;

  /** Error message from the last operation, or null */
  error: string | null;

  /** Whether session recovery is in progress */
  isRecovering: boolean;

  /** Whether session recovery completed successfully */
  isRecovered: boolean;

  /**
   * Whether the room setup modal should be shown.
   * True when:
   * - showCreateModal state is true (explicit request), or
   * - No session after both recovery attempts + user hasn't dismissed + autoCreateOffline is false
   */
  shouldShowModal: boolean;

  /** Create a new online room with a PIN */
  createRoom: (options: CreateRoomOptions) => Promise<void>;

  /** Join an existing room by room code and PIN */
  joinRoom: (roomCode: RoomCode | string, pin: string) => Promise<void>;

  /** Switch to offline mode with a new local session */
  playOffline: () => void;

  /**
   * Reset session state and optionally show the room setup modal.
   * Call this when starting a new game from scratch.
   */
  resetSession: (options?: { showModal?: boolean }) => void;

  /** Open the room setup modal */
  openModal: () => void;

  /** Close the room setup modal */
  closeModal: () => void;

  /** Store a session token (used after createRoom/joinRoom) */
  storeToken: (token: string) => void;

  /** Clear the stored session token */
  clearToken: () => void;

  /** Manually trigger session recovery */
  recover: () => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Regex for validating 6-character offline session IDs (uppercase, no 0/O/1/I) */
const OFFLINE_SESSION_ID_REGEX = /^[A-Z0-9]{6}$/;

/** Character set for offline session IDs (excludes ambiguous chars: 0, O, 1, I) */
const SESSION_ID_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Generate a cryptographically secure 4-digit PIN (1000-9999).
 */
export function generateSecurePin(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return (1000 + (values[0] % 9000)).toString();
}

/**
 * Generate a cryptographically secure 6-character session ID.
 * Uses the unambiguous character set (no 0, O, 1, I).
 */
export function generateShortSessionId(): string {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += SESSION_ID_CHARS[values[i] % SESSION_ID_CHARS.length];
  }
  return id;
}

/**
 * Safe localStorage get.
 */
function lsGet(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safe localStorage set.
 */
function lsSet(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, value);
  } catch { /* ignore */ }
}

/**
 * Safe localStorage remove.
 */
function lsRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Shared presenter session management hook.
 *
 * Encapsulates all session lifecycle logic that is common across bingo and trivia:
 * - Offline session ID initialization and persistence
 * - PIN generation and storage
 * - Session recovery from localStorage token
 * - Offline session recovery from localStorage state
 * - Room creation, joining, and offline play
 * - Auto-create offline session (configurable)
 * - Modal visibility management
 *
 * App-specific behavior (serialization, store hydration, storage key prefixes,
 * auto-create behavior) is injected via the options parameter.
 *
 * @example
 * ```tsx
 * const session = usePresenterSession({
 *   gameType: 'bingo',
 *   storagePrefix: 'bingo',
 *   offlineSessionStoragePrefix: 'bingo_offline_session',
 *   fetchGameState: async (roomCode, token) => { ... },
 *   hydrateStore: (state) => useGameStore.setState(state),
 *   serializeState: () => serializeBingoState(useGameStore.getState()),
 *   autoCreateOffline: true,
 *   onAutoCreateOffline: (id) => { ... },
 * });
 *
 * // Use session.sessionId for BroadcastChannel sync
 * useSync({ role: 'presenter', sessionId: session.sessionId });
 * ```
 */
export function usePresenterSession(
  options: UsePresenterSessionOptions
): UsePresenterSessionReturn {
  const {
    gameType,
    storagePrefix,
    offlineSessionStoragePrefix,
    fetchGameState,
    hydrateStore,
    serializeState,
    autoCreateOffline = false,
    onAutoCreateOffline,
  } = options;

  // Derive localStorage keys from the prefix
  const pinStorageKey = `${storagePrefix}_pin`;
  const offlineSessionIdStorageKey = `${storagePrefix}_offline_session_id`;

  // ---------------------------------------------------------------------------
  // Core session state
  // ---------------------------------------------------------------------------

  const [roomCode, setRoomCode] = useState<RoomCode | null>(null);
  const [sessionToken, setSessionTokenState] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [offlineSessionId, setOfflineSessionId] = useState<SessionId | null>(null);
  const [pin, setPin] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Modal and UI state
  // ---------------------------------------------------------------------------

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userDismissedModal, setUserDismissedModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dismissedRecoveryError, setDismissedRecoveryError] = useState(false);

  // ---------------------------------------------------------------------------
  // Recovery tracking state
  // ---------------------------------------------------------------------------

  const [recoveryAttempted, setRecoveryAttempted] = useState(false);
  const [offlineRecoveryAttempted, setOfflineRecoveryAttempted] = useState(false);

  // Bingo-style ref tracking to handle fast/batched recovery completion
  const recoveryInitialized = useRef(false);
  const pinGeneratedRef = useRef(false);

  // Auto-create guard: ensures auto-create fires at most once
  const autoCreateExecuted = useRef(false);

  // ---------------------------------------------------------------------------
  // Derived values
  // ---------------------------------------------------------------------------

  // The effective session ID is either the room code (online) or the offline
  // session ID. Both are strings at runtime; we cast to SessionId because this
  // field represents a generic "current session identifier" for sync purposes.
  const sessionId: SessionId = (roomCode || offlineSessionId || makeSessionId('')) as SessionId;

  // Derive mode from state
  const mode: PresenterSessionMode = (() => {
    if (roomCode && !isOfflineMode) return 'online';
    if (isOfflineMode) return 'offline';
    return 'setup';
  })();

  // ---------------------------------------------------------------------------
  // Session recovery hook
  // ---------------------------------------------------------------------------

  const {
    isRecovering,
    isRecovered,
    error: recoveryError,
    roomCode: recoveredRoomCode,
    recover,
    clearToken,
    storeToken,
  } = useSessionRecovery({
    gameType,
    fetchGameState,
    hydrateStore,
    enabled: !isOfflineMode,
  });

  // ---------------------------------------------------------------------------
  // Effects: initialization
  // ---------------------------------------------------------------------------

  // Initialize offline session ID from localStorage on mount
  useEffect(() => {
    try {
      const storedId = lsGet(offlineSessionIdStorageKey);
      if (storedId) {
        setOfflineSessionId(makeSessionId(storedId));
      } else {
        const newId = generateShortSessionId();
        lsSet(offlineSessionIdStorageKey, newId);
        setOfflineSessionId(makeSessionId(newId));
      }
    } catch {
      setOfflineSessionId(makeSessionId(generateShortSessionId()));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load stored PIN on mount
  useEffect(() => {
    const stored = lsGet(pinStorageKey);
    if (stored) {
      setPin(stored);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Effects: online recovery tracking
  // ---------------------------------------------------------------------------

  // Track when recovery starts (bingo-style ref approach for reliable batching)
  useEffect(() => {
    if (isRecovering) {
      recoveryInitialized.current = true;
    }
  }, [isRecovering]);

  // Track when recovery completes
  useEffect(() => {
    if (recoveryInitialized.current && !isRecovering) {
      setRecoveryAttempted(true);
    }
  }, [isRecovering]);

  // Fallback: mark recovery attempted if it completed so fast we never saw isRecovering=true
  useEffect(() => {
    if (!isOfflineMode && !recoveryInitialized.current && !isRecovering) {
      const timer = setTimeout(() => {
        if (!recoveryInitialized.current) {
          recoveryInitialized.current = true;
          setRecoveryAttempted(true);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOfflineMode, isRecovering]);

  // Sync recovered room code to local state
  useEffect(() => {
    if (isRecovered && recoveredRoomCode) {
      setRoomCode(makeRoomCode(recoveredRoomCode));
    }
  }, [isRecovered, recoveredRoomCode]);

  // ---------------------------------------------------------------------------
  // Effects: offline session recovery
  // ---------------------------------------------------------------------------

  useEffect(() => {
    const recoverOfflineSession = () => {
      try {
        const storedId = lsGet(offlineSessionIdStorageKey);
        if (storedId && OFFLINE_SESSION_ID_REGEX.test(storedId)) {
          const sessionKey = `${offlineSessionStoragePrefix}_${storedId}`;
          const stored = lsGet(sessionKey);
          if (stored) {
            try {
              const data = JSON.parse(stored) as {
                isOffline?: boolean;
                sessionId?: string;
                gameState?: unknown;
              };
              if (data.isOffline && data.sessionId === storedId) {
                setOfflineSessionId(makeSessionId(storedId));
                setIsOfflineMode(true);
                if (data.gameState) {
                  hydrateStore(data.gameState);
                }
                setOfflineRecoveryAttempted(true);
                return;
              }
            } catch (parseError) {
              console.error('Failed to parse offline session:', parseError);
            }
          }
        }
      } catch (err) {
        console.error('Failed to recover offline session:', err);
      }
      setOfflineRecoveryAttempted(true);
    };

    recoverOfflineSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Effects: auto-create offline session
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (
      autoCreateOffline &&
      recoveryAttempted &&
      offlineRecoveryAttempted &&
      !roomCode &&
      !isOfflineMode &&
      !showCreateModal &&
      !userDismissedModal &&
      !autoCreateExecuted.current
    ) {
      autoCreateExecuted.current = true;

      const newSessionIdStr = generateShortSessionId();
      lsSet(offlineSessionIdStorageKey, newSessionIdStr);
      setOfflineSessionId(makeSessionId(newSessionIdStr));
      setIsOfflineMode(true);

      // Invoke app-specific initialization callback (e.g., set default pattern)
      onAutoCreateOffline?.(newSessionIdStr);

      // Write initial offline session to localStorage
      try {
        const sessionKey = `${offlineSessionStoragePrefix}_${newSessionIdStr}`;
        const now = new Date().toISOString();
        const sessionData = {
          sessionId: newSessionIdStr,
          isOffline: true,
          gameState: serializeState(),
          createdAt: now,
          lastUpdated: now,
        };
        lsSet(sessionKey, JSON.stringify(sessionData));
      } catch (err) {
        console.error('Failed to create auto offline session:', err);
      }
    }
  }, [
    autoCreateOffline,
    recoveryAttempted,
    offlineRecoveryAttempted,
    roomCode,
    isOfflineMode,
    showCreateModal,
    userDismissedModal,
    onAutoCreateOffline,
    serializeState,
    offlineSessionIdStorageKey,
    offlineSessionStoragePrefix,
  ]);

  // ---------------------------------------------------------------------------
  // Effects: PIN management
  // ---------------------------------------------------------------------------

  // Generate or retrieve PIN when modal opens
  useEffect(() => {
    if (showCreateModal && !pinGeneratedRef.current) {
      let currentPin = pin;

      if (!currentPin) {
        currentPin = lsGet(pinStorageKey);
      }

      if (!currentPin) {
        currentPin = generateSecurePin();
        pinGeneratedRef.current = true;
      }

      setPin(currentPin);
      lsSet(pinStorageKey, currentPin);
    }
  }, [showCreateModal, pin, pinStorageKey]);

  // Reset PIN generation flag when modal closes
  useEffect(() => {
    if (!showCreateModal) {
      pinGeneratedRef.current = false;
    }
  }, [showCreateModal]);

  // ---------------------------------------------------------------------------
  // Modal visibility
  // ---------------------------------------------------------------------------

  // Show modal when:
  // 1. Explicitly requested
  // 2. No session after both recoveries + user hasn't dismissed (only when autoCreateOffline=false)
  // 3. Recovery error that hasn't been dismissed (trivia-style behavior)
  const shouldShowModal =
    showCreateModal ||
    (!autoCreateOffline &&
      !userDismissedModal &&
      !roomCode &&
      !isOfflineMode &&
      recoveryAttempted &&
      offlineRecoveryAttempted) ||
    (!isRecovering && recoveryError !== null && !dismissedRecoveryError);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Create a new online room with a PIN.
   * Calls POST /api/sessions with serialized initial state.
   */
  const createRoom = useCallback(
    async (opts: CreateRoomOptions) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: opts.pin, initialState: opts.initialState }),
        });
        if (!response.ok) throw new Error('Failed to create session');
        const data = (await response.json()) as {
          data: { session: { roomCode: string }; sessionToken: string };
        };
        setRoomCode(makeRoomCode(data.data.session.roomCode));
        setSessionTokenState(data.data.sessionToken);
        storeToken(data.data.sessionToken);
        lsSet(pinStorageKey, opts.pin);
        setPin(opts.pin);
        setShowCreateModal(false);
        setUserDismissedModal(true);
        setIsOfflineMode(false);
        setOfflineSessionId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create session');
        // Clear stored PIN on error so a new one can be generated
        lsRemove(pinStorageKey);
        setPin(null);
        pinGeneratedRef.current = false;
      } finally {
        setIsLoading(false);
      }
    },
    [storeToken, pinStorageKey]
  );

  /**
   * Join an existing room by room code and PIN.
   * Calls POST /api/sessions/:roomCode/verify-pin, then triggers recovery.
   */
  const joinRoom = useCallback(
    async (code: string, joinPin: string) => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sessions/${code}/verify-pin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: joinPin }),
        });
        if (!response.ok) throw new Error('Invalid PIN');
        const data = (await response.json()) as { token: string };
        setRoomCode(makeRoomCode(code));
        setSessionTokenState(data.token);
        storeToken(data.token);
        lsSet(pinStorageKey, joinPin);
        setPin(joinPin);
        setShowCreateModal(false);
        setUserDismissedModal(true);
        await recover();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to join session');
      } finally {
        setIsLoading(false);
      }
    },
    [storeToken, recover, pinStorageKey]
  );

  /**
   * Start a local-only offline session.
   */
  const playOffline = useCallback(() => {
    const newSessionIdStr = generateShortSessionId();
    setOfflineSessionId(makeSessionId(newSessionIdStr));
    setIsOfflineMode(true);
    setRoomCode(null);
    setSessionTokenState(null);
    lsSet(offlineSessionIdStorageKey, newSessionIdStr);

    try {
      const sessionKey = `${offlineSessionStoragePrefix}_${newSessionIdStr}`;
      const now = new Date().toISOString();
      lsSet(
        sessionKey,
        JSON.stringify({
          sessionId: newSessionIdStr,
          isOffline: true,
          gameState: serializeState(),
          createdAt: now,
          lastUpdated: now,
        })
      );
    } catch (err) {
      console.error('Failed to create offline session:', err);
    }
  }, [serializeState, offlineSessionIdStorageKey, offlineSessionStoragePrefix]);

  /**
   * Reset all session state.
   * Clears tokens, room code, and offline session.
   * Optionally shows the room setup modal.
   */
  const resetSession = useCallback(
    (opts?: { showModal?: boolean }) => {
      clearToken();
      setRoomCode(null);
      setSessionTokenState(null);
      setIsOfflineMode(false);
      setOfflineSessionId(null);
      autoCreateExecuted.current = false;

      if (opts?.showModal !== false) {
        setShowCreateModal(true);
        setUserDismissedModal(false);
      }
    },
    [clearToken]
  );

  const openModal = useCallback(() => {
    setShowCreateModal(true);
    setUserDismissedModal(false);
  }, []);

  const closeModal = useCallback(() => {
    setShowCreateModal(false);
    setError(null);
    setDismissedRecoveryError(true);
    setUserDismissedModal(true);
  }, []);

  // Expose sessionToken setter so apps can keep local token state if needed
  // (only used internally via storeToken, but exposed for completeness)

  return {
    mode,
    roomCode,
    offlineSessionId,
    sessionId,
    pin,
    isLoading,
    error,
    isRecovering,
    isRecovered,
    shouldShowModal,
    createRoom,
    joinRoom,
    playOffline,
    resetSession,
    openModal,
    closeModal,
    storeToken,
    clearToken,
    recover,
  };
}
