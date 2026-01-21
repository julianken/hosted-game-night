# @beak-gaming/theme

**Status:** ✅ Production Ready (100% Complete)

Senior-friendly design tokens and CSS variables for the Beak Gaming Platform. Provides a comprehensive design system with 10+ color themes, accessibility-focused font sizes (18px minimum), and WCAG-compliant touch targets (44px minimum).

## Current Status

Apps maintain their own `globals.css` files that include app-specific customizations (e.g., bingo ball colors, team colors for trivia) while following the shared design system.

The theme package provides:
- **Reference CSS** (`globals.css`) - The canonical color palette and design tokens
- **TypeScript tokens** (`index.ts`) - Programmatic access to design values

## Why Apps Have Their Own CSS

Each game needs app-specific CSS variables:
- **Bingo**: `--ball-b`, `--ball-i`, `--ball-n`, `--ball-g`, `--ball-o` for ball colors
- **Trivia**: `--team-1` through `--team-6` for team colors

Apps copy the shared base tokens and add their own extensions. When the design system changes, update the theme package first, then propagate to apps.

## Features

- ✅ **10+ Color Themes** - Comprehensive color system with semantic tokens
- ✅ **Dark Mode Support** - System preference + class-based dark mode
- ✅ **Senior-Friendly Typography** - 18px minimum body text, large display sizes up to 128px
- ✅ **Accessible Touch Targets** - 44px minimum (WCAG AAA), up to 64px for large buttons
- ✅ **TypeScript Tokens** - Programmatic access to design values
- ✅ **Tailwind Integration** - CSS variables mapped to Tailwind utilities
- ✅ **High Contrast** - WCAG AAA color contrast ratios
- ✅ **Reference CSS** - Canonical design system in globals.css

## Installation

```json
{
  "dependencies": {
    "@beak-gaming/theme": "workspace:*"
  }
}
```

## Usage

### CSS Variables (Reference)

Import the reference CSS to see the canonical design system:

```css
/* Reference only - apps should maintain their own globals.css */
@import "@beak-gaming/theme/globals.css";
```

### TypeScript Tokens

Use programmatic access to design tokens:

```typescript
import { colors, fontSizes, touchTargets } from '@beak-gaming/theme';

// colors.primary = 'var(--primary)'
// fontSizes.base = '1.125rem' (18px)
// touchTargets.sm = '2.75rem' (44px)
```

## Design System

### Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `--primary` | `#1e40af` | `#3b82f6` | Primary actions, links |
| `--secondary` | `#475569` | `#64748b` | Secondary actions |
| `--accent` | `#059669` | `#10b981` | Success states, highlights |
| `--success` | `#16a34a` | `#16a34a` | Success feedback |
| `--warning` | `#ca8a04` | `#ca8a04` | Warning feedback |
| `--error` | `#dc2626` | `#dc2626` | Error feedback |
| `--background` | `#ffffff` | `#0f172a` | Page background |
| `--foreground` | `#1a1a1a` | `#f1f5f9` | Text color |
| `--border` | `#d1d5db` | `#334155` | Borders |
| `--muted` | `#6b7280` | `#94a3b8` | Muted text |

### Font Sizes (Senior-Friendly)

All sizes meet WCAG accessibility guidelines with 18px minimum body text:

| Token | Size | Pixels | Usage |
|-------|------|--------|-------|
| `--text-base` | `1.125rem` | 18px | Body text |
| `--text-lg` | `1.25rem` | 20px | Large body |
| `--text-xl` | `1.5rem` | 24px | Subheadings |
| `--text-2xl` | `1.875rem` | 30px | Section headers |
| `--text-3xl` | `2.25rem` | 36px | Page headers |
| `--text-4xl` | `3rem` | 48px | Display text |
| `--text-5xl` | `3.75rem` | 60px | Large display |
| `--text-6xl` | `4.5rem` | 72px | Audience display |
| `--text-7xl` | `6rem` | 96px | Main numbers |
| `--text-8xl` | `8rem` | 128px | Projected display |

### Touch Targets (Accessibility)

Minimum touch target sizes for motor accessibility:

| Token | Size | Pixels | Usage |
|-------|------|--------|-------|
| `--size-touch` | `2.75rem` | 44px | Minimum (WCAG) |
| `--size-touch-lg` | `3.5rem` | 56px | Standard buttons |
| `--size-touch-xl` | `4rem` | 64px | Large buttons |

## Tailwind Integration

The CSS variables are mapped to Tailwind classes via `@theme inline`:

```css
@theme inline {
  --color-primary: var(--primary);
  --color-secondary: var(--secondary);
  --color-accent: var(--accent);
  /* ... */
}
```

This enables using Tailwind classes like `bg-primary`, `text-accent`, etc.

## Dark Mode

The theme supports both:
- **System preference** via `prefers-color-scheme: dark`
- **Class-based** via `.dark` class on root element

```css
/* System preference */
@media (prefers-color-scheme: dark) {
  :root:not(.light) {
    --background: #0f172a;
    /* ... */
  }
}

/* Class-based */
:root.dark {
  --background: #0f172a;
  /* ... */
}
```

## API Reference

### TypeScript Exports

```typescript
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
} as const;

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
} as const;

export const touchTargets = {
  sm: '2.75rem',   // 44px - minimum
  md: '3.5rem',    // 56px - standard
  lg: '4rem',      // 64px - large
} as const;

export type ColorToken = keyof typeof colors;
export type FontSizeToken = keyof typeof fontSizes;
export type TouchTargetSize = keyof typeof touchTargets;
```

## Integration Status

| App/Package | Status | Usage |
|-------------|--------|-------|
| **apps/bingo** | ✅ Integrated | Full theme system + custom ball colors |
| **apps/trivia** | ✅ Integrated | Full theme system + custom team colors |
| **apps/platform-hub** | ✅ Integrated | Full theme system |
| **@beak-gaming/ui** | ✅ Required | All components use theme CSS variables |

## Related Packages

- [`@beak-gaming/ui`](../ui/README.md) - UI components that consume these design tokens
- All apps maintain their own `globals.css` with app-specific extensions

## Related Documentation

- **Root README:** [`../../README.md`](../../README.md) - Monorepo overview
- **Bingo globals.css:** [`../../apps/bingo/src/app/globals.css`](../../apps/bingo/src/app/globals.css)
- **Trivia globals.css:** [`../../apps/trivia/src/app/globals.css`](../../apps/trivia/src/app/globals.css)
