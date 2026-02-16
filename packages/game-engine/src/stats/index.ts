/**
 * Game Statistics Module
 *
 * Exports all types, calculator functions, and storage utilities
 * for tracking game statistics across the Joolie Boolie.
 */

// Types
export type {
  BaseGameStatistics,
  BingoSessionRecord,
  BingoPatternStats,
  BingoStatistics,
  TriviaSessionRecord,
  TriviaCategoryStats,
  TriviaStatistics,
} from './types';

export {
  STORAGE_KEYS,
  MAX_RECENT_SESSIONS,
} from './types';

// Calculator functions
export {
  createEmptyBingoStats,
  calculateBingoStats,
  getMostCommonPatterns,
  formatDuration,
  createEmptyTriviaStats,
  calculateTriviaStats,
  getMostPopularCategories,
} from './calculator';

// Storage functions
export {
  loadBingoStats,
  saveBingoStats,
  addBingoSession,
  clearBingoStats,
  loadTriviaStats,
  saveTriviaStats,
  addTriviaSession,
  clearTriviaStats,
  clearAllStats,
  generateSessionId,
} from './storage';
