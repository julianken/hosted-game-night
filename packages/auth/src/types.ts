import type { User, Session, AuthError as SupabaseAuthError } from '@supabase/supabase-js';

/**
 * Re-export Supabase User type for convenience
 */
export type AuthUser = User;

/**
 * Re-export Supabase Session type for convenience
 */
export type AuthSession = Session;

/**
 * Auth error types
 */
export type AuthErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'USER_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN_ERROR';

export interface AuthError {
  code: AuthErrorCode;
  message: string;
  originalError?: SupabaseAuthError | Error;
}

/**
 * Auth state for React context
 */
export interface AuthState {
  user: AuthUser | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: AuthError | null;
}

/**
 * Auth context value with state and actions
 */
export interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, options?: { emailRedirectTo?: string; data?: Record<string, unknown> }) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
  refreshSession: () => Promise<void>;
}

/**
 * Sign in credentials
 */
export interface SignInCredentials {
  email: string;
  password: string;
}

/**
 * Sign up credentials
 */
export interface SignUpCredentials {
  email: string;
  password: string;
  options?: {
    emailRedirectTo?: string;
    data?: Record<string, unknown>;
  };
}

/**
 * OAuth provider types supported by Supabase
 */
export type OAuthProvider = 'google' | 'github' | 'azure' | 'facebook' | 'twitter';

/**
 * Auth configuration options
 */
export interface AuthConfig {
  /**
   * Supabase URL - defaults to NEXT_PUBLIC_SUPABASE_URL env var
   */
  supabaseUrl?: string;
  /**
   * Supabase anon key - defaults to NEXT_PUBLIC_SUPABASE_ANON_KEY env var
   */
  supabaseAnonKey?: string;
  /**
   * Callback URL for OAuth redirects
   */
  redirectTo?: string;
  /**
   * Enable debug logging
   */
  debug?: boolean;
}

/**
 * Protected route configuration
 */
export interface ProtectedRouteConfig {
  /**
   * URL to redirect to when not authenticated
   */
  loginUrl?: string;
  /**
   * Loading component to show while checking auth
   */
  loadingComponent?: React.ReactNode;
  /**
   * Callback when auth check fails
   */
  onAuthFail?: () => void;
}

/**
 * Cookie options for server-side auth
 * Using Record to be compatible with Supabase SSR's cookie options
 */
export type CookieOptions = Record<string, unknown>;

/**
 * Cookie store interface for server-side operations
 * Compatible with Next.js cookies() return type
 */
export interface CookieStore {
  getAll: () => { name: string; value: string }[];
  set: (name: string, value: string, options?: CookieOptions) => void;
}
