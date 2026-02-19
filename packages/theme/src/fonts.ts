// packages/theme/src/fonts.ts
// Font loading infrastructure for the Joolie Boolie design system.
// Space Grotesk is the display/heading font; Plus Jakarta Sans is the body font.
// Both are self-hosted and preloaded via next/font/google with display: 'swap'.
import { Space_Grotesk, Plus_Jakarta_Sans } from 'next/font/google';

export const fontDisplay = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

export const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
});
