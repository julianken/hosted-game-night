import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider } from '@beak-gaming/auth';
import { createMockSupabaseClient } from '@beak-gaming/testing';
import type { SupabaseClient } from '@supabase/supabase-js';

// Create a default mock Supabase client for tests
const defaultMockClient = createMockSupabaseClient();

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  mockClient?: ReturnType<typeof createMockSupabaseClient>;
  withAuth?: boolean;
}

/**
 * Custom render function that wraps components with AuthProvider
 * @param ui - The component to render
 * @param options - Render options
 * @returns The result of the render
 */
function customRender(
  ui: ReactElement,
  { mockClient = defaultMockClient, withAuth = true, ...renderOptions }: CustomRenderOptions = {}
) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    if (!withAuth) {
      return <>{children}</>;
    }

    return (
      <AuthProvider supabaseClient={mockClient as unknown as SupabaseClient}>
        {children}
      </AuthProvider>
    );
  };

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override the default render with our custom render
export { customRender as render };

// Export helper to create mock clients for tests that need custom setup
export { createMockSupabaseClient };
