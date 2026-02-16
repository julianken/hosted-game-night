/**
 * @joolie-boolie/database
 *
 * Shared database utilities for the Joolie Boolie.
 * Provides type-safe Supabase client wrappers, query helpers, and React hooks.
 */

// =============================================================================
// Client
// =============================================================================

export {
  createClient,
  createBrowserClient,
  getBrowserClient,
  resetClient,
  getServerClientConfig,
  getCurrentUser,
  getSession,
  isAuthenticated,
  type DatabaseConfig,
  type TypedSupabaseClient,
  type CookieHandler,
} from './client';

// =============================================================================
// Server Client (Next.js)
// =============================================================================

export {
  createServerClient,
  createClient as createServerClientAlias,
  createServiceRoleClient,
} from './server';

// =============================================================================
// Types
// =============================================================================

export {
  // Database schema type
  type Database,
  type TableName,
  type TableRow,
  type TableInsert,
  type TableUpdate,

  // Profile types
  type Profile,
  type ProfileInsert,
  type ProfileUpdate,

  // Bingo template types
  type BingoTemplate,
  type BingoTemplateInsert,
  type BingoTemplateUpdate,

  // Trivia template types
  type TriviaTemplate,
  type TriviaTemplateInsert,
  type TriviaTemplateUpdate,
  type TriviaQuestion,

  // Bingo preset types
  type BingoPreset,
  type BingoPresetInsert,
  type BingoPresetUpdate,

  // Trivia preset types
  type TriviaPreset,
  type TriviaPresetInsert,
  type TriviaPresetUpdate,

  // Trivia question set types
  type TriviaQuestionSet,
  type TriviaQuestionSetInsert,
  type TriviaQuestionSetUpdate,

  // Game session types (persistent)
  type GameSession,
  type GameSessionInsert,
  type GameSessionUpdate,

  // Type guards
  isProfile,
  isBingoTemplate,
  isTriviaTemplate,
  isGameSession,

  // Preset type guards
  isBingoPreset,
  isTriviaPreset,
  isTriviaQuestionSet,
} from './types';

// =============================================================================
// Errors
// =============================================================================

export {
  // Error classes
  DatabaseError,
  NotFoundError,
  DuplicateError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConnectionError,
  TimeoutError,
  RateLimitError,
  ConstraintViolationError,

  // Error utilities
  isDatabaseError,
  mapSupabaseError,
  withErrorHandling,

  // Error types
  type DatabaseErrorCode,
} from './errors';

// =============================================================================
// Pagination
// =============================================================================

export {
  // Functions
  normalizePaginationParams,
  calculatePagination,
  createPaginatedResult,
  encodeCursor,
  decodeCursor,
  calculateRange,
  extractCursor,
  createCursorPaginatedResult,
  buildPaginationParams,
  parsePaginationParams,

  // Constants
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  MIN_PAGE,

  // Types
  type PaginationParams,
  type PaginatedResult,
  type CursorPaginationParams,
} from './pagination';

// =============================================================================
// Filters
// =============================================================================

export {
  // Functions
  applyFilter,
  applyFilters,
  applySort,
  applySorts,
  createTextSearchFilter,
  applyTextSearch,
  parseFiltersFromParams,
  parseSortsFromParams,

  // Helper objects
  filters,
  sorts,

  // Types
  type FilterOperator,
  type FilterCondition,
  type SortCondition,
  type SearchParams,
} from './filters';

// =============================================================================
// Query Helpers
// =============================================================================

export {
  // CRUD operations
  getById,
  getOne,
  list,
  listAll,
  create,
  createMany,
  update,
  updateMany,
  remove,
  removeMany,
  count,
  exists,
  upsert,

  // Types
  type QueryOptions,
  type ListOptions,
} from './queries';

// =============================================================================
// Table-Specific Utilities
// =============================================================================

