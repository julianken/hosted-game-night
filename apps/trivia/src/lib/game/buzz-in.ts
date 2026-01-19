/**
 * Buzz-in system for fast-answer trivia rounds.
 *
 * Features:
 * - Teams can buzz in by pressing their assigned key (1-9, 0 for team 10)
 * - First team to buzz gets highlighted and locks out others
 * - Timer can optionally start on first buzz
 * - Reset for next question
 */

// =============================================================================
// TYPES
// =============================================================================

export interface BuzzInState {
  /** Whether buzz-in mode is active */
  isActive: boolean;
  /** ID of the team that buzzed first (null if no buzz yet) */
  firstBuzzTeamId: string | null;
  /** Timestamp when first buzz occurred */
  buzzTimestamp: number | null;
  /** Whether the buzz-in is locked (no more buzzes accepted) */
  isLocked: boolean;
  /** Teams that attempted to buzz (for showing who was fastest) */
  buzzOrder: Array<{
    teamId: string;
    timestamp: number;
  }>;
}

export interface BuzzInResult {
  /** Whether the buzz was accepted */
  accepted: boolean;
  /** Whether this was the first buzz */
  isFirst: boolean;
  /** Position in buzz order (1-indexed) */
  position: number;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

export function createInitialBuzzInState(): BuzzInState {
  return {
    isActive: false,
    firstBuzzTeamId: null,
    buzzTimestamp: null,
    isLocked: true,
    buzzOrder: [],
  };
}

// =============================================================================
// STATE TRANSITIONS
// =============================================================================

/**
 * Activate buzz-in mode and unlock for buzzes.
 * Call this when ready for teams to buzz in.
 */
export function activateBuzzIn(state: BuzzInState): BuzzInState {
  return {
    ...state,
    isActive: true,
    isLocked: false,
    firstBuzzTeamId: null,
    buzzTimestamp: null,
    buzzOrder: [],
  };
}

/**
 * Deactivate buzz-in mode.
 */
export function deactivateBuzzIn(state: BuzzInState): BuzzInState {
  return {
    ...state,
    isActive: false,
    isLocked: true,
  };
}

/**
 * Record a team buzz-in attempt.
 * Returns the new state and result of the buzz attempt.
 */
export function recordBuzz(
  state: BuzzInState,
  teamId: string,
  timestamp: number = Date.now()
): { state: BuzzInState; result: BuzzInResult } {
  // Reject if not active or already locked
  if (!state.isActive || state.isLocked) {
    return {
      state,
      result: {
        accepted: false,
        isFirst: false,
        position: 0,
      },
    };
  }

  // Check if this team already buzzed
  const existingBuzz = state.buzzOrder.find((b) => b.teamId === teamId);
  if (existingBuzz) {
    const position = state.buzzOrder.findIndex((b) => b.teamId === teamId) + 1;
    return {
      state,
      result: {
        accepted: false, // Already buzzed
        isFirst: position === 1,
        position,
      },
    };
  }

  const isFirst = state.buzzOrder.length === 0;
  const newBuzzOrder = [...state.buzzOrder, { teamId, timestamp }];
  const position = newBuzzOrder.length;

  const newState: BuzzInState = {
    ...state,
    buzzOrder: newBuzzOrder,
    firstBuzzTeamId: isFirst ? teamId : state.firstBuzzTeamId,
    buzzTimestamp: isFirst ? timestamp : state.buzzTimestamp,
    isLocked: isFirst, // Lock after first buzz
  };

  return {
    state: newState,
    result: {
      accepted: true,
      isFirst,
      position,
    },
  };
}

/**
 * Lock buzz-in (prevent further buzzes).
 */
export function lockBuzzIn(state: BuzzInState): BuzzInState {
  return {
    ...state,
    isLocked: true,
  };
}

/**
 * Unlock buzz-in (allow buzzes again).
 */
export function unlockBuzzIn(state: BuzzInState): BuzzInState {
  if (!state.isActive) {
    return state;
  }

  return {
    ...state,
    isLocked: false,
  };
}

/**
 * Reset buzz-in for next question (keeps active state).
 */
export function resetBuzzIn(state: BuzzInState): BuzzInState {
  return {
    ...state,
    firstBuzzTeamId: null,
    buzzTimestamp: null,
    isLocked: !state.isActive, // Unlock if active
    buzzOrder: [],
  };
}

/**
 * Clear buzz-in state completely.
 */
export function clearBuzzIn(): BuzzInState {
  return createInitialBuzzInState();
}

// =============================================================================
// SELECTORS
// =============================================================================

/**
 * Check if a specific team was the first to buzz.
 */
export function isFirstBuzz(state: BuzzInState, teamId: string): boolean {
  return state.firstBuzzTeamId === teamId;
}

/**
 * Get the position of a team in the buzz order (1-indexed, 0 if not buzzed).
 */
export function getBuzzPosition(state: BuzzInState, teamId: string): number {
  const index = state.buzzOrder.findIndex((b) => b.teamId === teamId);
  return index === -1 ? 0 : index + 1;
}

/**
 * Check if a team has buzzed.
 */
export function hasBuzzed(state: BuzzInState, teamId: string): boolean {
  return state.buzzOrder.some((b) => b.teamId === teamId);
}

/**
 * Get time elapsed since first buzz in milliseconds.
 */
export function getTimeSinceFirstBuzz(state: BuzzInState): number | null {
  if (!state.buzzTimestamp) return null;
  return Date.now() - state.buzzTimestamp;
}

/**
 * Get buzz order with time deltas from first buzz.
 */
export function getBuzzOrderWithDeltas(
  state: BuzzInState
): Array<{ teamId: string; delta: number }> {
  if (state.buzzOrder.length === 0) return [];

  const firstTimestamp = state.buzzOrder[0].timestamp;
  return state.buzzOrder.map((b) => ({
    teamId: b.teamId,
    delta: b.timestamp - firstTimestamp,
  }));
}

// =============================================================================
// KEY MAPPING
// =============================================================================

/**
 * Map keyboard key to team index (0-indexed).
 * Keys 1-9 map to teams 0-8, key 0 maps to team 9.
 */
export function keyToTeamIndex(key: string): number | null {
  // Handle digit keys
  if (/^[0-9]$/.test(key)) {
    const digit = parseInt(key, 10);
    // 1-9 maps to index 0-8, 0 maps to index 9
    return digit === 0 ? 9 : digit - 1;
  }

  // Handle numpad keys
  if (/^Numpad[0-9]$/.test(key)) {
    const digit = parseInt(key.replace('Numpad', ''), 10);
    return digit === 0 ? 9 : digit - 1;
  }

  return null;
}

/**
 * Get the key assignment for a team index.
 * Returns the display key (1-9, 0 for team 10).
 */
export function getTeamKey(teamIndex: number): string | null {
  if (teamIndex < 0 || teamIndex > 9) return null;
  // Index 0-8 maps to keys 1-9, index 9 maps to key 0
  return teamIndex === 9 ? '0' : String(teamIndex + 1);
}
