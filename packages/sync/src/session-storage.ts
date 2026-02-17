/**
 * Session store for managing game session state in localStorage.
 *
 * Provides simple state storage for:
 * - Active session information
 * - Connected participants list
 * - Session history (recent sessions)
 *
 * Uses localStorage for persistence across browser sessions.
 * This is a placeholder for future WebSocket/Supabase Realtime integration.
 */

import { SyncRole } from './types';
import { GameType, generateSessionId } from './session-link';

// =============================================================================
// TYPES
// =============================================================================

/**
 * A participant in a game session.
 */
export interface SessionParticipant {
  /** Unique identifier for this participant */
  id: string;
  /** Display name (optional) */
  name?: string;
  /** Role in the session */
  role: SyncRole;
  /** When the participant joined */
  joinedAt: number;
  /** Last activity timestamp */
  lastActiveAt: number;
}

/**
 * Session state stored in localStorage.
 */
export interface SessionState {
  /** The current session ID (null if not in a session) */
  sessionId: string | null;
  /** The game type for the current session */
  gameType: GameType | null;
  /** This participant's role in the session */
  role: SyncRole | null;
  /** This participant's unique ID */
  participantId: string | null;
  /** List of known participants (placeholder for real-time sync) */
  participants: SessionParticipant[];
  /** Whether this participant is the session host */
  isHost: boolean;
  /** When the session was created/joined */
  createdAt: number | null;
}

/**
 * Recent session entry for session history.
 */
