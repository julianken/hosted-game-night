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
export { OAuthCallbackPage } from './components/OAuthCallbackPage';

// Token refresh utilities
export {
  shouldRefreshToken,
  isTokenExpired,
  refreshTokens,
  type TokenRefreshResult,
} from './token-refresh';

// API route authentication utilities
export {
  getApiUser,
  createAuthenticatedClient,
  type ApiUser,
} from './api-auth';

// PKCE utilities
export { generatePKCE } from './pkce';

// OAuth 2.1 client
export { startOAuthFlow } from './oauth-client';

// Redirect validation utilities
export { isValidRedirect, sanitizeRedirect } from './redirect-validation';

// Unified JWT verification chain
export {
  verifyToken,
  createJwksGetter,
  type VerifyTokenOutcome,
  type VerifyTokenMethod,
  type VerifyTokenConfig,
} from './verify-token';

