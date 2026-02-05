// Types
export type {
  AuthUser,
  AuthSession,
  AuthError,
  AuthErrorCode,
  AuthState,
  AuthContextValue,
  SignInCredentials,
  SignUpCredentials,
  OAuthProvider,
  AuthConfig,
  ProtectedRouteConfig,
  CookieOptions,
  CookieStore,
} from './types';

// Client utilities
export {
  createClient,
  getClient,
  resetClient,
  type SupabaseClient,
} from './client';

// Hooks
export { useAuth } from './hooks/use-auth';
export { useSession, type UseSessionResult } from './hooks/use-session';
export { useUser, type UseUserResult } from './hooks/use-user';

// Components
export {
  AuthProvider,
  AuthContext,
  type AuthProviderProps,
} from './components/auth-provider';
export {
  ProtectedRoute,
  withAuth,
  GuestOnly,
  type ProtectedRouteProps,
  type GuestOnlyProps,
} from './components/protected-route';

// Token refresh utilities
export {
  shouldRefreshToken,
  isTokenExpired,
  refreshTokens,
  type TokenRefreshResult,
} from './token-refresh';
