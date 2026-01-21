import type { NextConfig } from 'next';
import withSerwistInit from '@serwist/next';
import withBundleAnalyzer from '@next/bundle-analyzer';

const nextConfig: NextConfig = {
  transpilePackages: [
    '@beak-gaming/sync',
    '@beak-gaming/ui',
    '@beak-gaming/theme',
    '@beak-gaming/auth',
    '@beak-gaming/database',
  ],
  // Required for Next.js 16 + Serwist: Serwist adds webpack config,
  // but Turbopack is the default. This silences the warning.
  // SW is disabled in dev mode anyway.
  turbopack: {
    resolveAlias: {
      '@beak-gaming/database/api': '../../packages/database/src/api/index.ts',
      '@beak-gaming/database/tables': '../../packages/database/src/tables/index.ts',
    },
  },
};

const withSerwist = withSerwistInit({
  swSrc: 'src/sw.ts',
  swDest: 'public/sw.js',
  // Disable in development to avoid Turbopack incompatibility warnings
  disable: process.env.NODE_ENV === 'development',
});

// Bundle analyzer is enabled via ANALYZE=true environment variable
const withAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withAnalyzer(withSerwist(nextConfig));
