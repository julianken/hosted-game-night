/**
 * @joolie-boolie/types
 *
 * Shared TypeScript types for the Joolie Boolie.
 *
 * This package provides common types used across the monorepo, including:
 * - Game types (GameStatus, GameType, GameSession)
 * - User types (User, UserProfile, AuthResponse)
 * - API types (ApiResponse, PaginatedResponse)
 * - Sync types (SyncRole, SyncMessage)
 *
 * @example
 * import type { GameStatus, ApiResponse, User } from '@joolie-boolie/types';
 *
 * // Or import from specific modules:
 * import type { GameSession } from '@joolie-boolie/types/game';
 * import type { PaginatedResponse } from '@joolie-boolie/types/api';
 */

// =============================================================================
// GAME TYPES
// =============================================================================

export type {
  GameStatus,
  TriviaGameStatus,
  GameType,
  GameSession,
  ThemeMode,
  ColorTheme,
  Timestamps,
} from './game';

export { GAME_TYPE_NAMES } from './game';

// =============================================================================
// USER TYPES
// =============================================================================

export type {
  User,
  UserProfile,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  UpdateProfileRequest,
  Session,
} from './user';

// =============================================================================
// API TYPES
// =============================================================================

export type {
  ApiResponse,
  PaginatedResponse,
  PaginationParams,
  SortDirection,
  SortParams,
  ListParams,
  ApiError,
  ApiErrorCode,
  RequestMetadata,
} from './api';

// =============================================================================
// SYNC TYPES
// =============================================================================

export type {
  SyncRole,
  ConnectionState,
  BaseSyncMessageType,
  SyncMessage,
  ThemeSyncPayload,
  BaseSyncState,
} from './sync';

// =============================================================================
// BRANDED TYPES
// =============================================================================

export type {
  Branded,
  SessionId,
  TeamId,
  QuestionId,
  RoomCode,
  BallNumber,
} from './branded';

export {
  makeSessionId,
  makeTeamId,
  makeQuestionId,
  makeRoomCode,
  makeBallNumber,
} from './branded';
