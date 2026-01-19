/**
 * API client functions for trivia session history.
 * These functions provide a clean interface for the frontend to interact with the sessions API.
 */

import type {
  TriviaSessionHistory,
  CreateSessionHistoryRequest,
  UpdateSessionHistoryRequest,
  ApiResponse,
  PaginatedResponse,
} from '@/types';

const API_BASE = '/api/sessions';

/**
 * Fetch all session history records with optional pagination and filtering
 */
export async function getSessions(options?: {
  page?: number;
  pageSize?: number;
  userId?: string;
}): Promise<PaginatedResponse<TriviaSessionHistory>> {
  const params = new URLSearchParams();

  if (options?.page) {
    params.set('page', String(options.page));
  }
  if (options?.pageSize) {
    params.set('pageSize', String(options.pageSize));
  }
  if (options?.userId) {
    params.set('userId', options.userId);
  }

  const queryString = params.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  const response = await fetch(url);
  return response.json();
}

/**
 * Fetch a single session history record by ID
 */
export async function getSession(id: string): Promise<ApiResponse<TriviaSessionHistory>> {
  const response = await fetch(`${API_BASE}/${id}`);
  return response.json();
}

/**
 * Create a new session history record
 */
export async function createSession(
  data: CreateSessionHistoryRequest
): Promise<ApiResponse<TriviaSessionHistory>> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Update an existing session history record
 */
export async function updateSession(
  id: string,
  data: UpdateSessionHistoryRequest
): Promise<ApiResponse<TriviaSessionHistory>> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  return response.json();
}

/**
 * Delete a session history record
 */
export async function deleteSession(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
  const response = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE',
  });
  return response.json();
}

/**
 * Helper to create session history from current game state
 * This converts the game state to the session history format for persistence
 */
export function createSessionFromGameState(
  gameState: {
    sessionId: string;
    teams: Array<{
      id: string;
      name: string;
      score: number;
      roundScores: number[];
    }>;
    questions: Array<{
      id: string;
      text: string;
      correctAnswers: string[];
    }>;
    teamAnswers: Array<{
      teamId: string;
      questionId: string;
      isCorrect: boolean;
    }>;
    currentRound: number;
    totalRounds: number;
  },
  options?: {
    startedAt?: string;
    endedAt?: string;
    userId?: string;
    questionSetId?: string;
    questionSetName?: string;
  }
): CreateSessionHistoryRequest {
  // Calculate team scores
  const teamScores = gameState.teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    totalScore: team.score,
    roundScores: team.roundScores,
  }));

  // Find winner (team with highest score)
  const sortedTeams = [...teamScores].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sortedTeams.length > 0 && sortedTeams[0].totalScore > 0 ? sortedTeams[0] : null;

  // Calculate question summaries
  const questionSummaries = gameState.questions.map((question) => {
    const answersForQuestion = gameState.teamAnswers.filter(
      (a) => a.questionId === question.id
    );
    const teamsCorrect = answersForQuestion.filter((a) => a.isCorrect).length;
    const teamsIncorrect = answersForQuestion.filter((a) => !a.isCorrect).length;

    return {
      questionId: question.id,
      questionText: question.text,
      correctAnswers: question.correctAnswers,
      teamsCorrect,
      teamsIncorrect,
    };
  });

  // Count questions that were actually answered
  const questionsAnswered = new Set(
    gameState.teamAnswers.map((a) => a.questionId)
  ).size;

  return {
    startedAt: options?.startedAt || new Date().toISOString(),
    endedAt: options?.endedAt,
    roundsPlayed: gameState.currentRound + 1, // currentRound is 0-indexed
    totalRounds: gameState.totalRounds,
    questionsAnswered,
    totalQuestions: gameState.questions.length,
    teamScores,
    winnerTeamId: winner?.teamId,
    winnerTeamName: winner?.teamName,
    userId: options?.userId,
    questionSetId: options?.questionSetId,
    questionSetName: options?.questionSetName,
    questionSummaries,
  };
}

/**
 * Get recent session history (convenience function)
 */
export async function getRecentSessions(
  limit: number = 10
): Promise<PaginatedResponse<TriviaSessionHistory>> {
  return getSessions({ pageSize: limit });
}

/**
 * Get session history for a specific user (for future auth integration)
 */
export async function getUserSessions(
  userId: string,
  options?: { page?: number; pageSize?: number }
): Promise<PaginatedResponse<TriviaSessionHistory>> {
  return getSessions({ ...options, userId });
}
