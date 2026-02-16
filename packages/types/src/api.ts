/**
 * API request and response types shared across the Joolie Boolie.
 *
 * These types provide a consistent interface for all API interactions.
 */

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper.
 * All API endpoints should return data in this format.
 *
 * @template T - The type of data being returned
 *
 * @example
 * // Success response
 * const success: ApiResponse<User> = {
 *   data: { id: '123', email: 'user@example.com', ... },
 *   error: null
 * };
 *
 * // Error response
 * const error: ApiResponse<User> = {
 *   data: null,
 *   error: 'User not found'
 * };
 */
export interface ApiResponse<T> {
  /** The response data, or null if an error occurred */
  data: T | null;
  /** Error message, or null if successful */
  error: string | null;
}

/**
 * Paginated API response wrapper.
 * Used for endpoints that return lists of items with pagination.
 *
 * @template T - The type of items in the list
 *
 * @example
 * const response: PaginatedResponse<GameSession> = {
 *   data: [{ id: '1', ... }, { id: '2', ... }],
 *   total: 100,
 *   page: 1,
 *   pageSize: 20,
 *   error: null
 * };
 */
export interface PaginatedResponse<T> {
  /** Array of items for the current page */
  data: T[];
  /** Total number of items across all pages */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  pageSize: number;
  /** Error message, or null if successful */
  error: string | null;
}

// =============================================================================
// PAGINATION REQUEST TYPES
// =============================================================================

/**
 * Standard pagination parameters for list requests.
 */
export interface PaginationParams {
  /** Page number (1-indexed, defaults to 1) */
  page?: number;
  /** Number of items per page (defaults to 20) */
  pageSize?: number;
}

/**
 * Sort direction for list requests.
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Standard sort parameters for list requests.
 */
export interface SortParams<T extends string = string> {
  /** Field to sort by */
  sortBy?: T;
  /** Sort direction (ascending or descending) */
  sortDirection?: SortDirection;
}

/**
 * Combined list request parameters with pagination and sorting.
 */
export interface ListParams<T extends string = string>
  extends PaginationParams,
    SortParams<T> {}

// =============================================================================
// API ERROR TYPES
// =============================================================================

/**
 * Structured API error with additional context.
 */
export interface ApiError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Additional error details (optional) */
  details?: Record<string, unknown>;
}

/**
 * Common API error codes used across the platform.
 */
export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'
  | 'SERVICE_UNAVAILABLE';

// =============================================================================
// REQUEST METADATA
// =============================================================================

/**
 * Metadata that can be included with API requests.
 */
export interface RequestMetadata {
  /** Client request ID for tracing */
  requestId?: string;
  /** Client timestamp (Unix milliseconds) */
  timestamp?: number;
}
