/**
 * User-related types shared across the Joolie Boolie.
 */

import type { Timestamps } from './game';

// =============================================================================
// USER
// =============================================================================

/**
 * Core user type representing an authenticated user.
 */
export interface User {
  /** Unique identifier (UUID) from Supabase Auth */
  id: string;
  /** User's email address */
  email: string;
  /** Display name for the user */
  displayName: string | null;
  /** ISO 8601 timestamp when the user was created */
  createdAt: string;
}

/**
 * Extended user profile with additional platform-specific fields.
 */
export interface UserProfile extends User, Timestamps {
  /** Name of the user's facility (e.g., group and community name) */
  facilityName: string | null;
  /** URL to the user's custom logo */
  logoUrl: string | null;
  /** Default title to display during games */
  defaultGameTitle: string;
}

// =============================================================================
// AUTH TYPES
// =============================================================================

/**
 * Request payload for user login.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Request payload for user registration.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  facilityName?: string;
  displayName?: string;
}

/**
 * Response from authentication endpoints.
 */
export interface AuthResponse {
  user: User | null;
  error: string | null;
}

/**
 * Request payload for updating user profile.
 */
export interface UpdateProfileRequest {
  displayName?: string;
  facilityName?: string;
  defaultGameTitle?: string;
}

// =============================================================================
// SESSION
// =============================================================================

/**
 * Represents an authenticated session.
 */
export interface Session {
  /** Access token for API requests */
  accessToken: string;
  /** Refresh token for obtaining new access tokens */
  refreshToken: string;
  /** Token expiration timestamp (Unix milliseconds) */
  expiresAt: number;
  /** The authenticated user */
  user: User;
}
