/**
 * Session link utilities for generating and parsing shareable game session URLs.
 *
 * Session links allow players to join a game session via a URL. The link encodes:
 * - Game type (bingo, trivia, etc.)
 * - Session ID (unique identifier for the session)
 * - Role (presenter or audience)
 *
 * Currently uses BroadcastChannel for same-device sync. The session link system
 * is a placeholder for future WebSocket/Supabase Realtime integration.
 */

import { SyncRole } from './types';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Supported game types in the Joolie Boolie.
 */
export type GameType = 'bingo' | 'trivia';

/**
 * Session link data structure.
 */
export interface SessionLinkData {
  /** The type of game (bingo, trivia) */
  gameType: GameType;
  /** Unique session identifier */
  sessionId: string;
  /** Role for the joiner (defaults to 'audience') */
  role: SyncRole;
}

/**
 * Options for generating a session link.
 */
export interface GenerateSessionLinkOptions {
  /** The type of game */
  gameType: GameType;
  /** Optional custom session ID (will be generated if not provided) */
  sessionId?: string;
  /** Role for the link recipient (defaults to 'audience') */
  role?: SyncRole;
  /** Base URL for the link (defaults to window.location.origin) */
  baseUrl?: string;
}

/**
 * Result of parsing a session link.
 */
export type ParseSessionLinkResult =
  | { success: true; data: SessionLinkData }
  | { success: false; error: string };

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * URL parameter names for session links.
 */
export const SESSION_LINK_PARAMS = {
  SESSION_ID: 'session',
  ROLE: 'role',
} as const satisfies Record<string, string>;

/**
 * Default paths for each game type.
 */
export const GAME_PATHS = {
  bingo: '/play',
  trivia: '/play',
} as const satisfies Record<GameType, string>;

/**
 * Valid game types for validation.
 */
export const VALID_GAME_TYPES = ['bingo', 'trivia'] as const satisfies readonly GameType[];

/**
 * Valid sync roles for validation.
 */
export const VALID_ROLES = ['presenter', 'audience'] as const satisfies readonly SyncRole[];

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Generate a unique session ID.
 * Format: {timestamp}-{random} (e.g., "1705678901234-a1b2c3d4")
 */
export function generateSessionId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}-${random}`;
}

/**
 * Validate a session ID format.
 */
export function isValidSessionId(sessionId: string): boolean {
  // Must be non-empty string
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  // Should match our format: timestamp-random
  // Allow some flexibility for different ID formats
  const validPattern = /^[\w-]{8,32}$/;
  return validPattern.test(sessionId);
}

/**
 * Validate a game type.
 */
export function isValidGameType(gameType: string): gameType is GameType {
  return VALID_GAME_TYPES.includes(gameType as GameType);
}

/**
 * Validate a sync role.
 */
export function isValidRole(role: string): role is SyncRole {
  return VALID_ROLES.includes(role as SyncRole);
}

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Generate a shareable session link.
 *
 * @example
 * ```ts
 * const link = generateSessionLink({
 *   gameType: 'bingo',
 *   sessionId: 'my-session-123',
 *   role: 'audience',
 * });
 * // => "https://example.com/play?session=my-session-123&role=audience"
 * ```
 */
export function generateSessionLink(options: GenerateSessionLinkOptions): string {
  const {
    gameType,
    sessionId = generateSessionId(),
    role = 'audience',
    baseUrl = typeof window !== 'undefined' ? window.location.origin : '',
  } = options;

  if (!isValidGameType(gameType)) {
    throw new Error(`Invalid game type: ${gameType}`);
  }

  if (!isValidRole(role)) {
    throw new Error(`Invalid role: ${role}`);
  }

  const path = GAME_PATHS[gameType];
  const url = new URL(path, baseUrl);

  url.searchParams.set(SESSION_LINK_PARAMS.SESSION_ID, sessionId);
  url.searchParams.set(SESSION_LINK_PARAMS.ROLE, role);

  return url.toString();
}

/**
 * Parse a session link URL and extract session data.
 *
 * @example
 * ```ts
 * const result = parseSessionLink(
 *   'https://example.com/play?session=abc123&role=audience',
 *   'bingo'
 * );
 * if (result.success) {
 *   console.log(result.data.sessionId); // "abc123"
 * }
 * ```
 */
export function parseSessionLink(url: string, gameType: GameType): ParseSessionLinkResult {
  try {
    const parsedUrl = new URL(url);
    const sessionId = parsedUrl.searchParams.get(SESSION_LINK_PARAMS.SESSION_ID);
    const roleParam = parsedUrl.searchParams.get(SESSION_LINK_PARAMS.ROLE);

    // Session ID is required
    if (!sessionId) {
      return {
        success: false,
        error: 'Missing session ID in URL',
      };
    }

    if (!isValidSessionId(sessionId)) {
      return {
        success: false,
        error: 'Invalid session ID format',
      };
    }

    // Role defaults to 'audience' if not provided
    const role: SyncRole = roleParam && isValidRole(roleParam) ? roleParam : 'audience';

    return {
      success: true,
      data: {
        gameType,
        sessionId,
        role,
      },
    };
  } catch {
    return {
      success: false,
      error: 'Invalid URL format',
    };
  }
}

/**
 * Parse session parameters from the current URL (browser only).
 * Useful for detecting if the page was loaded from a session link.
 */
export function parseCurrentUrlSession(gameType: GameType): ParseSessionLinkResult {
  if (typeof window === 'undefined') {
    return {
      success: false,
      error: 'Cannot parse URL in server environment',
    };
  }

  return parseSessionLink(window.location.href, gameType);
}

/**
 * Check if the current URL has session parameters.
 */
export function hasSessionParams(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.has(SESSION_LINK_PARAMS.SESSION_ID);
}

/**
 * Get the session ID from URL parameters, if present.
 */
export function getSessionIdFromUrl(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get(SESSION_LINK_PARAMS.SESSION_ID);
}

/**
 * Get the role from URL parameters, if present.
 */
export function getRoleFromUrl(): SyncRole | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const role = params.get(SESSION_LINK_PARAMS.ROLE);

  if (role && isValidRole(role)) {
    return role;
  }

  return null;
}

/**
 * Create a channel name from game type and session ID.
 * This ensures different sessions don't interfere with each other.
 */
export function createChannelName(gameType: GameType, sessionId: string): string {
  return `jb-${gameType}-${sessionId}`;
}
