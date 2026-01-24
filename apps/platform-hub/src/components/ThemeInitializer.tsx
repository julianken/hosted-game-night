'use client';

import { useThemeStore } from '@/stores/theme-store';
import { useApplyTheme } from '@/hooks/use-theme';

/**
 * Component that initializes and applies the theme from the store.
 * This runs on the client side and applies the theme to the document root.
 */
export function ThemeInitializer() {
  const theme = useThemeStore((state) => state.theme);
  useApplyTheme(theme);

  return null;
}
