'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { createClient, getClient, type SupabaseClient } from '../client';
import type {
  AuthConfig,
  AuthContextValue,
  AuthError,
  AuthErrorCode,
  AuthState,
} from '../types';

/**
 * Auth context - exported for use by hooks
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * AuthProvider props
 */
export interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * Optional configuration for Supabase client
   */
  config?: AuthConfig;
  /**
   * Optional custom Supabase client instance
   */
  supabaseClient?: SupabaseClient;
  /**
   * Initial session (for SSR hydration)
   */
  initialSession?: Session | null;
  /**
   * Callback when auth state changes
   */
  onAuthStateChange?: (event: AuthChangeEvent, session: Session | null) => void;
}

/**
 * Maps Supabase auth errors to our error format
 */
function mapAuthError(error: unknown): AuthError {
  if (error && typeof error === 'object' && 'message' in error) {
    const errorObj = error as { message: string; status?: number };
    const message = errorObj.message.toLowerCase();

    let code: AuthErrorCode = 'UNKNOWN_ERROR';

    if (message.includes('invalid') || message.includes('credentials')) {
      code = 'INVALID_CREDENTIALS';
    } else if (message.includes('not confirmed') || message.includes('confirm')) {
      code = 'EMAIL_NOT_CONFIRMED';
    } else if (message.includes('not found') || message.includes('no user')) {
      code = 'USER_NOT_FOUND';
    } else if (message.includes('expired') || message.includes('session')) {
      code = 'SESSION_EXPIRED';
    } else if (message.includes('network') || message.includes('fetch')) {
      code = 'NETWORK_ERROR';
    }

    return {
      code,
      message: errorObj.message,
      originalError: error as Error,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : 'An unknown error occurred',
    originalError: error instanceof Error ? error : undefined,
  };
}

/**
 * AuthProvider component that provides authentication state and methods to the app.
 * Wrap your app with this provider to enable auth functionality.
 *
 * @example
 * ```typescript
 * // app/layout.tsx
 * import { AuthProvider } from '@beak-gaming/auth';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <AuthProvider>
 *           {children}
 *         </AuthProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function AuthProvider({
  children,
  config,
  supabaseClient,
  initialSession = null,
  onAuthStateChange,
}: AuthProviderProps): React.ReactElement {
  const [state, setState] = useState<AuthState>({
    user: initialSession?.user ?? null,
    session: initialSession,
    isLoading: !initialSession,
    error: null,
  });

  // Get or create Supabase client
  const supabase = supabaseClient ?? (config ? createClient(config) : getClient());

  // Update user state helper
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Sign in with email/password
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: AuthError | null; session?: Session | null }> => {
      updateState({ isLoading: true, error: null });

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          const authError = mapAuthError(error);
          updateState({ isLoading: false, error: authError });
          return { error: authError };
        }

        updateState({
          user: data.user,
          session: data.session,
          isLoading: false,
          error: null,
        });

        return { error: null, session: data.session };
      } catch (error) {
        const authError = mapAuthError(error);
        updateState({ isLoading: false, error: authError });
        return { error: authError };
      }
    },
    [supabase, updateState]
  );

  // Sign up with email/password
  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: AuthError | null }> => {
      updateState({ isLoading: true, error: null });

      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          const authError = mapAuthError(error);
          updateState({ isLoading: false, error: authError });
          return { error: authError };
        }

        // Note: User might need to confirm email before session is available
        updateState({
          user: data.user,
          session: data.session,
          isLoading: false,
          error: null,
        });

        return { error: null };
      } catch (error) {
        const authError = mapAuthError(error);
        updateState({ isLoading: false, error: authError });
        return { error: authError };
      }
    },
    [supabase, updateState]
  );

  // Sign out
  const signOut = useCallback(async (): Promise<{ error: AuthError | null }> => {
    updateState({ isLoading: true, error: null });

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        const authError = mapAuthError(error);
        updateState({ isLoading: false, error: authError });
        return { error: authError };
      }

      updateState({
        user: null,
        session: null,
        isLoading: false,
        error: null,
      });

      return { error: null };
    } catch (error) {
      const authError = mapAuthError(error);
      updateState({ isLoading: false, error: authError });
      return { error: authError };
    }
  }, [supabase, updateState]);

  // Reset password
  const resetPassword = useCallback(
    async (email: string): Promise<{ error: AuthError | null }> => {
      updateState({ isLoading: true, error: null });

      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email);

        updateState({ isLoading: false });

        if (error) {
          const authError = mapAuthError(error);
          updateState({ error: authError });
          return { error: authError };
        }

        return { error: null };
      } catch (error) {
        const authError = mapAuthError(error);
        updateState({ isLoading: false, error: authError });
        return { error: authError };
      }
    },
    [supabase, updateState]
  );

  // Update password
  const updatePassword = useCallback(
    async (newPassword: string): Promise<{ error: AuthError | null }> => {
      updateState({ isLoading: true, error: null });

      try {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        updateState({ isLoading: false });

        if (error) {
          const authError = mapAuthError(error);
          updateState({ error: authError });
          return { error: authError };
        }

        return { error: null };
      } catch (error) {
        const authError = mapAuthError(error);
        updateState({ isLoading: false, error: authError });
        return { error: authError };
      }
    },
    [supabase, updateState]
  );

  // Refresh session
  const refreshSession = useCallback(async (): Promise<void> => {
    try {
      const { data: { session } } = await supabase.auth.refreshSession();
      updateState({
        user: session?.user ?? null,
        session,
      });
    } catch (error) {
      console.error('[AuthProvider] Failed to refresh session:', error);
    }
  }, [supabase, updateState]);

  // Subscribe to auth state changes
  useEffect(() => {
    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        updateState({
          user: session?.user ?? null,
          session,
          isLoading: false,
        });
      } catch (error) {
        console.error('[AuthProvider] Failed to get session:', error);
        updateState({ isLoading: false });
      }
    };

    // Only initialize if we don't have an initial session
    if (!initialSession) {
      initializeAuth();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        updateState({
          user: session?.user ?? null,
          session,
        });

        // Call optional callback
        onAuthStateChange?.(event, session);

        if (config?.debug) {
          console.log('[AuthProvider] Auth state changed:', event, session?.user?.email);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, initialSession, onAuthStateChange, config?.debug, updateState]);

  const contextValue: AuthContextValue = {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}
