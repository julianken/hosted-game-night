/**
 * @beak-gaming/database
 *
 * Shared database utilities for the Beak Gaming Platform.
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

  // Type guards
  isProfile,
  isBingoTemplate,
  isTriviaTemplate,
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

  // Game Sessions
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
  type GameSession,
  type GameSessionInsert,
  type GameSessionUpdate,
  type BingoSessionMetadata,
  type TriviaSessionMetadata,
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
