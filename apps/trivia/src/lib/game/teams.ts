import { v4 as uuidv4 } from 'uuid';
import type { TriviaGameState, Team } from '@/types';
import { DEFAULT_TEAM_PREFIX, MAX_TEAMS } from '@/types';
import { deepFreeze } from './helpers';

// =============================================================================
// TEAM MANAGEMENT
// =============================================================================

export function addTeam(
  state: TriviaGameState,
  name?: string
): TriviaGameState {
  if (state.teams.length >= MAX_TEAMS) return state;

  const tableNumber = state.teams.length + 1;
  const newTeam: Team = {
    id: uuidv4(),
    name: name || `${DEFAULT_TEAM_PREFIX} ${tableNumber}`,
    score: 0,
    tableNumber,
    roundScores: [],
  };

  return deepFreeze({
    ...state,
    teams: [...state.teams, newTeam],
  });
}

export function removeTeam(
  state: TriviaGameState,
  teamId: string
): TriviaGameState {
  return deepFreeze({
    ...state,
    teams: state.teams.filter((t) => t.id !== teamId),
  });
}

export function renameTeam(
  state: TriviaGameState,
  teamId: string,
  name: string
): TriviaGameState {
  return deepFreeze({
    ...state,
    teams: state.teams.map((t) => (t.id === teamId ? { ...t, name } : t)),
  });
}

/**
 * Update the order of teams by providing a new ordered array of team IDs.
 */
export function updateTeamOrder(
  state: TriviaGameState,
  orderedTeamIds: string[]
): TriviaGameState {
  const teamMap = new Map(state.teams.map((t) => [t.id, t]));
  const reordered = orderedTeamIds
    .map((id) => teamMap.get(id))
    .filter((t): t is Team => t !== undefined);

  // Append any teams not in the provided order at the end
  const reorderedIds = new Set(orderedTeamIds);
  const remaining = state.teams.filter((t) => !reorderedIds.has(t.id));

  return deepFreeze({
    ...state,
    teams: [...reordered, ...remaining],
  });
}