export interface RecentSession {
  sessionId: string;
  gameType: GameType;
  role: SyncRole;
  joinedAt: number;
  lastActiveAt: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** localStorage key for session state */
const SESSION_STATE_KEY = 'jb-session-state';

/** localStorage key for recent sessions */
const RECENT_SESSIONS_KEY = 'jb-recent-sessions';

/** Maximum number of recent sessions to store */
const MAX_RECENT_SESSIONS = 10;

/** Default empty session state */
const DEFAULT_SESSION_STATE: SessionState = {
  sessionId: null,
  gameType: null,
  role: null,
  participantId: null,
  participants: [],
  isHost: false,
  createdAt: null,
};

// =============================================================================
// STORAGE UTILITIES
// =============================================================================

/**
 * Safely get an item from localStorage.
 */
function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely set an item in localStorage.
 */
function setStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/**
 * Safely remove an item from localStorage.
 */
function removeStorageItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// SESSION STATE FUNCTIONS
// =============================================================================

/**
 * Get the current session state from localStorage.
 */
export function getSessionState(): SessionState {
  return getStorageItem<SessionState>(SESSION_STATE_KEY, DEFAULT_SESSION_STATE);
}

/**
 * Save session state to localStorage.
 */
export function saveSessionState(state: SessionState): boolean {
  return setStorageItem(SESSION_STATE_KEY, state);
}

/**
 * Clear the current session state.
 */
export function clearSessionState(): boolean {
  return removeStorageItem(SESSION_STATE_KEY);
}

/**
 * Create a new session as the host.
 */
export function createSession(gameType: GameType): SessionState {
  const sessionId = generateSessionId();
  const participantId = generateSessionId();
  const now = Date.now();

  const state: SessionState = {
    sessionId,
    gameType,
    role: 'presenter',
    participantId,
    participants: [
      {
        id: participantId,
        role: 'presenter',
        joinedAt: now,
        lastActiveAt: now,
      },
    ],
    isHost: true,
    createdAt: now,
  };

  saveSessionState(state);
  addToRecentSessions({
    sessionId,
    gameType,
    role: 'presenter',
    joinedAt: now,
    lastActiveAt: now,
  });

  return state;
}

/**
 * Join an existing session.
 */
export function joinSession(
  sessionId: string,
  gameType: GameType,
  role: SyncRole = 'audience'
): SessionState {
  const participantId = generateSessionId();
  const now = Date.now();

  const state: SessionState = {
    sessionId,
    gameType,
    role,
    participantId,
    participants: [
      {
        id: participantId,
        role,
        joinedAt: now,
        lastActiveAt: now,
      },
    ],
    isHost: false,
    createdAt: now,
  };

  saveSessionState(state);
  addToRecentSessions({
    sessionId,
    gameType,
    role,
    joinedAt: now,
    lastActiveAt: now,
  });

  return state;
}

/**
 * Leave the current session.
 */
export function leaveSession(): void {
  clearSessionState();
}

/**
 * Check if currently in a session.
 */
export function isInSession(): boolean {
  const state = getSessionState();
  return state.sessionId !== null;
}

/**
 * Update the last active timestamp for the current participant.
 */
export function updateActivity(): void {
  const state = getSessionState();
  if (!state.sessionId || !state.participantId) {
    return;
  }

  const now = Date.now();
  const participants = state.participants.map((p) =>
    p.id === state.participantId ? { ...p, lastActiveAt: now } : p
  );

  saveSessionState({ ...state, participants });
}

// =============================================================================
// PARTICIPANTS FUNCTIONS
// =============================================================================

/**
 * Add a participant to the current session.
 * Note: In the current BroadcastChannel implementation, this is a placeholder.
 * Real participant tracking will be added with WebSocket/Realtime integration.
 */
export function addParticipant(participant: SessionParticipant): void {
  const state = getSessionState();
  if (!state.sessionId) {
    return;
  }

  // Check if participant already exists
  const exists = state.participants.some((p) => p.id === participant.id);
  if (exists) {
    return;
  }

  const participants = [...state.participants, participant];
  saveSessionState({ ...state, participants });
}

/**
 * Remove a participant from the current session.
 */
export function removeParticipant(participantId: string): void {
  const state = getSessionState();
  if (!state.sessionId) {
    return;
  }

  const participants = state.participants.filter((p) => p.id !== participantId);
  saveSessionState({ ...state, participants });
}

/**
 * Update a participant's information.
 */
export function updateParticipant(
  participantId: string,
  updates: Partial<Omit<SessionParticipant, 'id'>>
): void {
  const state = getSessionState();
  if (!state.sessionId) {
    return;
  }

  const participants = state.participants.map((p) =>
    p.id === participantId ? { ...p, ...updates } : p
  );
  saveSessionState({ ...state, participants });
}

/**
 * Get the count of participants by role.
 */
export function getParticipantCounts(): { presenter: number; audience: number; total: number } {
  const state = getSessionState();
  const presenter = state.participants.filter((p) => p.role === 'presenter').length;
  const audience = state.participants.filter((p) => p.role === 'audience').length;

  return {
    presenter,
    audience,
    total: state.participants.length,
  };
}

// =============================================================================
// RECENT SESSIONS FUNCTIONS
// =============================================================================

/**
 * Get the list of recent sessions.
 */
export function getRecentSessions(): RecentSession[] {
  return getStorageItem<RecentSession[]>(RECENT_SESSIONS_KEY, []);
}

/**
 * Add a session to the recent sessions list.
 */
export function addToRecentSessions(session: RecentSession): void {
  const recent = getRecentSessions();

  // Remove any existing entry for this session
  const filtered = recent.filter((s) => s.sessionId !== session.sessionId);

  // Add new entry at the beginning
  const updated = [session, ...filtered].slice(0, MAX_RECENT_SESSIONS);

  setStorageItem(RECENT_SESSIONS_KEY, updated);
}

/**
 * Update the last active timestamp for a recent session.
 */
export function updateRecentSessionActivity(sessionId: string): void {
  const recent = getRecentSessions();
  const updated = recent.map((s) =>
    s.sessionId === sessionId ? { ...s, lastActiveAt: Date.now() } : s
  );
  setStorageItem(RECENT_SESSIONS_KEY, updated);
}

/**
 * Clear all recent sessions.
 */
export function clearRecentSessions(): void {
  removeStorageItem(RECENT_SESSIONS_KEY);
}

/**
 * Remove a specific session from recent sessions.
 */
export function removeFromRecentSessions(sessionId: string): void {
  const recent = getRecentSessions();
  const filtered = recent.filter((s) => s.sessionId !== sessionId);
  setStorageItem(RECENT_SESSIONS_KEY, filtered);
}
