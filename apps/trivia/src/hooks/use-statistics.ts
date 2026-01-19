'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TriviaStatistics, TriviaSessionRecord } from '@beak-gaming/game-engine';
import {
  loadTriviaStats,
  addTriviaSession,
  clearTriviaStats,
  createEmptyTriviaStats,
  getMostPopularCategories,
  formatDuration,
  generateSessionId,
} from '@beak-gaming/game-engine';
import type { Team, Question } from '@/types';

/**
 * Hook for managing trivia game statistics.
 * Provides statistics data and methods to record new sessions.
 */
export function useStatistics() {
  const [stats, setStats] = useState<TriviaStatistics>(createEmptyTriviaStats);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load stats from localStorage on mount
  useEffect(() => {
    const loadedStats = loadTriviaStats();
    setStats(loadedStats);
    setIsLoaded(true);
  }, []);

  /**
   * Record a completed trivia session.
   */
  const recordSession = useCallback(
    (session: Omit<TriviaSessionRecord, 'id'>) => {
      const fullSession: TriviaSessionRecord = {
        ...session,
        id: generateSessionId(),
      };

      const newStats = addTriviaSession(fullSession);
      setStats(newStats);
      return newStats;
    },
    []
  );

  /**
   * Clear all statistics.
   */
  const clearStats = useCallback(() => {
    clearTriviaStats();
    setStats(createEmptyTriviaStats());
  }, []);

  /**
   * Get the most popular categories.
   */
  const mostPopularCategories = getMostPopularCategories(stats, 3);

  /**
   * Get formatted total play time.
   */
  const formattedPlayTime = formatDuration(stats.totalPlayTime);

  return {
    // Statistics data
    stats,
    isLoaded,

    // Computed values
    gamesPlayed: stats.gamesPlayed,
    averageTeamScore: stats.averageTeamScore,
    overallAccuracy: stats.overallAccuracy,
    highestTeamScore: stats.highestTeamScore,
    mostPopularCategories,
    formattedPlayTime,
    recentSessions: stats.recentSessions,

    // Actions
    recordSession,
    clearStats,
  };
}

/**
 * Hook for tracking an active trivia game session.
 * Call startSession when game starts, endSession when game ends.
 */
export function useSessionTracking() {
  const sessionRef = useRef<{
    startedAt: string;
    totalRounds: number;
    totalQuestions: number;
    categoriesPlayed: Set<string>;
  } | null>(null);

  const { recordSession } = useStatistics();

  /**
   * Start tracking a new session.
   */
  const startSession = useCallback((totalRounds: number, questions: Question[]) => {
    // Collect unique categories from questions
    const categories = new Set<string>();
    for (const q of questions) {
      categories.add(q.category);
    }

    sessionRef.current = {
      startedAt: new Date().toISOString(),
      totalRounds,
      totalQuestions: questions.length,
      categoriesPlayed: categories,
    };
  }, []);

  /**
   * End the current session and record statistics.
   */
  const endSession = useCallback(
    (
      roundsPlayed: number,
      questionsAnswered: number,
      teams: Team[]
    ) => {
      if (!sessionRef.current) {
        return null;
      }

      const endedAt = new Date().toISOString();
      const startedAtDate = new Date(sessionRef.current.startedAt);
      const endedAtDate = new Date(endedAt);
      const duration = endedAtDate.getTime() - startedAtDate.getTime();

      // Calculate team statistics
      const teamCount = teams.length;
      const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
      const winner = sortedTeams.length > 0 ? sortedTeams[0] : null;
      const averageTeamScore =
        teamCount > 0
          ? teams.reduce((sum, t) => sum + t.score, 0) / teamCount
          : 0;

      const session: Omit<TriviaSessionRecord, 'id'> = {
        roundsPlayed,
        totalRounds: sessionRef.current.totalRounds,
        questionsAnswered,
        totalQuestions: sessionRef.current.totalQuestions,
        teamCount,
        winnerTeamName: winner?.name ?? null,
        winnerScore: winner?.score ?? null,
        averageTeamScore: Math.round(averageTeamScore * 10) / 10,
        categoriesPlayed: Array.from(sessionRef.current.categoriesPlayed),
        startedAt: sessionRef.current.startedAt,
        endedAt,
        duration,
      };

      sessionRef.current = null;

      return recordSession(session);
    },
    [recordSession]
  );

  /**
   * Cancel the current session without recording.
   */
  const cancelSession = useCallback(() => {
    sessionRef.current = null;
  }, []);

  /**
   * Check if a session is currently active.
   */
  const isSessionActive = sessionRef.current !== null;

  return {
    startSession,
    endSession,
    cancelSession,
    isSessionActive,
  };
}