export {
  // Profiles
  getCurrentProfile,
  getProfile,
  getProfileWithStats,
  updateCurrentProfile,
  updateProfile,
  updateFacilityName,
  updateDefaultGameTitle,
  updateLogoUrl,
  hasProfile,
  type ProfileWithStats,

  // Bingo Templates
  getBingoTemplate,
  listBingoTemplates,
  listAllBingoTemplates,
  getDefaultBingoTemplate,
  createBingoTemplate,
  updateBingoTemplate,
  deleteBingoTemplate,
  setDefaultBingoTemplate,
  duplicateBingoTemplate,
  userOwnsBingoTemplate,
  countBingoTemplates,
  BINGO_TEMPLATE_SEARCH_COLUMNS,
  AUTO_CALL_INTERVAL_MIN,
  AUTO_CALL_INTERVAL_MAX,

  // Trivia Templates
  getTriviaTemplate,
  listTriviaTemplates,
  listAllTriviaTemplates,
  getDefaultTriviaTemplate,
  createTriviaTemplate,
  updateTriviaTemplate,
  deleteTriviaTemplate,
  setDefaultTriviaTemplate,
  duplicateTriviaTemplate,
  addQuestions,
  removeQuestion,
  updateQuestion,
  reorderQuestions,
  userOwnsTriviaTemplate,
  countTriviaTemplates,
  getTotalQuestionCount,
  TRIVIA_TEMPLATE_SEARCH_COLUMNS,
  ROUNDS_COUNT_MIN,
  ROUNDS_COUNT_MAX,
  QUESTIONS_PER_ROUND_MIN,
  QUESTIONS_PER_ROUND_MAX,
  TIMER_DURATION_MIN,
  TIMER_DURATION_MAX,

  // Bingo Presets
  getBingoPreset,
  listBingoPresets,
  listAllBingoPresets,
  getDefaultBingoPreset,
  createBingoPreset,
  updateBingoPreset,
  deleteBingoPreset,
  setDefaultBingoPreset,
  duplicateBingoPreset,
  userOwnsBingoPreset,
  countBingoPresets,
  BINGO_PRESET_SEARCH_COLUMNS,

  // Trivia Presets
  getTriviaPreset,
  listTriviaPresets,
  listAllTriviaPresets,
  getDefaultTriviaPreset,
  createTriviaPreset as createTriviaPresetRecord,
  updateTriviaPreset as updateTriviaPresetRecord,
  deleteTriviaPreset,
  setDefaultTriviaPreset,
  duplicateTriviaPreset,
  userOwnsTriviaPreset,
  countTriviaPresets,
  TRIVIA_PRESET_SEARCH_COLUMNS,

  // Trivia Question Sets
  getTriviaQuestionSet,
  listTriviaQuestionSets,
  listAllTriviaQuestionSets,
  getDefaultTriviaQuestionSet,
  createTriviaQuestionSet,
  updateTriviaQuestionSet,
  deleteTriviaQuestionSet,
  setDefaultTriviaQuestionSet,
  duplicateTriviaQuestionSet,
  userOwnsTriviaQuestionSet,
  countTriviaQuestionSets,
  addQuestionsToSet,
  removeQuestionFromSet,
  updateQuestionInSet,
  reorderQuestionsInSet,
  getQuestionSetTotalCount,
  TRIVIA_QUESTION_SET_SEARCH_COLUMNS,

  // Game Sessions (Local/In-Memory)
  generateSessionId,
  createLocalSession,
  getLocalSession,
  updateLocalSession,
  deleteLocalSession,
  getLocalSessionsByUser,
  getActiveLocalSessions,
  clearLocalSessions,
  startSession,
  pauseSession,
  resumeSession,
  completeSession,
  cancelSession,
  updateSessionMetadata,
  getBingoMetadata,
  getTriviaMetadata,
  getSessionDuration,
  formatSessionDuration,
  logSession,
  getSessionHistory,
  type GameType,
  type SessionStatus,
  type BingoSessionMetadata,
  type TriviaSessionMetadata,

  // Persistent Game Sessions (Database-backed)
  createGameSession,
  getGameSessionByRoomCode,
  getGameSessionBySessionId,
  updateGameSessionState,
  incrementFailedPinAttempt,
  resetFailedPinAttempts,
  markSessionCompleted,
  cleanupExpiredSessions,
} from './tables';

// =============================================================================
// React Hooks
// =============================================================================

export {
  // Query hooks
  useQuery,
  useParamQuery,
  useListQuery,

  // Mutation hooks
  useMutation,
  useCreateMutation,
  useUpdateMutation,
  useDeleteMutation,
  useOptimisticMutation,

  // Game session hooks
  useGameSession,
  useCreateGameSession,
  useUpdateGameSessionState,
  useMarkSessionCompleted,
  useVerifyPin,

  // Query types
  type QueryStatus,
  type QueryState,
  type QueryOptions as UseQueryOptions,
  type QueryResult,
  type ListQueryOptions,

  // Mutation types
  type MutationStatus,
  type MutationState,
  type MutationOptions as UseMutationOptions,
  type MutationResult,
  type UpdateVariables,
  type OptimisticMutationOptions,

  // Game session hook types
  type VerifyPinVariables,
  type VerifyPinResult,
  type UpdateGameStateVariables,
} from './hooks';

// Session Tokens
// =============================================================================

export {
  // Functions
  createSessionToken,
  encodeSessionToken,
  decodeSessionToken,
  isTokenExpired,

  // Constants
  TOKEN_DURATION_MS,

  // Types
  type SessionToken,
} from './session-token';

// =============================================================================
// PIN Security
// =============================================================================

export {
  createPinHash,
  verifyPin,
  isValidPin,
  isLockedOut,
  MAX_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from './pin-security';

// =============================================================================
// API Route Factories
// =============================================================================

export {
  createSessionRoutes,
  type SessionRouteConfig,
} from './api';
