// Design tokens and constants
export const colors = {
  primary: 'var(--primary)',
  primaryForeground: 'var(--primary-foreground)',
  secondary: 'var(--secondary)',
  secondaryForeground: 'var(--secondary-foreground)',
  accent: 'var(--accent)',
  accentForeground: 'var(--accent-foreground)',
  background: 'var(--background)',
  foreground: 'var(--foreground)',
  border: 'var(--border)',
  muted: 'var(--muted)',
  mutedForeground: 'var(--muted-foreground)',
  success: 'var(--success)',
  warning: 'var(--warning)',
  error: 'var(--error)',
} as const satisfies Record<string, string>;

export const fontSizes = {
  base: '1.125rem',    // 18px
  lg: '1.25rem',       // 20px
  xl: '1.5rem',        // 24px
  '2xl': '1.875rem',   // 30px
  '3xl': '2.25rem',    // 36px
  '4xl': '3rem',       // 48px
  '5xl': '3.75rem',    // 60px
  '6xl': '4.5rem',     // 72px
  '7xl': '6rem',       // 96px
  '8xl': '8rem',       // 128px
} as const satisfies Record<string, string>;

export const touchTargets = {
  sm: '2.75rem',   // 44px - minimum
  md: '3.5rem',    // 56px - standard
  lg: '4rem',      // 64px - large
} as const satisfies Record<string, string>;

export type ColorToken = keyof typeof colors;
export type FontSizeToken = keyof typeof fontSizes;
export type TouchTargetSize = keyof typeof touchTargets;

// Theme store factory
export {
  createThemeStore,
  DEFAULT_THEME,
  THEME_OPTIONS,
  type ThemeStore,
  type ThemeMode,
} from './create-theme-store';
